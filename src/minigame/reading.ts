// Il Notaio's reading in the Web of Secrets (TD v0.44, Player Interface, The screen; CC-20261113-02, #90):
// the screen's one model summary. For one guest or a pair, it is fed only first-hand material: the public
// connection lines that involve them, the player character's own (from their briefing), and the record the
// viewer shows (what the player heard and saw of them, the most recent 40 entries). Every double-quoted span
// in the reading is checked against that material, and a reading with one that isn't found is dropped for
// the plain tally. Built from the player's own event log, through the screen's own record code, so the
// reading's record and the viewer's are the same.

import type { GuardedReading, NotaioItem, Outgoing, OutgoingBody } from "../core/protocol.ts";
import { inWorldNames } from "../prompt/names.ts";
import { say } from "../setting/pack.ts";
import type { SystemPrompt } from "../sources/docs.ts";
import { derive, heardAndSaw, loreParts, type Line, type LoreEntry } from "../../web/src/model.ts";
import { namesOf, promptLine, type GuardLine, type GuardVerdict } from "./guard.ts";
import { quoteIn, type TimeLabel } from "./memory.ts";
import { playerSays } from "./player.ts";

/** TD: "most recent 40 entries". */
export const READING_RECORD_MAX = 40;
/** TD: two or three short sentences; room to spare. */
export const READING_MAX_TOKENS = 300;

export interface ReadingMaterial {
  guests: string[];
  publicLines: string[];
  ownLines: string[];
  /** The record, oldest first, each entry with its time label. */
  record: string[];
  /** The seq of the record's newest entry (0 for none): the reading stands until the record grows. */
  upTo: number;
  tally: string;
}

interface Connection {
  between: string[];
  type: string;
  line: string;
  private?: boolean;
}

/** The selection as TD's `{selection}` writes it: one name, or two joined by "and". */
export const selectionText = (guests: string[]) => guests.join(" and ");

/** A count's words from player.json's `screen.reading.<key>`: its `0`, `1`, or `n` form. */
const counted = (key: string, n: number, who: string) => playerSays(`screen.reading.${key}.${n === 0 ? "0" : n === 1 ? "1" : "n"}`, { n, who });

/**
 * The material for a reading, from the player's own log (`log`) and their sheet's connections. Time labels
 * as block 6 writes them (`when`); a death takes the time of the last line before it.
 */
export function readingMaterial(me: string, guests: string[], log: Outgoing[], connections: Connection[], when: TimeLabel): ReadingMaterial {
  const v = derive(log as unknown as Parameters<typeof derive>[0]);
  const { heard, saw } = heardAndSaw(v, guests, me);
  const involves = (c: Connection) => c.between.some((g) => guests.includes(g));
  const publicLines = connections.filter((c) => !c.private && involves(c)).map((c) => `${selectionText(c.between)}: ${c.line}`);
  const ownLines = connections.filter((c) => c.private && involves(c)).map((c) => `${c.between.find((g) => g !== me) ?? c.between[0]}: ${c.line}`);
  const turnOf = (l: Line) => (l as Line & { turn?: number }).turn ?? 0;
  const turnAt = (seq: number) => turnOf([...v.stream].reverse().find((l) => l.seq < seq) ?? ({ turn: 0 } as unknown as Line));
  const narrator = inWorldNames().narrator.name;
  const render = (l: Line): string => {
    const t = when(turnOf(l));
    if (l.item === "line") {
      const speaker = l.you ? "you" : l.speaker!;
      const to = l.addressee ? ` (to ${l.addressee === me ? "you" : l.addressee})` : "";
      return `${t} · ${speaker}${to}: "${l.text}"`;
    }
    return l.item === "notaio" ? `${t} · ${narrator}: "${l.text}"` : `${t} · ${l.text}`;
  };
  const entries = [
    ...heard.map((l) => ({ seq: l.seq, text: render(l) })),
    ...saw.map((s) => (s.kind === "line" ? { seq: s.line.seq, text: render(s.line) } : { seq: s.seq, text: `${when(turnAt(s.seq))} · ${playerSays("screen.web.died", { name: s.name })}` })),
  ]
    .sort((a, b) => a.seq - b.seq)
    .slice(-READING_RECORD_MAX);
  const who = guests.length === 1 ? guests[0]! : playerSays("screen.reading.both");
  const tally = playerSays("screen.reading.tally", { heard: counted(guests.length === 1 ? "heard" : "heardPair", heard.length, who), saw: counted("saw", saw.length, who) });
  return { guests, publicLines, ownLines, record: entries.map((e) => e.text), upTo: entries.at(-1)?.seq ?? 0, tally };
}

