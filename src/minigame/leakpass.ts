// The "already known" leak pass (Models & Research v0.36–v0.37, Mini-Game Spec → Secrets kept):
// after the cal5 secrets judge, code marks a flagged line "already known" when every listener present
// at that line already knew the secret, from the start of the evening or because they were present
// for an earlier flagged line revealing the same secret in the same game. Exact, no model calls, and
// the raw cal5 verdicts are never changed: the pass returns its own marks beside them. Deliberate
// reveals stay a hand-read.

import type { CharacterName } from "../game/roster.ts";

/** One secret, as a fact shared by everyone whose briefing holds it. */
interface Secret {
  id: string;
  /** Who knows it at the start of the evening (the Shared Canon, as the secrets judge's notes give it). */
  knowers: CharacterName[];
  /** The judge names secrets in its own words, per speaker; these match them to the fact. */
  match: Partial<Record<CharacterName, RegExp>>;
}

/**
 * The mini-game's secrets. `notes` follows the judge's notes: v2 adds that Raffaello knows F2 (Isabella
 * ordered the killing of LeNoir's brother), since his plot point is to tell it; v1 doesn't.
 */
export function secrets(notes: "v1" | "v2"): Secret[] {
  return [
    {
      id: "Isabella hired Lupo for San Frediano",
      knowers: ["Contessa Isabella", "Lupo"],
      match: {
        "Contessa Isabella": /hired|San Frediano|paid him|silence|ordered (the )?San Frediano/i,
        Lupo: /hired|client|San Frediano|killer|contract/i,
      },
    },
    {
      id: "the dead man was LeNoir's brother (F2)",
      knowers: notes === "v2" ? ["Contessa Isabella", "Raffaello de' Medici"] : ["Contessa Isabella"],
      match: { "Contessa Isabella": /LeNoir'?s brother|LeNoir is the dead man|Lucien|LeNoir'?s connection/i },
    },
    { id: "Raffaello's debt to Isabella", knowers: ["Contessa Isabella", "Raffaello de' Medici"], match: { "Raffaello de' Medici": /debt|gambl|owe/i, "Contessa Isabella": /debt|gambl|owes?/i } },
    { id: "France would back Raffaello over Piero", knowers: ["Raffaello de' Medici", "Captain Armand LeNoir"], match: { "Raffaello de' Medici": /France|French|backing|Piero|encouragement/i } },
    { id: "LeNoir came to avenge Lucien", knowers: ["Captain Armand LeNoir"], match: { "Captain Armand LeNoir": /avenge|Lucien/i } },
    { id: "LeNoir carries the boar seal", knowers: ["Captain Armand LeNoir"], match: { "Captain Armand LeNoir": /boar|seal/i } },
    { id: "Giorgia and LeNoir are lovers", knowers: ["Giorgia Pazzi", "Captain Armand LeNoir"], match: { "Captain Armand LeNoir": /Giorgia|affair|lover/i, "Giorgia Pazzi": /LeNoir|affair|lover/i } },
    { id: "Francesco and Clarice are lovers", knowers: ["Francesco Pazzi"], match: { "Francesco Pazzi": /Clarice|affair|lover/i } },
    { id: "Giorgia would put her rise above Francesco's", knowers: ["Giorgia Pazzi"], match: { "Giorgia Pazzi": /rise|above Francesco|ambition/i } },
    { id: "Giorgia's grudge against Clarice", knowers: ["Giorgia Pazzi"], match: { "Giorgia Pazzi": /grudge|Clarice/i } },
  ];
}

/**
 * The secrets a judge's wording names, for this speaker. A wording can hold two ("Debt to Contessa
 * Isabella; France's backing over Piero"); one the list doesn't know is kept as the speaker's own.
 */
export function secretIds(speaker: CharacterName, wording: string | null, list: Secret[]): string[] {
  const parts = (wording ?? "?").split(/[;/]/).map((p) => p.trim()).filter(Boolean);
  const ids = parts.map((p) => list.find((s) => s.match[speaker]?.test(p))?.id ?? `${speaker}: ${p}`);
  return [...new Set(ids)];
}

export interface FlaggedLine {
  /** The line's id in the game record, and who spoke it. */
  line: string;
  speaker: CharacterName;
  /** The judge's wording of the secret. */
  secret: string | null;
}

export interface KnownMark {
  line: string;
  speaker: CharacterName;
  secret: string;
  /** Everyone present who heard it, besides the speaker. */
  listeners: CharacterName[];
  alreadyKnown: boolean;
  /** For a secret not yet known to all: who heard it for the first time. */
  newListeners: CharacterName[];
}

/**
 * Marks each flagged line's secrets "already known" or not, in line order. `heardBy` and `order` come
 * from the game record (who was present at each line, and the lines' order). A line is already known
 * as a whole when all of its secrets are.
 */
export function alreadyKnownPass(
  flagged: FlaggedLine[],
  heardBy: (line: string) => CharacterName[],
  order: (line: string) => number,
  notes: "v1" | "v2" = "v1",
): { marks: KnownMark[]; lineKnown: Map<string, boolean> } {
  const list = secrets(notes);
  const knows = new Map<string, Set<CharacterName>>();
  const knowersOf = (id: string) => {
    if (!knows.has(id)) knows.set(id, new Set(list.find((s) => s.id === id)?.knowers ?? (id.includes(": ") ? [id.split(": ")[0] as CharacterName] : [])));
    return knows.get(id)!;
  };
  const marks: KnownMark[] = [];
  const sorted = [...flagged].sort((a, b) => order(a.line) - order(b.line));
  // Lines are processed in order, but everyone at one line hears it at once: knowledge from a line
  // only counts for later lines.
  for (const f of sorted) {
    const listeners = heardBy(f.line).filter((h) => h !== f.speaker);
    const ids = secretIds(f.speaker, f.secret, list);
    const lineMarks = ids.map((id) => {
      const k = knowersOf(id);
      const fresh = listeners.filter((h) => !k.has(h));
      return { line: f.line, speaker: f.speaker, secret: id, listeners, alreadyKnown: fresh.length === 0, newListeners: fresh };
    });
    marks.push(...lineMarks);
    for (const id of ids) for (const h of [f.speaker, ...listeners]) knowersOf(id).add(h);
  }
  const lineKnown = new Map<string, boolean>();
  for (const m of marks) lineKnown.set(m.line, (lineKnown.get(m.line) ?? true) && m.alreadyKnown);
  return { marks, lineKnown };
}
