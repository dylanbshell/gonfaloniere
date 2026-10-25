// Re-labels pilot data from before strict labelling (Dylan, Oct 22): Claude
// Sonnet re-checks, with implicit confirmation counted as a leak, every
// honest hold that could be a chosen reply, and every reply a conversation
// continued with up to its last pair, so pairs.ts can drop prompts that come
// after the secret was already out. Turns of a rollout are checked in order,
// and a rollout stops being checked once its conversation has revealed the
// secret (everything after is dropped anyway). Writes "relabel" records.
//
//   PROBE_TD=0.4 PROBE_CHARACTERS=0.3 PROBE_RESULTS_DIR=results/pilot PROBE_TOTAL_USD=30 \
//     op run --env-file=.env -- npm run pilot:refilter -- --run-cap 3

import { parseArgs } from "node:util";
import { config, technicalDesignPath, type ModelConfig } from "../../probe.config.ts";
import { IMPLICIT_CONFIRMATION_ID, buildCandidatePrompt, candidateJsonSchema, checkCandidateLabels, type CandidateInput } from "../judge/candidates.ts";
import type { TranscriptTurn } from "../judge/judge.ts";
import { Budget, worstCaseCost } from "../harness/budget.ts";
import { RunLog, gitCommit, priorSpend, readRecords, runLogFiles, type LogRecord } from "../harness/log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient } from "../harness/openrouter.ts";
import { scenarioById } from "../harness/scenarios.ts";
import type { DialogueScenario } from "../harness/scenario.ts";
import { formatHistoryLine } from "../prompt/assemble.ts";
import { loadDocs } from "../sources/docs.ts";
import type { DatagenRecord } from "./datagen.ts";
import { candidateKey, currentDataRuns, pairsFromPrompt, type RelabelRecord } from "./pairs.ts";

const { values: opts } = parseArgs({
  options: {
    "run-cap": { type: "string", default: "3" },
    concurrency: { type: "string", default: "3" },
  },
});

const HONEST_HOLDS = ["decline", "deflect", "call_bluff", "demand_proof"];

