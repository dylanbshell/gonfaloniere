// Parses and validates speak() output against Technical Design's Block 9b.
// Reusable by the engine. Following TD: an addressee that doesn't match anyone
// present (exact name or known alias) is treated as no addressee, and an
// illegal action is rejected by the Stage Manager. Neither makes the output
// unusable, so both are reported as warnings with counts, not failures.

import { z } from "zod";
import type { ActionType } from "../game/actions.ts";
import { resolveAlias } from "../game/roster.ts";
import { parseJson } from "./json.ts";

const action = z.discriminatedUnion("type", [
  // Any whole amount parses; a non-positive one is rejected like any other illegal action.
  z.object({ type: z.literal("bribe"), amount: z.int() }),
  z.object({ type: z.literal("borrow") }),
  z.object({ type: z.literal("repay"), for: z.string() }),
]);

/**
 * Lenient shape check: extra keys ignored; a missing `action` counts as none.
 * `addressee` is required unless the prompt didn't ask for it (TD v0.4's Colloquio).
 */
export const SpeakOutput = z.object({
  addressee: z.string().nullable().optional(),
  utterance: z.string().min(1),
  action: action.nullable().optional(),
});

export type SpeakOutput = z.infer<typeof SpeakOutput>;
export type SpeakAction = z.infer<typeof action>;

export interface SpeakExpectation {
  /** Others present, as listed under "Present". */
  present: string[];
  allowedActions: ActionType[];
  /** For checking a bribe amount. */
  florins: number;
  /** False when the prompt has no addressee field (TD v0.4's Colloquio); default true. */
  addressee?: boolean;
}

export interface SpeakParseResult {
  verdict: "syntax" | "valid";
  fenced: boolean;
  errors: string[];
  warnings: string[];
  value: SpeakOutput | null;
  /** The addressee as the engine would use it: a name present, or null. */
  addressee: string | null;
  addresseeIssue: "alias" | "not-present" | null;
  /** The action the Stage Manager would apply, or null if none or rejected. */
  action: SpeakAction | null;
  actionRejected: string | null;
  /** Spoken words; TD asks for about 60 at most. */
  words: number;
}

export function parseSpeak(raw: string, expect: SpeakExpectation): SpeakParseResult {
  const { json, fenced, error } = parseJson(raw);
  const failed = (errors: string[]): SpeakParseResult => ({
    verdict: "syntax",
    fenced,
    errors,
    warnings: [],
    value: null,
    addressee: null,
    addresseeIssue: null,
    action: null,
    actionRejected: null,
    words: 0,
  });
  if (error) return failed([error]);
  const shape = SpeakOutput.safeParse(json);
  if (!shape.success) return failed(shape.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`));

  const value = shape.data;
  const warnings: string[] = [];
  const asked = expect.addressee ?? true;
  if (asked && value.addressee === undefined) return failed(["addressee: missing"]);
  if (!asked && value.addressee != null) warnings.push(`addressee "${value.addressee}" given where none was asked; ignored`);

  let addressee: string | null = null;
  let addresseeIssue: SpeakParseResult["addresseeIssue"] = null;
  if (asked && value.addressee != null && value.addressee.trim() !== "") {
    if (expect.present.includes(value.addressee)) {
      addressee = value.addressee;
    } else {
      const alias = resolveAlias(value.addressee);
      if (alias && expect.present.includes(alias)) {
        addressee = alias;
        addresseeIssue = "alias";
        warnings.push(`addressee "${value.addressee}" resolved to "${alias}"`);
      } else {
        addresseeIssue = "not-present";
        warnings.push(`addressee "${value.addressee}" is not present; treated as none`);
      }
    }
  }

  const actionRejected = value.action ? rejectReason(value.action, expect) : null;
  if (actionRejected) warnings.push(`action rejected: ${actionRejected}`);

  const words = value.utterance.trim().split(/\s+/).length;
  if (words > 60) warnings.push(`utterance is ${words} words (asked for about 60 at most)`);

  return {
    verdict: "valid",
    fenced,
    errors: [],
    warnings,
    value,
    addressee,
    addresseeIssue,
    action: value.action && !actionRejected ? value.action : null,
    actionRejected,
    words,
  };
}

function rejectReason(a: SpeakAction, expect: SpeakExpectation): string | null {
  if (!expect.allowedActions.includes(a.type)) return `${a.type} is not allowed right now`;
  if (a.type === "bribe" && a.amount <= 0) return `bribe of ${a.amount} Florins`;
  if (a.type === "bribe" && a.amount > expect.florins) return `bribe of ${a.amount} exceeds purse of ${expect.florins}`;
  return null;
}
