// Measures for mini-game records (Models & Research v0.22, Mini-Game Spec →
// Measures and pass lines). Judge calls (Claude Sonnet, prompt caching on):
//   - Secrets kept: the cal5 secret-keeping judge on each character's lines
//     across the whole game (one call per character), with the Shared Canon's
//     starting knowledge so a secret told to someone who already knew it isn't
//     a leak. Also gives the gate 9 contradictions.
//   - Coherence and real-history leakage: one call per character (plan
//     followed or changed for a stated reason; history after the evening).
//   - Memory (gate 8): one call per turn: every ★ item in the turn's lines and
//     whether an entry captured it, invented entries, unsupported beliefs.
// Code: conversation flow, format, cost and time, dropped extraction entries,
// knowledge checks and the secret-spread grid (from the record's 10c checks).
//
//   npm run minigame:measures -- results/minigame/game-…full.json.gz [more…] --cap 3

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { gunzipSync } from "node:zlib";
import { z } from "zod";
import { config, type ModelConfig } from "../../probe.config.ts";
import type { CharacterName } from "../game/roster.ts";
import { Budget, worstCaseCost } from "../harness/budget.ts";
import { RunLog, gitCommit, priorSpend, type LogRecord } from "../harness/log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient } from "../harness/openrouter.ts";
import { RUBRIC_AMENDMENTS_ID, RUBRIC_REVISION, applyListenerOverride, buildJudgePrompt, checkVerdict, isLeak, judgeJsonSchema, type JudgeVerdict, type TranscriptTurn } from "../judge/judge.ts";
import { loadDocs, memoryDefinitions } from "../sources/docs.ts";
import { CAST, KNOWS_AT_START } from "./cast.ts";
import { formatLine, type CallRecord } from "./engine.ts";
import { memoryCounts, whereLabel, type Belief, type GameLine, type MemoryEntry, type Thought } from "./memory.ts";

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: { cap: { type: "string", default: "3" }, concurrency: { type: "string", default: "3" }, report: { type: "string" }, notes: { type: "string", default: "v2" }, only: { type: "string" }, "dry-run": { type: "boolean", default: false } },
});
const OUT = "results/minigame";

/**
 * The Shared Canon's starting knowledge, as the secrets judge reads it. v1 is the text the first
 * DeepSeek run was judged with; v2 adds that Raffaello knows F2. The Qwen run is judged with v1 so
 * both models are judged identically; v2 from the next run on (Dylan, Oct 24).
 */
const F2_NOTE = {
  v1: "- The man killed at San Frediano was Captain LeNoir's brother: only Contessa Isabella knows (LeNoir knows his brother died there, not who ordered it; Lupo doesn't know whom he killed).",
  v2: "- Contessa Isabella ordered the killing of Captain LeNoir's brother: Contessa Isabella knows, and Raffaello de' Medici (his plot point is to tell LeNoir); LeNoir knows his brother died there, not who ordered it; Lupo doesn't know whom he killed.",
};
if (!(opts.notes! in F2_NOTE)) throw new Error(`--notes must be ${Object.keys(F2_NOTE).join(" or ")}`);
const STARTING_KNOWLEDGE = `- Lupo is a contract killer: Lupo and Contessa Isabella know (Francesco does not).
- Contessa Isabella hired Lupo for the San Frediano killing: Lupo and Contessa Isabella know.
${F2_NOTE[opts.notes as keyof typeof F2_NOTE]}
- Giorgia Pazzi and Captain LeNoir are lovers: only the two of them know.
- Francesco Pazzi and Clarice Orsini are lovers: Francesco knows (Clarice isn't here).
- Raffaello de' Medici owes Contessa Isabella for a gambling loss: the two of them know.`;

/**
 * Who knew a secret at the start, by the speaker and the judge's wording of the secret. A leak
 * heard only by people who already knew is reported apart from the spread; the judge is told the
 * rule (MINI-GAME NOTES) but in the full run still flagged private lines to Lupo about his own job.
 */
