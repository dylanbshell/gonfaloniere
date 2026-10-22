// Probe runner.
//
//   npm run probe -- --dry-run                       print prompts, call nothing
//   op run --env-file=.env -- npm run probe          pre-flight, then every scenario
//   op run --env-file=.env -- npm run probe -- s1 --samples 3
//   op run --env-file=.env -- npm run probe -- s4 s5a --model qwen3.8-27b
//
// Targets: preflight, s1, s2, s3, s4, s5a, s5b, s5c, s6, s7-explicit,
// s7-buried, s7-control (default: all, in that order); "s7" means all three.
// Options: --model <id>, --samples <n> (single-moment scenarios, per mode),
//          --runs <n> (dialogue scenarios), --modes raw,constrained,
//          --td 0.2|0.3 (which Technical Design's prompts; default 0.2, the
//          S1–S7 reference), --extend (dialogue runs append to the model's
//          latest run of each target, so they pool with it),
//          --concurrency <n> (parallel calls; default from config, lower it for rate-limited endpoints)

import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
import { config, technicalDesignPath, type ModelConfig } from "../../probe.config.ts";
import { allowedActionTypes, allowedActionsText, type ActionContext } from "../game/actions.ts";
import { factionOf, type CharacterName } from "../game/roster.ts";
import { parseSpeak, type SpeakExpectation } from "../output/speak.ts";
import { parseThink, thinkJsonSchema, type ThinkExpectation } from "../output/think.ts";
import { assembleSpeakPrompt, assembleThinkPrompt, type HistoryLine } from "../prompt/assemble.ts";
import { loadDocs, type DocSources } from "../sources/docs.ts";
import { Budget, worstCaseCost } from "./budget.ts";
import {
  RunLog,
  gitCommit,
  priorSpend,
  readRecords,
  runLogFiles,
  type CallRecord,
  type SpeakCallRecord,
  type ThinkCallRecord,
} from "./log.ts";
import { callModel, clientFor, fetchEndpoint, type EndpointInfo } from "./openrouter.ts";
import { SCENARIOS, TARGET_GROUPS, expandTargets, unbriefedGuests } from "./scenarios.ts";
import { probePool } from "./transcripts.ts";
import type { AssembledPrompt } from "../prompt/assemble.ts";
import {
  characterContext,
  currentFlorins,
  type DecodingMode,
  type DialogueScenario,
  type LiveState,
  type Scenario,
  type ThinkScenario,
} from "./scenario.ts";

const TARGETS = ["preflight", ...Object.keys(SCENARIOS)];
const S1 = SCENARIOS.s1 as ThinkScenario;

/** Everything needed to make and log one call. */
type CallSpec = {
  target: string;
  variant: string;
  character: CharacterName;
  sample: number;
  turn?: number;
  attempt?: number;
  seed: number;
  prompt: string;
  /** TD v0.3's system message (blocks 1–3), when the run uses that layout. */
  system?: string;
  extra: Record<string, unknown>;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
} & ({ callType: "think"; expect: ThinkExpectation } | { callType: "speak"; expect: SpeakExpectation });

/** Makes one call; returns null when the budget cap stops it. */
type Caller = <S extends CallSpec>(spec: S) => Promise<(S["callType"] extends "speak" ? SpeakCallRecord : ThinkCallRecord) | null>;

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "dry-run": { type: "boolean", default: false },
    td: { type: "string", default: process.env.PROBE_TD ?? "0.2" },
    extend: { type: "boolean", default: false },
    concurrency: { type: "string" },
    model: { type: "string" },
    samples: { type: "string" },
    runs: { type: "string" },
    modes: { type: "string" },
  },
});

