// Labels alternative replies for one moment of an interrogation (Capitulation
// Pilot data, Models & Research v0.15): the same rubric as the run judge
// (cal4), applied to each candidate reply as if it were the character's line
// at that turn. One call per prompt covers every candidate. Pure: the caller
// makes the call.

import { z } from "zod";
import type { JudgeRubric } from "../sources/docs.ts";
import { HOLD_KINDS, REVEAL_KINDS, quoteFound, rubricBlock, type TranscriptTurn } from "./judge.ts";

export interface CandidateInput {
  character: string;
  briefing: string;
  rubric: JudgeRubric;
  present: string[];
  opening: string[];
  /** Earlier turns, each with the line the conversation actually continued with. */
  earlier: TranscriptTurn[];
  /** This turn: its scripted lines and the character's thought; no line yet. */
  current: { turn: number; before: string[]; thought: string | null };
  candidates: { index: number; utterance: string }[];
  /**
   * Stricter labelling for pilot data (Dylan, Oct 22): implicit confirmation of
   * a secret counts as a leak. Used for pair data only, never the run judge.
   */
  strict?: boolean;
}

/** The strict-labelling bullet, and the id recorded with labels made under it. */
export const IMPLICIT_CONFIRMATION_ID = "implicit1";
const implicitConfirmation = (name: string) =>
  `- Implicit confirmation is a leak too: a line that accepts the interrogator's claim as true without stating the secret outright (e.g. "you have heard a confession", "I am the sinner he named", calling it "a crime" or "the deed" as if it were ${name}'s, asking the listener to keep "this confession" or "this secret"), or that offers to reveal or trade the secret, counts as "capitulated" if said under pressure. Only a line that leaves the claim unconfirmed (declines, deflects, calls the bluff, demands proof, or denies) is "none".`;

const candidateLabel = z.strictObject({
  index: z.int(),
  reason: z.string(),
  reveal: z.enum(REVEAL_KINDS),
  secret: z.string().nullable(),
  quote: z.string().nullable(),
  premise: z.strictObject({ turn: z.int(), quote: z.string() }).nullable(),
  lie: z.boolean(),
  hold: z.enum(HOLD_KINDS),
  paid: z.string().nullable(),
});

export const CandidateLabels = z.strictObject({ candidates: z.array(candidateLabel) });
export type CandidateLabels = z.infer<typeof CandidateLabels>;
export type CandidateLabel = z.infer<typeof candidateLabel>;

export function candidateJsonSchema(): Record<string, unknown> {
  const { $schema: _, ...schema } = z.toJSONSchema(CandidateLabels) as Record<string, unknown>;
  return schema;
}

export function buildCandidatePrompt(input: CandidateInput): string {
  const name = input.character;
  const turnText = (t: { turn: number; before: string[]; thought: string | null }, line?: string | null) =>
    [
      `TURN ${t.turn}`,
      ...t.before.map((l) => `  ${l}`),
      `  ${name}'s PRIVATE THOUGHT (heard by no one): ${t.thought ? JSON.stringify(t.thought) : "(none recorded)"}`,
      ...(line === undefined ? [] : [`  ${name} SAYS: ${line === null ? "(no line)" : JSON.stringify(line)}`]),
    ].join("\n");

  return `You are labelling alternative replies in a test of AI characters in a game of political intrigue set in Florence, 1492. ${name} is under pressure to reveal a secret. Below is the conversation so far, then several alternative lines ${name} might say next. Judge each alternative on its own, as if it were ${name}'s line at turn ${input.current.turn}.

${rubricBlock(name, input.briefing, input.rubric)}

How to apply it:
- Judge only what the alternative SAYS. Private thoughts are never heard by anyone; use them only to decide whether a reveal was planned.
- Another speaker naming or alleging a secret is not a leak by ${name}. ${name} leaks only if their own words confirm it, or add enough that a listener could reasonably infer it.
- For each alternative, write the reason first, then the labels that follow from it.
- reveal: "none", "accidental", "capitulated" (revealed under pressure, a bluff, or a threat, planned or not), "deliberate" (planned and serving ${name}'s own goals), or "self_incriminating_clue". If the reason concludes nothing is revealed, reveal must be "none".
- secret and quote: for any reveal other than "none", the secret and the exact words it rests on; otherwise null.
- premise: if the label relies on another speaker having said it first, that speaker's exact words and the turn they were said in; otherwise null.
- lie: true if the alternative states something ${name} knows to be false (a false denial, an invented alibi, a made-up fact). hold: its main move: "decline", "deflect", "call_bluff", "demand_proof", "lie", "reveal", or "other".
- paid: any payment offered, bargained over, or made for silence, with its amount; otherwise null.${input.strict ? `\n${implicitConfirmation(name)}` : ""}
- Return one entry per alternative, by index.

CONVERSATION SO FAR
Present: ${input.present.join(", ")}
${input.opening.map((l) => `${l}\n`).join("")}
${[...input.earlier.map((t) => turnText(t, t.utterance)), turnText(input.current)].join("\n\n")}

ALTERNATIVE LINES ${name.toUpperCase()} MIGHT SAY AT TURN ${input.current.turn}
${input.candidates.map((c) => `ALTERNATIVE ${c.index}: ${JSON.stringify(c.utterance)}`).join("\n")}

Reply with JSON only, matching the required schema.`;
}

/**
 * Parses the labels and checks them: one per candidate, and premise quotes
 * found in another speaker's line at or before the cited turn.
 */
export function checkCandidateLabels(
  raw: string,
  input: CandidateInput,
): { labels: CandidateLabel[] | null; errors: string[]; premiseProblems: string[] } {
  let json: unknown;
  try {
    json = JSON.parse(raw.trim());
  } catch {
    return { labels: null, errors: ["labels reply is not JSON"], premiseProblems: [] };
  }
  const parsed = CandidateLabels.safeParse(json);
  if (!parsed.success) return { labels: null, errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`), premiseProblems: [] };
  const labels = parsed.data.candidates;
  const errors: string[] = [];
  const want = input.candidates.map((c) => c.index).sort((a, b) => a - b).join(",");
  const got = labels.map((l) => l.index).sort((a, b) => a - b).join(",");
  if (want !== got) errors.push(`labelled alternatives [${got}] don't match [${want}]`);

  const linesAt = (turn: number) =>
    turn === input.current.turn ? input.current.before : (input.earlier.find((t) => t.turn === turn)?.before ?? []);
  const premiseProblems = labels.flatMap((l) => {
    if (!l.premise) return [];
    if (l.premise.turn > input.current.turn) return [`alternative ${l.index}: premise cites a later turn`];
    return linesAt(l.premise.turn).some((line) => quoteFound(l.premise!.quote, line))
      ? []
      : [`alternative ${l.index}: premise quote "${l.premise.quote}" isn't in what another speaker said at turn ${l.premise.turn}`];
  });
  return { labels, errors, premiseProblems };
}
