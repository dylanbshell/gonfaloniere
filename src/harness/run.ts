// Probe runner.
//
//   npm run probe -- --dry-run                       print prompts, call nothing
//   op run --env-file=.env -- npm run probe          pre-flight, then S1
//   op run --env-file=.env -- npm run probe -- s1 --samples 3
//
// Targets: preflight, s1 (default: both, in that order).
// Options: --model <id>, --samples <n> (override per mode), --modes raw,constrained

import { execSync } from "node:child_process";
import { parseArgs } from "node:util";
import { config, type ModelConfig } from "../../probe.config.ts";
import S1 from "../../scenarios/s1-quiet-capannello.ts";
import type { CharacterName } from "../game/roster.ts";
import { parseThink, thinkJsonSchema, type ThinkExpectation } from "../output/think.ts";
import { assembleThinkPrompt } from "../prompt/assemble.ts";
import { loadDocs, type DocSources } from "../sources/docs.ts";
import { Budget, worstCaseCost } from "./budget.ts";
import { RunLog, priorSpend, type CallRecord } from "./log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient, type EndpointInfo } from "./openrouter.ts";
import { thinkContext, type DecodingMode, type ThinkScenario } from "./scenario.ts";

const SCENARIOS: Record<string, ThinkScenario> = { s1: S1 };
const TARGETS = ["preflight", ...Object.keys(SCENARIOS)];

interface Job {
  target: string;
  variant: string;
  character: CharacterName;
  sample: number;
  seed: number;
  prompt: string;
  expect: ThinkExpectation;
  extra: Record<string, unknown>;
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    "dry-run": { type: "boolean", default: false },
    model: { type: "string" },
    samples: { type: "string" },
    modes: { type: "string" },
  },
});

