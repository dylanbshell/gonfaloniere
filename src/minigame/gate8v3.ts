// Gate 8 with a fixed measure, rubric "gate8 v3" (CC-20261107-05; Models & Research v0.47, Open Questions:
// "Claude as the recorder"). Gate8 v2's judge listed the ★ moments while it read the record, so its list
// grew with the record. Here the list comes first and is fixed:
//   1. list   once per game, before any record is seen: for each conversation-turn, the judge reads only
//             that turn's lines and the 4 context lines and lists every promise, deal, threat, and
//             admission, by 10a's DEFINITIONS lines, word for word (loaded at run time).
//   2. match  per recorder: each list item is matched to the ★ entry that captures it, or missed; every
//             other entry (★, or a 10d claim or denial) is "invented" or "valid but unlisted", by the
//             DEFINITIONS and its line. The list is never added to. Beliefs (10b): supported or not by
//             their source thought, as in gate8 v2.
// The judge is claude-opus-5-5 on the Claude API with CLAUDE_CREDIT_API_KEY, temperature omitted, the
// instructions cached; spend goes to the Claude-credit ledger and stops at CLAUDE_CREDIT_STOP_USD.
//
//   op run --env-file=.env -- env CLAUDE_CREDIT_STOP_USD=<stop> npx tsx src/minigame/gate8v3.ts list <records>
//   … gate8v3.ts match <records>      (DeepSeek in play, and the replays named by RECORDERS)
//   npx tsx src/minigame/gate8v3.ts report <records>     (no calls)

import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import { config } from "../../probe.config.ts";
import { gitCommit, priorSpend, RunLog, type LogRecord } from "../harness/log.ts";
import { parseJson } from "../output/json.ts";
import { loadDocs, memoryDefinitions } from "../sources/docs.ts";
import { formatLine } from "./engine.ts";
import type { Belief, GameLine, MemoryEntry, Thought } from "./memory.ts";
import { CLAUDE_PRICES, claudeCost } from "./recorder.ts";

export const OUT = "results/gate8v3";
const CREDIT_LEDGER = "results/claude-credit";
export const JUDGE = "claude-opus-5-5";
const CONTEXT_LINES = 4;
const STAR = ["promise", "deal", "threat", "admission"];
/** The recorders compared: DeepSeek's in-play record, and the two Claude replays beside it. */
export const RECORDERS = [
  { name: "deepseek", label: "DeepSeek V4.1 Flash (in play)", path: (p: string) => p },
  { name: "haiku", label: "claude-haiku-5-5", path: (p: string) => p.replace(".full.json.gz", "-td0.35-claude-haiku-5-5.full.json.gz") },
  { name: "sonnet", label: "claude-sonnet-5-5", path: (p: string) => p.replace(".full.json.gz", "-td0.35-claude-sonnet-5-5.full.json.gz") },
] as const;

export interface Rec {
  header: { game_id: string; seed: number; docs: Record<string, string> };
  lines: GameLine[];
  thoughts: Thought[];
  memory: { entries: MemoryEntry[]; beliefs: Belief[]; dropped: { pass: string; reason: string }[]; notes?: { pass: string; kind: string }[] };
  knowledge_checks: { character: string; fact: string; verdict: { verdict?: string; reasoning?: string; evidence?: string[]; told_by?: string[] } | null }[];
  calls: { kind: string; costUsd: number; inputTokens: number; outputTokens: number; attempt: number }[];
  summary: { replay?: { cost_usd: number; calls: number } };
}
export const readRec = (p: string): Rec => JSON.parse(gunzipSync(readFileSync(p)).toString());

// ---- The rubric: three fixed prompts, fingerprinted ------------------------------------------------

type Def = { term: string; line: string };

