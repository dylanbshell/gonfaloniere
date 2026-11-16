// The demo's build-time data (CC-20261116-01, #172): what `npm run play`'s server computes at startup,
// computed once in Node and embedded in the page as JSON. test/demo.test.ts checks it survives the trip.

import { config } from "../../probe.config.ts";
import { CAST, castBriefings } from "../../src/minigame/cast.ts";
import { playable } from "../../src/minigame/player.ts";
import { screenInfo } from "../../src/minigame/screen-info.ts";
import { loadDocs } from "../../src/sources/docs.ts";

export function demoData() {
  const docs = loadDocs(config.docs);
  const briefings = castBriefings(docs);
  /** The guests a player may choose: setting.json's playable characters who are in the mini-game's cast (as play.ts). */
  const choices = playable().filter((n) => CAST.includes(n));
  const info = screenInfo(choices, briefings, { tunables: docs.tunables, minigame: true });
  return { docs, briefings, choices, info };
}

export type DemoData = ReturnType<typeof demoData>;
