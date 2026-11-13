// The screen's view of the player's log: the stream (their History lines, in segments, one for each
// stretch in one conversation; TD v0.40 collapses all but the current one), the latest block 5 state and
// command menu, the open request, the player's notes, and the ending. Everything here comes from events
// the engine built from the player's own History and State, and the public content in their sheet.
//
// TD v0.40's rule for the screen: first-hand only. The decks, the record, and the web are built from the
// sheet (briefing, rules, public content) and the player's own log; nothing here is a model's reading.

import type { Ev } from "./connection.ts";

export interface Line {
  item: "line" | "notaio" | "action";
  id: string;
  /** The event's place in the player's log, for newest-first lists. */
  seq: number;
  conversation: string;
  speaker?: string;
  addressee?: string | null;
  text: string;
  you?: boolean;
  private?: boolean;
  /** Il Notaio's notes and action lines: who the event concerns, from the event itself. */
  about?: string[];
}

/** A stretch of the evening in one conversation, with the state the player had there. */
export interface Segment {
  conversation: string;
  state: State | null;
  lines: Line[];
}

export interface State {
  phaseLabel: string;
  conversation: { kind: "capannello"; others: string[] } | { kind: "colloquio"; other: string } | { kind: "gathering" };
  present: string[];
  livingOthers: string[];
  florins: number;
  pensionsHeld: number;
  withdrawalCount: number;
  plotStatus?: string;
  /** TD v0.45: where every other living guest is, in open play (the AI guests' room line); absent otherwise. */
  room?: { groups: string[][]; colloquios: string[][] };
  [k: string]: unknown;
}

export interface Request {
  id: string;
  kind: "speak" | "move" | "seat" | "midnight";
  options: Record<string, unknown>;
}

export interface Result {
  deaths: string[];
  alive: boolean;
  foiled: number;
  checks: { character: string; fact: string; verdict: string }[];
}

export interface Connection {
  between: string[];
  type: string;
  line: string;
  /** One of the player character's own connections, from their briefing: theirs alone. */
  private?: boolean;
}
export interface LoreEntry {
  id: string;
  title: string;
  aliases: string[];
  subject: string | null;
  text: string;
}

/** The player's sheet: their briefing and the rules (blocks 3 and 2), the errand, and the public content the screen shows. */
export interface Sheet {
  briefing: string;
  rules: string;
  errand?: string;
  connections?: Connection[];
  lore?: LoreEntry[];
  past?: { id: string; title: string; text: string }[];
  /** TD v0.44, the evening's track: this game's stages, in order, by their names. */
  track?: string[];
}

/** Il Notaio's reading (TD v0.44) for one or two guests, up to a place in the record; `text` null: the tally instead. */
export interface Reading {
  seq: number;
  guests: string[];
  upTo: number;
  text: string | null;
  tally: string;
}

export interface Note {
  id: string;
  seq: number;
  turn: number;
  guests: string[];
  text: string;
}

export interface Command {
  action?: string;
  name: string;
  usage: string;
  hint: string;
}

export interface View {
  /** Every line, in order. */
  stream: Line[];
  /** The same lines by conversation; the last is the current one. */
  segments: Segment[];
  state: State | null;
  commands: Command[];
  speaking: string | null;
  sheet: Sheet | null;
  pending: Request | null;
  refusal: { seq: number; reason: string } | null;
  deaths: { name: string; you: boolean; seq: number }[];
  result: Result | null;
  notes: Note[];
  readings: Reading[];
  /** Who was present at each state update, in order: whether someone left the player's group since a moment. */
  presence: { seq: number; present: string[] }[];
  /** The seq of the player's last own line, for rotating the example line. */
  spoken: number;
  /** The seq of the last line or request: a refusal after it is the latest thing that happened. */
  activity: number;
}

