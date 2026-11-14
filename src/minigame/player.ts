// The mini-game's side of the human player (TD v0.39, Player Interface; CC-20261111-08, #61). The
// core's HumanController carries requests and events; this builds every event from the player
// character's own History and State, parses typed commands and @-mentions, and words refusals and
// the command menu from the setting pack (player.json). The engine decides what's legal.

import type { HumanController } from "../core/human.ts";
import type { OutgoingBody } from "../core/protocol.ts";
import { ALIASES, type CharacterName } from "../game/roster.ts";
import { relationships, say, settingPack } from "../setting/pack.ts";
import { readLoreFile, type LoreEntry, type LoreSetting } from "./lore.ts";
import type { GameLine } from "./memory.ts";

/** Mechanics, Human Player Input: at most 500 characters a message. */
export const MESSAGE_MAX = 500;

/** A player's note (TD v0.40, Notes): on no guest, one, or a pair. */
export interface PlayerNote {
  id: string;
  turn: number;
  guests: string[];
  text: string;
}
/**
 * One of the hall's places in the player's `state` (TD v0.49, Named places): its name from the setting
 * pack, its living guests in roster order (none if empty), whether it holds a Colloquio, and whether it's
 * the player's own. Every place, in the pack's order, in open play.
 */
export interface PlayerPlace {
  name: string;
  guests: string[];
  private: boolean;
  own: boolean;
}

/** Notes are the player's own; this only keeps one from swamping the record. */
export const NOTE_MAX = 2000;

/** The commands the mini-game knows, by the game's action. `investigate` is typed by its in-world name. */
export type CommandAction = "bribe" | "borrow" | "repay" | "kill" | "guard" | "investigate" | "conclude";
export const COMMANDS: readonly CommandAction[] = ["bribe", "borrow", "repay", "kill", "guard", "investigate", "conclude"];

export type ParsedCommand =
  | { action: "bribe"; target: string | null; amount: number | null }
  | { action: "borrow" }
  | { action: "repay"; target: string | null }
  | { action: "kill" | "guard" | "investigate"; target: string | null }
  | { action: "conclude"; statement: string }
  | { action: null; name: string };

/** The setting pack's player words. */
export const playerSays = (key: string, values: Record<string, string | number> = {}) => say("player", key, values);

/**
 * A section of a briefing (Characters' briefing format): the paragraphs under a whole-line bold heading,
 * up to the next one. The heading's words come from the setting pack, never from code.
 */
export function briefingSection(briefing: string, heading: string): string {
  const lines = briefing.split("\n");
  const isHeading = (l: string) => /^\*\*[^*]+\*\*$/.test(l.trim());
  const start = lines.findIndex((l) => l.trim() === `**${heading}**`);
  if (start < 0) return "";
  const end = lines.findIndex((l, i) => i > start && isHeading(l));
  return lines.slice(start + 1, end < 0 ? undefined : end).join("\n").trim();
}

/**
 * What the screen shows beyond the briefing and rules, sent with the player's sheet (TD v0.41–v0.43): the
 * web's fixed lines (relationships.json: the public ones, and the player character's own, marked private),
 * the public lore for The city and lore links (`kind: lore` only; relationship entries are for the AI
 * guests), and with `lore: on` the character's own private lore, for Your past. Approved entries only.
 */
export function screenContent(me: CharacterName, lore: LoreSetting, loadable: LoreEntry[] = readLoreFile().loadable) {
  const rel = relationships();
  const entries = loadable.filter((e) => (e.kind ?? "lore") === "lore");
  return {
    connections: [
      ...rel.public.map((c) => ({ between: c.between, type: c.type, line: c.line })),
      ...(rel.private[me] ?? []).map((c) => ({ between: [me, c.with], type: c.type, line: c.line, private: true })),
    ],
    lore: entries.filter((e) => e.scope === "public").map((e) => ({ id: e.id, title: e.title, aliases: e.aliases ?? [], subject: e.subject ?? null, text: e.text, ...(e.gloss && { gloss: e.gloss }) })),
    past: lore === "on" ? entries.filter((e) => e.scope === me).map((e) => ({ id: e.id, title: e.title, text: e.text })) : [],
  };
}

/** The errand card's text (TD v0.40, The screen): the briefing's errand section. */
export const errandText = (briefing: string) => briefingSection(briefing, playerSays("briefingHeadings.errand"));

/** The playable characters (setting.json). */
export const playable = (): string[] => settingPack().playable;

/** A refusal's words, from player.json's refusals. */
export const refusal = (reason: string, values: Record<string, string | number> = {}) => playerSays(`refusals.${reason}`, values);

const commandName = (a: CommandAction) => playerSays(`commands.${a}.name`);

