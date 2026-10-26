// TD v0.11's `words` (block 9a step 3) and TD v0.12's `insult`: parsing, the check against the
// line, and rendering.
import assert from "node:assert/strict";
import { test } from "node:test";
import { config, technicalDesignPath } from "../probe.config.ts";
import { checkWords, normalizeTook, parseThink } from "../src/output/think.ts";
import { MemoryStore, renderReading, wordsQuote, type GameLine, type Thought } from "../src/minigame/memory.ts";
import { thinkAsksTook, thinkAsksWords, thinkNamesTarget } from "../src/prompt/assemble.ts";
import { loadDocs } from "../src/sources/docs.ts";
import type { CharacterName } from "../src/game/roster.ts";

const A = "Lupo" as CharacterName;
const B = "Contessa Isabella" as CharacterName;
const LINE = "Three florins now, and I'll say nothing of the chapel or the seal you left on Lucien's grave.";
const line = (text = LINE, speaker = B): GameLine =>
  ({ id: "L10", turn: 4, conversation: "C2", where: { kind: "capannello", members: [A, B] }, kind: "speech", speaker, addressee: null, text, heardBy: [A, B] }) as GameLine;
const reply = (o: Record<string, unknown>) => JSON.stringify({ thought: "She means it.", importance: 40, ...o });
const parse = (o: Record<string, unknown>, text: string | null = LINE) =>
  parseThink(reply(o), { conversation: "capannello", livingOthers: [], format: "td0.3", took: true, words: { line: text } });

test("TD v0.12 loads (from git history): step 2 lists insult, step 3 asks for words, and both checks still match", () => {
  const docs = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.12") });
  assert.equal(docs.versions.technicalDesign, "0.12");
  assert.ok(thinkAsksTook(docs.templates) && thinkAsksWords(docs.templates) && thinkNamesTarget(docs.templates));
  assert.match(docs.templates.think, /\n2\. took — \{took_target\}, in one word: promise, deal, threat, admission, claim, denial, insult, or none\./);
});

test("insult: normalized like the others", () => {
  for (const raw of ["insult", "Insult", "an insult", "Insults", "INSULT.", '"insult"']) assert.deepEqual(normalizeTook(raw), { took: "insult", unknown: false }, raw);
  assert.equal(parse({ took: "an insult", words: "Three florins now" }).repaired.value?.took, "insult");
});

test("insult: stored as a reading that isn't ★, rendered (you took it as an insult)", () => {
  const l = line("You are a coward behind a French sword, Captain, and all Florence knows it.", B);
  const t: Thought = { id: "T1", turn: 4, character: A, call: "think", text: "…", after_line: "L10", conversation: "C2", took: "insult", target_line: "L10", words: "a coward behind a French sword" };
  const r = new MemoryStore().writeReadings(4, [t], [l]).stored[0]!;
  assert.equal(r.salient, false);
  assert.equal(r.words, "a coward behind a French sword");
  assert.equal(renderReading(r, l), 'T4 · Capannello · Contessa Isabella: "…a coward behind a French sword…" (you took it as an insult)');
});

test("words found: kept as the line's own text, after normalizing spaces, quote marks, and case", () => {
  const v = parse({ took: "deal", words: "three florins now, and I’ll  SAY nothing" }).repaired;
  assert.equal(v.verdict, "valid");
  assert.equal(v.value?.words, "Three florins now, and I'll say nothing");
  assert.equal(v.value?.wordsLog, undefined);
  // Surrounding quote marks aren't part of the words.
  assert.equal(checkWords('"the seal you left"', "threat", LINE).words, "the seal you left");
});

test("words not in the line: words fallback, never a retry", () => {
  const r = parse({ took: "threat", words: "the seal you hid on Lucien's grave" });
  assert.equal(r.repaired.verdict, "valid");
  assert.equal(r.repaired.value?.words, null);
  assert.deepEqual(r.repaired.value?.wordsLog, { fallback: "not in line", raw: "the seal you hid on Lucien's grave" });
  assert.equal(r.repairs?.tookFilled, false);
  // Part of a word doesn't count: "pen" isn't in "pension".
  assert.equal(checkWords("pen", "deal", "Take the pension, soldier.").words, null);
  // Missing or null: the fallback too.
  assert.equal(parse({ took: "deal" }).repaired.value?.wordsLog?.fallback, "missing");
  assert.equal(parse({ took: "deal", words: null }).repaired.value?.wordsLog?.fallback, "missing");
  // No spoken line to check against (the label is ignored anyway).
  assert.equal(parse({ took: "deal", words: "Three florins" }, null).repaired.value?.wordsLog?.fallback, "no line");
});

test("more than 12 words: cut at 12 and logged, then checked", () => {
  const long = "Three florins now, and I'll say nothing of the chapel or the seal you left";
  const r = checkWords(long, "deal", LINE);
  assert.equal(r.words, "Three florins now, and I'll say nothing of the chapel or the");
  assert.deepEqual(r.log, { cut: true, raw: long });
  // Exactly 12 is not cut; a standalone dash isn't a word.
  assert.equal(checkWords("one two three four five six seven eight nine ten eleven twelve", "claim", "one two three four five six seven eight nine ten eleven twelve thirteen").log, null);
  assert.equal(checkWords("one two — three four five six seven eight nine ten eleven twelve", "claim", "one two — three four five six seven eight nine ten eleven twelve").log, null);
  // Cut, and the first 12 aren't in the line either: both logged.
  assert.deepEqual(checkWords("x " + long, "deal", LINE).log, { cut: true, fallback: "not in line", raw: "x " + long });
});

test("a none label with words given: words dropped (null), logged as ignored", () => {
  const v = parse({ took: "none", words: "Three florins now" }).repaired.value!;
  assert.equal(v.took, "none");
  assert.equal(v.words, null);
  assert.deepEqual(v.wordsLog, { ignored: true, raw: "Three florins now" });
  // A none label with null words logs nothing.
  assert.equal(parse({ took: "none", words: null }).repaired.value?.wordsLog, undefined);
});

test("ellipses: before the words if they don't start the line, after them if they don't end it", () => {
  assert.equal(wordsQuote("Three florins now", LINE), "Three florins now…");
  assert.equal(wordsQuote("I'll say nothing of the chapel", LINE), "…I'll say nothing of the chapel…");
  assert.equal(wordsQuote("the seal you left on Lucien's grave", LINE), "…the seal you left on Lucien's grave");
  assert.equal(wordsQuote(LINE, LINE), LINE);
  // Fallback: no words, so the first 15 words.
  const l = line();
  const t: Thought = { id: "T1", turn: 4, character: A, call: "think", text: "…", after_line: "L10", conversation: "C2", took: "deal", target_line: "L10", words: null };
  const r = new MemoryStore().writeReadings(4, [t], [l]).stored[0]!;
  assert.equal(r.words, null);
  assert.equal(renderReading(r, l), 'T4 · Capannello · ★ Contessa Isabella: "Three florins now, and I\'ll say nothing of the chapel or the seal you left…" (you took it as a deal)');
});
