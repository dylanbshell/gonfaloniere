// Gates scored from judge verdicts (Models & Research v0.8, Scoring): gate 3
// (secret keeping), gate 4 (contradictions), gate 5 (inference), and TD's
// speak() addressee check.

import { FACTUAL_CONTRADICTIONS, isLeak, type JudgeVerdict } from "../judge/judge.ts";
import type { CallRecord, InferenceRecord, LogRecord, SpeakCallRecord, ThinkCallRecord } from "./log.ts";
import { contradictionKind } from "./review.ts";
import { DIALOGUES, INFERENCE } from "./scenarios.ts";
import { allVerdicts, calibrationLevel, latestVerdicts } from "./transcripts.ts";

// Set before running so results can't move the goalposts.
const GATE3: Record<string, { leakRateMax: number } | { holdRateMin: number } | { discloseRateMin: number }> = {
  S4: { leakRateMax: 0.1 },
  S5c: { leakRateMax: 0.1 },
  S5a: { holdRateMin: 0.7 },
  S5b: { holdRateMin: 0.7 },
  // Gate 3 from Models & Research v0.15: no price on the table.
  S5d: { holdRateMin: 0.7 },
  // Below this S6 is flagged rigid, not failed.
  S6: { discloseRateMin: 0.6 },
};
const GATE3_SCENARIOS = ["S4", "S5a", "S5b", "S5c", "S5d", "S6"];
const GATE4_SCENARIOS = ["S5a", "S5b"];
const ADDRESSEE_SCENARIOS = ["S4", "S5a", "S5b", "S5c", "S5d", "S6"];
const GATE5 = { referencedMin: 0.7, urgencyAboveControl: 15, pair: ["Raffaello de' Medici", "Captain Armand LeNoir"] };
/** S6's useful disclosure. */
const DEBT = /debt|owes|gambling loss/i;

export interface JudgedRun {
  target: string;
  /** The baseline scenario whose thresholds apply (the target itself unless it's a variant). */
  baseTarget: string;
  sourceRunId: string;
  sample: number;
  rubricVersion: string;
  verdict: JudgeVerdict;
  /** Turns the scenario has; fewer judged turns means the run was aborted. */
  plannedTurns: number;
  /** Contradictions that count for gate 4 (conflicting factual claims). */
  factualContradictions: number;
  /** Contradictions with no kind yet (cal1 verdicts not classified). */
  unclassifiedContradictions: number;
  /** Verdicts under the newest calibrated rubric, oldest first (several when judged in passes). */
  passes: JudgeVerdict[];
  /** The cal1 verdict, if the run was judged under it. */
  cal1: JudgeVerdict | undefined;
  /** The first three cal2 passes, for comparing with a later rubric. */
  cal2Passes: JudgeVerdict[];
  /** The calibration level the decisive passes come from. */
  level: number;
  /** Newest-rubric passes still inconsistent after the cal3 re-ask. */
  flagged: string[];
  /** Newest-rubric passes that were re-asked. */
  reasked: number;
}

/** Judge passes needed before the majority decides a run (Dylan, Oct 21). */
const MAJORITY_PASSES = 3;

/** Each dialogue run's newest calibrated verdict, for the model's latest probe runs. */
export function judgedRuns(records: LogRecord[], modelId: string): JudgedRun[] {
  return Object.values(DIALOGUES).flatMap((s) => {
    const every = allVerdicts(records, modelId, s);
    return latestVerdicts(records, modelId, s).map((v) => {
      const kinds = v.verdict.contradictions.map((c, i) => contradictionKind(records, v.sourceRunId, v.sample, v.rubricVersion, i, c));
      const all = every.get(v.sample) ?? [];
      const top = Math.max(...all.map((x) => calibrationLevel(x.rubricVersion)));
      return {
        target: s.id,
        baseTarget: s.variantOf ?? s.id,
        sourceRunId: v.sourceRunId,
        sample: v.sample,
        rubricVersion: v.rubricVersion,
        verdict: v.verdict,
        plannedTurns: s.turns.length,
        factualContradictions: kinds.filter((k) => k && FACTUAL_CONTRADICTIONS.includes(k as never)).length,
        unclassifiedContradictions: kinds.filter((k) => !k).length,
        // The majority uses each run's first three passes, so verdicts added later (e.g. the
        // duplicate passes from the Oct 22 doc-version slip) don't change a result already reported.
        passes: all
          .filter((x) => calibrationLevel(x.rubricVersion) === top)
          .slice(0, MAJORITY_PASSES)
          .map((x) => x.verdict),
        cal1: all.find((x) => calibrationLevel(x.rubricVersion) === 1)?.verdict,
        cal2Passes: all
          .filter((x) => calibrationLevel(x.rubricVersion) === 2)
          .slice(0, MAJORITY_PASSES)
          .map((x) => x.verdict),
        level: top,
        flagged: all.filter((x) => calibrationLevel(x.rubricVersion) === top).slice(0, MAJORITY_PASSES).flatMap((x) => x.flagged ?? []),
        reasked: all.filter((x) => calibrationLevel(x.rubricVersion) === top).slice(0, MAJORITY_PASSES).filter((x) => x.reasked).length,
      };
    });
  });
}

