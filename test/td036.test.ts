// TD v0.36 (CC-20261107-10, #52): Il Notaio's entries name their people, no knowledge check for a fact
// known at start, the arrival label, and `retrieval: embeddings` as the default, each gated on the TD.

import assert from "node:assert/strict";
import { test } from "node:test";
import { docsFor } from "../probe.config.ts";
import type { CharacterName } from "../src/game/roster.ts";
import { knewAtStart } from "../src/minigame/cast.ts";
import { EMBED_PROVIDER } from "../src/minigame/embed.ts";
import { defaultRetrieval, pinsEmbeddingProvider } from "../src/minigame/store.ts";
import { hasArrival, inWorldNames, inWorldTime } from "../src/prompt/names.ts";
import { loadDocs } from "../src/sources/docs.ts";
import { playFakeOn } from "./fixtures/fake-game.ts";

const docs35 = loadDocs(docsFor("0.35"));
const docs36 = loadDocs(docsFor("0.36"));
const F = "Francesco Pazzi" as CharacterName;
const L = "Lupo" as CharacterName;
// (Francesco, F3) is a real check; (Lupo, F2) is known at start from v0.36.
const checks = [
  { character: F, fact: "F3" },
  { character: L, fact: "F2" },
];
const g35 = await playFakeOn(docs35, { checks });
const g36 = await playFakeOn(docs36, { checks });

test("PROBE_TD defaults to 0.36", async () => {
  const { config } = await import("../probe.config.ts");
  assert.equal(config.docs.technicalDesign, "docs/Gonfaloniere_Technical_Design_v0.36.md");
});

test("Il Notaio's entries: the narrator as speaker and the event's people as `about` from v0.36; both empty before", () => {
  const narrator = inWorldNames().narrator.name;
  const events36 = g36.game.memory.entries.filter((e) => e.type === "event");
  const events35 = g35.game.memory.entries.filter((e) => e.type === "event");
  assert.ok(events36.length > 20);
  assert.ok(events35.every((e) => e.speaker === null && e.about.length === 0), "v0.35 unchanged");
  const cast = g36.game.lines.length ? [...new Set(g36.game.lines.flatMap((l) => l.heardBy))] : [];
  let joins = 0;
  let withdrawals = 0;
  for (const e of events36) {
    assert.equal(e.speaker, narrator);
    assert.equal(e.toward, null);
    assert.ok(e.about.length > 0, `${e.id}: ${e.summary}`);
    // `about` comes from the event, and every name in it is in the note: no one is read in from elsewhere.
    for (const a of e.about) assert.ok(e.summary.includes(a), `${e.id}: ${a} in "${e.summary}"`);
    if (/^Tonight is a smaller gathering/.test(e.summary)) assert.deepEqual([...e.about].sort(), [...cast].sort(), "the attendance note announces the cast");
    const join = e.summary.match(/^(.+?) (?:returned to company and )?(?:re)?joined /);
    if (join) {
      joins++;
      assert.deepEqual(e.about, [join[1]], `${e.id}: the mover`);
    }
    const aside = e.summary.match(/^(.+?) drew (.+?) aside from company/) ?? e.summary.match(/^(.+?) was once again seen withdrawing in private, this time with (.+?)\.$/);
    if (aside) {
      withdrawals++;
      assert.deepEqual(e.about, [aside[1], aside[2]], `${e.id}: both guests`);
    }
  }
  assert.ok(joins > 0 && withdrawals > 0, `${joins} joins, ${withdrawals} withdrawals`);
});

test("the knowledge checks see Il Notaio's notes about the fact's people, by name, from v0.36", () => {
  // F3 names Giorgia and LeNoir. Before v0.36 his notes had no names, so they could come in only as one of
  // the 10 most similar entries; from v0.36 every note he heard about either is selected by name.
  const key = ["Giorgia Pazzi", "Captain Armand LeNoir"];
  const shown = g36.game.knowledgeChecks.find((k) => k.character === F)!.evidenceShown.entries;
  const notes = g36.game.memory.entries.filter((e) => e.type === "event" && e.audience.includes(F) && e.about.some((a) => key.includes(a)));
  assert.ok(notes.length > 0);
  for (const e of notes) assert.ok(shown.includes(e.id), `${e.id}: ${e.summary}`);
  const ask = g36.calls.find((c) => c.kind === "knowledge-check" && c.character === F)!.user;
  for (const e of notes) assert.ok(ask.includes(`[${e.id}] `), e.id);
});

