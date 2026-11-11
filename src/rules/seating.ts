// Who sits where (Mechanics: Movement; Conversation Types, Ending a Colloquio; A Capannello Left With
// One Guest; TD Movement Implementation › Seating). Pure decisions over the groups as they stand: the
// game keeps the rooms and their members, asks these rules where a guest goes, and writes the notes.
// Moved from the mini-game engine (CC-20261111-07, #71).

import type { Rng } from "./random.ts";

/** A conversation as the rules see it. */
export interface Group {
  id: string;
  kind: "capannello" | "colloquio";
  open: boolean;
  members: readonly string[];
}

/** Open Capannelli a guest can join: at least one guest, and room under the maximum. */
export function openGroups<G extends Group>(groups: Iterable<G>, max: number, except?: string): G[] {
  return [...groups].filter((x) => x.open && x.kind === "capannello" && x.id !== except && x.members.length >= 1 && x.members.length < max);
}

export type FewestRule = "fewest guests" | "fewest of own faction" | "random";

/**
 * The Capannello with the fewest guests; ties go to the fewest of the guest's own faction, then at
 * random (one draw from `rng`, only on a tie that far). Null when there's none.
 */
export function fewestGuests<G extends Group>(faction: string, groups: G[], factionOf: (name: string) => string, rng: Rng): { group: G; rule: FewestRule } | null {
  if (!groups.length) return null;
  const least = Math.min(...groups.map((g) => g.members.length));
  let pool = groups.filter((g) => g.members.length === least);
  if (pool.length === 1) return { group: pool[0]!, rule: "fewest guests" };
  const mine = (g: G) => g.members.filter((m) => factionOf(m) === faction).length;
  const fewestMine = Math.min(...pool.map(mine));
  pool = pool.filter((g) => mine(g) === fewestMine);
  if (pool.length === 1) return { group: pool[0]!, rule: "fewest of own faction" };
  return { group: pool[Math.floor(rng() * pool.length)]!, rule: "random" };
}

/** Collisions (Mechanics, Movement): into a full group, the guest least involved there moves (lowest importance, first on a tie). */
export function leastInvolved(members: readonly string[], importance: (name: string) => number): string {
  return [...members].sort((a, b) => importance(a) - importance(b))[0]!;
}

/**
 * Before seating (TD < 0.23): a guest back from a Colloquio returns to the Capannello they left, or to
 * the smallest open one if it's full or closed.
 */
export function returnSeat<G extends Group>(back: G | undefined, groups: Iterable<G>, max: number): G {
  if (back && back.open && back.members.length < max) return back;
  return [...groups].filter((x) => x.open && x.kind === "capannello" && x.members.length < max).sort((x, y) => x.members.length - y.members.length)[0]!;
}

/**
 * The interim lone-guest rule (before seating, TD < 0.23): a guest alone in a Capannello joins the
 * largest other open Capannello with room. Undefined when there's none.
 */
export function interimLoneSeat<G extends Group>(lone: G, groups: Iterable<G>, max: number): G | undefined {
  return [...groups].filter((x) => x.open && x.kind === "capannello" && x.id !== lone.id && x.members.length >= 1 && x.members.length < max).sort((a, b) => b.members.length - a.members.length)[0];
}

/** The Capannello an initiator called from, and who else was in it then. */
export interface Snapshot {
  capannello: string;
  guests: readonly string[];
}

export type InitiatorSeat = { seat: "own" } | { seat: "elsewhere"; reason: "free Colloquio caller" | "own dissolved" | "own full" };

/**
 * Ending a Colloquio, the initiator: back to the Capannello they called from, unless they called none
 * (a free Colloquio's caller), it has dissolved (closed, or none of the snapshot's guests remain), or it's full.
 */
export function initiatorSeat(snapshot: Snapshot | null, own: Group | undefined, max: number): InitiatorSeat {
  if (!snapshot || !own) return { seat: "elsewhere", reason: "free Colloquio caller" };
  if (!own.open || !snapshot.guests.some((g) => own.members.includes(g))) return { seat: "elsewhere", reason: "own dissolved" };
  if (own.members.length >= max) return { seat: "elsewhere", reason: "own full" };
  return { seat: "own" };
}

export type SeatProblem = "join target not seated with room" | "colloquio target not free" | "wait with room" | "unknown choice";

/**
 * Ending a Colloquio, the invitee's choice: join a guest in a Capannello with room, call a free
 * Colloquio with a free living guest, or wait (only when no Capannello has room).
 */
export function inviteeSeatProblem(
  choice: string,
  target: string | null,
  o: { invitee: string; groups: readonly Group[]; living: readonly string[]; inColloquio: (name: string) => boolean },
): SeatProblem | null {
  if (choice === "join") return target && o.groups.some((g) => g.members.includes(target)) ? null : "join target not seated with room";
  if (choice === "colloquio") return target && target !== o.invitee && o.living.includes(target) && !o.inColloquio(target) ? null : "colloquio target not free";
  if (choice === "wait") return o.groups.length ? "wait with room" : null;
  return "unknown choice";
}

/** A lone guest's free move (Mechanics, A Capannello Left With One Guest): toward a guest in another Capannello with room. */
export const loneSeatValid = (target: string | null, groups: readonly Group[]): boolean => !!target && groups.some((g) => g.members.includes(target));

/** How a lone guest is seated: nowhere open (they stay), one place (they go), or a choice. */
export function loneSeatOptions(groups: readonly Group[]): "stays" | "only one open" | "choose" {
  return !groups.length ? "stays" : groups.length === 1 ? "only one open" : "choose";
}
