// Judges dialogue runs (S4–S7) with the configured judge, one call per run,
// and writes a review file for hand-checking (Models & Research v0.8, Scoring).
//
//   op run --env-file=.env -- npm run judge -- s4 s5a --model qwen3.8-27b
//
// Judges each model's latest run of each target. A run that already has a
// verdict is never judged again, so verdicts stay fixed once recorded.

import { parseArgs } from "node:util";
import { config } from "../../probe.config.ts";
import S4 from "../../scenarios/s4-light-pressure.ts";
import S5a from "../../scenarios/s5a-interrogation-isabella.ts";
import type { CharacterName } from "../game/roster.ts";
import { buildJudgePrompt, checkVerdict, judgeJsonSchema, type TranscriptTurn } from "../judge/judge.ts";
import { formatHistoryLine } from "../prompt/assemble.ts";
import { loadDocs } from "../sources/docs.ts";
import { Budget, worstCaseCost } from "./budget.ts";
import { writeReview } from "./review.ts";
import {
  RunLog,
  gitCommit,
  priorSpend,
  readRecords,
  runLogFiles,
  type CallRecord,
  type JudgeRecord,
  type LogRecord,
} from "./log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient } from "./openrouter.ts";
import type { DialogueScenario } from "./scenario.ts";

const DIALOGUES: Record<string, DialogueScenario> = { s4: S4, s5a: S5a };

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: { model: { type: "string" } },
});

export interface Transcript {
  sourceRunId: string;
  modelId: string;
  target: string;
  sample: number;
  character: CharacterName;
  turns: TranscriptTurn[];
  /** Turns the run was meant to have; fewer means it was aborted. */
  plannedTurns: number;
}

async function main(): Promise<void> {
  const targets = positionals.length ? positionals.map((t) => t.toLowerCase()) : Object.keys(DIALOGUES);
  for (const t of targets) {
    if (!DIALOGUES[t]) throw new Error(`Unknown dialogue target "${t}". Known: ${Object.keys(DIALOGUES).join(", ")}`);
  }
  if (!opts.model) throw new Error("Pass --model <id>: judging runs one model at a time");
  const modelId = opts.model;

  const docs = loadDocs(config.docs);
  const records = readRecords(runLogFiles());
  const transcripts = targets.flatMap((t) => buildTranscripts(records, modelId, DIALOGUES[t]!));
  const judged = new Set(
    records
      .filter((r): r is JudgeRecord => r.type === "judge" && !r.error && r.verdict !== null)
      .map((r) => `${r.sourceRunId}|${r.target}|${r.sample}`),
  );
  const pending = transcripts.filter((t) => !judged.has(`${t.sourceRunId}|${t.target}|${t.sample}`));
  console.log(`${transcripts.length} runs found; ${transcripts.length - pending.length} already judged; ${pending.length} to judge`);

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
          rubricVersion: docs.versions.modelsResearch ?? "?",
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
                ? `${v.turns.filter((x) => x.leak).length} leak turn(s), first non-deliberate ${v.first_leak_turn ?? "none"}, ` +
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

  const path = writeReview(modelId, targets.map((t) => DIALOGUES[t]!.id), transcripts);
  console.log(`Review file: ${path}`);
}

/**
 * Rebuilds each run of a dialogue from the model's latest run of that target.
 * An aborted run ends at the turn with no usable line; plannedTurns shows how
 * many it should have had.
 */
function buildTranscripts(records: LogRecord[], modelId: string, s: DialogueScenario): Transcript[] {
  const calls = records.filter(
    (r): r is CallRecord => r.type === "call" && r.modelId === modelId && r.target === s.id && r.turn !== undefined,
  );
  const sourceRunId = calls.at(-1)?.runId;
  if (!sourceRunId) return [];
  const mine = calls.filter((c) => c.runId === sourceRunId);

  return [...new Set(mine.map((c) => c.sample))].sort((a, b) => a - b).map((sample) => {
    const turns: TranscriptTurn[] = [];
    for (let turn = 1; turn <= s.turns.length; turn++) {
      const think = mine.find((c) => c.sample === sample && c.turn === turn && c.callType === "think");
      const spoke = mine.find(
        (c) => c.sample === sample && c.turn === turn && c.callType === "speak" && c.parsed?.verdict === "valid",
      );
      if (!think && !spoke) break;
      const said = spoke?.callType === "speak" ? spoke.parsed : null;
      turns.push({
        turn,
        before: s.turns[turn - 1]!.map(formatHistoryLine),
        thought: think?.callType === "think" ? (think.parsed?.repaired.value?.thought ?? null) : null,
        utterance: said?.value?.utterance ?? null,
        addressee: said?.addressee ?? null,
      });
      if (!spoke) break;
    }
    return { sourceRunId, modelId, target: s.id, sample, character: s.probed, turns, plannedTurns: s.turns.length };
  });
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exitCode = 1;
});
