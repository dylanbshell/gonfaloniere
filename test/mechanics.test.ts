// Mechanics v0.30 (CC-20261107-09, #53): the pin moves from v0.20, whose Tunable Values it keeps, so no prompt changes.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { docsFor, mechanicsPath } from "../probe.config.ts";
import type { CallRequest } from "../src/minigame/engine.ts";
import { replayGame } from "../src/minigame/embedding-replay.ts";
import { loadDocs } from "../src/sources/docs.ts";
import { fakeSettings, playFakeOn } from "./fixtures/fake-game.ts";

const hash = (calls: CallRequest[]) => {
  const h = createHash("sha256");
  for (const c of calls) h.update(`${c.kind}\u0000${c.character}\u0000${c.system}\u0000${c.user}\u0000${c.maxTokens}\u0001`);
  return h.digest("hex");
};
const on = (td: string, mechanics: string) => loadDocs({ ...docsFor(td), mechanics: mechanicsPath(mechanics) });

test("the pin reads Mechanics v0.30, whose Tunable Values are v0.20's", () => {
  assert.equal(docsFor("0.35").mechanics, "docs/Gonfaloniere_Game_Mechanics_v0.30.md");
  const now = on("0.35", "0.30");
  assert.equal(now.versions.mechanics, "0.30");
  assert.deepEqual(now.tunables, on("0.35", "0.20").tunables);
});

test("every prompt of the fake game is the same on Mechanics v0.20 and v0.30", async () => {
  for (const td of ["0.24", "0.35"]) {
    const before = (await playFakeOn(on(td, "0.20"))).calls;
    const after = (await playFakeOn(on(td, "0.30"))).calls;
    assert.equal(after.length, before.length, td);
    assert.equal(hash(after), hash(before), `TD v${td}`);
  }
});

test("a record made on Mechanics v0.20 still replays, every prompt byte-identical", async () => {
  const docs = on("0.35", "0.20");
  const { game } = await playFakeOn(docs);
  const settings = fakeSettings();
  const rec = { header: { game_id: "fake-mech20-g1", seed: settings.seed, cast: settings.cast, briefings: settings.briefings, docs: docs.versions, config: settings }, calls: game.calls };
  const path = join(mkdtempSync(join(tmpdir(), "mech-")), "game-fake.full.json.gz");
  writeFileSync(path, gzipSync(JSON.stringify(rec)));
  const r = await replayGame(path);
  assert.equal(r.exact, game.calls.length);
  assert.deepEqual(r.inexact, []);
});
