// The player screen's start information (TD v0.39, The screen): the setting pack's words, the roster's
// public lines for portraits and name tooltips, and the start cards. Public information only: nothing
// here is any guest's state or inner life. Served by the play command (play.ts).

import { readFileSync } from "node:fs";
import type { CharacterName } from "../game/roster.ts";
import { settingFile, settingPack } from "../setting/pack.ts";
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

export function screenInfo(cards: CharacterName[], briefings: Partial<Record<CharacterName, string>>) {
  const pack = settingPack();
  const words = JSON.parse(readFileSync(settingFile("player.json"), "utf8"), (k, v) => (k.startsWith("_") ? undefined : v));
  const factionIndex = (f: string) => pack.factions.findIndex((x) => x.name === f);
  return {
    setting: pack.name,
    currency: pack.currency,
    words,
    max: MESSAGE_MAX,
    // Portraits and name tooltips: the public subtitle and faction, never anything the replay viewer shows.
    roster: pack.roster.map((r) => ({ name: r.name, faction: r.faction, subtitle: r.subtitle, initials: initials(r.name), colour: pack.factions[factionIndex(r.faction)]?.colour ?? `var(--faction-${factionIndex(r.faction)})` })),
    playable: cards.map((name) => ({ name, intro: firstParagraph(briefings[name] ?? "") })),
  };
}
