// Runs mini-games (Models & Research v0.22, Mini-Game Spec) and writes each
// game's full record (TD v0.5, Game Record & Export) plus a readable
// transcript and memory dump.
//
//   npm run minigame -- --games 1 --turns 2 --cap 1      the dry run
//   npm run minigame -- --games 5 --turns 8 --cap 10     the full run (after a hand-read)
//   npm run minigame -- --games 5 --model qwen3.8-27b --parallel 2 --replacements 2 \
//     --seed 3000 --preflight 5 --ref-calls 506 --progress results/minigame/qwen-progress.txt
//
// Spend is logged to results/minigame/ (its own ledger; PROBE_TOTAL_USD caps
// the total). Character calls go to --model (temperature 0.7), system calls
// (both extraction passes, knowledge checks) to --system-model (temperature 0),
// thinking off, on TD v0.5 and Characters v0.4 with the Mini-Game Spec's
// stand-in briefings.
//
// Games run up to --parallel at a time in this one process. They share only
// the Budget, whose check-and-reserve is synchronous, so two games can't both
// pass the cap check; each game has its own log file (appended line by line)
// and record. A 429 or timeout is retried up to 5 tries with backoff, every
// retry logged; any other failure, or a reply from another provider or model,
// ends that game (kept, marked incomplete, replaced up to --replacements
// times). More than 10% of calls needing a retry in a 10-minute window (once
// it holds 30 calls) drops the run to one game at a time.

import { execSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { gunzipSync, gzipSync } from "node:zlib";
import { config, type ModelConfig } from "../../probe.config.ts";
import { ALIASES, ROSTER, type CharacterName } from "../game/roster.ts";
import { Budget, worstCaseCost } from "../harness/budget.ts";
import { RunLog, gitCommit, priorSpend, type LogRecord } from "../harness/log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient, type EndpointInfo, type RetryPolicy } from "../harness/openrouter.ts";
import { loadDocs, loadStandinBriefings } from "../sources/docs.ts";
import { CAST, STANDINS, STANDIN_FILE } from "./cast.ts";
import { MiniGame, formatLine, type CallKind, type Caller, type GameSettings } from "./engine.ts";
import { renderBelief, renderEntry, whereLabel } from "./memory.ts";

const { values: opts } = parseArgs({
  options: {
    games: { type: "string", default: "1" },
    turns: { type: "string", default: "8" },
    cap: { type: "string", default: "1" },
    seed: { type: "string", default: "1492" },
    model: { type: "string", default: "deepseek-v4.1-flash" },
    "system-model": { type: "string", default: "deepseek-v4.1-flash" },
    parallel: { type: "string", default: "1" },
    replacements: { type: "string", default: "0" },
    preflight: { type: "string", default: "0" },
    "preflight-only": { type: "boolean", default: false },
    "ref-calls": { type: "string" },
    progress: { type: "string" },
  },
});

const OUT = process.env.PROBE_RESULTS_DIR ?? "results/minigame";
const SYSTEM_KINDS: CallKind[] = ["conversation-pass", "thought-pass", "knowledge-check"];
const RETRY: Omit<RetryPolicy, "onRetry"> = { maxAttempts: 5, retryable: (status) => status === 429 || status === null };
const WINDOW_MS = 10 * 60_000;
const WINDOW_MIN_CALLS = 30;

/**
 * Knowledge checks at game end: the secret-spread grid, F2–F5 for every cast member (Dylan,
 * Oct 24). (LeNoir, F2) is the one that settles Isabella's, LeNoir's, and Raffaello's plot points.
 */
function checks(): GameSettings["checks"] {
  return ["F2", "F3", "F4", "F5"].flatMap((fact) => CAST.map((character) => ({ character, fact })));
}

/** Tracked changes and untracked files, recorded with each game. */
function workingTree(): { tracked_changes: string[]; untracked: string[] } {
  const lines = execSync("git status --porcelain", { stdio: ["ignore", "pipe", "ignore"] }).toString().split("\n").filter(Boolean);
  return { tracked_changes: lines.filter((l) => !l.startsWith("??")), untracked: lines.filter((l) => l.startsWith("??")).map((l) => l.slice(3)) };
}

/** A game ends: a call failed for good, or a reply came from the wrong provider or model. */
class GameFailure extends Error {}

interface Served {
  model: ModelConfig;
  endpoint: EndpointInfo;
  /** The model ID OpenRouter reports serving, seen in pre-flight. */
  servedId: string | null;
}

async function main(): Promise<void> {
  // The run's spend goes to the mini-game ledger.
  process.env.PROBE_RESULTS_DIR = OUT;
  const docs = loadDocs(config.docs);
  if (!docs.systemPrompts) throw new Error("This Technical Design has no extraction or knowledge-check prompts (TD v0.5+)");
  const briefings = { ...docs.briefings, ...loadStandinBriefings(STANDIN_FILE, STANDINS, docs.socialAwareness) };
  const pick = (id: string) => {
    const m = config.models.find((x) => x.id === id);
    if (!m) throw new Error(`No model "${id}" in probe.config.ts`);
    return m;
  };
  const charModel = pick(opts.model!);
  const sysModel = pick(opts["system-model"]!);
  const client = makeClient(apiKey());
  const served: Record<"character" | "system", Served> = {
    character: { model: charModel, endpoint: await fetchEndpoint(charModel), servedId: null },
    system: { model: sysModel, endpoint: await fetchEndpoint(sysModel), servedId: null },
  };
  const budget = new Budget(Number(opts.cap), config.budget.totalUsd, priorSpend(OUT));
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-minigame`;
  const runLog = new RunLog(runId, "minigame-", OUT);
  const tree = workingTree();
  if (tree.tracked_changes.length) throw new Error(`Tracked files have uncommitted changes; commit first so the record's commit is the code that ran:\n${tree.tracked_changes.join("\n")}`);
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
  const parallel = Number(opts.parallel);
  const replacements = Number(opts.replacements);
  const wanted = Number(opts.games);
  runLog.write({ type: "run", runId, startedAt: new Date().toISOString(), modelId: charModel.id, systemModelId: sysModel.id, endpoint: served.character.endpoint, systemEndpoint: served.system.endpoint, docVersions: docs.versions, gitCommit: gitCommit(), workingTree: tree, settings: { ...settingsBase, games: wanted, cap: opts.cap, parallel, replacements, seed: opts.seed } } as unknown as LogRecord);
  console.log(`Mini-game: ${wanted} game(s) × ${opts.turns} turns; characters on ${charModel.id} via ${served.character.endpoint.providerName}, system calls on ${sysModel.id} via ${served.system.endpoint.providerName}; up to ${parallel} at a time; cap $${opts.cap}; ledger $${budget.priorSpendUsd.toFixed(2)} spent before this (total cap $${config.budget.totalUsd})`);
  console.log(`Docs: TD v${docs.versions.technicalDesign}, Characters v${docs.versions.characters}, Mechanics v${docs.versions.mechanics}, Models & Research v${docs.versions.modelsResearch}. Stand-ins: ${STANDINS.join(", ")}. Commit ${gitCommit()}; untracked: ${tree.untracked.join(", ") || "none"}`);

  // ---- Pre-flight: thinking off and the pinned provider, on both models -------------------------
  const preflight = async (role: "character" | "system", n: number) => {
    const sv = served[role];
    for (let i = 1; i <= n; i++) {
      const worst = worstCaseCost(200, 40, sv.endpoint.price);
      if (!budget.tryReserve(worst)) throw new Error("Pre-flight would exceed the cap");
      const res = await callModel(client, { model: sv.model, prompt: `Pre-flight check ${i}. Reply with the single word: ready.`, temperature: 0.7, maxTokens: 40, extra: sv.model.thinkingOff ?? config.thinkingOff }, { ...RETRY });
      const cost = res.ok ? (res.usage.costUsd ?? 0) : 0;
      budget.settle(worst, cost);
      runLog.write({ type: "minigame-preflight", runId, role, model: sv.model.id, i, ok: res.ok, costUsd: cost, ...(res.ok && { provider: res.provider, servedModel: res.model, reasoningTokens: res.usage.reasoningTokens, reasoningText: !!res.reasoning, content: res.content.slice(0, 40) }), ...(!res.ok && { error: res.error, status: res.status }), at: new Date().toISOString() } as unknown as LogRecord);
      if (!res.ok) throw new Error(`Pre-flight ${role} ${i} failed: ${res.status} ${res.error}`);
      console.log(`  pre-flight ${role} ${i}: provider ${res.provider}, model ${res.model}, reasoning tokens ${res.usage.reasoningTokens}${res.reasoning ? " (reasoning text returned)" : ""}, "${res.content.trim().slice(0, 30)}"`);
      if (res.provider !== sv.endpoint.providerName) throw new Error(`Pre-flight ${role}: served by ${res.provider}, not ${sv.endpoint.providerName}`);
      if (res.usage.reasoningTokens > 0 || res.reasoning) throw new Error(`Pre-flight ${role}: thinking isn't off (${res.usage.reasoningTokens} reasoning tokens)`);
      if (sv.servedId !== null && res.model !== sv.servedId) throw new Error(`Pre-flight ${role}: served model changed (${sv.servedId} → ${res.model})`);
      sv.servedId = res.model;
    }
  };
  const preN = Number(opts.preflight);
  if (preN > 0) {
    await preflight("character", preN);
    // The system model is the same one for every system call; one check of its provider and ID.
    if (sysModel.id !== charModel.id) await preflight("system", 1);
    else served.system.servedId = served.character.servedId;
  }
  if (opts["preflight-only"]) {
    console.log(`Pre-flight only. Spent $${budget.spentUsd.toFixed(5)}.`);
    return;
  }

  // ---- Shared state across games: retry window and the one-game-at-a-time gate ------------------
  const window: { at: number; retried: boolean }[] = [];
  let serial = parallel === 1;
  let serialSince: string | null = null;
  let solo: string | null = null;
  let waiters: (() => void)[] = [];
  const gate = async (gameId: string) => {
    while (serial && solo !== null && solo !== gameId) await new Promise<void>((r) => waiters.push(r));
    if (serial && solo === null) solo = gameId;
  };
  const release = (gameId: string) => {
    if (solo !== gameId) return;
    solo = null;
    const w = waiters;
    waiters = [];
    for (const r of w) r();
  };
  const noteCall = (retried: boolean) => {
    const now = Date.now();
    window.push({ at: now, retried });
    while (window.length && window[0]!.at < now - WINDOW_MS) window.shift();
    const share = window.filter((x) => x.retried).length / window.length;
    if (!serial && window.length >= WINDOW_MIN_CALLS && share > 0.1) {
      serial = true;
      serialSince = new Date().toISOString();
      console.log(`RATE LIMITS: ${(100 * share).toFixed(0)}% of ${window.length} calls in the last 10 minutes needed a retry; one game at a time from now on.`);
      runLog.write({ type: "minigame-serial", runId, at: serialSince, share, calls: window.length } as unknown as LogRecord);
    }
  };

  const progress = (line: string) => {
    if (opts.progress) appendFileSync(opts.progress, `${new Date().toISOString()} ${line}\n`);
  };

  mkdirSync(OUT, { recursive: true });
  const refCalls = opts["ref-calls"] ? Number(opts["ref-calls"]) : null;
  type Outcome = { gameId: string; seed: number; status: "complete" | "failed" | "stopped"; failure: string | null; calls: number; costUsd: number; ms: number; retries: number; checks: Record<string, boolean | string> | null };
  const outcomes: Outcome[] = [];

  const runGame = async (n: number, seed: number): Promise<Outcome> => {
    const gameId = `${runId}-g${n}`;
    const log = new RunLog(gameId, "minigame-", OUT);
    let retries = 0;
    const caller: Caller = async (req) => {
      await gate(gameId);
      const sv = served[SYSTEM_KINDS.includes(req.kind) ? "system" : "character"];
      const worst = worstCaseCost(req.system.length + req.user.length, req.maxTokens, sv.endpoint.price);
      // Synchronous check-and-reserve: no other game's call can slip in between.
      if (!budget.tryReserve(worst)) return null;
      let retried = false;
      const res = await callModel(
        client,
        { model: sv.model, prompt: req.user, system: req.system, temperature: req.temperature, maxTokens: req.maxTokens, extra: sv.model.thinkingOff ?? config.thinkingOff },
        {
          ...RETRY,
          onRetry: (r) => {
            retried = true;
            retries++;
            log.write({ type: "minigame-retry", gameId, kind: req.kind, character: req.character, attempt: r.attempt, status: r.status, error: r.error.slice(0, 300), backoffMs: Math.round(r.backoffMs), at: new Date().toISOString() } as unknown as LogRecord);
          },
        },
      );
      const cost = res.ok ? (res.usage.costUsd ?? res.usage.inputTokens * sv.endpoint.price.input + res.usage.outputTokens * sv.endpoint.price.output) : 0;
      budget.settle(worst, cost);
      noteCall(retried);
      log.write({ type: "minigame-call", runId, gameId, kind: req.kind, character: req.character, model: sv.model.id, ...(res.ok && { provider: res.provider, servedModel: res.model, reasoningTokens: res.usage.reasoningTokens }), costUsd: cost, ok: res.ok, ...(!res.ok && { status: res.status, error: res.error.slice(0, 300) }), retried, at: new Date().toISOString() } as unknown as LogRecord);
      if (!res.ok) throw new GameFailure(`${req.kind} call failed (${res.status ?? "no status"}): ${res.error.slice(0, 200)}`);
      if (res.provider !== sv.endpoint.providerName) throw new GameFailure(`${req.kind} call served by ${res.provider}, not the pinned ${sv.endpoint.providerName}`);
      if (sv.servedId !== null && res.model !== sv.servedId) throw new GameFailure(`${req.kind} call served by model ${res.model}, not ${sv.servedId}`);
      return { ok: true, content: res.content, error: null, costUsd: cost, inputTokens: res.usage.inputTokens, outputTokens: res.usage.outputTokens, latencyMs: res.latencyMs, provider: res.provider, model: res.model };
    };

    const started = Date.now();
    const game = new MiniGame(docs, { ...settingsBase, briefings, seed }, caller, {
      turnEnd: (e) => progress(`${gameId} seed ${seed} turn ${e.turn}/${settingsBase.turns} calls ${e.calls} spend $${e.costUsd.toFixed(4)} retries ${retries}`),
    });
    progress(`${gameId} seed ${seed} started`);
    let failure: string | null = null;
    try {
      await game.play();
    } catch (e) {
      failure = e instanceof GameFailure ? e.message : `crash: ${(e as Error).stack ?? String(e)}`;
    }
    release(gameId);
    const ms = Date.now() - started;
    const record = buildRecord(game, { gameId, seed, docs, briefings, served, settings: settingsBase, ms, failure, tree, retries });
    const base = join(OUT, `game-${gameId}`);
    writeFileSync(`${base}.full.json.gz`, gzipSync(JSON.stringify(record)));
    writeFileSync(`${base}.transcript.md`, transcript(game, gameId));
    writeFileSync(`${base}.memory.md`, memoryDump(game, gameId));
    const cost = game.calls.reduce((s, c) => s + c.costUsd, 0);
    const status = failure ? "failed" : game.stopped ? "stopped" : "complete";
    const checked = status === "complete" ? postGameChecks(`${base}.full.json.gz`, served, settingsBase.turns, refCalls) : null;
    if (checked) writeFileSync(`${base}.checks.json`, JSON.stringify(checked, null, 2));
    progress(`${gameId} seed ${seed} ${status}${failure ? `: ${failure.split("\n")[0]}` : ""}; calls ${game.calls.length} spend $${cost.toFixed(4)} retries ${retries} ${(ms / 60000).toFixed(1)} min`);
    console.log(`Game ${n} (seed ${seed}) ${status.toUpperCase()}${failure ? `: ${failure.split("\n")[0]}` : ""}: ${game.calls.length} calls, $${cost.toFixed(4)}, ${(ms / 60000).toFixed(1)} min, ${retries} retries.\n  ${base}.full.json.gz${checked ? `\n  checks: ${JSON.stringify(checked)}` : ""}`);
    return { gameId, seed, status, failure, calls: game.calls.length, costUsd: cost, ms, retries, checks: checked };
  };

  // ---- The pool: up to `parallel` games, replacements for failed games ---------------------------
  const running = new Map<number, Promise<void>>();
  let startedGames = 0;
  let halt: string | null = null;
  const counted = () => outcomes.filter((o) => o.status === "complete").length;
  const failed = () => outcomes.filter((o) => o.status === "failed").length;
  while (true) {
    while (!halt && running.size < (serial ? 1 : parallel) && counted() + running.size < wanted) {
      const n = ++startedGames;
      const seed = Number(opts.seed) + n - 1;
      running.set(
        n,
        runGame(n, seed).then((o) => {
          outcomes.push(o);
          running.delete(n);
          if (o.status === "stopped") halt = "the spending cap stopped a game";
          if (o.status === "failed" && failed() > replacements) halt = `more than ${replacements} games failed`;
          const bad = o.checks && Object.entries(o.checks).filter(([k, v]) => k !== "callCount" && v !== true);
          if (bad && bad.length) halt = `post-game checks failed for ${o.gameId}: ${bad.map(([k, v]) => `${k}=${v}`).join(", ")}`;
        }),
      );
    }
    if (!running.size) break;
    await Promise.race(running.values());
  }
  const summary = { runId, characterModel: charModel.id, systemModel: sysModel.id, wanted, counted: counted(), halt, serialSince, outcomes, spentUsd: budget.spentUsd, ledgerUsd: budget.priorSpendUsd + budget.spentUsd };
  writeFileSync(join(OUT, `run-${runId}.summary.json`), JSON.stringify(summary, null, 2));
  progress(`run ${runId} done: ${counted()}/${wanted} complete${halt ? `; HALTED: ${halt}` : ""}${serialSince ? `; one game at a time since ${serialSince}` : ""}; spent $${budget.spentUsd.toFixed(4)}`);
  console.log(`Done: ${counted()}/${wanted} complete${halt ? `; HALTED: ${halt}` : ""}${serialSince ? `; one game at a time since ${serialSince}` : ""}. Spent $${budget.spentUsd.toFixed(4)}.\n  ${join(OUT, `run-${runId}.summary.json`)}`);
}

/** Before a game counts: all turns, everyone spoke, each call on its model, the record parses, a normal call count. */
function postGameChecks(path: string, served: Record<"character" | "system", Served>, turns: number, refCalls: number | null): Record<string, boolean | string> {
  let rec: ReturnType<typeof buildRecord>;
  try {
    rec = JSON.parse(gunzipSync(readFileSync(path)).toString());
  } catch (e) {
    return { recordParses: `no: ${(e as Error).message}` };
  }
  const turnEnds = new Set(rec.events.filter((e) => e.type === "turn-end").map((e) => e.turn));
  const missingTurns = Array.from({ length: turns }, (_, i) => i + 1).filter((t) => !turnEnds.has(t));
  const silent = CAST.filter((c) => !rec.lines.some((l) => l.kind === "speech" && l.speaker === c));
  const offModel = (role: "character" | "system") =>
    rec.calls.filter((c) => SYSTEM_KINDS.includes(c.kind) === (role === "system")).filter((c) => (served[role].servedId !== null && c.model !== served[role].servedId) || c.provider !== served[role].endpoint.providerName);
  const sysOff = offModel("system");
  const charOff = offModel("character");
  const off = refCalls ? Math.abs(rec.calls.length - refCalls) / refCalls : 0;
  return {
    recordParses: true,
    allTurns: missingTurns.length ? `missing ${missingTurns.join(",")}` : true,
    everyoneSpoke: silent.length ? `silent: ${silent.join(", ")}` : true,
    systemCallsOnSystemModel: sysOff.length ? `${sysOff.length} off (${[...new Set(sysOff.map((c) => `${c.model}@${c.provider}`))].join(", ")})` : true,
    characterCallsOnCharacterModel: charOff.length ? `${charOff.length} off (${[...new Set(charOff.map((c) => `${c.model}@${c.provider}`))].join(", ")})` : true,
    callCount: refCalls === null ? true : off > 0.3 ? `FLAG ${rec.calls.length} vs ${refCalls} (${(100 * off).toFixed(0)}% off)` : true,
  };
}

/** TD v0.5 Game Record & Export, full variant. Secrets never included. */
function buildRecord(
  game: MiniGame,
  x: { gameId: string; seed: number; docs: ReturnType<typeof loadDocs>; briefings: Partial<Record<CharacterName, string>>; served: Record<"character" | "system", Served>; settings: object; ms: number; failure: string | null; tree: ReturnType<typeof workingTree>; retries: number },
) {
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
    complete: !game.stopped && !x.failure,
    failure: x.failure,
    header: {
      game_id: x.gameId,
      date: new Date().toISOString(),
      engine: { name: "gonfaloniere-minigame", commit: gitCommit() },
      working_tree: x.tree,
      docs: x.docs.versions,
      config: {
        model: x.served.character.model.slug,
        provider: x.served.character.endpoint.providerName,
        quantization: x.served.character.endpoint.quantization,
        served_model: x.served.character.servedId,
        system_model: x.served.system.model.slug,
        system_provider: x.served.system.endpoint.providerName,
        system_quantization: x.served.system.endpoint.quantization,
        system_served_model: x.served.system.servedId,
        thinking: "off",
        fallbacks: false,
        retry: "429 or timeout: up to 5 tries, exponential backoff; any other failure ends the game",
        ...x.settings,
        plot_reward: false,
      },
      seed: x.seed,
      roster: ROSTER,
      aliases: ALIASES,
      cast: CAST,
      personality: "none: stock model; the secret-keeping lines are part of TD v0.5's prompts",
      // Test-setup choices for the mini-game, not the game's rules (Dylan, Oct 24).
      minigame_settings: [
        "Il Notaio's opening line: a smaller gathering of six; the other guests are alive but elsewhere and can't be reached",
        "Interim lone-guest rule: a guest left alone in a Capannello joins the other Capannello at once (permanent rule with Mechanics)",
        "Block 9c's {target} in the choice lines reads 'your target' (TD fix pending)",
      ],
      standins: { characters: STANDINS, source: `${STANDIN_FILE} (adapted from PitP_Original_Rules_Trimmed)` },
      tunables: x.docs.tunables,
      briefings: x.briefings,
    },
    prefixes: game.prefixes,
    events: game.events,
    lines: game.lines,
    thoughts: game.thoughts,
    calls: game.calls,
    memory: { entries: game.memory.entries, beliefs: game.memory.beliefs, dropped: game.memory.dropped, repairs: game.memory.repairs },
    snapshots: game.snapshots,
    murder_round: { resolved: false, acts: game.murderActs },
    knowledge_checks: game.knowledgeChecks,
    summary: {
      wall_ms: x.ms,
      calls: game.calls.length,
      cost_usd: game.calls.reduce((s, c) => s + c.costUsd, 0),
      rate_limit_retries: x.retries,
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
