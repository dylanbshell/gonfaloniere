// Technical Design v0.38's Setting Pack (CC-20261111-04): everything the game says that belongs to its
// setting is content in setting/<name>/, never text in code. This module reads the folder and fills the
// templates' named placeholders; it writes none of the setting's words itself.

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const DEFAULT_SETTING = "florence-1492";
/** The run setting `setting` (TD v0.38): the folder under setting/, recorded in every game record's header. */
export const SETTING = process.env.PROBE_SETTING ?? DEFAULT_SETTING;

export const settingFile = (file: string, name = SETTING): string => join("setting", name, file);

import type { PensionRole } from "../rules/config.ts";

/** Mechanics' pension roles (the rules module's type): may take a French pension, keeps the treasury (and its ledger), or neither. */
export type { PensionRole };

export interface SettingPack {
  name: string;
  currency: { singular: string; plural: string };
  factions: { name: string; colour: string | null; pension: PensionRole }[];
  /**
   * `earlier`: the names a character had before a Characters version renamed them, each with the first
   * version of the new name (`before_characters`); a game on an earlier version hears the old one.
   */
  roster: { name: string; faction: string; subtitle: string; aliases: string[]; roles?: string[]; earlier?: { name: string; before_characters: string }[] }[];
  /** TD v0.49's named places, in Lore's order ("the great hall", …); absent in a pack without them. */
  places?: string[];
  playable: string[];
  minigame: { cast: string[]; standins: string[] };
}

type Templates = Record<string, string>;

const cache = new Map<string, unknown>();
function read<T>(file: string, name: string): T {
  const path = settingFile(file, name);
  if (!cache.has(path)) cache.set(path, JSON.parse(readFileSync(path, "utf8")));
  return cache.get(path) as T;
}

export function settingPack(name = SETTING): SettingPack {
  return read<SettingPack>("setting.json", name);
}

/**
 * relationships.json (TD v0.40–v0.44, The Web of Secrets): the web's fixed lines. `types`: the six fixed
 * relationship types, with their labels. `public`: connections everyone knows, each with its type and one
 * public line. `private`: each character's own connections from their briefing, seen only by that
 * character. The game never draws a new line.
 */
export interface Relationships {
  types: Record<string, { label: string; covers: string }>;
  public: { between: [string, string]; type: string; line: string }[];
  private: Record<string, { with: string; type: string; line: string }[]>;
}
export function relationships(name = SETTING): Relationships {
  return read<Relationships>("relationships.json", name);
}

/** The relationship types, in the file's order: `romance`, `kin`, … (TD v0.44's six). */
export const relationshipTypes = (name = SETTING): string[] => Object.keys(relationships(name).types).filter((k) => !k.startsWith("_"));


/**
 * A template from notaio.json (`notes.join`, `lines.payment`) or actions.json (`bribe`), filled.
 * `{currency}` is the setting's plural unless given. A placeholder with no value is an error, so a
 * template can't silently keep its braces.
 */
export function say(file: "notaio" | "actions" | "player", key: string, values: Record<string, string | number> = {}, name = SETTING): string {
  const doc = read<Record<string, unknown>>(`${file}.json`, name);
  const t = key.split(".").reduce<unknown>((o, k) => (o as Templates | undefined)?.[k], doc);
  if (typeof t !== "string") throw new Error(`setting/${name}/${file}.json has no template "${key}"`);
  const all: Record<string, string | number> = { currency: settingPack(name).currency.plural, ...values };
  return t.replace(/\{(\w+)\}/g, (m, k: string) => {
    if (!(k in all)) throw new Error(`setting/${name}/${file}.json "${key}": no value for {${k}}`);
    return String(all[k]);
  });
}
