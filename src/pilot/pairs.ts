// Builds the Capitulation Pilot's preference pairs from labelled data
// (Models & Research v0.15, Capitulation Pilot → Data), and writes the
// 20-pair review file and the labelling report.
//
//   PROBE_RESULTS_DIR=results/pilot npm run pilot:pairs
//
// Rejected: stock Qwen3.8 replies labelled as leaks (accidental or
// capitulated). Chosen: DeepSeek V4.1 replies to the same prompt that hold
// honestly (decline, deflect, call the bluff, demand proof), with no lie and
// no reveal. Chosen replies are picked so their paid/refused mix stays near
// the stock model's (payment is a Bold/Cautious choice, not competence). Both
// sides are re-serialized the same way, so formatting can't be what the
// adapter learns.

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CandidateLabel } from "../judge/candidates.ts";
import { RESULTS_DIR, readRecords, runLogFiles } from "../harness/log.ts";
import type { Candidate, DatagenRecord } from "./datagen.ts";

/** Data from before the scripts were revised (Oct 22) isn't used: those scripts drew lies, not leaks. */
export const FIRST_REVISED_RUN = "2026-10-22T08-27";
const PAIRS_PER_PROMPT = 3;
const REVIEW_PAIRS = 20;
const HONEST_HOLDS = ["decline", "deflect", "call_bluff", "demand_proof"];

const isLeak = (l: CandidateLabel) => l.reveal === "accidental" || l.reveal === "capitulated";
const isHonestHold = (l: CandidateLabel) => l.reveal === "none" && !l.lie && HONEST_HOLDS.includes(l.hold);
const usable = (c: Candidate) => Boolean(c.parsed && c.label && !c.flagged);
const rejectedIn = (r: DatagenRecord) => r.candidates.filter((c) => c.model === "qwen3.8-27b" && usable(c) && isLeak(c.label!));
const chosenIn = (r: DatagenRecord) => r.candidates.filter((c) => c.model === "deepseek-v4.1-flash" && usable(c) && isHonestHold(c.label!));

/** How many pairs a prompt yields: one per rejected reply (up to three), if any reply holds honestly. */
export function pairsFromPrompt(r: DatagenRecord): number {
  return chosenIn(r).length ? Math.min(rejectedIn(r).length, PAIRS_PER_PROMPT) : 0;
}
const seeded = (key: string) => createHash("sha1").update(key).digest("hex");

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

function main(): void {
  const records = readRecords(runLogFiles()).filter(
    (r): r is never => (r as { type: string }).type === "datagen",
  ) as unknown as DatagenRecord[];
  const prompts = records.filter((r) => r.runId >= FIRST_REVISED_RUN);

  // The stock model's payment mix, over all its labelled replies.
  const qwenLabelled = prompts.flatMap((r) => r.candidates.filter((c) => c.model === "qwen3.8-27b" && usable(c)));
  const stockPaidRate = qwenLabelled.filter((c) => c.label!.paid).length / Math.max(1, qwenLabelled.length);

  const pairs: Pair[] = [];
  let chosenPaid = 0;
  for (const r of prompts) {
    const rejected = rejectedIn(r);
    const chosen = chosenIn(r);
    if (!rejected.length || !chosen.length) continue;
    rejected.slice(0, PAIRS_PER_PROMPT).forEach((rej, i) => {
      // Prefer a paid or unpaid chosen reply, whichever keeps the running mix nearer the stock rate.
      const wantPaid = chosenPaid / Math.max(1, pairs.length) < stockPaidRate;
      const ordered = [...chosen.filter((c) => Boolean(c.label!.paid) === wantPaid), ...chosen.filter((c) => Boolean(c.label!.paid) !== wantPaid)];
      const ch = ordered[i % ordered.length]!;
      if (ch.label!.paid) chosenPaid++;
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

  const pairsPath = join(RESULTS_DIR, "pairs.jsonl");
  writeFileSync(pairsPath, pairs.map((p) => JSON.stringify(p)).join("\n") + (pairs.length ? "\n" : ""));

  // Labelling report: how Haiku and Sonnet disagreed where Sonnet re-checked.
  const all = prompts.flatMap((r) => r.candidates.filter((c) => c.parsed));
  const rechecked = all.filter((c) => c.haikuLabel && c.sonnetLabel);
  const by = (reason: string) => rechecked.filter((c) => c.recheckReason === reason);
  const disagree = (cs: Candidate[], f: (l: CandidateLabel) => boolean) =>
    `${cs.filter((c) => f(c.haikuLabel!) !== f(c.sonnetLabel!)).length}/${cs.length}`;
  const count = <T,>(xs: T[], key: (x: T) => string) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
    return [...m].map(([k, n]) => `${k} ${n}`).join(", ");
  };
  const qwenAll = all.filter((c) => c.model === "qwen3.8-27b" && c.label);
  const dsAll = all.filter((c) => c.model === "deepseek-v4.1-flash" && c.label);
  const report = [
    `Prompts: ${prompts.length} (from runs since ${FIRST_REVISED_RUN}); replies parsed: ${all.length}`,
    `Qwen replies labelled: ${qwenAll.length}; leaks ${qwenAll.filter((c) => isLeak(c.label!)).length} ` +
      `(${((100 * qwenAll.filter((c) => isLeak(c.label!)).length) / Math.max(1, qwenAll.length)).toFixed(1)}%); lies ${qwenAll.filter((c) => c.label!.lie).length}`,
    `DeepSeek replies labelled: ${dsAll.length}; honest holds ${dsAll.filter((c) => isHonestHold(c.label!)).length}; leaks ${dsAll.filter((c) => isLeak(c.label!)).length}; lies ${dsAll.filter((c) => c.label!.lie).length}`,
    `Pairs: ${pairs.length}. By character: ${count(pairs, (p) => p.character)}. By script: ${count(pairs, (p) => p.script)}. By turn: ${count(pairs, (p) => `t${p.turn}`)}`,
    `Payment mix: stock Qwen paid in ${(100 * stockPaidRate).toFixed(1)}% of replies; chosen replies paid in ${pairs.length ? ((100 * chosenPaid) / pairs.length).toFixed(1) : "0"}%`,
    `Rejected leak kinds: ${count(pairs, (p) => p.rejectedLabel.reveal)}. Chosen hold kinds: ${count(pairs, (p) => p.chosenLabel.hold)}`,
    `Flagged (excluded): ${all.filter((c) => c.flagged).length}`,
    `Haiku vs Sonnet, where Sonnet re-checked (${rechecked.length} replies): leak/not disagreements ${disagree(rechecked, isLeak)}, lie disagreements ${disagree(rechecked, (l) => l.lie)}`,
    `  by reason — Haiku said leak: leak ${disagree(by("leak"), isLeak)}; Haiku said lie: lie ${disagree(by("lie"), (l) => l.lie)}, leak ${disagree(by("lie"), isLeak)}; ` +
      `premise: leak ${disagree(by("premise"), isLeak)}; random 10%: leak ${disagree(by("sample"), isLeak)}, lie ${disagree(by("sample"), (l) => l.lie)}`,
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
