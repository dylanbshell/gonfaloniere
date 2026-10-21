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

export function factionOf(name: CharacterName): Faction {
  return ROSTER.find((c) => c.name === name)!.faction;
}
