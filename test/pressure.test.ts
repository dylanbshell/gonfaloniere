// TD v0.16's `pressure` (took and meant) and TD v0.15's rules: the answered-line wording, "this
// conversation" from the latest arrival, and trailing punctuation before "…". Older TDs keep theirs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { config, technicalDesignPath } from "../probe.config.ts";
import { normalizeTook, parseThink } from "../src/output/think.ts";
import { parseSpeak } from "../src/output/speak.ts";
import { MemoryStore, renderReading, tookTargetLine, wordsQuote, type GameLine, type Thought } from "../src/minigame/memory.ts";
import { labelValues, tookTargetText } from "../src/prompt/assemble.ts";
import { loadDocs } from "../src/sources/docs.ts";
import type { CharacterName } from "../src/game/roster.ts";

const v16 = loadDocs(config.docs);
const v14 = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.14") });
const A = "Lupo" as CharacterName;
const B = "Contessa Isabella" as CharacterName;
const C = "Captain Armand LeNoir" as CharacterName;
const line = (id: string, conversation: string, speaker: CharacterName | null, text: string, heardBy: CharacterName[], kind: GameLine["kind"] = speaker ? "speech" : "notaio"): GameLine =>
  ({ id, turn: 5, conversation, where: { kind: conversation === "C4" ? "colloquio" : "capannello", members: heardBy }, kind, speaker, addressee: null, text, heardBy }) as GameLine;

test("the label values come from each TD's own list: pressure from v0.16, insult from v0.12", () => {
  assert.deepEqual(labelValues(v16.templates, "think"), ["promise", "deal", "threat", "admission", "claim", "denial", "insult", "pressure", "none"]);
  assert.deepEqual(labelValues(v16.templates, "speak"), ["promise", "deal", "threat", "admission", "claim", "denial", "insult", "pressure", "none"]);
  assert.deepEqual(labelValues(v14.templates, "think"), ["promise", "deal", "threat", "admission", "claim", "denial", "insult", "none"]);
  const v10 = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.10") });
  assert.deepEqual(labelValues(v10.templates, "think"), ["promise", "deal", "threat", "admission", "claim", "denial", "none"]);
});

test("pressure in took: normalized like the others on v0.16; unknown (none) on v0.14", () => {
  const values = labelValues(v16.templates, "think");
  for (const raw of ["pressure", "Pressure", "a pressure", "pressures", "PRESSURE."]) assert.deepEqual(normalizeTook(raw, values), { took: "pressure", unknown: false }, raw);
  assert.deepEqual(normalizeTook("pressure", labelValues(v14.templates, "think")), { took: "none", unknown: true });
  const r = parseThink(JSON.stringify({ thought: "He leans on me.", took: "a pressure", words: "Answer me", importance: 40 }), { conversation: "capannello", livingOthers: [], format: "td0.3", took: true, tookValues: values, words: { line: "Answer me plainly, Lupo.", cap: 20 } });
  assert.equal(r.repaired.value?.took, "pressure");
  assert.equal(r.repaired.value?.words, "Answer me");
});

test("pressure in meant: normalized like took on v0.16; on v0.14 it's unknown, so none and a repair", () => {
  const speak = (meant: string, values: string[] | undefined) =>
    parseSpeak(JSON.stringify({ addressee: null, utterance: "Answer me plainly, Captain, or step aside.", meant, words: "Answer me plainly", action: null }), { present: [C], allowedActions: [], florins: 5, meant: { cap: 20, values } });
  for (const raw of ["Pressure", "a pressure", "pressure"]) {
    const r = speak(raw, labelValues(v16.templates, "speak"));
    assert.deepEqual([r.meant, r.meantFilled, r.meantWords], ["pressure", false, "Answer me plainly"], raw);
  }
  const old = speak("pressure", labelValues(v14.templates, "speak"));
  assert.deepEqual([old.meant, old.meantFilled, old.meantWords], ["none", true, null]);
});

