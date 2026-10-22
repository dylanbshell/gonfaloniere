// Judges probe runs with the configured judge and writes review files for
// hand-checking (Models & Research v0.8, Scoring).
//
//   op run --env-file=.env -- npm run judge -- s4 s5a s5b s5c s6 s7 --model qwen3.8-27b
//   op run --env-file=.env -- npm run judge -- s5a --model qwen3.8-27b --classify-contradictions
//   op run --env-file=.env -- npm run judge -- s5a s5b --model qwen3.8-27b --passes 3
//   npm run judge -- s5a --model deepseek-v4.1-flash --review-disagreements   (no calls)
//   op run --env-file=.env -- npm run judge -- s5a s5b --model X --passes 3 --only-leaked
//   op run --env-file=.env -- npm run judge -- s5a --model X --passes 3 --only-samples 10
//
// Dialogue targets (S4–S6): one call per run, judging secrets turn by turn.
// S7 targets: one call per version, judging whether each thought references
// the withdrawals (gate 5). --classify-contradictions: one call per target,
// giving a kind to contradictions judged before verdicts carried one.
//
// Judges each model's latest run of each target. Anything already judged
// under the current rubric version is never judged again, so verdicts stay
// fixed once recorded; a new rubric version judges afresh and keeps the old
// verdicts in the logs. --passes N judges each dialogue run until it has N
// verdicts under the current rubric (for majority-of-three judging).

import { parseArgs } from "node:util";
import { config } from "../../probe.config.ts";
import { buildContradictionPrompt, contradictionKindsJsonSchema, ContradictionKinds } from "../judge/contradictions.ts";
import { buildInferencePrompt, checkInference, inferenceJsonSchema } from "../judge/inference.ts";
import { buildConsistencyPrompt, labelMismatches, reasonConclusionsJsonSchema } from "../judge/consistency.ts";
import { buildJudgePrompt, checkVerdict, isLeak, judgeJsonSchema, premiseProblems, verdictInconsistencies } from "../judge/judge.ts";
import { formatHistoryLine } from "../prompt/assemble.ts";
import { loadDocs, type DocSources } from "../sources/docs.ts";
import { Budget, worstCaseCost } from "./budget.ts";
import {
  RunLog,
  gitCommit,
  priorSpend,
  readRecords,
  runLogFiles,
  type ContradictionKindsRecord,
  type InferenceRecord,
  type JudgeRecord,
  type LogRecord,
  type ThinkCallRecord,
} from "./log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient, type CallResult } from "./openrouter.ts";
import { writeDisagreementReview, writeInferenceReview, writeReview, writeRubricChangeReview } from "./review.ts";
import { DIALOGUES, INFERENCE, TARGET_GROUPS, expandTargets } from "./scenarios.ts";
import {
  allVerdicts,
  buildTranscripts,
  currentRubricVersion,
  latestVerdicts,
  rubricHash,
  sameRubric,
  type Transcript,
} from "./transcripts.ts";

/** The event S7 thoughts are judged against. */
const S7_EVENT =
  "Raffaello de' Medici and Captain Armand LeNoir withdrawing together for private words, as recorded by Il Notaio (twice, the second time remarked on).";

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    model: { type: "string" },
    "classify-contradictions": { type: "boolean", default: false },
    passes: { type: "string", default: "1" },
    "review-disagreements": { type: "boolean", default: false },
    "only-leaked": { type: "boolean", default: false },
    "only-samples": { type: "string" },
    "review-rubric-change": { type: "string" },
  },
});

/** A judge call made under the shared budget; null when the cap stops it. */
type JudgeCaller = (
  prompt: string,
  schemaName: string,
  schema: Record<string, unknown>,
) => Promise<{ res: CallResult; cost: number } | null>;

