// TD v0.10, Block 9a's {took_target}: the prompt names the line the label will attach to, by the
// same rule that stores the reading (The perceived notebook, "Which line a label belongs to").
import assert from "node:assert/strict";
import { test } from "node:test";
import { config } from "../probe.config.ts";
import { CAST, STANDINS, STANDIN_FILE } from "../src/minigame/cast.ts";
import { MiniGame, type CallRequest, type Caller } from "../src/minigame/engine.ts";
import { MemoryStore, tookTargetLine, type GameLine, type Thought } from "../src/minigame/memory.ts";
import { thinkAsksTook, thinkNamesTarget, tookTargetText, type TookTarget } from "../src/prompt/assemble.ts";
import { loadDocs, loadStandinBriefings } from "../src/sources/docs.ts";
import type { CharacterName } from "../src/game/roster.ts";

const A = "Lupo" as CharacterName;
const B = "Contessa Isabella" as CharacterName;
const C = "Captain Armand LeNoir" as CharacterName;
const where = { kind: "capannello" as const, members: [A, B] };
const line = (id: string, kind: GameLine["kind"], speaker: CharacterName | null, text: string, heardBy = [A, B]): GameLine => ({
  id, turn: 2, conversation: "C3", where, kind, speaker, addressee: null, text, heardBy,
});

const asTarget = (c: CharacterName, lines: GameLine[]) => {
  const { line: l, type } = tookTargetLine(c, "C3", lines.filter((x) => x.heardBy.includes(c)).at(-1)?.id ?? null, lines);
  const target: TookTarget = type === "other" ? { type, speaker: l!.speaker! } : { type };
  return { line: l?.id ?? null, type, text: tookTargetText(target) };
};

/** The reading a `took` from this thought is stored on (null if none is stored). */
const storedOn = (c: CharacterName, lines: GameLine[]) => {
  const after = lines.filter((x) => x.heardBy.includes(c)).at(-1)?.id ?? null;
  const t: Thought = { id: "T1", turn: 2, character: c, call: "think", text: "…", after_line: after, conversation: "C3", took: "promise" };
  return new MemoryStore().writeReadings(2, [t], lines).stored[0]?.line ?? null;
};

const speech = line("L10", "speech", A, "Say nothing, and the florins are yours.");
const cases: [string, GameLine[]][] = [
  ["after a line", [speech]],
  ["after an action line", [speech, line("L11", "event", null, "Lupo gave Contessa Isabella 3 Florins.")]],
  ["after an Il Notaio note", [speech, line("L11", "notaio", null, "Captain Armand LeNoir drew Signor Raffaello de' Medici aside.")]],
];

for (const [when, lines] of cases) {
  test(`someone else's line, ${when}: names the speaker, and the reading lands there`, () => {
    const t = asTarget(B, lines);
    assert.deepEqual(t, { line: "L10", type: "other", text: "how you take Lupo's last line" });
    assert.equal(storedOn(B, lines), t.line);
  });

  test(`own line, ${when}: asks what they meant, and the reading lands there`, () => {
    const t = asTarget(A, lines);
    assert.deepEqual(t, { line: "L10", type: "own", text: "what you meant by your own last line" });
    assert.equal(storedOn(A, lines), t.line);
  });
}

test("no spoken line (only an Il Notaio note): the last thing said aloud, and the label is ignored", () => {
  const lines = [line("L9", "notaio", null, "The guests drifted into company: Lupo and Contessa Isabella.")];
  assert.deepEqual(asTarget(A, lines), { line: null, type: "none", text: "how you take the last thing said aloud" });
  assert.equal(storedOn(A, lines), null);
});

test("no spoken line (a joiner's first thought): a line spoken before they joined doesn't count", () => {
  const lines = [speech, line("L11", "notaio", null, "Captain Armand LeNoir joined Lupo and Contessa Isabella.", [A, B, C])];
  assert.deepEqual(asTarget(C, lines), { line: null, type: "none", text: "how you take the last thing said aloud" });
  assert.equal(storedOn(C, lines), null);
});

test("the latest speech wins: own line after someone else's, and someone else's after one's own", () => {
  const lines = [speech, line("L11", "speech", B, "Then we understand each other."), line("L12", "event", null, "Contessa Isabella gave Lupo 1 Florin.")];
  assert.equal(asTarget(B, lines).type, "own");
  assert.deepEqual(asTarget(A, lines), { line: "L11", type: "other", text: "how you take Contessa Isabella's last line" });
});

