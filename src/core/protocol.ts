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
   * (none possible, or dropped by the game's check), with `tally`, the plain count shown instead.
   */
  | { type: "reading"; guests: string[]; upTo: number; text: string | null; tally: string };
export type Outgoing = OutgoingBody & { seq: number };

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
]);
export type Incoming = z.infer<typeof Incoming>;