test("pressure renders without an article, and isn't ★: took on someone else's line, meant on one's own", () => {
  const m = new MemoryStore();
  const lines = [line("L10", "C2", C, "Answer me plainly, Lupo: who paid you at San Frediano?", [A, C]), { ...line("L11", "C2", A, "I'll answer when you've earned it, Captain.", [A, C]), meant: "pressure", words: "I'll answer when you've earned it" } as GameLine];
  const t: Thought = { id: "T1", turn: 5, character: A, call: "think", text: "…", after_line: "L10", conversation: "C2", took: "pressure", target_line: "L10", words: "Answer me plainly, Lupo" };
  const r = m.writeReadings(5, [t], lines, { ownFromSpeak: true, sinceArrival: true }).stored;
  const took = r.find((x) => x.thought === "T1")!;
  const meant = r.find((x) => x.own)!;
  assert.deepEqual([took.salient, meant.salient], [false, false]);
  assert.equal(renderReading(took, lines[0]!), 'T5 · Capannello · Captain Armand LeNoir: "Answer me plainly, Lupo…" (you took it as pressure)');
  assert.equal(renderReading(meant, lines[1]!), 'T5 · Capannello · you: "I\'ll answer when you\'ve earned it…" (you meant it as pressure)');
});

test("v0.15: after an own line, the target names the line they were answering; earlier TDs keep 'last line'", () => {
  const lines = [line("L10", "C2", C, "Answer me plainly, Lupo.", [A, C]), line("L11", "C2", A, "I'll answer when you've earned it.", [A, C])];
  const t = tookTargetLine(A, "C2", "L11", lines, true, true);
  assert.deepEqual({ line: t.line?.id, type: t.type, answering: t.answering }, { line: "L10", type: "other", answering: true });
  const target = { type: "other" as const, speaker: C, answering: true };
  assert.equal(tookTargetText(target, "0.15"), "how you take the line of Captain Armand LeNoir's you were answering");
  assert.equal(tookTargetText(target, "0.16"), "how you take the line of Captain Armand LeNoir's you were answering");
  assert.equal(tookTargetText(target, "0.14"), "how you take Captain Armand LeNoir's last line");
  // Not after an own line: the plain wording.
  const plain = tookTargetLine(A, "C2", "L10", lines, true, true);
  assert.equal(plain.answering, false);
  assert.equal(tookTargetText({ type: "other", speaker: C, answering: plain.answering }, "0.16"), "how you take Captain Armand LeNoir's last line");
});

test("v0.15: 'this conversation' starts at the latest arrival — back from a Colloquio, earlier lines don't count", () => {
  const lines = [
    line("L10", "C2", C, "Whose arms are a silver boar?", [A, B, C]),
    line("L11", "C2", null, "Lupo was seen drawing Contessa Isabella aside.", [A, B, C]),
    line("L12", "C4", B, "Four Florins, and your eyes on the captain.", [A, B]),
    line("L13", "C2", null, "Lupo returned to company and rejoined Captain Armand LeNoir.", [A, C]),
  ];
  // Lupo's think right after returning: the boar line (L10) is from before he left.
  const back = tookTargetLine(A, "C2", "L13", lines, true, true);
  assert.deepEqual({ line: back.line, type: back.type }, { line: null, type: "none" });
  assert.equal(tookTargetText({ type: "none" }, "0.16"), "nothing yet, since no one else has spoken here since you arrived");
  // v0.14 and earlier: L10 is still named.
  assert.equal(tookTargetLine(A, "C2", "L13", lines, true, false).line?.id, "L10");
  // A line spoken after the return counts again.
  const after = [...lines, line("L14", "C2", C, "You were gone a while, Lupo.", [A, C])];
  assert.equal(tookTargetLine(A, "C2", "L14", after, true, true).line?.id, "L14");
  // The reading follows the same rule: a label after the return is "no spoken line".
  const t: Thought = { id: "T1", turn: 5, character: A, call: "think", text: "…", after_line: "L13", conversation: "C2", took: "pressure", target_line: null, words: null };
  assert.deepEqual(new MemoryStore().writeReadings(5, [t], lines, { ownFromSpeak: true, sinceArrival: true }).logged.map((e) => e.reason), ["no spoken line"]);
});

test("v0.15: trailing sentence punctuation is dropped from the words before an '…'; kept at the line's end, and on earlier TDs", () => {
  const text = "Florence has buried husbands enough, and I have done with both. Let the ballot speak now.";
  assert.equal(wordsQuote("and I have done with both.", text, true), "…and I have done with both…");
  assert.equal(wordsQuote("and I have done with both.", text, false), "…and I have done with both.…");
  assert.equal(wordsQuote("Let the ballot speak now.", text, true), "…Let the ballot speak now.");
  assert.equal(wordsQuote("Florence has buried husbands enough,", text, true), "Florence has buried husbands enough…");
});
