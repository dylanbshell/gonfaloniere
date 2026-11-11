// Seeded randomness for the rules (TD v0.39, Layers): the caller makes one generator from the game's
// seed and passes it in, so the same seed gives the same result. Moved from the mini-game engine.

/** A generator of numbers in [0, 1). */
export type Rng = () => number;

/** mulberry32: small, fast, and the generator every saved game was played with. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates, in place; returns the array. */
export function shuffle<T>(xs: T[], rng: Rng): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
}
