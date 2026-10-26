// Parses and validates think() output against Technical Design's Block 9a and
// the gate 1 validity rules in Models & Research. Reusable by the engine.

import { z } from "zod";
import { resolveAlias } from "../game/roster.ts";
import { parseJson } from "./json.ts";
import type { ConversationKind } from "../prompt/assemble.ts";

const score = z.int().min(0).max(100);

const contact = z.object({
  name: z.string(),
  urgency: score,
  purpose: z.string().nullable(),
});

/**
 * Lenient shape check for parsing: extra keys are ignored, and a missing
 * `done` parses so the repaired level can fill it outside a Colloquio. The
 * strict and revised levels still count a missing `done` as a syntax failure.
 */
export const ThinkOutput = z.object({
  thought: z.string().min(1),
  importance: score,
  contacts: z.array(contact),
  done: z.boolean().nullable().optional(),
});

export type ThinkOutput = z.infer<typeof ThinkOutput> & {
  /** TD v0.9: how the character takes the last thing said aloud; present only when the prompt asks for it. */
  took?: Took;
};

/** TD v0.9's `took` values (block 9a): the six kinds, or none. */
export const TOOK_VALUES = ["promise", "deal", "threat", "admission", "claim", "denial", "none"] as const;
export type Took = (typeof TOOK_VALUES)[number];

/**
 * TD v0.9, Output Validation & Repair, `took`: matched case-insensitively, a leading article or a
 * plural stripped ("a threat" → threat, "Threats" → threat). Missing or unknown → none, which the
 * caller logs as a repair; it never triggers a retry.
 */
