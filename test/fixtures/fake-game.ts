// A deterministic fake mini-game for prompt comparisons: every reply depends only on the character,
// the call kind, and how many calls of that kind the character has made, so the game plays the same
// whatever order parallel calls resolve in. Valid replies throughout, with readings, moves, and seats.

import { config } from "../../probe.config.ts";
import { CAST, castBriefings } from "../../src/minigame/cast.ts";
import { MiniGame, type CallRequest, type GameSettings } from "../../src/minigame/engine.ts";
import { fakeCaller } from "../../src/minigame/fake-caller.ts";
import { loadDocs, type DocSources } from "../../src/sources/docs.ts";

export const fakeDocs = loadDocs(config.docs);

export { fakeCaller };

export function fakeSettings(over: Partial<GameSettings> = {}): GameSettings {
  return {
    cast: CAST,
    briefings: castBriefings(fakeDocs),
    seed: 2000,
    turns: 6,
    utterancesPerTurn: 12,
    historyWindow: 10,
    thoughtWindow: 4,
    maxCapannello: 4,
    maxTokens: { plan: 400, think: 250, speak: 200, move: 500, seat: 250, murder: 300, "star-pass": 1800, "claims-pass": 1000, "sweep-reask": 1800, "thought-pass": 600, "perception-pass": 800, "knowledge-check": 300 },
    playTemperature: 0.7,
    systemTemperature: 0,
    checks: [{ character: "Lupo", fact: "F2" }],
    notebook: "perceived",
    ...over,
  };
}

/** Plays the fake game and returns it with every request sent. */
export function playFake(over: Partial<GameSettings> = {}, ...rest: unknown[]): Promise<{ game: MiniGame; calls: CallRequest[] }> {
  return playFakeOn(fakeDocs, over, ...rest);
}

/** The same, on given docs (another TD version). */
export async function playFakeOn(docs: DocSources, over: Partial<GameSettings> = {}, ...rest: unknown[]): Promise<{ game: MiniGame; calls: CallRequest[] }> {
  const calls: CallRequest[] = [];
  // `rest`: the engine's further constructor arguments (hooks, the live store), passed through.
  // The briefings follow the docs, so a game on an older TD gets that version's Characters and stand-ins.
  const game = new (MiniGame as unknown as new (...a: unknown[]) => MiniGame)(docs, fakeSettings({ briefings: castBriefings(docs), ...over }), fakeCaller(calls), ...rest);
  await game.play();
  return { game, calls };
}
