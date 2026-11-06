// TD v0.9, The perceived notebook, "Which line a label belongs to".
import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryStore, type GameLine, type Thought } from "../src/minigame/memory.ts";
import type { CharacterName } from "../src/game/roster.ts";

const A = "Lupo" as CharacterName;
const B = "Contessa Isabella" as CharacterName;
const where = { kind: "colloquio" as const, members: [A, B] };
const line = (id: string, kind: GameLine["kind"], speaker: CharacterName | null, text: string, addressee: CharacterName | null = null): GameLine => ({
  id, turn: 2, conversation: "C3", where, kind, speaker, addressee, text, heardBy: [A, B],
});
const thought = (id: string, character: CharacterName, after: string, took: Thought["took"]): Thought => ({
  id, turn: 2, character, call: "think", text: "…", after_line: after, conversation: "C3", took,
});

test("speech → thought: the label attaches to the speech line", () => {
  const m = new MemoryStore();
  const lines = [line("L10", "speech", A, "Pay, or the Captain hears of San Frediano.")];
  const r = m.writeReadings(2, [thought("T1", B, "L10", "threat")], lines);
  assert.equal(r.stored.length, 1);
  assert.deepEqual({ line: r.stored[0]!.line, speaker: r.stored[0]!.speaker, own: r.stored[0]!.own, salient: r.stored[0]!.salient }, { line: "L10", speaker: A, own: false, salient: true });
  assert.ok(r.stored[0]!.about.includes(A));
});

test("speech → action line → thought: still the speech line", () => {
  const m = new MemoryStore();
  const lines = [line("L10", "speech", B, "Take these, and say nothing."), line("L11", "event", null, "Contessa Isabella gave Lupo 3 Florins.")];
  const r = m.writeReadings(2, [thought("T1", A, "L11", "deal")], lines);
  assert.equal(r.stored[0]?.line, "L10");
});

test("speech → Il Notaio note → thought: still the speech line", () => {
  const m = new MemoryStore();
  const lines = [line("L10", "speech", A, "Not a word, then."), line("L11", "notaio", null, "Captain Armand LeNoir joined Lupo and Contessa Isabella.")];
  const r = m.writeReadings(2, [thought("T1", B, "L11", "promise")], lines);
  assert.equal(r.stored[0]?.line, "L10");
});

test("only an Il Notaio note before the thought: ignored and logged", () => {
  const m = new MemoryStore();
  const lines = [line("L10", "notaio", null, "Lupo drew Contessa Isabella aside.")];
  const r = m.writeReadings(2, [thought("T1", B, "L10", "threat")], lines);
  assert.equal(r.stored.length, 0);
  assert.deepEqual(r.logged.map((e) => [e.reason, e.line]), [["no spoken line", null]]);
});

test("two labels for the same line: the first stands, the later one is logged", () => {
  const m = new MemoryStore();
  const lines = [line("L10", "speech", A, "You'll regret this, Contessa.")];
  const r = m.writeReadings(2, [thought("T1", B, "L10", "threat"), thought("T2", B, "L10", "promise"), thought("T3", B, "L10", "threat")], lines);
  assert.equal(r.stored.length, 1);
  assert.equal(r.stored[0]!.took, "threat");
  assert.deepEqual(r.logged.map((e) => e.reason), ["later different label", "same label again"]);
  assert.equal(r.logged[0]!.standing, r.stored[0]!.id);
});

test("none is no reading; a label on one's own line is marked own; about = speaker, addressee, names in the line", () => {
  const m = new MemoryStore();
  const lines = [line("L10", "speech", A, "I'll keep the Captain and Giorgia from your door.", B)];
  const r = m.writeReadings(2, [thought("T1", B, "L10", "none"), thought("T2", A, "L10", "promise")], lines);
  assert.equal(r.stored.length, 1);
  assert.equal(r.stored[0]!.own, true);
  assert.equal(r.stored[0]!.character, A);
  assert.deepEqual(new Set(r.stored[0]!.about), new Set([A, B, "Captain Armand LeNoir", "Giorgia Pazzi"]));
});

test("a line the character didn't hear (before they joined) can't take the label", () => {
  const m = new MemoryStore();
  const C = "Giorgia Pazzi" as CharacterName;
  const lines = [{ ...line("L10", "speech", A, "Before you came."), heardBy: [A, B] }, line("L11", "notaio", null, "Giorgia Pazzi joined.")];
  const r = m.writeReadings(2, [{ ...thought("T1", C, "L11", "claim") }], lines);
  assert.equal(r.stored.length, 0);
  assert.equal(r.logged[0]?.reason, "no spoken line");
});
