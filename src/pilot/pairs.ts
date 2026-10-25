// Builds the Capitulation Pilot's preference pairs from labelled data
// (Models & Research v0.15, Capitulation Pilot → Data), and writes the
// 20-pair review file and the labelling report.
//
//   PROBE_RESULTS_DIR=results/pilot npm run pilot:pairs
//
// Self-pairs (Models & Research v0.17): rejected are stock Qwen3.8 replies
// labelled as leaks (accidental or capitulated); chosen are stock Qwen3.8
// replies to the same prompt that hold honestly (decline, deflect, call the
// bluff, demand proof), with no lie and no reveal. Both sides are the model's
// own, so the data stays on-policy. No payment-mix rule (dropped, Dylan Oct 22): these scripts'
// interrogators refuse money, and Phase B's S5a paid-rate check catches an
// adapter that learned "never pay"; pairs with a paying rejected reply against
// a non-paying chosen one are counted in the report. Both sides are
// re-serialized the same way, so formatting can't be what the adapter learns.

import { createHash } from "node:crypto";
import { parseArgs } from "node:util";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CandidateLabel } from "../judge/candidates.ts";
import { RESULTS_DIR, readRecords, runLogFiles, type LogRecord, type RunRecord } from "../harness/log.ts";
import { TRAINING_SCRIPTS } from "../../scenarios/pilot-interrogations.ts";
import type { ChosenRecord } from "./chosen.ts";
import type { Candidate, DatagenRecord } from "./datagen.ts";

/** Data from before the scripts were revised (Oct 22) isn't used: those scripts drew lies, not leaks. */
export const FIRST_REVISED_RUN = "2026-10-22T08-27";

/**
 * The data runs that count: since the scripts were revised, and on this
 * invocation's doc versions (PROBE_TD, PROBE_CHARACTERS), so a version switch
 * discards older data rather than mixing formats or briefings.
 */
export function currentDataRuns(records: LogRecord[]): Set<string> {
  const td = process.env.PROBE_TD ?? "0.8";
  const characters = process.env.PROBE_CHARACTERS ?? "0.4";
  return new Set(
    records
      .filter(
        (r): r is RunRecord =>
          r.type === "run" &&
          r.modelId === "pilot-datagen" &&
          r.runId >= FIRST_REVISED_RUN &&
          r.docVersions.technicalDesign === td &&
          r.docVersions.characters === characters &&
          // Self-pair runs only: earlier runs didn't have Sonnet re-check Qwen's honest holds.
          (r.settings as { pairing?: string } | undefined)?.pairing === "self",
      )
      .map((r) => r.runId),
  );
}
const PAIRS_PER_PROMPT = 3;
const REVIEW_PAIRS = 20;
const HONEST_HOLDS = ["decline", "deflect", "call_bluff", "demand_proof"];

const isLeak = (l: CandidateLabel) => l.reveal === "accidental" || l.reveal === "capitulated";
const isHonestHold = (l: CandidateLabel) => l.reveal === "none" && !l.lie && HONEST_HOLDS.includes(l.hold);
const usable = (c: Candidate) => Boolean(c.parsed && c.label && !c.flagged);
const rejectedIn = (r: DatagenRecord) => r.candidates.filter((c) => c.model === "qwen3.8-27b" && usable(c) && isLeak(c.label!));
const chosenIn = (r: DatagenRecord) => r.candidates.filter((c) => c.model === "qwen3.8-27b" && usable(c) && isHonestHold(c.label!));

/** How many pairs a prompt yields: one per rejected reply (up to three), if any reply holds honestly. */
/** Whether stock Qwen leaked on this prompt (it can be a rejected side). */
export const hasLeak = (r: DatagenRecord) => rejectedIn(r).length > 0;

export function pairsFromPrompt(r: DatagenRecord): number {
  return chosenIn(r).length ? Math.min(rejectedIn(r).length, PAIRS_PER_PROMPT) : 0;
}
const seeded = (key: string) => createHash("sha1").update(key).digest("hex");

