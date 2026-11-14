// Characters v0.15 by default (CC-20261114-13, #136; v0.12 from CC-20261113-04, #95; v0.11 from CC-20261111-06, #73). The default and the in-world names' minimum are
// separate: DEFAULT_CHARACTERS in probe.config.ts is what a run loads, `since.characters` in the setting
// pack is the first version with in-world names. v0.11 changes one phrase in Isabella's briefing.

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { DEFAULT_CHARACTERS, charactersPath, config, docsFor } from "../probe.config.ts";
import { ROSTER, nameOn, resolveAlias } from "../src/game/roster.ts";
import { CAST } from "../src/minigame/cast.ts";
import { atLeast, inWorldNames, usesInWorldNames } from "../src/prompt/names.ts";
import { loadDocs } from "../src/sources/docs.ts";
import { playFakeOn } from "./fixtures/fake-game.ts";

test("a default run loads Characters v0.15, so its record header names v0.15; the in-world minimum stays v0.10", () => {
  assert.equal(DEFAULT_CHARACTERS, "0.15");
  assert.equal(inWorldNames().since.characters, "0.10");
  assert.ok(atLeast(DEFAULT_CHARACTERS, inWorldNames().since.characters), "the default uses in-world names");
  assert.equal(docsFor("0.34").characters, charactersPath("0.15"));
  assert.equal(docsFor("0.33").characters, charactersPath("0.4"), "before TD v0.34, game names and Characters v0.4");
  // The game record's header stores loadDocs(config.docs).versions as `docs`.
  if (!process.env.PROBE_CHARACTERS) assert.equal(loadDocs(config.docs).versions.characters, "0.15");
});

test("Friar Tommaso (Characters v0.15): the roster name, with Fra Tommaso kept as an alias; a run pinned to v0.12 loads its own briefings, under the old name", () => {
  assert.ok(ROSTER.some((r) => r.name === "Friar Tommaso"));
  assert.ok(!ROSTER.some((r) => r.name === "Fra Tommaso"));
  assert.equal(resolveAlias("Fra Tommaso"), "Friar Tommaso", "the old name, as characters and older records say it");
  assert.equal(resolveAlias("Tommaso"), "Friar Tommaso");
  assert.equal(existsSync(charactersPath("0.12")), false, "v0.12 has left docs/");
  const v12 = loadDocs(docsFor("0.49", "0.12"));
  const v15 = loadDocs(docsFor("0.49", "0.15"));
  assert.equal(v12.versions.characters, "0.12");
  assert.deepEqual(Object.keys(v12.briefings), ROSTER.map((r) => r.name), "all twelve, his under v0.12's heading, ### Fra Tommaso");
  assert.deepEqual(Object.keys(v15.briefings), ROSTER.map((r) => r.name));
  assert.match(v12.briefings["Friar Tommaso"]!, /You are Fra Tommaso, a Dominican friar and a follower of the reformer Savonarola\. Florence/);
  assert.match(v15.briefings["Friar Tommaso"]!, /You are Friar Tommaso, a Dominican friar and a follower of the reformer Savonarola, and tonight you lead the Dominicans at the gathering\./);
  for (const b of Object.values(v15.briefings)) assert.ok(!b!.includes("Fra Tommaso"), "v0.15 never says the old name");
});

test("Characters v0.15: every prompt is v0.12's but for Isabella's and Francesco's briefings and his new name where code writes the roster", async () => {
  const c12 = await playFakeOn(loadDocs(docsFor("0.49", "0.12")));
  const c15 = await playFakeOn(loadDocs(docsFor("0.49", "0.15")));
  const key = (cs: typeof c12.calls) => cs.map((c) => `${c.kind}|${c.character}`);
  assert.deepEqual(key(c15.calls), key(c12.calls), "the same calls");
  const b12 = loadDocs(docsFor("0.49", "0.12")).briefings;
  const b15 = loadDocs(docsFor("0.49", "0.15")).briefings;
  // In the mini-game's cast, v0.14 and v0.15 change only Isabella's briefing (Friar Tommaso, and her
  // Relationships line for him) and Francesco's (the name, in his errand and Relationships).
  const changed = CAST.filter((n) => b12[n] !== b15[n]);
  assert.deepEqual(changed, ["Contessa Isabella", "Francesco Pazzi"]);
  // He isn't in the cast, so code names him in two places only: the attendance note's absent guests, and
  // the roster in the recorder's prompts (10a–10e). On v0.12 both still say Fra Tommaso (nameOn).
  assert.equal(nameOn("Friar Tommaso", "0.12"), "Fra Tommaso");
  assert.equal(nameOn("Friar Tommaso", "0.15"), "Friar Tommaso");
  assert.equal(nameOn("Lupo", "0.12"), "Lupo");
  const absent = /^(.*Tonight is a smaller gathering.*), Friar Tommaso, /gm;
  const roster = /^Friar Tommaso — /gm;
  const named = (t: string) => t.replace(absent, "$1, Fra Tommaso, ").replace(roster, "Fra Tommaso — ");
  const as12 = (t: string) => named(changed.reduce((x, n) => x.split(b15[n]!).join(b12[n]!), t));
  let briefed = 0;
  let renamed = 0;
  c15.calls.forEach((c, i) => {
    const o = c12.calls[i]!;
    assert.equal(as12(c.system), o.system, `${c.kind} ${i}: system, apart from the briefing and his name`);
    assert.equal(as12(c.user), o.user, `${c.kind} ${i}: user, apart from the briefing and his name`);
    if (named(c.system) !== c.system || named(c.user) !== c.user) renamed++;
    if (changed.some((n) => (c.system + c.user).includes(b15[n]!))) briefed++;
    assert.ok(!(c.system + c.user).includes("Fra Tommaso"), `${c.kind} ${i}: v0.15 never says the old name`);
  });
  assert.ok(briefed > 0 && renamed > 0, `${briefed} prompts with a v0.15 briefing, ${renamed} with his new name`);
  // Play and memory don't change, but for his name in the attendance note (a line, and its memory entries).
  const line = (l: (typeof c12.game.lines)[number]) => ({ ...l, text: named(l.text) });
  assert.deepEqual(c15.game.lines.map(line), c12.game.lines);
  assert.ok(c15.game.lines.some((l) => l.text.includes("Friar Tommaso")));
  const entry = (e: (typeof c12.game.memory.entries)[number]) => ({ ...e, summary: named(e.summary) });
  assert.deepEqual(c15.game.memory.entries.map(entry), c12.game.memory.entries);
  assert.deepEqual(c15.game.memory.beliefs, c12.game.memory.beliefs);
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
