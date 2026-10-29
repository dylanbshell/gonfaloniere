// The lore store (Technical Design v0.22–v0.25, Memory Architecture › The lore store): background
// knowledge in the same database as memory, retrieved the same way, and off by default (`lore: off`).
//
// The lore data file (lore/lore.json) is a JSON array of entries. Its content is the Lore chat's,
// approved by Dylan and checked against the Characters doc's Shared Canon; code writes none of it.
// Only entries with status "approved" and canon_checked true are loaded. The file's hash goes in the
// game record header, so every game says exactly which lore it ran with.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { ROSTER, type CharacterName } from "../game/roster.ts";

export const LORE_FILE = "lore/lore.json";
export type LoreSetting = "off" | "on";
export const LORE_SETTINGS: readonly LoreSetting[] = ["off", "on"];

const LoreEntryShape = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** `public`, or the full name of the one character it belongs to. */
  scope: z.string().min(1),
  /** One fact or episode, at most ~80 words, in plain prose. */
  text: z.string().min(1),
  /** The Lore doc entry, or the Characters doc's Shared Canon. */
  source: z.string(),
  status: z.enum(["draft", "approved"]),
  canon_checked: z.boolean(),
});
export type LoreEntry = z.infer<typeof LoreEntryShape> & { scope: "public" | CharacterName };

export interface LoreFile {
  path: string;
  /** SHA-256 of the file's bytes. */
  hash: string;
  /** Every entry in the file. */
  all: LoreEntry[];
  /** The entries a game loads: approved and canon-checked. */
  loadable: LoreEntry[];
}

export function readLoreFile(path = LORE_FILE): LoreFile {
  const bytes = readFileSync(path);
  const parsed = z.array(LoreEntryShape).safeParse(JSON.parse(bytes.toString("utf8")));
  if (!parsed.success) throw new Error(`${path}: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  const names = ROSTER.map((r) => r.name) as string[];
  for (const e of parsed.data) {
    if (e.scope !== "public" && !names.includes(e.scope)) throw new Error(`${path}: lore ${e.id} has scope "${e.scope}", which is neither public nor a character's full name`);
  }
  const ids = parsed.data.map((e) => e.id);
  if (new Set(ids).size !== ids.length) throw new Error(`${path}: duplicate lore ids`);
  const all = parsed.data as LoreEntry[];
  return { path, hash: createHash("sha256").update(bytes).digest("hex"), all, loadable: all.filter((e) => e.status === "approved" && e.canon_checked) };
}

/** The game record header's lore fields: the setting, and the file it ran with (its hash even when off, so the record says which file was there). */
export function loreHeader(file: LoreFile, setting: LoreSetting) {
  return { lore: setting, lore_file: { path: file.path, hash: file.hash, entries_in_file: file.all.length, entries_loaded: setting === "on" ? file.loadable.length : 0 } };
}

/** TD v0.25: up to 2 entries for the prompt, about 250 tokens at most (characters ÷ 3.5, as block 6 counts them). */
export const LORE_MAX = 2;
export const LORE_BUDGET = 250;

/**
 * The lore lines for a call, from the character's entries ranked most similar first. As block 6's
 * budget does, an entry that would pass the cap is skipped, so a shorter one further down can fit.
 */
export function loreLines(ranked: { text: string }[], max = LORE_MAX, budget = LORE_BUDGET): string[] {
  const out: string[] = [];
  let used = 0;
  for (const e of ranked) {
    if (out.length >= max) break;
    const cost = Math.ceil(e.text.length / 3.5);
    if (used + cost > budget) continue;
    out.push(e.text);
    used += cost;
  }
  return out;
}