/** A strict re-label of one candidate from a run made before strict labelling (refilter.ts). */
export interface RelabelRecord {
  type: "relabel";
  /** The datagen run, script, rollout, turn, and candidate index it re-labels. */
  runId: string;
  script: string;
  rollout: number;
  turn: number;
  index: number;
  label: CandidateLabel | null;
  labelling: string;
  costUsd: number;
  at: string;
}
const reveals = (l: CandidateLabel | null) => !!l && ["accidental", "capitulated", "deliberate"].includes(l.reveal);
export const candidateKey = (r: { runId: string; script: string; rollout: number; turn: number }, index: number) =>
  `${r.runId}|${r.script}|${r.rollout}|${r.turn}|${index}`;

/**
 * The prompts pairs come from, under strict labelling (Dylan, Oct 22): implicit
 * confirmation is a leak, and a prompt that comes after the character has
 * already revealed the secret (in a reply the conversation continued with) is
 * dropped. Runs labelled strictly from the start are used as they are; in
 * earlier runs, strict re-labels replace labels, and an honest hold that was
 * never strictly re-checked can't be chosen.
 */
export function cleanPrompts(all: LogRecord[]): DatagenRecord[] {
  const runs = currentDataRuns(all);
  const strictRuns = new Set(
    all
      .filter((r): r is RunRecord => r.type === "run" && runs.has(r.runId) && !!(r.settings as { labelling?: string }).labelling)
      .map((r) => r.runId),
  );
  const relabels = new Map(
    (all as unknown as RelabelRecord[]).filter((r) => r.type === "relabel").map((r) => [candidateKey(r, r.index), r.label]),
  );
  const training = new Set(TRAINING_SCRIPTS.map((s) => s.id));
  const prompts = (all as unknown as DatagenRecord[])
    .filter((r) => (r as { type: string }).type === "datagen" && runs.has(r.runId) && training.has(r.script))
    .map((r): DatagenRecord => {
      if (strictRuns.has(r.runId)) return r;
      return {
        ...r,
        candidates: r.candidates.map((c, i) => {
          const key = candidateKey(r, i);
          if (relabels.has(key)) return { ...c, label: relabels.get(key)! };
          return c.label && isHonestHold(c.label) ? { ...c, flagged: c.flagged ?? "honest hold not strictly re-checked" } : c;
        }),
      };
    });
  const group = (r: DatagenRecord) => `${r.runId}|${r.script}|${r.rollout}`;
  const confessedAt = new Map<string, number>();
  for (const r of prompts) {
    const cont = r.continuedWith === null ? null : r.candidates[r.continuedWith];
    if (cont && reveals(cont.label)) confessedAt.set(group(r), Math.min(confessedAt.get(group(r)) ?? Infinity, r.turn));
  }
  return prompts.filter((r) => !(r.turn > (confessedAt.get(group(r)) ?? Infinity)));
}

/** The reply as training text: the same JSON shape for chosen and rejected. */
function completion(c: Candidate): string {
  const p = c.parsed!;
  return JSON.stringify({ addressee: p.addressee, utterance: p.utterance, action: p.action ?? null });
}

export interface Pair {
  id: string;
  script: string;
  character: string;
  rollout: number;
  turn: number;
  system: string;
  user: string;
  chosen: string;
  rejected: string;
  chosenLabel: CandidateLabel;
  rejectedLabel: CandidateLabel;
  runId: string;
}

/**
 * GPT-5.4's kept reply for each prompt (chosen.ts), as a candidate with a label
 * built from Sonnet's listener check, so it pairs like Qwen's own holds.
 */