async function main(): Promise<void> {
  const targets = positionals.length ? positionals.map((t) => t.toLowerCase()) : TARGETS;
  for (const t of targets) {
    if (!TARGETS.includes(t)) throw new Error(`Unknown target "${t}". Known: ${TARGETS.join(", ")}`);
  }
  const model = config.models.find((m) => m.id === (opts.model ?? config.models[0]!.id));
  if (!model) throw new Error(`Unknown model "${opts.model}". Known: ${config.models.map((m) => m.id).join(", ")}`);

  const docs = loadDocs(config.docs);
  const jobsByTarget = targets.map((t) => ({ target: t, jobs: buildJobs(t, model, docs) }));

  if (opts["dry-run"]) {
    printDryRun(model, docs, jobsByTarget);
    return;
  }

  const client = makeClient(apiKey());
  const endpoint = await fetchEndpoint(model);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${model.id}`;
  const log = new RunLog(runId);
  const budget = new Budget(config.budget.runUsd, config.budget.totalUsd, priorSpend());

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
      temperature: config.temperature,
      seedBase: config.seedBase,
      plotProtection: config.plotProtection,
      maxTokens: config.maxTokens,
      thinkingOff: model.thinkingOff ?? config.thinkingOff,
      budget: config.budget,
    },
  });

  console.log(`Run ${runId}`);
  console.log(
    `${model.slug} via ${endpoint.providerName} (${endpoint.tag}, ${endpoint.quantization}), ` +
      `$${(endpoint.price.input * 1e6).toFixed(3)}/$${(endpoint.price.output * 1e6).toFixed(3)} per M tokens`,
  );
  console.log(
    `Docs: TD v${docs.versions.technicalDesign}, Characters v${docs.versions.characters}, Mechanics v${docs.versions.mechanics}`,
  );
  console.log(
    `Budget: $${budget.priorSpendUsd.toFixed(4)} spent in earlier runs; caps $${config.budget.runUsd} this run, $${config.budget.totalUsd} total\n`,
  );

  let calls = 0;
  let stopped = false;
  for (const { target, jobs } of jobsByTarget) {
    const runnable = dropUnsupported(jobs, endpoint);
    console.log(`— ${target}: ${runnable.length} calls`);
    const records = await runPool(runnable, config.concurrency, async (job) => {
      const maxTokens = config.maxTokens.think;
      const worst = worstCaseCost(job.prompt.length, maxTokens, endpoint.price);
      if (!budget.tryReserve(worst)) return null;
      const res = await callModel(client, {
        model,
        prompt: job.prompt,
        temperature: config.temperature,
        seed: job.seed,
        maxTokens,
        extra: job.extra,
        jsonSchema: job.jsonSchema,
      });
      const cost = res.ok
        ? (res.usage.costUsd ??
          res.usage.inputTokens * endpoint.price.input + res.usage.outputTokens * endpoint.price.output)
        : 0;
      budget.settle(worst, cost);
      const record: CallRecord = {
        type: "call",
        runId,
        modelId: model.id,
        providerTag: model.provider,
        target: job.target,
        variant: job.variant,
        callType: "think",
        character: job.character,
        sample: job.sample,
        seed: job.seed,
        temperature: config.temperature,
        maxTokens,
        requestExtra: job.extra,
        constrained: Boolean(job.jsonSchema),
        prompt: job.prompt,
        expect: job.expect,
        raw: res.ok ? res.content : null,
        reasoning: res.ok ? res.reasoning : null,
        parsed: res.ok ? parseThink(res.content, job.expect) : null,
        usage: res.ok ? res.usage : null,
        costUsd: cost,
        latencyMs: res.latencyMs,
        provider: res.ok ? res.provider : null,
        generationId: res.ok ? res.generationId : null,
        finishReason: res.ok ? res.finishReason : null,
        error: res.ok ? null : { message: res.error, status: res.status },
        at: new Date().toISOString(),
      };
      log.write(record);
      calls++;
      console.log(progressLine(record));
      return record;
    });

    if (records.some((r) => r === null)) {
      stopped = true;
      const reason = `Budget cap reached: the next call could exceed $${config.budget.runUsd} this run or $${config.budget.totalUsd} total`;
      log.write({ type: "stop", runId, reason, spentUsd: budget.spentUsd, at: new Date().toISOString() });
      console.log(`\nSTOPPED. ${reason}.`);
      break;
    }
    if (target === "preflight") printPreflight(records.filter((r): r is CallRecord => r !== null));
  }

  log.write({
    type: "end",
    runId,
    calls,
    spentUsd: budget.spentUsd,
    stoppedByBudget: stopped,
    at: new Date().toISOString(),
  });
  console.log(`\n${calls} calls, $${budget.spentUsd.toFixed(4)} spent. Log: ${log.path}`);
  console.log("Score with: npm run score");
  if (stopped) process.exitCode = 2;
}

function buildJobs(target: string, model: ModelConfig, docs: DocSources): Job[] {
  const thinkingOff = model.thinkingOff ?? config.thinkingOff;

  if (target === "preflight") {
    // A real think() prompt, so the check covers the calls that matter.
    const character = S1.probed[0]!;
    const { prompt, expect } = thinkPrompt(S1, character, docs);
    const jobs: Job[] = Array.from({ length: config.preflight.calls }, (_, i) => ({
      target,
      variant: "thinking-off",
      character,
      sample: i,
      seed: config.seedBase + i,
      prompt,
      expect,
      extra: thinkingOff,
    }));
    jobs.push({
      target,
      variant: "control-thinking-on",
      character,
      sample: 0,
      seed: config.seedBase,
      prompt,
      expect,
      extra: config.preflight.controlThinkingOn,
    });
    return jobs;
  }

  const scenario = SCENARIOS[target]!;
  const samples = opts.samples ? Number(opts.samples) : scenario.samples;
  const modes = opts.modes ? (opts.modes.split(",") as DecodingMode[]) : scenario.modes;
  const prompts = new Map(scenario.probed.map((c) => [c, thinkPrompt(scenario, c, docs)]));
  const schema = thinkJsonSchema(scenario.conversation.kind);

  return modes.flatMap((mode) =>
    Array.from({ length: samples }, (_, i): Job => {
      const character = scenario.probed[i % scenario.probed.length]!;
      const { prompt, expect } = prompts.get(character)!;
      return {
        target: scenario.id,
        variant: mode,
        character,
        sample: i,
        seed: config.seedBase + i,
        prompt,
        expect,
        extra: thinkingOff,
        jsonSchema: mode === "constrained" ? { name: "think", schema } : undefined,
      };
    }),
  );
}

function thinkPrompt(s: ThinkScenario, character: CharacterName, docs: DocSources) {
  const ctx = thinkContext(s, character, docs, config.plotProtection);
  return {
    prompt: assembleThinkPrompt(docs.templates, ctx).text,
    expect: { conversation: s.conversation.kind, livingOthers: ctx.state.livingOthers },
  };
}

function dropUnsupported(jobs: Job[], endpoint: EndpointInfo): Job[] {
  if (endpoint.supportedParameters.includes("structured_outputs")) return jobs;
  const kept = jobs.filter((j) => !j.jsonSchema);
  if (kept.length < jobs.length) {
    console.log(`  ${endpoint.tag} doesn't support structured outputs; skipping ${jobs.length - kept.length} constrained calls`);
  }
  return kept;
}

