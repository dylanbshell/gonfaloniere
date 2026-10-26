// TD v0.14: think() words found in an earlier line by the same speaker keep the reading (rule 5),
// a different speaker's line drops it, and {took_target}'s new none text.
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkWords } from "../src/output/think.ts";
import { MemoryStore, memoryCounts, renderReading, tookTargetLine, type GameLine, type Thought } from "../src/minigame/memory.ts";
import { tookTargetText } from "../src/prompt/assemble.ts";
import type { CharacterName } from "../src/game/roster.ts";

const A = "Lupo" as CharacterName;
const B = "Contessa Isabella" as CharacterName;
const C = "Captain Armand LeNoir" as CharacterName;
const where = { kind: "capannello" as const, members: [A, B, C] };
const line = (id: string, speaker: CharacterName | null, text: string, extra: Partial<GameLine> = {}): GameLine =>
  ({ id, turn: 3, conversation: "C2", where, kind: speaker ? "speech" : "notaio", speaker, addressee: null, text, heardBy: [A, B, C], ...extra }) as GameLine;
const LINES = [
  line("L10", B, "Three Florins for an old servant's silence, and the chapel stays shut."),
  line("L11", C, "Silence is cheap tonight, Contessa; the Embassy pays better."),
  line("L12", B, "Then let the Embassy pay, Captain. I keep my own counsel."),
];
// Lupo labels Isabella's L12 (the named line) with words from elsewhere.
const others = (named: string) => LINES.filter((l) => l.id !== named).map((l) => ({ id: l.id, text: l.text, speaker: l.speaker }));
const think = (words: string) => checkWords(words, "deal", LINES[2]!.text, { cap: 20, others: others("L12"), speaker: B });
const thought = (id: string, r: ReturnType<typeof think>): Thought =>
  ({ id, turn: 3, character: A, call: "think", text: "…", after_line: "L12", conversation: "C2", took: "deal", target_line: "L12", words: r.words, ...(r.log && { words_log: r.log }) });

test("same speaker, earlier line: the reading stays on the named line and quotes the words found", () => {
  const r = think("three florins for an old servant's silence");
  assert.deepEqual(r, { words: "Three Florins for an old servant's silence", log: { same_speaker: "L10", raw: "three florins for an old servant's silence" } });
  const m = new MemoryStore();
  const w = m.writeReadings(3, [thought("T1", r)], LINES, { ownFromSpeak: true });
  assert.equal(w.logged.length, 0);
  const reading = w.stored[0]!;
  assert.deepEqual({ line: reading.line, speaker: reading.speaker, words: reading.words, words_line: reading.words_line }, { line: "L12", speaker: B, words: "Three Florins for an old servant's silence", words_line: "L10" });
  // "…" is placed by the line the words came from: they start L10, so no leading "…".
  assert.equal(renderReading(reading, LINES[2]!, LINES[0]!), 'T3 · Capannello · ★ Contessa Isabella: "Three Florins for an old servant\'s silence…" (you took it as a deal)');
  // Retrieval renders it the same way.
  assert.ok(m.retrieveNotebook(A, [B], ["silence"]).includes(renderReading(reading, LINES[2]!, LINES[0]!)));
});

test("a different speaker's line: the reading is dropped, logged as wrong-line words", () => {
  const r = think("the Embassy pays better");
  assert.deepEqual(r, { words: null, log: { wrong_line: "L11", raw: "the Embassy pays better" } });
  const w = new MemoryStore().writeReadings(3, [thought("T1", r)], LINES, { ownFromSpeak: true });
  assert.equal(w.stored.length, 0);
  assert.deepEqual(w.logged.map((e) => [e.reason, e.words_line]), [["wrong-line words", "L11"]]);
});

test("several matches: the latest line decides, and is the one logged", () => {
  const lines = [line("L10", B, "Name your price."), line("L11", C, "Name your price, then."), line("L12", B, "I keep my own counsel.")];
  const o = lines.filter((l) => l.id !== "L12").map((l) => ({ id: l.id, text: l.text, speaker: l.speaker }));
  assert.equal(checkWords("name your price", "deal", lines[2]!.text, { cap: 20, others: o, speaker: B }).log?.wrong_line, "L11");
  const flipped = [line("L10", C, "Name your price."), line("L11", B, "Name your price, then."), line("L12", B, "I keep my own counsel.")];
  const o2 = flipped.filter((l) => l.id !== "L12").map((l) => ({ id: l.id, text: l.text, speaker: l.speaker }));
  assert.equal(checkWords("name your price", "deal", flipped[2]!.text, { cap: 20, others: o2, speaker: B }).log?.same_speaker, "L11");
});

test("TD v0.13 behaviour is unchanged: without the named line's speaker, any other line is a wrong line", () => {
  const r = checkWords("three florins for an old servant's silence", "deal", LINES[2]!.text, { cap: 20, others: LINES.slice(0, 2).map((l) => ({ id: l.id, text: l.text })) });
  assert.deepEqual(r.log, { wrong_line: "L10", raw: "three florins for an old servant's silence" });
});

test("memoryCounts reports same speaker, earlier line apart from wrong-line drops", () => {
  const m = new MemoryStore();
  const thoughts = [thought("T1", think("three florins for an old servant's silence")), thought("T2", think("the Embassy pays better")), thought("T3", think("I keep my own counsel"))];
  m.writeReadings(3, thoughts, LINES, { ownFromSpeak: true });
  const c = memoryCounts(m, thoughts);
  assert.deepEqual(
    { found: c.words.found, same: c.words.same_speaker_earlier_line, wrong: c.words.wrong_line, drops: c.wrong_line_drops, readings: c.readings },
    { found: 1, same: 1, wrong: 1, drops: 1, readings: 1 },
  );
  // T1 and T3 both label L12: the first stands (rule 3).
  assert.deepEqual(c.labels_not_stored, { "wrong-line words": 1, "same label again": 1 });
});

test("{took_target} none text (TD v0.14): the character spoke first, or has just joined", () => {
  const none = "nothing yet, since no one else has spoken here since you arrived";
  // Spoke first: only their own line in this conversation.
  const first = tookTargetLine(A, "C2", "L20", [line("L20", A, "Good evening, all.")], true);
  assert.equal(first.type, "none");
  assert.equal(tookTargetText({ type: first.type } as { type: "none" }, "0.14"), none);
  // Just joined: the lines before the join weren't heard; the join note is the last line.
  const joined = [line("L30", B, "Name your price.", { heardBy: [B, C] }), line("L31", null, "Lupo joined Contessa Isabella and Captain Armand LeNoir.")];
  const j = tookTargetLine(A, "C2", "L31", joined, true);
  assert.equal(j.type, "none");
  assert.equal(tookTargetText({ type: "none" }, "0.14"), none);
  // Earlier TDs keep their text; the label is ignored either way (no spoken line).
  assert.equal(tookTargetText({ type: "none" }, "0.13"), "how you take the last thing said aloud");
  const t: Thought = { id: "T1", turn: 3, character: A, call: "think", text: "…", after_line: "L20", conversation: "C2", took: "claim", target_line: null, words: null };
  const w = new MemoryStore().writeReadings(3, [t], [line("L20", A, "Good evening, all.")], { ownFromSpeak: true });
  assert.deepEqual(w.logged.map((e) => e.reason), ["no spoken line"]);
});
