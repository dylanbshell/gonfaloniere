// The screen's view of the player's log: the stream (their History lines, in segments, one for each
// stretch in one conversation; TD v0.40 collapses all but the current one), the latest block 5 state and
// command menu, the open request, the player's notes, and the ending. Everything here comes from events
// the engine built from the player's own History and State, and the public content in their sheet.
//
// TD v0.40's rule for the screen: first-hand only. The decks, the record, and the web are built from the
// sheet (briefing, rules, public content) and the player's own log; nothing here is a model's reading.

import type { Ev } from "./connection.ts";
import type { GlossEntry } from "./words.ts";

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
  /** The stage of the evening the line belongs to (Interface v0.5, Past stages): see `lineStages`. */
  stage?: string;
}

/** A stretch of the evening in one conversation, with the state the player had there. */
export interface Segment {
  conversation: string;
  state: State | null;
  lines: Line[];
}

/** A stretch in one conversation within one stage of the evening (Interface v0.5): the stage bar's unit. */
export interface Run extends Segment {
  stage: string;
}

export interface State {
  phaseLabel: string;
  /**
   * A council (the full game; the mini-game has none) shows only the player's own place (Interface v0.9). No
   * engine sends one yet, nor its faction; without `faction`, the screen names the player's own.
   */
  conversation: { kind: "capannello"; others: string[] } | { kind: "colloquio"; other: string } | { kind: "council"; faction?: string } | { kind: "gathering" };
  present: string[];
  livingOthers: string[];
  florins: number;
  pensionsHeld: number;
  withdrawalCount: number;
  /** TD v0.47: the run's `plot_reward` flag (a run setting, not a secret). The mini-game runs with it off. */
  plotReward?: boolean;
  /** Once the errand's check has run (with `plot_reward` on): whether the player has the extra act, in block 5's words. */
  plotStatus?: string;
  /**
   * Interface v0.8, the midnight line: once the check has run, whether the extra act is the player's, as a
   * flag beside `{plot_status}`'s words. No engine sends it yet (the mini-game runs with `plot_reward` off);
   * without it, the line's "+1" goes once the check has run rather than claim an act the player may not have.
   */
  plotEarned?: boolean;
  /** TD v0.45–v0.48: where every other living guest is, in open play (the AI guests' room line); absent otherwise. */
  room?: { groups: string[][]; colloquios: string[][] };
  /**
   * TD v0.49, Named places: every place in the setting's order, occupied or empty, in open play, in place of
   * `room`; absent outside a conversation.
   */
  places?: Place[];
  [k: string]: unknown;
}

/** One of the hall's places (TD v0.49): its name, its living guests (none if empty), whether it holds a Colloquio, and whether it's the player's own. */
export interface Place {
  name: string;
  guests: string[];
  private: boolean;
  own: boolean;
}

/**
 * The room the screen shows beside the player's own conversation: every other group, then every private
 * pair. From the state's `places` (TD v0.49), the other occupied places in order; before it, its `room`.
 * Null when there's no room to see (midnight, between seats).
 */
export function roomOf(s: State | null): { groups: string[][]; colloquios: string[][] } | null {
  if (s?.places) {
    const others = s.places.filter((p) => !p.own && p.guests.length > 0);
    return { groups: others.filter((p) => !p.private).map((p) => p.guests), colloquios: others.filter((p) => p.private).map((p) => p.guests) };
  }
  return s?.room ?? null;
}

/**
 * The place list (Interface v0.9, Left: The places) from the state's `places` (TD v0.49): every place in the
 * pack's order, empty ones too; in a council, only the player's own. Outside a conversation (midnight, the
 * ballot) in a game that has places, none: the list gives way to a quiet line. Null in a game without
 * places (before TD v0.49, or before the first state), which keeps the room view.
 */
export function placeList(v: View): Place[] | null {
  const s = v.state;
  if (!s || !v.named) return null;
  if (!s.places || s.conversation.kind === "gathering") return [];
  return s.conversation.kind === "council" ? s.places.filter((p) => p.own) : s.places;
}

