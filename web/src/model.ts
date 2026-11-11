// The screen's view of the player's log: the stream (their History lines, with a divider where their
// conversation changes), the latest block 5 state and command menu, the open request, and the ending.
// Everything here comes from events the engine built from the player's own History and State.

import type { Ev } from "./connection.ts";

export interface Line {
  item: "line" | "notaio" | "action";
  id: string;
  conversation: string;
  speaker?: string;
  addressee?: string | null;
  text: string;
  you?: boolean;
  private?: boolean;
}
export type StreamItem = Line | { item: "divider"; conversation: string; state: State | null };

export interface State {
  phaseLabel: string;
  conversation: { kind: "capannello"; others: string[] } | { kind: "colloquio"; other: string } | { kind: "gathering" };
  present: string[];
  livingOthers: string[];
  florins: number;
  pensionsHeld: number;
  withdrawalCount: number;
  plotStatus?: string;
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

export interface View {
  stream: StreamItem[];
  state: State | null;
  commands: { name: string; usage: string; hint: string }[];
  speaking: string | null;
  sheet: Record<string, string> | null;
  pending: Request | null;
  refusal: { seq: number; reason: string } | null;
  deaths: { name: string; you: boolean }[];
  result: Result | null;
  /** The seq of the player's last own line, for rotating the example line. */
  spoken: number;
}

export function derive(log: Ev[]): View {
  const v: View = { stream: [], state: null, commands: [], speaking: null, sheet: null, pending: null, refusal: null, deaths: [], result: null, spoken: 0 };
  const open = new Map<string, Request>();
  let lastConversation: string | null = null;
  let waitingDivider: { item: "divider"; conversation: string; state: State | null } | null = null;
  for (const e of log) {
    if (e.type === "line" || e.type === "notaio" || e.type === "action") {
      const l = { ...(e as unknown as Line), item: e.type } as Line;
      if (l.conversation !== lastConversation) {
        if (lastConversation !== null) {
          waitingDivider = { item: "divider", conversation: l.conversation, state: null };
          v.stream.push(waitingDivider);
        }
        lastConversation = l.conversation;
      }
      v.stream.push(l);
      if (l.item === "line" && l.you) v.spoken++;
    } else if (e.type === "state") {
      v.state = e.state as State;
      v.commands = e.commands as View["commands"];
      v.speaking = (e.speaking as string | null | undefined) ?? null;
      if (e.sheet) v.sheet = e.sheet as Record<string, string>;
      // A divider takes the conversation the player is in once they've arrived.
      if (waitingDivider && !waitingDivider.state) waitingDivider.state = v.state;
    } else if (e.type === "request") {
      if (e.closed) open.delete(e.id as string);
      else open.set(e.id as string, e as unknown as Request);
    } else if (e.type === "refusal") v.refusal = { seq: e.seq, reason: e.reason as string };
    else if (e.type === "death") v.deaths.push({ name: e.name as string, you: !!e.you });
    else if (e.type === "result") v.result = e.result as Result;
  }
  v.pending = [...open.values()].at(-1) ?? null;
  return v;
}