async function main(): Promise<void> {
  const targets = positionals.length ? expandTargets(positionals.map((t) => t.toLowerCase())) : TARGETS;
  for (const t of targets) {
    if (!TARGETS.includes(t)) {
      throw new Error(`Unknown target "${t}". Known: ${[...TARGETS, ...Object.keys(TARGET_GROUPS)].join(", ")}`);
    }
  }
  const model = config.models.find((m) => m.id === (opts.model ?? config.models[0]!.id));
  if (!model) throw new Error(`Unknown model "${opts.model}". Known: ${config.models.map((m) => m.id).join(", ")}`);
  const tdPath = technicalDesignPath(opts.td!);
  if (!existsSync(tdPath)) throw new Error(`No Technical Design v${opts.td} (${tdPath})`);
  const docs = loadDocs({ ...config.docs, technicalDesign: tdPath });
  // TD v0.3: blocks 1–3 as a system message unless the model opts out, and Block 9a without contacts.
  layout.systemRole = opts.td !== "0.2" && model.systemRole !== false;
  layout.thinkFormat = opts.td === "0.2" ? "td0.2" : "td0.3";

  // --extend: each dialogue target continues numbering after the model's latest pool of runs.
  const extendsRuns: Record<string, string> = {};
  const sampleOffsets: Record<string, number> = {};
  if (opts.extend) {
    const records = readRecords(runLogFiles());
    for (const t of targets) {
      const s = SCENARIOS[t];
      if (s?.callType !== "dialogue") throw new Error(`--extend applies to dialogue targets only; "${t}" isn't one`);
      const pool = probePool(records, model.id, s.id);
      if (!pool.length) throw new Error(`--extend: no earlier ${s.id} run for ${model.id} to extend`);
      const samples = records.filter((r): r is CallRecord => r.type === "call" && pool.includes(r.runId) && r.target === s.id).map((c) => c.sample);
      extendsRuns[s.id] = pool[0]!;
      sampleOffsets[s.id] = Math.max(...samples) + 1;
    }
  }

  if (opts["dry-run"]) {
    printDryRun(model, docs, targets);
    return;
  }

  const client = clientFor(model);
  const endpoint = await fetchEndpoint(model);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${model.id}`;
  const log = new RunLog(runId);
  const runCap = model.runUsd ?? config.budget.runUsd;
  const budget = new Budget(runCap, config.budget.totalUsd, priorSpend());

  log.write({
    type: "run",
    runId,
    startedAt: new Date().toISOString(),
    modelId: model.id,
    modelSlug: model.slug,
    endpoint,
    docVersions: docs.versions,
    gitCommit: gitCommit(),
    targets,
    settings: {
      td: opts.td,
      systemRole: layout.systemRole,
      ...(opts.extend && { extends: extendsRuns, sampleOffsets }),
      temperature: model.noTemperature ? "model default" : config.temperature,
      seedBase: config.seedBase,
      plotProtection: config.plotProtection,
      maxTokens: config.maxTokens,
      speakRetries: config.speakRetries,
      thinkingOff: model.thinkingOff ?? config.thinkingOff,
      budget: config.budget,
    },
  });

  console.log(`Run ${runId}`);
  console.log(
    `${model.slug} via ${endpoint.providerName} (${endpoint.tag}, ${endpoint.quantization}), ` +
      `$${(endpoint.price.input * 1e6).toFixed(3)}/$${(endpoint.price.output * 1e6).toFixed(3)} per M tokens`,
  );
  console.log(`Docs: ${versionsLine(docs)}`);
  console.log(
    `Budget: $${budget.priorSpendUsd.toFixed(4)} spent in earlier runs; caps $${runCap} this run, $${config.budget.totalUsd} total\n`,
  );

  const concurrency = opts.concurrency ? Number(opts.concurrency) : config.concurrency;
  let calls = 0;
  let stopped = false;
  const call: Caller = async (spec) => {
    if (stopped) return null;
    const maxTokens = config.maxTokens[spec.callType];
    const worst = worstCaseCost((spec.system?.length ?? 0) + spec.prompt.length, maxTokens, endpoint.price);
    if (!budget.tryReserve(worst)) {
      stopped = true;
      return null;
    }
    const res = await callModel(client, {
      model,
      prompt: spec.prompt,
      system: spec.system,
      temperature: model.noTemperature ? undefined : config.temperature,
      seed: spec.seed,
      maxTokens,
      extra: spec.extra,
      jsonSchema: spec.jsonSchema,
    });
    const cost = res.ok
      ? (res.usage.costUsd ?? res.usage.inputTokens * endpoint.price.input + res.usage.outputTokens * endpoint.price.output)
      : 0;
    budget.settle(worst, cost);
    const base = {
      type: "call" as const,
      runId,
      modelId: model.id,
      providerTag: model.provider,
      target: spec.target,
      variant: spec.variant,
      character: spec.character,
      sample: spec.sample,
      turn: spec.turn,
      attempt: spec.attempt,
      seed: spec.seed,
      temperature: model.noTemperature ? null : config.temperature,
      maxTokens,
      requestExtra: spec.extra,
      constrained: Boolean(spec.jsonSchema),
      prompt: spec.prompt,
      system: spec.system,
      raw: res.ok ? res.content : null,
      reasoning: res.ok ? res.reasoning : null,
      usage: res.ok ? res.usage : null,
      costUsd: cost,
      latencyMs: res.latencyMs,
      provider: res.ok ? res.provider : null,
      generationId: res.ok ? res.generationId : null,
      finishReason: res.ok ? res.finishReason : null,
      error: res.ok ? null : { message: res.error, status: res.status },
      at: new Date().toISOString(),
    };
    const record: CallRecord =
      spec.callType === "think"
        ? { ...base, callType: "think", expect: spec.expect, parsed: res.ok ? parseThink(res.content, spec.expect) : null }
        : { ...base, callType: "speak", expect: spec.expect, parsed: res.ok ? parseSpeak(res.content, spec.expect) : null };
    log.write(record);
    calls++;
    console.log(progressLine(record));
    return record as never;
  };

  for (const target of targets) {
    const scenario = SCENARIOS[target];
    if (scenario?.callType === "dialogue") {
      const runs = opts.runs ? Number(opts.runs) : scenario.runs;
      console.log(`— ${target}: ${runs} runs × ${scenario.turns.length} turns`);
      await runPool(
        Array.from({ length: runs }, (_, r) => r),
        concurrency,
        (r) => runDialogue(scenario, r + (sampleOffsets[scenario.id] ?? 0), docs, model, call, log, runId),
      );
    } else {
      const jobs = dropUnsupported(buildJobs(target, model, docs), endpoint);
      console.log(`— ${target}: ${jobs.length} calls`);
      const records = await runPool(jobs, concurrency, (job) => call(job));
      if (target === "preflight" && !stopped) printPreflight(records.filter((r): r is ThinkCallRecord => r !== null));
    }
    if (stopped) break;
  }

  if (stopped) {
    const reason = `Budget cap reached: the next call could exceed $${runCap} this run or $${config.budget.totalUsd} total`;
    log.write({ type: "stop", runId, reason, spentUsd: budget.spentUsd, at: new Date().toISOString() });
    console.log(`\nSTOPPED. ${reason}.`);
  }
  log.write({ type: "end", runId, calls, spentUsd: budget.spentUsd, stoppedByBudget: stopped, at: new Date().toISOString() });
  console.log(`\n${calls} calls, $${budget.spentUsd.toFixed(4)} spent. Log: ${log.path}`);
  console.log("Score with: npm run score");
  if (stopped) process.exitCode = 2;
}

/**
 * One run of a dialogue: each turn adds the scripted lines, then the probed
 * character thinks and speaks. Their thoughts feed later turns' block 7 and
 * their lines join History. A speak() reply that doesn't parse is retried; if
 * none parses, the run is aborted and logged, since it can't continue.
 */
async function runDialogue(
  s: DialogueScenario,
  /** The run's sample number: its index, plus any --extend offset. */
  run: number,
  docs: DocSources,
  model: ModelConfig,
  call: Caller,
  log: RunLog,
  runId: string,
): Promise<void> {
  const thinkingOff = model.thinkingOff ?? config.thinkingOff;
  const character = s.probed;
  const history: HistoryLine[] = [...s.opening];
  const thoughts: string[] = [];

  for (let turn = 1; turn <= s.turns.length; turn++) {
    history.push(...s.turns[turn - 1]!);
    const live = (): LiveState => ({
      history: [...history],
      shortTermThoughts: [...thoughts],
      utterance: history.filter((l) => l.kind === "speech").length,
    });
    const seed = config.seedBase + run * 1000 + turn * 10;

    const thinkCtx = characterContext(s, character, docs, config.plotProtection, live());
    const thought = await call({
      callType: "think",
      target: s.id,
      variant: "raw",
      character,
      sample: run,
      turn,
      seed,
      ...messages(assembleThinkPrompt(docs.templates, thinkCtx)),
      expect: {
        conversation: s.conversation.kind,
        livingOthers: thinkCtx.state.livingOthers,
        ignoreNames: unbriefedGuests(s.id),
        format: layout.thinkFormat,
      },
      extra: thinkingOff,
    });
    if (!thought) return;
    const thoughtText = thought.parsed?.repaired.value?.thought;
    if (thoughtText) thoughts.push(thoughtText);

    // speak() sees the thought it just had, as TD's shortTermHistory would hold it.
    const speakCtx = characterContext(s, character, docs, config.plotProtection, live());
    const actions = actionContext(s, character, docs);
    const expect: SpeakExpectation = {
      present: speakCtx.state.present,
      allowedActions: allowedActionTypes(actions),
      florins: actions.florins,
    };
    const speakMessages = messages(
      assembleSpeakPrompt(docs.templates, speakCtx, {
        allowedActions: allowedActionsText(actions),
        extraInstruction: s.speakInstruction,
      }),
    );

    let spoken: SpeakCallRecord | null = null;
    for (let attempt = 0; attempt <= config.speakRetries; attempt++) {
      const rec = await call({
        callType: "speak",
        target: s.id,
        variant: "raw",
        character,
        sample: run,
        turn,
        attempt,
        seed: seed + 1 + attempt,
        ...speakMessages,
        expect,
        extra: thinkingOff,
      });
      if (!rec) return;
      if (rec.parsed?.verdict === "valid") {
        spoken = rec;
        break;
      }
    }
    if (!spoken) {
      const reason = `no usable speak() line after ${config.speakRetries + 1} attempts`;
      log.write({ type: "abort", runId, modelId: model.id, target: s.id, sample: run, turn, reason, at: new Date().toISOString() });
      console.log(`  ${s.id} run ${run} ABORTED at turn ${turn}: ${reason}`);
      return;
    }
    const p = spoken.parsed!;
    history.push({ kind: "speech", speaker: character, addressee: p.addressee ?? undefined, text: p.value!.utterance });
  }
}

function actionContext(s: Scenario, character: CharacterName, docs: DocSources): ActionContext {
  return {
    faction: factionOf(character),
    florins: currentFlorins(s, character, docs),
    pensionSize: docs.tunables.pension_size,
    treasury: docs.tunables.embassy_treasury,
    colloquioWith:
      s.conversation.kind === "colloquio" ? (s.conversation.present.find((p) => p !== character) ?? null) : null,
  };
}

type ThinkSpec = Extract<CallSpec, { callType: "think" }>;

function buildJobs(target: string, model: ModelConfig, docs: DocSources): ThinkSpec[] {
  const thinkingOff = model.thinkingOff ?? config.thinkingOff;

  if (target === "preflight") {
    // A real think() prompt, so the check covers the calls that matter.
    const character = S1.probed[0]!;
    const { prompt, system, expect } = thinkPrompt(S1, character, docs);
    const job = (variant: string, sample: number, extra: Record<string, unknown>): ThinkSpec => ({
      callType: "think",
      target,
      variant,
      character,
      sample,
      seed: config.seedBase + sample,
      prompt,
      system,
      expect,
      extra,
    });
    const jobs = Array.from({ length: config.preflight.calls }, (_, i) => job("thinking-off", i, thinkingOff));
    if (model.hasThinking !== false) jobs.push(job("control-thinking-on", 0, config.preflight.controlThinkingOn));
    return jobs;
  }

  const scenario = SCENARIOS[target] as ThinkScenario;
  const samples = opts.samples ? Number(opts.samples) : scenario.samples;
  const modes = opts.modes ? (opts.modes.split(",") as DecodingMode[]) : scenario.modes;
  const prompts = new Map(scenario.probed.map((c) => [c, thinkPrompt(scenario, c, docs)]));
  const schema = thinkJsonSchema(scenario.conversation.kind);

  return modes.flatMap((mode) =>
    Array.from({ length: samples }, (_, i): ThinkSpec => {
      const character = scenario.probed[i % scenario.probed.length]!;
      const { prompt, system, expect } = prompts.get(character)!;
      return {
        callType: "think",
        target: scenario.id,
        variant: mode,
        character,
        sample: i,
        seed: config.seedBase + i,
        prompt,
        system,
        expect,
        extra: thinkingOff,
        jsonSchema: mode === "constrained" ? { name: "think", schema } : undefined,
      };
    }),
  );
}

function thinkPrompt(s: ThinkScenario, character: CharacterName, docs: DocSources) {
  const ctx = characterContext(s, character, docs, config.plotProtection);
  return {
    ...messages(assembleThinkPrompt(docs.templates, ctx)),
    expect: {
      conversation: s.conversation.kind,
      livingOthers: ctx.state.livingOthers,
      ignoreNames: unbriefedGuests(s.id),
      format: layout.thinkFormat,
    },
  };
}

/** How prompts are laid out for this run, set once from --td and the model. */
const layout = { systemRole: false, thinkFormat: "td0.2" as "td0.2" | "td0.3" };

/** The run's message layout: one user message, or TD v0.3's system + user split. */
function messages(p: AssembledPrompt): { prompt: string; system?: string } {
  return layout.systemRole ? { prompt: p.user, system: p.system } : { prompt: p.text };
}

function dropUnsupported(jobs: ThinkSpec[], endpoint: EndpointInfo): ThinkSpec[] {
  if (endpoint.supportedParameters.includes("structured_outputs")) return jobs;
  const kept = jobs.filter((j) => !j.jsonSchema);
  if (kept.length < jobs.length) {
    console.log(`  ${endpoint.tag} doesn't support structured outputs; skipping ${jobs.length - kept.length} constrained calls`);
  }
  return kept;
}

