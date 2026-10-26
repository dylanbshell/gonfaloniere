// Memory for the mini-game (Technical Design v0.9, Memory Architecture and
// Memory Writing): the game's lines and thoughts with IDs, longTermHistory
// entries and beliefs, the checks every extraction entry must pass before it
// is stored (Output Validation & Repair: Memory entries, Sweep, Beliefs),
// retrieval for block 6, and rendering for prompts and checks. Pure: the
// recorder (extract.ts) makes the model calls.

import { z } from "zod";
import { ALIASES, ROSTER, resolveAlias, type CharacterName } from "../game/roster.ts";
import type { MemoryRules } from "../sources/docs.ts";
import type { Took } from "../output/think.ts";
import { nearMiss } from "../output/think.ts";

/** One line of the evening, with a game-wide ID (L…). */
export interface GameLine {
  id: string;
  turn: number;
  conversation: string;
  /** Where it was said: the conversation's kind and everyone in it at the time. */
  where: Where;
  kind: "speech" | "notaio" | "event" | "private";
  speaker: CharacterName | null;
  addressee: CharacterName | null;
  text: string;
  /** Who heard it: everyone present, or for a private action the actor only. */
  heardBy: CharacterName[];
}

export interface Where {
  kind: "capannello" | "colloquio" | "gathering";
  members: CharacterName[];
}

/** "Capannello with A, B" or "Colloquio with A", from one character's point of view (or everyone's). */
export function whereLabel(w: Where, forChar?: CharacterName): string {
  if (w.kind === "gathering") return "The gathering";
  const others = w.members.filter((m) => m !== forChar);
  return `${w.kind === "colloquio" ? "Colloquio" : "Capannello"} with ${others.join(", ")}`;
}

/** One private thought from any character call (T…). */
export interface Thought {
  id: string;
  turn: number;
  character: CharacterName;
  call: string;
  text: string;
  /** TD v0.6 shortTermHistory: an exact repeat of the character's previous thought, logged but not shown again or passed to 10b. */
  repeat?: boolean;
  /** TD v0.8: the line the character had last heard when the thought was made; for think(), the line it reacted to. */
  after_line?: string | null;
  /** TD v0.9, think() only: how the character took the last thing said aloud (none included). */
  took?: Took;
  /** think() only: the conversation the thought was made in. */
  conversation?: string;
  /** TD v0.9: a closing think, after a Colloquio's last line (its importance and done are ignored). */
  closing?: boolean;
}

export const ENTRY_TYPES = ["promise", "deal", "threat", "admission", "claim", "denial"] as const;
/** Which types each pass records (TD v0.6: 10a ★ pass, 10d claims pass). */
export const PASS_TYPES = { "10a": ["promise", "deal", "threat", "admission"], "10d": ["claim", "denial"] } as const;
export type EntryType = (typeof ENTRY_TYPES)[number] | "payment" | "pension" | "event";
const SALIENT: EntryType[] = ["promise", "deal", "threat", "admission", "payment", "pension"];

/** A longTermHistory entry (M…), as TD's Memory Writing table stores it. */
export interface MemoryEntry {
  id: string;
  turn: number;
  conversation: string;
  where: Where;
  type: EntryType;
  speaker: CharacterName | null;
  parties?: CharacterName[];
  toward: string | null;
  about: string[];
  summary: string;
  quote: string | null;
  /** The line the entry rests on, then its context lines (TD v0.6); for code-written entries, the action line. */
  lines: string[];
  /** TD v0.6: the one line the entry rests on, and its supporting lines (model entries only). */
  line?: string;
  context?: string[];
  audience: CharacterName[];
  salient: boolean;
  source: "10a" | "10d" | "code";
}

/** What a character took a line as: the six kinds, as the character sees them. */
export const READING_KINDS = ["promise", "deal", "threat", "admission", "claim", "denial"] as const;
const SALIENT_READINGS = ["promise", "deal", "threat", "admission"];

/**
 * A reading (R…), TD v0.9's perceived notebook: how one character took a line, labelled by the
 * character in its own think() (`took`) and attached to the line by code. No model fills anything
 * but `took` (TD v0.9, The perceived notebook, A reading as stored).
 */
export interface Reading {
  id: string;
  /** Whose notebook it is (stored for this character only). */
  character: CharacterName;
  turn: number;
  conversation: string;
  line: string;
  speaker: CharacterName;
  took: (typeof READING_KINDS)[number];
  /** The think() the label came from. */
  thought: string;
  /** The speaker, the line's addressee if any, and every roster name or alias in the line. */
  about: CharacterName[];
  own: boolean;
  salient: boolean;
}

/** A `took` label the attachment rule ignored (no spoken line) or logged (not stored), with the reason. */
export interface LabelLogEntry {
  turn: number;
  character: CharacterName;
  thought: string;
  took: Took;
  line: string | null;
  reason: "no spoken line" | "later different label" | "same label again";
  /** For a later label: the reading that stands. */
  standing?: string;
}

/**
 * A reading from TD v0.8's perception pass (10e), kept for the replay-only perception mode: the
 * speaker's exact words and the character's reaction quoted from their thought.
 */
export interface PerceptionReading {
  id: string;
  character: CharacterName;
  turn: number;
  conversation: string;
  where: Where;
  speaker: CharacterName;
  line: string;
  quote: string;
  took: (typeof READING_KINDS)[number];
  thought: string | null;
  reaction: string | null;
  about: string[];
  /** The character spoke the line. */
  own: boolean;
  salient: boolean;
}

