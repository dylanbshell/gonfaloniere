// TD v0.17, Memory Writing, Retrieval: at most 2 `pressure` readings in block 6's similarity fill
// (step 3); steps 1 and 2 are unchanged, and older TDs (no cap) keep their behaviour.
import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryStore, type GameLine, type Thought } from "../src/minigame/memory.ts";
import type { CharacterName } from "../src/game/roster.ts";

const A = "Lupo" as CharacterName;
const C = "Captain Armand LeNoir" as CharacterName;
const R = "Raffaello de' Medici" as CharacterName;
const where = { kind: "capannello" as const, members: [A, C, R] };
const line = (n: number, speaker: CharacterName, text: string): GameLine =>
  ({ id: `L${n}`, turn: 2 + Math.floor(n / 10), conversation: "C2", where, kind: "speech", speaker, addressee: null, text, heardBy: [A, C, R] }) as GameLine;
const thought = (n: number, took: Thought["took"], l: GameLine): Thought =>
  ({ id: `T${n}`, turn: l.turn, character: A, call: "think", text: "…", after_line: l.id, conversation: "C2", took, target_line: l.id, words: null }) as Thought;

/** Lupo's notebook: 10 pressure readings on Raffaello's lines, and 4 claims and 2 insults on LeNoir's. */
function notebook(cap: number | null) {
  const m = new MemoryStore();
  m.fillPressureCap = cap;
  const lines: GameLine[] = [];
  const thoughts: Thought[] = [];
  for (let i = 1; i <= 10; i++) {
    const l = line(i, R, `Answer me plainly, Lupo, about the seal and the gate (${i}).`);
    lines.push(l);
    thoughts.push(thought(i, "pressure", l));
  }
  for (let i = 11; i <= 16; i++) {
    const l = line(i, C, `The gate at San Frediano was open that night (${i}).`);
    lines.push(l);
    thoughts.push(thought(i, i <= 14 ? "claim" : "insult", l));
  }
  for (const t of [...new Set(lines.map((l) => l.turn))]) m.writeReadings(t, thoughts, lines, { ownFromSpeak: true, sinceArrival: true });
  return m;
}

test("v0.17: a notebook full of pressure readings yields at most 2 in the fill, the rest filled by other entries", () => {
  const m = notebook(2);
  assert.equal(m.readings.filter((r) => r.took === "pressure").length, 10);
  // Nobody present, so steps 1 and 2 add nothing: every line comes from the fill, queried on the pressure lines' words.
  const block6 = m.retrieveNotebook(A, [], ["Answer me plainly, Lupo, about the seal and the gate"]);
  assert.equal(block6.filter((s) => s.endsWith("(you took it as pressure)")).length, 2);
  assert.equal(block6.filter((s) => / \(you took it as (a claim|an insult)\)$/.test(s)).length, 6, "the claims and insults fill the rest");
});

test("v0.16 and earlier (no cap): the same notebook fills with pressure readings, as before", () => {
  const block6 = notebook(null).retrieveNotebook(A, [], ["Answer me plainly, Lupo, about the seal and the gate"]);
  assert.ok(block6.filter((s) => s.endsWith("(you took it as pressure)")).length > 2);
});
