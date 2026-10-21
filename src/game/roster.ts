// The 12 characters (Characters v0.2, Roster). Names are the exact spellings
// models must use in contact lists and addressees.

export type Faction = "Medici" | "Pazzi" | "Dominicans" | "French Embassy";

export const ROSTER = [
  { name: "Piero de' Medici", faction: "Medici" },
  { name: "Clarice Orsini", faction: "Medici" },
  { name: "Raffaello de' Medici", faction: "Medici" },
  { name: "Francesco Pazzi", faction: "Pazzi" },
  { name: "Giorgia Pazzi", faction: "Pazzi" },
  { name: "Lupo", faction: "Pazzi" },
  { name: "Fra Tommaso", faction: "Dominicans" },
  { name: "Sister Beatrice", faction: "Dominicans" },
  { name: "Contessa Isabella", faction: "Dominicans" },
  { name: "Jeanne d'Orléans", faction: "French Embassy" },
  { name: "Emile de Valois", faction: "French Embassy" },
  { name: "Captain Armand LeNoir", faction: "French Embassy" },
] as const satisfies readonly { name: string; faction: Faction }[];

export type CharacterName = (typeof ROSTER)[number]["name"];

/**
 * Other ways characters refer to each other: titles, short forms, and the
 * names their briefings use. For matching model output to a roster name
 * (contact repairs now; detectDesignation's "known alias" check later).
 */
export const ALIASES: Record<CharacterName, string[]> = {
  "Piero de' Medici": ["Piero", "Signor Piero", "Messer Piero"],
  "Clarice Orsini": ["Clarice", "Madonna Clarice", "Lady Clarice"],
  "Raffaello de' Medici": ["Raffaello", "Signor Raffaello", "Messer Raffaello"],
  "Francesco Pazzi": ["Francesco", "Francesco de' Pazzi", "Signor Francesco", "Messer Francesco"],
  "Giorgia Pazzi": ["Giorgia", "Giorgia de' Pazzi", "Madonna Giorgia", "Lady Giorgia"],
  Lupo: [],
  "Fra Tommaso": ["Tommaso", "Brother Tommaso", "Father Tommaso"],
  "Sister Beatrice": ["Beatrice"],
  "Contessa Isabella": ["Isabella", "Contessa Isabella di Salviati", "Isabella di Salviati", "the Contessa"],
  "Jeanne d'Orléans": ["Jeanne", "Ambassador Jeanne", "Madame Jeanne", "Lady Jeanne"],
  "Emile de Valois": ["Emile", "Prince Emile", "Prince Emile de Valois"],
  "Captain Armand LeNoir": ["LeNoir", "Captain LeNoir", "Armand LeNoir", "Armand", "the Captain"],
};

/** The roster name an alias refers to, ignoring case; null if none or ambiguous. */
export function resolveAlias(name: string): CharacterName | null {
  const n = name.trim().toLowerCase();
  const hits = ROSTER.map((c) => c.name).filter((c) => ALIASES[c].some((a) => a.toLowerCase() === n));
  return hits.length === 1 ? hits[0]! : null;
}

export function factionOf(name: CharacterName): Faction {
  return ROSTER.find((c) => c.name === name)!.faction;
}