export function derive(log: Ev[]): View {
  const v: View = { stream: [], segments: [], state: null, commands: [], speaking: null, sheet: null, pending: null, refusal: null, deaths: [], result: null, notes: [], readings: [], presence: [], spoken: 0, activity: 0 };
  const open = new Map<string, Request>();
  let waiting: Segment | null = null;
  for (const e of log) {
    if (e.type === "line" || e.type === "notaio" || e.type === "action" || e.type === "request") v.activity = e.seq;
    if (e.type === "line" || e.type === "notaio" || e.type === "action") {
      const l = { ...(e as unknown as Line), item: e.type, seq: e.seq } as Line;
      let seg = v.segments.at(-1);
      if (!seg || seg.conversation !== l.conversation) {
        // A segment takes the state the player has once they've arrived (the state after its first line).
        seg = { conversation: l.conversation, state: null, lines: [] };
        v.segments.push(seg);
        waiting = seg;
      }
      seg.lines.push(l);
      v.stream.push(l);
      if (l.item === "line" && l.you) v.spoken++;
    } else if (e.type === "state") {
      v.state = e.state as State;
      v.presence.push({ seq: e.seq, present: v.state.present ?? [] });
      v.commands = e.commands as Command[];
      v.speaking = (e.speaking as string | null | undefined) ?? null;
      if (e.sheet) v.sheet = e.sheet as unknown as Sheet;
      if (waiting) {
        waiting.state = v.state;
        waiting = null;
      }
    } else if (e.type === "request") {
      if (e.closed) open.delete(e.id as string);
      else open.set(e.id as string, e as unknown as Request);
    } else if (e.type === "refusal") v.refusal = { seq: e.seq, reason: e.reason as string };
    else if (e.type === "death") v.deaths.push({ name: e.name as string, you: !!e.you, seq: e.seq });
    else if (e.type === "result") v.result = e.result as Result;
    else if (e.type === "note") v.notes.push({ id: e.id as string, seq: e.seq, turn: e.turn as number, guests: e.guests as string[], text: e.text as string });
    else if (e.type === "reading") v.readings.push({ seq: e.seq, guests: e.guests as string[], upTo: e.upTo as number, text: (e.text as string | null) ?? null, tally: e.tally as string });
  }
  v.pending = [...open.values()].at(-1) ?? null;
  return v;
}

// ---- Card decks (TD v0.40, Card decks) -------------------------------------------------------------

export interface Card {
  title: string;
  text: string;
  /** The city: the subject the card is grouped under. */
  group?: string | null;
}

/**
 * The briefing as one card per section (Characters' briefing format): a whole-line bold heading starts
 * a card, and so does a paragraph that opens with a bold label ("**How you speak:** …"). The subtitle line
 * before the first heading is left out (the start card and the right panel show it).
 */
export function briefingCards(briefing: string): Card[] {
  const cards: Card[] = [];
  for (const para of briefing.split(/\n\s*\n/)) {
    const p = para.trim();
    const heading = p.match(/^\*\*([^*]+)\*\*$/);
    const lead = p.match(/^\*\*([^*]+?):\*\*\s*([\s\S]*)$/);
    if (heading) cards.push({ title: heading[1]!, text: "" });
    else if (lead) cards.push({ title: lead[1]!, text: lead[2]! });
    else if (cards.length) cards.at(-1)!.text += (cards.at(-1)!.text ? "\n\n" : "") + p;
  }
  return cards.filter((c) => c.title || c.text);
}

/**
 * The rules primer as one card per topic: a paragraph that opens with a short label ("Money: …") is a
 * topic, titled with that label (a parenthetical left in the text); the opening heading line and its
 * paragraph are the first card. A paragraph without a label continues the topic before it.
 */
export function rulesCards(rules: string): Card[] {
  const cards: Card[] = [];
  for (const para of rules.split(/\n\s*\n/)) {
    const p = para.trim();
    if (!p) continue;
    const lines = p.split("\n");
    const lead = p.match(/^([^:\n.]{1,90}):\s*/);
    if (!cards.length && lines.length > 1 && lines[0] === lines[0]!.toUpperCase() && !lead) cards.push({ title: lines[0]!, text: lines.slice(1).join("\n") });
    else if (lead) {
      const bare = lead[1]!.replace(/\s*\([^)]*\)$/, "");
      cards.push({ title: bare, text: bare === lead[1] ? p.slice(lead[0].length) : p });
    } else if (cards.length) cards.at(-1)!.text += `\n\n${p}`;
    else cards.push({ title: "", text: p });
  }
  return cards;
}

/** The city: one card per public lore entry, grouped by subject (entries without one last), then by title. */
export function cityCards(lore: LoreEntry[]): Card[] {
  const key = (e: LoreEntry) => [e.subject === null ? 1 : 0, e.subject ?? "", e.title] as const;
  return [...lore]
    .sort((a, b) => {
      const [x, y] = [key(a), key(b)];
      return x[0] - y[0] || x[1].localeCompare(y[1]) || x[2].localeCompare(y[2]);
    })
    .map((e) => ({ title: e.title, text: e.text, group: e.subject }));
}

