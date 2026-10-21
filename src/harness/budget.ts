// Hard spending cap. Every call reserves its worst-case cost before it is
// sent; a call that could push spending past either cap is never sent.

export class Budget {
  private reserved = 0;
  private spentThisRun = 0;

  constructor(
    readonly runCapUsd: number,
    readonly totalCapUsd: number,
    /** Spent by earlier runs, from the logs in results/. */
    readonly priorSpendUsd: number,
  ) {}

  tryReserve(worstCaseUsd: number): boolean {
    const committed = this.spentThisRun + this.reserved + worstCaseUsd;
    if (committed > this.runCapUsd) return false;
    if (this.priorSpendUsd + committed > this.totalCapUsd) return false;
    this.reserved += worstCaseUsd;
    return true;
  }

  settle(worstCaseUsd: number, actualUsd: number): void {
    this.reserved -= worstCaseUsd;
    this.spentThisRun += actualUsd;
  }

  get spentUsd(): number {
    return this.spentThisRun;
  }
}

/**
 * Upper bound on a call's cost. Input is estimated at 3 characters per token
 * (English runs closer to 4), output at the full max_tokens.
 */
export function worstCaseCost(
  promptChars: number,
  maxTokens: number,
  price: { input: number; output: number },
): number {
  return Math.ceil(promptChars / 3) * price.input + maxTokens * price.output;
}
