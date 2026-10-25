// Runs strategy probes S8–S10 (Models & Research v0.20) through Technical
// Design v0.4's real task prompts, and logs every call as a "strategy"
// record for strategy/judge.ts.
//
//   npm run strategy -- --model deepseek-v4.1-flash --lines
//   npm run strategy -- --model gpt-5.4 --items S8
//
// Options: --model <id>, --items S8,S9a,S9b,S10 (default all), --lines (the
// claim line in think(), the reply and audience lines in speak(); Dylan,
// Oct 23; TD v0.5 builds them in, so --lines is for TD v0.4 only), --dry-run
// (print one prompt per situation), --concurrency <n>.
// plot_reward stays off (config), so Block 9e has no extra act.

import { parseArgs } from "node:util";
import { config, technicalDesignPath, type ModelConfig } from "../../probe.config.ts";
import { AUDIENCE_LINE, CLAIM_LINE, REPLY_LINE } from "../../scenarios/s5-claim-line.ts";
import { allowedActionTypes, allowedActionsText } from "../game/actions.ts";
import { Budget, worstCaseCost } from "../harness/budget.ts";
import { RunLog, gitCommit, priorSpend, type LogRecord } from "../harness/log.ts";
import { callModel, clientFor, fetchEndpoint } from "../harness/openrouter.ts";
import { actionContext, characterContext } from "../harness/scenario.ts";
import { parseSpeak, type SpeakParseResult } from "../output/speak.ts";
import { parseStrategy, type StrategyParseResult } from "../output/strategy.ts";
import { parseThink } from "../output/think.ts";
import {
  assembleBallotPrompt,
  assembleMurderPrompt,
  assemblePlanPrompt,
  assembleRunoffPrompt,
  assembleSpeakPrompt,
  assembleThinkPrompt,
  speakHasAddressee,
  type AssembledPrompt,
  type CharacterContext,
} from "../prompt/assemble.ts";
import { loadDocs } from "../sources/docs.ts";
import { STRATEGY_ITEMS, type StrategyItem } from "./items.ts";

const { values: opts } = parseArgs({
  options: {
    model: { type: "string" },
    items: { type: "string", default: "S8,S9a,S9b,S10" },
    lines: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    concurrency: { type: "string", default: "3" },
  },
});

/** One call's output as logged. */
export interface StrategyRecord {
  type: "strategy";
  runId: string;
  modelId: string;
  item: string;
  probe: StrategyItem["probe"];
  sample: number;
  character: string;
  lines: boolean;
  /** "plan" | "murder" | "ballot" | "runoff" | "think" | "speak" */
  call: string;
  system: string;
  prompt: string;
  raw: string | null;
  verdict: "syntax" | "valid" | "error";
  fenced: boolean;
  repairs: string[];
  illegal: string[];
  value: unknown;
  costUsd: number;
  error: string | null;
  at: string;
}

