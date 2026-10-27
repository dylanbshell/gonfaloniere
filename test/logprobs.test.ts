// TD v0.21, Run Configuration → Log probabilities: think() and speak() ask for log probabilities and
// store the top 5 candidates at the `took` / `meant` label token; never required, never a failure.
import assert from "node:assert/strict";
import { test } from "node:test";
import type OpenAI from "openai";
import { callModel, type CallResult, type TokenLogprob } from "../src/harness/openrouter.ts";
import { callWithLogprobs, labelCandidates, logprobsRequest, storedLogprobs, type LogprobsState } from "../src/minigame/logprobs.ts";
import { config, technicalDesignPath } from "../probe.config.ts";
import { CAST, STANDINS, STANDIN_FILE } from "../src/minigame/cast.ts";
import { MiniGame, type CallRequest, type Caller } from "../src/minigame/engine.ts";
import { loadDocs, loadStandinBriefings } from "../src/sources/docs.ts";
import type { ModelConfig } from "../probe.config.ts";

/** A reply split into tokens the way a tokenizer might, each with made-up alternatives. */
function tokens(reply: string, cuts: string[], alts: Record<string, [string, number][]> = {}): TokenLogprob[] {
  assert.equal(cuts.join(""), reply);
  return cuts.map((t) => ({ token: t, logprob: Math.log(0.9), top: (alts[t] ?? [[t, 0.9]]).map(([token, p]) => ({ token, logprob: Math.log(p) })) }));
}
const THINK = '{"thought": "He leans on me.", "took": "pressure", "words": "Answer me", "importance": 40}';
const THINK_TOKENS = tokens(THINK, ['{"', "thought", '":', ' "', "He", " leans", " on", " me", '.",', ' "', "took", '":', ' "', "pressure", '",', ' "', "words", '":', ' "', "Answer", " me", '",', ' "', "importance", '":', " 40", "}"], {
  pressure: [["pressure", 0.55], ["threat", 0.3], ["claim", 0.1], ["insult", 0.04], ["none", 0.01]],
});
const ok = (logprobs: TokenLogprob[] | null): CallResult => ({ ok: true, content: THINK, reasoning: null, usage: { inputTokens: 10, outputTokens: 20, reasoningTokens: 0, costUsd: 0.0001 }, provider: "DeepInfra", model: "deepseek", generationId: "g", finishReason: "stop", latencyMs: 5, logprobs });

test("the label token is found where the value starts, and its top 5 are stored as probabilities", () => {
  const s = labelCandidates(THINK_TOKENS, "took")!;
  assert.equal(s.at, "took");
  assert.equal((s as { token: string }).token, "pressure");
  const c = (s as { candidates: { token: string; p: number }[] }).candidates;
  assert.deepEqual(c.map((x) => x.token), ["pressure", "threat", "claim", "insult", "none"]);
  assert.ok(Math.abs(c[0]!.p - 0.55) < 1e-6 && Math.abs(c[1]!.p - 0.3) < 1e-6);
  // A token that carries the opening quote and the value's first letters is the one.
  const merged = tokens('{"meant": "deal", "words": null}', ['{"', "meant", '":', ' "de', "al", '",', ' "', "words", '":', " null", "}"]);
  assert.equal((labelCandidates(merged, "meant") as { token: string }).token, ' "de');
  // No label in the reply: null.
  assert.equal(labelCandidates(tokens('{"thought": "x"}', ['{"', "thought", '":', ' "x"', "}"]), "took"), null);
});

test("all: every output token's top 5; labels: only the label token", () => {
  const all = storedLogprobs("all", "think", THINK_TOKENS)!;
  assert.equal(all.at, "all");
  assert.equal((all as { tokens: unknown[] }).tokens.length, THINK_TOKENS.length);
  assert.equal(storedLogprobs("labels", "think", THINK_TOKENS)!.at, "took");
});

test("with a fake provider that returns logprobs, think() stores the candidates; speak() reads meant", async () => {
  const state: LogprobsState = { supported: true, noted: false };
  const sent: Record<string, unknown>[] = [];
  const r = await callWithLogprobs(async (extra) => (sent.push(extra), ok(THINK_TOKENS)), "labels", "think", state, () => {});
  assert.deepEqual(sent, [{ logprobs: true, top_logprobs: 5 }]);
  assert.equal((r.logprobs as { token: string }).token, "pressure");
  // The same reply on a speak() call looks for "meant", which isn't there: null.
  const s = await callWithLogprobs(async () => ok(THINK_TOKENS), "labels", "speak", state, () => {});
  assert.equal(s.logprobs, null);
});

