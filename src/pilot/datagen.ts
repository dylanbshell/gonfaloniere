// Capitulation Pilot data generation (Models & Research v0.15, Capitulation
// Pilot → Data). Plays each training interrogation script turn by turn in TD
// v0.3's prompt format. At every turn, stock Qwen3.8-27B thinks, then both
// Qwen3.8 and DeepSeek V4.1 Flash reply to the same speak() prompt several
// times; the judge labels every reply (rubric cal4, with its checks); the
// conversation continues with one of Qwen's own replies, so later prompts are
// ones the stock model actually reaches. pairs.ts turns the labels into
// preference pairs.
//
//   PROBE_RESULTS_DIR=results/pilot PROBE_TOTAL_USD=40 \
//     op run --env-file=.env -- npm run pilot:data -- --rollouts 1
//
// Options: --rollouts <n> per script, --scripts <id,…> (default: the training
// scripts), --qwen <n> and --deepseek <n> replies per prompt, --run-cap <usd>.

import { parseArgs } from "node:util";
import { config, type ModelConfig } from "../../probe.config.ts";
import { TRAINING_SCRIPTS } from "../../scenarios/pilot-interrogations.ts";
import { allowedActionTypes, allowedActionsText } from "../game/actions.ts";
import { factionOf } from "../game/roster.ts";
import { buildCandidatePrompt, candidateJsonSchema, checkCandidateLabels, type CandidateLabel } from "../judge/candidates.ts";
import { buildConsistencyPrompt, labelMismatches, reasonConclusionsJsonSchema } from "../judge/consistency.ts";
import type { JudgeVerdict, TranscriptTurn } from "../judge/judge.ts";
import { parseSpeak, type SpeakExpectation } from "../output/speak.ts";
import { parseThink } from "../output/think.ts";
import { assembleSpeakPrompt, assembleThinkPrompt, formatHistoryLine, type HistoryLine } from "../prompt/assemble.ts";
import { loadDocs } from "../sources/docs.ts";
import { Budget, worstCaseCost } from "../harness/budget.ts";
import { RunLog, gitCommit, priorSpend } from "../harness/log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient, type EndpointInfo } from "../harness/openrouter.ts";
import { characterContext, currentFlorins, type DialogueScenario } from "../harness/scenario.ts";
import { unbriefedGuests } from "../harness/scenarios.ts";
import { currentRubricVersion, rubricHash } from "../harness/transcripts.ts";
import type OpenAI from "openai";

/** One generated reply to a speak() prompt, with the judge's label. */
export interface Candidate {
  model: string;
  seed: number;
  raw: string | null;
  /** The reply as the engine would use it; null if it didn't parse. */
  parsed: { addressee: string | null; utterance: string; action: unknown } | null;
  label: CandidateLabel | null;
}

/** One prompt in a rollout: the speak() prompt and every candidate reply. */
export interface DatagenRecord {
  type: "datagen";
  runId: string;
  script: string;
  character: string;
  rollout: number;
  turn: number;
  /** TD v0.3 layout: blocks 1–3 and blocks 4–9 of the speak() prompt. */
  system: string;
  user: string;
  thought: string | null;
  candidates: Candidate[];
  /** The candidate the conversation continued with. */
  continuedWith: number | null;
  rubricVersion: string;
  rubricHash: string;
  /** Re-asked once after a label problem; problems that remained flag the prompt's labels. */
  reasked: string[] | null;
  flagged: string[] | null;
  costUsd: number;
  at: string;
}

const { values: opts } = parseArgs({
  options: {
    rollouts: { type: "string", default: "1" },
    scripts: { type: "string" },
    qwen: { type: "string", default: "4" },
    deepseek: { type: "string", default: "3" },
    "run-cap": { type: "string", default: "10" },
    concurrency: { type: "string", default: "2" },
  },
});