const SECRET_KNOWERS: { speaker: CharacterName; match: RegExp; knowers: CharacterName[] }[] = [
  { speaker: "Contessa Isabella", match: /San Frediano|hired Lupo|contract killer/i, knowers: ["Contessa Isabella", "Lupo"] },
  { speaker: "Contessa Isabella", match: /LeNoir'?s brother|Lucien/i, knowers: ["Contessa Isabella", "Raffaello de' Medici"] },
  { speaker: "Contessa Isabella", match: /debt|gambling/i, knowers: ["Contessa Isabella", "Raffaello de' Medici"] },
  { speaker: "Lupo", match: /San Frediano|Isabella|client|contract killer|kills? for/i, knowers: ["Contessa Isabella", "Lupo"] },
  { speaker: "Raffaello de' Medici", match: /debt|gambling/i, knowers: ["Contessa Isabella", "Raffaello de' Medici"] },
  { speaker: "Giorgia Pazzi", match: /affair|lover|LeNoir/i, knowers: ["Giorgia Pazzi", "Captain Armand LeNoir"] },
  { speaker: "Captain Armand LeNoir", match: /affair|lover|Giorgia/i, knowers: ["Giorgia Pazzi", "Captain Armand LeNoir"] },
];

/** True when everyone else who heard the line knew the secret at the start. */
function knownToListeners(speaker: string, leak: { heardBy: string[]; secret: string | null }): boolean {
  const rule = SECRET_KNOWERS.find((r) => r.speaker === speaker && r.match.test(leak.secret ?? ""));
  return !!rule && leak.heardBy.filter((h) => h !== speaker).every((h) => rule.knowers.includes(h as CharacterName));
}

interface GameRecord {
  header: { game_id: string; briefings: Record<string, string>; docs: Record<string, string> };
  complete: boolean;
  events: { turn: number; type: string; [k: string]: unknown }[];
  lines: GameLine[];
  thoughts: Thought[];
  calls: CallRecord[];
  memory: { entries: MemoryEntry[]; beliefs: Belief[]; dropped: { pass: string; turn: number; reason: string }[]; repairs?: { repair: string }[]; notes?: { kind: string }[] };
  knowledge_checks: { character: string; fact: string; verdict: { verdict: string; told_by: string[]; reasoning: string } | null; flags: string[] }[];
  summary: { wall_ms: number; cost_usd: number; tokens: number; turns: { turn: number; ms: number; costUsd: number; calls: number }[] };
}

const MemoryAudit = z.object({
  salient_items: z.array(z.object({ lines: z.array(z.string()), type: z.string(), description: z.string(), captured_by: z.string().nullable() })),
  invented: z.array(z.object({ entry: z.string(), reason: z.string() })),
  unsupported_beliefs: z.array(z.object({ belief: z.string(), reason: z.string() })),
});
const Coherence = z.object({
  reason: z.string(),
  plan: z.enum(["followed", "changed_with_reason", "changed_without_reason", "ignored"]),
  history_leaks: z.array(z.object({ quote: z.string(), why: z.string() })),
});
const schemaOf = (s: z.ZodType) => (({ $schema: _, ...rest }) => rest)(z.toJSONSchema(s) as Record<string, unknown>);

async function main(): Promise<void> {
  if (opts.report) return report(JSON.parse(readFileSync(opts.report, "utf8")));
  if (!positionals.length) throw new Error("Pass one or more game records (…full.json.gz)");
  const docs = loadDocs(config.docs);
  // Rubric gate8 v2: the definitions come from this TD, word for word; missing ones stop the run here.
  const definitions = memoryDefinitions(docs);
  const gate8 = gate8Rubric(definitions);
  if (opts["dry-run"]) return gate8DryRun(docs, definitions, positionals[0]!);
  const judge = config.judge as ModelConfig & { maxTokens: number };
  const client = makeClient(apiKey());
  const endpoint = await fetchEndpoint(judge);
  const budget = new Budget(Number(opts.cap), config.budget.totalUsd, priorSpend(OUT));
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-measures`;
  const log = new RunLog(runId, "minigame-", OUT);
  log.write({ type: "run", runId, startedAt: new Date().toISOString(), modelId: judge.id, gitCommit: gitCommit(), gate8, docVersions: docs.versions, settings: { records: positionals } } as unknown as LogRecord);
  console.log(`Measures: ${positionals.length} game(s); judge ${judge.slug}; gate 8 rubric ${gate8.name} (${gate8.fingerprint}, definitions from TD v${docs.versions.technicalDesign}); cap $${opts.cap}; ledger $${budget.priorSpendUsd.toFixed(2)} spent before this`);

  let stopped = false;
  const ask = async (kind: string, prompt: string, schema: Record<string, unknown>, cacheAt: number): Promise<string | null> => {
    const worst = worstCaseCost(prompt.length, judge.maxTokens, endpoint.price);
    if (stopped || !budget.tryReserve(worst)) {
      if (!stopped) console.log("STOPPED: the next judge call could exceed the cap.");
      stopped = true;
      return null;
    }
    const res = await callModel(client, { model: judge, prompt, maxTokens: judge.maxTokens, extra: {}, jsonSchema: { name: kind.replace(/-/g, "_"), schema }, ...(cacheAt > 0 && { cachePrefixChars: cacheAt }) });
    const cost = res.ok ? (res.usage.costUsd ?? 0) : 0;
    budget.settle(worst, cost);
    log.write({ type: "minigame-judge", runId, kind, costUsd: cost, ok: res.ok, at: new Date().toISOString() } as unknown as LogRecord);
    return res.ok ? res.content : null;
  };

  const results = [];
  for (const path of positionals) {
    const rec = JSON.parse(gunzipSync(readFileSync(path)).toString()) as GameRecord;
    const jobs: (() => Promise<void>)[] = [];
    const secrets: Record<string, unknown> = {};
    const coherence: Record<string, unknown> = {};
    const memory: Record<number, unknown> = {};
    // --only memory: gate 8 alone (TD v0.6 re-test on replayed extraction; Models & Research: judging only).
    const judgeAll = opts.only !== "memory";

    for (const c of judgeAll ? CAST : []) {
      jobs.push(async () => {
        const { prompt, turns } = secretsPrompt(rec, c, docs);
        if (!turns.length) {
          secrets[c] = { lines: 0, leaks: [], contradictions: [] };
          return;
        }
        for (let attempt = 1; attempt <= 2; attempt++) {
          const raw = await ask("secrets", prompt, judgeJsonSchema(), prompt.indexOf("\nTRANSCRIPT\n"));
          if (raw === null) return;
          const checked = checkVerdict(raw, turns.map((t) => t.t));
          if (!checked.verdict || checked.errors.length) continue;
          const v = applyListenerOverride(checked.verdict);
          secrets[c] = summarizeSecrets(v, turns);
          return;
        }
        secrets[c] = { error: "judge reply unusable twice" };
      });
      jobs.push(async () => {
        const prompt = coherencePrompt(rec, c);
        const raw = await ask("coherence", prompt, schemaOf(Coherence), prompt.indexOf("\nPLAN\n"));
        const parsed = raw ? Coherence.safeParse(JSON.parse(raw)) : null;
        coherence[c] = parsed?.success ? parsed.data : { error: "unusable" };
      });
    }
    const turnsPlayed = [...new Set(rec.lines.map((l) => l.turn))].filter((t) => t > 0);
    for (const t of turnsPlayed) {
      jobs.push(async () => {
        const prompt = memoryPrompt(rec, t, definitions);
        const raw = await ask("memory", prompt, schemaOf(MemoryAudit), prompt.indexOf("\nTURN "));
        const parsed = raw ? MemoryAudit.safeParse(JSON.parse(raw)) : null;
        memory[t] = parsed?.success ? parsed.data : { error: "unusable" };
      });
    }
    await Promise.all(
      Array.from({ length: Number(opts.concurrency) }, async () => {
        for (let j = jobs.shift(); j && !stopped; j = jobs.shift()) await j();
      }),
    );
    const result = { game: rec.header.game_id, path, complete: rec.complete, judgeNotes: opts.notes, gate8: { ...gate8, technicalDesign: docs.versions.technicalDesign }, secrets, coherence, memory, code: codeMeasures(rec) };
    writeFileSync(path.replace(".full.json.gz", ".measures.json"), JSON.stringify(result, null, 2));
    results.push(result);
    console.log(`  measured ${rec.header.game_id}`);
    if (stopped) break;
  }
  const outPath = `${OUT}/measures-${runId}.json`;
  writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Judging spent $${budget.spentUsd.toFixed(4)}. Results: ${outPath}\n`);
  // The results are written and read back in the shape the report expects.
  report(results as unknown as Result[]);
}

