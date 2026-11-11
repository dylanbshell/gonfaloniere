// What the rules are given (TD v0.39, Layers): Mechanics' Tunable Values as a config object, loaded by
// the caller, and each guest's faction and roles from the setting. The rules read no file and hold no
// names: a faction is an opaque id, compared only for equality.

/** Mechanics' pension roles: may take a French pension, keeps the treasury (and sees its ledger), or neither. */
export type PensionRole = "may take" | "keeps the treasury" | "can't take";

export interface Guest {
  name: string;
  /** Compared for equality only (a relative's pension, seating's faction tie-break). */
  faction: string;
  pension: PensionRole;
  /** Mechanics' special roles, e.g. "two kills" (the Murder Round's two Kill orders). */
  roles: readonly string[];
}

/** Mechanics' Tunable Values the rules use, plus the table size the run sets. */
export interface RulesConfig {
  startingFlorins: number;
  /** Per-round income. */
  income: number;
  pensionSize: number;
  /** The Embassy treasury at the start. */
  treasury: number;
  colloquioCap: number;
  /** A Capannello's most guests. */
  maxCapannello: number;
}

/** Midnight's tunable: guards or investigations needed to block (Mechanics, "2 or more"). */
export interface MidnightConfig {
  blockAt: number;
}