type Caller = (
  model: ModelConfig & { maxTokens?: number },
  ep: EndpointInfo,
  req: { prompt: string; system?: string; seed?: number; maxTokens: number; temperature?: number; extra: Record<string, unknown>; jsonSchema?: { name: string; schema: Record<string, unknown> } },
) => Promise<{ content: string | null; cost: number } | null>;

async function main(): Promise<void> {
  const docs = loadDocs({ ...config.docs, technicalDesign: config.technicalDesigns["0.3"]! });
  const rubricVersion = currentRubricVersion(docs.versions.modelsResearch);
  const hash = rubricHash(docs.judgeRubric);
  const scripts = opts.scripts
    ? TRAINING_SCRIPTS.filter((s) => opts.scripts!.split(",").includes(s.id.toLowerCase()) || opts.scripts!.split(",").includes(s.id))
    : TRAINING_SCRIPTS;
  if (!scripts.length) throw new Error(`No training scripts match ${opts.scripts}`);

  const qwen = config.models.find((m) => m.id === "qwen3.8-27b")!;
  const deepseek = config.models.find((m) => m.id === "deepseek-v4.1-flash")!;
  const client = makeClient(apiKey());
  const [qwenEp, dsEp, judgeEp, checkerEp] = await Promise.all([
    fetchEndpoint(qwen),
    fetchEndpoint(deepseek),
    fetchEndpoint(config.judge),
    fetchEndpoint(config.consistencyChecker),
  ]);
  const budget = new Budget(Number(opts["run-cap"]), config.budget.totalUsd, priorSpend());
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-datagen`;
  const log = new RunLog(runId, "pilot-data-");
  log.write({
    type: "run",
    runId,
    startedAt: new Date().toISOString(),
    modelId: "pilot-datagen",
    modelSlug: `${qwen.slug} + ${deepseek.slug}`,
    endpoint: qwenEp,
    docVersions: docs.versions,
    gitCommit: gitCommit(),
    targets: scripts.map((s) => s.id),
    settings: { rollouts: opts.rollouts, qwen: opts.qwen, deepseek: opts.deepseek, rubricVersion, td: "0.3", temperature: config.temperature },
  });
  console.log(
    `Pilot data: ${scripts.length} scripts × ${opts.rollouts} rollouts; ${opts.qwen} Qwen + ${opts.deepseek} DeepSeek replies per prompt. ` +
      `Pilot spend so far $${budget.priorSpendUsd.toFixed(4)} of $${config.budget.totalUsd}; this run capped at $${opts["run-cap"]}.`,
  );

  let stopped = false;
  const call: Caller = async (model, ep, req) => {
    const worst = worstCaseCost((req.system?.length ?? 0) + req.prompt.length, req.maxTokens, ep.price);
    if (stopped || !budget.tryReserve(worst)) {
      if (!stopped) console.log("STOPPED: the next call could exceed the run cap or the pilot's cap.");
      stopped = true;
      return null;
    }
    const res = await callModel(client as OpenAI, { model, ...req });
    const cost = res.ok ? (res.usage.costUsd ?? res.usage.inputTokens * ep.price.input + res.usage.outputTokens * ep.price.output) : 0;
    budget.settle(worst, cost);
    return { content: res.ok ? res.content : null, cost };
  };

  const jobs = scripts.flatMap((s) => Array.from({ length: Number(opts.rollouts) }, (_, r) => ({ s, r })));
  let next = 0;
  const worker = async () => {
    while (!stopped && next < jobs.length) {
      const { s, r } = jobs[next++]!;
      await rollout(s, r);
    }
  };

  async function rollout(s: DialogueScenario, r: number): Promise<void> {
    const character = s.probed;
    const history: HistoryLine[] = [...s.opening];
    const thoughts: string[] = [];
    const earlier: TranscriptTurn[] = [];
    const thinkingOff = (m: ModelConfig) => m.thinkingOff ?? config.thinkingOff;

    for (let turn = 1; turn <= s.turns.length; turn++) {
      history.push(...s.turns[turn - 1]!);
      const live = () => ({
        history: [...history],
        shortTermThoughts: [...thoughts],
        utterance: history.filter((l) => l.kind === "speech").length,
      });
      const seed = config.seedBase + 50_000 + r * 1000 + turn * 10;
      let cost = 0;

      // Stock Qwen thinks; its thought is part of the prompt both models reply to.
      const thinkCtx = characterContext(s, character, docs, config.plotProtection, live());
      const tp = assembleThinkPrompt(docs.templates, thinkCtx);
      const t = await call(qwen, qwenEp, { prompt: tp.user, system: tp.system, seed, maxTokens: config.maxTokens.think, temperature: config.temperature, extra: thinkingOff(qwen) });
      if (!t) return;
      cost += t.cost;
      const thought = t.content
        ? parseThink(t.content, { conversation: s.conversation.kind, livingOthers: thinkCtx.state.livingOthers, ignoreNames: unbriefedGuests(s.id), format: "td0.3" }).repaired.value?.thought ?? null
        : null;
      if (thought) thoughts.push(thought);

      const speakCtx = characterContext(s, character, docs, config.plotProtection, live());
      const actions = {
        faction: factionOf(character),
        florins: currentFlorins(s, character, docs),
        pensionSize: docs.tunables.pension_size,
        treasury: docs.tunables.embassy_treasury,
        colloquioWith: s.conversation.kind === "colloquio" ? (s.conversation.present.find((p) => p !== character) ?? null) : null,
      };
      const sp = assembleSpeakPrompt(docs.templates, speakCtx, { allowedActions: allowedActionsText(actions) });
      const expect: SpeakExpectation = { present: speakCtx.state.present, allowedActions: allowedActionTypes(actions), florins: actions.florins };

      const draws = [
        ...Array.from({ length: Number(opts.qwen) }, (_, i) => ({ model: qwen, ep: qwenEp, seed: seed + 1 + i })),
        ...Array.from({ length: Number(opts.deepseek) }, (_, i) => ({ model: deepseek, ep: dsEp, seed: seed + 101 + i })),
      ];
      const replies = await Promise.all(
        draws.map((d) => call(d.model, d.ep, { prompt: sp.user, system: sp.system, seed: d.seed, maxTokens: config.maxTokens.speak, temperature: config.temperature, extra: thinkingOff(d.model) })),
      );
      if (replies.some((x) => x === null)) return;
      const candidates: Candidate[] = draws.map((d, i) => {
        const raw = replies[i]!.content;
        cost += replies[i]!.cost;
        const p = raw ? parseSpeak(raw, expect) : null;
        return {
          model: d.model.id,
          seed: d.seed,
          raw,
          parsed: p?.verdict === "valid" ? { addressee: p.addressee, utterance: p.value!.utterance, action: p.action } : null,
          label: null,
        };
      });

      // Label every usable reply in one call, with cal4's checks and one re-ask.
      const usable = candidates.map((c, index) => ({ c, index })).filter((x) => x.c.parsed);
      const input = {
        character,
        briefing: docs.briefings[character]!,
        rubric: docs.judgeRubric,
        present: s.conversation.present,
        opening: s.opening.map(formatHistoryLine),
        earlier,
        current: { turn, before: s.turns[turn - 1]!.map(formatHistoryLine), thought },
        candidates: usable.map((x) => ({ index: x.index, utterance: x.c.parsed!.utterance })),
      };
      const label = async (extraNote: string) => {
        const res = await call(config.judge as ModelConfig & { maxTokens: number }, judgeEp, {
          prompt: buildCandidatePrompt(input) + extraNote,
          maxTokens: config.judge.maxTokens,
          extra: {},
          jsonSchema: { name: "candidate_labels", schema: candidateJsonSchema() },
        });
        if (!res?.content) return { labels: null as CandidateLabel[] | null, problems: ["no reply"], cost: res?.cost ?? 0 };
        let c = res.cost;
        const checked = checkCandidateLabels(res.content, input);
        if (!checked.labels) return { labels: null, problems: checked.errors, cost: c };
        const asVerdict = { turns: checked.labels.map((l) => ({ ...l, turn: l.index })) } as unknown as JudgeVerdict;
        const read = await call(config.consistencyChecker as ModelConfig & { maxTokens: number }, checkerEp, {
          prompt: buildConsistencyPrompt(asVerdict),
          maxTokens: config.consistencyChecker.maxTokens,
          extra: {},
          jsonSchema: { name: "reason_conclusions", schema: reasonConclusionsJsonSchema() },
        });
        c += read?.cost ?? 0;
        const mismatches = read?.content ? labelMismatches(asVerdict, read.content).mismatches.map((m) => m.replace(/^turn/, "alternative")) : [];
        return { labels: checked.labels, problems: [...checked.errors, ...checked.premiseProblems, ...mismatches], cost: c };
      };
      let reasked: string[] | null = null;
      let flagged: string[] | null = null;
      let labelled = usable.length ? await label("") : { labels: [], problems: [], cost: 0 };
      cost += labelled.cost;
      if (labelled.problems.length) {
        reasked = labelled.problems;
        labelled = await label(
          `\n\nIMPORTANT: a first labelling had these problems:\n${labelled.problems.map((p) => `- ${p}`).join("\n")}\n` +
            "Label every alternative again. Make each label agree with its reason, and quote a premise only if those exact words were said by another speaker at or before that turn.",
        );
        cost += labelled.cost;
        if (labelled.problems.length) flagged = labelled.problems;
      }
      for (const l of labelled.labels ?? []) {
        const c = candidates[l.index];
        if (c) c.label = l;
      }

      // Continue with one of Qwen's own usable replies, chosen by seed.
      const qwenUsable = candidates.map((c, i) => ({ c, i })).filter((x) => x.c.model === qwen.id && x.c.parsed);
      const pick = qwenUsable.length ? qwenUsable[(seed + turn) % qwenUsable.length]!.i : null;
      const record: DatagenRecord = {
        type: "datagen",
        runId,
        script: s.id,
        character,
        rollout: r,
        turn,
        system: sp.system,
        user: sp.user,
        thought,
        candidates,
        continuedWith: pick,
        rubricVersion,
        rubricHash: hash,
        reasked,
        flagged,
        costUsd: cost,
        at: new Date().toISOString(),
      };
      log.write(record as never);
      const labels = candidates.filter((c) => c.label);
      const leaks = labels.filter((c) => c.model === qwen.id && (c.label!.reveal === "accidental" || c.label!.reveal === "capitulated")).length;
      const holds = labels.filter((c) => c.model === deepseek.id && c.label!.reveal === "none" && !c.label!.lie && ["decline", "deflect", "call_bluff", "demand_proof"].includes(c.label!.hold)).length;
      console.log(
        `  ${s.id} rollout ${r} turn ${turn}: Qwen leaks ${leaks}/${Number(opts.qwen)}, DeepSeek honest holds ${holds}/${Number(opts.deepseek)}` +
          (flagged ? "  FLAGGED" : reasked ? "  (re-asked)" : "") +
          `  $${cost.toFixed(4)}`,
      );
      if (pick === null) {
        console.log(`  ${s.id} rollout ${r}: no usable Qwen reply at turn ${turn}; rollout ends`);
        return;
      }
      const cont = candidates[pick]!.parsed!;
      earlier.push({ turn, before: s.turns[turn - 1]!.map(formatHistoryLine), thought, utterance: cont.utterance, addressee: cont.addressee });
      history.push({ kind: "speech", speaker: character, addressee: cont.addressee ?? undefined, text: cont.utterance });
    }
  }

  await Promise.all(Array.from({ length: Math.min(Number(opts.concurrency), jobs.length) }, worker));
  console.log(`Data generation spent $${budget.spentUsd.toFixed(4)}. Log: ${log.path}`);
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exitCode = 1;
});
