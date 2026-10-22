// Replays stored judge prompts on another judge model, to measure how often
// a cheaper judge agrees with Sonnet's majority (judge cost study, Oct 22).
// Each run gets one pass with the exact prompt Sonnet saw under the newest
// of rubric cal3 or cal4 that run was judged with, and that rubric's schema.
// Results are logged as "judge-compare" records, so they never count as
// verdicts for scoring.
//
//   op run --env-file=.env -- npm run judge:compare -- --cap 2
//
// Options: --targets s5a,s5b,s5d (default), --cap <usd> (this invocation),
// --report (no calls: summarize what's logged).

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { config } from "../../probe.config.ts";
import { judgeJsonSchema, type JudgeVerdict } from "../judge/judge.ts";
import { Budget, worstCaseCost } from "./budget.ts";
import { RESULTS_DIR, RunLog, gitCommit, priorSpend, readRecords, runLogFiles, type JudgeRecord, type LogRecord } from "./log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient } from "./openrouter.ts";

const { values: opts } = parseArgs({
  options: {
    targets: { type: "string", default: "s5a,s5b,s5d" },
    cap: { type: "string", default: "2" },
    report: { type: "boolean", default: false },
  },
});

/** Schemas by rubric: cal4 is the current one; cal3's was rebuilt from commit f85af1e's judge.ts. */
const SCHEMAS: Record<string, () => Record<string, unknown>> = {
  cal4: judgeJsonSchema,
  cal3: () => JSON.parse(readFileSync(join(import.meta.dirname, "../judge/schema-cal3.json"), "utf8")),
};
const LEAKS = ["accidental", "capitulated"];

export interface JudgeCompareRecord {
  type: "judge-compare";
  runId: string;
  sourceRunId: string;
  modelId: string;
  target: string;
  sample: number;
  judgeModel: string;
  rubricVersion: string;
  /** Sonnet's leaked/held by majority of its passes under that rubric. */
  sonnetLeaked: boolean;
  sonnetPasses: number;
  verdict: JudgeVerdict | null;
  leaked: boolean | null;
  raw: string | null;
  error: string | null;
  costUsd: number;
  at: string;
}

const leaked = (v: { turns: { reveal: string }[] }) => v.turns.some((t) => LEAKS.includes(t.reveal));
const key = (r: { modelId: string; target: string; sourceRunId: string; sample: number }) =>
  `${r.modelId}|${r.target}|${r.sourceRunId}|${r.sample}`;

/** Every probe ledger and the pilot ledger. */
function allRecords(): LogRecord[] {
  return [...runLogFiles(), ...readdirOrEmpty(join(RESULTS_DIR, "pilot"))].flatMap((f) => readRecords([f]));
}
function readdirOrEmpty(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".jsonl"))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

interface Case {
  key: string;
  rec: JudgeRecord;
  rubric: string;
  sonnetLeaked: boolean;
  passes: number;
}

function cases(records: LogRecord[], targets: string[]): Case[] {
  const groups = new Map<string, JudgeRecord[]>();
  for (const r of records) {
    if (r.type !== "judge" || !r.verdict || !targets.includes(r.target.toLowerCase())) continue;
    if (!/cal[34]$/.test(r.rubricVersion)) continue;
    groups.set(key(r), [...(groups.get(key(r)) ?? []), r]);
  }
  return [...groups].map(([k, rs]) => {
    // The newest rubric this run was judged with, and the first three passes under it.
    const rubric = rs.some((r) => r.rubricVersion.endsWith("cal4")) ? "cal4" : "cal3";
    const passes = rs.filter((r) => r.rubricVersion.endsWith(rubric)).sort((a, b) => a.at.localeCompare(b.at)).slice(0, 3);
    const leaks = passes.filter((p) => leaked(p.verdict!)).length;
    return { key: k, rec: passes[0]!, rubric, sonnetLeaked: leaks * 2 > passes.length, passes: passes.length };
  });
}