/**
 * TD's prompt, filled: the setting pack's words in place of the two TD names ("The words … and … come
 * from the setting pack"), then the material.
 */
export function readingPrompt(p: SystemPrompt & { names: [string, string] }, m: ReadingMaterial): { system: string; user: string } {
  const [name, role] = p.names;
  const swap = (s: string) => s.split(name).join(inWorldNames().narrator.name).split(role).join(say("notaio", "reading.role"));
  const list = (xs: string[], none: string) => (xs.length ? xs.join("\n") : none);
  const values: Record<string, string> = {
    selection: selectionText(m.guests),
    public_lines: list(m.publicLines, "Nothing."),
    own_lines: list(m.ownLines, "Nothing."),
    record: list(m.record, "Nothing yet."),
  };
  return { system: swap(p.system), user: swap(p.user).replace(/\{(selection|public_lines|own_lines|record)\}/g, (_, k: string) => values[k]!) };
}

/**
 * TD: "Code checks every quote against the material." Every span in double quotation marks (straight or
 * curly) must be in the material word for word, after normalizing spaces, quote marks, and case as the
 * extraction passes do; an ellipsis splits a quote into parts, each checked, and a quote's own closing
 * punctuation is let go. A reading with no quotes passes. Returns the spans not found.
 */
export function unfoundQuotes(reading: string, material: string): string[] {
  const spans = [...reading.matchAll(/"([^"\n]+)"|“([^”\n]+)”/g)].map((m) => (m[1] ?? m[2])!);
  return spans.filter((q) =>
    q
      .split(/…|\.\.\./)
      .map((part) => part.trim().replace(/[.,;:!?]+$/, ""))
      .filter(Boolean)
      .some((part) => !quoteIn(part, material)),
  );
}

// ---- TD v0.51: the guarded reading and past-stage summaries (CC-20261114-19, #146) ----------------------
//
// Code chooses the lines Il Notaio speaks of, by rules that never read them (content-blind); the model only
// puts each in reported speech (guard.ts checks every word); code writes the background, places the events
// the player saw as their own record lines, and adds a note after a line that names a public lore entry.

/** A line code chose for Il Notaio: where it is in the player's log, and what the model is given of it. */
export interface ChosenLine {
  seq: number;
  stage: string;
  conversation: string;
  speaker: string;
  addressee: string | null;
  /** Addressed to the player, or spoken in a Colloquio with them (which TD counts as addressed to them). */
  toPlayer: boolean;
  words: string;
}

/** TD: up to 8 lines in a reading; up to 10 in a past stage's summary. */
export const READING_LINES_MAX = 8;
export const SUMMARY_LINES_MAX = 10;
/** One sentence per line, each up to 40 quoted words and a few more: room to spare for ten. */
export const GUARDED_MAX_TOKENS = 1500;

/** A public lore entry as the screen has it, with the optional gloss (TD v0.51). */
export interface PublicLore {
  id: string;
  title: string;
  aliases: string[];
  subject: string | null;
  text: string;
  gloss?: string;
}

type V = ReturnType<typeof derive>;

/** The kind of conversation each line of the player's log was in, by the state the player had there. */
function inColloquio(v: V): Set<number> {
  const out = new Set<number>();
  for (const seg of v.segments) if (seg.state?.conversation.kind === "colloquio") for (const l of seg.lines) out.add(l.seq);
  return out;
}

/** Every line of another guest's the player heard, as code may choose it (never the player's own). */
function heardLines(v: V, me: string): ChosenLine[] {
  const aside = inColloquio(v);
  return v.stream
    .filter((l) => l.item === "line" && !l.you && l.speaker !== me)
    .map((l) => ({ seq: l.seq, stage: l.stage ?? "", conversation: l.conversation, speaker: l.speaker!, addressee: l.addressee && l.addressee !== me ? l.addressee : null, toPlayer: l.addressee === me || aside.has(l.seq), words: l.text }));
}

/** First every line to the player (the most recent, if there are more), then the most recent of the rest: up to `max`, oldest first. */
function firstToPlayer(lines: ChosenLine[], max: number, also: ChosenLine[] = []): ChosenLine[] {
  const picked = new Set<number>();
  const take = (xs: ChosenLine[]) => {
    for (const l of [...xs].sort((a, b) => b.seq - a.seq)) if (picked.size < max) picked.add(l.seq);
  };
  take(lines.filter((l) => l.toPlayer));
  take(also);
  take(lines);
  return lines.filter((l) => picked.has(l.seq));
}

