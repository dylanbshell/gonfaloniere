// TD v0.10, Memory Writing, Rendering in block 6 (readings, trimmed quotes, Il Notaio entries).
import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryStore, renderCodeEntryFor, renderReading, trimQuote, type GameLine, type MemoryEntry, type Reading, type Thought } from "../src/minigame/memory.ts";
import type { CharacterName } from "../src/game/roster.ts";

test("trimQuote: 15 words or fewer whole; otherwise the first 15 and …", () => {
  assert.equal(trimQuote("Three florins, and you never knew my name."), "Three florins, and you never knew my name.");
  const fifteen = Array.from({ length: 15 }, (_, i) => `w${i + 1}`).join(" ");
  assert.equal(trimQuote(fifteen), fifteen);
  assert.equal(trimQuote(`${fifteen} w16 w17`), `${fifteen}…`);
  assert.equal(trimQuote("  spaced   words  "), "spaced words");
  // A standalone dash isn't a word.
  assert.equal(trimQuote(`w1 — ${fifteen.slice(3)} w16`), `w1 — ${fifteen.slice(3)}…`);
  assert.equal(trimQuote(`${fifteen} —`), `${fifteen} —`);
});

const E = (summary: string, type: MemoryEntry["type"], turn = 5): MemoryEntry =>
  ({ id: "M1", turn, conversation: "C2", where: { kind: "capannello", members: [] }, type, speaker: null, toward: null, about: [], summary, quote: null, lines: ["L1"], audience: [], source: "code", salient: type === "payment" } as unknown as MemoryEntry);

test("Il Notaio's entries: trimmed to 15 words, shown as Il Notaio: \"…\", the actor in the second person (TD v0.10)", () => {
  assert.equal(
    renderCodeEntryFor(E("Signor Raffaello de' Medici was once again seen drawing another aside — this time Captain LeNoir, by the loggia.", "event"), "Lupo" as CharacterName),
    'T5 · Il Notaio: "Signor Raffaello de\' Medici was once again seen drawing another aside — this time Captain LeNoir…"',
  );
  assert.equal(renderCodeEntryFor(E("Lupo joined Contessa Isabella and Francesco Pazzi.", "event", 2), "Lupo" as CharacterName), 'T2 · Il Notaio: "You joined Contessa Isabella and Francesco Pazzi."');
  // The mini-game's opening attendance note (~90 tokens before v0.10).
  const attendance = renderCodeEntryFor(E("Present this evening at the Palazzo: Lupo, Contessa Isabella, Francesco Pazzi, Giorgia Pazzi, Captain Armand LeNoir, Raffaello de' Medici, and others of the city.", "event", 1), "Lupo" as CharacterName);
  assert.ok(Math.ceil(attendance.length / 3.5) <= 40, attendance);
  // Payments render as before.
  assert.equal(renderCodeEntryFor({ ...E("Lupo gave Contessa Isabella 3 Florins.", "payment", 4), where: { kind: "colloquio", members: [] } } as MemoryEntry, "Lupo" as CharacterName), "T4 · Colloquio · ★ You gave Contessa Isabella 3 Florins.");
});

const L = (id: string, speaker: string, text: string, kind: "colloquio" | "capannello", members: string[]): GameLine =>
  ({ id, turn: 4, conversation: "C2", where: { kind, members }, kind: "speech", speaker, addressee: null, text, heardBy: members } as unknown as GameLine);
const R = (line: GameLine, character: string, took: Reading["took"]): Reading =>
  ({ id: "R1", character, turn: line.turn, conversation: line.conversation, line: line.id, speaker: line.speaker, took, thought: "T1", about: [], own: line.speaker === character, salient: ["promise", "deal", "threat", "admission"].includes(took) } as unknown as Reading);