/** Runs jobs with bounded concurrency. Once one returns null, no new jobs start. */
async function runPool<T>(jobs: Job[], limit: number, fn: (job: Job) => Promise<T | null>): Promise<(T | null)[]> {
  const results: (T | null)[] = [];
  let next = 0;
  let halted = false;
  const worker = async (): Promise<void> => {
    while (!halted && next < jobs.length) {
      const result = await fn(jobs[next++]!);
      results.push(result);
      if (result === null) halted = true;
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, jobs.length) }, worker));
  return results;
}

function progressLine(r: CallRecord): string {
  const head = `  ${r.target} ${r.variant.padEnd(19)} #${String(r.sample).padEnd(3)} ${r.character.padEnd(22)}`;
  if (r.error) return `${head} ERROR ${r.error.status ?? ""} ${r.error.message}`;
  const u = r.usage!;
  const reasoning = u.reasoningTokens ? ` (reasoning ${u.reasoningTokens})` : "";
  return (
    `${head} ${`${r.parsed!.original.verdict}/${r.parsed!.revised.verdict}`.padEnd(15)} ` +
    `in ${u.inputTokens} out ${u.outputTokens}${reasoning}` +
    `  ${(r.latencyMs / 1000).toFixed(1)}s  $${r.costUsd.toFixed(5)}  ${r.provider ?? "?"}`
  );
}

function printPreflight(records: CallRecord[]): void {
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
  console.log(
    control && control.usage!.reasoningTokens > 0
      ? `  Control (thinking on): ${control.usage!.reasoningTokens} reasoning tokens reported, so the check can see reasoning`
      : "  Control (thinking on): no reasoning tokens reported. The thinking-off check can't be trusted for this endpoint",
  );
}

function printDryRun(model: ModelConfig, docs: DocSources, jobsByTarget: { target: string; jobs: Job[] }[]): void {
  console.log("DRY RUN: nothing is sent to any model.\n");
  console.log(`Model: ${model.slug}, pinned to ${model.provider} (fallbacks off)`);
  console.log(
    `Docs: TD v${docs.versions.technicalDesign}, Characters v${docs.versions.characters}, Mechanics v${docs.versions.mechanics}`,
  );
  console.log(`Tunables: ${JSON.stringify(docs.tunables)}`);
  console.log(`Temperature ${config.temperature}, max_tokens ${config.maxTokens.think}, seeds from ${config.seedBase}`);
  console.log(`Thinking-off fields: ${JSON.stringify(model.thinkingOff ?? config.thinkingOff)}\n`);

  const printed = new Set<string>();
  for (const { target, jobs } of jobsByTarget) {
    const counts = new Map<string, number>();
    for (const j of jobs) counts.set(j.variant, (counts.get(j.variant) ?? 0) + 1);
    const chars = Math.max(...jobs.map((j) => j.prompt.length));
    console.log(
      `== ${target}: ${jobs.length} calls (${[...counts].map(([v, n]) => `${v} ${n}`).join(", ")}); ` +
        `longest prompt ${chars} chars, ~${Math.round(chars / 4)} tokens`,
    );
    for (const j of jobs) {
      if (printed.has(j.prompt)) continue;
      printed.add(j.prompt);
      console.log(`\n---------- PROMPT: ${j.target} · ${j.character} · think() ----------\n${j.prompt}\n`);
    }
    const schema = jobs.find((j) => j.jsonSchema)?.jsonSchema;
    if (schema) console.log(`---------- JSON SCHEMA (constrained mode) ----------\n${JSON.stringify(schema.schema, null, 2)}\n`);
  }
}

function gitCommit(): string | null {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exitCode = 1;
});
