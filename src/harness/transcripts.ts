// Dialogue transcripts rebuilt from probe logs, for judging and scoring.

import type { CharacterName } from "../game/roster.ts";
import { RUBRIC_AMENDMENTS_ID, type JudgeVerdict, type TranscriptTurn } from "../judge/judge.ts";
import { formatHistoryLine } from "../prompt/assemble.ts";
import type { CallRecord, JudgeRecord, LogRecord } from "./log.ts";
import type { DialogueScenario } from "./scenario.ts";

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

/** The doc's rubric version plus the code's calibration amendments, e.g. "0.8+cal1". */
export function currentRubricVersion(modelsResearch: string | undefined): string {
  return `${modelsResearch ?? "?"}+${RUBRIC_AMENDMENTS_ID}`;
}

/**
 * Rebuilds each run of a dialogue from the model's latest run of that target.
 * An aborted run ends at the turn with no usable line; plannedTurns shows how
 * many it should have had.
 */
export function buildTranscripts(records: LogRecord[], modelId: string, s: DialogueScenario): Transcript[] {
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

/** The calibration level of a rubric version: "0.8+cal2" → 2; 0 for the pre-calibration rubric. */
export function calibrationLevel(rubricVersion: string): number {
  return Number(rubricVersion.match(/\+cal(\d+)$/)?.[1] ?? 0);
}

export interface RunVerdict {
  sourceRunId: string;
  sample: number;
  rubricVersion: string;
  verdict: JudgeVerdict;
  parseErrors: string[];
}

/**
 * The verdict for each run of the model's latest probe run of a dialogue,
 * under the newest calibrated rubric version that judged it. Verdicts from
 * before calibration (a different shape) are never used.
 */
export function latestVerdicts(records: LogRecord[], modelId: string, s: DialogueScenario): RunVerdict[] {
  const sourceRunId = records
    .filter((r): r is CallRecord => r.type === "call" && r.modelId === modelId && r.target === s.id && r.turn !== undefined)
    .at(-1)?.runId;
  if (!sourceRunId) return [];
  const best = new Map<number, JudgeRecord>();
  for (const r of records) {
    if (r.type !== "judge" || r.sourceRunId !== sourceRunId || r.target !== s.id || !r.verdict) continue;
    const level = calibrationLevel(r.rubricVersion);
    if (level === 0) continue;
    const prev = best.get(r.sample);
    if (!prev || level >= calibrationLevel(prev.rubricVersion)) best.set(r.sample, r);
  }
  return [...best.values()]
    .map((r) => ({ sourceRunId, sample: r.sample, rubricVersion: r.rubricVersion, verdict: r.verdict!, parseErrors: r.parseErrors }))
    .sort((a, b) => a.sample - b.sample);
}

/**
 * Every calibrated verdict for each run of the model's latest probe run of a
 * dialogue, oldest first: for comparing rubric versions and judge passes.
 */
export function allVerdicts(records: LogRecord[], modelId: string, s: DialogueScenario): Map<number, RunVerdict[]> {
  const sourceRunId = records
    .filter((r): r is CallRecord => r.type === "call" && r.modelId === modelId && r.target === s.id && r.turn !== undefined)
    .at(-1)?.runId;
  const out = new Map<number, RunVerdict[]>();
  if (!sourceRunId) return out;
  for (const r of records) {
    if (r.type !== "judge" || r.sourceRunId !== sourceRunId || r.target !== s.id || !r.verdict) continue;
    if (calibrationLevel(r.rubricVersion) === 0) continue;
    const list = out.get(r.sample) ?? [];
    list.push({ sourceRunId, sample: r.sample, rubricVersion: r.rubricVersion, verdict: r.verdict, parseErrors: r.parseErrors });
    out.set(r.sample, list);
  }
  return out;
}