/** One item of 10e's timeline (TD v0.8, replay only): a line the character heard or spoke, or a think() thought after its line. */
export type TimelineItem = { kind: "line"; line: GameLine } | { kind: "thought"; thought: Thought };

/** A belief (B…) from the thought pass. Nothing is deleted; "dropped" sets the status. */
export interface Belief {
  id: string;
  character: CharacterName;
  kind: "conclusion" | "suspicion";
  status: "held" | "dropped";
  statement: string;
  firstTurn: number;
  lastTurn: number;
  thought: string;
  quote: string;
  /** TD v0.6 hedge rule: the model said "conclusion" but the quote's sentence hedges, so code stored a suspicion. */
  downgraded?: boolean;
}

/** An extraction entry that failed a check, kept for the gate 8 report. */
export interface DroppedEntry {
  pass: "10a" | "10b" | "10d" | "10e";
  turn: number;
  scope: string;
  reason: string;
  entry: unknown;
}

/** A code repair to an extraction entry, logged like the call repairs (TD, Output Validation & Repair). */
export interface ExtractionRepair {
  pass: "10a" | "10b" | "10d";
  turn: number;
  scope: string;
  repair: string;
}

/**
 * Logged, not dropped (TD v0.6): sweep re-asks and their outcome, lines the sweep left out,
 * entries whose kind the sweep didn't flag, toward set to null, deal toward set to the other party,
 * hedge downgrades. Counted for gate 8.
 */
export interface MemoryNote {
  pass: "10a" | "10b" | "10d";
  turn: number;
  scope: string;
  kind:
    | "sweep re-ask"
    | "sweep gap"
    | "sweep missing line"
    | "unflagged entry"
    | "self, no admission"
    | "toward was speaker"
    | "deal toward set"
    | "10d toward ignored"
    | "hedge downgrade";
  detail: string;
}

export class MemoryStore {
  entries: MemoryEntry[] = [];
  beliefs: Belief[] = [];
  dropped: DroppedEntry[] = [];
  repairs: ExtractionRepair[] = [];
  notes: MemoryNote[] = [];
  /** TD v0.9 readings, from think()'s `took` (notebook: perceived). */
  readings: Reading[] = [];
  /** `took` labels the attachment rule ignored or logged. */
  labelLog: LabelLogEntry[] = [];
  /** TD v0.8's 10e readings (replay-only perception mode). */
  perceptionReadings: PerceptionReading[] = [];
  /** Lines seen by writeReadings, for rendering and retrieval. */
  private lineIndex = new Map<string, GameLine>();
  private nextR = 1;
  private nextM = 1;
  private nextB = 1;

  addEntry(e: Omit<MemoryEntry, "id" | "salient">): MemoryEntry {
    const entry = { ...e, id: `M${this.nextM++}`, salient: SALIENT.includes(e.type) };
    this.entries.push(entry);
    return entry;
  }

  entriesFor(c: CharacterName): MemoryEntry[] {
    return this.entries.filter((e) => e.audience.includes(c));
  }

  beliefsOf(c: CharacterName, held = true): Belief[] {
    return this.beliefs.filter((b) => b.character === c && (!held || b.status === "held"));
  }

  // ---- 10a ★ pass and 10d claims pass ----------------------------------------------