async function main(): Promise<void> {
  const known = [...Object.keys(DIALOGUES), ...Object.keys(INFERENCE)];
  const targets = positionals.length ? expandTargets(positionals.map((t) => t.toLowerCase())) : known;
  for (const t of targets) {
    if (!known.includes(t)) {
      throw new Error(`Unknown judge target "${t}". Known: ${[...known, ...Object.keys(TARGET_GROUPS)].join(", ")}`);
    }
  }
  if (opts["review-rubric-change"]) opts.model ??= "all";
  if (!opts.model) throw new Error("Pass --model <id>: judging runs one model at a time");
  const modelId = opts.model;
  // --review-rubric-change m1,m2,…: changed and flagged runs across models (no calls).
  if (opts["review-rubric-change"]) {
    const models = opts["review-rubric-change"].split(",");
    console.log(`Rubric change review: ${writeRubricChangeReview(models, targets.filter((x) => DIALOGUES[x]).map((x) => DIALOGUES[x]!))}`);
    return;
  }
  if (opts["review-disagreements"]) {
    for (const t of targets.filter((x) => DIALOGUES[x])) {
      console.log(`Disagreement review: ${writeDisagreementReview(modelId, DIALOGUES[t]!)}`);
    }
    return;
  }

  const docs = loadDocs(config.docs);
  const rubricVersion = currentRubricVersion(docs.versions.modelsResearch);
  const hash = rubricHash(docs.judgeRubric);
  const records = readRecords(runLogFiles());

  let session: { call: JudgeCaller; check: JudgeCaller; log: RunLog; runId: string; budget: Budget } | null = null;
  const start = async () => {
    if (session) return session;
    const judge = config.judge;
    const checker = config.consistencyChecker;
    const client = makeClient(apiKey());
    const endpoint = await fetchEndpoint(judge);
    const checkerEndpoint = await fetchEndpoint(checker);
    const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${modelId}`;
    const log = new RunLog(runId, "judge-");
    const budget = new Budget(config.judge.runUsd, config.budget.totalUsd, priorSpend());
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
      settings: { judged: modelId, rubricVersion, maxTokens: judge.maxTokens, sampling: "model default", thinking: "model default" },
    });
    console.log(`Judge: ${judge.slug} via ${endpoint.providerName}; $${budget.priorSpendUsd.toFixed(4)} spent before this`);
    let stopped = false;
    const caller = (model: { slug: string; provider: string; id: string; maxTokens: number }, ep: typeof endpoint): JudgeCaller => async (prompt, schemaName, schema) => {
      const worst = worstCaseCost(prompt.length, model.maxTokens, ep.price);
      if (stopped || !budget.tryReserve(worst)) {
        if (!stopped) {
          console.log(
            `STOPPED: the next judge call could exceed $${config.judge.runUsd} this invocation or $${config.budget.totalUsd} total. Rerun to judge the rest.`,
          );
        }
        stopped = true;
        return null;
      }
      const res = await callModel(client, { model, prompt, maxTokens: model.maxTokens, extra: {}, jsonSchema: { name: schemaName, schema } });
      const cost = res.ok
        ? (res.usage.costUsd ?? res.usage.inputTokens * ep.price.input + res.usage.outputTokens * ep.price.output)
        : 0;
      budget.settle(worst, cost);
      return { res, cost };
    };
    session = { call: caller(judge, endpoint), check: caller(checker, checkerEndpoint), log, runId, budget };
    return session;
  };

  const dialogueTargets = targets.filter((t) => DIALOGUES[t]);
  const inferenceTargets = targets.filter((t) => INFERENCE[t]);

  if (opts["classify-contradictions"]) {
    for (const t of dialogueTargets) await classifyContradictions(records, modelId, t, start);
  } else {
    if (dialogueTargets.length) await judgeDialogues(records, modelId, dialogueTargets, docs, rubricVersion, hash, start);
    for (const t of inferenceTargets) await judgeInference(records, modelId, t, rubricVersion, hash, start);
  }

  if (session) {
    const s = session as { log: RunLog; budget: Budget };
    console.log(`Judging spent $${s.budget.spentUsd.toFixed(4)}. Log: ${s.log.path}`);
  }
  if (opts["classify-contradictions"]) return;
  const fresh = readRecords(runLogFiles());
  if (dialogueTargets.length) {
    const transcripts = dialogueTargets.flatMap((t) => buildTranscripts(fresh, modelId, DIALOGUES[t]!));
    console.log(`Review file: ${writeReview(modelId, dialogueTargets.map((t) => DIALOGUES[t]!.id), transcripts, rubricVersion)}`);
  }
  if (inferenceTargets.length) {
    console.log(`Review file: ${writeInferenceReview(modelId, inferenceTargets.map((t) => INFERENCE[t]!.id), rubricVersion)}`);
  }
}

async function judgeDialogues(
  records: LogRecord[],
  modelId: string,
  targets: string[],
  docs: DocSources,
  rubricVersion: string,
  hash: string,
  start: () => Promise<{ call: JudgeCaller; check: JudgeCaller; log: RunLog; runId: string }>,
): Promise<void> {
  let transcripts = targets.flatMap((t) => buildTranscripts(records, modelId, DIALOGUES[t]!));
  if (opts["only-leaked"]) {
    // Re-judge only runs some earlier calibrated pass marked as leaking. A new rule that only
    // removes leak causes can't turn an all-held run into a leak (rubric cal3, Dylan Oct 22).
    const earlier = new Map(targets.map((t) => [DIALOGUES[t]!.id, allVerdicts(records, modelId, DIALOGUES[t]!)]));
    const before = transcripts.length;
    transcripts = transcripts.filter((t) =>
      (earlier.get(t.target)?.get(t.sample) ?? []).some(
        (v) => !sameRubric(v, rubricVersion, hash) && v.verdict.turns.some((x) => isLeak(x.reveal)),
      ),
    );
    console.log(`--only-leaked: ${transcripts.length} of ${before} runs had a leak in an earlier pass`);
  }
  if (opts["only-samples"]) {
    const keep = new Set(opts["only-samples"].split(",").map(Number));
    transcripts = transcripts.filter((t) => keep.has(t.sample));
    console.log(`--only-samples: judging runs ${[...keep].join(", ")}`);
  }
  const passes = Number(opts.passes);
  const have = new Map<string, number>();
  for (const r of records) {
    if (r.type !== "judge" || r.error || r.verdict === null || !sameRubric(r, rubricVersion, hash)) continue;
    const key = `${r.sourceRunId}|${r.target}|${r.sample}`;
    have.set(key, (have.get(key) ?? 0) + 1);
  }
  // One entry per verdict still needed, so a run short two passes appears twice.
  const pending = transcripts.flatMap((t) => {
    const missing = Math.max(0, passes - (have.get(`${t.sourceRunId}|${t.target}|${t.sample}`) ?? 0));
    return Array.from({ length: missing }, () => t);
  });
  console.log(
    `${transcripts.length} dialogue runs found; ${pending.length} verdict(s) to get for ${passes} pass(es) per run under rubric ${rubricVersion}`,
  );
  if (!pending.length) return;
  const { call, check, log, runId } = await start();
  const schema = judgeJsonSchema();

  /**
   * Rubric cal4's checks on a reply: labels against reasons (phrases, plus a
   * second model reading the reasons) and premise quotes against the transcript.
   */
  const problemsIn = async (raw: string, turns: Transcript["turns"]) => {
    const checked = checkVerdict(raw, turns);
    if (!checked.verdict) return { checked, problems: [] as string[], cost: 0 };
    const problems = [...verdictInconsistencies(checked.verdict), ...premiseProblems(checked.verdict, turns)];
    const read = await check(buildConsistencyPrompt(checked.verdict), "reason_conclusions", reasonConclusionsJsonSchema());
    if (read?.res.ok) problems.push(...labelMismatches(checked.verdict, read.res.content).mismatches);
    return { checked, problems: [...new Set(problems)], cost: read?.cost ?? 0 };
  };

  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < pending.length) {
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
      const made = await call(prompt, "secret_keeping_verdict", schema);
      if (!made) return;
      let { res, cost } = made;
      let checked = res.ok ? checkVerdict(res.content, t.turns) : null;

      // Rubric cal3/cal4's check: labels that disagree with their reasons (either way), or premise
      // claims whose quote isn't in an earlier line, get one re-ask with the problems pointed out;
      // if any remain, the run is flagged for hand review.
      let reasked: JudgeRecord["reasked"];
      let flagged: string[] | undefined;
      if (res.ok) {
        const first = await problemsIn(res.content, t.turns);
        cost += first.cost;
        if (first.problems.length) {
          const again = await call(
            `${prompt}\n\nIMPORTANT: a first judgment of this transcript had these problems:\n` +
              `${first.problems.map((f) => `- ${f}`).join("\n")}\n` +
              "Judge the whole transcript again. Make every turn's label agree with its reason, and quote a premise only if those exact words were said by another speaker at or before that turn.",
            "secret_keeping_verdict",
            schema,
          );
          if (again) {
            reasked = { firstRaw: res.content, inconsistencies: first.problems };
            cost += again.cost;
            if (again.res.ok) {
              res = again.res;
              const second = await problemsIn(again.res.content, t.turns);
              cost += second.cost;
              checked = second.checked;
              if (second.problems.length) flagged = second.problems;
            }
          }
        }
      }
      const record: JudgeRecord = {
        type: "judge",
        runId,
        sourceRunId: t.sourceRunId,
        modelId: t.modelId,
        target: t.target,
        sample: t.sample,
        character: t.character,
        judgeModel: config.judge.slug,
        judgeProvider: config.judge.provider,
        rubricVersion,
        rubricHash: hash,
        prompt,
        raw: res.ok ? res.content : null,
        reasoning: res.ok ? res.reasoning : null,
        reasked,
        flagged,
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
      const n = (kind: string) => v?.turns.filter((x) => x.reveal === kind).length ?? 0;
      console.log(
        `  ${t.target} run ${t.sample}: ` +
          (record.error
            ? `ERROR ${record.error.message}`
            : v
              ? `leaks ${v.turns.filter((x) => isLeak(x.reveal)).length} (capitulated ${n("capitulated")}), ` +
                `deliberate ${n("deliberate")}, clues ${n("self_incriminating_clue")}, first leak ${v.first_leak_turn ?? "none"}, ` +
                `${v.contradictions.length} contradiction(s)`
              : `UNUSABLE: ${record.parseErrors.join("; ")}`) +
          (reasked ? (flagged ? "  [re-asked, still inconsistent: FLAGGED]" : "  [re-asked, now consistent]") : "") +
          `  ${(res.latencyMs / 1000).toFixed(1)}s $${cost.toFixed(4)}` +
          (checked?.warnings.length ? `  [check: ${checked.warnings.join("; ")}]` : ""),
      );
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
}

async function judgeInference(
  records: LogRecord[],
  modelId: string,
  target: string,
  rubricVersion: string,
  hash: string,
  start: () => Promise<{ call: JudgeCaller; log: RunLog; runId: string }>,
): Promise<void> {
  const scenario = INFERENCE[target]!;
  const calls = records.filter(
    (r): r is ThinkCallRecord => r.type === "call" && r.callType === "think" && r.modelId === modelId && r.target === scenario.id,
  );
  const sourceRunId = calls.at(-1)?.runId;
  if (!sourceRunId) {
    console.log(`${scenario.id}: no run found for ${modelId}`);
    return;
  }
  const done = records.some(
    (r) => r.type === "inference" && r.sourceRunId === sourceRunId && r.target === scenario.id && sameRubric(r, rubricVersion, hash) && r.verdict,
  );
  if (done) {
    console.log(`${scenario.id}: already judged under rubric ${rubricVersion}`);
    return;
  }
  const thoughts = calls
    .filter((c) => c.runId === sourceRunId && !c.error)
    .flatMap((c) => {
      const thought = c.parsed?.repaired.value?.thought;
      return thought ? [{ sample: c.sample, thought }] : [];
    })
    .sort((a, b) => a.sample - b.sample);
  const prompt = buildInferencePrompt({
    character: scenario.probed[0]!,
    event: S7_EVENT,
    history: scenario.history.map(formatHistoryLine),
    thoughts,
  });
  const { call, log, runId } = await start();
  const made = await call(prompt, "inference_verdict", inferenceJsonSchema());
  if (!made) return;
  const { res, cost } = made;
  const checked = res.ok ? checkInference(res.content, thoughts) : null;
  const record: InferenceRecord = {
    type: "inference",
    runId,
    sourceRunId,
    modelId,
    target: scenario.id,
    character: scenario.probed[0]!,
    judgeModel: config.judge.slug,
    rubricVersion,
    rubricHash: hash,
    prompt,
    raw: res.ok ? res.content : null,
    verdict: checked && !checked.errors.length ? checked.verdict : null,
    parseErrors: checked ? [...checked.errors, ...checked.warnings] : [],
    usage: res.ok ? res.usage : null,
    costUsd: cost,
    latencyMs: res.latencyMs,
    error: res.ok ? null : { message: res.error, status: res.status },
    at: new Date().toISOString(),
  };
  log.write(record);
  const v = record.verdict;
  console.log(
    `  ${scenario.id}: ` +
      (record.error
        ? `ERROR ${record.error.message}`
        : v
          ? `${v.samples.filter((s) => s.references_event).length} of ${v.samples.length} thoughts reference the withdrawals`
          : `UNUSABLE: ${record.parseErrors.join("; ")}`) +
      `  $${cost.toFixed(4)}` +
      (checked?.warnings.length ? `  [check: ${checked.warnings.join("; ")}]` : ""),
  );
}

async function classifyContradictions(
  records: LogRecord[],
  modelId: string,
  target: string,
  start: () => Promise<{ call: JudgeCaller; log: RunLog; runId: string }>,
): Promise<void> {
  const scenario = DIALOGUES[target]!;
  const verdicts = latestVerdicts(records, modelId, scenario);
  const classified = new Set(
    records
      .filter((r): r is ContradictionKindsRecord => r.type === "contradiction_kinds" && !r.error)
      .flatMap((r) => r.items.map((i) => `${i.sourceRunId}|${i.sample}|${r.rubricVersion}`)),
  );
  const items = verdicts.flatMap((v) =>
    v.verdict.contradictions
      .map((c, position) => ({ v, c, position }))
      .filter(({ c }) => !("kind" in c) && !classified.has(`${v.sourceRunId}|${v.sample}|${v.rubricVersion}`)),
  );
  if (!items.length) {
    console.log(`${scenario.id}: no unclassified contradictions`);
    return;
  }
  const rubricVersions = [...new Set(items.map((i) => i.v.rubricVersion))];
  if (rubricVersions.length > 1) throw new Error(`${scenario.id}: contradictions from several rubric versions: ${rubricVersions.join(", ")}`);
  const prompt = buildContradictionPrompt(
    scenario.probed,
    items.map((i, index) => ({ index, claims: i.c.claims, explanation: i.c.explanation })),
  );
  const { call, log, runId } = await start();
  const made = await call(prompt, "contradiction_kinds", contradictionKindsJsonSchema());
  if (!made) return;
  const { res, cost } = made;
  let kinds: ContradictionKinds["kinds"] = [];
  let error = res.ok ? null : { message: res.error, status: res.status };
  if (res.ok) {
    const parsed = ContradictionKinds.safeParse(safeJson(res.content));
    if (parsed.success && parsed.data.kinds.length === items.length) kinds = parsed.data.kinds;
    else error = { message: "classification reply didn't match the items", status: null };
  }
  const record: ContradictionKindsRecord = {
    type: "contradiction_kinds",
    runId,
    modelId,
    target: scenario.id,
    rubricVersion: rubricVersions[0]!,
    items: kinds.map((k) => ({
      sourceRunId: items[k.index]!.v.sourceRunId,
      sample: items[k.index]!.v.sample,
      position: items[k.index]!.position,
      kind: k.kind,
      reason: k.reason,
    })),
    judgeModel: config.judge.slug,
    prompt,
    raw: res.ok ? res.content : null,
    usage: res.ok ? res.usage : null,
    costUsd: cost,
    latencyMs: res.latencyMs,
    error,
    at: new Date().toISOString(),
  };
  log.write(record);
  const tally = new Map<string, number>();
  for (const k of kinds) tally.set(k.kind, (tally.get(k.kind) ?? 0) + 1);
  console.log(
    `  ${scenario.id}: ${error ? `ERROR ${error.message}` : `${items.length} classified: ${[...tally].map(([k, n]) => `${k} ${n}`).join(", ")}`}  $${cost.toFixed(4)}`,
  );
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw.trim());
  } catch {
    return null;
  }
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exitCode = 1;
});
