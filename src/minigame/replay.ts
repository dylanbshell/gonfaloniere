// Re-runs only the extraction passes and knowledge checks on saved mini-games
// (Models & Research: "re-run the passes on the saved transcripts and
// re-judge", for Technical Design's gate 8 fixes, v0.6 and v0.7). Play is unchanged:
// the saved lines and thoughts are read turn by turn, memory is rebuilt from
// scratch with the current TD's ★, claims, and thought passes (exact repeated
// thoughts left out of the thought pass), code-written entries (payments,
// events, private actions) are carried over, and the knowledge checks are
// asked again at the end. Each game's result is written beside it as
// game-<id>-td<version>.full.json.gz, ready for `minigame:measures --only memory`.
//
//   npm run minigame:replay -- results/minigame/game-*.full.json.gz --cap 2
//
// Recorder (TD v0.7, recorder.ts): --recorder-model or RECORDER_MODEL_* in
// .env, defaulting to the harness's play model (DeepSeek V4.1 Flash) at
// temperature 0 (none for a model that rejects it), thinking off, pinned
// provider, no fallbacks. A 429 or timeout is retried up to 5 tries; any other
// failure, or a reply from another provider or model, stops the replay. Spend
// goes to the mini-game ledger (PROBE_TOTAL_USD caps it).
//
// CC-20261107-05: --recorder-model claude:<model> runs the recorder on the native Claude API with
// CLAUDE_CREDIT_API_KEY (recorder.ts), its spend logged to the Claude-credit ledger (results/claude-credit/)
// and stopped at CLAUDE_CREDIT_STOP_USD, that ledger's total. Any API error that survives the SDK's
// retries stops the run. --probe records one conversation-turn (10a, 10d) and one 10b call on the first
// game, writes nothing, and projects the cost of the full replay of every game given.
//
//   npm run minigame:replay -- <one record> --dry-run   one turn's 10a, 10d, and 10e prompts and the recorder settings; no calls
//   npm run minigame:replay -- <records> --only perception --estimate   projected calls and cost; no calls
//   npm run minigame:replay -- <td0.7 records> --only perception   TD v0.8: add readings (10e) to an existing
//     replay, keeping its reference record, beliefs, and knowledge checks; thoughts get `after_line`
//     rebuilt from event order where the record has none

import { audited } from "../harness/keyaudit.ts";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { gunzipSync, gzipSync } from "node:zlib";
import { config } from "../../probe.config.ts";
import type { CharacterName } from "../game/roster.ts";
import { Budget, worstCaseCost } from "../harness/budget.ts";
import { RunLog, gitCommit, priorSpend, type LogRecord } from "../harness/log.ts";
import { callModel, fetchEndpoint } from "../harness/openrouter.ts";
import { parseJson } from "../output/json.ts";
import { loadDocs } from "../sources/docs.ts";
import { MINIGAME_TOTAL_USD } from "./ledger.ts";
import { formatLine, type CallRecord, type GameEvent } from "./engine.ts";
import { Recorder, rebuildAfterLine, sameThought, type SystemCallKind } from "./extract.ts";
import { MemoryStore, memoryCounts, type GameLine, type MemoryEntry, type Thought } from "./memory.ts";
import { CLAUDE_PREFIX, DEFAULT_PLAY_MODEL, callClaude, claudeRoute, describeClaudeRoute, describeRoute, isClaudeModel, messages, recorderRoute, type ClaudeUsage } from "./recorder.ts";

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: { cap: { type: "string", default: "2" }, "recorder-model": { type: "string" }, concurrency: { type: "string", default: "3" }, "dry-run": { type: "boolean", default: false }, rpm: { type: "string" }, only: { type: "string" }, estimate: { type: "boolean", default: false }, probe: { type: "boolean", default: false }, "in-flight": { type: "string", default: "4" } },
});
const OUT = "results/minigame";
/** The Claude-credit ledger (CLAUDE.md): Claude API spend, separate from the mini-game ledger. */
const CREDIT_LEDGER = "results/claude-credit";
/** TD v0.7 Run Configuration, recorder calls. */
const MAX_TOKENS: Record<SystemCallKind, number> = { "star-pass": 1800, "claims-pass": 1000, "sweep-reask": 1800, "thought-pass": 600, "perception-pass": 800, "knowledge-check": 300 };
const EXTRACTION_EVENTS = new Set(["conversation-pass", "star-pass", "claims-pass", "thought-pass", "extraction-failed"]);
const CHARACTER_KINDS = new Set(["plan", "think", "speak", "move", "murder"]);