  /**
   * Checks the entries of a ★ pass (10a) or claims pass (10d) and stores what passes (TD v0.6,
   * Output Validation & Repair, Memory entries). Each entry rests on one spoken line of this
   * conversation this turn; the model's speaker must match that line's speaker; the quote must
   * appear in that line; the summary must begin with the speaker's name and a verb allowed for the
   * type; toward is never the speaker, and a deal's toward is the other party. Audience: everyone
   * present at the line and at every context line from this turn.
   */
  applyEntries(
    pass: "10a" | "10d",
    raw: unknown[],
    x: { turn: number; conversation: string; turnLines: GameLine[]; contextLines: GameLine[]; rules: MemoryRules },
  ): { stored: MemoryEntry[]; dropped: DroppedEntry[] } {
    const stored: MemoryEntry[] = [];
    const dropped: DroppedEntry[] = [];
    const drop = (reason: string, entry: unknown) => {
      const d: DroppedEntry = { pass, turn: x.turn, scope: x.conversation, reason, entry };
      dropped.push(d);
      this.dropped.push(d);
    };
    const note = (kind: MemoryNote["kind"], detail: string) => this.notes.push({ pass, turn: x.turn, scope: x.conversation, kind, detail });
    const thisTurn = new Map(x.turnLines.map((l) => [l.id, l]));
    const known = new Map([...x.contextLines, ...x.turnLines].map((l) => [l.id, l]));
    const id = (s: string) => s.replace(/[[\]\s]/g, "");
    for (const r of raw) {
      const p = EntrySchema.safeParse(r);
      if (!p.success) {
        drop(`entry shape: ${p.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`, r);
        continue;
      }
      const e = p.data;
      if (!(PASS_TYPES[pass] as readonly string[]).includes(e.type)) {
        drop(`unknown type (${e.type})`, e);
        continue;
      }
      const line = thisTurn.get(id(e.line));
      if (!line || line.kind !== "speech") {
        drop(`line is not a spoken line from this turn (${e.line})`, e);
        continue;
      }
      const context = e.context.map((c) => known.get(id(c)));
      if (context.some((c) => !c)) {
        drop(`context ID not found (${e.context.join(", ")})`, e);
        continue;
      }
      const ctx = context as GameLine[];
      const speaker = line.speaker!;
      if (resolveName(e.speaker) !== speaker) {
        drop(`speaker mismatch (${e.speaker}; ${line.id} is ${speaker}'s)`, e);
        continue;
      }
      if (!quoteIn(e.quote, line.text)) {
        drop(`quote not in line (${line.id}: "${e.quote}")`, e);
        continue;
      }
      if (!summaryVerbOk(e.summary, speaker, e.type, x.rules)) {
        drop(`type/summary mismatch (${e.type}: "${e.summary.slice(0, 60)}")`, e);
        continue;
      }
      // TD v0.7: 10d has no toward (the person accused is in "about"); one that comes back is ignored and logged.
      if (pass === "10d" && e.toward) note("10d toward ignored", `${line.id} ${e.type}: toward ${e.toward}`);
      let toward: string | null = pass === "10a" && e.toward ? (resolveName(e.toward) ?? e.toward) : null;
      if (toward === speaker) {
        note("toward was speaker", `${line.id} ${e.type}: toward ${speaker} set to null`);
        toward = null;
      }
      let parties: CharacterName[] | undefined;
      if (e.type === "deal") {
        // The other party: a context line's speaker, or the other name in a cited payment line.
        const others = [
          ...new Set(
            ctx.flatMap((c) => (c.kind === "speech" ? [c.speaker!] : c.kind === "event" && / gave .* Florins/.test(c.text) ? namesIn(c.text) : [])).filter((n) => n !== speaker),
          ),
        ];
        if (!toward || !others.includes(toward as CharacterName)) {
          if (others.length !== 1) {
            drop(`deal toward is not the other party (toward ${toward ?? "null"}; context parties ${others.join(", ") || "none"})`, e);
            continue;
          }
          note("deal toward set", `${line.id}: toward ${toward ?? "null"} set to ${others[0]}`);
          toward = others[0]!;
        }
        parties = [speaker, toward as CharacterName];
      }
      const fromThisTurn = [line, ...ctx.filter((c) => thisTurn.has(c.id))];
      const audience = fromThisTurn.reduce<CharacterName[]>((acc, l) => acc.filter((c) => l.heardBy.includes(c)), [...line.heardBy]);
      stored.push(
        this.addEntry({
          turn: x.turn,
          conversation: x.conversation,
          where: line.where,
          type: e.type as EntryType,
          speaker,
          ...(parties && { parties }),
          toward,
          about: e.about.map((a) => resolveName(a) ?? a),
          summary: e.summary,
          quote: e.quote,
          lines: [line.id, ...ctx.map((c) => c.id)],
          line: line.id,
          context: ctx.map((c) => c.id),
          audience,
          source: pass,
        }),
      );
    }
    return { stored, dropped };
  }

  /**
   * The ★ pass's sweep against {sweep_ids} and its entries (TD v0.7, Output Validation & Repair,
   * Sweep): listed lines the sweep left out, and (line, kind) pairs it flagged with no entry
   * written, both covered by the one re-ask; entries whose kind it didn't flag are kept and logged.
   */
  sweepCheck(sweep: unknown, entries: unknown[], x: { turn: number; conversation: string; turnLines: GameLine[] }): { items: SweepItem[]; missing: string[]; gaps: { line: string; kind: string }[] } {
    const items = parseSweep(sweep);
    const flagged = items.flatMap((i) => i.kinds.filter((k) => (PASS_TYPES["10a"] as readonly string[]).includes(k)).map((k) => ({ line: i.line, kind: k })));
    // Written means written, whatever its later checks say: a re-ask is only for lines with no entry at all.
    const written = entries
      .map((e) => e as { line?: unknown; type?: unknown })
      .filter((e) => typeof e.line === "string" && typeof e.type === "string")
      .map((e) => ({ line: lineId(e.line as string), kind: e.type as string }));
    const swept = new Set(items.map((i) => i.line));
    const missing = sweepIds(x.turnLines).filter((id) => !swept.has(id));
    for (const id of missing) this.notes.push({ pass: "10a", turn: x.turn, scope: x.conversation, kind: "sweep missing line", detail: id });
    for (const w of written.filter((w) => !flagged.some((f) => f.line === w.line && f.kind === w.kind))) {
      this.notes.push({ pass: "10a", turn: x.turn, scope: x.conversation, kind: "unflagged entry", detail: `${w.line} ${w.kind}` });
    }
    return { items, missing, gaps: flagged.filter((f) => !written.some((w) => w.line === f.line && w.kind === f.kind)) };
  }

  /** TD v0.7: lines the sweep marked `self: true` with no admission entry stored on them. Counted, not re-asked. */
  countSelfNoAdmission(items: SweepItem[], stored: MemoryEntry[], x: { turn: number; conversation: string }): void {
    for (const i of items.filter((i) => i.self === true)) {
      if (!stored.some((e) => e.type === "admission" && e.line === i.line)) {
        this.notes.push({ pass: "10a", turn: x.turn, scope: x.conversation, kind: "self, no admission", detail: i.line });
      }
    }
  }

