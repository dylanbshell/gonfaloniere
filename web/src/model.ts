// The screen's view of the player's log: the stream (their History lines, in segments, one for each
// stretch in one conversation; TD v0.40 collapses all but the current one), the latest block 5 state and
// command menu, the open request, and the ending.
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
  /** Every line, in order. */
  stream: Line[];
  /** The same lines by conversation; the last is the current one. */
  segments: Segment[];
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
  const v: View = { stream: [], segments: [], state: null, commands: [], speaking: null, sheet: null, pending: null, refusal: null, deaths: [], result: null, spoken: 0 };
  const open = new Map<string, Request>();
  let waiting: Segment | null = null;
  for (const e of log) {
    if (e.type === "line" || e.type === "notaio" || e.type === "action") {
      const l = { ...(e as unknown as Line), item: e.type } as Line;
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
      v.commands = e.commands as View["commands"];
      v.speaking = (e.speaking as string | null | undefined) ?? null;
      if (e.sheet) v.sheet = e.sheet as Record<string, string>;
      if (waiting) {
        waiting.state = v.state;
        waiting = null;
      }
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
