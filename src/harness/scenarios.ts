// Every probe scenario, by command-line target. Shared by the runner, the
// judge, and the scorer.

import S1 from "../../scenarios/s1-quiet-capannello.ts";
import S2 from "../../scenarios/s2-accusation.ts";
import S3 from "../../scenarios/s3-deal-struck.ts";
import S4 from "../../scenarios/s4-light-pressure.ts";
import S5a from "../../scenarios/s5a-interrogation-isabella.ts";
import { S5A_BLUFF, S5B_BLUFF } from "../../scenarios/s5-bluff-line.ts";
import S5b from "../../scenarios/s5b-interrogation-lenoir.ts";
import S5c from "../../scenarios/s5c-neutral-question-lupo.ts";
import S6 from "../../scenarios/s6-strategic-disclosure.ts";
import { S7_BURIED, S7_CONTROL, S7_EXPLICIT } from "../../scenarios/s7-observation-inference.ts";
import { ROSTER } from "../game/roster.ts";
import type { DialogueScenario, Scenario, ThinkScenario } from "./scenario.ts";

export const SCENARIOS: Record<string, Scenario> = {
  s1: S1,
  s2: S2,
  s3: S3,
  s4: S4,
  s5a: S5a,
  s5b: S5b,
  s5c: S5c,
  s6: S6,
  "s7-explicit": S7_EXPLICIT,
  "s7-buried": S7_BURIED,
  "s7-control": S7_CONTROL,
  "s5a-bluff": S5A_BLUFF,
  "s5b-bluff": S5B_BLUFF,
};

/** Shorthand targets that expand to several scenarios. */
export const TARGET_GROUPS: Record<string, string[]> = { s7: ["s7-explicit", "s7-buried", "s7-control"] };

export const DIALOGUES = Object.fromEntries(
  Object.entries(SCENARIOS).filter((e): e is [string, DialogueScenario] => e[1].callType === "dialogue"),
);

/** S7's versions, judged for whether the thought references the withdrawal (gate 5). */
export const INFERENCE: Record<string, ThinkScenario> = {
  "s7-explicit": S7_EXPLICIT,
  "s7-buried": S7_BURIED,
  "s7-control": S7_CONTROL,
};

/** The scenario for an id; a scorer label like "S1 · TD v0.3" resolves to S1. */
export function scenarioById(id: string): Scenario | undefined {
  const base = id.split(" · ")[0];
  return Object.values(SCENARIOS).find((s) => s.id === base);
}

/**
 * Unbriefed guests present in a scenario (not on the roster). Contact lists
 * ignore them entirely in gate 1 (Dylan, Oct 21).
 */
export function unbriefedGuests(scenarioId: string): string[] {
  const roster = new Set<string>(ROSTER.map((c) => c.name));
  return scenarioById(scenarioId)?.conversation.present.filter((p) => !roster.has(p)) ?? [];
}

export function expandTargets(targets: string[]): string[] {
  return targets.flatMap((t) => TARGET_GROUPS[t] ?? [t]);
}