  // ---- 10b: thought pass ------------------------------------------------------------

  /**
   * Checks a thought pass reply against the character's thoughts this turn and records beliefs.
   * Hedge rule (TD v0.6): a "conclusion" whose quote's sentence(s) contain a question mark or a
   * hedge word is stored as a suspicion and logged; code never upgrades a belief.
   */
  applyThoughtPass(raw: unknown, turn: number, character: CharacterName, thoughts: Thought[], rules: MemoryRules): { changed: Belief[]; dropped: DroppedEntry[] } {
    const changed: Belief[] = [];
    const dropped: DroppedEntry[] = [];
    const drop = (reason: string, entry: unknown) => {
      const d: DroppedEntry = { pass: "10b", turn, scope: character, reason, entry };
      dropped.push(d);
      this.dropped.push(d);
    };
    const parsed = ThoughtPass.safeParse(raw);
    if (!parsed.success) {
      drop(`reply shape: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`, raw);
      return { changed, dropped };
    }
    const byId = new Map(thoughts.map((t) => [t.id, t]));
    for (const raw of parsed.data.beliefs) {
      // Seen in the mini-game dry run (v0.5): a new belief's text in "belief" (meant for a B… ID) and no statement.
      const b = { ...raw, statement: raw.statement ?? "" };
      if (!raw.statement && raw.change === "new" && raw.belief && !/^B\d+$/.test(raw.belief)) {
        b.statement = raw.belief;
        b.belief = null;
        this.repairs.push({ pass: "10b", turn, scope: character, repair: "statement given in the belief field" });
      }
      if (!b.statement && b.change === "new") {
        drop("no statement", raw);
        continue;
      }
      const t = byId.get(b.thought.replace(/[[\]]/g, ""));
      if (!t) {
        drop(`cites a thought not in this turn (${b.thought})`, b);
        continue;
      }
      if (!quoteIn(b.quote, t.text)) {
        drop(`quote not in thought (${t.id}: "${b.quote}")`, b);
        continue;
      }
      const prior = b.change === "new" ? null : this.beliefs.find((x) => x.id === b.belief && x.character === character);
      if (b.change !== "new" && !prior) {
        drop(`${b.change} names no recorded belief (${b.belief})`, b);
        continue;
      }
      // "firmer" makes a conclusion; the hedge rule applies to it too.
      const claimed: Belief["kind"] = b.change === "firmer" ? "conclusion" : b.kind;
      const hedged = claimed === "conclusion" && isHedged(b.quote, t.text, rules.hedges);
      if (hedged) this.notes.push({ pass: "10b", turn, scope: character, kind: "hedge downgrade", detail: `${t.id}${prior ? ` (${prior.id} firmer)` : ""}: "${b.quote.slice(0, 80)}"` });
      const kind: Belief["kind"] = hedged ? "suspicion" : claimed;
      if (!prior) {
        const belief: Belief = { id: `B${this.nextB++}`, character, kind, status: "held", statement: b.statement, firstTurn: turn, lastTurn: turn, thought: t.id, quote: b.quote, ...(hedged && { downgraded: true }) };
        this.beliefs.push(belief);
        changed.push(belief);
        continue;
      }
      if (b.change === "firmer") {
        if (hedged) {
          prior.downgraded = true;
        } else {
          // The conclusion's own sentence becomes the belief's quote, so 10c reads the settled form.
          prior.kind = "conclusion";
          prior.thought = t.id;
          prior.quote = b.quote;
        }
      } else prior.status = "dropped";
      prior.lastTurn = turn;
      changed.push(prior);
    }
    return { changed, dropped };
  }

  // ---- 10e: perception pass ---------------------------------------------------------