/**
 * `@Name` at the start of `text`: the longest guest's name or alias among `guests` it begins with,
 * ignoring case. Returns the guest and how many characters matched.
 */
function mentionAt(text: string, guests: readonly CharacterName[]): { guest: CharacterName; length: number } | null {
  let best: { guest: CharacterName; length: number } | null = null;
  const lower = text.toLowerCase();
  for (const g of guests) {
    for (const n of [g, ...(ALIASES[g] ?? [])]) {
      const m = n.toLowerCase();
      // The name must end at a word boundary: "@Lupo," yes, "@Lupone" no.
      if (lower.startsWith(m) && !/[\p{L}\p{N}]/u.test(text[m.length] ?? "") && (!best || m.length > best.length)) best = { guest: g, length: m.length };
    }
  }
  return best;
}

/**
 * The @-addressee (TD, How the game waits for the player): the first @-mention of a guest present sets
 * the addressee. Every @ before a guest's name is dropped from the stored line.
 */
export function mentions(text: string, present: readonly CharacterName[]): { text: string; addressee: CharacterName | null } {
  let addressee: CharacterName | null = null;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const m = text[i] === "@" ? mentionAt(text.slice(i + 1), present) : null;
    if (m) {
      addressee ??= m.guest;
      continue;
    }
    out += text[i];
  }
  return { text: out, addressee };
}

/** Parses a typed command by the setting pack's names. Guests are resolved by name or alias among `guests`. */
export function parseCommand(text: string, guests: readonly CharacterName[]): ParsedCommand {
  const t = text.trim();
  const word = t.split(/\s+/)[0] ?? "";
  const action = COMMANDS.find((a) => commandName(a).toLowerCase() === word.toLowerCase());
  const rest = t.slice(word.length).trim();
  if (!action) return { action: null, name: word };
  if (action === "conclude") return { action, statement: rest };
  if (action === "borrow") return { action };
  const at = rest.indexOf("@");
  const m = at >= 0 ? mentionAt(rest.slice(at + 1), guests) : null;
  const target = m ? m.guest : at >= 0 ? rest.slice(at + 1).replace(/\s+-?\d+\s*$/, "").trim() || null : null;
  if (action === "bribe") {
    const n = rest.match(/(-?\d+)\s*$/);
    return { action, target, amount: n ? Number(n[1]) : null };
  }
  return { action, target };
}

/** The command menu's entries for these actions, with the setting pack's names and hints. */
export interface MenuEntry {
  /** The game's action, so the screen can find a command (the notes' "This is my conclusion") without its words. */
  action: CommandAction;
  name: string;
  usage: string;
  hint: string;
}
export function menu(actions: readonly CommandAction[], values: Record<string, string | number>): MenuEntry[] {
  return actions.map((a) => ({ action: a, name: commandName(a), usage: playerSays(`commands.${a}.usage`), hint: playerSays(`commands.${a}.hint`, values) }));
}

/**
 * Sends the player what their character hears: one event per History line, built from the line itself
 * (the character is in its `heardBy`), and the block 5 state whenever it changes.
 */
export class PlayerFeed {
  private lastState = "";

  constructor(
    readonly ctrl: HumanController,
    readonly character: CharacterName,
  ) {}

  /** `about`: the characters a note or action line concerns, from the event (TD v0.36's `about`). */
  heard(l: GameLine, about?: string[]): void {
    if (!l.heardBy.includes(this.character)) throw new Error(`${l.id} wasn't heard by ${this.character}`);
    const base = { id: l.id, turn: l.turn, conversation: l.conversation };
    const ev: OutgoingBody =
      l.kind === "speech"
        ? { type: "line", ...base, speaker: l.speaker!, addressee: l.addressee, text: l.text, you: l.speaker === this.character }
        : l.kind === "notaio"
          ? { type: "notaio", ...base, text: l.text, ...(about && { about }) }
          : { type: "action", ...base, text: l.text, private: l.kind === "private", ...(about && { about }) };
    this.ctrl.send(ev);
  }

  /** Block 5 and the command menu, when either changes; the sheet (blocks 2 and 3) goes with the first. */
  state(state: Record<string, unknown>, commands: MenuEntry[], speaking: string | null, sheet: () => Record<string, unknown>): void {
    const key = JSON.stringify([state, commands, speaking]);
    if (key === this.lastState) return;
    const first = !this.lastState;
    this.lastState = key;
    this.ctrl.send({ type: "state", state, commands, speaking, ...(first && { sheet: sheet() }) });
  }

  refuse(reason: string, values: Record<string, string | number> = {}, input: string | null = null): void {
    this.ctrl.send({ type: "refusal", reason: refusal(reason, values), input });
  }
}
