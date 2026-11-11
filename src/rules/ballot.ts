// The ballot's and run-off's legality checks (Mechanics: The Election), moved from
// src/output/strategy.ts (CC-20261111-07, #71). The full game's election (candidate selection, the
// count, vote buying's cost, the run-off and the lot) isn't built yet; it belongs to the full game loop.

export type BallotProblem = { why: "vote not living"; vote: string } | { why: "buy out of range"; buy: number; max: number | undefined };

/** A vote for oneself or a living guest, and 0 to `maxBuy` votes bought (none when it isn't given). */
export function ballotProblems(vote: string, voteValid: boolean, buy: number, maxBuy: number | undefined): BallotProblem[] {
  const out: BallotProblem[] = [];
  if (!voteValid) out.push({ why: "vote not living", vote });
  if (buy < 0 || buy > (maxBuy ?? 0)) out.push({ why: "buy out of range", buy, max: maxBuy });
  return out;
}

/** A run-off vote must name one of the tied guests. */
export const runoffProblem = (vote: string, valid: boolean): { why: "not tied"; vote: string } | null => (valid ? null : { why: "not tied", vote });