  /**
   * Checks a perception pass reply against one character's timeline this turn and stores readings
   * (TD v0.8, Output Validation & Repair, Readings): the line must be a spoken line in the timeline;
   * the quote must be in that line; the reaction must be in a thought from the timeline; for someone
   * else's line that thought must come after the line, and for the character's own line thought and
   * reaction may both be null. Unknown kinds are dropped; a repeated (line, kind) keeps the first.
   */
  applyPerceptionPass(raw: unknown, x: { turn: number; character: CharacterName; timeline: TimelineItem[] }): { stored: PerceptionReading[]; dropped: DroppedEntry[] } {
    const stored: PerceptionReading[] = [];
    const dropped: DroppedEntry[] = [];
    const drop = (reason: string, entry: unknown) => {
      const d: DroppedEntry = { pass: "10e", turn: x.turn, scope: x.character, reason, entry };
      dropped.push(d);
      this.dropped.push(d);
    };
    const parsed = PerceptionPass.safeParse(raw);
    if (!parsed.success) {
      drop(`reply shape: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`, raw);
      return { stored, dropped };
    }
    const position = new Map<string, number>();
    x.timeline.forEach((it, i) => position.set(it.kind === "line" ? it.line.id : it.thought.id, i));
    const lines = new Map(x.timeline.flatMap((it) => (it.kind === "line" ? [[it.line.id, it.line] as const] : [])));
    const thoughts = new Map(x.timeline.flatMap((it) => (it.kind === "thought" ? [[it.thought.id, it.thought] as const] : [])));
    const seen = new Set<string>();
    for (const n of parsed.data.notes) {
      const line = lines.get(lineId(n.line));
      if (!line || line.kind !== "speech") {
        drop(`line not a spoken line in the input (${n.line})`, n);
        continue;
      }
      if (!quoteIn(n.quote, line.text)) {
        drop(`quote not in line (${line.id}: "${n.quote}")`, n);
        continue;
      }
      if (!(READING_KINDS as readonly string[]).includes(n.took)) {
        drop(`unknown took (${n.took})`, n);
        continue;
      }
      const own = line.speaker === x.character;
      let thought: Thought | null = null;
      if (n.thought || n.reaction) {
        thought = n.thought ? (thoughts.get(lineId(n.thought)) ?? null) : null;
        if (!thought) {
          drop(`thought not in input (${n.thought})`, n);
          continue;
        }
        if (!n.reaction || !quoteIn(n.reaction, thought.text)) {
          drop(`reaction not in thought (${thought.id}: "${n.reaction}")`, n);
          continue;
        }
        if (!own && position.get(thought.id)! < position.get(line.id)!) {
          drop(`thought before line (${thought.id} precedes ${line.id})`, n);
          continue;
        }
      } else if (!own) {
        drop(`no thought for another's line (${line.id})`, n);
        continue;
      }
      const key = `${line.id}|${n.took}`;
      if (seen.has(key)) {
        drop(`duplicate (${line.id} ${n.took})`, n);
        continue;
      }
      seen.add(key);
      const reading: PerceptionReading = {
        id: `R${this.nextR++}`,
        character: x.character,
        turn: x.turn,
        conversation: line.conversation,
        where: line.where,
        speaker: line.speaker!,
        line: line.id,
        quote: n.quote,
        took: n.took as PerceptionReading["took"],
        thought: thought?.id ?? null,
        reaction: thought ? n.reaction! : null,
        about: n.about.map((a) => resolveName(a) ?? a),
        own,
        salient: SALIENT_READINGS.includes(n.took),
      };
      this.perceptionReadings.push(reading);
      stored.push(reading);
    }
    return { stored, dropped };
  }

  // ---- Readings (TD v0.9, The perceived notebook) -----------------------------------

  /**
   * Turns one turn's think() labels into readings, by TD v0.9's rule ("Which line a label belongs
   * to"): (1) the line is the last spoken line before the thought in that conversation, heard by the
   * character, so an action line or Il Notaio note in between doesn't move it; (2) with no spoken
   * line the label is ignored and logged; (3) one reading per character per line: the first label
   * other than none stands, and a later label for the line is logged, not stored; (4) a label on the
   * character's own line is marked own. Each reading is stored for that character only.
   */
  writeReadings(turn: number, thoughts: Thought[], lines: GameLine[]): { stored: Reading[]; logged: LabelLogEntry[] } {
    for (const l of lines) this.lineIndex.set(l.id, l);
    const stored: Reading[] = [];
    const logged: LabelLogEntry[] = [];
    const ordered = thoughts.filter((t) => t.turn === turn && t.call === "think" && t.took && t.took !== "none").sort((a, b) => num(a.id) - num(b.id));
    for (const t of ordered) {
      const line = labelLine(t, lines);
      const log = (reason: LabelLogEntry["reason"], extra: Partial<LabelLogEntry> = {}) => {
        const e: LabelLogEntry = { turn, character: t.character, thought: t.id, took: t.took!, line: line?.id ?? null, reason, ...extra };
        this.labelLog.push(e);
        logged.push(e);
      };
      if (!line) {
        log("no spoken line");
        continue;
      }
      const prior = this.readings.find((r) => r.character === t.character && r.line === line.id);
      if (prior) {
        log(prior.took === t.took ? "same label again" : "later different label", { standing: prior.id });
        continue;
      }
      const took = t.took as Reading["took"];
      const reading: Reading = {
        id: `R${this.nextR++}`,
        character: t.character,
        turn: line.turn,
        conversation: line.conversation,
        line: line.id,
        speaker: line.speaker!,
        took,
        thought: t.id,
        about: [...new Set<CharacterName>([line.speaker!, ...(line.addressee ? [line.addressee] : []), ...namesIn(line.text)])],
        own: line.speaker === t.character,
        salient: SALIENT_READINGS.includes(took),
      };
      this.readings.push(reading);
      stored.push(reading);
    }
    return { stored, logged };
  }

  /** A reading's line, for rendering (lines registered by writeReadings, or given here). */
  lineOf(id: string): GameLine | undefined {
    return this.lineIndex.get(id);
  }

  registerLines(lines: GameLine[]): void {
    for (const l of lines) this.lineIndex.set(l.id, l);
  }

  // ---- Retrieval, perceived notebook (TD v0.9, Memory Writing → Retrieval) ------------