// ---- Lore links (TD v0.40) -----------------------------------------------------------------------------

export type Part = string | { entry: LoreEntry; text: string };

/**
 * A line's text with every mention of a public lore entry's title or alias as a link: matched on the
 * line's own words (whole words, ignoring case, the longest name first), never on what a speaker was given.
 */
export function loreParts(text: string, lore: LoreEntry[]): Part[] {
  const names = lore.flatMap((e) => [e.title, ...e.aliases].map((n) => ({ n, e }))).sort((a, b) => b.n.length - a.n.length);
  if (!names.length) return [text];
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${names.map((x) => esc(x.n)).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  const parts: Part[] = [];
  let at = 0;
  for (const m of text.matchAll(re)) {
    const hit = names.find((x) => x.n.toLowerCase() === m[1]!.toLowerCase())!;
    if (m.index! > at) parts.push(text.slice(at, m.index));
    parts.push({ entry: hit.e, text: m[1]! });
    at = m.index! + m[1]!.length;
  }
  if (at < text.length) parts.push(text.slice(at));
  return parts;
}

// ---- The record: what you heard and saw (TD v0.40, The web viewer) ---------------------------------------

export type Seen = { kind: "line"; line: Line } | { kind: "death"; name: string; seq: number };

/**
 * From the player's own log only. One guest: their lines in your presence (heard), and the notes and
 * action lines about them and their death if you saw it (saw). Two: the lines one addressed to the other
 * (heard), and what you saw that concerns both. Newest first.
 */
export function heardAndSaw(v: View, guests: string[], me: string): { heard: Line[]; saw: Seen[] } {
  const speaker = (l: Line) => (l.you ? me : l.speaker);
  const heard =
    guests.length === 1
      ? v.stream.filter((l) => l.item === "line" && speaker(l) === guests[0])
      : guests.length === 2
        ? v.stream.filter((l) => l.item === "line" && guests.includes(speaker(l)!) && !!l.addressee && guests.includes(l.addressee) && l.addressee !== speaker(l))
        : [];
  const concerns = (l: Line) => l.item !== "line" && guests.length > 0 && guests.every((g) => l.about?.includes(g));
  const saw: Seen[] = [
    ...v.stream.filter(concerns).map((line) => ({ kind: "line" as const, line })),
    ...(guests.length === 1 ? v.deaths.filter((d) => d.name === guests[0]).map((d) => ({ kind: "death" as const, name: d.name, seq: d.seq })) : []),
  ];
  const seq = (s: Seen) => (s.kind === "line" ? s.line.seq : s.seq);
  return { heard: [...heard].reverse(), saw: saw.sort((a, b) => seq(b) - seq(a)) };
}

/**
 * Who the "talking with" card shows (TD v0.46, Player Interface, Right). In a Colloquio, the other guest.
 * In a group, the guest the player last @-addressed or who last addressed the player, whichever is most
 * recent, until another address involving the player replaces it, or that guest or the player leaves the
 * group (the player's own lines to no one don't change it). Otherwise no one: null.
 */
export function talkingWith(v: View, me: string): string | null {
  const c = v.state?.conversation;
  if (!c) return null;
  if (c.kind === "colloquio") return c.other;
  if (c.kind !== "capannello") return null;
  // This stretch in this group: leaving the group starts another.
  const seg = v.segments.at(-1);
  const last = [...(seg?.lines ?? [])].reverse().find((l) => l.item === "line" && !!l.addressee && (l.you ? l.addressee !== me : l.addressee === me));
  if (!last) return null;
  const who = last.you ? last.addressee! : last.speaker!;
  // Still with the player, at every state since the address.
  const since = v.presence.filter((p) => p.seq > last.seq);
  return (since.length ? since : v.presence.slice(-1)).every((p) => p.present.includes(who)) ? who : null;
}

/** The seq of the newest entry in the record for these guests (0 for none): a reading stands until it grows. */
export function recordUpTo(v: View, guests: string[], me: string): number {
  const r = heardAndSaw(v, guests, me);
  return Math.max(0, ...r.heard.map((l) => l.seq), ...r.saw.map((s) => (s.kind === "line" ? s.line.seq : s.seq)));
}

/** The latest reading for exactly these guests that covers the record as it stands, if any. */
export function readingFor(v: View, guests: string[], me: string): Reading | null {
  const upTo = recordUpTo(v, guests, me);
  const same = (a: string[]) => a.length === guests.length && a.every((g) => guests.includes(g));
  return [...v.readings].reverse().find((r) => same(r.guests) && r.upTo === upTo) ?? null;
}

/** The evening's track (TD v0.44): each stage done, now, or still to come, by the current phase's name. */
export function trackMarks(stages: string[], now: string | undefined): { stage: string; at: "past" | "now" | "next" }[] {
  const i = now === undefined ? -1 : stages.indexOf(now);
  return stages.map((stage, j) => ({ stage, at: i < 0 ? "next" : j < i ? "past" : j === i ? "now" : "next" }));
}

/** Whether a guest was part of an earlier conversation: spoke in it, was present, or was named in its events. */
export function appearsIn(seg: Segment, name: string): boolean {
  return seg.state?.present.includes(name) || seg.lines.some((l) => l.speaker === name || l.addressee === name || l.about?.includes(name)) || false;
}

// ---- Il Notaio's hint (TD v0.40) ---------------------------------------------------------------------------

/** What the moment asks of the player, as one of notaio.json's hint keys, with its values. */
export function hintMoment(v: View, me: string): { key: string; values: Record<string, string> } {
  if (v.deaths.some((d) => d.you)) return { key: "dead", values: {} };
  if (v.refusal && v.refusal.seq > v.activity) return { key: "refused", values: {} };
  const kind = v.pending?.kind;
  if (kind === "move" || kind === "seat" || kind === "midnight") return { key: kind, values: {} };
  if ((kind as string) === "ballot") return { key: "ballot", values: {} };
  const c = v.state?.conversation;
  if (c?.kind === "colloquio") return { key: "colloquio", values: { other: c.other } };
  if ((c?.kind as string) === "council") return { key: "council", values: {} };
  const o = (v.pending?.options ?? {}) as { answering?: boolean };
  if (kind === "speak" && o.answering) {
    const by = [...v.stream].reverse().find((l) => l.item === "line" && l.addressee === me);
    if (by?.speaker) return { key: "answering", values: { name: by.speaker } };
  }
  return { key: "mingling", values: {} };
}

// ---- The web (TD v0.40) --------------------------------------------------------------------------------------

/**
 * Where each guest sits in the web: around a circle, each faction together in its own arc, in the
 * setting's faction order. Coordinates are in the diagram's own units (0–100 each way).
 */
export function webLayout(roster: { name: string; faction: string }[], factions: readonly string[] = []): Map<string, { x: number; y: number }> {
  // An unknown faction (or no factions list at all: an older server's start information) sorts after the known ones, in roster order.
  const place = (f: string) => (factions.indexOf(f) + factions.length + 1) % (factions.length + 1);
  const order = [...roster].sort((a, b) => place(a.faction) - place(b.faction));
  const at = new Map<string, { x: number; y: number }>();
  order.forEach((g, i) => {
    const t = (i / order.length) * 2 * Math.PI - Math.PI / 2;
    at.set(g.name, { x: 50 + 38 * Math.cos(t), y: 50 + 38 * Math.sin(t) });
  });
  return at;
}

/**
 * Each faction's label in the web (TD v0.44): its name, in its colour, outside the circle at the middle
 * of its guests' arc. Factions with no guest on the web are left out.
 */
/** How far out the faction names sit: past the guests' circle (38) and their names. */
const FACTION_RADIUS = 56;

export function factionLabels(roster: { name: string; faction: string; colour?: string }[], factions: readonly string[], at: Map<string, { x: number; y: number }>): { faction: string; colour: string | undefined; x: number; y: number }[] {
  const names = [...new Set([...factions, ...roster.map((r) => r.faction)])];
  return names.flatMap((f) => {
    const members = roster.filter((r) => r.faction === f && at.has(r.name));
    if (!members.length) return [];
    // The mean direction of the members from the centre, pushed out past their names.
    const dx = members.reduce((s, r) => s + at.get(r.name)!.x - 50, 0);
    const dy = members.reduce((s, r) => s + at.get(r.name)!.y - 50, 0);
    const len = Math.hypot(dx, dy) || 1;
    return [{ faction: f, colour: members[0]!.colour, x: 50 + (FACTION_RADIUS * dx) / len, y: 50 + (FACTION_RADIUS * dy) / len }];
  });
}
