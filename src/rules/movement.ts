// The movement windows and the opening groups (Mechanics: Capannello Initialization; Movement).
// Moved from the mini-game engine (CC-20261111-07, #71).

import { shuffle, type Rng } from "./random.ts";

/**
 * The start of a Capannello phase: everyone split at random into groups of `size`, and the movement
 * order randomized. Two shuffles from `rng`, the groups' first.
 */
export function capannelloStart(cast: readonly string[], rng: Rng, size = 3): { groups: string[][]; rotation: string[] } {
  const order = shuffle([...cast], rng);
  const rotation = shuffle([...cast], rng);
  const groups: string[][] = [];
  for (let i = 0; i < order.length; i += size) groups.push(order.slice(i, i + size));
  return { groups, rotation };
}

/** One movement window per turn, cycling through the rotation (turns count from 1). */
export const movementWindow = (rotation: readonly string[], turn: number): string => rotation[(turn - 1) % rotation.length]!;

/** A join or Colloquio with no valid target goes to the most urgent valid contact (first on a tie); null means stay. */
export function fallbackTarget(contacts: readonly { name: string; urgency: number }[]): string | null {
  return [...contacts].sort((a, b) => b.urgency - a.urgency)[0]?.name ?? null;
}
