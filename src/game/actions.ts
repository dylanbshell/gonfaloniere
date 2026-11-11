// Which /bribe, /borrow, /repay actions a character may take right now
// (mechanics v0.18, Commands & Public Actions; TD v0.2, Block 9b), as the
// lines shown in speak()'s {allowed_actions}. The rule itself is src/rules/economy.ts
// (CC-20261111-07, #71); this maps a faction to its pension role and words the result.

import { say } from "../setting/pack.ts";
import { allowedActionTypes as allowed, type ActionType } from "../rules/economy.ts";
import { pensionRoleOf, type Faction } from "./roster.ts";

export type { ActionType };

export interface ActionContext {
  faction: Faction;
  florins: number;
  pensionSize: number;
  /** Florins left in the Embassy treasury. */
  treasury: number;
  /** In a Colloquio, the other person; null in a Capannello. */
  colloquioWith: string | null;
}

export function allowedActionTypes(a: ActionContext): ActionType[] {
  return allowed({ pension: pensionRoleOf(a.faction), florins: a.florins, pensionSize: a.pensionSize, treasury: a.treasury, colloquioWith: a.colloquioWith });
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
