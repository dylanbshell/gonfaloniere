// Classifies contradictions recorded under rubric cal1, before verdicts
// carried a kind, so gate 4 can count factual claims only (Dylan, Oct 21)
// without re-judging those runs. One call per model and scenario.

import { z } from "zod";
import { CONTRADICTION_KINDS } from "./judge.ts";
import { contradictionPrompt } from "../../scenarios/probe-judging.ts";

export interface UnclassifiedContradiction {
  /** Position in the batch, echoed back by the judge. */
  index: number;
  claims: { turn: number; quote: string }[];
  explanation: string;
}

export const ContradictionKinds = z.strictObject({
  kinds: z.array(z.strictObject({ index: z.int(), kind: z.enum(CONTRADICTION_KINDS), reason: z.string() })),
});

export type ContradictionKinds = z.infer<typeof ContradictionKinds>;

export function contradictionKindsJsonSchema(): Record<string, unknown> {
  const { $schema: _, ...schema } = z.toJSONSchema(ContradictionKinds) as Record<string, unknown>;
  return schema;
}

export function buildContradictionPrompt(character: string, items: UnclassifiedContradiction[]): string {
  return contradictionPrompt(character, items);
}