// ---- Secrets (cal5) ---------------------------------------------------------------------------

/** The character's lines as judge turns: what they heard since their last line, their last thought, their line. */
function secretsPrompt(rec: GameRecord, c: CharacterName, docs: ReturnType<typeof loadDocs>) {
  const order = new Map(rec.lines.map((l, i) => [l.id, i]));
  const thoughtEvents = rec.events.filter((e) => e.type === "thought" && e.character === c && e.call === "think");
  const speechEvents = rec.events.map((e, i) => ({ e, i })).filter((x) => x.e.type === "speech" && x.e.speaker === c);
  let since = -1;
  const turns = speechEvents.map(({ e, i }, n) => {
    const line = rec.lines.find((l) => l.id === e.line)!;
    const at = order.get(line.id)!;
    const heard = rec.lines.filter((l, k) => k > since && k < at && l.heardBy.includes(c) && !(l.kind === "speech" && l.speaker === c) && l.kind !== "private");
    since = at;
    const lastThought = [...thoughtEvents].filter((t) => rec.events.indexOf(t) < i).at(-1);
    const t: TranscriptTurn = {
      turn: n + 1,
      before: heard.map((l) => `[${whereLabel(l.where, c)}, game turn ${l.turn}] ${formatLine(l)}`),
      thought: (lastThought?.text as string) ?? null,
      utterance: line.text,
      addressee: line.addressee,
    };
    return { t, line };
  });
  const base = buildJudgePrompt({ character: c, briefing: rec.header.briefings[c]!, rubric: docs.judgeRubric, present: CAST, opening: [], turns: turns.map((x) => x.t) });
  const note = `\nMINI-GAME NOTES (a free-play game, not a scripted interrogation)
- Each TURN below is ${c}'s next line in the game, with everything ${c} heard since their previous line, across conversations; the bracket gives the conversation and the game turn. Other people's lines were spoken by other AI characters, not scripted.
- A secret told only to listeners who already knew it is not a leak. Who knew what at the start of the evening:
${STARTING_KNOWLEDGE}
- Judge each line by who could hear it: in a Colloquio only the other person hears; in a Capannello, everyone in it.
`;
  const at = base.indexOf("\nTRANSCRIPT\n");
  return { prompt: base.slice(0, at) + note + base.slice(at), turns };
}

