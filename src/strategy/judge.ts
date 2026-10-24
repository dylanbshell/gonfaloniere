// Judges strategy probes S8–S10 (Models & Research v0.20) from the latest
// "strategy" run of each model, then prints the report.
//
//   npm run strategy:judge -- --a deepseek-v4.1-flash --b qwen3.8-27b --ref gpt-5.4
//   npm run strategy:judge -- --a deepseek-v4.1-flash --b qwen3.8-27b --ref gpt-5.4 --report   (no calls)
//
// S8: the judge grades each answer against the item's key (correct or not).
// S9a, S9b, S10: the judge sees model A's and model B's answers to the same
// moment and picks the stronger by a written rubric, twice with the order
// swapped. Every answer is also checked for real-history leakage (events
// after 1492, or "corrections" of the briefing). Hand checks are separate.

import { parseArgs } from "node:util";
import { z } from "zod";
import { config, technicalDesignPath, type ModelConfig } from "../../probe.config.ts";
import { Budget, worstCaseCost } from "../harness/budget.ts";
import { RunLog, gitCommit, priorSpend, readRecords, runLogFiles, type LogRecord } from "../harness/log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient } from "../harness/openrouter.ts";
import { loadDocs } from "../sources/docs.ts";
import type { CharacterName } from "../game/roster.ts";
import { S8_ITEMS, STRATEGY_ITEMS, type StrategyItem } from "./items.ts";
import type { StrategyRecord } from "./run.ts";

const { values: opts } = parseArgs({
  options: {
    a: { type: "string" },
    b: { type: "string" },
    ref: { type: "string" },
    report: { type: "boolean", default: false },
    concurrency: { type: "string", default: "2" },
  },
});

const Grades = z.strictObject({
  answers: z.array(z.strictObject({ i: z.int(), reason: z.string(), correct: z.boolean(), history_leak: z.string().nullable() })),
});
const Comparison = z.strictObject({
  reason: z.string(),
  winner: z.enum(["A", "B", "tie"]),
  history_leak_A: z.string().nullable(),
  history_leak_B: z.string().nullable(),
});
const schemaOf = (s: z.ZodType) => (({ $schema: _, ...rest }) => rest)(z.toJSONSchema(s) as Record<string, unknown>);

interface StrategyJudgeRecord {
  type: "strategy-judge";
  runId: string;
  kind: "grade" | "compare";
  item: string;
  model?: string;
  /** compare: which model was shown first, and the sample compared. */
  first?: string;
  second?: string;
  sample?: number;
  result: unknown;
  costUsd: number;
  at: string;
}

const HISTORY = `Real-history leakage: flag (in a few words) any mention of real events after this evening in 1492 (e.g. Piero de' Medici's exile, Savonarola's rise or execution, the French invasion of 1494), or any "correction" of the briefing from real history; otherwise null.`;

/** What a model answered, as the judge reads it. */
function answerText(recs: StrategyRecord[]): string {
  return recs
    .map((r) => {
      const v = r.value as Record<string, unknown> | null;
      if (!v) return `(${r.call}: no usable answer — ${r.verdict})`;
      const legality = r.illegal.length ? `\n  [code: illegal — ${r.illegal.join("; ")}]` : "";
      if (r.call === "plan") return `thought: ${v.thought}\n  plan: ${v.plan}${legality}`;
      if (r.call === "murder") return `thought: ${v.thought}\n  acts: ${JSON.stringify(v.acts)}${legality}`;
      if (r.call === "ballot") return `thought: ${v.thought}\n  vote: ${v.vote}; extra votes bought: ${v.buy}${legality}`;
      if (r.call === "runoff") return `thought: ${v.thought}\n  vote: ${v.vote}${legality}`;
      if (r.call === "think") return `private thought: ${v.thought}`;
      return `says: ${JSON.stringify(v.utterance)}${v.action ? ` (action ${JSON.stringify(v.action)})` : ""}`;
    })
    .join("\n  ");
}

/** The moment, as the model saw it: the end of its prompt (state, conversation, task). */
function momentText(r: StrategyRecord): string {
  const at = r.prompt.indexOf("NOW\n");
  return r.prompt.slice(at >= 0 ? at : 0);
}

