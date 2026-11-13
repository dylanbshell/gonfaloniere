// Il Notaio's reading in the Web of Secrets (TD v0.44, Player Interface, The screen; CC-20261113-02, #90):
// the screen's one model summary. For one guest or a pair, it is fed only first-hand material: the public
// connection lines that involve them, the player character's own (from their briefing), and the record the
// viewer shows (what the player heard and saw of them, the most recent 40 entries). Every double-quoted span
// in the reading is checked against that material, and a reading with one that isn't found is dropped for
// the plain tally. Built from the player's own event log, through the screen's own record code, so the
// reading's record and the viewer's are the same.

import type { Outgoing } from "../core/protocol.ts";
import { inWorldNames } from "../prompt/names.ts";
import { say } from "../setting/pack.ts";
import type { SystemPrompt } from "../sources/docs.ts";
import { derive, heardAndSaw, type Line } from "../../web/src/model.ts";
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
