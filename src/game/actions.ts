// Which /bribe, /borrow, /repay actions a character may take right now
// (mechanics v0.18, Commands & Public Actions; TD v0.2, Block 9b), as the
// lines shown in speak()'s {allowed_actions} and the checks applied to replies.

import { say } from "../setting/pack.ts";
import { mayTakePension, type Faction } from "./roster.ts";

export interface ActionContext {
  faction: Faction;
  florins: number;
  pensionSize: number;
  /** Florins left in the Embassy treasury. */
  treasury: number;
  /** In a Colloquio, the other person; null in a Capannello. */
  colloquioWith: string | null;
}

export type ActionType = "bribe" | "borrow" | "repay";

export function allowedActionTypes(a: ActionContext): ActionType[] {
  const types: ActionType[] = [];
  // /bribe: Colloquio only, and only with Florins to give.
  if (a.colloquioWith && a.florins > 0) types.push("bribe");
  // /borrow: factions that may take a pension (Medici and Pazzi), while the treasury holds one.
  if (mayTakePension(a.faction) && a.treasury >= a.pensionSize) types.push("borrow");
  // /repay: anyone who can pay a whole pension back.
  if (a.florins >= a.pensionSize) types.push("repay");
  return types;
}

/** The {allowed_actions} text, worded as in TD's Block 9b notes; the words are the setting pack's (actions.json). */
export function allowedActionsText(a: ActionContext): string {
  const lines = allowedActionTypes(a).map((t) => {
    switch (t) {
      case "bribe":
        return say("actions", "bribe", { other: a.colloquioWith!, purse: a.florins });
      case "borrow":
        return say("actions", "borrow", { amount: a.pensionSize });
      case "repay":
        return say("actions", "repay");
    }
  });
  return lines.length ? lines.join("\n") : say("actions", "none");
}
