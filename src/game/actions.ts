// Which /bribe, /borrow, /repay actions a character may take right now
// (mechanics v0.18, Commands & Public Actions; TD v0.2, Block 9b), as the
// lines shown in speak()'s {allowed_actions} and the checks applied to replies.

import type { Faction } from "./roster.ts";

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
  // /borrow: Medici and Pazzi only, while the treasury holds a pension.
  if ((a.faction === "Medici" || a.faction === "Pazzi") && a.treasury >= a.pensionSize) types.push("borrow");
  // /repay: anyone who can pay a whole pension back.
  if (a.florins >= a.pensionSize) types.push("repay");
  return types;
}

/** The {allowed_actions} text, worded as in TD's Block 9b notes. */
export function allowedActionsText(a: ActionContext): string {
  const lines = allowedActionTypes(a).map((t) => {
    switch (t) {
      case "bribe":
        return `{"type": "bribe", "amount": N} — hand ${a.colloquioWith} N Florins (you have ${a.florins})`;
      case "borrow":
        return `{"type": "borrow"} — accept one French pension of ${a.pensionSize} Florins`;
      case "repay":
        return `{"type": "repay", "for": "Name"} — renounce one French pension held by yourself or a relative who has told you of it`;
    }
  });
  return lines.length ? lines.join("\n") : "None available right now. Set action to null.";
}