/** The player's own place in this state (TD v0.49), or null: none sent, or between seats. */
export const ownPlace = (s: State | null): Place | null => s?.places?.find((p) => p.own) ?? null;

/** A place's name as a row's heading (Interface v0.9): the pack's words with only the first letter capitalized. */
export const placeHeading = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1);

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
  /** TD v0.47: the track's stage that is the errand's deadline (the last council before midnight), or null when the schedule has none. */
  errandDeadline?: string | null;
}

/** Il Notaio's reading (TD v0.44) for one or two guests, up to a place in the record; `text` null: the tally instead. */
export interface Reading {
  seq: number;
  guests: string[];
  upTo: number;
  text: string | null;
  tally: string;
  /** TD v0.51: the guarded reading, built by the game (its `text` is null; the tally is its closing line). */
  guarded?: GuardedReading;
}

/**
 * One item of Il Notaio's guarded reading or past-stage summary (TD v0.51): a line in his register (`seq`, the
 * line's own), an event as its own record line (a death by its name), or code's note on a public lore entry.
 */
export type NotaioItem =
  | { kind: "sentence"; seq: number; text: string }
  | { kind: "event"; seq: number; item: "notaio" | "action" | "death"; text: string }
  | { kind: "note"; entry: string; title: string; text: string };

/** TD v0.51's reading: code's background, then a paragraph per stage; `empty` when nothing was heard or seen. */
export interface GuardedReading {
  background: { connections: Connection[]; lore: { entry: string; title: string; text: string }[] };
  stages: { stage: string; heading: string; items: NotaioItem[] }[];
  empty: string | null;
}

/** TD v0.51's summary of a finished stage: bullets by conversation, each group by its first line's seq. */
export interface StageSummary {
  seq: number;
  stage: string;
  groups: { conversation: string; from: number; items: NotaioItem[] }[];
  empty: string | null;
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
  /** The same lines by conversation and stage, in order (Interface v0.5, the stage bar). */
  runs: Run[];
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
  /** TD v0.51: Il Notaio's summaries of finished stages, as they arrive. */
  summaries: StageSummary[];
  /** Who was present at each state update, in order: whether someone left the player's group since a moment. */
  presence: { seq: number; present: string[] }[];
  /** The seq of the player's last own line, for rotating the example line. */
  spoken: number;
  /** The seq of the last line or request: a refusal after it is the latest thing that happened. */
  activity: number;
  /** Whether any state so far carried named places (TD v0.49): the screen shows the place list, not the room. */
  named?: boolean;
}

const isLine = (e: Ev) => e.type === "line" || e.type === "notaio" || e.type === "action";

/**
 * Each line's stage (Interface v0.5), by its seq, from what the screen already receives: block 5's phase
 * label, which comes with every state, and the turn each line carries. A line belongs to the stage in force
 * when it arrived, except a line that opens a new turn ahead of that turn's first state: the engine sends a
 * line's state right after it whenever the state changed, so when such a line is followed at once by a state
 * with another phase label, that label is the line's. Lines before the first state take its label.
 */
export function lineStages(log: Ev[]): Map<number, string> {
  const out = new Map<number, string>();
  let label: string | undefined;
  let turn = -Infinity;
  const early: number[] = [];
  log.forEach((e, i) => {
    if (e.type === "state") {
      label = (e.state as State).phaseLabel;
      for (const seq of early.splice(0)) out.set(seq, label);
    } else if (isLine(e)) {
      const t = typeof e.turn === "number" ? e.turn : turn;
      const next = log[i + 1];
      const after = next?.type === "state" ? (next.state as State).phaseLabel : undefined;
      if (label === undefined) early.push(e.seq);
      else out.set(e.seq, t > turn && after !== undefined && after !== label ? after : label);
      turn = Math.max(turn, t);
    }
  });
  return out;
}