export function normalizeTook(raw: unknown): { took: Took; unknown: boolean } {
  if (typeof raw !== "string") return { took: "none", unknown: true };
  let w = raw.trim().toLowerCase().replace(/[.!"'`]+$/g, "").replace(/^["'`]+/, "");
  w = w.replace(/^(a|an|the)\s+/, "");
  const hit = (x: string) => (TOOK_VALUES as readonly string[]).includes(x);
  if (hit(w)) return { took: w as Took, unknown: false };
  // Plurals: "threats", "promises", "denials", "admissions", "claims", "deals".
  const singular = w.endsWith("s") ? w.slice(0, -1) : w;
  if (singular !== w && hit(singular)) return { took: singular as Took, unknown: false };
  return { took: "none", unknown: true };
}

/** Strict JSON Schema for constrained decoding; `done` is fixed by conversation type. */
export function thinkJsonSchema(conversation: ConversationKind): Record<string, unknown> {
  const strict = z.strictObject({
    thought: z.string(),
    importance: score,
    contacts: z.array(z.strictObject(contact.shape)),
    done: conversation === "colloquio" ? z.boolean() : z.null(),
  });
  const { $schema: _, ...schema } = z.toJSONSchema(strict) as Record<string, unknown>;
  return schema;
}

export interface ThinkExpectation {
  conversation: ConversationKind;
  livingOthers: string[];
  /**
   * Names whose contacts are dropped before any check, at every level:
   * unbriefed guests present in the room but not on the roster (Dylan, Oct 21).
   */
  ignoreNames?: string[];
  /**
   * The Block 9a the prompt used: TD v0.2 asks for a contact list; TD v0.3
   * removed it and asks for `done` only in a Colloquio. Default v0.2.
   */
  format?: "td0.2" | "td0.3";
  /** TD v0.9: the prompt asks for `took`, so it's read (and a missing one repaired). */
  took?: boolean;
}

export type ThinkVerdict =
  /** Not JSON, or JSON that doesn't match the shape. */
  | "syntax"
  /** Right shape, wrong content (names, purposes, done). */
  | "meaning"
  | "valid";

/**
 * Gate 1 is scored at three levels (Models & Research v0.7, Scoring):
 * - strict: the rule as written before any run; a purpose outside the three
 *   most urgent contacts is invalid
 * - revised: code keeps purposes only for the three most urgent; extras are a warning
 * - repaired: what the engine could use after simple code fixes. On top of
 *   revised: fences stripped, aliases and near-miss names matched to the
 *   roster, duplicate contacts dropped (higher urgency kept), missing contacts
 *   filled with urgency 0, `done` ignored outside a Colloquio and filled with
 *   null there if missing (Oct 21 additions: aliases, duplicates, missing done)
 * At every level a top-three contact without a purpose is invalid (it is also
 * reported on its own), and one fenced block or bare JSON parses while prose
 * outside it doesn't.
 */
export type ScoringLevel = "strict" | "revised" | "repaired";
export const SCORING_LEVELS: readonly ScoringLevel[] = ["strict", "revised", "repaired"];

export interface LevelResult {
  verdict: ThinkVerdict;
  errors: string[];
  warnings: string[];
  /** The output as the engine would use it at this level. */
  value: ThinkOutput | null;
}

export interface Repairs {
  fenceStripped: boolean;
  purposesDropped: number;
  /** [as written, roster name], matched through the roster's alias table. */
  aliasesMatched: [string, string][];
  /** [as written, roster name], matched as a near-miss spelling. */
  namesMatched: [string, string][];
  /** Names listed more than once; the higher-urgency entry was kept. */
  duplicatesDropped: string[];
  contactsFilled: string[];
  /** `done` was true or false outside a Colloquio and was set to null. */
  doneIgnored: boolean;
  /** `done` was missing outside a Colloquio and was set to null. */
  doneFilled: boolean;
  /** Importance wasn't a whole number from 0 to 100, and was rounded and clamped (TD v0.3). */
  scoreClamped?: boolean;
  /** TD v0.9: `took` was missing or not one of the seven values, and was set to none. */
  tookFilled?: boolean;
}

export interface ThinkParseResult {
  /** Output was one markdown code fence, parsed after stripping it. */
  fenced: boolean;
  strict: LevelResult;
  revised: LevelResult;
  repaired: LevelResult;
  /** What the repaired level changed; null when the output didn't parse. */
  repairs: Repairs | null;
  /**
   * A top-three contact (by urgency, after repairs) has no purpose. No code
   * repair can fix it, so it's reported on its own; null when the output didn't parse.
   */
  topThreeWithoutPurpose: boolean | null;
}

export function parseThink(raw: string, expect: ThinkExpectation): ThinkParseResult {
  if (expect.format === "td0.3") return parseThinkV3(raw, expect);
  const syntax = (errors: string[], fenced: boolean): ThinkParseResult => {
    const failed: LevelResult = { verdict: "syntax", errors, warnings: [], value: null };
    return { fenced, strict: failed, revised: failed, repaired: failed, repairs: null, topThreeWithoutPurpose: null };
  };

  const { json, fenced, error } = parseJson(raw);
  if (error) return syntax([error], fenced);

  const shape = ThinkOutput.safeParse(json);
  if (!shape.success) {
    return syntax(
      shape.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
      fenced,
    );
  }

  const ignored = new Set(expect.ignoreNames ?? []);
  const value = { ...shape.data, contacts: shape.data.contacts.filter((c) => !ignored.has(c.name)) };
  const longPurposes = value.contacts
    .filter((c) => c.purpose !== null && c.purpose.trim().split(/\s+/).length > 6)
    .map((c) => `purpose for ${c.name} is over six words`);
  const common = [...nameErrors(value, expect), ...doneErrors(value, expect)];
  const purposes = topThreePurposes(value.contacts);
  const extraNote = purposes.extra.length ? `${purposes.extra.length} purpose(s) beyond the top three` : null;

  const level = (errors: string[], warnings: string[], v: ThinkOutput, syntaxErrors: string[] = []): LevelResult => ({
    verdict: syntaxErrors.length ? "syntax" : errors.length ? "meaning" : "valid",
    errors: [...syntaxErrors, ...errors],
    warnings,
    value: syntaxErrors.length ? null : v,
  });
  const doneMissing = value.done === undefined ? ["done: missing"] : [];

  const fixed = repair(value, expect);
  const fixedPurposes = topThreePurposes(fixed.value.contacts);
  const repairs: Repairs = { ...fixed.repairs, fenceStripped: fenced, purposesDropped: fixedPurposes.extra.length };
  const repairNotes = [
    ...(fenced ? ["fence stripped"] : []),
    ...(repairs.purposesDropped ? [`${repairs.purposesDropped} purpose(s) beyond the top three, dropped`] : []),
    ...repairs.aliasesMatched.map(([from, to]) => `alias "${from}" matched to "${to}"`),
    ...repairs.namesMatched.map(([from, to]) => `name "${from}" matched to "${to}"`),
    ...repairs.duplicatesDropped.map((n) => `duplicate "${n}" dropped`),
    ...(repairs.contactsFilled.length ? [`${repairs.contactsFilled.length} missing contact(s) filled`] : []),
    ...(repairs.doneIgnored ? ["done ignored outside a Colloquio"] : []),
    ...(repairs.doneFilled ? ["missing done set to null outside a Colloquio"] : []),
  ];
  const repairedDoneMissing =
    fixed.value.done === undefined ? ["done: missing in a Colloquio"] : [];

  return {
    fenced,
    strict: level(
      [...common, ...missingPurposeErrors(purposes.missing), ...(extraNote ? [`contacts: ${extraNote}`] : [])],
      longPurposes,
      value,
      doneMissing,
    ),
    revised: level(
      [...common, ...missingPurposeErrors(purposes.missing)],
      [...longPurposes, ...(extraNote ? [`${extraNote}, dropped`] : [])],
      dropPurposes(value, purposes.extra),
      doneMissing,
    ),
    repaired: level(
      [
        ...nameErrors(fixed.value, expect),
        ...doneErrors(fixed.value, expect),
        ...missingPurposeErrors(fixedPurposes.missing),
      ],
      [...longPurposes, ...repairNotes],
      dropPurposes(fixed.value, fixedPurposes.extra),
      repairedDoneMissing,
    ),
    repairs,
    topThreeWithoutPurpose: fixedPurposes.missing > 0,
  };
}

function missingPurposeErrors(missing: number): string[] {
  return missing ? [`contacts: ${missing} of the top three by urgency without a purpose`] : [];
}

function dropPurposes(v: ThinkOutput, extra: ThinkOutput["contacts"]): ThinkOutput {
  return { ...v, contacts: v.contacts.map((c) => (extra.includes(c) ? { ...c, purpose: null } : c)) };
}

/** The repaired level's fixes other than purposes and fences. */
function repair(
  value: ThinkOutput,
  expect: ThinkExpectation,
): { value: ThinkOutput; repairs: Omit<Repairs, "fenceStripped" | "purposesDropped"> } {
  const expected = (n: string) => expect.livingOthers.includes(n);
  const listed = new Set(value.contacts.map((c) => c.name).filter(expected));
  const aliasesMatched: [string, string][] = [];
  const namesMatched: [string, string][] = [];
  const renamed = value.contacts.map((c) => {
    if (expected(c.name)) return c;
    // An alias of someone already listed is renamed too; the duplicate rule
    // below then keeps the higher-urgency entry.
    const alias = resolveAlias(c.name);
    if (alias && expected(alias)) {
      listed.add(alias);
      aliasesMatched.push([c.name, alias]);
      return { ...c, name: alias };
    }
    const match = nearMiss(c.name, expect.livingOthers.filter((n) => !listed.has(n)));
    if (!match) return c;
    listed.add(match);
    namesMatched.push([c.name, match]);
    return { ...c, name: match };
  });

  // Duplicates: keep the higher-urgency entry (the first, on a tie).
  const best = new Map<string, number>();
  renamed.forEach((c, i) => {
    const b = best.get(c.name);
    if (b === undefined || c.urgency > renamed[b]!.urgency) best.set(c.name, i);
  });
  const duplicatesDropped: string[] = [];
  const contacts = renamed.filter((c, i) => {
    if (!expected(c.name) || best.get(c.name) === i) return true;
    if (!duplicatesDropped.includes(c.name)) duplicatesDropped.push(c.name);
    return false;
  });

  const contactsFilled = expect.livingOthers.filter((n) => !listed.has(n));
  contacts.push(...contactsFilled.map((name) => ({ name, urgency: 0, purpose: null })));

  const outsideColloquio = expect.conversation === "capannello";
  const doneIgnored = outsideColloquio && value.done !== null && value.done !== undefined;
  const doneFilled = outsideColloquio && value.done === undefined;
  return {
    value: { ...value, contacts, done: outsideColloquio ? null : value.done },
    repairs: { aliasesMatched, namesMatched, duplicatesDropped, contactsFilled, doneIgnored, doneFilled },
  };
}

/**
 * The one candidate a misspelled or shortened name most plausibly means: equal
 * once accents, case, and punctuation are ignored; else within two edits; else
 * the only candidate containing all its words ("LeNoir" → "Captain Armand LeNoir").
 */
export function nearMiss(name: string, candidates: string[]): string | null {
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const n = norm(name);
  const only = (xs: string[]) => (xs.length === 1 ? xs[0]! : null);
  const exact = candidates.filter((c) => norm(c) === n);
  if (exact.length) return only(exact);
  const close = candidates.filter((c) => editDistance(norm(c), n) <= 2);
  if (close.length) return only(close);
  const words = n.split(" ").filter(Boolean);
  return words.length ? only(candidates.filter((c) => words.every((w) => norm(c).split(" ").includes(w)))) : null;
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length]!;
}

/**
 * Compares the purposes given with the three most urgent contacts. Ties at the
 * cut-off may go either way: a purpose on any tied contact fills a slot.
 */
function topThreePurposes(contacts: ThinkOutput["contacts"]): {
  missing: number;
  extra: ThinkOutput["contacts"];
} {
  const slots = Math.min(3, contacts.length);
  if (!slots) return { missing: 0, extra: [] };
  const cutoff = [...contacts].sort((a, b) => b.urgency - a.urgency)[slots - 1]!.urgency;
  const above = contacts.filter((c) => c.urgency > cutoff);
  const tiedWithPurpose = contacts.filter((c) => c.urgency === cutoff && c.purpose !== null);
  const tiedSlots = slots - above.length;
  const kept = [...above.filter((c) => c.purpose !== null), ...tiedWithPurpose.slice(0, tiedSlots)];
  return {
    missing: above.filter((c) => c.purpose === null).length + Math.max(0, tiedSlots - tiedWithPurpose.length),
    extra: contacts.filter((c) => c.purpose !== null && !kept.includes(c)),
  };
}


/** Every "Other living guest" exactly once, exact spelling, and no one else. */
function nameErrors(v: ThinkOutput, expect: ThinkExpectation): string[] {
  const errors: string[] = [];
  const counts = new Map<string, number>();
  for (const c of v.contacts) counts.set(c.name, (counts.get(c.name) ?? 0) + 1);
  for (const name of expect.livingOthers) {
    const n = counts.get(name) ?? 0;
    if (n === 0) errors.push(`contacts: missing "${name}"`);
    if (n > 1) errors.push(`contacts: "${name}" listed ${n} times`);
  }
  for (const name of counts.keys()) {
    if (!expect.livingOthers.includes(name)) errors.push(`contacts: unknown name "${name}"`);
  }
  return errors;
}

function doneErrors(v: ThinkOutput, expect: ThinkExpectation): string[] {
  if (v.done === undefined) return [];
  if (expect.conversation === "capannello" && v.done !== null) return [`done: ${v.done} in a Capannello, expected null`];
  if (expect.conversation === "colloquio" && v.done === null) return ["done: null in a Colloquio, expected true or false"];
  return [];
}

/** TD v0.3's think() reply: thought and importance, plus `done` in a Colloquio. */
const ThinkOutputV3 = z.object({
  thought: z.string().min(1),
  importance: z.number(),
  done: z.boolean().nullable().optional(),
  took: z.unknown().optional(),
});

/**
 * Gate 1 levels for TD v0.3 (no contact list). Strict and revised are the
 * same: there are no purposes to drop. Repaired adds TD v0.3's Output
 * Validation & Repair: importance rounded and clamped to 0–100, `done` ignored
 * outside a Colloquio.
 */
function parseThinkV3(raw: string, expect: ThinkExpectation): ThinkParseResult {
  const syntax = (errors: string[], fenced: boolean): ThinkParseResult => {
    const failed: LevelResult = { verdict: "syntax", errors, warnings: [], value: null };
    return { fenced, strict: failed, revised: failed, repaired: failed, repairs: null, topThreeWithoutPurpose: null };
  };
  const { json, fenced, error } = parseJson(raw);
  if (error) return syntax([error], fenced);
  const shape = ThinkOutputV3.safeParse(json);
  if (!shape.success) return syntax(shape.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`), fenced);

  const v = shape.data;
  const colloquio = expect.conversation === "colloquio";
  const scoreOk = Number.isInteger(v.importance) && v.importance >= 0 && v.importance <= 100;
  const syntaxErrors = colloquio && (v.done === undefined || v.done === null) ? ["done: missing or null in a Colloquio"] : [];
  const meaning = [
    ...(scoreOk ? [] : [`importance: ${v.importance} is not a whole number from 0 to 100`]),
    ...(!colloquio && v.done !== undefined ? [`done: ${v.done} given outside a Colloquio, where it isn't asked for`] : []),
  ];
  const level = (errors: string[], value: ThinkOutput): LevelResult =>
    syntaxErrors.length
      ? { verdict: "syntax", errors: syntaxErrors, warnings: [], value: null }
      : { verdict: errors.length ? "meaning" : "valid", errors, warnings: [], value };

  // TD v0.9: `took` never fails a call; missing or unknown becomes none, counted as a repair.
  const took = expect.took ? normalizeTook(v.took) : null;
  const asIs: ThinkOutput = { thought: v.thought, importance: v.importance, contacts: [], done: v.done ?? null, ...(took && { took: took.took }) };
  const fixed: ThinkOutput = {
    ...asIs,
    importance: Math.min(100, Math.max(0, Math.round(v.importance))),
    done: colloquio ? (v.done ?? null) : null,
  };
  const repairs: Repairs = {
    fenceStripped: fenced,
    purposesDropped: 0,
    aliasesMatched: [],
    namesMatched: [],
    duplicatesDropped: [],
    contactsFilled: [],
    doneIgnored: !colloquio && v.done !== undefined && v.done !== null,
    doneFilled: false,
    scoreClamped: !scoreOk,
    ...(took && { tookFilled: took.unknown }),
  };
  return {
    fenced,
    strict: level(meaning, asIs),
    revised: level(meaning, asIs),
    repaired: level([], fixed),
    repairs,
    topThreeWithoutPurpose: null,
  };
}