test("no knowledge check for a fact the character starts with: recorded as known_at_start, with no call", () => {
  assert.deepEqual(
    docs36.plotFacts.map((f) => [f.id, f.knownAtStart]),
    [
      ["F1", ["Clarice Orsini", "Francesco Pazzi"]],
      ["F2", ["Contessa Isabella", "Lupo"]],
      ["F3", ["Giorgia Pazzi", "Captain Armand LeNoir"]],
      ["F4", ["Contessa Isabella", "Lupo"]],
      ["F5", ["Lupo", "Contessa Isabella", "Sister Beatrice"]],
    ],
  );
  assert.ok(docs35.plotFacts.every((f) => f.knownAtStart === undefined), "no column before v0.36");
  const k36 = g36.game.knowledgeChecks;
  assert.deepEqual(k36.map((k) => [k.character, k.fact, k.verdict?.verdict]), [
    [F, "F3", k36[0]!.verdict?.verdict],
    [L, "F2", "known_at_start"],
  ]);
  assert.notEqual(k36[0]!.verdict?.verdict, "known_at_start");
  assert.deepEqual(k36[1]!.flags, []);
  const calls = (g: typeof g36) => g.calls.filter((c) => c.kind === "knowledge-check").map((c) => c.character);
  assert.deepEqual(calls(g36), [F]);
  assert.deepEqual(calls(g35), [F, L], "v0.35 still checks every pair");
});

test("who knew a fact at the start in a saved game: the verdict from v0.36; Raffaello and F2 only with his stand-in briefing", () => {
  const k = (character: string, fact: string, verdict: string | null = "none") => ({ character, fact, verdict: verdict ? { verdict } : null });
  assert.equal(knewAtStart(k("Lupo", "F2", "known_at_start"), "0.10"), true);
  assert.equal(knewAtStart(k("Contessa Isabella", "F2"), "0.10"), true);
  // Characters v0.8 dropped it; the stand-in briefing (Characters v0.4 games) gave it.
  assert.equal(knewAtStart(k("Raffaello de' Medici", "F2"), "0.10"), false);
  assert.equal(knewAtStart(k("Raffaello de' Medici", "F2"), "0.4"), true);
  assert.equal(knewAtStart(k("Raffaello de' Medici", "F2"), undefined), true);
  assert.equal(knewAtStart(k("Francesco Pazzi", "F3", null), "0.10"), false);
});

test("arrival: turn 0 is \"arrival\" in block 6 and \"The guests' arrival\" in block 5 from v0.36", () => {
  assert.equal(hasArrival("0.35"), false);
  assert.equal(hasArrival("0.36"), true);
  assert.equal(inWorldTime("0.35", 6)(0), "1st round, early");
  assert.equal(inWorldTime("0.36", 6)(0), "arrival");
  assert.equal(inWorldTime("0.36", 6)(1), "1st round, early");
  assert.equal(inWorldTime("0.36", 6)(6), "1st round, late");
  const plans = g36.calls.filter((c) => c.kind === "plan");
  assert.ok(plans.length === 6 && plans.every((c) => c.user.includes("\nThe guests' arrival\n")));
  assert.ok(g36.calls.filter((c) => c.kind === "think").every((c) => !c.user.includes("The guests' arrival")));
});

test("retrieval: embeddings is the default from v0.36, pinned to one provider; overlap before", () => {
  assert.equal(defaultRetrieval("0.35"), "overlap");
  assert.equal(defaultRetrieval("0.36"), "embeddings");
  assert.equal(defaultRetrieval("1.0"), "embeddings");
  assert.equal(pinsEmbeddingProvider("0.35"), false);
  assert.equal(pinsEmbeddingProvider("0.36"), true);
  assert.equal(EMBED_PROVIDER, "nebius");
});
