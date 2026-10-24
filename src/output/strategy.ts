// Parses and checks the outputs of Technical Design v0.4's strategy, Murder
// Round, ballot, and run-off tasks (blocks 9d–9g). Reusable by the engine.
// Shape failures make an output unusable ("syntax"); a legal-move problem
// (a self-guard, a dead target, too many votes bought) is reported as an
// illegality the Stage Manager would reject, not a parse failure.

import { z } from "zod";
import { resolveAlias } from "../game/roster.ts";
import { parseJson } from "./json.ts";

export const PlanOutput = z.object({ thought: z.string().min(1), plan: z.string().min(1) });
const murderAct = z.object({ type: z.enum(["kill", "guard", "investigate"]), target: z.string() });
/**
 * TD v0.5: a single `act`, or Lupo's `kills` list. TD v0.4: an `acts` list.
 * All three are read into `acts` so the checks below see one shape.
 */
export const MurderOutput = z
  .union([
    z.object({ thought: z.string().min(1), act: murderAct }),
    z.object({ thought: z.string().min(1), kills: z.array(z.string()) }),
    z.object({ thought: z.string().min(1), acts: z.array(murderAct) }),
  ])
  .transform((v) => ({
    thought: v.thought,
    acts: "act" in v ? [v.act] : "kills" in v ? v.kills.map((target) => ({ type: "kill" as const, target })) : v.acts,
  }));
export const BallotOutput = z.object({ thought: z.string().min(1), vote: z.string(), buy: z.int() });
export const RunoffOutput = z.object({ thought: z.string().min(1), vote: z.string() });

export type StrategyKind = "plan" | "murder" | "ballot" | "runoff";

export interface StrategyExpectation {
  character: string;
  /** Living guests besides the character, as written in "All living guests besides you". */
  livingOthers: string[];
  /** Ballot: the most extra votes the purse allows. */
  maxBuy?: number;
  /** Run-off: the tied guests. */
  tied?: string[];
}

export interface StrategyParseResult {
  verdict: "syntax" | "valid";
  fenced: boolean;
  /** Names matched through an alias rather than as written. */
  aliasRepairs: number;
  errors: string[];
  /** Moves the Stage Manager would reject. */
  illegal: string[];
  value: Record<string, unknown> | null;
  /** The plan's word count, before any truncation (TD asks for at most 150). */
  words?: number;
  /** TD v0.5: a plan over 150 words was cut (logged as a repair). */
  truncated?: boolean;
}

/** TD v0.5's plan limit: cut at the last sentence end before word 150, or at word 150 if there's none. */
export function truncatePlan(plan: string, limit = 150): { plan: string; truncated: boolean } {
  const words = plan.trim().split(/\s+/);
  if (words.length <= limit) return { plan, truncated: false };
  const head = words.slice(0, limit).join(" ");
  const end = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "), /[.!?]$/.test(head) ? head.length - 1 : -1);
  return { plan: end > 0 ? head.slice(0, end + 1) : head, truncated: true };
}

const SCHEMAS = { plan: PlanOutput, murder: MurderOutput, ballot: BallotOutput, runoff: RunoffOutput };

export function parseStrategy(kind: StrategyKind, raw: string, expect: StrategyExpectation): StrategyParseResult {
  const { json, fenced, error } = parseJson(raw);
  const failed = (errors: string[]): StrategyParseResult => ({ verdict: "syntax", fenced, aliasRepairs: 0, errors, illegal: [], value: null });
  if (error) return failed([error]);
  const shape = SCHEMAS[kind].safeParse(json);
  if (!shape.success) return failed(shape.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`));
  const value = shape.data as Record<string, unknown>;
  let truncated = false;
  const words = kind === "plan" ? (value.plan as string).trim().split(/\s+/).length : undefined;
  if (kind === "plan") {
    const cut = truncatePlan(value.plan as string);
    truncated = cut.truncated;
    value.plan = cut.plan;
  }
  const illegal: string[] = [];
  let aliasRepairs = 0;
  // A name as written, or a known alias of one (counted as a repair); null if neither.
  const resolve = (name: string, allowed: string[]): string | null => {
    if (allowed.includes(name)) return name;
    const alias = resolveAlias(name);
    if (alias && allowed.includes(alias)) {
      aliasRepairs++;
      return alias;
    }
    return null;
  };

  if (kind === "murder") {
    const acts = (value as z.infer<typeof MurderOutput>).acts;
    const lupo = expect.character === "Lupo";
    if (lupo) {
      if (acts.length < 1 || acts.length > 2) illegal.push(`Lupo chose ${acts.length} acts (one or two kills)`);
      if (acts.some((a) => a.type !== "kill")) illegal.push("Lupo may only kill");
    } else if (acts.length !== 1) {
      illegal.push(`${acts.length} acts (exactly one)`);
    }
    const targets = acts.map((a) => {
      if (a.target === expect.character) {
        if (a.type === "guard") illegal.push("guards self");
        else illegal.push(`${a.type} on self`);
        return a.target;
      }
      const t = resolve(a.target, expect.livingOthers);
      if (!t) illegal.push(`target "${a.target}" is not a living guest`);
      return t ?? a.target;
    });
    if (new Set(targets).size !== targets.length) illegal.push("two acts on the same guest");
  }
  if (kind === "ballot") {
    const b = value as z.infer<typeof BallotOutput>;
    if (b.vote !== expect.character && !resolve(b.vote, expect.livingOthers)) illegal.push(`vote for "${b.vote}", not a living guest`);
    if (b.buy < 0 || b.buy > (expect.maxBuy ?? 0)) illegal.push(`buys ${b.buy} votes (0 to ${expect.maxBuy})`);
  }
  if (kind === "runoff") {
    const r = value as z.infer<typeof RunoffOutput>;
    if (!resolve(r.vote, expect.tied ?? [])) illegal.push(`run-off vote for "${r.vote}", not one of the tied guests`);
  }
  return { verdict: "valid", fenced, aliasRepairs, errors: [], illegal, value, ...(words !== undefined && { words, truncated }) };
}
