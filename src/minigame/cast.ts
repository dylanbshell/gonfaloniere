// The mini-game's cast and starting knowledge (Models & Research v0.22,
// Mini-Game Spec; Characters v0.4, Shared Canon).

import { readFileSync } from "node:fs";
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

export const KNOWN_AT_START_FILE = "scenarios/minigame-known-at-start.json";

/**
 * Whether a saved game's character knew a fact at the start, so the check is a sanity check, not spread.
 * From TD v0.36 the verdict says so (`known_at_start`, with no check run). Before it, the setting file's
 * table, where a stand-in's starting knowledge counts only in games played from the stand-in briefings.
 */
export function knewAtStart(k: { character: string; fact: string; verdict: { verdict: string } | null }, charactersVersion: string | undefined): boolean {
  if (k.verdict?.verdict === "known_at_start") return true;
  const table = (knownAtStartTable ??= JSON.parse(readFileSync(KNOWN_AT_START_FILE, "utf8")) as KnownAtStartTable);
  if ((table.knowers[k.fact] ?? []).includes(k.character)) return true;
  // A record with no Characters version is from before Characters wrote the cast's briefings.
  const standins = charactersVersion ? standinsFor(charactersVersion) : STANDINS;
  return (table.standinKnowers[k.fact] ?? []).some((c) => c === k.character && standins.includes(c as CharacterName));
}

interface KnownAtStartTable {
  knowers: Record<string, string[]>;
  standinKnowers: Record<string, string[]>;
}
let knownAtStartTable: KnownAtStartTable | undefined;