export function listingSystem(defs: Def[]): string {
  const star = defs.filter((d) => [...STAR, "toward"].includes(d.term));
  return `You are auditing a political intrigue game played by AI characters (Florence, 1492). You will read the lines spoken in one conversation during one turn, with that conversation's earlier lines for context. List every promise, deal, threat, and admission made in THIS TURN'S LINES, judged by these definitions, word for word, and nothing else.

DEFINITIONS
${star.map((d) => d.line).join("\n")}

Rules:
- Only these four kinds are items. Claims, denials, requests, orders, questions, greetings, flattery, insults, and Il Notaio's notes are not items. Payments in bracketed lines are recorded by code and are not items, though words spoken with a payment can make a deal.
- List items only from THIS TURN'S LINES. The context lines come earlier and only show what this turn's lines answer: a deal accepted in this turn's lines whose offer came in the context counts, at the line that accepts it.
- One item per distinct commitment, exchange, threat, or confession. If one line holds two (a promise and an admission), list both. If the same commitment is repeated over several lines, list it once, with every line it rests on.
- Judge what the speaker says, not whether it is true: a lie is still said.

For each item give lines (the line IDs it rests on, the line that makes it first), type, speaker, toward (by the definition above, or null), and a short description.
Reply with JSON only: {"items": [{"lines": ["L12"], "type": "promise", "speaker": "Full Name", "toward": "Full Name or null", "description": "..."}]}. If there are none, {"items": []}.`;
}

export function matchingSystem(defs: Def[]): string {
  return `You are checking a clerk's memory records of one conversation in one turn of a political intrigue game played by AI characters (Florence, 1492) against a fixed list of that turn's promises, deals, threats, and admissions. The list was made from the lines alone, before any record was read, and is final: never add to it or change it.

DEFINITIONS (the clerks' own, word for word; judge by these and nothing else)
${defs.map((d) => d.line).join("\n")}

You get the turn's lines (with context lines), THE LIST (items I1, I2, …), and the clerk's ENTRIES: ★ entries (promise, deal, threat, admission) from one pass, and claim and denial entries from another.
1. matches: for every list item, the ID of the ★ entry that records it (an entry of the same type for the same commitment, exchange, threat, or confession, resting on one of the item's lines or a line of the same exchange), or null if no entry records it. An entry captures at most one item. An entry of another type doesn't capture an item.
2. unmatched: every entry that captures no list item (every claim and denial entry is one), with a verdict:
   - "invented": not a valid entry of its type for its line under the definitions; or the wrong speaker; or a summary that says more than its line.
   - "valid_unlisted": a valid entry of its type for its line, with the right speaker and a summary that says no more than the line.
   Give a one-sentence reason, and for "invented" a kind: "not_valid", "wrong_speaker", or "overstated". Recording a lie as something said is correct, not invented. A "toward" that differs from its definition doesn't on its own make an entry invented.
Reply with JSON only: {"matches": [{"item": "I1", "entry": "E3 or null"}], "unmatched": [{"entry": "E7", "verdict": "invented or valid_unlisted", "kind": "not_valid, wrong_speaker, overstated, or null", "reason": "..."}]}.`;
}

export function beliefsSystem(): string {
  return `You are auditing the memory records of a political intrigue game played by AI characters (Florence, 1492). A clerk read each character's private thoughts from one turn and recorded the beliefs they hold, each as a conclusion or a suspicion, with a quote from the thought. Check each belief against its source thought.

unsupported: beliefs that their source thought doesn't support: a suspicion recorded as a conclusion, or a belief the thought doesn't hold. Return an empty list where nothing qualifies.
Reply with JSON only: {"unsupported": [{"belief": "B3", "reason": "..."}]}.`;
}

/** Registered fingerprints of the three prompts with their definitions; an unregistered one stops the run. */
const RUBRICS: Record<string, string> = {
  // gate8 v3 (CC-20261107-05): these three prompts, with TD v0.35's seven DEFINITIONS lines (unchanged since v0.7).
  bf6627ab7d4e: "gate8 v3",
};
export function rubric(defs: Def[]): { name: string; fingerprint: string } {
  const fingerprint = createHash("sha1").update([listingSystem(defs), matchingSystem(defs), beliefsSystem(), JUDGE].join("\n---\n")).digest("hex").slice(0, 12);
  return { name: RUBRICS[fingerprint] ?? "unregistered", fingerprint };
}