// ---- In play: the real engine with a fake caller ------------------------------------------------

const docs = loadDocs(config.docs);
const briefings = { ...docs.briefings, ...loadStandinBriefings(STANDIN_FILE, STANDINS, docs.socialAwareness) };

test("TD v0.10 loads: 9a has {took_target}, and thinkAsksTook still matches", () => {
  assert.equal(docs.versions.technicalDesign, "0.10");
  assert.ok(thinkAsksTook(docs.templates));
  assert.ok(thinkNamesTarget(docs.templates));
  assert.match(docs.templates.think, /\n2\. took — \{took_target\}, in one word: promise, deal, threat, admission, claim, denial, or none\./);
});

test("in play, every think() prompt names the line its reading is stored on (closing thinks included)", async () => {
  const prompts: { character: string; user: string }[] = [];
  const caller: Caller = async (req: CallRequest) => {
    const colloquio = req.user.includes('"done": false}');
    const others = CAST.filter((c) => c !== req.character);
    if (req.kind === "think") prompts.push({ character: req.character!, user: req.user });
    const content = {
      plan: () => ({ thought: "A plan.", plan: "Goals: win. Threats: all. Next moves: talk." }),
      think: () => ({ thought: `Thinking ${prompts.length}.`, took: "promise", importance: 50, ...(colloquio && { done: false }) }),
      speak: () => (req.user.includes('"addressee"') ? { addressee: null, utterance: "A fine evening.", action: null } : { utterance: "A fine evening.", action: null }),
      move: () => ({ thought: "Move.", contacts: others.map((n) => ({ name: n, urgency: 50, purpose: null })), choice: "colloquio", target: others[0] }),
      murder: () => "x",
      "star-pass": () => ({ sweep: [], entries: [] }),
      "claims-pass": () => ({ entries: [] }),
      "sweep-reask": () => ({ sweep: [], entries: [] }),
      "thought-pass": () => ({ beliefs: [] }),
      "perception-pass": () => ({ notes: [] }),
      "knowledge-check": () => ({ reasoning: "x", verdict: "none", evidence: [], told_by: [] }),
    }[req.kind]();
    return { ok: true, content: typeof content === "string" ? content : JSON.stringify(content), error: null, costUsd: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0, provider: "fake", model: "fake" };
  };
  const g = new MiniGame(
    docs,
    {
      cast: CAST, briefings, seed: 11, turns: 3, utterancesPerTurn: 12, historyWindow: 10, thoughtWindow: 4, maxCapannello: 4,
      maxTokens: { plan: 400, think: 250, speak: 200, move: 500, murder: 300, "star-pass": 1800, "claims-pass": 1000, "sweep-reask": 1800, "thought-pass": 600, "perception-pass": 800, "knowledge-check": 300 },
      playTemperature: 0.7, systemTemperature: 0, checks: [], notebook: "perceived",
    },
    caller,
  );
  await g.play();

  const thinks = g.thoughts.filter((t) => t.call === "think");
  assert.equal(thinks.length, prompts.length);
  const byLine = new Map(g.lines.map((l) => [l.id, l]));
  const seen = new Set<string>();
  for (const c of CAST) {
    const mine = thinks.filter((t) => t.character === c);
    const asked = prompts.filter((p) => p.character === c);
    mine.forEach((t, i) => {
      const target = byLine.get(t.target_line ?? "");
      const expected: TookTarget = t.took_target === "other" ? { type: "other", speaker: target!.speaker! } : { type: t.took_target! };
      assert.ok(asked[i]!.user.includes(`\n2. took — ${tookTargetText(expected)}, in one word:`), `${t.id} prompt names ${t.took_target}`);
      if (t.took_target === "own") assert.equal(target?.speaker, c);
      seen.add(`${t.took_target}${t.closing ? " closing" : ""}`);
      // The stored reading points at the named line.
      const r = g.memory.readings.find((x) => x.thought === t.id);
      if (r) assert.equal(r.line, t.target_line, `${t.id}: reading on the named line`);
      else assert.ok(t.took_target === "none" || g.memory.readings.some((x) => x.character === c && x.line === t.target_line), `${t.id}: same line already read`);
    });
  }
  for (const k of ["other", "own", "none", "other closing", "own closing"]) assert.ok(seen.has(k), `saw ${k}`);
});
