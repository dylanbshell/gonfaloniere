// Technical Design v0.34's In-World Names (CC-20261107-01): the names characters hear in place of
// the game's own. The table is setting content, read from scenarios/in-world-names.json; this module
// only decides when it applies and fills its templates. Docs, code, the game record, and the system
// prompts (10a–10d) keep the game names.

import { readFileSync } from "node:fs";

export const IN_WORLD_NAMES_FILE = "scenarios/in-world-names.json";

export interface InWorldNames {
  since: { technicalDesign: string; characters: string };
  phase: { mingling: string; council: string; midnight: string; speeches: string; ballot: string; runoff: string };
  time: { mingling: string; council: string; midnight: string; speeches: string };
  rounds: string[];
  roundsShort: string[];
  parts: string[];
  /** In-world act word → game act. */
  acts: Record<string, string>;
}

let cached: InWorldNames | null = null;
export function inWorldNames(path = IN_WORLD_NAMES_FILE): InWorldNames {
  if (path !== IN_WORLD_NAMES_FILE) return JSON.parse(readFileSync(path, "utf8"));
  return (cached ??= JSON.parse(readFileSync(path, "utf8")));
}

/** Whether version `v` (e.g. "0.10") is at least `min`, comparing major then minor as numbers. */
export function atLeast(v: string, min: string): boolean {
  const [a, b] = v.split(".").map(Number);
  const [c, d] = min.split(".").map(Number);
  return a! > c! || (a === c && b! >= d!);
}

/**
 * Whether a game's prompts use the in-world names: only when both its TD and its Characters do
 * (TD: "switch together"). A pair where one does and the other doesn't would mix the two sets in one
 * prompt, so it's refused.
 */
export function usesInWorldNames(versions: { technicalDesign: string; characters: string }, names = inWorldNames()): boolean {
  const td = atLeast(versions.technicalDesign, names.since.technicalDesign);
  const chars = atLeast(versions.characters, names.since.characters);
  if (td !== chars) {
    throw new Error(
      `TD v${versions.technicalDesign} and Characters v${versions.characters} would mix game names and in-world names in one prompt: ` +
        `in-world names need TD v${names.since.technicalDesign}+ with Characters v${names.since.characters}+, and earlier versions need both earlier (TD In-World Names)`,
    );
  }
  return td;
}

const fillIn = (t: string, v: Record<string, string>) => t.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m);

/** Which third of a round a turn falls in (0 early, 1 midway, 2 late); turn 0, before the first, counts as early. */
export function partOf(turn: number, turns: number): number {
  return Math.min(2, Math.max(0, Math.ceil((turn * 3) / Math.max(1, turns)) - 1));
}

/** Block 5's {phase_label} while mingling: "The first round of mingling, early". `round` counts from 1. */
export function minglingPhase(turn: number, turns: number, round = 1, names = inWorldNames()): string {
  return fillIn(names.phase.mingling, { round: names.rounds[round - 1]!, part: names.parts[partOf(turn, turns)]! });
}

/** The short time label that opens a block 6 line, in place of T4: "1st round, early". */
export function minglingTime(turn: number, turns: number, round = 1, names = inWorldNames()): string {
  return fillIn(names.time.mingling, { round: names.roundsShort[round - 1]!, part: names.parts[partOf(turn, turns)]! });
}

/** The game act for a 9e act word: an in-world word ("watch") or the game's own ("investigate"); null if neither. */
export function gameAct(word: string, names = inWorldNames()): string | null {
  if (Object.hasOwn(names.acts, word) && !word.startsWith("_")) return names.acts[word]!;
  return Object.values(names.acts).includes(word) ? word : null;
}