// ---- The data each call reads ----------------------------------------------------------------------

export interface ConvTurn {
  key: string;
  turn: number;
  conversation: string;
  lines: GameLine[];
  context: GameLine[];
}

/** Every conversation-turn with a spoken line, as 10a and 10d read them (extract.ts). */
export function convTurns(rec: Rec): ConvTurn[] {
  const out: ConvTurn[] = [];
  const turns = [...new Set(rec.lines.map((l) => l.turn))].sort((a, b) => a - b);
  for (const turn of turns) {
    const turnLines = rec.lines.filter((l) => l.turn === turn && l.kind !== "private");
    for (const conversation of [...new Set(turnLines.filter((l) => l.kind === "speech").map((l) => l.conversation))]) {
      out.push({
        key: `T${turn}-${conversation}`,
        turn,
        conversation,
        lines: turnLines.filter((l) => l.conversation === conversation),
        context: rec.lines.filter((l) => l.conversation === conversation && l.turn < turn && l.kind !== "private").slice(-CONTEXT_LINES),
      });
    }
  }
  return out;
}

const shown = (ls: GameLine[]) => ls.map((l) => `[${l.id}] ${formatLine(l)}`).join("\n") || "None.";

export function listingUser(ct: ConvTurn): string {
  return `CONTEXT LINES (earlier; not to be listed)\n${shown(ct.context)}\n\nTHIS TURN'S LINES (turn ${ct.turn})\n${shown(ct.lines)}`;
}

export interface Item {
  id: string;
  lines: string[];
  type: string;
  speaker: string;
  toward: string | null;
  description: string;
}

export const entriesOf = (rec: Rec, ct: ConvTurn) => rec.memory.entries.filter((e) => e.turn === ct.turn && e.conversation === ct.conversation && (e.source === "10a" || e.source === "10d"));

export function matchingUser(ct: ConvTurn, items: Item[], entries: MemoryEntry[]): string {
  return `${listingUser(ct)}

THE LIST
${items.map((i) => `[${i.id}] ${i.type}; speaker ${i.speaker}; toward ${i.toward ?? "–"}; lines ${i.lines.join(", ")}: ${i.description}`).join("\n") || "No items."}

ENTRIES
${entries.map((e) => `[${e.id}] ${e.type} (${e.source === "10a" ? "★ pass" : "claims pass"}); speaker ${e.speaker ?? "–"}; toward ${e.toward ?? "–"}; line ${e.line ?? e.lines[0]}${e.context?.length ? `, context ${e.context.join(", ")}` : ""}: ${e.summary}${e.quote ? ` ("${e.quote}")` : ""}`).join("\n") || "None."}`;
}

/** v2's beliefs scope: those first recorded or changed this turn, with their source thought. */
export function beliefsUser(rec: Rec, turn: number): string | null {
  const beliefs = rec.memory.beliefs.filter((b) => b.firstTurn === turn || b.lastTurn === turn);
  if (!beliefs.length) return null;
  const text = new Map(rec.thoughts.map((t) => [t.id, t.text]));
  return `TURN ${turn}\n\n${beliefs.map((b) => `[${b.id}] ${b.character} · ${b.kind} (${b.status}): ${b.statement}\n  quote: "${b.quote}"\n  source thought ${b.thought}: ${text.get(b.thought) ?? "?"}`).join("\n")}`;
}

// ---- The judge -------------------------------------------------------------------------------------

