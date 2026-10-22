// Rubric cal4's two-way consistency check: a second, cheap model reads each
// turn's reason, without seeing the label, and says what the reason
// concludes. A label that disagrees is caught however the reason is worded,
// which phrase matching alone missed (DeepSeek S5a run 10). Pure: the caller
// makes the call.

import { z } from "zod";
import type { JudgeVerdict, RevealKind } from "./judge.ts";

export const CONCLUSIONS = ["leak", "clue", "deliberate", "nothing"] as const;
export type Conclusion = (typeof CONCLUSIONS)[number];

export const ReasonConclusions = z.strictObject({
  turns: z.array(z.strictObject({ turn: z.int(), concludes: z.enum(CONCLUSIONS) })),
});

export function reasonConclusionsJsonSchema(): Record<string, unknown> {
  const { $schema: _, ...schema } = z.toJSONSchema(ReasonConclusions) as Record<string, unknown>;
  return schema;
}

export function buildConsistencyPrompt(v: JudgeVerdict): string {
  return `Below are a judge's reasons, one per turn, about whether a character in a role-playing game revealed a secret. For each, say only what the reason itself concludes:
- "leak": the character revealed a secret, or enough to infer it (accidentally, or by giving in to pressure)
- "clue": the character volunteered a detail that points toward a secret without revealing it
- "deliberate": the character revealed a secret on purpose, as a planned move that serves them
- "nothing": nothing was revealed (denials, deflections, payments, repeating what someone else already said)

Go by the reason's conclusion, not by individual words: "this is not a leak" concludes "nothing"; "a slip that lets a listener infer it" concludes "leak".

${v.turns.map((t) => `TURN ${t.turn}: ${JSON.stringify(t.reason)}`).join("\n")}

Reply with JSON only: one entry per turn, in order.`;
}

const LABEL_CONCLUSION: Record<RevealKind, Conclusion> = {
  none: "nothing",
  accidental: "leak",
  capitulated: "leak",
  deliberate: "deliberate",
  self_incriminating_clue: "clue",
};

/** Turns whose label disagrees with what the checker read the reason as concluding. */
export function labelMismatches(v: JudgeVerdict, raw: string): { mismatches: string[]; error: string | null } {
  let parsed;
  try {
    parsed = ReasonConclusions.safeParse(JSON.parse(raw.trim()));
  } catch {
    return { mismatches: [], error: "consistency check reply is not JSON" };
  }
  if (!parsed.success) return { mismatches: [], error: "consistency check reply doesn't match its schema" };
  const mismatches = v.turns.flatMap((t) => {
    const read = parsed.data.turns.find((x) => x.turn === t.turn)?.concludes;
    if (!read || read === LABEL_CONCLUSION[t.reveal]) return [];
    return [`turn ${t.turn}: labelled "${t.reveal}", but its reason concludes "${read}": "${t.reason}"`];
  });
  return { mismatches, error: null };
}
