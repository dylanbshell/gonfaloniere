// The player screen's start information (TD v0.39, The screen): the setting pack's words, the roster's
// public lines for portraits and name tooltips, and the start cards. Public information only: nothing
// here is any guest's state or inner life. Served by the play command (play.ts).

import { readFileSync } from "node:fs";
import type { CharacterName } from "../game/roster.ts";
import { relationshipTypes, relationships, settingFile, settingPack } from "../setting/pack.ts";
import type { Tunables } from "../sources/docs.ts";
import { MESSAGE_MAX } from "./player.ts";

/** Initials for a placeholder portrait: the last two capitalised words of the name. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^\p{Lu}/u.test(w))
    .slice(-2)
    .map((w) => w[0])
    .join("");

/** A briefing's first paragraph of prose: past its subtitle line and its first heading (Characters' briefing format). */
export const firstParagraph = (b: string) =>
  b
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !/^[*_#]/.test(p)) ?? "";

/** A glossary entry as the setting pack writes it (Interface v0.7, Glossary Draft). */
interface GlossaryEntry {
  term: string;
  text: string;
  /** Marked † in the draft: only the full game has it, so the mini-game leaves it out. */
  fullGame?: boolean;
  /** The rules sections it can open, by title, first found wins ("More in the rules"). */
  rules?: string[];
  /** The words in a line that get its dotted underline. */
  match?: string[];
}

/**
 * The glossary as the screen shows it (Interface v0.7): the setting pack's entries, with every amount filled
 * from the game's tuning values (Mechanics, Tunable Values), so tuning never leaves an entry wrong, and the
 * full game's terms left out of the mini-game.
 */
export function glossary(entries: GlossaryEntry[], tunables: Partial<Tunables>, currency: string, minigame: boolean) {
  const values: Record<string, string> = { currency, ...Object.fromEntries(Object.entries(tunables).map(([k, v]) => [k, String(v)])) };
  const fill = (t: string) =>
    t.replace(/\{(\w+)\}/g, (m, k: string) => {
      if (!(k in values)) throw new Error(`The glossary names an amount the game doesn't have: ${m}`);
      return values[k]!;
    });
  return entries.filter((e) => !(minigame && e.fullGame)).map((e) => ({ term: e.term, text: fill(e.text), rules: e.rules ?? [], match: e.match ?? [] }));
}

export function screenInfo(cards: CharacterName[], briefings: Partial<Record<CharacterName, string>>, opts: { tunables?: Tunables; minigame?: boolean } = {}) {
  const pack = settingPack();
  const strip = (file: string) => JSON.parse(readFileSync(settingFile(file), "utf8"), (k, v) => (k.startsWith("_") ? undefined : v));
  const { glossary: terms, ...words } = strip("player.json") as { glossary?: { entries: GlossaryEntry[] } } & Record<string, unknown>;
  const factionIndex = (f: string) => pack.factions.findIndex((x) => x.name === f);
  return {
    setting: pack.name,
    currency: pack.currency,
    words,
    // Il Notaio's hint to the player (TD v0.40): notaio.json's templates, filled on the screen.
    notaio: { hints: strip("notaio.json").hints as Record<string, string> },
    max: MESSAGE_MAX,
    // The web's arcs, in the setting's faction order.
    factions: pack.factions.map((f) => f.name),
    // The Web of Secrets' key (TD v0.44): the six relationship types, with their labels.
    relationshipTypes: relationshipTypes().map((type) => ({ type, ...relationships().types[type]! })),
    // Portraits and name tooltips: the public subtitle and faction, never anything the replay viewer shows.
    roster: pack.roster.map((r) => ({ name: r.name, faction: r.faction, subtitle: r.subtitle, initials: initials(r.name), colour: pack.factions[factionIndex(r.faction)]?.colour ?? `var(--faction-${factionIndex(r.faction)})` })),
    playable: cards.map((name) => ({ name, intro: firstParagraph(briefings[name] ?? "") })),
    // Interface v0.7: the glossary's entries, amounts filled from the game's tuning values.
    glossary: glossary(terms?.entries ?? [], opts.tunables ?? {}, pack.currency.plural, opts.minigame ?? true),
  };
}
