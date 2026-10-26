// TD v0.13: speak()'s `meant` and `words` (own readings), think() after an own line, wrong-line
// words, and the 20-word cap.
import assert from "node:assert/strict";
import { test } from "node:test";
import { config, technicalDesignPath } from "../probe.config.ts";
import { parseSpeak } from "../src/output/speak.ts";
import { checkWords } from "../src/output/think.ts";
import { MemoryStore, tookTargetLine, type GameLine, type Thought } from "../src/minigame/memory.ts";
import { speakAsksMeant, tookTargetText, wordsCap } from "../src/prompt/assemble.ts";
import { loadDocs } from "../src/sources/docs.ts";
import type { CharacterName } from "../src/game/roster.ts";

const A = "Lupo" as CharacterName;
const B = "Contessa Isabella" as CharacterName;
const where = { kind: "capannello" as const, members: [A, B] };
const line = (id: string, kind: GameLine["kind"], speaker: CharacterName | null, text: string, extra: Partial<GameLine> = {}): GameLine =>
  ({ id, turn: 3, conversation: "C2", where, kind, speaker, addressee: null, text, heardBy: [A, B], ...extra }) as GameLine;
const UTTER = "Three Florins now, Contessa, and I'll keep the chapel's secret until the bells ring for the ballot tomorrow — not an hour longer.";
const speak = (o: Record<string, unknown>) =>
  parseSpeak(JSON.stringify({ addressee: null, utterance: UTTER, action: null, ...o }), { present: [B], allowedActions: [], florins: 5, meant: { cap: 20 } });

test("TD v0.13+ (default v0.14): Block 9b's meant and words lines sit after the actions and before the reply line; caps are 20", () => {
  const d = loadDocs(config.docs);
  assert.equal(d.versions.technicalDesign, "0.14");
  assert.ok(speakAsksMeant(d.templates));
  const t = d.templates.speak;
  const meant = t.indexOf("\nmeant — what this line is, as you mean it, in one word: promise, deal, threat, admission, claim, denial, insult, or none.");
  const words = t.indexOf("\nwords — if meant is not none: the words of your line that carry it, at most 20, copied exactly.");
  const reply = t.indexOf("Reply with only this JSON:");
  assert.ok(t.indexOf("{allowed_actions}") < meant && meant < words && words < reply, "actions, meant, words, reply");
  assert.equal(wordsCap(d.templates, "think"), 20);
  assert.equal(wordsCap(d.templates, "speak"), 20);
  const v12 = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.12") });
  assert.ok(!speakAsksMeant(v12.templates));
  assert.equal(wordsCap(v12.templates, "think"), 12);
});

test("meant: normalized like took; missing or unknown → none, a repair, never a failure", () => {
  for (const [raw, want] of [["deal", "deal"], ["A Promise", "promise"], ["insults", "insult"], ["THREAT.", "threat"], ["none", "none"]] as const) {
    const r = speak({ meant: raw, words: "Three Florins now" });
    assert.equal(r.verdict, "valid");
    assert.equal(r.meant, want, raw);
    assert.equal(r.meantFilled, false, raw);
  }
  for (const o of [{}, { meant: "boast" }, { meant: 3 }]) {
    const r = speak(o);
    assert.equal(r.verdict, "valid");
    assert.equal(r.meant, "none");
    assert.equal(r.meantFilled, true);
  }
});

test("speak() words: found (as written in the utterance), not found (fallback), over 20 (cut, then checked), none (dropped)", () => {
  const found = speak({ meant: "deal", words: "three florins now, contessa, and I’ll keep the chapel’s secret" });
  assert.equal(found.meantWords, "Three Florins now, Contessa, and I'll keep the chapel's secret");
  assert.equal(found.meantLog, null);
  const missing = speak({ meant: "promise", words: "I'll keep it till Easter" });
  assert.equal(missing.meantWords, null);
  assert.deepEqual(missing.meantLog, { fallback: "not in line", raw: "I'll keep it till Easter" });
  // 23 words given: cut at 20, and the first 20 are in the utterance.
  const long = "Three Florins now, Contessa, and I'll keep the chapel's secret until the bells ring for the ballot tomorrow — not an hour longer.";
  const cut = speak({ meant: "deal", words: long });
  assert.equal(cut.meantWords, "Three Florins now, Contessa, and I'll keep the chapel's secret until the bells ring for the ballot tomorrow — not an");
  assert.deepEqual(cut.meantLog, { cut: true, raw: long });
  const none = speak({ meant: "none", words: "Three Florins now" });
  assert.equal(none.meantWords, null);
  assert.deepEqual(none.meantLog, { ignored: true, raw: "Three Florins now" });
});