export function derive(log: Ev[]): View {
  const v: View = { stream: [], segments: [], runs: [], state: null, commands: [], speaking: null, sheet: null, pending: null, refusal: null, deaths: [], result: null, notes: [], readings: [], summaries: [], presence: [], spoken: 0, activity: 0 };
  const open = new Map<string, Request>();
  let waiting: Segment[] = [];
  const stages = lineStages(log);
  for (const e of log) {
    if (e.type === "line" || e.type === "notaio" || e.type === "action" || e.type === "request") v.activity = e.seq;
    if (e.type === "line" || e.type === "notaio" || e.type === "action") {
      const l = { ...(e as unknown as Line), item: e.type, seq: e.seq } as Line;
      l.stage = stages.get(e.seq);
      let seg = v.segments.at(-1);
      if (!seg || seg.conversation !== l.conversation) {
        // A segment takes the state the player has once they've arrived (the state after its first line).
        seg = { conversation: l.conversation, state: null, lines: [] };
        v.segments.push(seg);
        waiting.push(seg);
      }
      seg.lines.push(l);
      let run = v.runs.at(-1);
      if (!run || run.conversation !== l.conversation || run.stage !== (l.stage ?? "")) {
        // A run starts with each new conversation, and with each new stage within one.
        run = { conversation: l.conversation, stage: l.stage ?? "", state: null, lines: [] };
        v.runs.push(run);
        waiting.push(run);
      }
      run.lines.push(l);
      v.stream.push(l);
      if (l.item === "line" && l.you) v.spoken++;
    } else if (e.type === "state") {
      v.state = e.state as State;
      if (v.state.places) v.named = true;
      v.presence.push({ seq: e.seq, present: v.state.present ?? [] });
      v.commands = e.commands as Command[];
      v.speaking = (e.speaking as string | null | undefined) ?? null;
      if (e.sheet) v.sheet = e.sheet as unknown as Sheet;
      for (const seg of waiting) seg.state = v.state;
      waiting = [];
    } else if (e.type === "request") {
      if (e.closed) open.delete(e.id as string);
      else open.set(e.id as string, e as unknown as Request);
    } else if (e.type === "refusal") v.refusal = { seq: e.seq, reason: e.reason as string };
    else if (e.type === "death") v.deaths.push({ name: e.name as string, you: !!e.you, seq: e.seq });
    else if (e.type === "result") v.result = e.result as Result;
    else if (e.type === "note") v.notes.push({ id: e.id as string, seq: e.seq, turn: e.turn as number, guests: e.guests as string[], text: e.text as string });
    else if (e.type === "reading") v.readings.push({ seq: e.seq, guests: e.guests as string[], upTo: e.upTo as number, text: (e.text as string | null) ?? null, tally: e.tally as string, ...(e.guarded ? { guarded: e.guarded as GuardedReading } : {}) });
    else if (e.type === "stage-summary") v.summaries.push({ seq: e.seq, stage: e.stage as string, groups: e.groups as StageSummary["groups"], empty: (e.empty as string | null) ?? null });
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

// ---- The glossary (Interface v0.7, Briefing, rules, the city, and the glossary) ------------------------------

/** A line's text with lore links (as loreParts), and the rest with each glossary word as an underlined term. */
export type LinePart = Part | { gloss: GlossEntry; text: string };

/**
 * A line's text with its lore links and glossary words: lore links first, so a word that is both a lore title
 * and a glossary term is a link; in the text between them, each glossary entry's words (whole words, ignoring
 * case, the longest first) become its term, to be underlined and explained on hover.
 */
export function lineParts(text: string, lore: LoreEntry[], glossary: GlossEntry[]): LinePart[] {
  const words = glossary.flatMap((g) => g.match.map((m) => ({ m, g }))).sort((a, b) => b.m.length - a.m.length);
  if (!words.length) return loreParts(text, lore);
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![\\p{L}\\p{N}/])(${words.map((x) => esc(x.m)).join("|")})(?![\\p{L}\\p{N}])`, "giu");
  return loreParts(text, lore).flatMap((p): LinePart[] => {
    if (typeof p !== "string") return [p];
    const out: LinePart[] = [];
    let at = 0;
    for (const m of p.matchAll(re)) {
      const hit = words.find((x) => x.m.toLowerCase() === m[1]!.toLowerCase())!;
      if (m.index! > at) out.push(p.slice(at, m.index));
      out.push({ gloss: hit.g, text: m[1]! });
      at = m.index! + m[1]!.length;
    }
    if (at < p.length) out.push(p.slice(at));
    return out;
  });
}

/** The glossary's list: alphabetical by term (a command by its name, without the slash), narrowed to the entries whose term or definition holds the search. */
export function glossaryList(glossary: GlossEntry[], search = ""): GlossEntry[] {
  const key = (g: GlossEntry) => g.term.replace(/^\//, "").toLowerCase();
  const q = search.trim().toLowerCase();
  return [...glossary].filter((g) => !q || g.term.toLowerCase().includes(q) || g.text.toLowerCase().includes(q)).sort((a, b) => key(a).localeCompare(key(b)));
}

/** "More in the rules": the place of the first rules section the entry names that the rules have (by title, ignoring case), or null. */
export function rulesSectionFor(entry: GlossEntry, cards: Card[]): number | null {
  for (const t of entry.rules) {
    const i = cards.findIndex((c) => c.title.toLowerCase() === t.toLowerCase());
    if (i >= 0) return i;
  }
  return null;
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

/**
 * The evening's track (TD v0.44): each stage done, now, or still to come, by the current phase's name. With
 * a `deadline` (TD v0.47), that stage carries the errand mark.
 */
export function trackMarks(stages: string[], now: string | undefined, deadline: string | null = null): { stage: string; at: "past" | "now" | "next"; deadline: boolean }[] {
  const i = now === undefined ? -1 : stages.indexOf(now);
  return stages.map((stage, j) => ({ stage, at: i < 0 ? "next" : j < i ? "past" : j === i ? "now" : "next", deadline: stage === deadline }));
}

// ---- The stage bar and past stages (Interface v0.5) -------------------------------------------------------

/** Il Notaio's summary of a past stage (TD v0.51), once the game has written it; null before (or on an older TD). */
export const summaryFor = (v: View, stage: string): StageSummary | null => [...v.summaries].reverse().find((s) => s.stage === stage) ?? null;

/** The run a summary's group is about: the stretch of the stage whose first line is its `from`. */
export const runFrom = (v: View, from: number): Run | null => v.runs.find((r) => r.lines[0]?.seq === from) ?? null;

/** The conversations the player was in during one stage, in order: what a past stage shows, read-only. */
export function stageRuns(v: View, stage: string): Run[] {
  return v.runs.filter((r) => r.stage === stage);
}

/**
 * Earlier this stage: the current stage's conversations before the current one. The current conversation
 * (the last segment) shows whole, even where it began in an earlier stage, so it never empties as a stage turns.
 */
export function earlierThisStage(v: View): Run[] {
  const now = v.state?.phaseLabel;
  const from = v.segments.at(-1)?.lines[0]?.seq ?? Infinity;
  return v.runs.filter((r) => r.stage === now && r.lines[0]!.seq < from);
}

/** The past stages a guest appears in (spoke, was present, or was named in an event): the bar's dots for a selected guest. */
export function stagesWith(v: View, name: string): Set<string> {
  const now = v.state?.phaseLabel;
  return new Set(v.runs.filter((r) => r.stage !== now && appearsIn(r, name)).map((r) => r.stage));
}

// ---- The errand's extra act (TD v0.47) -------------------------------------------------------------------

/** The errand's deadline on the track: with `plot_reward` on, the stage the schedule names, if the track has it; else null. */
export function errandDeadline(v: View): string | null {
  const d = v.sheet?.errandDeadline;
  return v.state?.plotReward && d && v.sheet?.track?.includes(d) ? d : null;
}

/**
 * The errand card's line under the errand: once the check has run, `{plot_status}`'s words; before, with
 * `plot_reward` on, what finishing it earns; with it off, that errands earn no extra act tonight. Null
 * before the first state.
 */
export function errandLine(s: State | null): { kind: "status"; text: string } | { kind: "reward" | "noReward" } | null {
  if (!s) return null;
  if (s.plotStatus) return { kind: "status", text: s.plotStatus };
  return { kind: s.plotReward ? "reward" : "noReward" };
}

/**
 * The midnight line in the sheet (Interface v0.8, Left): one act at midnight always, and with `plot_reward`
 * on, the extra act the errand can earn, from what the errand card already uses (`errandLine`): before the
 * check, "+1 if you finish your errand"; after it, "+1 earned" when the extra act is the player's, and
 * nothing otherwise. Never a check's result before the check has run.
 */
export function midnightLine(s: State | null): { extra: "reward" | "earned" | null } {
  const line = errandLine(s);
  if (line?.kind === "reward") return { extra: "reward" };
  if (line?.kind === "status" && s?.plotReward && s.plotEarned === true) return { extra: "earned" };
  return { extra: null };
}

/**
 * Whether it's the last round before the errand's deadline (TD v0.47, Il Notaio's hint): the stage just
 * before the deadline on the track. It reads only the schedule, never the errand's check, so the hint
 * never gives a result away early.
 */
export function lastRoundBeforeDeadline(v: View): boolean {
  const d = errandDeadline(v);
  const track = v.sheet?.track ?? [];
  const i = d ? track.indexOf(d) : -1;
  return i > 0 && v.state?.phaseLabel === track[i - 1];
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
  // TD v0.47: the last round to finish the errand for its extra act, whether or not it's done.
  if (lastRoundBeforeDeadline(v)) return { key: "errandDeadline", values: {} };
  return { key: "mingling", values: {} };
}

// ---- The web (TD v0.40; Interface v0.5, the ring layout) --------------------------------------------------

/** The ring's centre and radius, in the diagram's own units (0–100 each way). */
const CENTRE = 50;
const RING = 38;
/** The faction arcs sit outside the guests and their names; each faction's name at its arc's corner. */
const ARC_RADIUS = 48;
const LABEL_RADIUS = 53;
/** The gap between two factions' arcs, as a share of one guest's slice of the ring. */
const ARC_GAP = 0.18;

/** The guests in ring order: each faction together, in the setting's faction order. */
function ringOrder<R extends { name: string; faction: string }>(roster: R[], factions: readonly string[]): R[] {
  // An unknown faction (or no factions list at all: an older server's start information) sorts after the known ones, in roster order.
  const place = (f: string) => (factions.indexOf(f) + factions.length + 1) % (factions.length + 1);
  return [...roster].sort((a, b) => place(a.faction) - place(b.faction));
}

/** The angle of the ring's i-th place of n: from the top, clockwise on the screen. */
const angle = (i: number, n: number) => (i / n) * 2 * Math.PI - Math.PI / 2;
const onCircle = (t: number, r: number) => ({ x: CENTRE + r * Math.cos(t), y: CENTRE + r * Math.sin(t) });
const round = (x: number) => Math.round(x * 100) / 100;

/**
 * Where each guest sits in the web: around a ring, each faction together in its own part, in the
 * setting's faction order (Interface v0.5, laid out like the board's Web of Secrets). Coordinates are in
 * the diagram's own units (0–100 each way).
 */
export function webLayout(roster: { name: string; faction: string }[], factions: readonly string[] = []): Map<string, { x: number; y: number }> {
  const order = ringOrder(roster, factions);
  const at = new Map<string, { x: number; y: number }>();
  order.forEach((g, i) => at.set(g.name, onCircle(angle(i, order.length), RING)));
  return at;
}

/**
 * Each faction's arc (Interface v0.5): a stroke in the faction's colour around its part of the ring,
 * outside its guests and their names, with the faction's name at the arc's first corner. `d` is the arc's
 * SVG path; `anchor` is the name's text-anchor, so it reads away from the arc. Factions with no guest on
 * the web are left out.
 */
export function factionArcs(roster: { name: string; faction: string; colour?: string }[], factions: readonly string[] = []): { faction: string; colour: string | undefined; d: string; x: number; y: number; anchor: "start" | "middle" | "end" }[] {
  const order = ringOrder(roster, factions);
  const n = order.length;
  if (!n) return [];
  const half = Math.PI / n;
  const out: { faction: string; colour: string | undefined; d: string; x: number; y: number; anchor: "start" | "middle" | "end" }[] = [];
  for (let i = 0; i < n; ) {
    let j = i;
    while (j + 1 < n && order[j + 1]!.faction === order[i]!.faction) j++;
    // The whole ring for one faction alone: two half-circles, since one arc can't close on itself.
    const whole = i === 0 && j === n - 1;
    const from = angle(i, n) - half * (1 - ARC_GAP);
    const to = whole ? from + 2 * Math.PI - 2 * half * ARC_GAP : angle(j, n) + half * (1 - ARC_GAP);
    const a = onCircle(from, ARC_RADIUS);
    const b = onCircle(to, ARC_RADIUS);
    const mid = onCircle((from + to) / 2, ARC_RADIUS);
    const r = ARC_RADIUS;
    const d = to - from > Math.PI ? `M ${round(a.x)} ${round(a.y)} A ${r} ${r} 0 0 1 ${round(mid.x)} ${round(mid.y)} A ${r} ${r} 0 0 1 ${round(b.x)} ${round(b.y)}` : `M ${round(a.x)} ${round(a.y)} A ${r} ${r} 0 0 1 ${round(b.x)} ${round(b.y)}`;
    const corner = onCircle(from, LABEL_RADIUS);
    const side = corner.x - CENTRE;
    out.push({ faction: order[i]!.faction, colour: order[i]!.colour, d, x: round(corner.x), y: round(corner.y), anchor: Math.abs(side) < 4 ? "middle" : side < 0 ? "end" : "start" });
    i = j + 1;
  }
  return out;
}

/**
 * Each faction's label in the web (TD v0.44; Interface v0.5): its name, in its colour, at the corner of
 * its arc. Factions with no guest on the web are left out.
 */
export function factionLabels(roster: { name: string; faction: string; colour?: string }[], factions: readonly string[], _at?: Map<string, { x: number; y: number }>): { faction: string; colour: string | undefined; x: number; y: number }[] {
  return factionArcs(roster, factions).map(({ faction, colour, x, y }) => ({ faction, colour, x, y }));
}

/** How far a line between two guests bows toward the ring's centre: 0 straight, 1 through the centre. */
const BOW = 0.6;

/**
 * A line between two guests (Interface v0.5): it curves through the middle of the ring rather than running
 * straight, bowed toward the centre, so lines between neighbours don't run along the ring.
 */
export function curve(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const cx = mx + (CENTRE - mx) * BOW;
  const cy = my + (CENTRE - my) * BOW;
  return `M ${round(a.x)} ${round(a.y)} Q ${round(cx)} ${round(cy)} ${round(b.x)} ${round(b.y)}`;
}

// ---- One selection, shared with the Web of Secrets (Interface v0.6, Selection) ------------------------------

/**
 * The one selection of guests the chat and the Web of Secrets share, and the chat's lore topic. `guests`
 * holds up to two, oldest first, so the last is the one picked last: the one the chat shows. A lore topic
 * takes the chat's one selection, so it holds no guests; `back` is the guest it replaced, for its back control.
 */
export interface SharedSelection {
  guests: string[];
  lore: { entry: LoreEntry; back: string | null } | null;
}

export const NO_SELECTION: SharedSelection = { guests: [], lore: null };

/** The guest the chat shows: the one picked last, or none. */
export const chatGuest = (s: SharedSelection): string | null => (s.lore ? null : (s.guests.at(-1) ?? null));

/**
 * A guest selected in the chat (the stream, the room, the left, the right panel): a new selection replaces
 * the last, or the pair, with that one guest; selecting the guest the chat shows clears both places.
 */
export function selectInChat(s: SharedSelection, name: string): SharedSelection {
  return chatGuest(s) === name ? NO_SELECTION : { guests: [name], lore: null };
}

/**
 * A guest selected in the web: a first, then a second; a third replaces the older; selecting a selected
 * guest drops them, so the chat holds the one left.
 */
export function selectInWeb(s: SharedSelection, name: string): SharedSelection {
  const p = s.guests;
  return { guests: p.includes(name) ? p.filter((x) => x !== name) : p.length < 2 ? [...p, name] : [p[1]!, name], lore: null };
}

/** A lore topic: it takes the chat's one selection, clearing the guests in both places; the same topic again goes back. */
export function selectLore(s: SharedSelection, entry: LoreEntry): SharedSelection {
  if (s.lore?.entry.id === entry.id) return selectBack(s);
  return { guests: [], lore: { entry, back: s.lore ? s.lore.back : chatGuest(s) } };
}

/** Back from a lore topic to the guest it replaced, if any; from a guest, a clear. */
export function selectBack(s: SharedSelection): SharedSelection {
  return s.lore?.back ? { guests: [s.lore.back], lore: null } : NO_SELECTION;
}

// ---- The placeholder carries the example (Interface v0.5, The input box) ---------------------------------

/**
 * The input box's placeholder: one of the setting pack's examples, rotated, using only commands allowed
 * right now, with a guest the player could address. Each example names its command by action, and fills
 * `{command}` with that command's name and `{guest}` with the guest. Null when no example fits (no command
 * allowed, or no one to address), so the box's plain placeholder shows.
 */
export function placeholderExample(examples: { action: string; text: string }[], commands: Command[], guest: string | null, turn: number): string | null {
  if (!guest) return null;
  const fit = examples.flatMap((e) => {
    const c = commands.find((x) => x.action === e.action);
    return c ? [e.text.replace(/\{command\}/g, c.name).replace(/\{guest\}/g, guest)] : [];
  });
  return fit.length ? fit[turn % fit.length]! : null;
}

// ---- The city as a list (Interface v0.5) ------------------------------------------------------------------

/** The city's list: its public entries under subject headers, as cityCards orders them; entries without a subject last. */
export function cityList(lore: LoreEntry[]): { subject: string | null; entries: LoreEntry[] }[] {
  const order = cityCards(lore).map((c) => lore.find((e) => e.title === c.title && e.text === c.text)!);
  const out: { subject: string | null; entries: LoreEntry[] }[] = [];
  for (const e of order) {
    if (out.at(-1)?.subject !== e.subject || !out.length) out.push({ subject: e.subject, entries: [] });
    out.at(-1)!.entries.push(e);
  }
  return out;
}

/** A lore entry's one-line preview for the city's list: its first line. */
export const preview = (e: LoreEntry): string => e.text.split("\n").find((l) => l.trim())?.trim() ?? "";

// ---- One Notes tab (Interface v0.7, The Web of Secrets, Notes) ----------------------------------------------

/** A section of the notes list: under a heading naming its guest or pair (`about`; [] for free notes), or none (null). */
export interface NoteSection {
  about: string[] | null;
  notes: Note[];
}

export const sameGuests = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/**
 * The one list of the player's notes, newest first, filtered by the shared selection. No one selected: every
 * note, grouped by guest and pair (free notes too), each group where its newest note falls. One guest: their
 * notes and any pair's that includes them, in one list. A pair: the pair's notes first, then each of the
 * two's, under small headings. Sections with no notes are left out.
 */
export function notesFor(notes: Note[], picked: string[]): NoteSection[] {
  const newest = [...notes].reverse();
  if (picked.length === 0) {
    const out: NoteSection[] = [];
    for (const n of newest) {
      const at = out.find((s) => sameGuests(s.about!, n.guests));
      if (at) at.notes.push(n);
      else out.push({ about: n.guests, notes: [n] });
    }
    return out;
  }
  if (picked.length === 1) {
    const on = newest.filter((n) => n.guests.includes(picked[0]!));
    return on.length ? [{ about: null, notes: on }] : [];
  }
  return [picked, [picked[0]!], [picked[1]!]].map((about) => ({ about, notes: newest.filter((n) => sameGuests(n.guests, about)) })).filter((s) => s.notes.length > 0);
}