  /**
   * Block 6 in `notebook: perceived`: the notebook is the character's readings plus code-written
   * entries (payments, private actions, Il Notaio's events); the reference record (10a, 10d) is never
   * retrieved. ★ items naming anyone present, most recent first, up to 6; held beliefs about anyone
   * present, up to 3; then the items most similar to the last two History lines, a reading matched
   * on its full line text. Oldest first. `murder`: ★ threats, deals, and promises first.
   */
  retrieveNotebook(c: CharacterName, present: CharacterName[], recentLines: string[], opts: { murder?: boolean; limit?: number } = {}): string[] {
    const limit = opts.limit ?? 12;
    type Item = { kind: "reading"; r: Reading } | { kind: "entry"; e: MemoryEntry } | { kind: "belief"; b: Belief };
    const readings: Item[] = this.readings.filter((r) => r.character === c && this.lineIndex.has(r.line)).map((r) => ({ kind: "reading", r }));
    const code: Item[] = this.entriesFor(c).filter((e) => e.source === "code").map((e) => ({ kind: "entry", e }));
    const beliefs: Item[] = this.beliefsOf(c).map((b) => ({ kind: "belief", b }));
    const turnOfItem = (x: Item) => (x.kind === "reading" ? x.r.turn : x.kind === "entry" ? x.e.turn : x.b.firstTurn);
    const names = (x: Item): string[] => (x.kind === "reading" ? x.r.about : x.kind === "entry" ? ([x.e.speaker, x.e.toward, ...x.e.about].filter(Boolean) as string[]) : []);
    const salient = (x: Item) => (x.kind === "reading" ? x.r.salient : x.kind === "entry" ? x.e.salient : false);
    const text = (x: Item) => (x.kind === "reading" ? this.lineIndex.get(x.r.line)!.text : x.kind === "entry" ? x.e.summary : x.b.statement);
    const picked: Item[] = [];
    const take = (xs: Item[], n: number) => {
      for (const x of xs) {
        if (n <= 0) break;
        if (!picked.includes(x)) {
          picked.push(x);
          n--;
        }
      }
    };
    const recent = [...readings, ...code].sort((a, b) => turnOfItem(b) - turnOfItem(a));
    if (opts.murder) take(recent.filter((x) => x.kind === "reading" && ["threat", "deal", "promise"].includes(x.r.took)), 6);
    take(recent.filter((x) => salient(x) && names(x).some((n) => present.includes(n as CharacterName))), 6);
    take(beliefs.filter((x) => x.kind === "belief" && present.some((p) => x.b.statement.includes(p))), 3);
    const query = words(recentLines.join(" "));
    const scored = [...recent, ...beliefs].filter((x) => !picked.includes(x)).map((x) => ({ x, s: overlap(query, words(text(x))) })).sort((a, b) => b.s - a.s);
    take(scored.map((s) => s.x), limit - picked.length);
    return picked
      .sort((a, b) => turnOfItem(a) - turnOfItem(b))
      .map((x) => (x.kind === "reading" ? renderReading(x.r, this.lineIndex.get(x.r.line)!) : x.kind === "entry" ? renderCodeEntryFor(x.e, c) : renderBelief(x.b)));
  }

  // ---- Retrieval (TD v0.5, Memory Writing → Retrieval) --------------------------------

  /**
   * Block 6 for one character call: ★ entries naming anyone present (most
   * recent first, up to 6), held beliefs about anyone present (up to 3), then
   * the entries and beliefs most similar to the last two History lines.
   * Similarity is word overlap, a stand-in for embeddings until the engine has
   * them. `murder`: the Murder Round query (★ threats, deals, promises first).
   */
  retrieve(c: CharacterName, present: CharacterName[], recentLines: string[], opts: { murder?: boolean; limit?: number } = {}): string[] {
    const limit = opts.limit ?? 12;
    const mine = this.entriesFor(c);
    const beliefs = this.beliefsOf(c);
    const names = (e: MemoryEntry) => [e.speaker, e.toward, ...e.about, ...(e.parties ?? [])].filter(Boolean) as string[];
    const picked: (MemoryEntry | Belief)[] = [];
    const take = (xs: (MemoryEntry | Belief)[], n: number) => {
      for (const x of xs) {
        if (n <= 0) break;
        if (!picked.includes(x)) {
          picked.push(x);
          n--;
        }
      }
    };
    const recent = [...mine].reverse();
    if (opts.murder) take(recent.filter((e) => ["threat", "deal", "promise"].includes(e.type)), 6);
    take(recent.filter((e) => e.salient && names(e).some((n) => present.includes(n as CharacterName))), 6);
    take(beliefs.filter((b) => present.some((p) => b.statement.includes(p))), 3);
    const query = words(recentLines.join(" "));
    const scored = [...mine, ...beliefs]
      .filter((x) => !picked.includes(x))
      .map((x) => ({ x, s: overlap(query, words("summary" in x ? `${x.summary} ${x.quote ?? ""}` : x.statement)) }))
      .sort((a, b) => b.s - a.s);
    take(scored.map((s) => s.x), limit - picked.length);
    // Oldest first within the selection, as TD renders it.
    return picked.sort((a, b) => turnOf(a) - turnOf(b)).map((x) => ("summary" in x ? renderEntry(x, c) : renderBelief(x)));
  }
}

const EntrySchema = z.object({
  line: z.string(),
  context: z.array(z.string()).default([]),
  speaker: z.string(),
  quote: z.string(),
  type: z.string(),
  toward: z.string().nullable().optional(),
  about: z.array(z.string()).default([]),
  summary: z.string(),
});
/** One sweep item (TD v0.7): the line, the `self` answer, the kinds found. */
export interface SweepItem {
  line: string;
  self: boolean | null;
  kinds: string[];
}

const lineId = (s: string) => s.replace(/[[\]\s]/g, "");

