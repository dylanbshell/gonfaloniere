// Runs mini-games (Models & Research v0.22, Mini-Game Spec) and writes each
// game's full record (TD v0.5, Game Record & Export) plus a readable
// transcript and memory dump.
//
//   npm run minigame -- --games 1 --turns 2 --cap 1      the dry run
//   npm run minigame -- --games 5 --turns 8 --cap 10     the full run (after a hand-read)
//
// Spend is logged to results/minigame/ (its own ledger; PROBE_TOTAL_USD caps
// the total). Model: DeepSeek V4.1 Flash for character calls (temperature 0.7)
// and system calls (temperature 0), thinking off, on TD v0.5 and Characters
// v0.4 with the Mini-Game Spec's stand-in briefings.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import { config, type ModelConfig } from "../../probe.config.ts";
import { ALIASES, ROSTER, type CharacterName } from "../game/roster.ts";
import { Budget, worstCaseCost } from "../harness/budget.ts";
import { RunLog, gitCommit, priorSpend, type LogRecord } from "../harness/log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient } from "../harness/openrouter.ts";
import { loadDocs, loadStandinBriefings } from "../sources/docs.ts";
import { MiniGame, formatLine, type Caller, type GameSettings } from "./engine.ts";
import { renderBelief, renderEntry, whereLabel } from "./memory.ts";

const { values: opts } = parseArgs({
  options: {
    games: { type: "string", default: "1" },
    turns: { type: "string", default: "8" },
    cap: { type: "string", default: "1" },
    seed: { type: "string", default: "1492" },
    model: { type: "string", default: "deepseek-v4.1-flash" },
  },
});

const OUT = process.env.PROBE_RESULTS_DIR ?? "results/minigame";
const CAST: CharacterName[] = ["Lupo", "Contessa Isabella", "Captain Armand LeNoir", "Francesco Pazzi", "Raffaello de' Medici", "Giorgia Pazzi"];
const STANDINS: CharacterName[] = ["Francesco Pazzi", "Raffaello de' Medici", "Giorgia Pazzi"];
const STANDIN_FILE = "scenarios/minigame-standin-briefings.md";

/** Knowledge checks at game end: (LeNoir, F2) for the plot points, plus the secret-spread grid. */
function checks(): GameSettings["checks"] {
  // Who knows each fact at the start (Characters v0.4, Shared Canon), so isn't checked.
  const knows: Record<string, CharacterName[]> = {
    F2: ["Contessa Isabella", "Lupo"],
    F3: ["Giorgia Pazzi", "Captain Armand LeNoir"],
    F4: ["Contessa Isabella", "Lupo"],
    F5: ["Lupo", "Contessa Isabella"],
  };
  return Object.entries(knows).flatMap(([fact, holders]) => CAST.filter((c) => !holders.includes(c)).map((character) => ({ character, fact })));
}