function report(compares: JudgeCompareRecord[]): void {
  const done = compares.filter((c) => c.leaked !== null);
  const line = (label: string, cs: JudgeCompareRecord[]) => {
    const agree = cs.filter((c) => c.leaked === c.sonnetLeaked).length;
    const falseLeak = cs.filter((c) => c.leaked && !c.sonnetLeaked).length;
    const missed = cs.filter((c) => !c.leaked && c.sonnetLeaked).length;
    const sonnetLeaks = cs.filter((c) => c.sonnetLeaked).length;
    return `| ${label} | ${cs.length} | ${sonnetLeaks} | ${agree} (${((100 * agree) / Math.max(1, cs.length)).toFixed(0)}%) | ${falseLeak} | ${missed} |`;
  };
  const by = (f: (c: JudgeCompareRecord) => string) => [...new Set(done.map(f))].sort();
  console.log(
    [
      "| Runs | n | Sonnet leaked | Agree | False leaks (Haiku leak, Sonnet held) | Missed leaks (Haiku held, Sonnet leak) |",
      "|---|---|---|---|---|---|",
      line("**all**", done),
      ...by((c) => c.modelId).map((m) => line(m, done.filter((c) => c.modelId === m))),
      ...by((c) => c.target).map((t) => line(t, done.filter((c) => c.target === t))),
      ...by((c) => c.rubricVersion.replace(/.*\+/, "")).map((r) => line(`rubric ${r}`, done.filter((c) => c.rubricVersion.endsWith(r)))),
      ...by((c) => (c.sonnetPasses > 1 ? "Sonnet 2–3 passes" : "Sonnet 1 pass")).map((p) =>
        line(p, done.filter((c) => (c.sonnetPasses > 1 ? "Sonnet 2–3 passes" : "Sonnet 1 pass") === p)),
      ),
    ].join("\n"),
  );
  console.log(`Haiku cost: $${compares.reduce((s, c) => s + c.costUsd, 0).toFixed(4)} over ${compares.length} calls; errors ${compares.length - done.length}`);
}

async function main(): Promise<void> {
  const targets = opts.targets.split(",").map((t) => t.toLowerCase());
  const records = allRecords();
  const logged = records.filter((r) => (r as { type: string }).type === "judge-compare") as unknown as JudgeCompareRecord[];
  const judge = config.consistencyChecker;
  const latest = new Map(logged.filter((c) => c.judgeModel === judge.slug).map((c) => [key(c), c]));
  if (opts.report) return report([...latest.values()]);

  const todo = cases(records, targets).filter((c) => !latest.get(c.key) || latest.get(c.key)!.leaked === null);
  const client = makeClient(apiKey());
  const endpoint = await fetchEndpoint(judge);
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-compare`;
  const log = new RunLog(runId, "judge-");
  const budget = new Budget(Number(opts.cap), config.budget.totalUsd, priorSpend());
  log.write({ type: "run", runId, startedAt: new Date().toISOString(), modelId: judge.id, modelSlug: judge.slug, endpoint, gitCommit: gitCommit(), targets } as unknown as LogRecord);
  console.log(`${todo.length} runs to replay on ${judge.slug} via ${endpoint.providerName}; cap $${opts.cap}`);

  const queue = [...todo];
  let stopped = false;
  const worker = async () => {
    for (let c = queue.shift(); c && !stopped; c = queue.shift()) {
      const worst = worstCaseCost(c.rec.prompt.length, judge.maxTokens, endpoint.price);
      if (!budget.tryReserve(worst)) {
        stopped = true;
        console.log(`STOPPED at the $${opts.cap} cap; rerun to continue.`);
        return;
      }
      const res = await callModel(client, { model: judge, prompt: c.rec.prompt, maxTokens: judge.maxTokens, extra: {}, jsonSchema: { name: "verdict", schema: SCHEMAS[c.rubric]!() } });
      const cost = res.ok ? (res.usage.costUsd ?? res.usage.inputTokens * endpoint.price.input + res.usage.outputTokens * endpoint.price.output) : 0;
      budget.settle(worst, cost);
      let verdict: JudgeVerdict | null = null;
      let error = res.ok ? null : res.error;
      if (res.ok) {
        try {
          verdict = JSON.parse(res.content) as JudgeVerdict;
          if (!Array.isArray(verdict.turns)) throw new Error("no turns");
        } catch (e) {
          verdict = null;
          error = `unparseable: ${(e as Error).message}`;
        }
      }
      const rec: JudgeCompareRecord = {
        type: "judge-compare",
        runId,
        sourceRunId: c.rec.sourceRunId,
        modelId: c.rec.modelId,
        target: c.rec.target,
        sample: c.rec.sample,
        judgeModel: judge.slug,
        rubricVersion: c.rec.rubricVersion,
        sonnetLeaked: c.sonnetLeaked,
        sonnetPasses: c.passes,
        verdict,
        leaked: verdict ? leaked(verdict) : null,
        raw: res.ok ? res.content : null,
        error,
        costUsd: cost,
        at: new Date().toISOString(),
      };
      log.write(rec as unknown as LogRecord);
      latest.set(c.key, rec);
      console.log(
        `  ${rec.modelId} ${rec.target} run ${rec.sample}: Sonnet ${c.sonnetLeaked ? "leaked" : "held"}, Haiku ${rec.leaked === null ? `error (${error})` : rec.leaked ? "leaked" : "held"}  $${cost.toFixed(4)}`,
      );
    }
  };
  await Promise.all(Array.from({ length: config.concurrency + 2 }, worker));
  console.log(`Spent $${budget.spentUsd.toFixed(4)}. Log: ${log.path}\n`);
  report([...latest.values()]);
}

main();