interface SavedGame {
  header: { game_id: string; cast: CharacterName[]; docs: Record<string, string>; [k: string]: unknown };
  lines: GameLine[];
  thoughts: Thought[];
  events: GameEvent[];
  calls: CallRecord[];
  prefixes: Record<string, string>;
  memory: { entries: MemoryEntry[]; beliefs?: unknown[]; dropped?: unknown[]; repairs?: unknown[]; notes?: unknown[] };
  knowledge_checks: { character: CharacterName; fact: string }[];
  summary: Record<string, unknown>;
  [k: string]: unknown;
}

class ReplayStop extends Error {}

async function main(): Promise<void> {
  process.env.PROBE_RESULTS_DIR = OUT;
  if (!positionals.length) throw new Error("Give the saved game records to replay");
  const docs = loadDocs(config.docs);
  if (opts["dry-run"]) return dryRun(docs, positionals[0]!);
  if (opts.only && opts.only !== "perception") throw new Error(`--only takes "perception"`);
  const perceptionOnly = opts.only === "perception";
  // TD v0.8: replays record readings (notebook: perceived) whenever the TD has the perception pass.
  const notebook = docs.systemPrompts?.perceptionPass ? "perceived" : "shared";
  if (perceptionOnly && notebook !== "perceived") throw new Error("--only perception needs TD v0.8's block 10e");
  if (opts.estimate) return estimate(docs, positionals, perceptionOnly);
  let servedId: string | null = null;
  const recorderId = opts["recorder-model"] ?? process.env.RECORDER_MODEL_ID;
  const claude = isClaudeModel(recorderId) ? claudeRoute(recorderId) : null;
  const route = claude ? null : await recorderRoute(DEFAULT_PLAY_MODEL, opts["recorder-model"]);
  // A Claude recorder's spend goes to the Claude-credit ledger, stopped at CLAUDE_CREDIT_STOP_USD.
  const ledger = claude ? CREDIT_LEDGER : OUT;
  const totalCap = claude ? Number(process.env.CLAUDE_CREDIT_STOP_USD) : MINIGAME_TOTAL_USD;
  if (!Number.isFinite(totalCap)) throw new Error("Set CLAUDE_CREDIT_STOP_USD: the Claude-credit ledger total to stop at");
  const budget = new Budget(Number(opts.cap), totalCap, priorSpend(ledger));
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-replay${claude ? `-${claude.model}` : ""}`;
  const log = new RunLog(runId, claude ? "claude-recorder-" : "minigame-", ledger);
  const recorderInfo = () => (claude ? describeClaudeRoute(claude, servedId) : describeRoute(route!, servedId));
  log.write({ type: "run", runId, startedAt: new Date().toISOString(), modelId: claude ? recorderId : route!.model.id, endpoint: claude ? "Claude API" : route!.endpoint, docVersions: docs.versions, gitCommit: gitCommit(), games: positionals } as unknown as LogRecord);
  console.log(`Replay: ${positionals.length} game(s); extraction and knowledge checks on TD v${docs.versions.technicalDesign}; recorder ${JSON.stringify(recorderInfo())}; cap $${opts.cap}; ledger $${budget.priorSpendUsd.toFixed(2)} spent before this (total cap $${totalCap})`);
  /** Each Claude call's usage, for the cache hit rate. */
  const claudeUsage: (ClaudeUsage & { kind: string; cost: number })[] = [];
  const maxInFlight = Number(opts["in-flight"]);
  let inFlight = 0;

  // --rpm: keep under a provider's requests-per-minute limit (e.g. OpenRouter's 20/min for GPT-5.4 on new accounts).
  const rpm = opts.rpm ? Number(opts.rpm) : null;
  const sent: number[] = [];
  let slot = Promise.resolve();
  const pace = () => {
    if (!rpm) return Promise.resolve();
    const mine = slot.then(async () => {
      for (;;) {
        const now = Date.now();
        while (sent.length && sent[0]! <= now - 60_000) sent.shift();
        if (sent.length < rpm) break;
        await new Promise((r) => setTimeout(r, sent[0]! + 60_000 - now + 50));
      }
      sent.push(Date.now());
    });
    slot = mine;
    return mine;
  };
  const send = async (system: string, user: string, maxTokens: number, kind: string) => {
    await pace();
    if (claude) {
      // Worst case: the whole prompt written to the cache, and every token of max_tokens.
      const worst = worstCaseCost(system.length + user.length, maxTokens, { input: claude.price.cacheWrite, output: claude.price.output });
      if (!budget.tryReserve(worst)) throw new ReplayStop("the next call could pass the cap");
      // The Claude API limits concurrent requests per organization: at most --in-flight at once.
      while (inFlight >= maxInFlight) await new Promise((r) => setTimeout(r, 50));
      inFlight++;
      const r = await callClaude(claude, system, user, maxTokens).finally(() => inFlight--);
      const cost = r.ok ? r.costUsd : 0;
      budget.settle(worst, cost);
      log.write({ type: "claude-call", runId, model: claude.model, kind, costUsd: cost, ok: r.ok, ...(r.ok ? { servedModel: r.model, stop: r.stopReason, usage: r.usage } : { status: r.status, error: r.error.slice(0, 300) }), at: new Date().toISOString() } as unknown as LogRecord);
      if (!r.ok) throw new ReplayStop(`Claude API error (${r.status ?? "no status"}): ${r.error.slice(0, 200)}`);
      if (servedId !== null && r.model !== servedId) throw new ReplayStop(`served by model ${r.model}, not ${servedId}`);
      servedId = r.model;
      claudeUsage.push({ ...r.usage, kind, cost });
      const res = { ok: true as const, content: r.content, usage: { inputTokens: r.usage.input + r.usage.cacheWrite + r.usage.cacheRead, outputTokens: r.usage.output }, provider: "Anthropic", model: r.model, latencyMs: r.latencyMs };
      return { res: res as unknown as Awaited<ReturnType<typeof callModel>>, cost };
    }
    const { model, client, endpoint } = route!;
    const worst = worstCaseCost(system.length + user.length, maxTokens, endpoint.price);
    if (!budget.tryReserve(worst)) throw new ReplayStop("the next call could pass the cap");
    const res = await callModel(
      client,
      { model, ...messages(route!, system, user), temperature: route!.temperature, maxTokens, extra: route!.thinking },
      {
        maxAttempts: 5,
        retryable: (status) => status === 429 || status === null,
        onRetry: (r) => log.write({ type: "minigame-retry", runId, attempt: r.attempt, status: r.status, error: r.error.slice(0, 300), at: new Date().toISOString() } as unknown as LogRecord),
      },
    );
    const cost = res.ok ? (res.usage.costUsd ?? res.usage.inputTokens * endpoint.price.input + res.usage.outputTokens * endpoint.price.output) : 0;
    budget.settle(worst, cost);
    log.write({ type: "minigame-call", runId, costUsd: cost, ok: res.ok, ...(res.ok ? { provider: res.provider, servedModel: res.model, reasoningTokens: res.usage.reasoningTokens } : { status: res.status, error: res.error.slice(0, 300) }), at: new Date().toISOString() } as unknown as LogRecord);
    if (!res.ok) throw new ReplayStop(`call failed (${res.status ?? "no status"}): ${res.error.slice(0, 200)}`);
    if (route!.endpointLabel === "OpenRouter" && res.provider !== endpoint.providerName) throw new ReplayStop(`served by ${res.provider}, not the pinned ${endpoint.providerName}`);
    if (servedId !== null && res.model !== servedId) throw new ReplayStop(`served by model ${res.model}, not ${servedId}`);
    servedId = res.model;
    return { res, cost };
  };

  const replayOne = async (path: string) => {
    const rec = JSON.parse(gunzipSync(readFileSync(path)).toString()) as SavedGame;
    const started = Date.now();
    const memory = new MemoryStore();
    if (perceptionOnly) {
      // Keep the record's memory as it is (the reference record, beliefs, logs); readings are added.
      Object.assign(memory, { entries: rec.memory.entries, beliefs: rec.memory.beliefs ?? [], dropped: rec.memory.dropped ?? [], repairs: rec.memory.repairs ?? [], notes: rec.memory.notes ?? [] });
    }
    const events: GameEvent[] = [];
    const calls: CallRecord[] = [];
    let turn = 0;
    // TD's retry once on unusable JSON, as the engine's system calls do.
    const caller = async (kind: SystemCallKind, character: CharacterName | null, system: string, user: string): Promise<unknown | null> => {
      let u = user;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const { res, cost } = await send(system, u, MAX_TOKENS[kind], kind);
        const ok = res.ok as true;
        const j = ok ? parseJson(res.ok ? res.content : "") : { json: null, fenced: false, error: "failed" };
        const good = !j.error;
        calls.push({
          n: calls.length + 1,
          turn,
          kind,
          character,
          attempt,
          user: u,
          raw: res.ok ? res.content : null,
          parsed: good ? j.json : null,
          verdict: good ? "valid" : attempt === 2 ? "default" : "failed",
          repairs: j.fenced ? ["fenceStripped"] : [],
          error: good ? null : (j.error ?? null),
          costUsd: cost,
          inputTokens: res.ok ? res.usage.inputTokens : 0,
          outputTokens: res.ok ? res.usage.outputTokens : 0,
          latencyMs: res.latencyMs,
          provider: res.ok ? res.provider : null,
          model: res.ok ? res.model : null,
        });
        if (good) return j.json;
        u = `${user}\n\nYour last reply could not be used (${j.error}). Reply again with only the JSON asked for.`;
      }
      return null;
    };
    const recorder = new Recorder(docs, memory, caller, events, formatLine, listJoin, notebook, perceptionOnly ? ["10e"] : undefined);
    const thoughts = prepareThoughts(rec);

    // Code-written entries (payments, events, private actions) carry over, each before its turn's passes.
    const codeEntries = rec.memory.entries.filter((e) => e.source === "code");
    const addCode = (t: number) => {
      for (const e of codeEntries.filter((x) => x.turn === t)) {
        const { id: _id, salient: _s, ...rest } = e;
        memory.addEntry(rest);
      }
    };
    const turns = turnsOf(rec);
    if (!perceptionOnly) addCode(0);
    if (opts.probe) {
      // One conversation-turn (10a and 10d) and one 10b call: the first turn's first conversation and first thinker.
      const t = turns[0]!;
      turn = t;
      addCode(t);
      const conv = rec.lines.find((l) => l.turn === t && l.kind === "speech")!.conversation;
      const mine = thoughts.filter((x) => x.turn === t && !x.repeat && x.call !== "murder");
      await recorder.turn(t, rec.lines.filter((l) => l.turn !== t || l.conversation === conv), mine.filter((x) => x.character === mine[0]!.character));
      return;
    }
    for (const t of turns) {
      turn = t;
      if (!perceptionOnly) addCode(t);
      // The engine ran each turn's passes before the Murder Round, so its thoughts aren't read.
      await recorder.turn(t, rec.lines, thoughts.filter((x) => x.turn === t && !x.repeat && x.call !== "murder"));
    }
    const checks = rec.knowledge_checks.map((k) => ({ character: k.character, fact: k.fact }));
    // Perception only: knowledge checks never read readings (TD v0.8), so they carry over unchanged.
    const knowledgeChecks = perceptionOnly ? rec.knowledge_checks : await recorder.knowledge(checks, rec.header.cast);

    const version = docs.versions.technicalDesign;
    // A non-default recorder is named in the file and game ID, so its records sit beside the default's.
    const tag = `td${version}${claude ? `-${claude.model}` : route!.model.id === DEFAULT_PLAY_MODEL ? "" : `-${route!.model.id}`}`;
    const out: SavedGame = {
      ...rec,
      header: {
        ...rec.header,
        game_id: perceptionOnly ? `${String(rec.header.game_id).replace(/-td[\d.]+$/, "")}-${tag}` : `${rec.header.game_id}-${tag}`,
        notebook,
        replay: {
          of: rec.header.game_id,
          what: perceptionOnly
            ? "perception pass (10e) added to an earlier replay; its reference record (10a, 10d), beliefs (10b), and knowledge checks carried over unchanged; play unchanged"
            : "extraction passes and knowledge checks re-run on the saved transcript; play unchanged",
          technical_design: version,
          docs: docs.versions,
          system_model: claude ? `${CLAUDE_PREFIX}${claude.model}` : route!.model.slug,
          system_provider: claude ? "Anthropic" : route!.endpoint.providerName,
          system_served_model: servedId,
          recorder: recorderInfo(),
          commit: gitCommit(),
          at: new Date().toISOString(),
        },
      },
      thoughts,
      prefixes: perceptionOnly ? { ...rec.prefixes, ...recorder.prefixes } : { ...Object.fromEntries(Object.entries(rec.prefixes).filter(([k]) => !k.startsWith("system:"))), ...recorder.prefixes },
      events: perceptionOnly ? [...rec.events, ...events] : [...rec.events.filter((e) => !EXTRACTION_EVENTS.has(e.type)), ...events],
      calls: perceptionOnly ? [...rec.calls, ...calls] : [...rec.calls.filter((c) => CHARACTER_KINDS.has(c.kind)), ...calls],
      // Perception-only replays keep TD v0.8's record format: 10e readings under "readings".
      memory: { entries: memory.entries, beliefs: memory.beliefs, readings: perceptionOnly ? memory.perceptionReadings : memory.readings, dropped: memory.dropped, repairs: memory.repairs, notes: memory.notes } as unknown as SavedGame["memory"],
      knowledge_checks: knowledgeChecks,
      summary: {
        ...rec.summary,
        replay: { calls: calls.length, cost_usd: calls.reduce((s, c) => s + c.costUsd, 0), wall_ms: Date.now() - started, memory: memoryCounts(memory, thoughts) },
      },
    };
    const dest = perceptionOnly ? path.replace(/-td[\d.]+\.full\.json\.gz$/, `-${tag}.full.json.gz`) : path.replace(".full.json.gz", `-${tag}.full.json.gz`);
    if (dest === path) throw new Error(`Refusing to overwrite ${path}`);
    writeFileSync(dest, gzipSync(JSON.stringify(out)));
    const c = memoryCounts(memory, thoughts);
    console.log(
      `${rec.header.game_id}: ${calls.length} calls, $${calls.reduce((s, x) => s + x.costUsd, 0).toFixed(4)}, ${((Date.now() - started) / 60000).toFixed(1)} min; entries ${memory.entries.filter((e) => e.source !== "code").length}, beliefs ${memory.beliefs.length}, readings ${perceptionOnly ? memory.perceptionReadings.length : memory.readings.length}; dropped ${c.dropped} ${JSON.stringify(c.dropped_by_reason)}; notes ${JSON.stringify(c.notes)}; repeated thoughts ${c.repeated_thoughts}\n  ${dest}`,
    );
  };

  if (opts.probe) {
    await replayOne(positionals[0]!);
    return probeReport(claudeUsage, positionals, budget.spentUsd);
  }
  const queue = [...positionals];
  let stop: string | null = null;
  await Promise.all(
    Array.from({ length: Number(opts.concurrency) }, async () => {
      for (let p = queue.shift(); p && !stop; p = queue.shift()) {
        try {
          await replayOne(p);
        } catch (e) {
          if (!(e instanceof ReplayStop)) throw e;
          stop = `${p}: ${e.message}`;
        }
      }
    }),
  );
  const cached = claudeUsage.reduce((a, u) => a + u.cacheRead, 0);
  const prompt = claudeUsage.reduce((a, u) => a + u.input + u.cacheWrite + u.cacheRead, 0);
  if (claude) console.log(`Cache: ${cached.toLocaleString()} of ${prompt.toLocaleString()} prompt tokens read from cache (${prompt ? ((100 * cached) / prompt).toFixed(1) : 0}%); ${claudeUsage.filter((u) => u.cacheRead > 0).length} of ${claudeUsage.length} calls hit.`);
  console.log(`${stop ? `STOPPED: ${stop}\n` : ""}Spent $${budget.spentUsd.toFixed(4)}; ledger $${(budget.priorSpendUsd + budget.spentUsd).toFixed(4)}.`);
  if (stop) process.exitCode = 1;
}

/**
 * One turn's assembled 10a and 10d prompts for one saved game, and the recorder settings, with no
 * network calls: the recorder's calls are captured and answered with empty replies.
 */
async function dryRun(docs: ReturnType<typeof loadDocs>, path: string): Promise<void> {
  const rec = JSON.parse(gunzipSync(readFileSync(path)).toString()) as SavedGame;
  const route = await recorderRoute(DEFAULT_PLAY_MODEL, opts["recorder-model"], { offline: true });
  console.log(`DRY RUN: no calls. TD v${docs.versions.technicalDesign}; game ${rec.header.game_id}\nRecorder: ${JSON.stringify(describeRoute(route, null), null, 2)}\n`);
  const shown = new Set<string>();
  const capture = async (kind: SystemCallKind, _c: CharacterName | null, system: string, user: string): Promise<unknown> => {
    if ((kind === "star-pass" || kind === "claims-pass" || kind === "perception-pass") && !shown.has(kind)) {
      shown.add(kind);
      const m = messages(route, system, user);
      const label = { "star-pass": "10a ★ pass", "claims-pass": "10d claims pass", "perception-pass": `10e perception pass (${_c})` }[kind];
      console.log(`========== ${label}, turn 1, max_tokens ${MAX_TOKENS[kind]} ==========\n${m.system ? `--- system ---\n${m.system}\n` : ""}--- user ---\n${m.prompt}\n`);
    }
    return kind === "star-pass" ? { sweep: [], entries: [] } : kind === "claims-pass" ? { entries: [] } : kind === "thought-pass" ? { beliefs: [] } : kind === "perception-pass" ? { notes: [] } : null;
  };
  const notebook = docs.systemPrompts?.perceptionPass ? "perceived" : "shared";
  const recorder = new Recorder(docs, new MemoryStore(), capture, [], formatLine, listJoin, notebook);
  const thoughts = prepareThoughts(rec);
  await recorder.turn(1, rec.lines, thoughts.filter((x) => x.turn === 1 && !x.repeat && x.call !== "murder"));
}

/** Exact repeats marked (TD v0.6), and `after_line` rebuilt from event order where a record has none (TD v0.8). */
function prepareThoughts(rec: SavedGame): Thought[] {
  const rebuilt = rebuildAfterLine(rec);
  const lastBy = new Map<CharacterName, string>();
  return rec.thoughts.map((t) => {
    const prev = lastBy.get(t.character);
    lastBy.set(t.character, t.text);
    const { repeat: _old, ...rest } = t;
    const after_line = t.after_line !== undefined ? t.after_line : (rebuilt.get(t.id)?.after_line ?? null);
    return { ...rest, after_line, ...(prev !== undefined && sameThought(prev, t.text) && { repeat: true }) };
  });
}

function turnsOf(rec: SavedGame): number[] {
  return [...new Set(rec.events.filter((e) => e.type === "turn-end").map((e) => e.turn))].sort((a, b) => a - b);
}

const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")}, and ${xs.at(-1)}`);