async function main(): Promise<void> {
  const docs = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath(process.env.PROBE_TD ?? "0.5") });
  const all = readRecords(runLogFiles());
  const strat = (all as unknown as StrategyRecord[]).filter((r) => r.type === "strategy");
  /** The model's latest strategy run that covers the item. */
  const latest = (model: string, item: string): StrategyRecord[] => {
    const rs = strat.filter((r) => r.modelId === model && r.item === item);
    const run = rs.map((r) => r.runId).sort().at(-1);
    return rs.filter((r) => r.runId === run);
  };
  const judged = (all as unknown as StrategyJudgeRecord[]).filter((r) => r.type === "strategy-judge");
  const models = [opts.a, opts.b, opts.ref].filter(Boolean) as string[];

  if (!opts.report) {
    const judge = config.judge;
    const client = makeClient(apiKey());
    const endpoint = await fetchEndpoint(judge as ModelConfig);
    const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-strategy-judge`;
    const log = new RunLog(runId, "judge-");
    const budget = new Budget(config.judge.runUsd, config.budget.totalUsd, priorSpend());
    log.write({ type: "run", runId, startedAt: new Date().toISOString(), modelId: judge.id, gitCommit: gitCommit(), targets: models } as unknown as LogRecord);
    console.log(`Judge: ${judge.slug}; $${budget.priorSpendUsd.toFixed(2)} spent before this`);
    let stopped = false;
    const ask = async <T,>(prompt: string, name: string, schema: z.ZodType<T>): Promise<{ value: T; cost: number } | null> => {
      const worst = worstCaseCost(prompt.length, judge.maxTokens, endpoint.price);
      if (stopped || !budget.tryReserve(worst)) {
        if (!stopped) console.log("STOPPED: the next judge call could exceed the cap.");
        stopped = true;
        return null;
      }
      const res = await callModel(client, { model: judge as ModelConfig, prompt, maxTokens: judge.maxTokens, extra: {}, jsonSchema: { name, schema: schemaOf(schema) } });
      const cost = res.ok ? (res.usage.costUsd ?? 0) : 0;
      budget.settle(worst, cost);
      if (!res.ok) {
        console.log(`  judge error: ${res.error}`);
        return null;
      }
      const parsed = schema.safeParse(JSON.parse(res.content));
      return parsed.success ? { value: parsed.data, cost } : null;
    };
    const write = (r: Omit<StrategyJudgeRecord, "type" | "runId" | "at">) => log.write({ type: "strategy-judge", runId, ...r, at: new Date().toISOString() } as unknown as LogRecord);

    const jobs: (() => Promise<void>)[] = [];
    // S8: grade each model's answers to each item against the key.
    for (const item of S8_ITEMS) {
      for (const model of models) {
        if (judged.some((j) => j.kind === "grade" && j.item === item.id && j.model === model)) continue;
        const rs = latest(model, item.id);
        if (!rs.length) continue;
        jobs.push(async () => {
          const sit = item.situations[0]!;
          const prompt = `You are grading answers from a test of AI characters in a game of political intrigue set in Florence, 1492. Each answer is ${sit.character}'s response to the same moment. Grade each against the answer key: correct if it does what the key describes, wrong otherwise. Judge the reasoning and choices, not the style.

${sit.character.toUpperCase()}'S BRIEFING
${docs.briefings[sit.character as CharacterName]}

THE MOMENT (state, conversation, and task, as the character saw them)
${momentText(rs[0]!)}

ANSWER KEY
${item.key}

${HISTORY}

ANSWERS
${rs.map((r, i) => `ANSWER ${i}:\n  ${answerText([r])}`).join("\n\n")}

For each answer, write the reason first, then the labels. Reply with JSON only, matching the required schema.`;
          const got = await ask(prompt, "grades", Grades);
          if (!got) return;
          write({ kind: "grade", item: item.id, model, result: { samples: rs.map((r) => r.sample), ...got.value }, costUsd: got.cost });
          console.log(`  graded ${item.id} ${model}: ${got.value.answers.filter((a) => a.correct).length}/${rs.length}`);
        });
      }
    }
    // S9a, S9b, S10: A against B on the same moment, both orders.
    if (opts.a && opts.b) {
      for (const item of STRATEGY_ITEMS.filter((i) => i.probe !== "S8")) {
        const ra = latest(opts.a, item.id);
        const rb = latest(opts.b, item.id);
        for (let n = 0; n < item.samples; n++) {
          const a = ra.filter((r) => r.sample === n);
          const b = rb.filter((r) => r.sample === n);
          if (!a.length || !b.length) continue;
          for (const [first, second, x, y] of [
            [opts.a, opts.b, a, b],
            [opts.b, opts.a, b, a],
          ] as const) {
            if (judged.some((j) => j.kind === "compare" && j.item === item.id && j.sample === n && j.first === first)) continue;
            jobs.push(async () => {
              const prompt = comparePrompt(item, a[0]!, docs.briefings[a[0]!.character as CharacterName]!, answerText([...x]), answerText([...y]));
              const got = await ask(prompt, "comparison", Comparison);
              if (!got) return;
              write({ kind: "compare", item: item.id, first, second, sample: n, result: got.value, costUsd: got.cost });
              console.log(`  ${item.id} #${n} ${first} vs ${second}: ${got.value.winner}`);
            });
          }
        }
      }
    }
    await Promise.all(
      Array.from({ length: Number(opts.concurrency) }, async () => {
        for (let j = jobs.shift(); j && !stopped; j = jobs.shift()) await j();
      }),
    );
    console.log(`Judging spent $${budget.spentUsd.toFixed(4)}. Log: ${log.path}\n`);
  }

  report(models, latest, readRecords(runLogFiles()) as unknown as StrategyJudgeRecord[]);
}

