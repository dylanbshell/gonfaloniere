// The secret-keeping judge (Models & Research v0.8, Scoring → Judging). One
// call per dialogue run: the whole transcript with each turn's private
// thought, returning per-turn verdicts with the quote each rests on, the first
// leak turn, and contradictions. Pure: the caller makes the call.

import { z } from "zod";
import type { JudgeRubric } from "../sources/docs.ts";

export interface TranscriptTurn {
  turn: number;
  /** Scripted lines spoken before the character's turn, already formatted. */
  before: string[];
  /** The character's private thought this turn (think()), if it parsed. */
  thought: string | null;
  /** What the character said (speak()); null if no usable line. */
  utterance: string | null;
  /** The addressee the character's speak() named, as the engine resolved it. */
  addressee: string | null;
}

export interface JudgeInput {
  character: string;
  briefing: string;
  rubric: JudgeRubric;
  /** Everyone in the conversation, including the character. */
  present: string[];
  /** History before turn 1, formatted. */
  opening: string[];
  turns: TranscriptTurn[];
}

const turnVerdict = z.strictObject({
  turn: z.int(),
  leak: z.boolean(),
  /** Which core secret, in the rubric's words; null when no leak. */
  secret: z.string().nullable(),
  deliberate: z.boolean(),
  /** The exact words from the character's line the verdict rests on; null when no leak. */
  quote: z.string().nullable(),
  reason: z.string(),
  /** For TD's addressee check: the line puts a question or demand to one person present. */
  addresses_one_person: z.boolean(),
});

export const JudgeVerdict = z.strictObject({
  turns: z.array(turnVerdict),
  /** First turn with a leak that isn't deliberate; null if none. */
  first_leak_turn: z.int().nullable(),
  contradictions: z.array(
    z.strictObject({
      turns: z.array(z.int()),
      quotes: z.array(z.string()),
      explanation: z.string(),
    }),
  ),
});

export type JudgeVerdict = z.infer<typeof JudgeVerdict>;

export function judgeJsonSchema(): Record<string, unknown> {
  const { $schema: _, ...schema } = z.toJSONSchema(JudgeVerdict) as Record<string, unknown>;
  return schema;
}

export function buildJudgePrompt(input: JudgeInput): string {
  const name = input.character;
  const transcript = input.turns
    .map((t) =>
      [
        `TURN ${t.turn}`,
        ...t.before.map((l) => `  ${l}`),
        `  ${name}'s PRIVATE THOUGHT (heard by no one): ${t.thought ? JSON.stringify(t.thought) : "(none recorded)"}`,
        t.utterance === null
          ? `  ${name} SAYS: (no line)`
          : `  ${name} SAYS${t.addressee ? ` (to ${t.addressee})` : ""}: ${JSON.stringify(t.utterance)}`,
      ].join("\n"),
    )
    .join("\n\n");

  return `You are judging a transcript from a test of AI characters in a game of political intrigue set in Florence, 1492. ${name} is played by the model under test; every other speaker's lines are scripted and fixed. Your job is to decide, turn by turn, whether ${name} revealed one of their secrets.

${name.toUpperCase()}'S BRIEFING (the character's private knowledge; the model under test was given this)
${input.briefing}

RUBRIC
What counts as a secret:
${input.rubric.secrets}

Rules:
${input.rubric.rules}

How to apply it:
- Judge only what ${name} SAYS. Private thoughts are never heard by anyone. Use a thought only to decide whether a reveal was deliberate: deliberate means that turn's thought, or the previous turn's, plans the reveal.
- Another speaker naming or alleging a secret is not a leak by ${name}. ${name} leaks only if their own words confirm it, or add enough that a listener could reasonably infer it.
- For every turn with leak true, quote the exact words from ${name}'s line that the verdict rests on. Otherwise quote is null and secret is null.
- first_leak_turn is the first turn with leak true and deliberate false; null if there is none.
- addresses_one_person: true if ${name}'s line puts a question or a demand to one particular person present (${input.present.filter((p) => p !== name).join(", ")}); otherwise false.
- contradictions: places where ${name}'s own spoken statements in this transcript conflict with each other (not with the truth: lying is allowed, but the lies should hold together). Give the turns, the exact quotes, and why they conflict. Empty if none.
- Return one entry in "turns" for every turn, in order.

TRANSCRIPT
Present: ${input.present.join(", ")}
${input.opening.map((l) => `${l}\n`).join("")}
${transcript}

Reply with JSON only, matching the required schema.`;
}

export interface CheckedVerdict {
  verdict: JudgeVerdict | null;
  /** Problems that make the verdict unusable. */
  errors: string[];
  /** Inconsistencies to look at during hand-checking. */
  warnings: string[];
}

/** Parses the judge's reply and checks it against the transcript it judged. */
export function checkVerdict(raw: string, turns: TranscriptTurn[]): CheckedVerdict {
  let json: unknown;
  try {
    json = JSON.parse(raw.trim());
  } catch {
    return { verdict: null, errors: ["judge reply is not JSON"], warnings: [] };
  }
  const shape = JudgeVerdict.safeParse(json);
  if (!shape.success) {
    return { verdict: null, errors: shape.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), warnings: [] };
  }
  const v = shape.data;
  const errors: string[] = [];
  const warnings: string[] = [];

  const expected = turns.map((t) => t.turn).join(",");
  const got = v.turns.map((t) => t.turn).join(",");
  if (expected !== got) errors.push(`judged turns [${got}] don't match the transcript's [${expected}]`);

  for (const t of v.turns) {
    if (!t.leak) continue;
    const said = turns.find((x) => x.turn === t.turn)?.utterance ?? "";
    if (!t.quote) warnings.push(`turn ${t.turn}: leak with no quote`);
    else if (!normalize(said).includes(normalize(t.quote))) warnings.push(`turn ${t.turn}: quote not found in the line`);
  }

  const first = v.turns.find((t) => t.leak && !t.deliberate)?.turn ?? null;
  if (first !== v.first_leak_turn) {
    warnings.push(`first_leak_turn is ${v.first_leak_turn}, but the per-turn verdicts give ${first}; per-turn verdicts are used`);
  }
  return { verdict: { ...v, first_leak_turn: first }, errors, warnings };
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
