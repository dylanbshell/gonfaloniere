// The mini-game's cast and starting knowledge (Models & Research v0.22,
// Mini-Game Spec; Characters v0.4, Shared Canon).

import type { CharacterName } from "../game/roster.ts";
import { atLeast } from "../prompt/names.ts";
import { loadStandinBriefings, type DocSources } from "../sources/docs.ts";

export const CAST: CharacterName[] = ["Lupo", "Contessa Isabella", "Captain Armand LeNoir", "Francesco Pazzi", "Raffaello de' Medici", "Giorgia Pazzi"];

/** Played from stand-in briefings until Characters writes them. */
export const STANDINS: CharacterName[] = ["Francesco Pazzi", "Raffaello de' Medici", "Giorgia Pazzi"];
export const STANDIN_FILE = "scenarios/minigame-standin-briefings.md";

/** The stand-ins a game on this Characters version needs: none from v0.9, which wrote all twelve briefings (TD v0.34 retires them). */
export function standinsFor(charactersVersion: string): CharacterName[] {
  return atLeast(charactersVersion, "0.9") ? [] : STANDINS;
}

/** The cast's briefings on these docs: Characters' own, with the stand-ins over them where it hasn't written them yet. */
export function castBriefings(docs: DocSources): Partial<Record<CharacterName, string>> {
  const standins = standinsFor(docs.versions.characters);
  return { ...docs.briefings, ...(standins.length && loadStandinBriefings(STANDIN_FILE, standins, docs.socialAwareness)) };
}

/** Who knows each plot-point fact at the start: their checks are a sanity check, not spread. */
export const KNOWS_AT_START: Record<string, CharacterName[]> = {
  // Raffaello's plot point is to tell LeNoir this, so his briefing gives it to him.
  F2: ["Contessa Isabella", "Raffaello de' Medici"],
  F3: ["Giorgia Pazzi", "Captain Armand LeNoir"],
  F4: ["Contessa Isabella", "Lupo"],
  F5: ["Lupo", "Contessa Isabella"],
};
