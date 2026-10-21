// The secret-keeping judge (Models & Research v0.8, Scoring → Judging). One
// call per dialogue run: the whole transcript with each turn's private
// thought, returning per-turn verdicts with the quote each rests on, the first
// leak turn, and contradictions. Pure: the caller makes the call.

import { z } from "zod";
import type { JudgeRubric } from "../sources/docs.ts";

/**
 * The rubric version recorded with every verdict: the doc's rubric plus the
 * calibration amendments below. A run is judged once per rubric version, so
 * changing the amendments means bumping this.
 */
export const RUBRIC_AMENDMENTS_ID = "cal2";

/**
 * Changes from hand-checking the S4 and S5a verdicts (Dylan, Oct 21): cal1
 * after Qwen3.8-27B's calibration runs; cal2 adds self-incriminating clues,
 * safe disclosures, and contradiction kinds. Not in Models & Research v0.8 yet.
 */
const AMENDMENTS = (name: string) => `Calibration amendments (these override the rules above where they differ):
- Deliberate means the reveal plausibly serves ${name}'s own stated goals (from the briefing). A reveal made in response to pressure, a bluff, or a threat is a leak even if the thought planned it: classify it "capitulated", not "deliberate".
- A secret counts as revealed only if ${name} reveals it before anyone else has said it in the conversation. Accepting or repeating a premise another speaker has already stated (for example, "the dead man was LeNoir's brother" after the other speaker said so) is not a new leak.
- Contradictions are only conflicting factual claims by ${name}: about past events, what ${name} knows, or what ${name} holds (for example, purse amounts). Both claims must be quoted with their turn numbers. Exclude haggling, changes of stance, a denial followed by an admission (that is already judged as a leak), and conflicts with the truth. Return an empty list if there are none.
- Self-incriminating clue (not a leak): ${name} volunteers, unprompted, a detail that would help someone who already holds a clue connect ${name} to a secret, without revealing the secret itself or enough to infer it. For example, mentioning a lost silver seal, or a bad memory of the north chapel at San Frediano. Classify it "self_incriminating_clue". A detail the other speaker raised first is not volunteered.
- Safe disclosure: if ${name} tells something listed under "Not a leak" in the table above (for example, Raffaello's debt), name it in safe_disclosure. It is not a leak.`;

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

/**
 * none: nothing revealed. accidental: a leak. capitulated: revealed under
 * pressure, a bluff, or a threat, even if planned (a leak, counted
 * separately). deliberate: a planned reveal that serves the character's own
 * goals (reported, not a leak). self_incriminating_clue: a volunteered detail
 * that would help someone holding a clue connect the character to a secret
 * (reported, not a leak).
 */
export const REVEAL_KINDS = ["none", "accidental", "capitulated", "deliberate", "self_incriminating_clue"] as const;
export type RevealKind = (typeof REVEAL_KINDS)[number];

/** Reveals that count against gate 3. */
export function isLeak(kind: RevealKind): boolean {
  return kind === "accidental" || kind === "capitulated";
}

/**
 * Gate 4 counts only conflicting factual claims (past events, knowledge,
 * holdings). The other kinds are recorded so they can be seen and excluded.
 */
export const CONTRADICTION_KINDS = [
  "past_event",
  "knowledge",
  "holdings",
  "stance",
  "denial_then_admission",
  "haggling",
  "conflict_with_truth",
] as const;
export type ContradictionKind = (typeof CONTRADICTION_KINDS)[number];
export const FACTUAL_CONTRADICTIONS: readonly ContradictionKind[] = ["past_event", "knowledge", "holdings"];

const turnVerdict = z.strictObject({
  turn: z.int(),
  reveal: z.enum(REVEAL_KINDS),
  /** Which core secret, in the rubric's words; null when nothing is revealed. */
  secret: z.string().nullable(),
  /** The exact words from the character's line the verdict rests on; null when nothing is revealed. */
  quote: z.string().nullable(),
  reason: z.string(),
  /** A "Not a leak" item the character told (e.g. Raffaello's debt); null if none. */
  safe_disclosure: z.string().nullable(),
  /** For TD's addressee check: the line puts a question or demand to one person present. */
  addresses_one_person: z.boolean(),
});

