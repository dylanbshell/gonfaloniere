// Purses, pensions, and the Embassy treasury (Mechanics: Florin Economy; Commands & Public Actions),
// as pure rules over a state object. Applying an action changes the state and returns a structured
// event; the game turns events into lines through the setting pack. Moved from the mini-game engine
// and src/game/actions.ts (CC-20261111-07, #71).

import type { Guest, PensionRole, RulesConfig } from "./config.ts";

export interface Economy {
  /** Each guest's Florins, in cast order. */
  purse: Map<string, number>;
  /** Pensions each guest holds. */
  pensions: Map<string, number>;
  /** Florins left in the Embassy treasury. */
  treasury: number;
  /** The Embassy's ledger: pensions by holder, in the order first taken. */
  ledger: Map<string, number>;
  guests: Map<string, Guest>;
}

/** The evening's start: starting Florins plus `rounds` rounds' income each, no pensions, the full treasury. */
export function newEconomy(guests: Guest[], c: Pick<RulesConfig, "startingFlorins" | "income" | "treasury">, rounds = 1): Economy {
  return {
    purse: new Map(guests.map((g) => [g.name, c.startingFlorins + c.income * rounds])),
    pensions: new Map(guests.map((g) => [g.name, 0])),
    treasury: c.treasury,
    ledger: new Map(),
    guests: new Map(guests.map((g) => [g.name, g])),
  };
}

/** Mechanics: whoever keeps the treasury sees the whole ledger and the balance. */
export const seesLedger = (role: PensionRole): boolean => role === "keeps the treasury";

export type ActionType = "bribe" | "borrow" | "repay";

export interface ActionContext {
  pension: PensionRole;
  florins: number;
  pensionSize: number;
  treasury: number;
  /** In a Colloquio, the other person; null in a Capannello. */
  colloquioWith: string | null;
}

/** Which of /bribe, /borrow, /repay a guest may use right now. */
export function allowedActionTypes(a: ActionContext): ActionType[] {
  const types: ActionType[] = [];
  // /bribe: Colloquio only, and only with Florins to give.
  if (a.colloquioWith && a.florins > 0) types.push("bribe");
  // /borrow: those who may take a pension, while the treasury holds one.
  if (a.pension === "may take" && a.treasury >= a.pensionSize) types.push("borrow");
  // /repay: anyone who can pay a whole pension back.
  if (a.florins >= a.pensionSize) types.push("repay");
  return types;
}

export type ActionRejection = { why: "not allowed"; type: ActionType } | { why: "not positive"; amount: number } | { why: "exceeds purse"; amount: number; purse: number };

/** Why the Stage Manager would reject an action a guest chose, or null. */
export function rejectAction(a: { type: ActionType; amount?: number }, allowed: ActionType[], florins: number): ActionRejection | null {
  if (!allowed.includes(a.type)) return { why: "not allowed", type: a.type };
  if (a.type === "bribe" && a.amount! <= 0) return { why: "not positive", amount: a.amount! };
  if (a.type === "bribe" && a.amount! > florins) return { why: "exceeds purse", amount: a.amount!, purse: florins };
  return null;
}

export type EconomyEvent =
  | { type: "payment"; from: string; to: string; amount: number }
  | { type: "pension taken"; holder: string; amount: number; purse: number }
  | { type: "pension renounced"; by: string; holder: string; amount: number }
  | { type: "pension refused"; by: string; holder: string };

const add = (m: Map<string, number>, k: string, n: number) => m.set(k, (m.get(k) ?? 0) + n);

/** /bribe: a plain transfer, in a Colloquio (the caller checks the amount with rejectAction). */
export function bribe(e: Economy, from: string, to: string, amount: number): EconomyEvent {
  add(e.purse, from, -amount);
  add(e.purse, to, amount);
  return { type: "payment", from, to, amount };
}

/** /borrow: one pension from the treasury into the purse, on the ledger. */
export function borrow(e: Economy, holder: string, size: number): EconomyEvent {
  add(e.purse, holder, size);
  add(e.pensions, holder, 1);
  e.treasury -= size;
  add(e.ledger, holder, 1);
  return { type: "pension taken", holder, amount: size, purse: e.purse.get(holder)! };
}

/**
 * /repay: renounce one pension, the guest's own or a faction member's, with a whole pension's Florins.
 * Refused if the holder has none on the ledger, isn't family, or the purse is short.
 */
export function repay(e: Economy, by: string, holder: string, size: number): EconomyEvent {
  const family = holder === by || e.guests.get(holder)?.faction === e.guests.get(by)?.faction;
  if (!((e.ledger.get(holder) ?? 0) > 0 && family && e.purse.get(by)! >= size)) return { type: "pension refused", by, holder };
  add(e.purse, by, -size);
  e.treasury += size;
  e.ledger.set(holder, e.ledger.get(holder)! - 1);
  if (e.pensions.has(holder)) add(e.pensions, holder, -1);
  return { type: "pension renounced", by, holder, amount: size };
}