function gptChosen(all: LogRecord[]): Map<string, Candidate> {
  const out = new Map<string, Candidate>();
  for (const r of all as unknown as ChosenRecord[]) {
    // Only replies kept under the narrowed listener check (Dylan, Oct 23). A prompt may have a
    // record with and without the holding instruction; the instructed one is preferred.
    if (r.type !== "chosen-gpt" || r.check !== "narrow" || r.pick === null) continue;
    const key = `${r.source.runId}|${r.source.script}|${r.source.rollout}|${r.source.turn}`;
    if (out.has(key) && !r.instruction) continue;
    const c = r.candidates[r.pick]!;
    const label: CandidateLabel = {
      index: r.pick,
      reason: `Listener check: ${c.check!.reason}`,
      reveal: "none",
      secret: null,
      quote: null,
      premise: null,
      lie: false,
      hold: "other",
      paid: null,
    };
    out.set(key, {
      model: r.model,
      seed: 0,
      raw: c.raw,
      parsed: { utterance: c.utterance!, action: c.action },
      haikuLabel: null,
      sonnetLabel: label,
      recheckReason: "listener",
      label,
      flagged: null,
    });
  }
  return out;
}

function main(): void {
  // --chosen self: Qwen's own honest holds (v0.17); gpt: GPT-5.4's replies that pass Sonnet's listener check (Oct 23).
  const { values } = parseArgs({ options: { chosen: { type: "string", default: "self" } } });
  const mode = values.chosen;
  const all = readRecords(runLogFiles());
  // Only current training scripts (a script dropped from training contributes nothing), under strict labelling.
  const prompts = cleanPrompts(all);
  const gpt = mode === "gpt" ? gptChosen(all) : null;

  const pairs: Pair[] = [];
  for (const r of prompts) {
    const rejected = rejectedIn(r);
    const g = gpt?.get(`${r.runId}|${r.script}|${r.rollout}|${r.turn}`);
    // GPT mode: one chosen reply per prompt, for any prompt where Qwen leaked.
    const chosen = gpt ? (g ? [g] : []) : chosenIn(r);
    if (!rejected.length || !chosen.length) continue;
    rejected.slice(0, PAIRS_PER_PROMPT).forEach((rej, i) => {
      const ch = chosen[i % chosen.length]!;
      pairs.push({
        id: `${r.script}/r${r.rollout}/t${r.turn}/${i}`,
        script: r.script,
        character: r.character,
        rollout: r.rollout,
        turn: r.turn,
        system: r.system,
        user: r.user,
        chosen: completion(ch),
        rejected: completion(rej),
        chosenLabel: ch.label!,
        rejectedLabel: rej.label!,
        runId: r.runId,
      });
    });
  }

  // The training file is pairs.jsonl; self-pairs are kept separately for comparison.
  const pairsPath = join(RESULTS_DIR, mode === "gpt" ? "pairs.jsonl" : "pairs-self.jsonl");
  writeFileSync(pairsPath, pairs.map((p) => JSON.stringify(p)).join("\n") + (pairs.length ? "\n" : ""));

  // Labelling report: how Haiku and Sonnet disagreed where Sonnet re-checked.
  const replies = prompts.flatMap((r) => r.candidates.filter((c) => c.parsed));
  const rechecked = replies.filter((c) => c.haikuLabel && c.sonnetLabel);
  const by = (reason: string) => rechecked.filter((c) => c.recheckReason === reason);
  const disagree = (cs: Candidate[], f: (l: CandidateLabel) => boolean) =>
    `${cs.filter((c) => f(c.haikuLabel!) !== f(c.sonnetLabel!)).length}/${cs.length}`;
  const count = <T,>(xs: T[], key: (x: T) => string) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
    return [...m].map(([k, n]) => `${k} ${n}`).join(", ");
  };
  const qwenAll = replies.filter((c) => c.model === "qwen3.8-27b" && c.label);

  const report = [
    `Prompts: ${prompts.length} (TD v${process.env.PROBE_TD ?? "0.8"}, Characters v${process.env.PROBE_CHARACTERS ?? "0.4"}); replies parsed: ${replies.length}`,
    `Qwen replies labelled: ${qwenAll.length}; leaks ${qwenAll.filter((c) => isLeak(c.label!)).length} ` +
      `(${((100 * qwenAll.filter((c) => isLeak(c.label!)).length) / Math.max(1, qwenAll.length)).toFixed(1)}%); lies ${qwenAll.filter((c) => c.label!.lie).length}`,
    `Qwen honest holds: ${qwenAll.filter((c) => isHonestHold(c.label!)).length}; prompts with both a leak and an honest hold: ${prompts.filter((r) => pairsFromPrompt(r) > 0).length}`,
    `Pairs: ${pairs.length}. By character: ${count(pairs, (p) => p.character)}. By script: ${count(pairs, (p) => p.script)}. By turn: ${count(pairs, (p) => `t${p.turn}`)}`,
    `Payment: pairs whose rejected reply pays and chosen reply doesn't: ${pairs.filter((p) => p.rejectedLabel.paid && !p.chosenLabel.paid).length} of ${pairs.length}; ` +
      `stock Qwen paid in ${((100 * qwenAll.filter((c) => c.label!.paid).length) / Math.max(1, qwenAll.length)).toFixed(1)}% of its replies`,
    `Rejected leak kinds: ${count(pairs, (p) => p.rejectedLabel.reveal)}. Chosen hold kinds: ${count(pairs, (p) => p.chosenLabel.hold)}`,
    `Flagged (excluded): ${replies.filter((c) => c.flagged).length}`,
    `Haiku vs Sonnet, where Sonnet re-checked (${rechecked.length} replies): leak/not disagreements ${disagree(rechecked, isLeak)}, lie disagreements ${disagree(rechecked, (l) => l.lie)}`,
    `  Haiku's error rate on the random 10% of all replies (${by("sample").length}): leak/not ${disagree(by("sample"), isLeak)}, ` +
      `lie ${disagree(by("sample"), (l) => l.lie)}, honest hold ${disagree(by("sample"), isHonestHold)}`,
    `  on the pairable replies — leaks: overturned ${disagree(by("leak"), isLeak)}; honest holds: overturned ${disagree(by("hold"), isHonestHold)}; premise failures ${by("premise").length}`,
  ];
  console.log(report.join("\n"));
  console.log(`Pairs: ${pairsPath}`);

  // 20 pairs for hand-checking, seeded so the same pairs come out each time.
  const sample = [...pairs].sort((a, b) => seeded(a.id).localeCompare(seeded(b.id))).slice(0, REVIEW_PAIRS);
  const tail = (user: string) =>
    user
      .slice(user.indexOf("THE CONVERSATION SO FAR"), user.indexOf("TASK: SPEAK"))
      .split("\n")
      .slice(-8)
      .join("\n");
  const review = [
    "# Capitulation Pilot: 20 random pairs for hand-checking",
    "",
    "Rejected should be a leak (the character reveals a core secret, or enough to infer it, under pressure). " +
      "Chosen should hold honestly: decline, deflect, call the bluff, or demand proof, with no lie and no reveal.",
    "",
    ...report.map((l) => `- ${l}`),
    "",
    ...sample.flatMap((p) => [
      `## ${p.id} (${p.character})`,
      "",
      "```",
      tail(p.user).trim(),
      "```",
      "",
      `- **Rejected** (${p.rejectedLabel.reveal}: ${p.rejectedLabel.secret ?? "–"}): ${JSON.parse(p.rejected).utterance}`,
      `  - *Label reason:* ${p.rejectedLabel.reason}`,
      `- **Chosen** (${p.chosenLabel.hold}${p.chosenLabel.paid ? `, paid: ${p.chosenLabel.paid}` : ""}): ${JSON.parse(p.chosen).utterance}`,
      `  - *Label reason:* ${p.chosenLabel.reason}`,
      `- **Check:** rejected is a leak [ ] · chosen holds honestly [ ] — note:`,
      "",
    ]),
  ];
  const reviewPath = join(RESULTS_DIR, `pairs-review-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
  writeFileSync(reviewPath, `${review.join("\n")}\n`);
  console.log(`Review: ${reviewPath}`);
}

if (process.argv[1]?.endsWith("pairs.ts")) main();
