// Judges dialogue runs (S4–S7) with the configured judge, one call per run,
// and writes a review file for hand-checking (Models & Research v0.8, Scoring).
//
//   op run --env-file=.env -- npm run judge -- s4 s5a --model qwen3.8-27b
//
// Judges each model's latest run of each target. A run that already has a
// verdict under the current rubric version is never judged again, so verdicts
// stay fixed once recorded; a new rubric version judges runs afresh and keeps
// the old verdicts in the logs.

import { parseArgs } from "node:util";
import { config } from "../../probe.config.ts";
import { buildJudgePrompt, checkVerdict, isLeak, judgeJsonSchema } from "../judge/judge.ts";
import { formatHistoryLine } from "../prompt/assemble.ts";
import { loadDocs } from "../sources/docs.ts";
import { Budget, worstCaseCost } from "./budget.ts";
import { writeReview } from "./review.ts";
import { RunLog, gitCommit, priorSpend, readRecords, runLogFiles, type JudgeRecord } from "./log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient } from "./openrouter.ts";
import { DIALOGUES, buildTranscripts, currentRubricVersion } from "./transcripts.ts";

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: { model: { type: "string" } },
});

async function main(): Promise<void> {
  const targets = positionals.length ? positionals.map((t) => t.toLowerCase()) : Object.keys(DIALOGUES);
  for (const t of targets) {
    if (!DIALOGUES[t]) throw new Error(`Unknown dialogue target "${t}". Known: ${Object.keys(DIALOGUES).join(", ")}`);
  }
  if (!opts.model) throw new Error("Pass --model <id>: judging runs one model at a time");
  const modelId = opts.model;

  const docs = loadDocs(config.docs);
  const rubricVersion = currentRubricVersion(docs.versions.modelsResearch);
  const records = readRecords(runLogFiles());
  const transcripts = targets.flatMap((t) => buildTranscripts(records, modelId, DIALOGUES[t]!));
  const judged = new Set(
    records
      .filter(
        (r): r is JudgeRecord =>
          r.type === "judge" && !r.error && r.verdict !== null && r.rubricVersion === rubricVersion,
      )
      .map((r) => `${r.sourceRunId}|${r.target}|${r.sample}`),
  );
  const pending = transcripts.filter((t) => !judged.has(`${t.sourceRunId}|${t.target}|${t.sample}`));
  console.log(
    `${transcripts.length} runs found; ${transcripts.length - pending.length} already judged under rubric ${rubricVersion}; ${pending.length} to judge`,
  );

  if (pending.length) {
    const judge = config.judge;
    const client = makeClient(apiKey());
    const endpoint = await fetchEndpoint(judge);
    const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${modelId}`;
    const log = new RunLog(runId, "judge-");
    const budget = new Budget(config.budget.runUsd, config.budget.totalUsd, priorSpend());
    log.write({
      type: "run",
      runId,
      startedAt: new Date().toISOString(),
      modelId: judge.id,
      modelSlug: judge.slug,
      endpoint,
      docVersions: docs.versions,
      gitCommit: gitCommit(),
      targets,
      settings: { judged: modelId, maxTokens: judge.maxTokens, sampling: "model default", thinking: "model default" },
    });
    console.log(`Judge: ${judge.slug} via ${endpoint.providerName}; budget $${budget.priorSpendUsd.toFixed(4)} spent before this`);

    const schema = judgeJsonSchema();
    let stopped = false;
    let next = 0;
    const worker = async (): Promise<void> => {
      while (!stopped && next < pending.length) {
        const t = pending[next++]!;
        const scenario = DIALOGUES[t.target.toLowerCase()]!;
        const prompt = buildJudgePrompt({
          character: t.character,
          briefing: docs.briefings[t.character]!,
          rubric: docs.judgeRubric,
          present: scenario.conversation.present,
          opening: scenario.opening.map(formatHistoryLine),
          turns: t.turns,
        });
        const worst = worstCaseCost(prompt.length, judge.maxTokens, endpoint.price);
        if (!budget.tryReserve(worst)) {
          stopped = true;
          break;
        }
        const res = await callModel(client, {
          model: judge,
          prompt,
          maxTokens: judge.maxTokens,
          extra: {},
          jsonSchema: { name: "secret_keeping_verdict", schema },
        });
        const cost = res.ok
          ? (res.usage.costUsd ?? res.usage.inputTokens * endpoint.price.input + res.usage.outputTokens * endpoint.price.output)
          : 0;
        budget.settle(worst, cost);
        const checked = res.ok ? checkVerdict(res.content, t.turns) : null;
        const record: JudgeRecord = {
          type: "judge",
          runId,
          sourceRunId: t.sourceRunId,
          modelId: t.modelId,
          target: t.target,
          sample: t.sample,
          character: t.character,
          judgeModel: judge.slug,
          judgeProvider: judge.provider,
          rubricVersion,
          prompt,
          raw: res.ok ? res.content : null,
          reasoning: res.ok ? res.reasoning : null,
          verdict: checked && !checked.errors.length ? checked.verdict : null,
          parseErrors: checked ? [...checked.errors, ...checked.warnings] : [],
          usage: res.ok ? res.usage : null,
          costUsd: cost,
          latencyMs: res.latencyMs,
          provider: res.ok ? res.provider : null,
          generationId: res.ok ? res.generationId : null,
          error: res.ok ? null : { message: res.error, status: res.status },
          at: new Date().toISOString(),
        };
        log.write(record);
        const v = record.verdict;
        console.log(
          `  ${t.target} run ${t.sample}: ` +
            (record.error
              ? `ERROR ${record.error.message}`
              : v
                ? `leaks ${v.turns.filter((x) => isLeak(x.reveal)).length} ` +
                  `(capitulated ${v.turns.filter((x) => x.reveal === "capitulated").length}), ` +
                  `deliberate ${v.turns.filter((x) => x.reveal === "deliberate").length}, first leak ${v.first_leak_turn ?? "none"}, ` +
                  `${v.contradictions.length} contradiction(s)`
                : `UNUSABLE: ${record.parseErrors.join("; ")}`) +
            `  ${(res.latencyMs / 1000).toFixed(1)}s $${cost.toFixed(4)}` +
            (checked?.warnings.length ? `  [check: ${checked.warnings.join("; ")}]` : ""),
        );
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
    if (stopped) console.log("STOPPED: the next judge call could exceed the budget cap.");
    console.log(`Judging spent $${budget.spentUsd.toFixed(4)}. Log: ${log.path}`);
  }

  const path = writeReview(modelId, targets.map((t) => DIALOGUES[t]!.id), transcripts, rubricVersion);
  console.log(`Review file: ${path}`);
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exitCode = 1;
});
