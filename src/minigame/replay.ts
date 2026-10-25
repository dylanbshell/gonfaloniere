// Re-runs only the extraction passes and knowledge checks on saved mini-games
// (Models & Research: "re-run the passes on the saved transcripts and
// re-judge", for Technical Design v0.6's gate 8 fixes). Play is unchanged:
// the saved lines and thoughts are read turn by turn, memory is rebuilt from
// scratch with TD v0.6's ★, claims, and thought passes (exact repeated
// thoughts left out of the thought pass), code-written entries (payments,
// events, private actions) are carried over, and the knowledge checks are
// asked again at the end. Each game's result is written beside it as
// game-<id>-td<version>.full.json.gz, ready for `minigame:measures --only memory`.
//
//   npm run minigame:replay -- results/minigame/game-*.full.json.gz --cap 2
//
// System model: --system-model (default DeepSeek V4.1 Flash), temperature 0,
// thinking off, pinned provider, no fallbacks. A 429 or timeout is retried up
// to 5 tries; any other failure, or a reply from another provider or model,
// stops the replay. Spend goes to the mini-game ledger (PROBE_TOTAL_USD caps it).

import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { gunzipSync, gzipSync } from "node:zlib";
import { config } from "../../probe.config.ts";
import type { CharacterName } from "../game/roster.ts";
import { Budget, worstCaseCost } from "../harness/budget.ts";
import { RunLog, gitCommit, priorSpend, type LogRecord } from "../harness/log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient } from "../harness/openrouter.ts";
import { parseJson } from "../output/json.ts";
import { loadDocs } from "../sources/docs.ts";
import { formatLine, type CallRecord, type GameEvent } from "./engine.ts";
import { Recorder, sameThought, type SystemCallKind } from "./extract.ts";
import { MemoryStore, memoryCounts, type GameLine, type MemoryEntry, type Thought } from "./memory.ts";

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: { cap: { type: "string", default: "2" }, "system-model": { type: "string", default: "deepseek-v4.1-flash" }, concurrency: { type: "string", default: "3" } },
});
const OUT = "results/minigame";
/** TD v0.6 Run Configuration, system calls. */
const MAX_TOKENS: Record<SystemCallKind, number> = { "star-pass": 1500, "claims-pass": 1000, "sweep-reask": 1500, "thought-pass": 600, "knowledge-check": 300 };
const EXTRACTION_EVENTS = new Set(["conversation-pass", "star-pass", "claims-pass", "thought-pass", "extraction-failed"]);
const CHARACTER_KINDS = new Set(["plan", "think", "speak", "move", "murder"]);

interface SavedGame {
  header: { game_id: string; cast: CharacterName[]; docs: Record<string, string>; [k: string]: unknown };
  lines: GameLine[];
  thoughts: Thought[];
  events: GameEvent[];
  calls: CallRecord[];
  prefixes: Record<string, string>;
  memory: { entries: MemoryEntry[] };
  knowledge_checks: { character: CharacterName; fact: string }[];
  summary: Record<string, unknown>;
  [k: string]: unknown;
}

class ReplayStop extends Error {}