/**
 * --estimate: runs the recorder over every turn with empty replies, counting the calls it would make
 * and their prompt sizes, and prices them at the recorder's listed rates. No model calls.
 */
async function estimate(docs: ReturnType<typeof loadDocs>, paths: string[], perceptionOnly: boolean): Promise<void> {
  // Offline: no key needed; the price comes from OpenRouter's public endpoint listing.
  const route = await recorderRoute(DEFAULT_PLAY_MODEL, opts["recorder-model"], { offline: true });
  route.endpoint = await fetchEndpoint(route.model);
  let calls = 0;
  let chars = 0;
  let maxOut = 0;
  const capture = async (kind: SystemCallKind, _c: CharacterName | null, system: string, user: string): Promise<unknown> => {
    calls++;
    chars += system.length + user.length;
    maxOut += MAX_TOKENS[kind];
    return kind === "star-pass" ? { sweep: [], entries: [] } : kind === "claims-pass" ? { entries: [] } : kind === "thought-pass" ? { beliefs: [] } : kind === "perception-pass" ? { notes: [] } : null;
  };
  for (const path of paths) {
    const rec = JSON.parse(gunzipSync(readFileSync(path)).toString()) as SavedGame;
    const recorder = new Recorder(docs, new MemoryStore(), capture, [], formatLine, listJoin, "perceived", perceptionOnly ? ["10e"] : undefined);
    const thoughts = prepareThoughts(rec);
    for (const t of turnsOf(rec)) await recorder.turn(t, rec.lines, thoughts.filter((x) => x.turn === t && !x.repeat && x.call !== "murder"));
  }
  const tokensIn = chars / 3.5;
  const p = route.endpoint.price;
  // Output: about 300 tokens a call is typical for these passes; the worst case is every call at max_tokens.
  console.log(
    `Estimate (no calls): ${calls} calls, ~${Math.round(tokensIn).toLocaleString()} input tokens (chars ÷ 3.5); typical cost $${(tokensIn * p.input + calls * 300 * p.output).toFixed(3)}, worst case (every reply at max_tokens) $${(tokensIn * p.input + maxOut * p.output).toFixed(3)} on ${route.model.id} via ${route.endpoint.providerName}`,
  );
}

