// Key audit: every run that spends through the OpenRouter key checks the key's own usage against
// the ledgers, and writes any spend the key saw that no ledger recorded as an "unledgered" cost
// record, so the ledgers track the key. Spend that escapes the per-call records: a billed attempt
// that callModel retried (a client timeout, status null, after the provider finished), a billed
// reply whose caller wrote no record, or any call outside the harness. The key itself is never
// logged or printed.
//
// The key's usage lags the calls by minutes (Oct 26: a run's last ~$0.07 showed up more than five
// minutes after it ended), so a before/after window misreads it. The audit works on the cumulative
// gap instead: key usage minus everything the ledgers recorded through OpenRouter. Lag can only
// lower that gap, never raise it, so a rise above the baseline is spend no ledger has, and it is
// recorded once; later checks see it in the ledgers and don't record it again.

import { existsSync } from "node:fs";
import { basename } from "node:path";
import { JUDGE_DIR, RunLog, readRecords, runLogFiles, type LogRecord } from "./log.ts";

/** Every ledger the caps read: probe and judging, pilot, and mini-game. */
export const LEDGER_DIRS = ["results", "results/pilot", "results/minigame"];

const ledgerDirs = () => [...new Set([...LEDGER_DIRS, JUDGE_DIR])].filter((d) => existsSync(d));

/** Total recorded across all ledgers (and a separate judge ledger, if PROBE_JUDGE_DIR points at one). */
export function ledgerTotal(): number {
  return ledgerRecords().reduce((sum, r) => sum + r.costUsd, 0);
}

/** What the ledgers recorded through OpenRouter: everything but Tinker (training, and checkpoints sampled on Tinker). */
export function openRouterTotal(): number {
  return ledgerRecords()
    .filter((r) => !r.tinker)
    .reduce((sum, r) => sum + r.costUsd, 0);
}

function ledgerRecords(): { costUsd: number; tinker: boolean }[] {
  return ledgerDirs().flatMap((d) =>
    runLogFiles(d).flatMap((f) =>
      readRecords([f])
        .map((r) => r as unknown as Record<string, unknown>)
        .filter((r) => "costUsd" in r)
        .map((r) => ({ costUsd: Number(r.costUsd) || 0, tinker: r.provider === "Tinker" || basename(f).startsWith("tinker-") })),
    ),
  );
}

/** The key's lifetime usage and limit, from OpenRouter's key-info endpoint; null if it can't be read. */
export async function keyInfo(key: string): Promise<{ usage: number; limit: number | null; remaining: number | null } | null> {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) return null;
    const d = ((await res.json()) as { data?: { usage?: number; limit?: number | null; limit_remaining?: number | null } }).data;
    return typeof d?.usage === "number" ? { usage: d.usage, limit: d.limit ?? null, remaining: d.limit_remaining ?? null } : null;
  } catch {
    return null;
  }
}

/** The gap the audit started from (key usage minus OpenRouter ledgers, at its first check); null before that. */
export function keyBaseline(): number | null {
  const found = ledgerDirs()
    .flatMap((d) => readRecords(runLogFiles(d).filter((f) => basename(f).startsWith("key-audit-"))))
    .map((r) => r as unknown as { type: string; gap?: number })
    .filter((r) => r.type === "key-baseline" && typeof r.gap === "number");
  return found.length ? found[0]!.gap! : null;
}

export interface KeyCheck {
  usage: number | null;
  /** Key usage minus the OpenRouter ledgers, before anything this check records. */
  gap: number | null;
  /** Unledgered spend recorded by this check. */
  unledgered: number;
}

/**
 * Compares the key with the ledgers and records any rise in the gap above the baseline as an
 * "unledgered" cost record (or, on the very first check, records the gap as the baseline).
 */
export async function keyCheck(
  key: string,
  write: (record: Record<string, unknown>) => void,
  runId: string,
  phase: "start" | "end",
  ledgers: { openRouter: () => number; baseline: () => number | null } = { openRouter: openRouterTotal, baseline: keyBaseline },
): Promise<KeyCheck> {
  const usage = (await keyInfo(key))?.usage ?? null;
  if (usage === null) return { usage, gap: null, unledgered: 0 };
  const gap = usage - ledgers.openRouter();
  const at = new Date().toISOString();
  const baseline = ledgers.baseline();
  if (baseline === null) {
    write({ type: "key-baseline", runId, gap, usage, at });
    return { usage, gap, unledgered: 0 };
  }
  // A few tenths of a cent is rounding in the key's usage; anything above a cent is recorded.
  const unledgered = gap - baseline >= 0.01 ? gap - baseline : 0;
  write({ type: "key-usage", runId, phase, usage, gap, baseline, at });
  if (unledgered) write({ type: "unledgered", runId, costUsd: Number(unledgered.toFixed(6)), usage, gap, baseline, at });
  return { usage, gap, unledgered };
}

/**
 * Runs an entry point's main() between two key checks (OPENROUTER_API_KEY only; other keys aren't
 * audited). The records go to `key-audit-….jsonl` in that entry point's ledger directory, where the
 * caps' totals read them.
 */
export async function audited(main: () => Promise<void>, dir: string, label: string): Promise<void> {
  const key = process.env.OPENROUTER_API_KEY;
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-${label}`;
  let log: RunLog | null = null;
  const write = (r: Record<string, unknown>) => (log ??= new RunLog(runId, "key-audit-", dir)).write(r as unknown as LogRecord);
  const report = (c: KeyCheck, when: string) => {
    if (c.unledgered) console.log(`Key audit (${when}): $${c.unledgered.toFixed(4)} the key spent that no ledger had, now recorded as unledgered.`);
  };
  if (key) report(await keyCheck(key, write, runId, "start"), "start");
  try {
    await main();
  } finally {
    // Usage lags by minutes, so the end check mostly sees earlier runs' spend; this run's settles at a later check.
    if (key) report(await keyCheck(key, write, runId, "end"), "end");
  }
}