test("rendering matches TD v0.10's examples", () => {
  const deal = L("L1", "Lupo", "Three florins, and you never knew my name.", "colloquio", ["Lupo", "Contessa Isabella"]);
  assert.equal(renderReading(R(deal, "Contessa Isabella", "deal"), deal), 'T4 · Colloquio · ★ Lupo: "Three florins, and you never knew my name." (you took it as a deal)');
  const claim = { ...L("L2", "Francesco Pazzi", "The Captain walks the Embassy gardens most nights.", "capannello", ["Francesco Pazzi", "Giorgia Pazzi", "Lupo"]), turn: 5 };
  assert.equal(renderReading(R(claim, "Lupo", "claim"), claim), 'T5 · Capannello · Francesco Pazzi: "The Captain walks the Embassy gardens most nights." (you took it as a claim)');
  const own = { ...L("L3", "Lupo", "My lips are sealed, as ever.", "colloquio", ["Lupo", "Francesco Pazzi"]), turn: 6 };
  assert.equal(renderReading(R(own, "Lupo", "promise"), own), 'T6 · Colloquio with Francesco Pazzi · ★ you: "My lips are sealed, as ever." (you meant it as a promise)');
  const adm = L("L4", "Contessa Isabella", "Lower your voice.", "capannello", ["Contessa Isabella", "Lupo"]);
  assert.match(renderReading(R(adm, "Lupo", "admission"), adm), /\(you took it as an admission\)$/);
});

// TD v0.10: readings measured at ~40 tokens each (v0.9 test), so block 6 gets ~450 tokens, about 10–12 lines.
test("rendered readings of real-length lines: ~40 tokens each (chars ÷ 3.5), so 10–12 fit in ~450", (t) => {
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
  const each = tokens / rendered.length;
  t.diagnostic(`10 readings ≈ ${tokens} tokens (${each.toFixed(1)} each); ${Math.floor(450 / each)} fit in 450`);
  assert.ok(each >= 35 && each <= 45, `~40 tokens a reading, measured ${each.toFixed(1)}`);
  assert.ok(Math.floor(450 / each) >= 10, "at least 10 fit in ~450");
});

test("block 6 retrieval stays within ~450 tokens, about 10–12 lines (TD v0.10)", (t) => {
  const m = new MemoryStore();
  const members = ["Captain Armand LeNoir", "Lupo"] as CharacterName[];
  const long = "Then hear it straight, Lupo: I mean to find whose purse paid the blade, and the boar is my key to the lock.";
  const lines = Array.from({ length: 20 }, (_, i) => ({ ...L(`L${i + 1}`, "Captain Armand LeNoir", `${long} (${i})`, "capannello", members), turn: 1 + Math.floor(i / 5) }));
  const thoughts = lines.map((l, i) => ({ id: `T${i + 1}`, turn: l.turn, character: "Lupo", call: "think", text: "…", after_line: l.id, conversation: "C2", took: "threat" }) as Thought);
  for (let turn = 1; turn <= 4; turn++) m.writeReadings(turn, thoughts, lines);
  const block6 = m.retrieveNotebook("Lupo" as CharacterName, ["Captain Armand LeNoir" as CharacterName], [long]);
  const tokens = block6.reduce((a, s) => a + Math.ceil(s.length / 3.5), 0);
  t.diagnostic(`${block6.length} lines, ≈ ${tokens} tokens`);
  assert.ok(tokens <= 450, `${tokens} tokens`);
  assert.ok(block6.length >= 9 && block6.length <= 12, `${block6.length} lines`);
  // The Murder Round query (★ threats, deals, promises first) keeps to 12 lines too, with short lines.
  const short = Array.from({ length: 20 }, (_, i) => ({ ...L(`S${i + 1}`, "Captain Armand LeNoir", `Pay, or else (${i}).`, "capannello", members), turn: 5 }));
  const shortThoughts = short.map((l, i) => ({ id: `U${i + 1}`, turn: 5, character: "Lupo", call: "think", text: "…", after_line: l.id, conversation: "C2", took: "threat" }) as Thought);
  m.writeReadings(5, shortThoughts, short);
  for (let i = 0; i < 3; i++) m.beliefs.push({ id: `B${i}`, character: "Lupo" as CharacterName, kind: "suspicion", status: "held", statement: `Captain Armand LeNoir means harm (${i}).`, firstTurn: 5, lastTurn: 5, thought: "T1", quote: "x" });
  assert.equal(m.retrieveNotebook("Lupo" as CharacterName, ["Captain Armand LeNoir" as CharacterName], ["Pay"], { murder: true }).length, 12);
});