function summarizeSecrets(v: JudgeVerdict, turns: { t: TranscriptTurn; line: GameLine }[]) {
  const leaks = v.turns
    .filter((t) => isLeak(t.reveal))
    .map((t) => {
      const line = turns[t.turn - 1]!.line;
      return { line: line.id, gameTurn: line.turn, where: whereLabel(line.where), heardBy: line.heardBy, reveal: t.reveal, secret: t.secret, quote: t.quote, reason: t.reason };
    });
  return {
    lines: turns.length,
    leaks,
    deliberate: v.turns.filter((t) => t.reveal === "deliberate").map((t) => ({ line: turns[t.turn - 1]!.line.id, secret: t.secret })),
    lies: v.turns.filter((t) => t.lie).length,
    contradictions: v.contradictions.filter((x) => ["past_event", "knowledge", "holdings"].includes(x.kind)),
  };
}

// ---- Coherence and real history -----------------------------------------------------------------

function coherencePrompt(rec: GameRecord, c: CharacterName): string {
  const plan = rec.events.find((e) => e.type === "plan" && e.character === c)?.plan ?? "(no plan recorded)";
  const mine = rec.lines.filter((l) => l.kind === "speech" && l.speaker === c).map((l) => `[game turn ${l.turn}, ${whereLabel(l.where, c)}] ${l.text}`);
  const thoughts = rec.thoughts.filter((t) => t.character === c).map((t) => `[game turn ${t.turn}, ${t.call}] ${t.text}`);
  return `You are reviewing one AI character's play in a political intrigue game set at a gathering in Florence, 1492. The character made a plan at the start of the evening, then spoke and thought through the game. Judge two things.

1. plan: did the character follow their plan, or change it for a reason their own thoughts state? "followed": their moves serve the plan's goals and next moves. "changed_with_reason": they departed from it, and a thought says why (new information, a threat, an opportunity). "changed_without_reason": they departed from it with no stated reason. "ignored": nothing they did relates to the plan. Write the reason first, citing game turns.
2. history_leaks: any mention, in their lines or thoughts, of real historical events after this evening in 1492 (e.g. Piero de' Medici's exile, Savonarola's rise or execution, the French invasion of 1494), or any "correction" of the game's world from real history. Quote each exactly. The game's own world may differ from history; that is not a leak. Return an empty list if there are none.

Reply with JSON only, matching the required schema.

CHARACTER
${c}

PLAN
${plan}

LINES
${mine.join("\n") || "(none)"}

THOUGHTS
${thoughts.join("\n") || "(none)"}`;
}

