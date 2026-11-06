// TD v0.9, Core Functions, think(): the closing think after a Colloquio's last line, at the cap and
// after a closing line. Plays the real engine with a fake caller (no model calls).
import assert from "node:assert/strict";
import { test } from "node:test";
import { config } from "../probe.config.ts";
import { CAST, STANDINS, STANDIN_FILE } from "../src/minigame/cast.ts";
import { MiniGame, type CallRequest, type Caller } from "../src/minigame/engine.ts";
import { loadDocs, loadStandinBriefings } from "../src/sources/docs.ts";

const docs = loadDocs(config.docs);
const briefings = { ...docs.briefings, ...loadStandinBriefings(STANDIN_FILE, STANDINS, docs.socialAwareness) };

/** Valid replies for every call; think() says done=`done` in a Colloquio and always takes lines as a promise. */
function fakeCaller(done: boolean): Caller {
  return async (req: CallRequest) => {
    const colloquio = req.user.includes('"done": false}');
    const others = CAST.filter((c) => c !== req.character);
    const content = {
      plan: () => ({ thought: "A plan.", plan: "Goals: win. Threats: all. Next moves: talk." }),
      think: () => ({ thought: `Thinking ${Math.random()}.`, took: "promise", words: "A fine evening.", importance: 50, ...(colloquio && { done }) }),
      speak: () => (req.user.includes('"addressee"') ? { addressee: null, utterance: "A fine evening.", meant: "promise", words: "A fine evening", action: null } : { utterance: "A fine evening.", meant: "promise", words: "A fine evening", action: null }),
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
}

async function play(done: boolean) {
  const g = new MiniGame(
    docs,
    {
      cast: CAST,
      briefings,
      seed: 7,
      turns: 4,
      utterancesPerTurn: 12,
      historyWindow: 10,
      thoughtWindow: 4,
      maxCapannello: 4,
      maxTokens: { plan: 400, think: 250, speak: 200, move: 500, murder: 300, "star-pass": 1800, "claims-pass": 1000, "sweep-reask": 1800, "thought-pass": 600, "perception-pass": 800, "knowledge-check": 300 },
      playTemperature: 0.7,
      systemTemperature: 0,
      checks: [],
      notebook: "perceived",
    },
    fakeCaller(done),
  );
  await g.play();
  return g;
}

function checkClosingThinks(g: MiniGame, why: "cap" | "ended") {
  const closes = g.events.filter((e) => e.type === "colloquio-close" && e.why === why);
  assert.ok(closes.length > 0, `a Colloquio closed (${why})`);
  for (const close of closes) {
    const conv = close.conversation as string;
    const lastLine = g.lines.filter((l) => l.conversation === conv && l.kind === "speech").at(-1)!;
    const closing = g.thoughts.filter((t) => t.closing && t.conversation === conv);
    assert.equal(closing.length, 2, "both guests think once more");
    for (const t of closing) {
      assert.equal(t.after_line, lastLine.id, "after the Colloquio's last line");
      assert.equal(t.call, "think");
      assert.equal(t.took, "promise", "took is kept");
      assert.ok(lastLine.heardBy.includes(t.character));
    }
    // The closing thinks come before the close event.
    const closeAt = g.events.indexOf(close);
    for (const t of closing) assert.ok(g.events.findIndex((e) => e.type === "thought" && e.thought === t.id) < closeAt);
    // The last line has one reading per guest: the speaker's own from speak() (TD v0.13), the other's from the closing think.
    const readings = g.memory.readings.filter((r) => r.line === lastLine.id);
    assert.equal(new Set(readings.map((r) => r.character)).size, 2);
  }
}

test("closing think at the cap", async () => {
  const g = await play(false);
  checkClosingThinks(g, "cap");
});

test("closing think after a closing line (done)", async () => {
  const g = await play(true);
  checkClosingThinks(g, "ended");
  // done from a closing think is ignored: it doesn't start another closing.
  assert.ok(g.events.filter((e) => e.type === "colloquio-done").length <= g.events.filter((e) => e.type === "colloquio-open").length);
});

test("think() records carry after_line and took; readings are written", async () => {
  const g = await play(false);
  const thinks = g.thoughts.filter((t) => t.call === "think");
  assert.ok(thinks.length > 0 && thinks.every((t) => t.after_line !== undefined && t.took === "promise" && t.conversation));
  assert.ok(g.memory.readings.length > 0);
});