const verdictLeaked = (v: JudgeVerdict) => v.turns.some((t) => isLeak(t.reveal));
const verdictHeld = (v: JudgeVerdict, plannedTurns: number) => !verdictLeaked(v) && v.turns.length >= plannedTurns;
const majority = (j: JudgedRun) => j.passes.length >= MAJORITY_PASSES;
/** With three or more passes, the majority decides; otherwise the newest verdict. */
const leaked = (j: JudgedRun) =>
  majority(j) ? j.passes.filter(verdictLeaked).length * 2 > j.passes.length : verdictLeaked(j.verdict);
/** No leak in any turn, and the run reached its last turn. */
const held = (j: JudgedRun) =>
  majority(j)
    ? j.passes.filter((v) => verdictHeld(v, j.plannedTurns)).length * 2 > j.passes.length
    : verdictHeld(j.verdict, j.plannedTurns);
const disclosedDebt = (j: JudgedRun) => j.verdict.turns.some((t) => t.safe_disclosure && DEBT.test(t.safe_disclosure));
const clues = (j: JudgedRun) => j.verdict.turns.filter((t) => t.reveal === "self_incriminating_clue").length;

interface ScenarioResult {
  target: string;
  pass: boolean;
  /** e.g. "30.0% held" */
  label: string;
  /** e.g. "≥70% held" */
  threshold: string;
  /** What a miss means: S6 below its bar is "rigid", not a failure. */
  missLabel: string;
}

function gate3Results(judged: JudgedRun[]): ScenarioResult[] {
  const targets = [...new Set(judged.map((j) => j.target))]
    .filter((t) => GATE3_SCENARIOS.includes(judged.find((j) => j.target === t)!.baseTarget))
    .sort();
  return targets.flatMap((target): ScenarioResult[] => {
    const runs = judged.filter((j) => j.target === target);
    const rule = GATE3[runs[0]!.baseTarget];
    if (!runs.length || !rule) return [];
    if ("leakRateMax" in rule) {
      const rate = runs.filter(leaked).length / runs.length;
      return [{ target, pass: rate <= rule.leakRateMax, label: `${pct(rate)} leaked`, threshold: `≤${pct(rule.leakRateMax)} leaked`, missLabel: "fail" }];
    }
    if ("holdRateMin" in rule) {
      const rate = runs.filter(held).length / runs.length;
      return [{ target, pass: rate >= rule.holdRateMin, label: `${pct(rate)} held`, threshold: `≥${pct(rule.holdRateMin)} held`, missLabel: "fail" }];
    }
    // S6: the debt disclosed, and nothing leaked, in the same run.
    const rate = runs.filter((j) => disclosedDebt(j) && !leaked(j)).length / runs.length;
    return [
      {
        target,
        pass: rate >= rule.discloseRateMin,
        label: `${pct(rate)} disclosed the debt without a leak`,
        threshold: `≥${pct(rule.discloseRateMin)}`,
        missLabel: "flag: rigid",
      },
    ];
  });
}

/** One summary-table cell: each judged scenario's result so far, plus the clue count. */
export function gate3Cell(judged: JudgedRun[]): string {
  const results = gate3Results(judged);
  if (!results.length) return "not judged";
  const total = judged.filter((j) => GATE3_SCENARIOS.includes(j.target)).reduce((n, j) => n + clues(j), 0);
  // Variants are reported in their own section, not in the baseline summary.
  return results.filter((r) => GATE3_SCENARIOS.includes(r.target)).map((r) => `${r.target} ${r.pass ? r.label : `**${r.label}**`}`).join("; ") + `; clues ${total}`;
}

export function gate4Cell(judged: JudgedRun[]): string {
  const runs = judged.filter((j) => GATE4_SCENARIOS.includes(j.target));
  if (!runs.length) return "–";
  const total = runs.reduce((n, j) => n + j.factualContradictions, 0);
  const unclassified = runs.reduce((n, j) => n + j.unclassifiedContradictions, 0);
  return `${total} in ${runs.filter((j) => j.factualContradictions).length}/${runs.length} runs${unclassified ? ` (+${unclassified} unclassified)` : ""}`;
}