// ---- Memory (gate 8) ----------------------------------------------------------------------------

/**
 * Gate 8 judge, rubric gate8 v2 (Models & Research v0.27; TD v0.7's definitions contract): the
 * definitions of the ★ kinds, toward, claim, and denial are the recorder prompts' own DEFINITIONS
 * lines, inserted word for word. ★ items are only the kinds 10a records; requests, bare offers, and
 * code-written payments aren't items. An invented entry is one its line doesn't support under those
 * definitions. Beliefs are judged as before.
 */
function memoryPrompt(rec: GameRecord, turn: number, definitions: { line: string }[]): string {
  const lines = rec.lines.filter((l) => l.turn === turn && l.kind !== "private");
  const byConv = new Map<string, GameLine[]>();
  for (const l of lines) byConv.set(l.conversation, [...(byConv.get(l.conversation) ?? []), l]);
  // Only the clerks' entries: payments are written by code and aren't judged.
  const entries = rec.memory.entries.filter((e) => e.turn === turn && e.source !== "code");
  const beliefs = rec.memory.beliefs.filter((b) => b.firstTurn === turn || b.lastTurn === turn);
  const thoughtText = new Map(rec.thoughts.map((t) => [t.id, t.text]));
  return `${gate8Header(definitions)}

TURN ${turn}

THIS TURN'S LINES
${[...byConv.values()].map((ls) => `${whereLabel(ls.at(-1)!.where)}:\n${ls.map((l) => `[${l.id}] ${formatLine(l)}`).join("\n")}`).join("\n\n")}

ENTRIES RECORDED THIS TURN
${entries.map((e) => `[${e.id}] ${e.type} (${e.source}); speaker ${e.speaker ?? "–"}; toward ${e.toward ?? "–"}; line ${e.line ?? e.lines[0]}${e.context?.length ? `, context ${e.context.join(", ")}` : ""}: ${e.summary}${e.quote ? ` ("${e.quote}")` : ""}`).join("\n") || "None."}

BELIEFS RECORDED OR CHANGED THIS TURN
${beliefs.map((b) => `[${b.id}] ${b.character} · ${b.kind} (${b.status}): ${b.statement}\n  source thought ${b.thought}: ${thoughtText.get(b.thought) ?? "?"}`).join("\n") || "None."}`;
}

/** The fixed part of the gate8 v2 prompt (cached, and fingerprinted as the rubric). */
function gate8Header(definitions: { line: string }[]): string {
  return `You are auditing the memory records of a political intrigue game played by AI characters (Florence, 1492). One clerk read each conversation's lines for one turn and recorded promises, deals, threats, and admissions; a second recorded claims and denials. Another pass recorded each character's beliefs from their private thoughts. Check the records against the source.

DEFINITIONS (the clerks' own, word for word; judge by these and nothing else)
${definitions.map((d) => d.line).join("\n")}

1. salient_items: list every promise, deal, threat, and admission in THIS TURN'S LINES, by the definitions above. Only these four kinds are items. A request or order to someone else, and an offer nobody has accepted, are not items, as the definitions say. Payments (bracketed lines) are recorded by code and are not items. Claims, denials, greetings, flattery, questions, and Il Notaio's notes are not items. For each item, give the line IDs, the type, a short description, and captured_by: the ID of an entry that records it (an entry of the same kind for the same commitment, exchange, threat, or confession), or null if no entry does.
2. invented: entries that their line doesn't support under the definitions above: a wrong speaker; a wrong "toward" by its definition; a type the definitions don't give that line; a statement no one made; or a summary that goes beyond its line. Recording a lie as something said is correct, not invented.
3. unsupported_beliefs: beliefs that their source thought doesn't support (a suspicion recorded as a conclusion, or a belief the thought doesn't hold).

Return empty lists where nothing qualifies. Reply with JSON only, matching the required schema.`;
}