function comparePrompt(item: StrategyItem, r: StrategyRecord, briefing: string, first: string, second: string): string {
  const what =
    item.probe === "S9a"
      ? "a private plan written after a faction meeting"
      : item.probe === "S9b"
        ? "a private thought and a spoken reply to a bribe offered for the character's vote"
        : "a secret Murder Round choice and the thought behind it";
  return `You are comparing two answers from a test of AI characters in a game of political intrigue set in Florence, 1492. Both are ${r.character}'s ${what}, in the same moment. Decide which is the stronger play.

Rubric, in order: (1) serves the character's faction's win condition (see the rules in the briefing's faction goal and the evening's win order: repentance, then French pensions, then the elected family); (2) notices the real threats and opportunities in the moment; (3) uses the character's secrets and resources well; (4) stays legal (code-detected illegal moves are marked) and in character. Length and polish don't count. Choose "tie" only if they are genuinely equal.

${r.character.toUpperCase()}'S BRIEFING
${briefing}

THE MOMENT (state, conversation, and task, as the character saw them)
${momentText(r)}

${HISTORY.replace("flag", "for each answer, flag")}

ANSWER A
  ${first}

ANSWER B
  ${second}

Write the reason first. Reply with JSON only, matching the required schema.`;
}

function report(models: string[], latest: (m: string, i: string) => StrategyRecord[], all: StrategyJudgeRecord[]): void {
  const js = all.filter((r) => r.type === "strategy-judge");
  const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : "–");
  console.log("## S8 — rules reasoning (percent correct)\n");
  console.log(`| Item | ${models.join(" | ")} |\n|---|${models.map(() => "---|").join("")}`);
  const totals = new Map<string, [number, number]>();
  for (const item of S8_ITEMS) {
    const cells = models.map((m) => {
      const g = js.filter((j) => j.kind === "grade" && j.item === item.id && j.model === m).at(-1);
      if (!g) return "–";
      const answers = (g.result as { answers: { correct: boolean }[] }).answers;
      const ok = answers.filter((a) => a.correct).length;
      const t = totals.get(m) ?? [0, 0];
      totals.set(m, [t[0] + ok, t[1] + answers.length]);
      return `${pct(ok, answers.length)} (${ok}/${answers.length})`;
    });
    console.log(`| ${item.id} | ${cells.join(" | ")} |`);
  }
  console.log(`| **overall** | ${models.map((m) => pct(...(totals.get(m) ?? [0, 0]))).join(" | ")} |\n`);

  const [a, b] = models;
  if (a && b) {
    console.log(`## S9–S10 — ${a} vs ${b} (win rate of ${a}; ties count half)\n`);
    for (const item of STRATEGY_ITEMS.filter((i) => i.probe !== "S8")) {
      const cs = js.filter((j) => j.kind === "compare" && j.item === item.id);
      if (!cs.length) continue;
      let wins = 0;
      for (const c of cs) {
        const w = (c.result as { winner: string }).winner;
        if (w === "tie") wins += 0.5;
        else if ((w === "A" ? c.first : c.second) === a) wins += 1;
      }
      // Order consistency: both orders of a sample picked the same model.
      const bySample = new Map<number, string[]>();
      for (const c of cs) {
        const w = (c.result as { winner: string }).winner;
        bySample.set(c.sample!, [...(bySample.get(c.sample!) ?? []), w === "tie" ? "tie" : (w === "A" ? c.first : c.second)!]);
      }
      const consistent = [...bySample.values()].filter((v) => v.length === 2 && v[0] === v[1]).length;
      console.log(`- ${item.id}: ${a} ${pct(wins, cs.length)} of ${cs.length} judgments; both orders agree on ${consistent}/${bySample.size} samples`);
    }
    console.log("");
  }

  console.log("## Format and legality\n");
  for (const m of models) {
    for (const item of STRATEGY_ITEMS) {
      const rs = latest(m, item.id);
      if (!rs.length) continue;
      const byCall = new Map<string, StrategyRecord[]>();
      for (const r of rs) byCall.set(r.call, [...(byCall.get(r.call) ?? []), r]);
      for (const [call, cs] of byCall) {
        const valid = cs.filter((r) => r.verdict === "valid").length;
        const fenced = cs.filter((r) => r.fenced).length;
        const repaired = cs.filter((r) => r.repairs.length).length;
        const illegal = cs.filter((r) => r.illegal.length);
        console.log(
          `- ${m} ${item.id} ${call}: valid ${valid}/${cs.length}, fenced ${fenced}, repaired ${repaired}` +
            (illegal.length ? `, illegal ${illegal.length}: ${[...new Set(illegal.flatMap((r) => r.illegal))].join("; ")}` : ""),
        );
      }
    }
  }
  const leaks = js.flatMap((j) => {
    const r = j.result as { answers?: { history_leak: string | null }[]; history_leak_A?: string | null; history_leak_B?: string | null };
    return [...(r.answers ?? []).map((x) => x.history_leak), r.history_leak_A ?? null, r.history_leak_B ?? null].filter(Boolean).map((l) => `${j.item}: ${l}`);
  });
  console.log(`\n## Real-history leakage flags: ${leaks.length}`);
  for (const l of [...new Set(leaks)]) console.log(`- ${l}`);
}

main();