async function main(): Promise<void> {
  const docs = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath(process.env.PROBE_TD ?? "0.6") });
  const all = readRecords(runLogFiles());
  const runs = currentDataRuns(all);
  const strict = new Set(
    all.filter((r) => r.type === "run" && runs.has(r.runId) && (r.settings as { labelling?: string }).labelling).map((r) => (r as { runId: string }).runId),
  );
  const done = new Set((all as unknown as RelabelRecord[]).filter((r) => r.type === "relabel").map((r) => candidateKey(r, r.index)));
  const records = (all as unknown as DatagenRecord[]).filter(
    (r) => (r as { type: string }).type === "datagen" && runs.has(r.runId) && !strict.has(r.runId),
  );

  // Rollouts with at least one pair under the old labels, each in turn order.
  const groups = new Map<string, DatagenRecord[]>();
  for (const r of records) groups.set(`${r.runId}|${r.script}|${r.rollout}`, [...(groups.get(`${r.runId}|${r.script}|${r.rollout}`) ?? []), r]);
  const rollouts = [...groups.values()].map((g) => g.sort((a, b) => a.turn - b.turn)).filter((g) => g.some((r) => pairsFromPrompt(r) > 0));

  const judge = config.judge;
  const client = makeClient(apiKey());
  const endpoint = await fetchEndpoint(judge as ModelConfig);
  const budget = new Budget(Number(opts["run-cap"]), config.budget.totalUsd, priorSpend());
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-refilter`;
  const log = new RunLog(runId, "pilot-relabel-");
  log.write({ type: "run", runId, startedAt: new Date().toISOString(), modelId: "pilot-refilter", gitCommit: gitCommit(), settings: { labelling: IMPLICIT_CONFIRMATION_ID } } as unknown as LogRecord);
  console.log(`${rollouts.length} rollouts with pairs to re-check; pilot spend so far $${budget.priorSpendUsd.toFixed(4)} of $${config.budget.totalUsd}`);

  let stopped = false;
  let calls = 0;
  async function recheck(group: DatagenRecord[]): Promise<void> {
    const s = scenarioById(group[0]!.script) as DialogueScenario;
    const lastPairTurn = Math.max(...group.filter((r) => pairsFromPrompt(r) > 0).map((r) => r.turn));
    const earlier: TranscriptTurn[] = [];
    for (const r of group.filter((x) => x.turn <= lastPairTurn)) {
      if (stopped) return;
      const cont = r.continuedWith;
      const holds = pairsFromPrompt(r) > 0
        ? r.candidates
            .map((c, i) => ({ c, i }))
            .filter((x) => x.c.model === "qwen3.8-27b" && x.c.parsed && x.c.label && !x.c.flagged && x.c.label.reveal === "none" && !x.c.label.lie && HONEST_HOLDS.includes(x.c.label.hold))
            .map((x) => x.i)
        : [];
      const indices = [...new Set([...(cont !== null && r.turn < lastPairTurn ? [cont] : []), ...holds])].filter((i) => !done.has(candidateKey(r, i)));
      let contLeaked = false;
      if (indices.length) {
        const input: CandidateInput = {
          character: r.character,
          briefing: docs.briefings[s.probed]!,
          rubric: docs.judgeRubric,
          present: s.conversation.present,
          opening: s.opening.map(formatHistoryLine),
          earlier,
          current: { turn: r.turn, before: s.turns[r.turn - 1]!.map(formatHistoryLine), thought: r.thought },
          candidates: indices.map((i) => ({ index: i, utterance: r.candidates[i]!.parsed!.utterance })),
          strict: true,
        };
        const prompt = buildCandidatePrompt(input);
        const worst = worstCaseCost(prompt.length, judge.maxTokens, endpoint.price);
        if (!budget.tryReserve(worst)) {
          stopped = true;
          console.log("STOPPED: the next call could exceed the run cap or the pilot's cap.");
          return;
        }
        const res = await callModel(client, { model: judge as ModelConfig, prompt, maxTokens: judge.maxTokens, extra: {}, jsonSchema: { name: "candidate_labels", schema: candidateJsonSchema() } });
        const cost = res.ok ? (res.usage.costUsd ?? 0) : 0;
        budget.settle(worst, cost);
        calls++;
        if (!res.ok) {
          stopped = true;
          console.log(`STOPPED: call failed (${res.status} ${res.error})`);
          return;
        }
        const checked = checkCandidateLabels(res.content, input);
        const byIndex = new Map((checked.labels ?? []).map((l) => [l.index, l]));
        indices.forEach((i, n) => {
          const label = byIndex.get(i) ?? null;
          const rec: RelabelRecord = { type: "relabel", runId: r.runId, script: r.script, rollout: r.rollout, turn: r.turn, index: i, label, labelling: IMPLICIT_CONFIRMATION_ID, costUsd: n === 0 ? cost : 0, at: new Date().toISOString() };
          log.write(rec as unknown as LogRecord);
          done.add(candidateKey(r, i));
        });
        const contLabel = cont !== null ? byIndex.get(cont) : undefined;
        contLeaked = !!contLabel && ["accidental", "capitulated", "deliberate"].includes(contLabel.reveal);
        const kept = holds.filter((i) => byIndex.get(i)?.reveal === "none" && !byIndex.get(i)?.lie).length;
        console.log(`  ${r.script} r${r.rollout} t${r.turn}: holds still honest ${kept}/${holds.length}${cont !== null && r.turn < lastPairTurn ? `, continuation ${contLabel?.reveal ?? "?"}` : ""}  $${cost.toFixed(4)}`);
      }
      // A conversation that has revealed the secret: later prompts are dropped, so stop here.
      if (contLeaked) return;
      if (cont === null) return;
      earlier.push({ turn: r.turn, before: s.turns[r.turn - 1]!.map(formatHistoryLine), thought: r.thought, utterance: r.candidates[cont]!.parsed!.utterance, addressee: r.candidates[cont]!.parsed!.addressee ?? null });
    }
  }

  const queue = [...rollouts];
  await Promise.all(
    Array.from({ length: Number(opts.concurrency) }, async () => {
      for (let g = queue.shift(); g && !stopped; g = queue.shift()) await recheck(g);
    }),
  );
  console.log(`Re-checked with ${calls} Sonnet calls; spent $${budget.spentUsd.toFixed(4)}. Log: ${log.path}`);
}

main();