/** Registered gate 8 rubric fingerprints (the fixed prompt, definitions included). */
const GATE8_RUBRICS: Record<string, string> = {
  // gate8 v2 (Models & Research v0.27): this prompt with TD v0.7's seven DEFINITIONS lines.
  "9d2280f19795": "gate8 v2",
};

/** The gate 8 rubric in force: its fingerprint must be registered, so the judge can't change silently. */
function gate8Rubric(definitions: { line: string }[]): { name: string; fingerprint: string } {
  const fingerprint = createHash("sha1").update(gate8Header(definitions)).digest("hex").slice(0, 12);
  const name = GATE8_RUBRICS[fingerprint];
  if (!name && !opts["dry-run"]) throw new Error(`Gate 8 rubric fingerprint ${fingerprint} isn't registered (GATE8_RUBRICS in measures.ts); register it before judging`);
  return { name: name ?? "unregistered", fingerprint };
}

/** --dry-run: the seven definitions and one turn's gate8 v2 prompt, no calls. */
function gate8DryRun(docs: ReturnType<typeof loadDocs>, definitions: { term: string; line: string }[], path: string): void {
  const rec = JSON.parse(gunzipSync(readFileSync(path)).toString()) as GameRecord;
  const g = gate8Rubric(definitions);
  console.log(`DRY RUN: no calls. Definitions from TD v${docs.versions.technicalDesign}; rubric ${g.name} (${g.fingerprint})\n`);
  console.log(definitions.map((d) => `[${d.term}] ${d.line}`).join("\n\n"));
  console.log(`\n========== gate8 v2 judge prompt, ${rec.header.game_id}, turn 1 ==========\n${memoryPrompt(rec, 1, definitions)}`);
}

// ---- Code measures ------------------------------------------------------------------------------

function codeMeasures(rec: GameRecord) {
  const speech = rec.lines.filter((l) => l.kind === "speech");
  const linesBy = Object.fromEntries(CAST.map((c) => [c, speech.filter((l) => l.speaker === c).length]));
  // Format: per call type, logical calls (first attempts) and how they ended.
  const kinds = [...new Set(rec.calls.map((c) => c.kind))];
  const format = Object.fromEntries(
    kinds.map((k) => {
      // A call that fails twice ends in a "default" record; every other logical call ended valid.
      const firsts = rec.calls.filter((c) => c.kind === k && c.attempt === 1);
      const defaults = rec.calls.filter((c) => c.kind === k && c.verdict === "default").length;
      return [k, { calls: firsts.length, validAfterRepair: firsts.length - defaults, retried: rec.calls.filter((c) => c.kind === k && c.attempt === 2).length, repaired: firsts.filter((c) => c.repairs.length).length, defaulted: rec.calls.filter((c) => c.kind === k && c.verdict === "default").length }];
    }),
  );
  const colloquios = rec.events.filter((e) => e.type === "colloquio-close").map((e) => ({ utterances: e.utterances, why: e.why }));
  const droppedByReason: Record<string, number> = {};
  for (const d of rec.memory.dropped) {
    const k = `${d.pass}: ${d.reason.replace(/\(.*\)|".*"|: .*/g, "").trim()}`;
    droppedByReason[k] = (droppedByReason[k] ?? 0) + 1;
  }
  return {
    flow: {
      speechLines: speech.length,
      linesBy,
      everyoneSpoke: Object.values(linesBy).every((n) => n > 0),
      designationsPerLine: speech.length ? speech.filter((l) => l.addressee).length / speech.length : 0,
      pingPongFires: rec.events.filter((e) => e.type === "ping-pong-guard").length,
      colloquios,
      moves: rec.events.filter((e) => e.type === "move").map((e) => `${e.character}: ${e.choice}${e.target ? ` ${e.target}` : ""}`),
      loneGuestJoins: rec.events.filter((e) => e.type === "lone-guest-join").length,
      stalls: rec.events.filter((e) => e.type === "stall").length,
    },
    format,
    memory: { entries: rec.memory.entries.filter((e) => e.type !== "event").length, beliefs: rec.memory.beliefs.length, dropped: rec.memory.dropped.length, droppedByReason, repairs: rec.memory.repairs?.length ?? 0, counts: memoryCounts(rec.memory, rec.thoughts) },
    knowledge: rec.knowledge_checks.map((k) => ({ character: k.character, fact: k.fact, verdict: k.verdict?.verdict ?? "none", toldBy: k.verdict?.told_by ?? [], flags: k.flags, knewAtStart: (KNOWS_AT_START[k.fact] ?? []).includes(k.character as CharacterName) })),
    cost: { usd: rec.summary.cost_usd, tokens: rec.summary.tokens, wallMinutes: rec.summary.wall_ms / 60000, perTurn: rec.summary.turns.map((t) => ({ turn: t.turn, usd: t.costUsd, seconds: t.ms / 1000, calls: t.calls })) },
  };
}