/** Sweep items that parse; anything else is skipped (and its line then counts as left out). */
export function parseSweep(sweep: unknown): SweepItem[] {
  if (!Array.isArray(sweep)) return [];
  return sweep.flatMap((i) => {
    const p = z.object({ line: z.string(), self: z.boolean().nullable().optional(), kinds: z.array(z.string()).default([]) }).safeParse(i);
    return p.success ? [{ line: lineId(p.data.line), self: p.data.self ?? null, kinds: p.data.kinds }] : [];
  });
}

/** 10a's {sweep_ids}: this turn's spoken lines, in order (no bracketed or Il Notaio lines). */
export function sweepIds(turnLines: GameLine[]): string[] {
  return turnLines.filter((l) => l.kind === "speech").map((l) => l.id);
}

/** 10e's reply (TD v0.8). */
const PerceptionPass = z.object({
  notes: z.array(
    z.object({
      line: z.string(),
      quote: z.string(),
      took: z.string(),
      thought: z.string().nullable(),
      reaction: z.string().nullable(),
      about: z.array(z.string()).default([]),
    }),
  ),
});

/** 10a's reply: the sweep, then the entries (TD v0.6–v0.7). */
export const StarPass = z.object({ sweep: z.array(z.unknown()), entries: z.array(z.unknown()) });
/** 10d's reply. */
export const ClaimsPass = z.object({ entries: z.array(z.unknown()) });
const ThoughtPass = z.object({
  beliefs: z.array(
    z.object({
      thought: z.string(),
      quote: z.string(),
      kind: z.enum(["conclusion", "suspicion"]),
      change: z.enum(["new", "firmer", "dropped"]),
      belief: z.string().nullable(),
      statement: z.string().optional(),
    }),
  ),
});
export const KnowledgeVerdict = z.object({
  reasoning: z.string(),
  verdict: z.enum(["told", "conclusion", "suspicion", "none"]),
  evidence: z.array(z.string()),
  told_by: z.array(z.string()),
});

/** Gate 8's code counts (TD v0.6): dropped entries by reason, sweep re-asks and gaps, hedge downgrades, repeated thoughts. */
export function memoryCounts(
  memory: { dropped: { pass: string; reason: string }[]; notes?: { kind: string }[]; repairs?: unknown[]; readings?: { took?: string; own?: boolean }[]; labelLog?: { reason: string }[]; label_log?: { reason: string }[] },
  thoughts: { repeat?: boolean; call?: string; took?: string; closing?: boolean }[],
) {
  const by = <T>(xs: T[], key: (x: T) => string) => xs.reduce<Record<string, number>>((acc, x) => ((acc[key(x)] = (acc[key(x)] ?? 0) + 1), acc), {});
  return {
    dropped: memory.dropped.length,
    dropped_by_reason: by(memory.dropped, (d) => `${d.pass}: ${d.reason.replace(/\s*\(.*$|:\s.*$/s, "").trim()}`),
    notes: by(memory.notes ?? [], (n) => n.kind),
    repairs: memory.repairs?.length ?? 0,
    repeated_thoughts: thoughts.filter((t) => t.repeat).length,
    // TD v0.9: think()'s labels, the readings built from them, and labels the attachment rule didn't store.
    took: by(thoughts.filter((t) => t.call === "think" && t.took), (t) => t.took!),
    closing_thinks: thoughts.filter((t) => t.closing).length,
    readings: (memory.readings ?? []).length,
    own_readings: (memory.readings ?? []).filter((r) => r.own).length,
    labels_not_stored: by(memory.labelLog ?? memory.label_log ?? [], (e) => e.reason),
  };
}

const turnOf = (x: MemoryEntry | Belief) => ("summary" in x ? x.turn : x.firstTurn);

/** TD's block 6 line: `T4 · Colloquio with Lupo · ★ deal: … ("quote")`. */
export function renderEntry(e: MemoryEntry, forChar?: CharacterName): string {
  return `T${e.turn} · ${whereLabel(e.where, forChar)} · ${e.salient ? "★ " : ""}${e.type}: ${e.summary}${e.quote ? ` ("${e.quote}")` : ""}`;
}

/**
 * TD v0.9's block 6 line for a reading: turn, conversation type, speaker, a trimmed quote, and how
 * the character took it: `T4 · Colloquio · ★ Lupo: "…" (you took it as a deal)`, or for the
 * character's own line `T6 · Colloquio with Francesco Pazzi · ★ you: "…" (you meant it as a promise)`.
 * A Colloquio line of the character's own names the other guest; otherwise only the type is shown.
 */
export function renderReading(r: Reading, line: GameLine): string {
  const other = line.where.members.filter((m) => m !== r.character);
  const label = r.own && line.where.kind === "colloquio" && other.length ? `Colloquio with ${other.join(", ")}` : conversationType(line.where);
  const who = r.own ? "you" : r.speaker;
  const how = r.own ? `you meant it as ${article(r.took)} ${r.took}` : `you took it as ${article(r.took)} ${r.took}`;
  return `T${r.turn} · ${label} · ${r.salient ? "★ " : ""}${who}: "${trimQuote(line.text)}" (${how})`;
}

/** TD v0.9: the whole line if it's 15 words or fewer; otherwise its first 15 words and "…". */
export function trimQuote(text: string, max = 15): string {
  const words = text.trim().split(/\s+/);
  return words.length <= max ? words.join(" ") : `${words.slice(0, max).join(" ")}…`;
}

