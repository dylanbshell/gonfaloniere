// The roster (Characters, Roster), read from the setting pack (TD v0.38): setting/<name>/setting.json.
// Names are the exact spellings models must use in contact lists and addressees.

import { settingPack, type PensionRole } from "../setting/pack.ts";

export type Faction = string;
/** A roster name. Once a string literal union; the names are content now, so a reskin needs no code change. */
export type CharacterName = string;

const pack = settingPack();

/** Name and faction, in the roster's order (the shape game record headers have always held). */
export const ROSTER: readonly { name: CharacterName; faction: Faction }[] = pack.roster.map((r) => ({ name: r.name, faction: r.faction }));

/**
 * Other ways characters refer to each other: titles, short forms, and the
 * names their briefings use. For matching model output to a roster name
 * (contact repairs now; detectDesignation's "known alias" check later).
 */
export const ALIASES: Record<CharacterName, string[]> = Object.fromEntries(pack.roster.map((r) => [r.name, r.aliases]));

/** The roster name an alias refers to, ignoring case; null if none or ambiguous. */
export function resolveAlias(name: string): CharacterName | null {
  const n = name.trim().toLowerCase();
  const hits = ROSTER.map((c) => c.name).filter((c) => ALIASES[c]!.some((a) => a.toLowerCase() === n));
  return hits.length === 1 ? hits[0]! : null;
}

export function factionOf(name: CharacterName): Faction {
  return ROSTER.find((c) => c.name === name)!.faction;
}

const pensionRole = (f: Faction): PensionRole => pack.factions.find((x) => x.name === f)!.pension;
/** Mechanics: who may /borrow a French pension. */
export const mayTakePension = (f: Faction): boolean => pensionRole(f) === "may take";
/** Mechanics: who keeps the treasury, and so sees the pension ledger in block 5. */
export const keepsTreasury = (f: Faction): boolean => pensionRole(f) === "keeps the treasury";

/** A character's special roles (Mechanics), e.g. "two kills": the Murder Round's two Kill orders. */
export function hasRole(name: CharacterName, role: string): boolean {
  return pack.roster.find((r) => r.name === name)?.roles?.includes(role) ?? false;
}
