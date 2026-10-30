// Memory Writing, Retrieval, step 3 (the similarity fill): TD v0.17–v0.18 take at most 2 `pressure`
// readings per call; TD v0.19 at most 3 each of claim, denial, insult, and pressure, own readings
// included. Steps 1 and 2 are unchanged, and older TDs (no cap) keep their behaviour.
import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryStore, type GameLine, type Thought } from "../src/minigame/memory.ts";
import { fillCapFor } from "../src/minigame/engine.ts";
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
function notebook(cap: { labels: string[]; max: number } | null) {
  const m = new MemoryStore();
  m.fillCap = cap;
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

test("v0.17–v0.18: a notebook full of pressure readings yields at most 2 in the fill, the rest filled by other entries", () => {
  const m = notebook(fillCapFor("0.17"));
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

test("the cap by TD version: none before v0.17, pressure ≤2 in v0.17–v0.18, claim/denial/insult/pressure ≤3 from v0.19", () => {
  assert.equal(fillCapFor("0.16"), null);
  assert.deepEqual(fillCapFor("0.17"), { labels: ["pressure"], max: 2 });
  assert.deepEqual(fillCapFor("0.18"), { labels: ["pressure"], max: 2 });
  assert.deepEqual(fillCapFor("0.19"), { labels: ["claim", "denial", "insult", "pressure"], max: 3 });
});

/** A notebook heavy in claims and pressure (8 each, some of them Lupo's own lines), plus 3 insults, 2 deals, and a promise. */
function heavy(cap: { labels: string[]; max: number } | null) {
  const m = new MemoryStore();
  m.fillCap = cap;
  const lines: GameLine[] = [];
  const thoughts: Thought[] = [];
  const add = (n: number, speaker: CharacterName, took: string, text: string) => {
    const l = { ...line(n, speaker, text), ...(speaker === A && { meant: took, words: null }) } as GameLine;
    lines.push(l);
    if (speaker !== A) thoughts.push(thought(n, took as Thought["took"], l));
  };
  for (let i = 1; i <= 8; i++) add(i, i <= 6 ? R : A, "pressure", `Answer me plainly about the seal and the gate (${i}).`);
  for (let i = 11; i <= 18; i++) add(i, i <= 16 ? C : A, "claim", `The seal and the gate were Salviati's that night (${i}).`);
  for (let i = 21; i <= 23; i++) add(i, R, "insult", `A gatekeeper who sells the seal and the gate (${i}).`);
  for (let i = 31; i <= 32; i++) add(i, C, "deal", `Three Florins for the seal and the gate (${i}).`);
  add(41, R, "promise", `I will keep the seal and the gate shut (41).`);
  for (const t of [...new Set(lines.map((l) => l.turn))]) m.writeReadings(t, thoughts, lines, { ownFromSpeak: true, sinceArrival: true });
  return m;
}
const count = (block6: string[], kind: string) => block6.filter((s) => new RegExp(`\\((you took it|you meant it) as (a |an )?${kind}\\)$`).test(s)).length;

test("v0.19: a notebook heavy in claims and pressure yields at most 3 of each, own readings included; other labels fill the rest", () => {
  const m = heavy(fillCapFor("0.19"));
  assert.ok(m.readings.filter((r) => r.own).length >= 4, "own readings are in the notebook");
  // Nobody present, so every line comes from the fill.
  const block6 = m.retrieveNotebook(A, [], ["the seal and the gate"]);
  assert.deepEqual([count(block6, "pressure"), count(block6, "claim"), count(block6, "insult")], [3, 3, 3]);
  assert.equal(count(block6, "deal") + count(block6, "promise"), 3, "uncapped labels fill the rest");
  // v0.17's cap on the same notebook, queried on the pressure lines' words: pressure ≤2, claims uncapped.
  const v17 = heavy(fillCapFor("0.17")).retrieveNotebook(A, [], ["Answer me plainly about the seal and the gate"]);
  assert.equal(count(v17, "pressure"), 2);
  assert.ok(count(v17, "claim") > 3);
  // And v0.19 on that query: still 3 pressure at most.
  assert.equal(count(heavy(fillCapFor("0.19")).retrieveNotebook(A, [], ["Answer me plainly about the seal and the gate"]), "pressure"), 3);
});

test("a reading skipped for the token budget doesn't count toward its label's 3", () => {
  const m = new MemoryStore();
  m.fillCap = fillCapFor("0.19");
  const long = "Answer me plainly about the seal and the gate, Lupo, and about the purse, the chapel, the north door, the boar, the bankers' letters, and every hand that touched them, or I shall ask again in front of the whole company and the notary besides (1).";
  const lines = [line(1, R, long), ...[2, 3, 4].map((n) => line(n, R, `Answer me about the seal and the gate (${n}).`))];
  m.writeReadings(2, lines.map((l, i) => thought(i + 1, "pressure", l)), lines, { ownFromSpeak: true, sinceArrival: true });
  // A budget too small for the long reading: it's skipped, and the three short ones still all fit under the cap.
  const block6 = m.retrieveNotebook(A, [], [long], { budget: 140 });
  assert.equal(count(block6, "pressure"), 3);
  assert.ok(!block6.some((s) => s.includes("(1)")));
});
