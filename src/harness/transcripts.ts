// Dialogue transcripts rebuilt from probe logs, for judging and scoring.

import S4 from "../../scenarios/s4-light-pressure.ts";
import S5a from "../../scenarios/s5a-interrogation-isabella.ts";
import type { CharacterName } from "../game/roster.ts";
import { RUBRIC_AMENDMENTS_ID, type TranscriptTurn } from "../judge/judge.ts";
import { formatHistoryLine } from "../prompt/assemble.ts";
import type { CallRecord, LogRecord } from "./log.ts";
import type { DialogueScenario } from "./scenario.ts";

/** Dialogue scenarios the judge handles, by command-line target. */
export const DIALOGUES: Record<string, DialogueScenario> = { s4: S4, s5a: S5a };

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
