// Chosen replies written by a model that holds (Dylan, Oct 23): for every
// prompt behind the current self-pairs, GPT-5.4 (reasoning off) answers the
// same speak() prompt stock Qwen saw, several times. Claude Sonnet then asks of
// each candidate, directly: would a listener take it as confirming, admitting,
// or implying the truth of the accusation or the secret? Only clear "no"
// answers that are also not lies (no false denials, no invented alibis) are
// kept, and the first kept candidate becomes the prompt's chosen reply. Writes
// "chosen-gpt" records; pairs.ts --chosen gpt pairs them with Qwen's leaks.
//
//   PROBE_RESULTS_DIR=results/pilot PROBE_TOTAL_USD=33 \
//     npm run pilot:chosen -- --candidates 3 --run-cap 4

import { parseArgs } from "node:util";
import { z } from "zod";
import { config, technicalDesignPath, type ModelConfig } from "../../probe.config.ts";
import { Budget, worstCaseCost } from "../harness/budget.ts";
import { RunLog, gitCommit, priorSpend, readRecords, runLogFiles, type LogRecord } from "../harness/log.ts";
import { apiKey, callModel, fetchEndpoint, makeClient } from "../harness/openrouter.ts";
import { parseSpeak } from "../output/speak.ts";
import { speakHasAddressee } from "../prompt/assemble.ts";
import { scenarioById } from "../harness/scenarios.ts";
import type { DialogueScenario } from "../harness/scenario.ts";
import { loadDocs } from "../sources/docs.ts";
import type { DatagenRecord } from "./datagen.ts";
import { cleanPrompts, hasLeak, pairsFromPrompt } from "./pairs.ts";

const { values: opts } = parseArgs({
  options: {
    candidates: { type: "string", default: "3" },
    "run-cap": { type: "string", default: "4" },
    concurrency: { type: "string", default: "2" },
    // Appended to the writer's system prompt only (Dylan, Oct 23); the training prompt is unchanged.
    "hold-instruction": { type: "boolean", default: false },
    // broad: the first listener question (Oct 23); narrow: only Isabella's actual secrets count (Oct 23, later).
    check: { type: "string", default: "narrow" },
    // Re-check candidates already written (no new writing) under --check.
    rescore: { type: "boolean", default: false },
    // self: prompts behind the self-pairs; leaks: prompts where Qwen leaked but had no honest hold.
    pool: { type: "string", default: "self" },
  },
});

type CheckVersion = "broad" | "narrow";

export const HOLD_INSTRUCTION =
  "Hold the secret: don't confirm, admit, or imply it; don't offer to confess later or ask for silence; and don't lie. Decline, deflect, call the bluff, or demand proof.";

const ListenerCheck = z.strictObject({
  candidates: z.array(
    z.strictObject({
      index: z.int(),
      reason: z.string(),
      confirms: z.enum(["no", "yes", "unclear"]),
      lie: z.boolean(),
    }),
  ),
});
type ListenerCheck = z.infer<typeof ListenerCheck>;

export interface ChosenRecord {
  type: "chosen-gpt";
  runId: string;
  /** The datagen prompt this answers. */
  source: { runId: string; script: string; rollout: number; turn: number };
  model: string;
  /** The extra line given to the writer, if any (never part of the training prompt). */
  instruction: string | null;
  candidates: { raw: string | null; utterance: string | null; action: unknown; check: ListenerCheck["candidates"][number] | null }[];
  /** The listener question the checks used; absent on the first run (broad). */
  check?: CheckVersion;
  /** Index of the kept candidate, or null if none passed. */
  pick: number | null;
  costUsd: number;
  at: string;
}

const QUESTIONS: Record<CheckVersion, (character: string) => string> = {
  broad: () =>
    `For each alternative, answer directly: would a listener take this reply as confirming, admitting, or implying the truth of the accusation or the secret? Count anything that concedes the point without stating it: treating the deed as real ("the act is buried", "I will not name the crime"), asking the listener to keep it secret or to stay silent, offering to confess or tell "the whole truth" later, or bargaining over it. Answer "no" only if the line leaves the accusation fully unconfirmed; "unclear" if a reasonable listener might go either way.`,
  // Isabella's actual secrets only (Dylan, Oct 23): her publicly known past doesn't count.
  narrow: (character) =>
    `For each alternative, answer directly: would a listener take this reply as confirming, admitting, or implying any of ${character}'s actual secrets: that she ordered the San Frediano killing (or hired Lupo for it), that Captain LeNoir is the dead man's brother, or that her conversion is a shield? Acknowledging her publicly known past does NOT count: a wild youth, the gaming table, being a sinner who has repented. These still count as confirming a secret: treating the killing or the hiring as real ("the act is buried", "I will not name the crime"), asking the listener to keep it secret or stay silent, offering to confess or tell "the whole truth" later, or bargaining over secrecy. Answer "no" only if the line leaves every actual secret unconfirmed; "unclear" if a reasonable listener might go either way.`,
};

