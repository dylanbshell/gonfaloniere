// TD v0.10, Block 9a's {took_target}: the prompt names the line the label will attach to, by the
// same rule that stores the reading (The perceived notebook, "Which line a label belongs to").
import assert from "node:assert/strict";
import { test } from "node:test";
import { config, technicalDesignPath } from "../probe.config.ts";
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

test("TD v0.10 loads (from git history): 9a has {took_target}, and thinkAsksTook still matches", () => {
  const v10 = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.10") });
  assert.equal(v10.versions.technicalDesign, "0.10");
  assert.ok(thinkAsksTook(v10.templates));
  assert.ok(thinkNamesTarget(v10.templates));
  assert.match(v10.templates.think, /\n2\. took — \{took_target\}, in one word: promise, deal, threat, admission, claim, denial, or none\./);
});

/** Plays 3 turns of the real engine on `d` with a fake caller; returns the game and every think() prompt. */
async function playWith(d: typeof docs) {
  const prompts: { character: string; user: string }[] = [];
  const speaks: string[] = [];
  const caller: Caller = async (req: CallRequest) => {
    if (req.kind === "speak") speaks.push(req.user);
    const colloquio = req.user.includes('"done": false}');
    const others = CAST.filter((c) => c !== req.character);
    if (req.kind === "think") prompts.push({ character: req.character!, user: req.user });
    const said = { utterance: "A fine evening.", meant: "promise", words: "A fine evening", action: null };
    const content = {
      plan: () => ({ thought: "A plan.", plan: "Goals: win. Threats: all. Next moves: talk." }),
      think: () => ({ thought: `Thinking ${prompts.length}.`, took: "promise", words: "fine evening", importance: 50, ...(colloquio && { done: false }) }),
      speak: () => (req.user.includes('"addressee"') ? { addressee: null, ...said } : said),
      move: () => ({ thought: "Move.", contacts: others.map((n) => ({ name: n, urgency: 50, purpose: null })), choice: "colloquio", target: others[0] }),
      seat: () => ({ thought: "A seat.", choice: "join", target: others[0] }),
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
    d,
    {
      cast: CAST, briefings, seed: 11, turns: 3, utterancesPerTurn: 12, historyWindow: 10, thoughtWindow: 4, maxCapannello: 4,
      maxTokens: { plan: 400, think: 250, speak: 200, move: 500, murder: 300, "star-pass": 1800, "claims-pass": 1000, "sweep-reask": 1800, "thought-pass": 600, "perception-pass": 800, "knowledge-check": 300 },
      playTemperature: 0.7, systemTemperature: 0, checks: [], notebook: "perceived",
    },
    caller,
  );
  await g.play();
  return { g, prompts, speaks, td: d.versions.technicalDesign };
}

/** Every think() prompt names the line its reading is stored on; returns the target kinds seen. */
function checkTargets(g: MiniGame, prompts: { character: string; user: string }[], td: string): Set<string> {
  const thinks = g.thoughts.filter((t) => t.call === "think");
  assert.equal(thinks.length, prompts.length);
  // TD v0.11's schema: words after took; in a Colloquio, done is step 5.
  const colloquio = prompts.filter((p) => p.user.includes('"done": false}'));
  assert.ok(colloquio.length > 0 && colloquio.every((p) => p.user.includes('{"thought": "...", "took": "none", "words": null, "importance": 0, "done": false}') && p.user.includes("\n5. done — ")));
  assert.ok(prompts.filter((p) => !p.user.includes('"done": false}')).every((p) => p.user.includes('{"thought": "...", "took": "none", "words": null, "importance": 0}') && !p.user.includes(". done — ")));
  // The fake's words are in every target line, so labelled thoughts keep them.
  assert.ok(thinks.filter((t) => t.took_target !== "none").every((t) => t.words === "fine evening"));
  const byLine = new Map(g.lines.map((l) => [l.id, l]));
  const seen = new Set<string>();
  for (const c of CAST) {
    const mine = thinks.filter((t) => t.character === c);
    const asked = prompts.filter((p) => p.character === c);
    mine.forEach((t, i) => {
      const target = byLine.get(t.target_line ?? "");
      const expected: TookTarget = t.took_target === "other" ? { type: "other", speaker: target!.speaker!, answering: t.target_answering } : { type: t.took_target! };
      assert.ok(asked[i]!.user.includes(`\n2. took — ${tookTargetText(expected, td)}, in one word:`), `${t.id} prompt names ${t.took_target}`);
      if (t.took_target === "own") assert.equal(target?.speaker, c);
      const afterOwn = byLine.get(t.after_line ?? "")?.speaker === c;
      seen.add(`${t.took_target}${afterOwn ? " after own line" : ""}${t.closing ? " closing" : ""}`);
      // The stored reading points at the named line.
      const r = g.memory.readings.find((x) => x.thought === t.id);
      if (r) assert.equal(r.line, t.target_line, `${t.id}: reading on the named line`);
      else assert.ok(t.took_target === "none" || g.memory.readings.some((x) => x.character === c && x.line === t.target_line), `${t.id}: same line already read`);
    });
  }
  return seen;
}

test("TD v0.12, in play: every think() prompt names the line its reading is stored on, own lines included", async () => {
  const { g, prompts, td } = await playWith(loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.12") }));
  const seen = checkTargets(g, prompts, td);
  for (const k of ["other", "own after own line", "none", "other closing", "own after own line closing"]) assert.ok(seen.has(k), `saw ${k}`);
  // v0.12 has no meant: own readings come from think().
  assert.ok(g.memory.readings.some((r) => r.own && r.thought !== null));
});

test("TD v0.14, in play: after an own line, think() names the line they were answering; own readings come only from speak()", async () => {
  const { g, prompts, speaks, td } = await playWith(loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.14") }));
  assert.equal(g.memory.quoteDropsPunct, false);
  assert.ok(!g.thoughts.some((t) => t.target_answering) || prompts.every((p) => !p.user.includes("you were answering")), "v0.14 keeps 'last line'");
  const seen = checkTargets(g, prompts, td);
  // speak()'s schema carries meant and words after utterance, in both forms; the two lines come before the reply line.
  const capannello = speaks.filter((u) => u.includes('"addressee"'));
  const colloquio = speaks.filter((u) => !u.includes('"addressee"'));
  assert.ok(capannello.length > 0 && capannello.every((u) => u.includes('{"addressee": "..." or null, "utterance": "...", "meant": "none", "words": null, "action": null or {...}}')));
  assert.ok(colloquio.length > 0 && colloquio.every((u) => u.includes('{"utterance": "...", "meant": "none", "words": null, "action": null or {...}}')));
  assert.ok(speaks.every((u) => u.indexOf("\nmeant — ") < u.indexOf("\nwords — if meant") && u.indexOf("\nwords — if meant") < u.indexOf("Reply with only this JSON:")));
  assert.ok(!seen.has("own") && ![...seen].some((k) => k.startsWith("own")), `no own targets: ${[...seen]}`);
  // "none after own line": the character spoke first, so the prompt used the none text (checked above against td).
  for (const k of ["other", "none", "other after own line", "none after own line", "other closing"]) assert.ok(seen.has(k), `saw ${k}`);
  assert.ok(prompts.some((p) => p.user.includes("\n2. took — nothing yet, since no one else has spoken here since you arrived, in one word:")));
  // After an own line, the target is the last line by someone else the character heard in this conversation.
  const byLine = new Map(g.lines.map((l) => [l.id, l]));
  for (const t of g.thoughts.filter((t) => t.call === "think" && byLine.get(t.after_line ?? "")?.speaker === t.character && t.took_target === "other")) {
    const answered = g.lines.filter((l) => l.kind === "speech" && l.conversation === t.conversation && l.speaker !== t.character && l.heardBy.includes(t.character) && Number(l.id.slice(1)) <= Number(t.after_line!.slice(1))).at(-1)!;
    assert.equal(t.target_line, answered.id, `${t.id} names the answered line`);
  }
  // Own readings: every one from speak(), one per spoken line with meant, words kept.
  const own = g.memory.readings.filter((r) => r.own);
  assert.ok(own.length > 0 && own.every((r) => r.source === "speak" && r.thought === null && r.words === "A fine evening" && r.took === "promise"));
  assert.equal(own.length, g.lines.filter((l) => l.kind === "speech").length);
  assert.ok(g.memory.readings.filter((r) => r.source !== "speak").every((r) => !r.own), "no own reading from think()");
  // meant and words are on every speak() record.
  assert.ok(g.events.filter((e) => e.type === "speech").every((e) => e.meant === "promise" && e.words === "A fine evening"));
});

test("TD v0.16, in play: the hostility ladder in think() and speak(), v0.15's wording after an own line, no v0.15 scope line", async () => {
  const v16 = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.16") });
  assert.equal(v16.versions.technicalDesign, "0.16");
  const { g, prompts, speaks, td } = await playWith(v16);
  assert.equal(g.memory.fillCap, null, "no fill cap before v0.17");
  checkTargets(g, prompts, td);
  const ladder = (them: string) => `For hostility there are three steps: insult (a slight), pressure (leaning on ${them} with a pointed question, a demand, or a dare), threat (harm to come).`;
  assert.ok(prompts.length > 0 && prompts.every((p) => p.user.includes(ladder("you")) && p.user.includes("in one word: promise, deal, threat, admission, claim, denial, insult, pressure, or none.")));
  assert.ok(speaks.length > 0 && speaks.every((u) => u.includes(ladder("them")) && u.includes("If you mean it to frighten, it's a threat.")));
  for (const u of [...prompts.map((p) => p.user), ...speaks]) assert.ok(!u.includes("A question, a demand, or a dare is none unless"), "v0.15's scope line is gone");
  // After an own line, the target names the line they were answering (v0.15 wording).
  const answering = g.thoughts.filter((t) => t.target_answering);
  assert.ok(answering.length > 0);
  // Block 6 drops trailing punctuation before "…" from v0.15 on.
  assert.equal(g.memory.quoteDropsPunct, true);
  const byLine = new Map(g.lines.map((l) => [l.id, l]));
  for (const t of answering) {
    const i = g.thoughts.filter((x) => x.call === "think" && x.character === t.character).indexOf(t);
    const asked = prompts.filter((p) => p.character === t.character)[i]!;
    assert.ok(asked.user.includes(`\n2. took — how you take the line of ${byLine.get(t.target_line!)!.speaker}'s you were answering, in one word:`), t.id);
  }
});

test("TD v0.17, in play: the narrowed pressure gloss in think() and speak(), v0.16's gloss gone, the fill cap on", async () => {
  const v17 = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.17") });
  assert.equal(v17.versions.technicalDesign, "0.17");
  const { g, prompts, speaks, td } = await playWith(v17);
  checkTargets(g, prompts, td);
  const ladder = (them: string) => `For hostility there are three steps: insult (a slight), pressure (pushing ${them} to answer or act), threat (harm to come).`;
  assert.ok(prompts.length > 0 && prompts.every((p) => p.user.includes(ladder("you"))));
  assert.ok(speaks.length > 0 && speaks.every((u) => u.includes(ladder("them"))));
  for (const u of [...prompts.map((p) => p.user), ...speaks]) {
    assert.ok(!u.includes("with a pointed question, a demand, or a dare"), "v0.16's gloss is gone");
    assert.ok(u.includes("in one word: promise, deal, threat, admission, claim, denial, insult, pressure, or none."));
  }
  assert.deepEqual(g.memory.fillCap, { labels: ["pressure"], max: 2 });
});

test("TD v0.19+, in play: the bare list, then only 'your own reading/call' and 'Most lines are none'; the ladder and descriptions gone; the per-label cap on", async () => {
  for (const v of ["0.19", "0.21"]) await bareListCheck(loadDocs({ ...config.docs, technicalDesign: technicalDesignPath(v) }));
});

async function bareListCheck(d: typeof docs) {
  const { g, prompts, speaks, td } = await playWith(d);
  checkTargets(g, prompts, td);
  const list = "in one word: promise, deal, threat, admission, claim, denial, insult, pressure, or none.";
  // The list is followed by exactly these sentences, up to the end of the line.
  assert.ok(prompts.length > 0 && prompts.every((p) => new RegExp(`\\n2\\. took — [^\\n]*${list.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&")} It's your own reading, not a rule\\. Most lines are none\\.\\n`).test(p.user)), "think(): bare list");
  assert.ok(speaks.length > 0 && speaks.every((u) => u.includes(`\nmeant — what this line is, as you mean it, ${list} It's your own call. Most lines are none.\n`)), "speak(): bare list");
  const removed = ["For hostility there are three steps", "insult (a slight)", "pressure (pushing", "threat (harm to come", "If it chills you", "If you mean it to frighten", "A plain question is none", "or else"];
  for (const u of [...prompts.map((p) => p.user), ...speaks]) for (const r of removed) assert.ok(!u.includes(r), `removed: ${r}`);
  assert.deepEqual(g.memory.fillCap, { labels: ["claim", "denial", "insult", "pressure"], max: 3 });
}
