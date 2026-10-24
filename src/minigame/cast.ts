// The mini-game's cast and starting knowledge (Models & Research v0.22,
// Mini-Game Spec; Characters v0.4, Shared Canon).

import type { CharacterName } from "../game/roster.ts";

export const CAST: CharacterName[] = ["Lupo", "Contessa Isabella", "Captain Armand LeNoir", "Francesco Pazzi", "Raffaello de' Medici", "Giorgia Pazzi"];

/** Played from stand-in briefings until Characters writes them. */
export const STANDINS: CharacterName[] = ["Francesco Pazzi", "Raffaello de' Medici", "Giorgia Pazzi"];
export const STANDIN_FILE = "scenarios/minigame-standin-briefings.md";

/** Who knows each plot-point fact at the start: their checks are a sanity check, not spread. */
export const KNOWS_AT_START: Record<string, CharacterName[]> = {
  F2: ["Contessa Isabella"],
  F3: ["Giorgia Pazzi", "Captain Armand LeNoir"],
  F4: ["Contessa Isabella", "Lupo"],
  F5: ["Lupo", "Contessa Isabella"],
};
