// TD v0.23's Seating health metric (Balancing Approach), from a game's events: lone-guest moves,
// invitee choices, initiators placed away from their own Capannello, seatless pairs, waiting joins
// that lapsed, and Colloquio chain lengths (Mechanics' watch item). Games on a TD before v0.23 ran the
// interim rule, whose lone-guest joins count as lone-guest moves; the rest is zero there.

type Event = { type: string; [k: string]: unknown };

export interface SeatingHealth {
  loneGuestMoves: number;
  /** Lone guests with no other open group, who stayed (each counted once). */
  loneGuestStays: number;
  /** The invitee's choice as applied; `defaulted` counts the defaults among them (an invalid reply or a failed call). */
  inviteeChoices: { join: number; colloquio: number; wait: number; calledBack: number; defaulted: number };
  /** Initiators placed away from their own Capannello, and free Colloquio callers (who have none). */
  displacedInitiators: { full: number; dissolved: number; freeCaller: number };
  seatlessPairs: number;
  lapsedJoins: number;
  /** Per chain, its length (the highest position reached), in the order chains started. */
  chainLengths: number[];
}

export function seatingHealth(events: Event[]): SeatingHealth {
  const seats = events.filter((e) => e.type === "seat");
  const invitee = seats.filter((e) => e.form === "invitee");
  const initiator = seats.filter((e) => e.form === "initiator");
  const chains = new Map<string, number>();
  for (const e of events.filter((e) => e.type === "colloquio-open" && typeof e.chain === "string")) {
    chains.set(e.chain as string, Math.max(chains.get(e.chain as string) ?? 0, e.position as number));
  }
  return {
    loneGuestMoves: seats.filter((e) => e.form === "lone" && e.to).length + events.filter((e) => e.type === "lone-guest-join").length,
    loneGuestStays: seats.filter((e) => e.form === "lone" && !e.to).length,
    inviteeChoices: {
      join: invitee.filter((e) => e.choice === "join").length,
      colloquio: invitee.filter((e) => e.choice === "colloquio").length,
      wait: invitee.filter((e) => e.choice === "wait").length,
      calledBack: invitee.filter((e) => e.note === "called back").length,
      defaulted: invitee.filter((e) => String(e.rule).startsWith("default")).length,
    },
    displacedInitiators: {
      full: initiator.filter((e) => e.reason === "own full").length,
      dissolved: initiator.filter((e) => e.reason === "own dissolved").length,
      freeCaller: initiator.filter((e) => e.reason === "free Colloquio caller").length,
    },
    seatlessPairs: events.filter((e) => e.type === "seatless-pair").length,
    lapsedJoins: events.filter((e) => e.type === "join-lapsed").length,
    chainLengths: [...chains.values()],
  };
}

/** One line for the measures report. */
export function seatingHealthLine(h: SeatingHealth): string {
  const i = h.inviteeChoices;
  const d = h.displacedInitiators;
  return [
    `lone-guest moves ${h.loneGuestMoves} (stayed, none open: ${h.loneGuestStays})`,
    `invitee choices: join ${i.join}, free Colloquio ${i.colloquio} (called back ${i.calledBack}), wait ${i.wait}; defaulted ${i.defaulted}`,
    `displaced initiators: own full ${d.full}, own dissolved ${d.dissolved}; free Colloquio callers ${d.freeCaller}`,
    `seatless pairs ${h.seatlessPairs}`,
    `lapsed joins ${h.lapsedJoins}`,
    `chain lengths ${h.chainLengths.length ? h.chainLengths.join(", ") : "none"}`,
  ].join("; ");
}