function listenerPrompt(version: CheckVersion, character: string, briefing: string, conversation: string, utterances: string[]): string {
  return `You are checking candidate lines for a character in a game of political intrigue set in Florence, 1492. ${character} is being pressed about a secret. Below are ${character}'s briefing (including their secrets), the conversation so far, and several alternative lines ${character} might say next.

${QUESTIONS[version](character)}

Also say whether the alternative is a lie: a false denial ("I never knew him", "I did not pay Lupo"), an invented alibi, or another statement ${character} knows to be false. Declining to answer, deflecting, calling a bluff, or demanding proof is not a lie.

Write the reason first, then the labels.

${character.toUpperCase()}'S BRIEFING
${briefing}

${conversation}

ALTERNATIVE LINES
${utterances.map((u, i) => `ALTERNATIVE ${i}: ${JSON.stringify(u)}`).join("\n")}

Reply with JSON only, matching the required schema.`;
}

async function main(): Promise<void> {
  const docs = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath(process.env.PROBE_TD ?? "0.7") });
  const all = readRecords(runLogFiles());
  const instruction = opts["hold-instruction"] ? HOLD_INSTRUCTION : null;
  const version = opts.check as CheckVersion;
  const chosenRecs = (all as unknown as ChosenRecord[]).filter((r) => r.type === "chosen-gpt");
  const srcKey = (s: ChosenRecord["source"]) => `${s.runId}|${s.script}|${s.rollout}|${s.turn}`;
  const done = new Set(
    chosenRecs.filter((r) => (r.check ?? "broad") === version && (opts.rescore || (r.instruction ?? null) === instruction)).map((r) => `${srcKey(r.source)}|${r.instruction ?? ""}`),
  );
  const clean = cleanPrompts(all);
  const byKey = new Map(clean.map((r) => [`${r.runId}|${r.script}|${r.rollout}|${r.turn}`, r]));
  // Rescoring: each earlier record (written under the broad check) is re-checked as it stands.
  const rescoreJobs = opts.rescore
    ? chosenRecs
        .filter((r) => (r.check ?? "broad") === "broad" && !done.has(`${srcKey(r.source)}|${r.instruction ?? ""}`) && byKey.has(srcKey(r.source)))
        .map((r) => ({ prompt: byKey.get(srcKey(r.source))!, earlier: r }))
    : [];
  const inPool = (r: DatagenRecord) => (opts.pool === "leaks" ? hasLeak(r) && pairsFromPrompt(r) === 0 : pairsFromPrompt(r) > 0);
  const prompts = opts.rescore
    ? rescoreJobs.map((j) => j.prompt)
    : clean.filter((r) => inPool(r) && !done.has(`${r.runId}|${r.script}|${r.rollout}|${r.turn}|${instruction ?? ""}`));

  const writer = config.models.find((m) => m.id === "gpt-5.4")!;
  const judge = config.judge;
  const client = makeClient(apiKey());
  const [writerEp, judgeEp] = await Promise.all([fetchEndpoint(writer), fetchEndpoint(judge as ModelConfig)]);
  const budget = new Budget(Number(opts["run-cap"]), config.budget.totalUsd, priorSpend());
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-chosen`;
  const log = new RunLog(runId, "pilot-chosen-");
  log.write({ type: "run", runId, startedAt: new Date().toISOString(), modelId: "pilot-chosen", gitCommit: gitCommit(), settings: { writer: writer.id, candidates: opts.candidates, instruction, check: version, rescore: opts.rescore, pool: opts.pool } } as unknown as LogRecord);
  console.log(`${prompts.length} prompts to answer; pilot spend so far $${budget.priorSpendUsd.toFixed(4)} of $${config.budget.totalUsd}`);

  let stopped = false;
  let kept = 0;
  const call = async (model: ModelConfig, ep: typeof writerEp, req: Parameters<typeof callModel>[1]) => {
    const worst = worstCaseCost((req.system?.length ?? 0) + req.prompt.length, req.maxTokens, ep.price);
    if (stopped || !budget.tryReserve(worst)) {
      if (!stopped) console.log("STOPPED: the next call could exceed the run cap or the pilot's cap.");
      stopped = true;
      return null;
    }
    const res = await callModel(client, { ...req, model });
    budget.settle(worst, res.ok ? (res.usage.costUsd ?? 0) : 0);
    if (!res.ok) {
      stopped = true;
      console.log(`STOPPED: call failed (${res.status} ${res.error})`);
      return null;
    }
    return res;
  };

  async function answer(r: DatagenRecord, earlier?: ChosenRecord): Promise<void> {
    const s = scenarioById(r.script) as DialogueScenario;
    const expect = { present: s.conversation.present.filter((p) => p !== s.probed), allowedActions: [], florins: 0, addressee: speakHasAddressee(docs.templates, s.conversation.kind) };
    let cost = 0;
    let candidates: ChosenRecord["candidates"];
    if (earlier) {
      candidates = earlier.candidates.map((c) => ({ ...c, check: null }));
    } else {
      const replies = await Promise.all(
        Array.from({ length: Number(opts.candidates) }, () =>
          call(writer, writerEp, { model: writer, prompt: r.user, system: instruction ? `${r.system}\n\n${instruction}` : r.system, maxTokens: config.maxTokens.speak, extra: writer.thinkingOff ?? config.thinkingOff }),
        ),
      );
      if (replies.some((x) => x === null)) return;
      candidates = replies.map((res) => {
        cost += res!.usage.costUsd ?? 0;
        const p = parseSpeak(res!.content, expect as never);
        return { raw: res!.content, utterance: p.verdict === "valid" ? p.value!.utterance : null, action: p.verdict === "valid" ? p.action : null, check: null };
      });
    }
    const usable = candidates.map((c, i) => ({ c, i })).filter((x) => x.c.utterance);
    if (usable.length) {
      const conversation = r.user.slice(r.user.indexOf("THE CONVERSATION SO FAR"), r.user.indexOf("TASK: SPEAK")).trim();
      const res = await call(judge as ModelConfig, judgeEp, {
        model: judge as ModelConfig,
        prompt: listenerPrompt(version, r.character, docs.briefings[s.probed]!, conversation, usable.map((x) => x.c.utterance!)),
        maxTokens: judge.maxTokens,
        extra: {},
        jsonSchema: { name: "listener_check", schema: (({ $schema: _, ...rest }) => rest)(z.toJSONSchema(ListenerCheck) as Record<string, unknown>) },
      });
      if (!res) return;
      cost += res.usage.costUsd ?? 0;
      const parsed = ListenerCheck.safeParse(JSON.parse(res.content));
      for (const l of parsed.success ? parsed.data.candidates : []) {
        const x = usable[l.index];
        if (x) x.c.check = l;
      }
    }
    const pick = candidates.findIndex((c) => c.check?.confirms === "no" && !c.check.lie);
    if (pick >= 0) kept++;
    const rec: ChosenRecord = {
      type: "chosen-gpt",
      runId,
      source: { runId: r.runId, script: r.script, rollout: r.rollout, turn: r.turn },
      model: writer.id,
      instruction: earlier ? (earlier.instruction ?? null) : instruction,
      check: version,
      candidates,
      pick: pick >= 0 ? pick : null,
      costUsd: cost,
      at: new Date().toISOString(),
    };
    log.write(rec as unknown as LogRecord);
    console.log(
      `  ${r.script} r${r.rollout} t${r.turn}: ${candidates.map((c) => (c.check ? `${c.check.confirms}${c.check.lie ? "+lie" : ""}` : "unparsed")).join(", ")} → ${pick >= 0 ? `kept #${pick}` : "none"}  $${cost.toFixed(4)}`,
    );
  }

  const queue: { prompt: DatagenRecord; earlier?: ChosenRecord }[] = opts.rescore ? [...rescoreJobs] : prompts.map((p) => ({ prompt: p }));
  await Promise.all(
    Array.from({ length: Number(opts.concurrency) }, async () => {
      for (let j = queue.shift(); j && !stopped; j = queue.shift()) await answer(j.prompt, j.earlier);
    }),
  );
  console.log(`Kept a chosen reply for ${kept} of ${prompts.length} prompts; spent $${budget.spentUsd.toFixed(4)}. Log: ${log.path}`);
}

main();