async function main(): Promise<void> {
  // The run's spend goes to the mini-game ledger.
  process.env.PROBE_RESULTS_DIR = OUT;
  const docs = loadDocs(config.docs);
  if (!docs.systemPrompts) throw new Error("This Technical Design has no extraction or knowledge-check prompts (TD v0.5+)");
  const briefings = { ...docs.briefings, ...loadStandinBriefings(STANDIN_FILE, STANDINS, docs.socialAwareness) };
  const model = config.models.find((m) => m.id === opts.model)!;
  const client = makeClient(apiKey());
  const endpoint = await fetchEndpoint(model);
  const budget = new Budget(Number(opts.cap), config.budget.totalUsd, priorSpend(OUT));
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-minigame`;
  const log = new RunLog(runId, "minigame-", OUT);
  const settingsBase = {
    cast: CAST,
    turns: Number(opts.turns),
    utterancesPerTurn: 12,
    historyWindow: 10,
    thoughtWindow: 4,
    maxCapannello: 4,
    maxTokens: { plan: 400, think: 250, speak: 200, move: 500, murder: 300, "conversation-pass": 1200, "thought-pass": 400, "knowledge-check": 300 },
    playTemperature: 0.7,
    systemTemperature: 0,
    checks: checks(),
  } as const;
  log.write({ type: "run", runId, startedAt: new Date().toISOString(), modelId: model.id, endpoint, docVersions: docs.versions, gitCommit: gitCommit(), settings: { ...settingsBase, games: opts.games, cap: opts.cap } } as unknown as LogRecord);
  console.log(`Mini-game: ${opts.games} game(s) × ${opts.turns} turns on ${model.id} via ${endpoint.providerName}; cap $${opts.cap}; ledger $${budget.priorSpendUsd.toFixed(2)} spent before this`);
  console.log(`Docs: TD v${docs.versions.technicalDesign}, Characters v${docs.versions.characters}, Mechanics v${docs.versions.mechanics}, Models & Research v${docs.versions.modelsResearch}. Stand-ins: ${STANDINS.join(", ")}`);

  const caller: Caller = async (req) => {
    const worst = worstCaseCost(req.system.length + req.user.length, req.maxTokens, endpoint.price);
    if (!budget.tryReserve(worst)) return null;
    const res = await callModel(client, {
      model: model as ModelConfig,
      prompt: req.user,
      system: req.system,
      temperature: req.temperature,
      maxTokens: req.maxTokens,
      extra: model.thinkingOff ?? config.thinkingOff,
    });
    const cost = res.ok ? (res.usage.costUsd ?? res.usage.inputTokens * endpoint.price.input + res.usage.outputTokens * endpoint.price.output) : 0;
    budget.settle(worst, cost);
    log.write({ type: "minigame-call", runId, kind: req.kind, character: req.character, costUsd: cost, ok: res.ok, at: new Date().toISOString() } as unknown as LogRecord);
    return res.ok
      ? { ok: true, content: res.content, error: null, costUsd: cost, inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens, latencyMs: res.latencyMs, provider: res.provider }
      : { ok: false, content: "", error: res.error, costUsd: 0, inputTokens: 0, outputTokens: 0, latencyMs: res.latencyMs, provider: null };
  };

  mkdirSync(OUT, { recursive: true });
  for (let g = 0; g < Number(opts.games); g++) {
    const seed = Number(opts.seed) + g;
    const gameId = `${runId}-g${g + 1}`;
    const started = Date.now();
    const game = new MiniGame(docs, { ...settingsBase, briefings, seed }, caller);
    await game.play();
    const record = buildRecord(game, { gameId, seed, docs, briefings, model, endpoint, settings: settingsBase, ms: Date.now() - started });
    const base = join(OUT, `game-${gameId}`);
    writeFileSync(`${base}.full.json.gz`, gzipSync(JSON.stringify(record)));
    writeFileSync(`${base}.transcript.md`, transcript(game, gameId));
    writeFileSync(`${base}.memory.md`, memoryDump(game, gameId));
    const cost = game.calls.reduce((s, c) => s + c.costUsd, 0);
    console.log(
      `Game ${g + 1}${game.stopped ? " (STOPPED at the cap; record marked incomplete)" : ""}: ${game.calls.length} calls, $${cost.toFixed(4)}, ${((Date.now() - started) / 1000).toFixed(0)}s.\n  ${base}.full.json.gz\n  ${base}.transcript.md\n  ${base}.memory.md`,
    );
    if (game.stopped) break;
  }
  console.log(`Spent $${budget.spentUsd.toFixed(4)}.`);
}

/** TD v0.5 Game Record & Export, full variant. Secrets never included. */
function buildRecord(game: MiniGame, x: { gameId: string; seed: number; docs: ReturnType<typeof loadDocs>; briefings: Partial<Record<CharacterName, string>>; model: ModelConfig; endpoint: { providerName: string; quantization: string }; settings: object; ms: number }) {
  const byKind = new Map<string, { calls: number; valid: number; retried: number; defaulted: number; repaired: number }>();
  for (const c of game.calls) {
    const k = byKind.get(c.kind) ?? { calls: 0, valid: 0, retried: 0, defaulted: 0, repaired: 0 };
    k.calls++;
    if (c.verdict === "valid") k.valid++;
    if (c.attempt === 2) k.retried++;
    if (c.verdict === "default") k.defaulted++;
    if (c.repairs.length) k.repaired++;
    byKind.set(c.kind, k);
  }
  return {
    schema_version: 1,
    variant: "full",
    complete: !game.stopped,
    header: {
      game_id: x.gameId,
      date: new Date().toISOString(),
      engine: { name: "gonfaloniere-minigame", commit: gitCommit() },
      docs: x.docs.versions,
      config: { model: x.model.slug, provider: x.endpoint.providerName, quantization: x.endpoint.quantization, thinking: "off", ...x.settings, plot_reward: false },
      seed: x.seed,
      roster: ROSTER,
      aliases: ALIASES,
      cast: CAST,
      personality: "none: stock model; the secret-keeping lines are part of TD v0.5's prompts",
      standins: { characters: STANDINS, source: `${STANDIN_FILE} (adapted from PitP_Original_Rules_Trimmed)` },
      tunables: x.docs.tunables,
      briefings: x.briefings,
    },
    prefixes: game.prefixes,
    events: game.events,
    lines: game.lines,
    thoughts: game.thoughts,
    calls: game.calls,
    memory: { entries: game.memory.entries, beliefs: game.memory.beliefs, dropped: game.memory.dropped },
    snapshots: game.snapshots,
    murder_round: { resolved: false, acts: game.murderActs },
    knowledge_checks: game.knowledgeChecks,
    summary: {
      wall_ms: x.ms,
      calls: game.calls.length,
      cost_usd: game.calls.reduce((s, c) => s + c.costUsd, 0),
      tokens: game.calls.reduce((s, c) => s + c.inputTokens + c.outputTokens, 0),
      by_call_kind: Object.fromEntries(byKind),
      turns: game.events.filter((e) => e.type === "turn-end"),
    },
  };
}

/** The game in reading order: lines, thoughts, moves, and end-of-turn work. */
function transcript(game: MiniGame, gameId: string): string {
  const out = [`# Mini-game ${gameId}: transcript`, ""];
  const lineById = new Map(game.lines.map((l) => [l.id, l]));
  let turn = -1;
  for (const e of game.events) {
    if (e.turn !== turn) {
      turn = e.turn;
      out.push("", turn === 0 ? "## Opening" : `## Turn ${turn}`, "");
    }
    if (e.type === "capannelli") out.push(`*Groups: ${(e.groups as string[][]).map((g) => g.join(", ")).join(" | ")}. Movement order: ${(e.rotation as string[]).join(", ")}.*`);
    if (e.type === "plan") out.push(`**${e.character}'s plan:** ${e.plan}`, `  *(thought: ${e.thought})*`);
    if (e.type === "speech" || e.type === "notaio") {
      const l = lineById.get(e.line as string)!;
      out.push(`- \`${l.id}\` *${whereLabel(l.where)}* — ${formatLine(l)}`);
    }
    if (e.type === "thought" && e.call !== "plan") out.push(`  - *${e.character} thinks (${e.call}${e.importance !== undefined ? `, importance ${e.importance}` : ""}${e.done ? ", done" : ""}):* ${e.text}`);
    if (e.type === "bribe") out.push(`  - **[${e.from} gave ${e.to} ${e.amount} Florins.]**`);
    if (e.type === "borrow" || e.type === "repay") out.push(`  - **[${e.character}: ${e.type}${e.holder ? ` for ${e.holder}` : ""}]** (private)`);
    if (e.type === "move") out.push(`- **Movement window: ${e.character}** → ${e.choice}${e.target ? ` ${e.target}` : ""}${e.note ? ` (${e.note})` : ""}`);
    if (["colloquio-open", "colloquio-close", "colloquio-done", "colloquio-waits", "ping-pong-guard", "stall", "move-noop"].includes(e.type)) out.push(`- *${e.type}: ${JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => !["turn", "type"].includes(k))))}*`);
    if (e.type === "conversation-pass") out.push(`- *conversation pass ${e.conversation}: stored ${(e.stored as string[]).join(", ") || "nothing"}; dropped ${e.dropped}*`);
    if (e.type === "thought-pass") out.push(`- *thought pass ${e.character}: beliefs ${(e.changed as string[]).join(", ") || "none"}; dropped ${e.dropped}*`);
    if (e.type === "turn-end") out.push(`- *end of turn: ${e.calls} calls, $${(e.costUsd as number).toFixed(4)}, ${((e.ms as number) / 1000).toFixed(0)}s*`);
    if (e.type === "murder-act") out.push(`- **Murder Round (not resolved): ${e.character}** → ${JSON.stringify(e.acts)}`);
  }
  out.push("", "## Knowledge checks (end of game)", "");
  for (const k of game.knowledgeChecks as { character: string; fact: string; verdict: { verdict: string; reasoning: string; told_by: string[] } | null; flags: string[] }[]) {
    out.push(`- (${k.character}, ${k.fact}): **${k.verdict?.verdict ?? "none"}**${k.flags.length ? ` ⚑ ${k.flags.join("; ")}` : ""} — ${k.verdict?.reasoning ?? ""}`);
  }
  return `${out.join("\n")}\n`;
}

function memoryDump(game: MiniGame, gameId: string): string {
  const out = [`# Mini-game ${gameId}: memory`, "", "## Entries (longTermHistory)", ""];
  for (const e of game.memory.entries.filter((x) => x.type !== "event")) {
    out.push(`- \`${e.id}\` ${renderEntry(e)} — speaker ${e.speaker ?? "–"}, lines ${e.lines.join(", ")}, heard by ${e.audience.join(", ")} (${e.source})`);
  }
  out.push("", `Il Notaio event entries (code): ${game.memory.entries.filter((x) => x.type === "event").length}`, "", "## Beliefs", "");
  for (const b of game.memory.beliefs) out.push(`- \`${b.id}\` ${b.character} · ${renderBelief(b)} (${b.status}; from ${b.thought}: "${b.quote}")`);
  out.push("", "## Dropped extraction entries", "");
  for (const d of game.memory.dropped) out.push(`- ${d.pass} turn ${d.turn} ${d.scope}: ${d.reason} — \`${JSON.stringify(d.entry).slice(0, 300)}\``);
  return `${out.join("\n")}\n`;
}

main();
