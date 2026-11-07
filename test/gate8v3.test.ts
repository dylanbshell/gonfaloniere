// Gate 8, rubric gate8 v3 (CC-20261107-05): the list is made blind, from the same conversation-turns and
// context the recorder reads, and the rubric can't change silently.

import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type Anthropic from "@anthropic-ai/sdk";
import { memoryDefinitions } from "../src/sources/docs.ts";
import { Judge, StopError, convTurns, listingSystem, listingUser, matchingSystem, matchingUser, rubric, type Rec } from "../src/minigame/gate8v3.ts";
import { fakeDocs, playFake } from "./fixtures/fake-game.ts";

const defs = memoryDefinitions(fakeDocs);
const { game, calls } = await playFake();
const rec = { header: { game_id: "fake", seed: 2000, docs: fakeDocs.versions }, lines: game.lines, thoughts: game.thoughts, memory: { entries: game.memory.entries, beliefs: game.memory.beliefs, dropped: game.memory.dropped }, knowledge_checks: [], calls: [], summary: {} } as unknown as Rec;

test("the rubric is registered as gate8 v3, with TD's DEFINITIONS word for word", () => {
  assert.deepEqual(rubric(defs), { name: "gate8 v3", fingerprint: "bf6627ab7d4e" });
  for (const d of defs.filter((x) => ["promise", "deal", "threat", "admission", "toward"].includes(x.term))) assert.ok(listingSystem(defs).includes(d.line), d.term);
  for (const d of defs) assert.ok(matchingSystem(defs).includes(d.line), d.term);
  assert.ok(!listingSystem(defs).includes("- claim: "), "the listing judge sees only the ★ kinds");
});

test("conversation-turns and their context are the ones 10a and 10d read, and the listing sees no record", () => {
  const cts = convTurns(rec);
  // One ★ pass per conversation-turn in play.
  const starUsers = calls.filter((c) => c.kind === "star-pass").map((c) => c.user);
  assert.equal(cts.length, starUsers.length);
  for (const ct of cts) {
    assert.ok(ct.lines.some((l) => l.kind === "speech"));
    assert.ok(ct.context.length <= 4 && ct.context.every((l) => l.turn < ct.turn && l.conversation === ct.conversation));
    const u = listingUser(ct);
    assert.ok(!/ENTRIES|\bE\d+\b|belief/i.test(u), `${ct.key}: the listing prompt holds only lines`);
    assert.ok(starUsers.some((s) => ct.lines.every((l) => s.includes(`[${l.id}]`))), `${ct.key}: the recorder read the same lines`);
  }
  const m = matchingUser(cts[0]!, [{ id: "I1", lines: [cts[0]!.lines[0]!.id], type: "promise", speaker: "Lupo", toward: null, description: "x" }], []);
  assert.ok(m.includes("THE LIST\n[I1] promise") && m.includes("ENTRIES\nNone."));
});

test("the judge stops before a call that could pass the Claude-credit stop, and uses only the credit key", async () => {
  process.env.ANTHROPIC_API_KEY = "must-not-be-used";
  let called = 0;
  const client = { messages: { create: async () => (called++, {}) } } as unknown as Pick<Anthropic, "messages">;
  const dir = mkdtempSync(join(tmpdir(), "credit-"));
  const j = new Judge("t", -1, client);
  assert.equal(process.env.ANTHROPIC_API_KEY, undefined);
  await assert.rejects(j.ask("S", "U", "x"), StopError);
  assert.equal(called, 0);
  assert.ok(dir);
});
