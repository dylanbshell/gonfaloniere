// Dialogue transcripts rebuilt from probe logs, for judging and scoring.

import type { CharacterName } from "../game/roster.ts";
import { createHash } from "node:crypto";
import { RUBRIC_AMENDMENTS_ID, RUBRIC_REVISION, type JudgeVerdict, type TranscriptTurn } from "../judge/judge.ts";
import { formatHistoryLine } from "../prompt/assemble.ts";
import type { CallRecord, JudgeRecord, LogRecord, RunRecord } from "./log.ts";
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

/**
 * A fingerprint of the rubric's text (the doc's rubric plus the amendments
 * id), recorded with every verdict from Oct 22. "Already judged" compares
 * rubrics by this, not by doc version: Models & Research v0.8 and v0.10 carry
 * identical rubric text, and a doc version bump re-judged runs needlessly.
 */
export function rubricHash(rubric: { secrets: string; rules: string }): string {
  // Earlier rubrics hashed without a revision, so their recorded hashes still match.
  const id = RUBRIC_REVISION ? `${RUBRIC_AMENDMENTS_ID}/${RUBRIC_REVISION}` : RUBRIC_AMENDMENTS_ID;
  return createHash("sha1").update(`${rubric.secrets}\n${rubric.rules}\n${id}`).digest("hex").slice(0, 12);
}

/**
 * Whether a recorded verdict was judged under the current rubric: same text
 * fingerprint, or, for records from before fingerprints, the same
 * calibration id (the doc rubric text didn't change between v0.8 and v0.10).
 */
export function sameRubric(record: { rubricVersion: string; rubricHash?: string }, currentVersion: string, currentHash: string): boolean {
  if (record.rubricHash) return record.rubricHash === currentHash;
  return calibrationLevel(record.rubricVersion) === calibrationLevel(currentVersion) && calibrationLevel(currentVersion) > 0;
}

/** The doc's rubric version plus the code's calibration amendments, e.g. "0.8+cal1". */
export function currentRubricVersion(modelsResearch: string | undefined): string {
  return `${modelsResearch ?? "?"}+${RUBRIC_AMENDMENTS_ID}`;
}

/**
 * Rebuilds each run of a dialogue from the model's latest pool of probe runs of that target.
 * An aborted run ends at the turn with no usable line; plannedTurns shows how
 * many it should have had.
 */
export function buildTranscripts(records: LogRecord[], modelId: string, s: DialogueScenario): Transcript[] {
  const calls = records.filter(
    (r): r is CallRecord => r.type === "call" && r.modelId === modelId && r.target === s.id && r.turn !== undefined,
  );
  const pool = new Set(probePool(records, modelId, s.id));
  if (!pool.size) return [];
  const mine = calls.filter((c) => pool.has(c.runId));

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
    const sourceRunId = mine.find((c) => c.sample === sample)!.runId;
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
  /** Rubric cal3's check: still inconsistent after a re-ask. */
  flagged?: string[];
  /** Rubric cal3's check: the pass was re-asked once. */
  reasked?: boolean;
}

/**
 * The verdict for each run in the model's latest pool of probe runs of a dialogue,
 * under the newest calibrated rubric version that judged it. Verdicts from
 * before calibration (a different shape) are never used.
 */
export function latestVerdicts(records: LogRecord[], modelId: string, s: DialogueScenario): RunVerdict[] {
  const pool = new Set(probePool(records, modelId, s.id));
  const best = new Map<number, JudgeRecord>();
  for (const r of records) {
    if (r.type !== "judge" || !pool.has(r.sourceRunId) || r.target !== s.id || !r.verdict) continue;
    const level = calibrationLevel(r.rubricVersion);
    if (level === 0) continue;
    const prev = best.get(r.sample);
    if (!prev || level >= calibrationLevel(prev.rubricVersion)) best.set(r.sample, r);
  }
  return [...best.values()]
    .map((r) => ({
      sourceRunId: r.sourceRunId,
      sample: r.sample,
      rubricVersion: r.rubricVersion,
      verdict: r.verdict!,
      parseErrors: r.parseErrors,
    }))
    .sort((a, b) => a.sample - b.sample);
}

/**
 * Every calibrated verdict for each run in the model's latest pool of probe runs of a
 * dialogue, oldest first: for comparing rubric versions and judge passes.
 */
export function allVerdicts(records: LogRecord[], modelId: string, s: DialogueScenario): Map<number, RunVerdict[]> {
  const pool = new Set(probePool(records, modelId, s.id));
  const out = new Map<number, RunVerdict[]>();
  for (const r of records) {
    if (r.type !== "judge" || !pool.has(r.sourceRunId) || r.target !== s.id || !r.verdict) continue;
    if (calibrationLevel(r.rubricVersion) === 0) continue;
    const list = out.get(r.sample) ?? [];
    list.push({
      sourceRunId: r.sourceRunId,
      sample: r.sample,
      rubricVersion: r.rubricVersion,
      verdict: r.verdict,
      parseErrors: r.parseErrors,
      flagged: r.flagged,
      reasked: Boolean(r.reasked),
    });
    out.set(r.sample, list);
  }
  return out;
}

/** The Technical Design version a probe run's prompts came from. */
export function tdVersionOf(records: LogRecord[], runId: string): string {
  const run = records.find((r): r is RunRecord => r.type === "run" && r.runId === runId);
  return run?.docVersions.technicalDesign ?? "0.2";
}

/**
 * The probe runs that pool for a model and scenario: the latest run of that
 * target, or the run it extends (--extend), plus every run extending the same
 * base. Runs from a different Technical Design version never pool.
 */
export function probePool(records: LogRecord[], modelId: string, targetId: string): string[] {
  const calls = records.filter((r): r is CallRecord => r.type === "call" && r.modelId === modelId && r.target === targetId);
  const latest = calls.at(-1)?.runId;
  if (!latest) return [];
  const extendsOf = (runId: string): string | undefined => {
    const run = records.find((r): r is RunRecord => r.type === "run" && r.runId === runId);
    return (run?.settings.extends as Record<string, string> | undefined)?.[targetId];
  };
  const base = extendsOf(latest) ?? latest;
  const td = tdVersionOf(records, base);
  return [...new Set(calls.map((c) => c.runId))].filter(
    (id) => (id === base || extendsOf(id) === base) && tdVersionOf(records, id) === td,
  );
}
