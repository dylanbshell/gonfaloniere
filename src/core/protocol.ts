// The player's connection (TD v0.39, Player Interface › How it's built › The connection): events to
// the browser and messages from it. Part of the conversation core, so nothing here knows the game's
// setting or rules: the game fills every event from the player character's own History and State.

import { z } from "zod";

/** What the game is waiting for. The game defines each request's options; the core passes them on. */
export type RequestKind = "speak" | "move" | "seat" | "midnight";

/** Events to the browser. `seq` orders the player's log, which is replayed on reconnect. */
export type OutgoingBody =
  | { type: "line"; id: string; turn: number; conversation: string; speaker: string; addressee: string | null; text: string; you: boolean }
  | { type: "notaio"; id: string; turn: number; conversation: string; text: string }
  | { type: "action"; id: string; turn: number; conversation: string; text: string; private: boolean }
  | { type: "state"; state: Record<string, unknown>; commands: { name: string; usage: string; hint: string }[] }
  | { type: "request"; id: string; kind: RequestKind; options: Record<string, unknown>; resent?: true }
  | { type: "refusal"; reason: string; input: string | null }
  | { type: "death"; name: string; you: boolean }
  | { type: "result"; result: Record<string, unknown> };
export type Outgoing = OutgoingBody & { seq: number };

/** Messages from the browser. */
export const Incoming = z.discriminatedUnion("type", [
  z.object({ type: z.literal("say"), text: z.string() }),
  z.object({ type: z.literal("pass") }),
  z.object({ type: z.literal("command"), text: z.string() }),
  z.object({ type: z.literal("choice"), request: z.string(), value: z.unknown() }),
  z.object({ type: z.literal("end") }),
]);
export type Incoming = z.infer<typeof Incoming>;
