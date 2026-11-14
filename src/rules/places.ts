// Named places (Mechanics v0.35, Movement › Named Places; TD v0.49, Movement Implementation › Named
// places). Every open conversation has one of the hall's places, and no two share one. The rules see a
// place as its index in the setting's list (0 … count − 1) and a conversation as an opaque id; the game
// keeps the names, and words the events.

import { mulberry32, shuffle, type Rng } from "./random.ts";

/** Mechanics' Tunable "Named places": never fewer than 7, so a Colloquio always finds an empty one. */
export const MIN_PLACES = 7;

/** Which place each open conversation is in: conversation id → place index. */
export type Places = ReadonlyMap<string, number>;

/** Why a conversation took a place (Mechanics, Named Places). */
export type PlaceWhy = "round start" | "colloquio" | "new group" | "council";

export type PlaceEvent =
  | { type: "placed"; conversation: string; place: number; why: PlaceWhy }
  | { type: "freed"; conversation: string; place: number }
  /** Can't happen within the rules (at most 6 conversations and one lone guest's group among 8); the game stops. */
  | { type: "no empty place"; conversation: string; why: PlaceWhy };

export interface PlaceResult {
  places: Places;
  events: PlaceEvent[];
}

/**
 * Places get a generator of their own (TD v0.49, Randomness), seeded from the game's seed, so every other
 * draw (seating, movement order, and so on) is exactly as it was before places.
 */
export function placesRng(seed: number): Rng {
  return mulberry32((Math.imul(seed >>> 0, 0x9e3779b1) ^ 0x85ebca6b) >>> 0);
}

/** Why the setting's list and Mechanics' count don't agree, or null when they do. Checked at load. */
export function placesProblem(names: number, count: number | null): string | null {
  if (count === null) return "Mechanics has no Named places row";
  if (count < MIN_PLACES) return `Mechanics' Named places is ${count}, under the minimum of ${MIN_PLACES}`;
  if (names !== count) return `the setting pack names ${names} places, and Mechanics' Named places is ${count}`;
  return null;
}

/** The places no open conversation holds, in the setting's order. */
export function emptyPlaces(places: Places, count: number): number[] {
  const taken = new Set(places.values());
  return Array.from({ length: count }, (_, i) => i).filter((i) => !taken.has(i));
}

/** Random distinct places for a set of conversations that start together, from no places held. */
function drawDistinct(conversations: readonly string[], count: number, rng: Rng, why: PlaceWhy): PlaceResult {
  const order = shuffle(Array.from({ length: count }, (_, i) => i), rng);
  const places = new Map<string, number>();
  const events: PlaceEvent[] = conversations.map((c, i) => {
    if (i >= count) return { type: "no empty place", conversation: c, why };
    places.set(c, order[i]!);
    return { type: "placed", conversation: c, place: order[i]!, why };
  });
  return { places, events };
}

/** A round of mingling starts: each of its random groups gets a random place, all different. Earlier places are gone. */
export function roundStart(groups: readonly string[], count: number, rng: Rng): PlaceResult {
  return drawDistinct(groups, count, rng, "round start");
}

/** The councils of a council phase: a random place each, all different, drawn afresh for every council phase. */
export function councilPlaces(councils: readonly string[], count: number, rng: Rng): PlaceResult {
  return drawDistinct(councils, count, rng, "council");
}

/**
 * A conversation that opens during play takes a random empty place: a Colloquio (called, a waiting call
 * that opens, or an invitee's free one), or a new group (two seatless guests pairing, or the safety net's
 * group of one). One draw from `rng`.
 */
export function placeConversation(places: Places, conversation: string, count: number, rng: Rng, why: "colloquio" | "new group"): PlaceResult {
  const empty = emptyPlaces(places, count);
  if (!empty.length) return { places, events: [{ type: "no empty place", conversation, why }] };
  const place = empty[Math.floor(rng() * empty.length)]!;
  return { places: new Map(places).set(conversation, place), events: [{ type: "placed", conversation, place, why }] };
}

/** A conversation ends or dissolves: its place is free. A group keeps its place while it lasts, so a join changes nothing. */
export function freePlace(places: Places, conversation: string): PlaceResult {
  const place = places.get(conversation);
  if (place === undefined) return { places, events: [] };
  const next = new Map(places);
  next.delete(conversation);
  return { places: next, events: [{ type: "freed", conversation, place }] };
}