export class Judge {
  private client: Pick<Anthropic, "messages">;
  private log: RunLog;
  private reserved = 0;
  spent = 0;
  usage = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0, calls: 0 };

  constructor(
    runId: string,
    private stop: number,
    client?: Pick<Anthropic, "messages">,
  ) {
    // Only the credit key: other Anthropic credentials are dropped unread.
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    const apiKey = process.env.CLAUDE_CREDIT_API_KEY;
    if (!client && !apiKey) throw new Error("No CLAUDE_CREDIT_API_KEY in .env");
    this.client = client ?? new Anthropic({ apiKey, maxRetries: 4 });
    this.log = new RunLog(runId, "judge-gate8v3-", CREDIT_LEDGER);
  }

  /** One judge call: cached instructions, the data, JSON back (one retry on unusable JSON). Thinking is the model's default. */
  async ask(system: string, user: string, what: string): Promise<unknown> {
    const price = CLAUDE_PRICES[JUDGE]!;
    const maxTokens = 8000;
    const worst = ((system.length + user.length) / 3) * price.cacheWrite + maxTokens * price.output;
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (priorSpend(CREDIT_LEDGER) + this.reserved + worst > this.stop) throw new StopError(`the next judge call could pass the Claude-credit stop ($${this.stop})`);
      this.reserved += worst;
      let res: Anthropic.Message;
      try {
        res = await this.client.messages.create({
          model: JUDGE,
          max_tokens: maxTokens,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: user + (attempt === 2 ? "\n\nYour last reply wasn't usable JSON. Reply with only the JSON asked for." : "") }],
        });
      } catch (e) {
        this.reserved -= worst;
        if (e instanceof Anthropic.APIError) throw new StopError(`Claude API error (${e.status ?? "no status"}): ${e.message.slice(0, 200)}`);
        throw e;
      }
      this.reserved -= worst;
      const u = { input: res.usage.input_tokens, output: res.usage.output_tokens, cacheWrite: res.usage.cache_creation_input_tokens ?? 0, cacheRead: res.usage.cache_read_input_tokens ?? 0 };
      const cost = claudeCost(price, u);
      this.spent += cost;
      for (const k of ["input", "output", "cacheWrite", "cacheRead"] as const) this.usage[k] += u[k];
      this.usage.calls++;
      this.log.write({ type: "claude-call", model: res.model, what, attempt, stop: res.stop_reason, usage: u, costUsd: cost, at: new Date().toISOString() } as unknown as LogRecord);
      if (res.stop_reason === "refusal") throw new StopError(`the judge refused (${what})`);
      const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      const j = parseJson(text);
      if (!j.error) return j.json;
    }
    throw new Error(`No usable JSON from the judge for ${what}`);
  }
}

export class StopError extends Error {}

/** Runs tasks with at most `n` at once. */
async function pool<T>(tasks: (() => Promise<T>)[], n: number): Promise<T[]> {
  const out: T[] = new Array(tasks.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (next < tasks.length) {
        const i = next++;
        out[i] = await tasks[i]!();
      }
    }),
  );
  return out;
}

const gameDir = (rec: Rec) => join(OUT, rec.header.game_id);

/** Step 1: the list, once per game, from the lines alone. Written before any matching; never rewritten. */
async function list(judge: Judge, defs: Def[], path: string): Promise<void> {
  const rec = readRec(path);
  const dest = join(gameDir(rec), "list.json");
  if (existsSync(dest)) return console.log(`${rec.header.game_id}: list exists, kept`);
  mkdirSync(gameDir(rec), { recursive: true });
  const cts = convTurns(rec);
  const sys = listingSystem(defs);
  let n = 0;
  const lists = await pool(
    cts.map((ct) => async () => {
      const r = (await judge.ask(sys, listingUser(ct), `list ${rec.header.game_id} ${ct.key}`)) as { items?: Omit<Item, "id">[] };
      return { key: ct.key, items: (r.items ?? []).map((i) => ({ ...i, id: `I${++n}` })) };
    }),
    4,
  );
  writeFileSync(dest, JSON.stringify({ game: rec.header.game_id, rubric: rubric(defs), at: new Date().toISOString(), convTurns: lists }, null, 1));
  console.log(`${rec.header.game_id}: ${lists.reduce((a, l) => a + l.items.length, 0)} items over ${cts.length} conversation-turns; judge $${judge.spent.toFixed(3)} so far`);
}

