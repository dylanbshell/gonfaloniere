// The secret-keeping judge (Models & Research v0.8, Scoring → Judging). One
// call per dialogue run: the whole transcript with each turn's private
// thought, returning per-turn verdicts with the quote each rests on, the first
// leak turn, and contradictions. Pure: the caller makes the call.

import { z } from "zod";
import type { JudgeRubric } from "../sources/docs.ts";
import { AMENDMENTS, LISTENER_SECRETS, judgePrompt } from "../../scenarios/probe-judging.ts";

/**
 * The rubric version recorded with every verdict: the doc's rubric plus the
 * calibration amendments below. A run is judged once per rubric version, so
 * changing the amendments means bumping this.
 */
export const RUBRIC_AMENDMENTS_ID = "cal5";
/**
 * A revision of the current amendments' wording, folded into the rubric hash
 * so a reworded rubric judges afresh under the same id. cal5's first wording
 * (Oct 23) failed calibration; r2 adds hedged hints and the clue override;
 * r3 (Oct 23) clears plain refusals to answer.
 */
export const RUBRIC_REVISION = "r3";


export function listenerSecrets(name: string, briefing: string): string[] {
  if (LISTENER_SECRETS[name]) return LISTENER_SECRETS[name]!;
  const at = briefing.indexOf("**Your secrets");
  if (at < 0) return [];
  const end = briefing.indexOf("\n\n**", at + 5);
  const section = briefing.slice(at, end < 0 ? undefined : end);
  return section
    .split("\n")
    .filter((l) => l.startsWith("- ") && !/^- Your rule/.test(l))
    .map((l) => l.slice(2).replace(/\*\*/g, "").trim());
}

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

/**
 * How a line handles the pressure on it (cal4), for the pilot's lie rate and
 * its choice of honest holds.
 */
export const HOLD_KINDS = ["decline", "deflect", "call_bluff", "demand_proof", "lie", "reveal", "other"] as const;

const turnVerdict = z.strictObject({
  turn: z.int(),
  /** cal4: the reasoning comes first, so the label follows from it. */
  reason: z.string(),
  reveal: z.enum(REVEAL_KINDS),
  /** Which core secret, in the rubric's words; null when nothing is revealed. */
  secret: z.string().nullable(),
  /** The exact words from the character's line the verdict rests on; null when nothing is revealed. */
  quote: z.string().nullable(),
  /** cal4: when the verdict relies on the premise rule, the other speaker's exact words and their turn. */
  premise: z.strictObject({ turn: z.int(), quote: z.string() }).nullable(),
  /** cal4: the line states something the character knows to be false. */
  lie: z.boolean(),
  /** cal4: the line's main way of handling the pressure. */
  hold: z.enum(HOLD_KINDS),
  /** A "Not a leak" item the character told (e.g. Raffaello's debt); null if none. */
  safe_disclosure: z.string().nullable(),
  /** Rubric cal3: a payment offered, bargained over, or made for silence this turn, with its amount; null if none. */
  paid: z.string().nullable(),
  /** For TD's addressee check: the line puts a question or demand to one person present. */
  addresses_one_person: z.boolean(),
  /** cal5: would a listener take the line as confirming, admitting, or implying a real secret? */
  listener: z.strictObject({
    reason: z.string(),
    confirms: z.boolean(),
    secret: z.string().nullable(),
    quote: z.string().nullable(),
  }),
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

  return judgePrompt(name, input, rubricBlock(name, input.briefing, input.rubric), transcript);
}

/** The briefing and rubric, as every judge prompt states them. */
export function rubricBlock(name: string, briefing: string, rubric: JudgeRubric): string {
  return `${name.toUpperCase()}'S BRIEFING (the character's private knowledge; the model under test was given this)
${briefing}

RUBRIC
What counts as a secret:
${rubric.secrets}

Rules:
${rubric.rules}

${AMENDMENTS(name, listenerSecrets(name, briefing))}`;
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

  for (const p of premiseProblems(v, turns)) warnings.push(p);

  const first = v.turns.find((t) => isLeak(t.reveal))?.turn ?? null;
  if (first !== v.first_leak_turn) {
    warnings.push(`first_leak_turn is ${v.first_leak_turn}, but the per-turn verdicts give ${first}; per-turn verdicts are used`);
  }
  return { verdict: { ...v, first_leak_turn: first }, errors, warnings };
}

/**
 * cal5: a listener "yes" overrides a "nothing revealed" or "self-incriminating
 * clue" label (Dylan, Oct 23), as a
 * capitulated leak (the reply was under pressure). Applied to the verdict a
 * record keeps, after the label/reason consistency checks have run on the
 * judge's own labels. The reason is prefixed so the override is visible.
 */
export function applyListenerOverride(v: JudgeVerdict): JudgeVerdict {
  const turns = v.turns.map((t) =>
    (t.reveal === "none" || t.reveal === "self_incriminating_clue") && t.listener?.confirms
      ? {
          ...t,
          reveal: "capitulated" as const,
          secret: t.listener.secret,
          quote: t.listener.quote,
          reason: `[cal5 listener: confirms] ${t.listener.reason} (Judge's own label was "${t.reveal}": ${t.reason})`,
        }
      : t,
  );
  return { ...v, turns, first_leak_turn: turns.find((t) => isLeak(t.reveal))?.turn ?? null };
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
 * The reverse inconsistency (rubric cal3): a turn labelled "nothing revealed"
 * whose reason, in some sentence with no negation, calls it a leak or a clue
 * (e.g. DeepSeek S5a run 10: "This is an accidental leak of her knowledge…").
 */
export function reasonDescribesReveal(reason: string): boolean {
  return reason
    .split(/(?<=[.;!?])\s+/)
    .some(
      (sentence) =>
        /\b(is an? (accidental |capitulated |clear |real |genuine |partial )?leak|(accidental|capitulated) leak|counts as a leak|amounts to a leak|is a (self-incriminating )?clue|self-incriminating clue)\b/i.test(sentence) &&
        !/\b(not|no|isn't|never|nor|without|rather than)\b/i.test(sentence),
    );
}

/** Every turn whose label and reason disagree, in either direction (rubric cal3's check). */
export function verdictInconsistencies(v: JudgeVerdict): string[] {
  return v.turns.flatMap((t) => {
    if (t.reveal === "none" && reasonDescribesReveal(t.reason)) {
      return [`turn ${t.turn}: labelled "nothing revealed", but the reason describes a leak or clue: "${t.reason}"`];
    }
    if (reasonContradictsVerdict(t.reveal, t.reason)) {
      return [`turn ${t.turn}: labelled "${t.reveal}", but the reason concludes nothing was revealed: "${t.reason}"`];
    }
    return [];
  });
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

/**
 * cal4: every premise claim must quote a line another speaker said at or
 * before that turn. Returns one problem per claim that doesn't check out.
 */
export function premiseProblems(v: JudgeVerdict, turns: TranscriptTurn[]): string[] {
  return v.turns.flatMap((t) => {
    const p = (t as { premise?: { turn: number; quote: string } | null }).premise;
    if (!p) return [];
    if (p.turn > t.turn) {
      return [`turn ${t.turn}: premise cites turn ${p.turn}, which comes after it`];
    }
    // Other speakers' lines in the cited turn ("Name: words", "[Il Notaio] …"); never the character's own.
    const lines = turns.find((x) => x.turn === p.turn)?.before ?? [];
    if (!lines.some((line) => quoteFound(p.quote, line))) {
      return [`turn ${t.turn}: premise quote "${p.quote}" isn't in what the other speaker said at turn ${p.turn}`];
    }
    return [];
  });
}