async function main(): Promise<void> {
  const model = config.models.find((m) => m.id === opts.model);
  if (!model) throw new Error(`Unknown --model ${opts.model}`);
  const td = process.env.PROBE_TD ?? "0.7";
  const docs = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath(td) });
  const wanted = opts.items.split(",");
  const items = STRATEGY_ITEMS.filter((i) => wanted.some((w) => i.probe === w || i.id === w));
  const lines = opts.lines;

  /** The character's context at this moment; calls outside a conversation are at "the gathering". */
  const contextFor = (item: StrategyItem, n: number): CharacterContext => {
    const sit = item.situations[n % item.situations.length]!;
    const ctx = characterContext(sit.scenario, sit.character, docs, config);
    if (sit.gathering) {
      // TD: Murder Round, ballot, and run-off happen at "the gathering", with no one
      // present (v0.5: "no one; you decide alone"); targets come from the living guests.
      ctx.state.conversation = { kind: "gathering" };
      ctx.state.present = [];
    }
    if (sit.embassyPensions && ctx.state.embassyLedger) ctx.state.embassyLedger.pensions = sit.embassyPensions;
    return ctx;
  };
  const taskPrompt = (item: StrategyItem, ctx: CharacterContext): AssembledPrompt => {
    const t = item.task;
    if (t.kind === "plan") {
      const faction = ctx.state.phaseLabel.match(/\(([^)]+)\)/)?.[1];
      return assemblePlanPrompt(docs.templates, ctx, t.trigger.replace("Your faction", faction ? `The ${faction}` : "Your faction"));
    }
    if (t.kind === "murder") return assembleMurderPrompt(docs.templates, ctx);
    if (t.kind === "ballot") return assembleBallotPrompt(docs.templates, ctx, { candidates: t.candidates, repentance: t.repentance, votePrice: t.votePrice });
    if (t.kind === "runoff") return assembleRunoffPrompt(docs.templates, ctx, t.tied, t.repentance);
    return assembleThinkPrompt(docs.templates, ctx, lines ? { extraInstruction: CLAIM_LINE } : {});
  };

  if (opts["dry-run"]) {
    for (const item of items) {
      for (let n = 0; n < item.situations.length; n++) {
        const ctx = contextFor(item, n);
        console.log(`\n========== ${item.id} · ${ctx.characterName} · ${item.task.kind} ==========\n${taskPrompt(item, ctx).text}`);
      }
    }
    return;
  }

  const client = clientFor(model);
  const endpoint = await fetchEndpoint(model);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${model.id}`;
  const log = new RunLog(runId, "strategy-");
  const budget = new Budget(model.runUsd ?? config.budget.runUsd, config.budget.totalUsd, priorSpend());
  log.write({ type: "run", runId, startedAt: new Date().toISOString(), modelId: model.id, endpoint, docVersions: docs.versions, gitCommit: gitCommit(), targets: items.map((i) => i.id), settings: { lines, td, plotReward: config.plotReward } } as unknown as LogRecord);
  console.log(`${model.id}${lines ? " (claim, reply, audience lines)" : ""}: ${items.map((i) => `${i.id}×${i.samples}`).join(", ")}; $${budget.priorSpendUsd.toFixed(2)} spent before this`);

  let stopped = false;
  const call = async (p: AssembledPrompt, maxTokens: number) => {
    const worst = worstCaseCost(p.system.length + p.user.length, maxTokens, endpoint.price);
    if (stopped || !budget.tryReserve(worst)) {
      if (!stopped) console.log("STOPPED: the next call could exceed the run cap or the probe cap.");
      stopped = true;
      return null;
    }
    const res = await callModel(client, {
      model: model as ModelConfig,
      prompt: p.user,
      system: p.system,
      ...(!model.noTemperature && { temperature: config.temperature }),
      maxTokens,
      extra: model.thinkingOff ?? config.thinkingOff,
    });
    const cost = res.ok ? (res.usage.costUsd ?? res.usage.inputTokens * endpoint.price.input + res.usage.outputTokens * endpoint.price.output) : 0;
    budget.settle(worst, cost);
    return { res, cost };
  };
  const record = (base: Omit<StrategyRecord, "type" | "runId" | "modelId" | "lines" | "at">) =>
    log.write({ type: "strategy", runId, modelId: model.id, lines, ...base, at: new Date().toISOString() } as unknown as LogRecord);

  async function runOne(item: StrategyItem, n: number): Promise<void> {
    const sit = item.situations[n % item.situations.length]!;
    const ctx = contextFor(item, n);
    const p = taskPrompt(item, ctx);
    const kind = item.task.kind === "think+speak" ? "think" : item.task.kind;
    const made = await call(p, config.maxTokens.think);
    if (!made) return;
    const base = { item: item.id, probe: item.probe, sample: n, character: sit.character, system: p.system, prompt: p.user };
    if (!made.res.ok) {
      record({ ...base, call: kind, raw: null, verdict: "error", fenced: false, repairs: [], illegal: [], value: null, costUsd: 0, error: made.res.error });
      return;
    }
    const raw = made.res.content;
    let parsed: { verdict: string; fenced: boolean; repairs: string[]; illegal: string[]; value: unknown };
    let thought: string | null = null;
    if (kind === "think") {
      const r = parseThink(raw, { conversation: sit.scenario.conversation.kind, livingOthers: ctx.state.livingOthers, ignoreNames: [], format: "td0.3" });
      thought = r.repaired.value?.thought ?? null;
      parsed = { verdict: r.repaired.verdict, fenced: r.fenced, repairs: Object.entries(r.repairs ?? {})
        .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : Boolean(v)))
        .map(([k]) => k), illegal: [], value: r.repaired.value };
    } else {
      const r: StrategyParseResult = parseStrategy(kind, raw, {
        character: sit.character,
        livingOthers: ctx.state.livingOthers,
        ...(item.task.kind === "ballot" && { maxBuy: Math.floor(ctx.state.florins / item.task.votePrice) }),
        ...(item.task.kind === "runoff" && { tied: item.task.tied }),
      });
      parsed = { verdict: r.verdict, fenced: r.fenced, repairs: [...(r.aliasRepairs ? [`alias×${r.aliasRepairs}`] : []), ...(r.truncated ? ["planTruncated"] : [])], illegal: r.illegal, value: r.value };
      if (r.errors.length) parsed.illegal = [...r.errors];
    }
    record({ ...base, call: kind, raw, verdict: parsed.verdict as StrategyRecord["verdict"], fenced: parsed.fenced, repairs: parsed.repairs, illegal: parsed.illegal, value: parsed.value, costUsd: made.cost, error: null });
    console.log(`  ${item.id} #${n} ${sit.character} ${kind}: ${parsed.verdict}${parsed.fenced ? " (fenced)" : ""}${parsed.illegal.length ? ` ILLEGAL ${parsed.illegal.join("; ")}` : ""}  $${made.cost.toFixed(4)}`);

    if (item.task.kind === "think+speak") {
      // speak() sees the thought it just had, as TD's shortTermHistory would hold it.
      const speakCtx = { ...ctx, shortTermThoughts: thought ? [thought] : [] };
      const actions = actionContext(sit.scenario, sit.character, docs);
      const sp = assembleSpeakPrompt(docs.templates, speakCtx, {
        allowedActions: allowedActionsText(actions),
        ...(lines && { insertAfter: { after: "Do not recite your private thoughts.", text: `${REPLY_LINE} ${AUDIENCE_LINE}` } }),
      });
      const s = await call(sp, config.maxTokens.speak);
      if (!s) return;
      const sres: SpeakParseResult | null = s.res.ok
        ? parseSpeak(s.res.content, {
            present: ctx.state.present,
            allowedActions: allowedActionTypes(actions),
            florins: actions.florins,
            addressee: speakHasAddressee(docs.templates, sit.scenario.conversation.kind),
          })
        : null;
      record({
        ...base,
        call: "speak",
        system: sp.system,
        prompt: sp.user,
        raw: s.res.ok ? s.res.content : null,
        verdict: sres ? sres.verdict : "error",
        fenced: sres?.fenced ?? false,
        repairs: sres?.addresseeIssue ? [sres.addresseeIssue] : [],
        illegal: sres?.actionRejected ? [sres.actionRejected] : [],
        value: sres?.value ?? null,
        costUsd: s.cost,
        error: s.res.ok ? null : s.res.error,
      });
      console.log(`  ${item.id} #${n} ${sit.character} speak: ${sres?.verdict ?? "error"}  $${s.cost.toFixed(4)}`);
    }
  }

  const jobs = items.flatMap((item) => Array.from({ length: item.samples }, (_, n) => ({ item, n })));
  await Promise.all(
    Array.from({ length: Number(opts.concurrency) }, async () => {
      for (let j = jobs.shift(); j && !stopped; j = jobs.shift()) await runOne(j.item, j.n);
    }),
  );
  console.log(`Spent $${budget.spentUsd.toFixed(4)}. Log: ${log.path}`);
}

main();