/** Step 2: each recorder against the fixed list, and its beliefs. */
async function match(judge: Judge, defs: Def[], path: string): Promise<void> {
  const base = readRec(path);
  const listFile = join(gameDir(base), "list.json");
  if (!existsSync(listFile)) throw new Error(`${base.header.game_id}: no list yet; run "list" first`);
  const fixed = JSON.parse(readFileSync(listFile, "utf8")) as { convTurns: { key: string; items: Item[] }[] };
  const items = new Map(fixed.convTurns.map((c) => [c.key, c.items]));
  for (const r of RECORDERS) {
    const dest = join(gameDir(base), `match-${r.name}.json`);
    if (existsSync(dest)) {
      console.log(`${base.header.game_id} ${r.name}: matched already, kept`);
      continue;
    }
    const rec = readRec(r.path(path));
    const cts = convTurns(rec);
    if (cts.map((c) => c.key).join() !== fixed.convTurns.map((c) => c.key).join()) throw new Error(`${r.name}'s record has other conversation-turns than the list`);
    const matches = await pool(
      cts.map((ct) => async () => {
        const its = items.get(ct.key)!;
        const es = entriesOf(rec, ct);
        if (!its.length && !es.length) return { key: ct.key, matches: [], unmatched: [] };
        const j = (await judge.ask(matchingSystem(defs), matchingUser(ct, its, es), `match ${r.name} ${base.header.game_id} ${ct.key}`)) as { matches?: { item: string; entry: string | null }[]; unmatched?: { entry: string; verdict: string; kind: string | null; reason: string }[] };
        return { key: ct.key, matches: j.matches ?? [], unmatched: j.unmatched ?? [] };
      }),
      4,
    );
    const turns = [...new Set(rec.memory.beliefs.flatMap((b) => [b.firstTurn, b.lastTurn]))].sort((a, b) => a - b);
    const beliefs = await pool(
      turns.map((t) => async () => {
        const u = beliefsUser(rec, t);
        if (!u) return { turn: t, unsupported: [] };
        const j = (await judge.ask(beliefsSystem(), u, `beliefs ${r.name} ${base.header.game_id} T${t}`)) as { unsupported?: { belief: string; reason: string }[] };
        return { turn: t, unsupported: j.unsupported ?? [] };
      }),
      4,
    );
    writeFileSync(dest, JSON.stringify({ game: base.header.game_id, recorder: r.label, record: r.path(path), rubric: rubric(defs), at: new Date().toISOString(), convTurns: matches, beliefs }, null, 1));
    console.log(`${base.header.game_id} ${r.name}: matched; judge $${judge.spent.toFixed(3)} so far`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [step, ...paths] = process.argv.slice(2);
  const docs = loadDocs(config.docs);
  const defs = memoryDefinitions(docs);
  const rb = rubric(defs);
  console.log(`Rubric ${rb.name} (${rb.fingerprint}), DEFINITIONS from TD v${docs.versions.technicalDesign}; judge ${JUDGE}; commit ${gitCommit()}`);
  if (step === "fingerprint") process.exit(0);
  if (rb.name === "unregistered") throw new Error(`Rubric fingerprint ${rb.fingerprint} isn't registered (RUBRICS in gate8v3.ts); register it before judging`);
  if (step !== "list" && step !== "match") throw new Error('Steps: fingerprint, list, match');
  const stop = Number(process.env.CLAUDE_CREDIT_STOP_USD);
  if (!Number.isFinite(stop)) throw new Error("Set CLAUDE_CREDIT_STOP_USD: the Claude-credit ledger total to stop at");
  const judge = new Judge(`${new Date().toISOString().replace(/[:.]/g, "-")}-${step}`, stop);
  try {
    for (const p of paths) await (step === "list" ? list : match)(judge, defs, p);
  } catch (e) {
    if (!(e instanceof StopError)) throw e;
    console.log(`STOPPED: ${e.message}`);
    process.exitCode = 1;
  }
  const u = judge.usage;
  console.log(`Judge: ${u.calls} calls, $${judge.spent.toFixed(4)}; cache read ${u.cacheRead} of ${u.input + u.cacheWrite + u.cacheRead} prompt tokens; Claude-credit ledger $${priorSpend(CREDIT_LEDGER).toFixed(4)}`);
}