/** Runs items with bounded concurrency, in order. */
async function runPool<I, T>(items: I[], limit: number, fn: (item: I) => Promise<T>): Promise<T[]> {
  const results: T[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) results.push(await fn(items[next++]!));
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function progressLine(r: CallRecord): string {
  const where = r.turn !== undefined ? `run ${r.sample} t${r.turn}${r.attempt ? ` retry ${r.attempt}` : ""}` : `#${r.sample}`;
  const head = `  ${r.target} ${r.callType.padEnd(5)} ${r.variant.padEnd(19)} ${where.padEnd(14)} ${r.character.padEnd(22)}`;
  if (r.error) return `${head} ERROR ${r.error.status ?? ""} ${r.error.message}`;
  const u = r.usage!;
  const reasoning = u.reasoningTokens ? ` (reasoning ${u.reasoningTokens})` : "";
  const verdict =
    r.callType === "think"
      ? [r.parsed!.strict, r.parsed!.revised, r.parsed!.repaired].map((l) => l.verdict).join("/")
      : `${r.parsed!.verdict}${r.parsed!.addressee ? ` →${r.parsed!.addressee}` : ""}${r.parsed!.action ? ` ${r.parsed!.action.type}` : ""}`;
  return (
    `${head} ${verdict.padEnd(22)} in ${u.inputTokens} out ${u.outputTokens}${reasoning}` +
    `  ${(r.latencyMs / 1000).toFixed(1)}s  $${r.costUsd.toFixed(5)}  ${r.provider ?? "?"}`
  );
}

function printPreflight(records: ThinkCallRecord[]): void {
  const off = records.filter((r) => r.variant === "thinking-off" && !r.error);
  const control = records.find((r) => r.variant === "control-thinking-on" && !r.error);
  const leaked = off.filter((r) => (r.usage?.reasoningTokens ?? 0) > 0 || r.reasoning);
  console.log(
    leaked.length > 0
      ? `  Thinking off: FLAG (${leaked.length} of ${off.length} answered calls show reasoning; scenarios still run, with the extra cost reported)`
      : off.length < config.preflight.calls
        ? `  Thinking off: INCOMPLETE (only ${off.length}/${config.preflight.calls} calls answered, none with reasoning)`
        : `  Thinking off: PASS (${off.length}/${config.preflight.calls} calls with no reasoning tokens or text)`,
  );
  if (!records.some((r) => r.variant === "control-thinking-on")) {
    console.log("  Control (thinking on): skipped, the model has no thinking mode");
    return;
  }
  console.log(
    control && control.usage!.reasoningTokens > 0
      ? `  Control (thinking on): ${control.usage!.reasoningTokens} reasoning tokens reported, so the check can see reasoning`
      : "  Control (thinking on): no reasoning tokens reported. The thinking-off check can't be trusted for this endpoint",
  );
}

function printDryRun(model: ModelConfig, docs: DocSources, targets: string[]): void {
  console.log("DRY RUN: nothing is sent to any model.\n");
  console.log(`Model: ${model.slug}, pinned to ${model.provider} (fallbacks off)`);
  console.log(`Docs: ${versionsLine(docs)}`);
  console.log(`Tunables: ${JSON.stringify(docs.tunables)}`);
  console.log(
    `Temperature ${config.temperature}, max_tokens think ${config.maxTokens.think} / speak ${config.maxTokens.speak}, seeds from ${config.seedBase}`,
  );
  console.log(`Thinking-off fields: ${JSON.stringify(model.thinkingOff ?? config.thinkingOff)}\n`);

  const printed = new Set<string>();
  const show = (label: string, prompt: string) => {
    if (printed.has(prompt)) return;
    printed.add(prompt);
    console.log(`\n---------- PROMPT: ${label} ----------\n${prompt}\n`);
  };

  for (const target of targets) {
    const scenario = SCENARIOS[target];
    if (scenario?.callType === "dialogue") {
      const runs = opts.runs ? Number(opts.runs) : scenario.runs;
      const n = scenario.turns.length;
      console.log(
        `== ${target}: ${runs} runs × ${n} turns = ${runs * n * 2} calls (think + speak per turn, plus any speak retries). ` +
          "Only turn 1 can be shown: later turns depend on the model's own replies.",
      );
      const history = [...scenario.opening, ...scenario.turns[0]!];
      const live = { history, shortTermThoughts: [], utterance: history.filter((l) => l.kind === "speech").length };
      const ctx = characterContext(scenario, scenario.probed, docs, config.plotProtection, live);
      show(`${scenario.id} · ${scenario.probed} · turn 1 · think()`, assembleThinkPrompt(docs.templates, ctx).text);
      const actions = allowedActionsText(actionContext(scenario, scenario.probed, docs));
      show(
        `${scenario.id} · ${scenario.probed} · turn 1 · speak() (block 7 will also hold the turn's thought)`,
        assembleSpeakPrompt(docs.templates, ctx, { allowedActions: actions, extraInstruction: scenario.speakInstruction }).text,
      );
      continue;
    }
    const jobs = buildJobs(target, model, docs);
    const counts = new Map<string, number>();
    for (const j of jobs) counts.set(j.variant, (counts.get(j.variant) ?? 0) + 1);
    const chars = Math.max(...jobs.map((j) => j.prompt.length));
    console.log(
      `== ${target}: ${jobs.length} calls (${[...counts].map(([v, n]) => `${v} ${n}`).join(", ")}); ` +
        `longest prompt ${chars} chars, ~${Math.round(chars / 4)} tokens`,
    );
    for (const j of jobs) {
      show(`${j.target} · ${j.character} · think()`, j.system ? `[SYSTEM MESSAGE]\n${j.system}\n\n[USER MESSAGE]\n${j.prompt}` : j.prompt);
    }
    const schema = jobs.find((j) => j.jsonSchema)?.jsonSchema;
    if (schema) console.log(`---------- JSON SCHEMA (constrained mode) ----------\n${JSON.stringify(schema.schema, null, 2)}\n`);
  }
}

function versionsLine(docs: DocSources): string {
  const v = docs.versions;
  return `TD v${v.technicalDesign}, Characters v${v.characters}, Mechanics v${v.mechanics}, Models & Research v${v.modelsResearch}`;
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exitCode = 1;
});