/**
 * --probe: the probe's calls by kind, and the full replay of every game given projected from them: each
 * kind's mean cost per call (the probe's mean call for a kind it didn't make), times that kind's first-attempt
 * calls in the games' own records.
 */
function probeReport(usage: (ClaudeUsage & { kind: string; cost: number })[], paths: string[], spent: number): void {
  const counts = new Map<string, number>();
  for (const path of paths) {
    const rec = JSON.parse(gunzipSync(readFileSync(path)).toString()) as SavedGame;
    for (const c of rec.calls) if (c.attempt === 1 && c.kind in MAX_TOKENS) counts.set(c.kind, (counts.get(c.kind) ?? 0) + 1);
  }
  console.log(`Probe: ${usage.length} calls, $${spent.toFixed(5)}`);
  for (const u of usage) console.log(`  ${u.kind}: input ${u.input}, cache write ${u.cacheWrite}, cache read ${u.cacheRead}, output ${u.output}, $${u.cost.toFixed(5)}`);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const overall = mean(usage.map((u) => u.cost));
  let total = 0;
  for (const [kind, n] of counts) {
    const mine = usage.filter((u) => u.kind === kind);
    const each = mine.length ? mean(mine.map((u) => u.cost)) : overall;
    total += n * each;
    console.log(`  full replay: ${n} ${kind} x $${each.toFixed(5)}${mine.length ? "" : " (the probe's mean call)"} = $${(n * each).toFixed(4)}`);
  }
  console.log(`Projected full replay of ${paths.length} game(s): ~$${total.toFixed(3)}, at the probe's cache use (its first calls write the cache, so later calls should cost less)`);
}

audited(main, OUT, "replay");
