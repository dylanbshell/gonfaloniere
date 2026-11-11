// A deterministic fake model caller (moved from test/fixtures/fake-game.ts, CC-20261111-09, #62, so the
// player command's --fake mode can use it): every reply depends only on the character, the call kind,
// and how many calls of that kind the character has made, so the game plays the same whatever order
// parallel calls resolve in. Valid replies throughout, with readings, moves, and seats. No model calls.

import { CAST } from "./cast.ts";
import type { CallRequest, Caller } from "./engine.ts";

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
    return { ok: true, content: JSON.stringify(replies[req.kind]!()), error: null, costUsd: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0, provider: "fake", model: "fake" };
  };
}