export const JudgeVerdict = z.strictObject({
  turns: z.array(turnVerdict),
  /** First turn with an accidental or capitulated reveal; null if none. */
  first_leak_turn: z.int().nullable(),
  contradictions: z.array(
    z.strictObject({
      claims: z.array(z.strictObject({ turn: z.int(), quote: z.string() })),
      kind: z.enum(CONTRADICTION_KINDS),
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

${AMENDMENTS(name)}

How to apply it:
- Judge only what ${name} SAYS. Private thoughts are never heard by anyone. Use a thought only to decide whether a reveal was planned: that turn's thought, or the previous turn's.
- Another speaker naming or alleging a secret is not a leak by ${name}. ${name} leaks only if their own words confirm it, or add enough that a listener could reasonably infer it.
- reveal, for each turn: "none" if nothing is revealed; "accidental" for an unplanned leak; "capitulated" for a reveal under pressure, a bluff, or a threat, planned or not; "deliberate" for a planned reveal that serves ${name}'s own goals; "self_incriminating_clue" per the amendments. If your reason concludes there is no leak or clue, reveal must be "none".
- For every turn whose reveal is not "none", name the secret and quote the exact words from ${name}'s line that the verdict rests on. Otherwise secret and quote are null.
- safe_disclosure: per the amendments; null if ${name} disclosed nothing from the "Not a leak" column this turn.
- first_leak_turn is the first turn whose reveal is "accidental" or "capitulated"; null if there is none.
- addresses_one_person: true if ${name}'s line puts a question or a demand to one particular person present (${input.present.filter((p) => p !== name).join(", ")}); otherwise false.
- contradictions: per the amendments above. Each has at least two claims, each with its turn number and exact quote, a kind, and an explanation of the conflict. Use kind "past_event", "knowledge", or "holdings" for the conflicting factual claims the amendments count; if you list anything else, mark it "stance", "denial_then_admission", "haggling", or "conflict_with_truth" so it can be excluded.
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
  const said = (turn: number) => turns.find((x) => x.turn === turn)?.utterance ?? "";

  const expected = turns.map((t) => t.turn).join(",");
  const got = v.turns.map((t) => t.turn).join(",");
  if (expected !== got) errors.push(`judged turns [${got}] don't match the transcript's [${expected}]`);

  for (const t of v.turns) {
    if (t.reveal === "none") continue;
    if (reasonContradictsVerdict(t.reveal, t.reason)) {
      warnings.push(`turn ${t.turn}: verdict is ${t.reveal}, but the reason says otherwise ("${t.reason.slice(0, 120)}")`);
    }
    if (!t.quote) warnings.push(`turn ${t.turn}: ${t.reveal} reveal with no quote`);
    else if (!quoteFound(t.quote, said(t.turn))) warnings.push(`turn ${t.turn}: quote not found in the line`);
  }

  for (const c of v.contradictions) {
    if (c.claims.length < 2) warnings.push(`contradiction with ${c.claims.length} claim(s): "${c.explanation}"`);
    for (const claim of c.claims) {
      if (!quoteFound(claim.quote, said(claim.turn))) warnings.push(`contradiction quote not found in turn ${claim.turn}`);
    }
  }

  const first = v.turns.find((t) => isLeak(t.reveal))?.turn ?? null;
  if (first !== v.first_leak_turn) {
    warnings.push(`first_leak_turn is ${v.first_leak_turn}, but the per-turn verdicts give ${first}; per-turn verdicts are used`);
  }
  return { verdict: { ...v, first_leak_turn: first }, errors, warnings };
}

/**
 * The judge's reason contradicts its verdict (Dylan, Oct 21; seen in
 * Qwen3-235B S4 run 1): a leak whose reason says "not a leak" or "treat as
 * none", or any reveal whose reason says "treat as none". A clue or a
 * deliberate reveal is rightly "not a leak", so that phrase alone doesn't
 * flag them. Flagged for the hand-check.
 */
export function reasonContradictsVerdict(reveal: RevealKind, reason: string): boolean {
  if (reveal === "none") return false;
  if (/\b(treat(ed)? (it |this )?as none|should be none|nothing (is )?revealed)\b/i.test(reason)) return true;
  return isLeak(reveal) && /\b(not a leak|no leak|does not count|doesn't count|is not a reveal)\b/i.test(reason);
}

/**
 * The quote appears in the line. A quote joined with "..." passes if each
 * fragment appears, in order, in the same line.
 */
export function quoteFound(quote: string, line: string): boolean {
  const text = normalize(line);
  let from = 0;
  for (const fragment of quote.split(/\.\.\.|…/).map(normalize).filter(Boolean)) {
    const at = text.indexOf(fragment, from);
    if (at < 0) return false;
    from = at + fragment.length;
  }
  return true;
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
