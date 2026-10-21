// Gate 5's judged measure (Models & Research v0.8, Scoring): does a
// character's private thought reference an observed event? One call per model
// and scenario version, covering all its samples, with a verdict and quote per
// sample. Pure: the caller makes the call.

import { z } from "zod";
import { quoteFound } from "./judge.ts";

export interface InferenceInput {
  character: string;
  /** The event the thought might reference, in plain words. */
  event: string;
  /** The History the character saw, formatted, most recent last. */
  history: string[];
  thoughts: { sample: number; thought: string }[];
}

export const InferenceVerdict = z.strictObject({
  samples: z.array(
    z.strictObject({
      sample: z.int(),
      references_event: z.boolean(),
      /** Exact words from the thought; null when it doesn't reference the event. */
      quote: z.string().nullable(),
      reason: z.string(),
    }),
  ),
});

export type InferenceVerdict = z.infer<typeof InferenceVerdict>;

export function inferenceJsonSchema(): Record<string, unknown> {
  const { $schema: _, ...schema } = z.toJSONSchema(InferenceVerdict) as Record<string, unknown>;
  return schema;
}

export function buildInferencePrompt(input: InferenceInput): string {
  return `You are judging private thoughts written by an AI playing ${input.character}, a character in a game of political intrigue set in Florence, 1492. Each thought below was written independently, after the same conversation.

The question for each thought: does it reference this event? ${input.event}

A thought references the event if it mentions, reacts to, or reasons about it, even briefly or by implication (for example, wondering what the two men are plotting together). Mentioning either man for some other reason does not count. If the conversation below does not contain the event, a thought can still reference it only by bringing it up unprompted.

THE CONVERSATION ${input.character.toUpperCase()} SAW (most recent last)
${input.history.join("\n")}

THE THOUGHTS
${input.thoughts.map((t) => `SAMPLE ${t.sample}: ${JSON.stringify(t.thought)}`).join("\n")}

For every sample, in order, give references_event, the exact words from the thought it rests on (null if false), and a one-sentence reason. Reply with JSON only, matching the required schema.`;
}

export function checkInference(
  raw: string,
  thoughts: { sample: number; thought: string }[],
): { verdict: InferenceVerdict | null; errors: string[]; warnings: string[] } {
  let json: unknown;
  try {
    json = JSON.parse(raw.trim());
  } catch {
    return { verdict: null, errors: ["judge reply is not JSON"], warnings: [] };
  }
  const shape = InferenceVerdict.safeParse(json);
  if (!shape.success) {
    return { verdict: null, errors: shape.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), warnings: [] };
  }
  const v = shape.data;
  const errors: string[] = [];
  const warnings: string[] = [];
  const expected = thoughts.map((t) => t.sample).join(",");
  const got = v.samples.map((s) => s.sample).join(",");
  if (expected !== got) errors.push(`judged samples [${got}] don't match [${expected}]`);
  for (const s of v.samples) {
    if (!s.references_event) continue;
    const thought = thoughts.find((t) => t.sample === s.sample)?.thought ?? "";
    if (!s.quote || !quoteFound(s.quote, thought)) warnings.push(`sample ${s.sample}: quote not found in the thought`);
  }
  return { verdict: v, errors, warnings };
}