test("null when the provider returns none; the call is otherwise normal", async () => {
  const r = await callWithLogprobs(async () => ok(null), "labels", "think", { supported: true, noted: false }, () => {});
  assert.equal(r.res.ok, true);
  assert.equal(r.logprobs, null);
});

test("a rejected parameter doesn't fail the call: it's sent again without, stored null, and noted once for the run", async () => {
  const state: LogprobsState = { supported: true, noted: false };
  const notes: string[] = [];
  const sent: Record<string, unknown>[] = [];
  const send = async (extra: Record<string, unknown>): Promise<CallResult> => {
    sent.push(extra);
    return "logprobs" in extra ? { ok: false, error: "404 No endpoints found that can handle the requested parameters: logprobs", status: 404, latencyMs: 3 } : ok(null);
  };
  const r = await callWithLogprobs(send, "labels", "think", state, (m) => notes.push(m));
  assert.equal(r.res.ok, true);
  assert.equal(r.logprobs, null);
  assert.deepEqual(sent, [{ logprobs: true, top_logprobs: 5 }, {}]);
  assert.equal(state.supported, false);
  // The next call doesn't ask again, and the note isn't repeated.
  await callWithLogprobs(send, "labels", "speak", state, (m) => notes.push(m));
  assert.deepEqual(sent.slice(2), [{}]);
  assert.equal(notes.length, 1);
  // Any other failure is passed through as it is (no logprobs fallback, no extra send).
  const other: Record<string, unknown>[] = [];
  const failed = await callWithLogprobs(async (e) => (other.push(e), { ok: false, error: "500 upstream", status: 500, latencyMs: 1 }), "labels", "think", { supported: true, noted: false }, () => {});
  assert.equal(failed.res.ok, false);
  assert.equal(other.length, 1);
});

test("off sends no request (and stores null on think/speak); system calls never ask and carry no field", async () => {
  assert.equal(logprobsRequest("off", "think"), null);
  assert.equal(logprobsRequest("labels", "star-pass"), null);
  assert.equal(logprobsRequest("labels", "move"), null);
  const sent: Record<string, unknown>[] = [];
  const off = await callWithLogprobs(async (e) => (sent.push(e), ok(THINK_TOKENS)), "off", "think", { supported: true, noted: false }, () => {});
  assert.deepEqual(sent, [{}]);
  assert.equal(off.logprobs, null);
  const sys = await callWithLogprobs(async (e) => (sent.push(e), ok(THINK_TOKENS)), "labels", "thought-pass", { supported: true, noted: false }, () => {});
  assert.deepEqual(sent.slice(1), [{}]);
  assert.equal(sys.logprobs, undefined);
});

test("callModel passes the provider's logprobs through (fake OpenAI client)", async () => {
  let body: Record<string, unknown> = {};
  const client = {
    chat: {
      completions: {
        create: async (b: Record<string, unknown>) => {
          body = b;
          return {
            id: "gen-1",
            model: "deepseek/deepseek-v4.1-flash",
            provider: "DeepInfra",
            choices: [{ finish_reason: "stop", message: { content: THINK }, logprobs: { content: THINK_TOKENS.map((t) => ({ token: t.token, logprob: t.logprob, top_logprobs: t.top })) } }],
            usage: { prompt_tokens: 10, completion_tokens: 20, cost: 0.0001 },
          };
        },
      },
    },
  } as unknown as OpenAI;
  const model = { id: "deepseek-v4.1-flash", slug: "deepseek/deepseek-v4.1-flash", provider: "deepinfra/fp8" } as ModelConfig;
  const res = await callModel(client, { model, prompt: "x", maxTokens: 50, extra: { logprobs: true, top_logprobs: 5 } });
  assert.equal(body.logprobs, true);
  assert.equal(body.top_logprobs, 5);
  assert.ok(res.ok && res.logprobs?.length === THINK_TOKENS.length);
  assert.equal((storedLogprobs("labels", "think", res.ok ? res.logprobs : null) as { token: string }).token, "pressure");
  // A reply without logprobs: null.
  const bare = { chat: { completions: { create: async () => ({ id: "g", model: "m", choices: [{ finish_reason: "stop", message: { content: "{}" } }], usage: {} }) } } } as unknown as OpenAI;
  const r2 = await callModel(bare, { model, prompt: "x", maxTokens: 5, extra: {} });
  assert.ok(r2.ok && r2.logprobs === null);
});