/**
 * TD v0.51, which lines a reading speaks of (content-blind). One guest: the lines they spoke in the player's
 * presence. A pair: the lines either spoke to the other, by the addressee field. Those to the player first,
 * then the most recent of the rest, up to 8, oldest first.
 */
export function readingLines(v: V, me: string, guests: string[]): ChosenLine[] {
  const all = heardLines(v, me);
  const mine = guests.length === 1 ? all.filter((l) => l.speaker === guests[0]) : all.filter((l) => guests.includes(l.speaker) && !!l.addressee && guests.includes(l.addressee) && l.addressee !== l.speaker);
  return firstToPlayer(mine, READING_LINES_MAX);
}

/**
 * TD v0.51, which lines a past stage's summary speaks of (content-blind): in that stage's conversations, every
 * line to the player, then the last two of each conversation, then the most recent of the rest, up to 10.
 */
export function summaryLines(v: V, me: string, stage: string): ChosenLine[] {
  const all = heardLines(v, me).filter((l) => l.stage === stage);
  const runs = v.runs.filter((r) => r.stage === stage);
  const lastTwo = runs.flatMap((r) => {
    const seqs = new Set(r.lines.map((l) => l.seq));
    return all.filter((l) => seqs.has(l.seq)).slice(-2);
  });
  return firstToPlayer(all, SUMMARY_LINES_MAX, lastTwo);
}

/** The model's lines (guard.ts), numbered in the order chosen. */
export const guardLines = (chosen: ChosenLine[]): GuardLine[] => chosen.map((c, i) => ({ n: i + 1, speaker: c.speaker, addressee: c.addressee, toPlayer: c.toPlayer, words: c.words }));

/** TD's prompt with `{lines}` filled, and nothing else: no event, background, note, time label, or selection. */
export function guardedPrompt(p: SystemPrompt & { names: [string, string] }, lines: GuardLine[]): { system: string; user: string } {
  const [name, role] = p.names;
  const swap = (s: string) => s.split(name).join(inWorldNames().narrator.name).split(role).join(say("notaio", "reading.role"));
  return { system: swap(p.system), user: swap(p.user).replace("{lines}", () => lines.map(promptLine).join("\n")) };
}

/** A lore entry's note (TD v0.51): its gloss, or until it has one, its first two sentences. */
export const glossOf = (e: { text: string; gloss?: string }): string =>
  e.gloss ??
  (e.text.trim().match(/^.*?[.!?](?=\s|$)(?:\s+.*?[.!?](?=\s|$))?/s)?.[0] ?? e.text.trim());

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The reading's background (TD v0.51), code only: the connection lines that involve the selection (the public
 * ones and the player's own), verbatim, then up to two public lore entries whose text names a selected guest
 * by full name or alias (whole words, ignoring case), each with its note.
 */
