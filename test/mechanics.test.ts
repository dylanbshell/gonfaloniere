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
import { loadDocs, readDoc } from "../src/sources/docs.ts";
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

// Mechanics v0.36 (CC-20261114-14, #139): a retitling with no rule changes. The one row the code reads that
// changed is "Pension size", now "Payroll payment" (same value); the reader takes either name. From TD v0.49
// the pin moves from v0.35 to v0.36; before TD v0.49 it stays v0.30, so a game on an older TD records the
// same Mechanics version it always has.

test("the tunables load identically from Mechanics v0.30, v0.35, and v0.36, and so do midnight's block and Named places", () => {
  const v30 = on("0.49", "0.30");
  const v35 = on("0.49", "0.35");
  const v36 = on("0.49", "0.36");
  assert.equal(v36.versions.mechanics, "0.36");
  assert.equal(v36.tunables.pension_size, 3, "v0.36's Payroll payment, under the key pension_size");
  assert.deepEqual(v36.tunables, v30.tunables, "v0.30 and v0.36");
  assert.deepEqual(v36.tunables, v35.tunables, "v0.35 and v0.36");
  assert.deepEqual(v36.midnight, v30.midnight);
  assert.equal(v36.namedPlaces, 8);
  assert.equal(v36.namedPlaces, v35.namedPlaces, "Named places carries over from v0.35");
  assert.equal(v30.namedPlaces, null, "v0.30 has no Named places row");
});

test("a Mechanics with neither name for the payroll row is refused, naming both", () => {
  const mech = readDoc(mechanicsPath("0.36")).replace(/^\| Payroll payment \|.*$/m, "");
  const path = join(mkdtempSync(join(tmpdir(), "mech-")), "Gonfaloniere_Game_Mechanics_v0.36.md");
  writeFileSync(path, mech);
  assert.throws(() => loadDocs({ ...docsFor("0.49"), mechanics: path }), /Tunable "Payroll payment" or "Pension size" not found/);
});

test("the pin: Mechanics v0.36 from TD v0.49, v0.30 before", () => {
  assert.equal(docsFor("0.49").mechanics, mechanicsPath("0.36"));
  assert.equal(docsFor("0.51").mechanics, mechanicsPath("0.36"));
  assert.equal(docsFor("0.48").mechanics, mechanicsPath("0.30"));
  assert.equal(docsFor("0.24").mechanics, mechanicsPath("0.30"));
});

test("every prompt of the fake game on TD v0.49 is the same on Mechanics v0.35 and v0.36", async () => {
  const before = (await playFakeOn(on("0.49", "0.35"))).calls;
  const after = (await playFakeOn(on("0.49", "0.36"))).calls;
  assert.equal(after.length, before.length);
  assert.equal(hash(after), hash(before));
});

test("a record made on TD v0.49 and Mechanics v0.35 still replays on its own Mechanics, every prompt byte-identical", async () => {
  const docs = on("0.49", "0.35");
  const { game } = await playFakeOn(docs);
  const settings = fakeSettings();
  const rec = { header: { game_id: "fake-mech35-g1", seed: settings.seed, cast: settings.cast, briefings: settings.briefings, docs: docs.versions, config: settings }, calls: game.calls };
  const path = join(mkdtempSync(join(tmpdir(), "mech-")), "game-fake.full.json.gz");
  writeFileSync(path, gzipSync(JSON.stringify(rec)));
  const r = await replayGame(path);
  assert.equal(r.exact, game.calls.length);
  assert.deepEqual(r.inexact, []);
});