// ---- In play ---------------------------------------------------------------------------------

const docs21 = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.21") });
const briefings = { ...docs21.briefings, ...loadStandinBriefings(STANDIN_FILE, STANDINS, docs21.socialAwareness) };

async function play(d: typeof docs21, moveJoinsOwnGroup: boolean) {
  const caller: Caller = async (req: CallRequest) => {
    const colloquio = req.user.includes('"done": false}');
    const others = CAST.filter((c) => c !== req.character);
    const present = (/\nPresent: ([^\n]*)/.exec(req.user)?.[1] ?? "").split(", ").filter((n) => CAST.includes(n as never));
    const said = { utterance: "A fine evening.", meant: "promise", words: "A fine evening", action: null };
    const content = {
      plan: () => ({ thought: "A plan.", plan: "Goals: win. Threats: all. Next moves: talk." }),
      think: () => ({ thought: "Thinking.", took: "promise", words: "fine evening", importance: 50, ...(colloquio && { done: false }) }),
      speak: () => (req.user.includes('"addressee"') ? { addressee: null, ...said } : said),
      move: () => ({ thought: "Move.", contacts: others.map((n) => ({ name: n, urgency: 50, purpose: null })), choice: moveJoinsOwnGroup && present.length ? "join" : "colloquio", target: moveJoinsOwnGroup && present.length ? present[0] : others[0] }),
      murder: () => "x",
      "star-pass": () => ({ sweep: [], entries: [] }),
      "claims-pass": () => ({ entries: [] }),
      "sweep-reask": () => ({ sweep: [], entries: [] }),
      "thought-pass": () => ({ beliefs: [] }),
      "perception-pass": () => ({ notes: [] }),
      "knowledge-check": () => ({ reasoning: "x", verdict: "none", evidence: [], told_by: [] }),
    }[req.kind]();
    // The runner's caller attaches stored logprobs to think() and speak() responses only.
    const lp = req.kind === "think" || req.kind === "speak" ? { logprobs: { at: req.kind === "think" ? "took" : "meant", token: "promise", index: 0, candidates: [{ token: "promise", p: 0.7 }] } as const } : {};
    return { ok: true, content: typeof content === "string" ? content : JSON.stringify(content), error: null, costUsd: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0, provider: "fake", model: "fake", ...lp };
  };
  const g = new MiniGame(
    d,
    {
      cast: CAST, briefings, seed: 5, turns: 3, utterancesPerTurn: 12, historyWindow: 10, thoughtWindow: 4, maxCapannello: 4,
      maxTokens: { plan: 400, think: 250, speak: 200, move: 500, murder: 300, "star-pass": 1800, "claims-pass": 1000, "sweep-reask": 1800, "thought-pass": 600, "perception-pass": 800, "knowledge-check": 300 },
      playTemperature: 0.7, systemTemperature: 0, checks: [], notebook: "perceived", logprobs: "labels",
    },
    caller,
  );
  await g.play();
  return g;
}

test("in play: think() and speak() records carry the stored logprobs; system calls carry none", async () => {
  const g = await play(docs21, false);
  const labelled = g.calls.filter((c) => c.kind === "think" || c.kind === "speak");
  assert.ok(labelled.length > 0 && labelled.every((c) => c.logprobs && "candidates" in c.logprobs));
  assert.ok(g.calls.filter((c) => !["think", "speak"].includes(c.kind)).every((c) => !("logprobs" in c)));
});

test("TD v0.20+: a join toward someone in one's own group becomes stay, logged; before v0.20 it stays a join", async () => {
  const g = await play(docs21, true);
  const moves = g.events.filter((e) => e.type === "move" && e.note === "join to own group");
  assert.ok(moves.length > 0);
  assert.ok(moves.every((e) => e.choice === "stay" && e.asked === "join"));
  assert.ok(!g.events.some((e) => e.type === "move-noop"));
  // The move prompt has no {target} placeholder left, and no repair is logged for these moves.
  assert.ok(!docs21.templates.move!.includes("{target}") && !docs21.templates.move!.includes("{colloquio_note}"));
  const v19 = await play(loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.19") }), true);
  assert.ok(v19.events.some((e) => e.type === "move" && e.choice === "join") && v19.events.some((e) => e.type === "move-noop"));
});
