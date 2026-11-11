// Characters v0.11 by default (CC-20261111-06, #73). The default and the in-world names' minimum are
// separate: DEFAULT_CHARACTERS in probe.config.ts is what a run loads, `since.characters` in the setting
// pack is the first version with in-world names. v0.11 changes one phrase in Isabella's briefing.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { DEFAULT_CHARACTERS, charactersPath, config, docsFor } from "../probe.config.ts";
import { atLeast, inWorldNames, usesInWorldNames } from "../src/prompt/names.ts";
import { loadDocs } from "../src/sources/docs.ts";
import { playFakeOn } from "./fixtures/fake-game.ts";

test("a default run loads Characters v0.11, so its record header names v0.11; the in-world minimum stays v0.10", () => {
  assert.equal(DEFAULT_CHARACTERS, "0.11");
  assert.equal(inWorldNames().since.characters, "0.10");
  assert.ok(atLeast(DEFAULT_CHARACTERS, inWorldNames().since.characters), "the default uses in-world names");
  assert.equal(docsFor("0.34").characters, charactersPath("0.11"));
  assert.equal(docsFor("0.33").characters, charactersPath("0.4"), "before TD v0.34, game names and Characters v0.4");
  // The game record's header stores loadDocs(config.docs).versions as `docs`.
  if (!process.env.PROBE_CHARACTERS) assert.equal(loadDocs(config.docs).versions.characters, "0.11");
});

test("a run pinned to Characters 0.10 (PROBE_CHARACTERS, or a record's own version) loads it from git history", () => {
  assert.equal(existsSync(charactersPath("0.10")), false, "v0.10 has left docs/");
  assert.equal(loadDocs(docsFor("0.36", "0.10")).versions.characters, "0.10");
  const before = process.env.PROBE_CHARACTERS;
  process.env.PROBE_CHARACTERS = "0.10";
  try {
    assert.equal(docsFor("0.36").characters, charactersPath("0.10"));
    assert.equal(docsFor("0.36", "0.11").characters, charactersPath("0.11"), "a record's version beats the environment");
  } finally {
    if (before === undefined) delete process.env.PROBE_CHARACTERS;
    else process.env.PROBE_CHARACTERS = before;
  }
});

test("the loader still refuses to mix in-world and game names: TD 0.34 with Characters 0.4, TD 0.33 with Characters 0.11", () => {
  assert.throws(() => loadDocs({ ...docsFor("0.34"), characters: charactersPath("0.4") }), /would mix/);
  assert.throws(() => usesInWorldNames({ technicalDesign: "0.33", characters: "0.11" }), /would mix/);
  assert.equal(usesInWorldNames({ technicalDesign: "0.34", characters: "0.11" }), true);
});

test("Characters v0.11: every prompt is v0.10's but Isabella's, whose briefing says Easter Mass for midnight Mass", async () => {
  const v10 = await playFakeOn(loadDocs(docsFor("0.36", "0.10")));
  const v11 = await playFakeOn(loadDocs(docsFor("0.36", "0.11")));
  const [before, after] = [v10.calls, v11.calls];
  assert.deepEqual(after.map((c) => `${c.kind}|${c.character}`), before.map((c) => `${c.kind}|${c.character}`));
  const was = "A few weeks ago, at midnight Mass in the French Embassy chapel, you watched";
  const now = "A few weeks ago, at Easter Mass in the French Embassy chapel, you watched";
  let changed = 0;
  after.forEach((c, i) => {
    const o = before[i]!;
    if (c.system === o.system && c.user === o.user) return;
    changed++;
    assert.equal(c.character, "Contessa Isabella", `${c.kind} ${i}: only Isabella's prompts change`);
    assert.equal(c.system, o.system.replace(was, now), `${c.kind} ${i}: system`);
    assert.equal(c.user, o.user.replace(was, now), `${c.kind} ${i}: user`);
  });
  assert.ok(changed > 0, "Isabella's briefing reaches her prompts");
  assert.ok(after.every((c) => !c.system.includes(was) && !c.user.includes(was)));
  // Play and memory don't change.
  assert.deepEqual(v11.game.lines, v10.game.lines);
  assert.deepEqual(v11.game.memory.entries, v10.game.memory.entries);
  assert.deepEqual(v11.game.memory.beliefs, v10.game.memory.beliefs);
});