const conversationType = (w: Where) => (w.kind === "colloquio" ? "Colloquio" : w.kind === "capannello" ? "Capannello" : "The gathering");

/** TD v0.8's block 6 line for a 10e reading (replay-only perception mode). */
export function renderPerceptionReading(r: PerceptionReading): string {
  const head = `T${r.turn} · ${whereLabel(r.where, r.character)} · ${r.salient ? "★ " : ""}`;
  const said = r.own ? `your own ${r.took} · you said: "${r.quote}"` : `you took it as ${article(r.took)} ${r.took} · ${r.speaker}: "${r.quote}"`;
  return `${head}${said}${r.reaction ? ` · you thought: "${r.reaction}"` : ""}`;
}

const article = (kind: string) => (/^[aeiou]/.test(kind) ? "an" : "a");

/**
 * A code-written entry in the perceived notebook, from the character's own side (TD v0.9:
 * `T4 · Colloquio · ★ You gave Lupo 3 Florins.`): conversation type only, second person for the actor.
 */
export function renderCodeEntryFor(e: MemoryEntry, c: CharacterName): string {
  const summary = e.summary.startsWith(`${c} `) ? `You ${e.summary.slice(c.length + 1)}` : e.summary;
  return `T${e.turn} · ${conversationType(e.where)} · ${e.salient ? "★ " : ""}${summary}`;
}

export function renderBelief(b: Belief): string {
  return `T${b.firstTurn} · your belief (${b.kind}): ${b.statement}`;
}

/** The roster as 10a–10b show it: `Full Name — Faction`, the dead marked. */
export function rosterText(dead: CharacterName[] = []): string {
  return ROSTER.map((r) => `${r.name} — ${r.faction}${dead.includes(r.name) ? " (dead)" : ""}`).join("\n");
}

/** A name as written, a known alias, or a near miss (TD's Names rule); null if none matches. */
export function resolveName(name: string): CharacterName | null {
  const all = ROSTER.map((r) => r.name) as CharacterName[];
  if ((all as string[]).includes(name)) return name as CharacterName;
  return resolveAlias(name) ?? (nearMiss(name, all) as CharacterName | null);
}

/** Word-for-word after normalizing spaces, quote marks, and case (TD, Extraction entries). */
export function quoteIn(quote: string, text: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[’‘`]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/^["'\s]+|["'\s]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const q = norm(quote);
  return q.length > 0 && norm(text).includes(q);
}

const num = (id: string) => Number(id.slice(1));

/**
 * TD v0.9's line for a label: the last spoken line, heard by the character, in the thought's
 * conversation, at or before the line the thought followed (`after_line`). Null if there is none.
 */
export function labelLine(t: Thought, lines: GameLine[]): GameLine | null {
  if (!t.after_line || !t.conversation) return null;
  const upTo = num(t.after_line);
  let best: GameLine | null = null;
  for (const l of lines) {
    if (l.kind === "speech" && l.conversation === t.conversation && num(l.id) <= upTo && l.heardBy.includes(t.character) && (!best || num(l.id) > num(best.id))) best = l;
  }
  return best;
}

/** Roster names (full or alias) written in a line, e.g. both parties of "Contessa Isabella gave Lupo 3 Florins." */
function namesIn(text: string): CharacterName[] {
  return ROSTER.map((r) => r.name).filter((n) => [n, ...ALIASES[n]].some((a) => new RegExp(`\\b${escapeRe(a)}\\b`).test(text)));
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** TD v0.6 verb check: the summary begins with the speaker's name (any alias), then a verb allowed for the type. */
export function summaryVerbOk(summary: string, speaker: CharacterName, type: string, rules: MemoryRules): boolean {
  const s = summary.trim().toLowerCase();
  const names = [speaker, ...ALIASES[speaker]].map((n) => n.toLowerCase()).sort((a, b) => b.length - a.length);
  const name = names.find((n) => s.startsWith(`${n} `));
  if (!name) return false;
  const verb = s.slice(name.length).trim().split(/\s+/)[0]!.replace(/[^a-z]/g, "");
  return (rules.verbs[type] ?? []).includes(verb);
}

/** The sentence or sentences of a thought that contain the quote (the whole thought if they can't be found). */
export function sentencesWith(quote: string, text: string): string {
  const sentences = text.split(/(?<=[.!?…])\s+/);
  for (let n = 1; n <= sentences.length; n++) {
    for (let i = 0; i + n <= sentences.length; i++) {
      const span = sentences.slice(i, i + n).join(" ");
      if (quoteIn(quote, span)) return span;
    }
  }
  return text;
}

/** TD v0.6 hedge rule: a question mark, or any hedge from 10b's list as whole words, case-insensitive. */
export function isHedged(quote: string, thought: string, hedges: string[]): boolean {
  const span = sentencesWith(quote, thought);
  return span.includes("?") || hedges.some((h) => new RegExp(`\\b${escapeRe(h).replace(/ /g, "\\s+")}\\b`, "i").test(span));
}

const STOP = new Set("the a an and or of to in on at for is was be he she it his her they them i you that this with as by not no from but have has had are were will would".split(" "));
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
const overlap = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  for (const w of b) if (a.has(w)) n++;
  return b.size ? n / Math.sqrt(b.size * Math.max(1, a.size)) : 0;
};
