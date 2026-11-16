// The fake game's settings (CC-20261116-01, #172): one place, so `npm run play -- --fake` and the static
// demo page (`npm run demo`, tools/demo/) play the same game and can't drift. No model calls: these go to
// the fake caller (fake-caller.ts). Lore is off, so nothing here needs the live store.

import type { CharacterName } from "../game/roster.ts";
import { CAST } from "./cast.ts";
import type { GameSettings } from "./engine.ts";

/** The fake game's defaults, as `npm run play`'s --turns, --seed, and --fake-delay give them. */
export const FAKE_DEFAULTS = { turns: 8, seed: 1492, delayMs: 600 } as const;

/** The settings of a fake game with a human player. */
export function fakeSettings(name: CharacterName, briefings: GameSettings["briefings"], opts: { turns?: number; seed?: number } = {}): GameSettings {
  return {
    cast: CAST,
    briefings,
    turns: opts.turns ?? FAKE_DEFAULTS.turns,
    seed: opts.seed ?? FAKE_DEFAULTS.seed,
    utterancesPerTurn: 12,
    historyWindow: 10,
    thoughtWindow: 4,
    maxCapannello: 4,
    maxTokens: { plan: 400, think: 250, speak: 200, move: 500, seat: 250, murder: 300, "star-pass": 1800, "claims-pass": 1000, "sweep-reask": 1800, "thought-pass": 600, "perception-pass": 800, "knowledge-check": 300 },
    playTemperature: 0.7,
    systemTemperature: 0,
    checks: ["F2", "F3", "F4", "F5"].flatMap((fact) => CAST.map((character) => ({ character, fact }))),
    notebook: "perceived",
    retrieval: "overlap",
    lore: "off",
    human: name,
  };
}
