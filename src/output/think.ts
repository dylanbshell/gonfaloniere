// Parses and validates think() output against Technical Design's Block 9a and
// the gate 1 validity rules in Models & Research. Reusable by the engine.

import { z } from "zod";
import type { ConversationKind } from "../prompt/assemble.ts";

const score = z.int().min(0).max(100);

const contact = z.object({
  name: z.string(),
  urgency: score,
  purpose: z.string().nullable(),
});

/** Lenient shape check for parsing: extra keys are ignored. */
export const ThinkOutput = z.object({
  thought: z.string().min(1),
  importance: score,
  contacts: z.array(contact),
  done: z.boolean().nullable(),
});

export type ThinkOutput = z.infer<typeof ThinkOutput>;

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
}

export type ThinkVerdict =
  /** Not JSON, or JSON that doesn't match the shape. */
  | "syntax"
  /** Right shape, wrong content (names, purposes, done). */
  | "meaning"
  | "valid";

/**
 * How "purposes for the top three only" is scored (Dylan, Oct 21). Every
 * result is scored under both:
 * - original: a purpose anywhere outside the three most urgent contacts is invalid
 * - revised: code keeps purposes only for the three most urgent; extras are a warning
 * Under both, a top-three contact without a purpose is invalid.
 */
export type PurposeRule = "original" | "revised";
export const PURPOSE_RULES: readonly PurposeRule[] = ["original", "revised"];

export interface RuleResult {
  verdict: ThinkVerdict;
  errors: string[];
  warnings: string[];
  /** The output as the engine would use it; under the revised rule, extra purposes are nulled. */
  value: ThinkOutput | null;
}

export interface ThinkParseResult {
  /** Output was one markdown code fence, parsed after stripping it. Prose outside a fence is invalid. */
  fenced: boolean;
  original: RuleResult;
  revised: RuleResult;
}

export function parseThink(raw: string, expect: ThinkExpectation): ThinkParseResult {
  const syntax = (errors: string[], fenced: boolean): ThinkParseResult => {
    const failed: RuleResult = { verdict: "syntax", errors, warnings: [], value: null };
    return { fenced, original: failed, revised: failed };
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

  const value = shape.data;
  const common = meaningErrors(value, expect);
  const longPurposes = value.contacts
    .filter((c) => c.purpose !== null && c.purpose.trim().split(/\s+/).length > 6)
    .map((c) => `purpose for ${c.name} is over six words`);
  const { missing, extra } = topThreePurposes(value.contacts);
  const missingError = missing ? [`contacts: ${missing} of the top three by urgency have no purpose`] : [];
  const extraNote = extra.length ? `${extra.length} purpose(s) beyond the top three` : null;

  const originalErrors = [...common, ...missingError, ...(extraNote ? [`contacts: ${extraNote}`] : [])];
  const revisedErrors = [...common, ...missingError];
  return {
    fenced,
    original: {
      verdict: originalErrors.length ? "meaning" : "valid",
      errors: originalErrors,
      warnings: longPurposes,
      value,
    },
    revised: {
      verdict: revisedErrors.length ? "meaning" : "valid",
      errors: revisedErrors,
      warnings: [...longPurposes, ...(extraNote ? [`${extraNote}, dropped`] : [])],
      value: {
        ...value,
        contacts: value.contacts.map((c) => (extra.includes(c) ? { ...c, purpose: null } : c)),
      },
    },
  };
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

function parseJson(raw: string): { json: unknown; fenced: boolean; error?: string } {
  const text = raw.trim();
  try {
    return { json: JSON.parse(text), fenced: false };
  } catch {
    const m = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n?```$/);
    if (m?.[1] !== undefined) {
      try {
        return { json: JSON.parse(m[1]), fenced: true };
      } catch (e) {
        return { json: null, fenced: true, error: `invalid JSON inside code fence: ${(e as Error).message}` };
      }
    }
    return { json: null, fenced: false, error: "not JSON" };
  }
}

/** Errors that count under both purpose rules. */
function meaningErrors(v: ThinkOutput, expect: ThinkExpectation): string[] {
  const errors: string[] = [];

  // Every "Other living guest" exactly once, exact spelling, and no one else.
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

  if (expect.conversation === "capannello" && v.done !== null) {
    errors.push(`done: ${v.done} in a Capannello, expected null`);
  }
  if (expect.conversation === "colloquio" && v.done === null) {
    errors.push("done: null in a Colloquio, expected true or false");
  }
  return errors;
}
