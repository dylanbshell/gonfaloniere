// TD v0.9, Memory Writing, Rendering in block 6 (readings, trimmed quotes).
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderReading, trimQuote, type GameLine, type Reading } from "../src/minigame/memory.ts";
import type { CharacterName } from "../src/game/roster.ts";

test("trimQuote: 15 words or fewer whole; otherwise the first 15 and …", () => {
  assert.equal(trimQuote("Three florins, and you never knew my name."), "Three florins, and you never knew my name.");
  const fifteen = Array.from({ length: 15 }, (_, i) => `w${i + 1}`).join(" ");
  assert.equal(trimQuote(fifteen), fifteen);
  assert.equal(trimQuote(`${fifteen} w16 w17`), `${fifteen}…`);
  assert.equal(trimQuote("  spaced   words  "), "spaced words");
});

const L = (id: string, speaker: string, text: string, kind: "colloquio" | "capannello", members: string[]): GameLine =>
  ({ id, turn: 4, conversation: "C2", where: { kind, members }, kind: "speech", speaker, addressee: null, text, heardBy: members } as unknown as GameLine);
const R = (line: GameLine, character: string, took: Reading["took"]): Reading =>
  ({ id: "R1", character, turn: line.turn, conversation: line.conversation, line: line.id, speaker: line.speaker, took, thought: "T1", about: [], own: line.speaker === character, salient: ["promise", "deal", "threat", "admission"].includes(took) } as unknown as Reading);

test("rendering matches TD v0.9's examples", () => {
  const deal = L("L1", "Lupo", "Three florins, and you never knew my name.", "colloquio", ["Lupo", "Contessa Isabella"]);
  assert.equal(renderReading(R(deal, "Contessa Isabella", "deal"), deal), 'T4 · Colloquio · ★ Lupo: "Three florins, and you never knew my name." (you took it as a deal)');
  const claim = { ...L("L2", "Francesco Pazzi", "The Captain walks the Embassy gardens most nights.", "capannello", ["Francesco Pazzi", "Giorgia Pazzi", "Lupo"]), turn: 5 };
  assert.equal(renderReading(R(claim, "Lupo", "claim"), claim), 'T5 · Capannello · Francesco Pazzi: "The Captain walks the Embassy gardens most nights." (you took it as a claim)');
  const own = { ...L("L3", "Lupo", "My lips are sealed, as ever.", "colloquio", ["Lupo", "Francesco Pazzi"]), turn: 6 };
  assert.equal(renderReading(R(own, "Lupo", "promise"), own), 'T6 · Colloquio with Francesco Pazzi · ★ you: "My lips are sealed, as ever." (you meant it as a promise)');
  const adm = L("L4", "Contessa Isabella", "Lower your voice.", "capannello", ["Contessa Isabella", "Lupo"]);
  assert.match(renderReading(R(adm, "Lupo", "admission"), adm), /\(you took it as an admission\)$/);
});

// TD v0.9 says "about 30 tokens, so about 10 fit in ~300". Measured here: ~42 tokens a reading (the 15-word
// quote alone is ~20; full speaker names and the label add the rest), so 10 come to ~420 and ~7 fit in 300.
// Flagged for Technical Design; this test guards the measured size instead of the doc's estimate.
test("10 rendered readings of real-length lines: ~42 tokens each (chars ÷ 3.5), not TD's ~30", (t) => {
  // Lines from the Oct 24 DeepSeek games: typical length 30–60 words, so most are trimmed to 15.
  const texts = [
    "Then hear it straight, Lupo: I mean to find whose purse paid the blade, and the boar is my key to the lock.",
    "Three Florins now, as a widow's charity to an old servant who has kept his silence these seven years.",
    "Then the matter is settled between your house and your man, Signor Francesco, and I'll say no more of ledgers at any table.",
    "I swear it before God and this notary: Contessa Isabella di Salviati spoke the order to me with her own lips.",
    "Mind my ears as you like, Contessa — they serve God and France both, and they've heard stranger reckonings than a widow's.",
    "Your Florins are safe in my hand and your name safer in my mouth — that's the whole of it.",
    "A Pazzi kneels to God, Contessa, and to no man's politics — and I will kneel where Florence may see it.",
    "Go, then, and go quietly — the Notaio's pen has written my name beside yours twice already.",
    "Patience sworn, then — but patience has an end, Raffaello, and mine ends when a name is spoken.",
    "No price has been named to me, Francesco — and a man who asks what price another would take has told the room his own.",
  ];
  const kinds: Reading["took"][] = ["threat", "deal", "promise", "claim", "threat", "promise", "denial", "threat", "threat", "claim"];
  const rendered = texts.map((t, i) => {
    const l = { ...L(`L${i}`, "Captain Armand LeNoir", t, i % 2 ? "colloquio" : "capannello", ["Captain Armand LeNoir", "Lupo", "Raffaello de' Medici"]), turn: 3 + (i % 5) };
    return renderReading(R(l, "Lupo", kinds[i]!), l);
  });
  const tokens = rendered.reduce((a, s) => a + Math.ceil(s.length / 3.5), 0);
  t.diagnostic(`10 readings ≈ ${tokens} tokens; ${Math.floor(300 / (tokens / 10))} fit in 300`);
  assert.ok(tokens >= 300 && tokens <= 450, `10 readings ≈ ${tokens} tokens`);
});