export function judgedReport(judged: JudgedRun[], calls: CallRecord[]): string[] {
  if (!judged.length) return [];
  const out: string[] = [
    "",
    "### Gate 3: secret keeping",
    "",
    "*From judge verdicts (each run's newest calibrated rubric). A leak is an accidental or capitulated reveal (under pressure, a bluff, or a threat, even if planned). " +
      "Deliberate reveals and self-incriminating clues are reported, not counted. A run holds when it has no leak and reached its last turn. " +
      "S6 passes when the debt is disclosed without a leak; below its bar it's flagged rigid, not failed.*",
    "",
    "| Scenario | Runs judged | Rubric | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate | Self-incriminating clues | Debt disclosed | First leak turn (runs) | Threshold | Result |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  const results = new Map(gate3Results(judged).map((r) => [r.target, r]));
  for (const target of [...new Set(judged.map((j) => j.target))].sort()) {
    const runs = judged.filter((j) => j.target === target);
    const turns = runs.flatMap((j) => j.verdict.turns);
    const count = (kind: string) => turns.filter((t) => t.reveal === kind).length;
    const firsts = new Map<number, number>();
    for (const j of runs) if (j.verdict.first_leak_turn) firsts.set(j.verdict.first_leak_turn, (firsts.get(j.verdict.first_leak_turn) ?? 0) + 1);
    const r = results.get(target);
    out.push(
      `| ${target} | ${runs.length} | ${[...new Set(runs.map((j) => j.rubricVersion))].join(", ")} | ${runs.filter(leaked).length} | ` +
        `${runs.filter(held).length} | ${runs.filter((j) => j.verdict.turns.length < j.plannedTurns).length} | ` +
        `${count("accidental")} / ${count("capitulated")} | ${count("deliberate")} | ${count("self_incriminating_clue")} | ` +
        `${runs.filter(disclosedDebt).length} | ${[...firsts].sort((a, b) => a[0] - b[0]).map(([t, n]) => `t${t}×${n}`).join(", ") || "–"} | ` +
        `${r?.threshold ?? "–"} | ${r ? (r.pass ? "pass" : `**${r.missLabel}**`) : "reported"} |`,
    );
  }

  const g4 = judged.filter((j) => GATE4_SCENARIOS.includes(j.target));
  if (g4.length) {
    out.push(
      "",
      "### Gate 4: contradictions (reported, not gated)",
      "",
      "*Counted: conflicting factual claims by the character within a run (past events, what they know, what they hold). " +
        "Excluded: stance changes, haggling, denial-then-admission, conflicts with the truth.*",
      "",
    );
    for (const target of GATE4_SCENARIOS) {
      const runs = g4.filter((j) => j.target === target);
      if (!runs.length) continue;
      const counted = runs.reduce((n, j) => n + j.factualContradictions, 0);
      const listed = runs.reduce((n, j) => n + j.verdict.contradictions.length, 0);
      const unclassified = runs.reduce((n, j) => n + j.unclassifiedContradictions, 0);
      out.push(
        `- ${target}: ${counted} counted in ${runs.filter((j) => j.factualContradictions).length} of ${runs.length} runs ` +
          `(${listed} listed by the judge${unclassified ? `, ${unclassified} not yet classified` : ""})`,
      );
    }
  }

  out.push(...majorityReport(judged, calls));
  out.push(...addresseeReport(judged, calls));
  return out;
}

/** Held by the majority of a set of passes (a single pass decides alone). */
function majorityHeld(passes: JudgeVerdict[], plannedTurns: number): boolean | null {
  if (!passes.length) return null;
  return passes.filter((v) => verdictHeld(v, plannedTurns)).length * 2 > passes.length;
}

/**
 * Whether the character offered or made a payment for silence in a run: the
 * majority of the rubric cal3 passes ("paid"), or, for runs not re-judged
 * under cal3, a bribe action in its speak() replies.
 */
export function paidInRun(j: JudgedRun, calls: CallRecord[]): { paid: boolean; source: "judge" | "action" } {
  if (j.level >= 3) {
    const votes = j.passes.filter((v) => v.turns.some((t) => (t as { paid?: string | null }).paid));
    return { paid: votes.length * 2 > j.passes.length, source: "judge" };
  }
  const bribed = calls.some(
    (c) =>
      c.callType === "speak" &&
      c.runId === j.sourceRunId &&
      c.target === j.target &&
      c.sample === j.sample &&
      c.parsed?.verdict === "valid" &&
      c.parsed.action?.type === "bribe",
  );
  return { paid: bribed, source: "action" };
}

/**
 * Where runs were judged in several passes: held rates under cal1, cal2, and
 * the newest rubric (which decides), runs re-judged and changed, payments,
 * runs flagged by cal3's consistency check, and how often passes disagree.
 */
function majorityReport(judged: JudgedRun[], calls: CallRecord[]): string[] {
  const targets = [...new Set(judged.filter(majority).map((j) => j.target))].sort();
  if (!targets.length) return [];
  const out = [
    "",
    "### Majority-of-three judging",
    "",
    "*Runs held through the last turn. The newest rubric's majority of three decides gate 3: runs re-judged under cal3 use their cal3 passes; " +
      "runs every earlier pass marked held stay held (cal3 only removes leak causes). Changed: runs whose majority differs from cal2's. " +
      "Paid: runs where the character offered or made a payment for silence (cal3 judge; for runs not re-judged, a bribe action in speak()). " +
      "Flagged: passes still inconsistent after cal3's re-ask. Disagree: runs whose deciding passes don't all agree.*",
    "",
    "| Scenario | Runs | cal1 | cal2 majority | Deciding majority | Re-judged (cal3) | Changed | Paid | Re-asked / flagged | Disagree | Threshold | Result |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  const results = new Map(gate3Results(judged).map((r) => [r.target, r]));
  for (const target of targets) {
    const runs = judged.filter((j) => j.target === target);
    const n = runs.length;
    const cal1 = runs.filter((j) => j.cal1);
    const cal2Held = runs.filter((j) => majorityHeld(j.cal2Passes, j.plannedTurns)).length;
    const rejudged = runs.filter((j) => j.level >= 3);
    // Only runs that had cal2 passes can have changed from cal2.
    const changed = rejudged.filter((j) => j.cal2Passes.length && majorityHeld(j.cal2Passes, j.plannedTurns) !== held(j));
    const paid = runs.map((j) => paidInRun(j, calls));
    const paidJudge = paid.filter((p) => p.source === "judge");
    const paidAction = paid.filter((p) => p.source === "action");
    const flaggedRuns = runs.filter((j) => j.flagged.length);
    const disagree = runs.filter((j) => new Set(j.passes.map((v) => verdictHeld(v, j.plannedTurns))).size > 1).length;
    const r = results.get(target);
    out.push(
      `| ${target} | ${n} | ${cal1.length ? `${cal1.filter((j) => verdictHeld(j.cal1!, j.plannedTurns)).length}/${cal1.length}` : "–"} | ` +
        `${cal2Held}/${n} | **${runs.filter(held).length}/${n}** | ${rejudged.length} | ` +
        `${changed.length}${changed.length ? ` (runs ${changed.map((j) => j.sample).join(", ")})` : ""} | ` +
        `${paid.filter((p) => p.paid).length}/${n} (judge ${paidJudge.filter((p) => p.paid).length}/${paidJudge.length}, action ${paidAction.filter((p) => p.paid).length}/${paidAction.length}) | ` +
        `${runs.reduce((k, j) => k + j.reasked, 0)} / ${flaggedRuns.length}${flaggedRuns.length ? ` (runs ${flaggedRuns.map((j) => j.sample).join(", ")})` : ""} | ` +
        `${disagree}/${n} | ${r?.threshold ?? "–"} | ${r ? (r.pass ? "pass" : `**${r.missLabel}**`) : "–"} |`,
    );
  }
  return out;
}

/** Judge's "puts a question or demand to one person" against speak()'s addressee field. */
function addresseeReport(judged: JudgedRun[], calls: CallRecord[]): string[] {
  const speaks = calls.filter(
    (c): c is SpeakCallRecord => c.callType === "speak" && c.parsed?.verdict === "valid" && ADDRESSEE_SCENARIOS.includes(c.target),
  );
  let both = 0;
  let neither = 0;
  let falsePositive = 0;
  let miss = 0;
  for (const j of judged.filter((x) => ADDRESSEE_SCENARIOS.includes(x.target))) {
    for (const t of j.verdict.turns) {
      const s = speaks.find((c) => c.runId === j.sourceRunId && c.target === j.target && c.sample === j.sample && c.turn === t.turn);
      if (!s) continue;
      const named = s.parsed!.addressee !== null;
      if (named && t.addresses_one_person) both++;
      else if (!named && !t.addresses_one_person) neither++;
      else if (named) falsePositive++;
      else miss++;
    }
  }
  const n = both + neither + falsePositive + miss;
  if (!n) return [];
  return [
    "",
    "### speak() addressee (for Technical Design; reported, not gated)",
    "",
    `Across ${n} judged lines: addressee set and the line addresses one person ${both}; neither ${neither}; ` +
      `**false positives** (addressee set, but the judge says no question or demand to one person) ${falsePositive}; ` +
      `**misses** (the judge says it addresses one person, but addressee is null) ${miss}.`,
  ];
}

interface Gate5Version {
  id: string;
  referenced: number;
  judged: number;
  /** Mean over samples of the mean urgency toward Raffaello and LeNoir. */
  urgency: number | null;
  samples: number;
}

function gate5Versions(records: LogRecord[], calls: CallRecord[], modelId: string): Gate5Version[] {
  return Object.values(INFERENCE).flatMap((s): Gate5Version[] => {
    const thinks = calls.filter((c): c is ThinkCallRecord => c.callType === "think" && c.target === s.id && !c.error);
    if (!thinks.length) return [];
    const runId = thinks.at(-1)!.runId;
    const urgencies = thinks
      .filter((c) => c.runId === runId)
      .flatMap((c) => {
        const contacts = c.parsed?.repaired.value?.contacts;
        if (!contacts) return [];
        const pair = GATE5.pair.map((n) => contacts.find((x) => x.name === n)?.urgency ?? 0);
        return [pair.reduce((a, b) => a + b, 0) / pair.length];
      });
    const inf = records
      .filter(
        (r): r is InferenceRecord => r.type === "inference" && r.modelId === modelId && r.target === s.id && r.sourceRunId === runId && !!r.verdict,
      )
      .at(-1);
    return [
      {
        id: s.id,
        referenced: inf?.verdict!.samples.filter((x) => x.references_event).length ?? 0,
        judged: inf?.verdict!.samples.length ?? 0,
        urgency: urgencies.length ? urgencies.reduce((a, b) => a + b, 0) / urgencies.length : null,
        samples: urgencies.length,
      },
    ];
  });
}

interface Gate5Result {
  pass: boolean;
  referencedRate: number;
  urgencyDelta: number;
}

function gate5Verdict(versions: Gate5Version[]): Gate5Result | null {
  const explicit = versions.find((v) => v.id === "S7-explicit");
  const control = versions.find((v) => v.id === "S7-control");
  if (!explicit?.judged || !control || explicit.urgency === null || control.urgency === null) return null;
  const referencedRate = explicit.referenced / explicit.judged;
  const urgencyDelta = explicit.urgency - control.urgency;
  return {
    pass: referencedRate >= GATE5.referencedMin && urgencyDelta >= GATE5.urgencyAboveControl,
    referencedRate,
    urgencyDelta,
  };
}

const gate5Detail = (r: Gate5Result) =>
  `ref ${pct(r.referencedRate)}, Δurgency ${r.urgencyDelta >= 0 ? "+" : ""}${r.urgencyDelta.toFixed(1)}`;

export function gate5Cell(records: LogRecord[], calls: CallRecord[], modelId: string): string {
  const r = gate5Verdict(gate5Versions(records, calls, modelId));
  return r ? `${r.pass ? "pass" : "**fail**"} (${gate5Detail(r)})` : "–";
}

export function gate5Report(records: LogRecord[], calls: CallRecord[], modelId: string): string[] {
  const versions = gate5Versions(records, calls, modelId);
  if (!versions.length) return [];
  const r = gate5Verdict(versions);
  return [
    "",
    "### Gate 5: inference from observations (S7)",
    "",
    `*Pass: the thought references Raffaello and LeNoir withdrawing together in ≥${pct(GATE5.referencedMin)} of explicit samples (judged), ` +
      `and Lupo's mean contact urgency toward the pair is at least ${GATE5.urgencyAboveControl} points above the control. The buried version is reported, not gated. ` +
      "References in the control (no Notaio lines) are false positives.*",
    "",
    "| Version | Thoughts referencing the withdrawals | Mean urgency toward the pair | Samples |",
    "|---|---|---|---|",
    ...versions.map(
      (v) =>
        `| ${v.id} | ${v.judged ? `${v.referenced} of ${v.judged} (${pct(v.referenced / v.judged)})` : "not judged"} | ` +
        `${v.urgency === null ? "–" : v.urgency.toFixed(1)} | ${v.samples} |`,
    ),
    "",
    `Gate 5: ${r ? `**${r.pass ? "PASS" : "FAIL"}** (${gate5Detail(r)})` : "needs the explicit and control versions judged"}`,
  ];
}

function pct(x: number): string {
  return `${(x * 100).toFixed(x === 1 || x === 0 ? 0 : 1)}%`;
}
