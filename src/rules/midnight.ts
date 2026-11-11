// Midnight, the Murder Round (Mechanics: Murder Round). Which acts a guest may submit, and how the
// acts resolve. The legality check moved from src/output/strategy.ts (CC-20261111-07, #71); the
// resolution is new here: the mini-game logs midnight's acts without resolving them, so nothing calls
// it yet, and it's built from Mechanics' rules for the human-player game (#61, #62).

import type { MidnightConfig } from "./config.ts";

export type ActType = "kill" | "guard" | "investigate";
export interface Act {
  type: ActType;
  target: string;
}

/** An act as checked: its target resolved to a guest's name if possible (else as written), and whether that's the actor or a living guest. */
export interface CheckedAct extends Act {
  self: boolean;
  living: boolean;
}

export type ActProblem =
  | { why: "count"; count: number; twoKills: boolean }
  | { why: "only kills" }
  | { why: "self"; type: ActType }
  | { why: "not living"; target: string }
  | { why: "same guest" };

/**
 * Mechanics: exactly one act (Kill, Guard, or Investigate); the guest with two Kill orders may only
 * kill, once or twice. No act on oneself, every target a living guest, and all of a guest's acts on
 * different guests. Problems come in that order.
 */
export function actProblems(twoKills: boolean, acts: readonly CheckedAct[]): ActProblem[] {
  const out: ActProblem[] = [];
  if (twoKills) {
    if (acts.length < 1 || acts.length > 2) out.push({ why: "count", count: acts.length, twoKills });
    if (acts.some((a) => a.type !== "kill")) out.push({ why: "only kills" });
  } else if (acts.length !== 1) out.push({ why: "count", count: acts.length, twoKills });
  for (const a of acts) {
    if (a.self) out.push({ why: "self", type: a.type });
    else if (!a.living) out.push({ why: "not living", target: a.target });
  }
  if (new Set(acts.map((a) => a.target)).size !== acts.length) out.push({ why: "same guest" });
  return out;
}

/** One guest's submitted acts. A guest who submitted nothing has no entry: nothing submitted, nothing done. */
export interface Submission {
  by: string;
  acts: readonly Act[];
}

export type MidnightEvent =
  | { type: "kill blocked"; killer: string; target: string; investigations: number }
  | { type: "kill foiled"; killer: string; target: string; guards: number }
  | { type: "death"; target: string };

/**
 * Resolution order: investigations (a guest investigated by `blockAt`+ others can't carry out a Kill),
 * then guards (a guest guarded by `blockAt`+ survives), then the remaining Kills. The two-kills guest's
 * Kills can't be blocked by either. All at once: a guest killed tonight still has their acts carried
 * out, and several Kills on one guest are one death. Killers are in the events for the record; the
 * announcement names only who died and whether attempts were foiled.
 */
export function resolveMidnight(subs: readonly Submission[], twoKills: (name: string) => boolean, c: MidnightConfig): { deaths: string[]; events: MidnightEvent[] } {
  const count = (type: ActType, target: string) => subs.reduce((n, s) => n + s.acts.filter((a) => a.type === type && a.target === target).length, 0);
  const events: MidnightEvent[] = [];
  const deaths: string[] = [];
  for (const s of subs) {
    const unblockable = twoKills(s.by);
    for (const a of s.acts.filter((x) => x.type === "kill")) {
      const investigations = count("investigate", s.by);
      const guards = count("guard", a.target);
      if (!unblockable && investigations >= c.blockAt) events.push({ type: "kill blocked", killer: s.by, target: a.target, investigations });
      else if (!unblockable && guards >= c.blockAt) events.push({ type: "kill foiled", killer: s.by, target: a.target, guards });
      else if (!deaths.includes(a.target)) deaths.push(a.target);
    }
  }
  for (const d of deaths) events.push({ type: "death", target: d });
  return { deaths, events };
}