export function readingBackground(guests: string[], connections: Connection[], lore: PublicLore[]): GuardedReading["background"] {
  const involves = (c: Connection) => c.between.some((g) => guests.includes(g));
  const names = guests.flatMap(namesOf);
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${names.map(escape).join("|")})(?![\\p{L}\\p{N}])`, "iu");
  return {
    connections: connections.filter(involves).map((c) => ({ between: c.between, type: c.type, line: c.line, ...(c.private && { private: true }) })),
    lore: lore
      .filter((e) => re.test(e.text))
      .slice(0, 2)
      .map((e) => ({ entry: e.id, title: e.title, text: glossOf(e) })),
  };
}

/** The first public lore entry a line's words name (the stream's lore links' match), or null. */
function firstLore(words: string, lore: PublicLore[]): PublicLore | null {
  const hit = loreParts(words, lore as LoreEntry[]).find((p) => typeof p !== "string");
  return hit && typeof hit !== "string" ? (hit.entry as PublicLore) : null;
}

/** An event the player saw, as the reading places it. */
export interface SeenEvent {
  seq: number;
  stage: string;
  item: "notaio" | "action" | "death";
  text: string;
}

/** The stage in force at each seq of the log: for a death, which carries no turn. */
function stageAt(log: Outgoing[], seq: number): string {
  let label = "";
  for (const e of log) {
    if (e.seq > seq) break;
    if (e.type === "state") label = (e.state as { phaseLabel?: string }).phaseLabel ?? label;
  }
  return label;
}

/**
 * The events the player saw that involve the selection (the record's own lines, word for word), oldest first:
 * the screen's "what you saw" (Il Notaio's notes and action lines whose `about` names them, and deaths), less
 * the notes about every guest at once (the attendance note), which name the selection only as one of all.
 */
export function readingEvents(v: V, log: Outgoing[], me: string, guests: string[], cast: readonly string[]): SeenEvent[] {
  return heardAndSaw(v, guests, me)
    .saw.filter((s) => s.kind !== "line" || !cast.every((c) => s.line.about?.includes(c)))
    .map((s): SeenEvent => (s.kind === "line" ? { seq: s.line.seq, stage: s.line.stage ?? "", item: s.line.item as "notaio" | "action", text: s.line.text } : { seq: s.seq, stage: stageAt(log, s.seq), item: "death", text: s.name }))
    .sort((a, b) => a.seq - b.seq);
}

/**
 * The items of one paragraph or group, in the order they happened: each chosen line's sentence (the guard's
 * verdict), then its note when it names a public lore entry not yet noted here; and each event.
 */
function items(chosen: ChosenLine[], verdicts: GuardVerdict[], events: SeenEvent[], lore: PublicLore[], noted: Set<string>): NotaioItem[] {
  const all = [...chosen.map((c, i) => ({ seq: c.seq, line: c, verdict: verdicts[i]! })), ...events.map((e) => ({ seq: e.seq, event: e }))].sort((a, b) => a.seq - b.seq);
  return all.flatMap((x): NotaioItem[] => {
    if ("event" in x) return [{ kind: "event", seq: x.seq, item: x.event!.item, text: x.event!.text }];
    const out: NotaioItem[] = [{ kind: "sentence", seq: x.seq, text: x.verdict.text }];
    const e = firstLore(x.line.words, lore);
    if (e && !noted.has(e.id)) {
      noted.add(e.id);
      out.push({ kind: "note", entry: e.id, title: e.title, text: glossOf(e) });
    }
    return out;
  });
}

/** A stage paragraph's opening words (notaio.json): "In the first round of mingling, early:". */
const stageHeading = (stage: string) => say("notaio", "reading.stage", { stage: stage.charAt(0).toLowerCase() + stage.slice(1) });

/** TD v0.51's reading, assembled: the background, then a paragraph per stage in the track's order. */
export function assembleReading(background: GuardedReading["background"], chosen: ChosenLine[], verdicts: GuardVerdict[], events: SeenEvent[], lore: PublicLore[], track: string[]): GuardedReading {
  const noted = new Set<string>();
  const stages = [...new Set([...chosen.map((c) => c.stage), ...events.map((e) => e.stage)])].sort((a, b) => order(track, a) - order(track, b));
  return {
    background,
    stages: stages.map((stage) => ({
      stage,
      heading: stageHeading(stage),
      items: items(
        chosen.filter((c) => c.stage === stage),
        verdicts.filter((_, i) => chosen[i]!.stage === stage),
        events.filter((e) => e.stage === stage),
        lore,
        noted,
      ),
    })),
    empty: chosen.length || events.length ? null : say("notaio", "reading.empty"),
  };
}

const order = (track: string[], stage: string) => (track.indexOf(stage) < 0 ? Infinity : track.indexOf(stage));

/**
 * TD v0.51's past-stage summary, assembled: bullets grouped by conversation (each stretch the player was in
 * during the stage), in order, each with its lines' sentences and notes and the events seen there.
 */
export function assembleSummary(v: V, stage: string, chosen: ChosenLine[], verdicts: GuardVerdict[], lore: PublicLore[]): Extract<OutgoingBody, { type: "stage-summary" }> {
  const noted = new Set<string>();
  const runs = v.runs.filter((r) => r.stage === stage);
  const groups = runs.map((r) => {
    const seqs = new Set(r.lines.map((l) => l.seq));
    const at = chosen.map((c, i) => (seqs.has(c.seq) ? i : -1)).filter((i) => i >= 0);
    const events = r.lines.filter((l) => l.item !== "line").map((l): SeenEvent => ({ seq: l.seq, stage, item: l.item as "notaio" | "action", text: l.text }));
    return {
      conversation: r.conversation,
      from: r.lines[0]!.seq,
      items: items(
        at.map((i) => chosen[i]!),
        at.map((i) => verdicts[i]!),
        events,
        lore,
        noted,
      ),
    };
  });
  return { type: "stage-summary", stage, groups: groups.filter((g) => g.items.length), empty: chosen.length ? null : say("notaio", "reading.emptyStage") };
}
