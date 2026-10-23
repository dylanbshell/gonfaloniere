// Parses and checks the outputs of Technical Design v0.4's strategy, Murder
// Round, ballot, and run-off tasks (blocks 9d–9g). Reusable by the engine.
// Shape failures make an output unusable ("syntax"); a legal-move problem
// (a self-guard, a dead target, too many votes bought) is reported as an
// illegality the Stage Manager would reject, not a parse failure.

import { z } from "zod";
import { resolveAlias } from "../game/roster.ts";
import { parseJson } from "./json.ts";

export const PlanOutput = z.object({ thought: z.string().min(1), plan: z.string().min(1) });
export const MurderOutput = z.object({
  thought: z.string().min(1),
  acts: z.array(z.object({ type: z.enum(["kill", "guard", "investigate"]), target: z.string() })),
});
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
  /** The plan's word count (TD asks for at most 150). */
  words?: number;
}

const SCHEMAS = { plan: PlanOutput, murder: MurderOutput, ballot: BallotOutput, runoff: RunoffOutput };

export function parseStrategy(kind: StrategyKind, raw: string, expect: StrategyExpectation): StrategyParseResult {
  const { json, fenced, error } = parseJson(raw);
  const failed = (errors: string[]): StrategyParseResult => ({ verdict: "syntax", fenced, aliasRepairs: 0, errors, illegal: [], value: null });
  if (error) return failed([error]);
  const shape = SCHEMAS[kind].safeParse(json);
  if (!shape.success) return failed(shape.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`));
  const value = shape.data as Record<string, unknown>;
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
  const words = kind === "plan" ? (value as z.infer<typeof PlanOutput>).plan.trim().split(/\s+/).length : undefined;
  return { verdict: "valid", fenced, aliasRepairs, errors: [], illegal, value, ...(words !== undefined && { words }) };
}