test("think() words: the cap is 20, cut and then checked", () => {
  const r = checkWords(UTTER, "deal", UTTER, { cap: 20 });
  assert.equal(r.words, "Three Florins now, Contessa, and I'll keep the chapel's secret until the bells ring for the ballot tomorrow — not an");
  assert.equal(r.log?.cut, true);
  // 20 exactly is kept whole.
  const twenty = Array.from({ length: 20 }, (_, i) => `w${i}`).join(" ");
  assert.deepEqual(checkWords(twenty, "claim", `${twenty} and more`, { cap: 20 }), { words: twenty, log: null });
});

test("own readings come only from speak(): a speech line with meant becomes an own reading; think() after it doesn't", () => {
  const m = new MemoryStore();
  const lines = [
    line("L10", "speech", B, "Name your price for the chapel, Lupo."),
    line("L11", "speech", A, UTTER, { meant: "deal", words: "Three Florins now" }),
    line("L12", "speech", B, "Lower your voice.", { meant: "none", words: null }),
  ];
  // Lupo thinks right after his own line (after_line L11): v0.13 attaches it to the line he answered.
  const t: Thought = { id: "T1", turn: 3, character: A, call: "think", text: "…", after_line: "L11", conversation: "C2", took: "threat", target_line: "L10", words: "Name your price" };
  const r = m.writeReadings(3, [t], lines, { ownFromSpeak: true });
  const own = r.stored.filter((x) => x.own);
  assert.equal(own.length, 1);
  assert.deepEqual({ line: own[0]!.line, took: own[0]!.took, words: own[0]!.words, thought: own[0]!.thought, source: own[0]!.source, character: own[0]!.character }, { line: "L11", took: "deal", words: "Three Florins now", thought: null, source: "speak", character: A });
  const fromThink = r.stored.find((x) => x.thought === "T1")!;
  assert.deepEqual({ line: fromThink.line, own: fromThink.own }, { line: "L10", own: false });
  // A none label writes no own reading (L12).
  assert.ok(!r.stored.some((x) => x.line === "L12"));
  // Without ownFromSpeak (TD v0.12), the same thought labels Lupo's own line and speech lines are ignored.
  const old = new MemoryStore().writeReadings(3, [{ ...t, target_line: "L11", words: null }], lines);
  assert.deepEqual(old.stored.map((x) => [x.line, x.own, x.thought]), [["L11", true, "T1"]]);
});

test("{took_target} after an own line names the line they were answering; with none, the none text", () => {
  const lines = [line("L10", "speech", B, "Name your price for the chapel, Lupo."), line("L11", "speech", A, UTTER), line("L12", "event", null, "Lupo gave Contessa Isabella 1 Florin.")];
  const t = tookTargetLine(A, "C2", "L12", lines, true);
  assert.deepEqual({ line: t.line?.id, type: t.type }, { line: "L10", type: "other" });
  assert.equal(tookTargetText({ type: "other", speaker: t.line!.speaker! }), "how you take Contessa Isabella's last line");
  // Only the character's own line in this conversation: none.
  const alone = tookTargetLine(A, "C2", "L11", [line("L11", "speech", A, UTTER)], true);
  assert.deepEqual({ line: alone.line, type: alone.type }, { line: null, type: "none" });
  // A line by someone else in a different conversation doesn't count.
  const elsewhere = tookTargetLine(A, "C2", "L11", [line("L9", "speech", B, "Elsewhere.", { conversation: "C1" }), line("L11", "speech", A, UTTER)], true);
  assert.equal(elsewhere.type, "none");
});

test("wrong-line words: found in another line the character heard → reading dropped, logged; found nowhere → fallback stands", () => {
  const lines = [line("L10", "speech", B, "Name your price for the chapel, Lupo."), line("L11", "speech", A, UTTER), line("L12", "speech", B, "The friars pay better than you think.")];
  const others = lines.filter((l) => l.id !== "L12").map((l) => ({ id: l.id, text: l.text }));
  const wrong = checkWords("name your price for the chapel", "threat", lines[2]!.text, { cap: 20, others });
  assert.deepEqual(wrong, { words: null, log: { wrong_line: "L10", raw: "name your price for the chapel" } });
  const nowhere = checkWords("the abbot's purse", "claim", lines[2]!.text, { cap: 20, others });
  assert.equal(nowhere.log?.fallback, "not in line");
  const m = new MemoryStore();
  const base = { turn: 3, character: A, call: "think", text: "…", after_line: "L12", conversation: "C2", target_line: "L12" } as const;
  const r = m.writeReadings(3, [
    { ...base, id: "T1", took: "threat", words: null, words_log: wrong.log! },
    { ...base, id: "T2", took: "claim", words: null, words_log: nowhere.log! },
  ], lines, { ownFromSpeak: true });
  assert.deepEqual(r.logged.map((e) => [e.thought, e.reason, e.words_line]), [["T1", "wrong-line words", "L10"]]);
  assert.deepEqual(r.stored.map((x) => [x.thought, x.line, x.took, x.words]), [["T2", "L12", "claim", null]]);
});
