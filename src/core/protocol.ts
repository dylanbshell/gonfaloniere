// The player's connection (TD v0.39, Player Interface › How it's built › The connection): events to
// the browser and messages from it. Part of the conversation core, so nothing here knows the game's
// setting or rules: the game fills every event from the player character's own History and State.

import { z } from "zod";

/** What the game is waiting for. The game defines each request's options; the core passes them on. */
export type RequestKind = "speak" | "move" | "seat" | "midnight";

/** Events to the browser. `seq` orders the player's log, which is replayed on reconnect. */
export type OutgoingBody =
  | { type: "line"; id: string; turn: number; conversation: string; speaker: string; addressee: string | null; text: string; you: boolean }
  /** `about`: the characters the event concerns, from the event itself (never read from its text). */
  | { type: "notaio"; id: string; turn: number; conversation: string; text: string; about?: string[] }
  | { type: "action"; id: string; turn: number; conversation: string; text: string; private: boolean; about?: string[] }
  | {
      type: "state";
      state: Record<string, unknown>;
      commands: { action?: string; name: string; usage: string; hint: string }[];
      /** Who is generating a line in the player's conversation now ("…is speaking"), or null. */
      speaking?: string | null;
      /** Sent once: the player's own sheet, the texts the game gives that character (in the game, blocks 2 and 3), and the public content the screen shows. */
      sheet?: Record<string, unknown>;
    }
  /** A request opens with its options; `closed` marks it answered, so a replayed log shows which is still open. */
  | { type: "request"; id: string; kind: RequestKind; options: Record<string, unknown>; resent?: true; closed?: true }
  | { type: "refusal"; reason: string; input: string | null }
  | { type: "death"; name: string; you: boolean }
  | { type: "result"; result: Record<string, unknown> }
  /** One of the player's own notes (TD v0.40, Notes), kept by the game; `guests`: none, one, or a pair. */
  | { type: "note"; id: string; turn: number; guests: string[]; text: string }
  /**
   * A reading of the player's own record for one or two guests (TD v0.44, the screen's one model summary):
   * `upTo`, the seq of the record's newest entry it covers; `text`, the reading, or null when there is none
   * (none possible, or dropped by the game's check), with `tally`, the plain count shown instead. From TD
   * v0.51, `guarded` holds the reading and `text` is null; the tally is its closing line.
   */
  | { type: "reading"; guests: string[]; upTo: number; text: string | null; tally: string; guarded?: GuardedReading }
  /**
   * Il Notaio's summary of a finished stage (TD v0.51, Past-stage summaries): bullets grouped by conversation,
   * in order, each group by its conversation's id and its first line's seq in the player's log (the screen
   * heads it with its own conversation line). `empty`: the line shown when nothing reached the player.
   */
  | { type: "stage-summary"; stage: string; groups: { conversation: string; from: number; items: NotaioItem[] }[]; empty: string | null };
export type Outgoing = OutgoingBody & { seq: number };

/**
 * One item of Il Notaio's guarded reading or past-stage summary (TD v0.51): a spoken line put in his
 * register (`seq`, the line's own), an event the player saw as its own record line (`item`: a note of his,
 * an action line, or a death, with its name as `text`), or code's note on a public lore entry the line
 * named. The game builds every one; the core only carries them.
 */
export type NotaioItem =
  | { kind: "sentence"; seq: number; text: string }
  | { kind: "event"; seq: number; item: "notaio" | "action" | "death"; text: string }
  | { kind: "note"; entry: string; title: string; text: string };

/**
 * Il Notaio's guarded reading (TD v0.51): code's background (the connection lines that involve the selection,
 * word for word, and up to two public lore entries that name them, each with its note), then tonight, a
 * paragraph per stage, oldest first, each with its opening words. `empty`: the line shown when the player has
 * heard and seen nothing of the selection, or null.
 */
export interface GuardedReading {
  background: { connections: { between: string[]; type: string; line: string; private?: boolean }[]; lore: { entry: string; title: string; text: string }[] };
  stages: { stage: string; heading: string; items: NotaioItem[] }[];
  empty: string | null;
}

/** Messages from the browser. */
export const Incoming = z.discriminatedUnion("type", [
  z.object({ type: z.literal("say"), text: z.string() }),
  z.object({ type: z.literal("pass") }),
  z.object({ type: z.literal("command"), text: z.string() }),
  z.object({ type: z.literal("choice"), request: z.string(), value: z.unknown() }),
  z.object({ type: z.literal("end") }),
  /** A note: never an answer to a request, and never a turn's input. */
  z.object({ type: z.literal("note"), text: z.string(), guests: z.array(z.string()).max(2) }),
  /** Asks for a reading of one or two guests: never an answer to a request, and never a turn's input. */
  z.object({ type: z.literal("reading"), guests: z.array(z.string()).min(1).max(2) }),
  /** TD v0.51: the Web of Secrets' selection (none, one guest, or a pair), which asks for a reading: like `reading`, never a turn's input. */
  z.object({ type: z.literal("select"), guests: z.array(z.string()).max(2) }),
  /** TD v0.51, the tour's hold: the screen is ready for the first line. Only the first counts. */
  z.object({ type: z.literal("begin") }),
]);
export type Incoming = z.infer<typeof Incoming>;