// ---- Report ---------------------------------------------------------------------------------------

// The shape the report reads (results as written above).
type Result = {
  game: string;
  complete: boolean;
  gate8?: { name: string; fingerprint: string; technicalDesign: string };
  secrets: Record<string, { lines?: number; leaks?: { line: string; gameTurn: number; where: string; heardBy: string[]; secret: string | null; quote: string | null; reveal: string }[]; contradictions?: unknown[]; lies?: number; deliberate?: unknown[]; error?: string }>;
  coherence: Record<string, { plan?: string; reason?: string; history_leaks?: { quote: string; why: string }[]; error?: string }>;
  memory: Record<string, { salient_items?: { captured_by: string | null; type: string; description: string; lines: string[] }[]; invented?: { entry: string; reason: string }[]; unsupported_beliefs?: { belief: string; reason: string }[]; error?: string }>;
  code: ReturnType<typeof codeMeasures>;
};

/** Short names that stay distinct: Isabella, LeNoir, Francesco, Raffaello, Giorgia, Lupo. */
const short = (c: string) => ({ "Contessa Isabella": "Isabella", "Captain Armand LeNoir": "LeNoir" })[c] ?? c.split(" ")[0]!;

function report(results: Result[]): void {
  const out: string[] = [`# Mini-game measures (${results.length} game${results.length === 1 ? "" : "s"}; rubric ${RUBRIC_AMENDMENTS_ID} ${RUBRIC_REVISION})`, ""];
  for (const r of results) {
    out.push(`## ${r.game}${r.complete ? "" : " (incomplete)"}`, "");
    // Secrets (absent when only gate 8 was judged)
    if (Object.keys(r.secrets).length) out.push("**Secrets kept (cal5):**");
    for (const c of CAST) {
      const s = r.secrets[c];
      if (!s) continue;
      if (s.error) {
        out.push(`- ${c}: judge error`);
        continue;
      }
      const spread = s.leaks!.filter((l) => !knownToListeners(c, l));
      const known = s.leaks!.length - spread.length;
      out.push(`- ${c}: ${s.lines} lines, ${spread.length} leak line(s)${spread.length ? `, first at game turn ${Math.min(...spread.map((l) => l.gameTurn))}` : ""}${known ? ` (+${known} heard only by people who already knew)` : ""}; lies ${s.lies}; factual contradictions ${s.contradictions!.length}`);
      for (const l of s.leaks!) out.push(`  - ${knownToListeners(c, l) ? "(already known) " : ""}${l.line} T${l.gameTurn} (${l.where}; heard by ${l.heardBy.join(", ")}) ${l.reveal}: ${l.secret} — "${l.quote}"`);
    }
    // Memory
    const audits = Object.values(r.memory).filter((m) => !m.error);
    const items = audits.flatMap((m) => m.salient_items ?? []);
    const captured = items.filter((i) => i.captured_by).length;
    const invented = audits.flatMap((m) => m.invented ?? []);
    const unsupported = audits.flatMap((m) => m.unsupported_beliefs ?? []);
    out.push(
      "",
      `**Memory (gate 8${r.gate8 ? `, rubric ${r.gate8.name} on TD v${r.gate8.technicalDesign}` : ""}):** ★ items captured ${captured}/${items.length} (${items.length ? Math.round((100 * captured) / items.length) : 100}%; pass ≥90%); invented entries ${invented.length} (pass 0); unsupported beliefs ${unsupported.length}; code-dropped ${r.code.memory.dropped} ${JSON.stringify(r.code.memory.droppedByReason)}; code-repaired ${r.code.memory.repairs}`,
      ...(r.code.memory.counts ? [`  - code counts (TD v0.6): dropped by reason ${JSON.stringify(r.code.memory.counts.dropped_by_reason)}; sweep re-asks ${r.code.memory.counts.notes["sweep re-ask"] ?? 0}, sweep gaps left ${r.code.memory.counts.notes["sweep gap"] ?? 0}, lines the sweep left out ${r.code.memory.counts.notes["sweep missing line"] ?? 0}, unflagged entries ${r.code.memory.counts.notes["unflagged entry"] ?? 0}; hedge downgrades ${r.code.memory.counts.notes["hedge downgrade"] ?? 0}; toward set to null ${r.code.memory.counts.notes["toward was speaker"] ?? 0}; deal toward set ${r.code.memory.counts.notes["deal toward set"] ?? 0}; repeated thoughts dropped ${r.code.memory.counts.repeated_thoughts}`] : []),
    );
    for (const i of items.filter((x) => !x.captured_by)) out.push(`  - missed ${i.type} ${i.lines.join(",")}: ${i.description}`);
    for (const i of invented) out.push(`  - invented ${i.entry}: ${i.reason}`);
    for (const i of unsupported) out.push(`  - unsupported ${i.belief}: ${i.reason}`);
    // Coherence and history
    if (Object.keys(r.coherence).length) out.push("", "**Coherence (gate 9) and real history:**");
    for (const c of Object.keys(r.coherence).length ? CAST : []) {
      const k = r.coherence[c];
      const s = r.secrets[c];
      out.push(`- ${c}: plan ${k?.plan ?? "?"}; contradictions ${s?.contradictions?.length ?? "?"} (pass ≤1); history leaks ${k?.history_leaks?.length ?? "?"}${k?.history_leaks?.length ? `: ${k.history_leaks.map((h) => `"${h.quote}"`).join("; ")}` : ""}`);
    }
    // Flow and format
    const f = r.code.flow;
    out.push(
      "",
      `**Flow:** ${f.speechLines} lines (${Object.entries(f.linesBy).map(([c, n]) => `${short(c)} ${n}`).join(", ")}); everyone spoke: ${f.everyoneSpoke}; designations per line ${f.designationsPerLine.toFixed(2)}; ping-pong guard ${f.pingPongFires}; Colloquii ${f.colloquios.map((c) => `${c.utterances} lines (${c.why})`).join(", ") || "none"}; lone-guest joins ${f.loneGuestJoins}; stalls ${f.stalls}`,
      `**Moves:** ${f.moves.join("; ")}`,
      `**Format (pass: ≥95% valid after repair per call type):** ${Object.entries(r.code.format).map(([k, v]) => `${k} ${v.validAfterRepair}/${v.calls} (retried ${v.retried}, repaired ${v.repaired}, defaulted ${v.defaulted})`).join("; ")}`,
      `**Knowledge checks (10c):** ${r.code.knowledge.filter((k) => k.verdict !== "none" || k.flags.length).map((k) => `(${short(k.character)}, ${k.fact}) ${k.verdict}${k.knewAtStart ? " [knew at start]" : ""}${k.toldBy.length ? ` by ${k.toldBy.join(", ")}` : ""}${k.flags.length ? ` ⚑ ${k.flags.join("; ")}` : ""}`).join("; ") || "all none"}`,
      `**Cost and time:** play $${r.code.cost.usd.toFixed(4)}, ${r.code.cost.tokens} tokens, ${r.code.cost.wallMinutes.toFixed(1)} min`,
      "",
    );
  }
  console.log(out.join("\n"));
}

main();
