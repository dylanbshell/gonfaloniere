// A deterministic fake model caller (moved from test/fixtures/fake-game.ts, CC-20261111-09, #62, so the
// player command's --fake mode can use it): every reply depends only on the character, the call kind,
// and how many calls of that kind the character has made, so the game plays the same whatever order
// parallel calls resolve in. Valid replies throughout, with readings, moves, and seats. No model calls.

import { CAST } from "./cast.ts";
import type { CallRequest, Caller } from "./engine.ts";
import { notaioGuard } from "../setting/pack.ts";

/** The fake caller's reading (TD v0.44, Il Notaio's reading): fixed, and plain enough to pass the quote check. */
export const FAKE_READING = "Little to go on yet. You have heard them speak, and seen nothing that settles anything.";

/**
 * The fake caller's guarded sentences (TD v0.51): for each numbered line, its speaker, the verb the line
 * allows, and the whole line quoted, as the guard passes them (a line over 40 words fails G7, so falls back).
 */
export function fakeSentences(user: string): { sentences: { line: number; text: string }[] } {
  const v = notaioGuard().verbs;
  const lines = user.split("\n").slice(1).map((l) => l.match(/^(\d+)\. (.+?)(?:, to (.+?))?: "(.*)"$/));
  return { sentences: lines.filter((m) => m).map((m) => ({ line: Number(m![1]), text: `${m![2]} ${m![3] ? `${v.told} ${m![3]}` : v.said}: "${m![4]}"` })) };
}

export function fakeCaller(calls: CallRequest[] = []): Caller {
  const count = new Map<string, number>();
  return async (req) => {
    calls.push(req);
    const c = req.character ?? "system";
    const at = `${c}|${req.kind}`;
    const k = (count.get(at) ?? 0) + 1;
    count.set(at, k);
    const me = CAST.indexOf(c as (typeof CAST)[number]);
    const others = CAST.filter((x) => x !== c);
    const pick = (n: number) => others[(n + me + 5) % others.length];
    const colloquio = req.user.includes('"done": false}');
    const replies: Record<string, () => unknown> = {
      plan: () => ({ thought: `${c} plans.`, plan: "Goals: be heard. Threats: everyone. Next moves: talk." }),
      think: () => ({ thought: `${c} weighs what was said (${k}).`, took: ["claim", "pressure", "none", "deal"][(k + me) % 4], words: null, importance: (k * 37 + me * 11) % 100, ...(colloquio && { done: k % 4 === 0 }) }),
      speak: () => {
        const utterance = `${c} speaks of the ${["bridge", "chapel", "river", "market", "loggia"][(k + me) % 5]}, for the ${k}th time tonight.`;
        return req.user.includes('"addressee"') ? { addressee: null, utterance, meant: "claim", words: null, action: null } : { utterance, meant: "claim", words: null, action: null };
      },
      move: () => ({ thought: `${c} moves.`, contacts: others.map((n) => ({ name: n, urgency: 50, purpose: null })), choice: k % 2 ? "colloquio" : "join", target: pick(k) }),
      seat: () => ({ thought: `${c} looks for a seat.`, choice: ["join", "colloquio", "wait"][(k + me) % 3], target: pick(k + 1) }),
      murder: () => ({ thought: "Quietly.", act: { type: "guard", target: pick(0) } }),
      "star-pass": () => ({ sweep: [], entries: [] }),
      "claims-pass": () => ({ entries: [] }),
      "sweep-reask": () => ({ sweep: [], entries: [] }),
      "thought-pass": () => ({ beliefs: [] }),
      "perception-pass": () => ({ notes: [] }),
      "knowledge-check": () => ({ reasoning: "x", verdict: "none", evidence: [], told_by: [] }),
    };
    // TD v0.51: his guarded reading and summaries are JSON, one sentence per line, each quoting its line whole.
    if ((req.kind === "notaio-reading" || req.kind === "notaio-summary") && req.user.startsWith("LINES\n")) return { ok: true, content: JSON.stringify(fakeSentences(req.user)), error: null, costUsd: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0, provider: "fake", model: "fake" };
    // TD v0.44: Il Notaio's reading is prose, not JSON: a fixed reading, with no quotes to check.
    if (req.kind === "notaio-reading") return { ok: true, content: FAKE_READING, error: null, costUsd: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0, provider: "fake", model: "fake" };
    return { ok: true, content: JSON.stringify(replies[req.kind]!()), error: null, costUsd: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0, provider: "fake", model: "fake" };
  };
}