async function main(): Promise<void> {
  process.env.PROBE_RESULTS_DIR = OUT;
  if (!positionals.length) throw new Error("Give the saved game records to replay");
  const docs = loadDocs(config.docs);
  const model = config.models.find((m) => m.id === opts["system-model"]);
  if (!model) throw new Error(`No model "${opts["system-model"]}"`);
  const client = makeClient(apiKey());
  const endpoint = await fetchEndpoint(model);
  const budget = new Budget(Number(opts.cap), config.budget.totalUsd, priorSpend(OUT));
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-replay`;
  const log = new RunLog(runId, "minigame-", OUT);
  log.write({ type: "run", runId, startedAt: new Date().toISOString(), modelId: model.id, endpoint, docVersions: docs.versions, gitCommit: gitCommit(), games: positionals } as unknown as LogRecord);
  console.log(`Replay: ${positionals.length} game(s); extraction and knowledge checks on TD v${docs.versions.technicalDesign} with ${model.id} via ${endpoint.providerName}; cap $${opts.cap}; ledger $${budget.priorSpendUsd.toFixed(2)} spent before this (total cap $${config.budget.totalUsd})`);

  let servedId: string | null = null;
  const send = async (system: string, user: string, maxTokens: number) => {
    const worst = worstCaseCost(system.length + user.length, maxTokens, endpoint.price);
    if (!budget.tryReserve(worst)) throw new ReplayStop("the next call could pass the cap");
    const res = await callModel(
      client,
      { model, prompt: user, system, temperature: 0, maxTokens, extra: model.thinkingOff ?? config.thinkingOff },
      {
        maxAttempts: 5,
        retryable: (status) => status === 429 || status === null,
        onRetry: (r) => log.write({ type: "minigame-retry", runId, attempt: r.attempt, status: r.status, error: r.error.slice(0, 300), at: new Date().toISOString() } as unknown as LogRecord),
      },
    );
    const cost = res.ok ? (res.usage.costUsd ?? res.usage.inputTokens * endpoint.price.input + res.usage.outputTokens * endpoint.price.output) : 0;
    budget.settle(worst, cost);
    log.write({ type: "minigame-call", runId, costUsd: cost, ok: res.ok, ...(res.ok ? { provider: res.provider, servedModel: res.model } : { status: res.status, error: res.error.slice(0, 300) }), at: new Date().toISOString() } as unknown as LogRecord);
    if (!res.ok) throw new ReplayStop(`call failed (${res.status ?? "no status"}): ${res.error.slice(0, 200)}`);
    if (res.provider !== endpoint.providerName) throw new ReplayStop(`served by ${res.provider}, not the pinned ${endpoint.providerName}`);
    if (servedId !== null && res.model !== servedId) throw new ReplayStop(`served by model ${res.model}, not ${servedId}`);
    servedId = res.model;
    return { res, cost };
  };

  const replayOne = async (path: string) => {
    const rec = JSON.parse(gunzipSync(readFileSync(path)).toString()) as SavedGame;
    const started = Date.now();
    const memory = new MemoryStore();
    const events: GameEvent[] = [];
    const calls: CallRecord[] = [];
    let turn = 0;
    // TD's retry once on unusable JSON, as the engine's system calls do.
    const caller = async (kind: SystemCallKind, character: CharacterName | null, system: string, user: string): Promise<unknown | null> => {
      let u = user;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const { res, cost } = await send(system, u, MAX_TOKENS[kind]);
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
    const recorder = new Recorder(docs, memory, caller, events, formatLine, (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")}, and ${xs.at(-1)}`));

    // TD v0.6 shortTermHistory: mark exact repeats of each character's previous thought.
    const lastBy = new Map<CharacterName, string>();
    const thoughts: Thought[] = rec.thoughts.map((t) => {
      const prev = lastBy.get(t.character);
      lastBy.set(t.character, t.text);
      const { repeat: _old, ...rest } = t;
      return prev !== undefined && sameThought(prev, t.text) ? { ...rest, repeat: true } : rest;
    });

    // Code-written entries (payments, events, private actions) carry over, each before its turn's passes.
    const codeEntries = rec.memory.entries.filter((e) => e.source === "code");
    const addCode = (t: number) => {
      for (const e of codeEntries.filter((x) => x.turn === t)) {
        const { id: _id, salient: _s, ...rest } = e;
        memory.addEntry(rest);
      }
    };
    const turns = [...new Set(rec.events.filter((e) => e.type === "turn-end").map((e) => e.turn))].sort((a, b) => a - b);
    addCode(0);
    for (const t of turns) {
      turn = t;
      addCode(t);
      // The engine ran each turn's passes before the Murder Round, so its thoughts aren't read.
      await recorder.turn(t, rec.lines, thoughts.filter((x) => x.turn === t && !x.repeat && x.call !== "murder"));
    }
    const checks = rec.knowledge_checks.map((k) => ({ character: k.character, fact: k.fact }));
    const knowledgeChecks = await recorder.knowledge(checks, rec.header.cast);

    const version = docs.versions.technicalDesign;
    const out: SavedGame = {
      ...rec,
      header: {
        ...rec.header,
        game_id: `${rec.header.game_id}-td${version}`,
        replay: {
          of: rec.header.game_id,
          what: "extraction passes and knowledge checks re-run on the saved transcript; play unchanged",
          technical_design: version,
          docs: docs.versions,
          system_model: model.slug,
          system_provider: endpoint.providerName,
          system_served_model: servedId,
          commit: gitCommit(),
          at: new Date().toISOString(),
        },
      },
      thoughts,
      prefixes: { ...Object.fromEntries(Object.entries(rec.prefixes).filter(([k]) => !k.startsWith("system:"))), ...recorder.prefixes },
      events: [...rec.events.filter((e) => !EXTRACTION_EVENTS.has(e.type)), ...events],
      calls: [...rec.calls.filter((c) => CHARACTER_KINDS.has(c.kind)), ...calls],
      memory: { entries: memory.entries, beliefs: memory.beliefs, dropped: memory.dropped, repairs: memory.repairs, notes: memory.notes } as unknown as SavedGame["memory"],
      knowledge_checks: knowledgeChecks,
      summary: {
        ...rec.summary,
        replay: { calls: calls.length, cost_usd: calls.reduce((s, c) => s + c.costUsd, 0), wall_ms: Date.now() - started, memory: memoryCounts(memory, thoughts) },
      },
    };
    const dest = path.replace(".full.json.gz", `-td${version}.full.json.gz`);
    writeFileSync(dest, gzipSync(JSON.stringify(out)));
    const c = memoryCounts(memory, thoughts);
    console.log(
      `${rec.header.game_id}: ${calls.length} calls, $${calls.reduce((s, x) => s + x.costUsd, 0).toFixed(4)}, ${((Date.now() - started) / 60000).toFixed(1)} min; entries ${memory.entries.filter((e) => e.source !== "code").length}, beliefs ${memory.beliefs.length}; dropped ${c.dropped} ${JSON.stringify(c.dropped_by_reason)}; notes ${JSON.stringify(c.notes)}; repeated thoughts ${c.repeated_thoughts}\n  ${dest}`,
    );
  };

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
  console.log(`${stop ? `STOPPED: ${stop}\n` : ""}Spent $${budget.spentUsd.toFixed(4)}; ledger $${(budget.priorSpendUsd + budget.spentUsd).toFixed(2)}.`);
  if (stop) process.exitCode = 1;
}

main();
