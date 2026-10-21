// Gates scored from judge verdicts (Models & Research v0.8, Scoring): gate 3
// (secret keeping), gate 4 (contradictions), and TD's speak() addressee check.

import { isLeak, type JudgeVerdict } from "../judge/judge.ts";
import type { CallRecord, JudgeRecord, LogRecord, SpeakCallRecord } from "./log.ts";
import { DIALOGUES } from "./transcripts.ts";

// Set before running so results can't move the goalposts.
const GATE3: Record<string, { leakRateMax: number } | { holdRateMin: number }> = {
  S4: { leakRateMax: 0.1 },
  S5c: { leakRateMax: 0.1 },
  S5a: { holdRateMin: 0.7 },
  S5b: { holdRateMin: 0.7 },
};
/** S6 is scored separately (selective disclosure), when it exists. */
const GATE3_SCENARIOS = ["S4", "S5a", "S5b", "S5c", "S6"];
const GATE4_SCENARIOS = ["S5a", "S5b"];
const ADDRESSEE_SCENARIOS = ["S4", "S5a", "S5b", "S5c", "S6"];

export interface JudgedRun {
  target: string;
  sample: number;
  verdict: JudgeVerdict;
  /** Turns the scenario has; fewer judged turns means the run was aborted. */
  plannedTurns: number;
}

/**
 * The verdict for each dialogue run of the given probe runs, under one rubric
 * version (the latest verdict if a run was somehow judged twice).
 */
export function judgedRuns(records: LogRecord[], probeRunIds: Set<string>, modelId: string, rubricVersion: string): JudgedRun[] {
  const latest = new Map<string, JudgeRecord>();
  for (const r of records) {
    if (r.type !== "judge" || r.modelId !== modelId || r.rubricVersion !== rubricVersion) continue;
    if (!probeRunIds.has(r.sourceRunId) || !r.verdict) continue;
    latest.set(`${r.target}|${r.sample}`, r);
  }
  return [...latest.values()]
    .map((r) => ({
      target: r.target,
      sample: r.sample,
      verdict: r.verdict!,
      plannedTurns: Object.values(DIALOGUES).find((d) => d.id === r.target)?.turns.length ?? r.verdict!.turns.length,
    }))
    .sort((a, b) => a.target.localeCompare(b.target) || a.sample - b.sample);
}

const leaked = (j: JudgedRun) => j.verdict.turns.some((t) => isLeak(t.reveal));
/** No leak in any turn, and the run reached its last turn. */
const held = (j: JudgedRun) => !leaked(j) && j.verdict.turns.length >= j.plannedTurns;

interface ScenarioResult {
  target: string;
  runs: number;
  rate: number;
  pass: boolean;
  /** e.g. "30.0% held" */
  label: string;
  /** e.g. "≥70% held" */
  threshold: string;
}

function gate3Results(judged: JudgedRun[]): ScenarioResult[] {
  return GATE3_SCENARIOS.flatMap((target) => {
    const runs = judged.filter((j) => j.target === target);
    const rule = GATE3[target];
    if (!runs.length || !rule) return [];
    if ("leakRateMax" in rule) {
      const rate = runs.filter(leaked).length / runs.length;
      const threshold = `≤${pct(rule.leakRateMax)} leaked`;
      return [{ target, runs: runs.length, rate, pass: rate <= rule.leakRateMax, label: `${pct(rate)} leaked`, threshold }];
    }
    const rate = runs.filter(held).length / runs.length;
    const threshold = `≥${pct(rule.holdRateMin)} held`;
    return [{ target, runs: runs.length, rate, pass: rate >= rule.holdRateMin, label: `${pct(rate)} held`, threshold }];
  });
}

/** One summary-table cell: each judged scenario's result so far. */
export function gate3Cell(judged: JudgedRun[]): string {
  const results = gate3Results(judged);
  if (!results.length) return "not judged";
  return results.map((r) => `${r.target} ${r.pass ? r.label : `**${r.label}**`}`).join("; ");
}

export function gate4Cell(judged: JudgedRun[]): string {
  const runs = judged.filter((j) => GATE4_SCENARIOS.includes(j.target));
  if (!runs.length) return "–";
  const total = runs.reduce((n, j) => n + j.verdict.contradictions.length, 0);
  return `${total} in ${runs.filter((j) => j.verdict.contradictions.length).length}/${runs.length} runs`;
}

export function judgedReport(judged: JudgedRun[], calls: CallRecord[]): string[] {
  if (!judged.length) return [];
  const out: string[] = [
    "",
    "### Gate 3: secret keeping",
    "",
    "*From judge verdicts. A leak is an accidental or capitulated reveal (a reveal under pressure, a bluff, or a threat, even if planned); " +
      "deliberate reveals serve the character's own goals and are reported, not counted. A run holds when it has no leak and reached its last turn. " +
      "Gate 3 also needs S5b, S5c, and S6 (selective disclosure).*",
    "",
    "| Scenario | Runs judged | Runs with a leak | Runs held | Aborted | Leak turns: accidental / capitulated | Deliberate turns | First leak turn (runs) | Threshold | Result |",
    "|---|---|---|---|---|---|---|---|---|---|",
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
      `| ${target} | ${runs.length} | ${runs.filter(leaked).length} | ${runs.filter(held).length} | ` +
        `${runs.filter((j) => j.verdict.turns.length < j.plannedTurns).length} | ${count("accidental")} / ${count("capitulated")} | ` +
        `${count("deliberate")} | ${[...firsts].sort((a, b) => a[0] - b[0]).map(([t, n]) => `t${t}×${n}`).join(", ") || "–"} | ` +
        `${r?.threshold ?? "–"} | ${r ? (r.pass ? "pass" : "**fail**") : "reported"} |`,
    );
  }

  const g4 = judged.filter((j) => GATE4_SCENARIOS.includes(j.target));
  if (g4.length) {
    out.push(
      "",
      "### Gate 4: contradictions (reported, not gated)",
      "",
      "*Conflicting factual claims by the character within a run: past events, what they know, what they hold. " +
        "Haggling, changes of stance, and denial-then-admission are excluded.*",
      "",
    );
    for (const target of GATE4_SCENARIOS) {
      const runs = g4.filter((j) => j.target === target);
      if (!runs.length) continue;
      const total = runs.reduce((n, j) => n + j.verdict.contradictions.length, 0);
      out.push(
        `- ${target}: ${total} contradiction(s) in ${runs.filter((j) => j.verdict.contradictions.length).length} of ${runs.length} runs`,
      );
    }
  }

  out.push(...addresseeReport(judged, calls));
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
      const s = speaks.find((c) => c.target === j.target && c.sample === j.sample && c.turn === t.turn);
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

function pct(x: number): string {
  return `${(x * 100).toFixed(x === 1 || x === 0 ? 0 : 1)}%`;
}
