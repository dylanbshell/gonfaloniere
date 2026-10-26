// Key audit: every run that spends through the OpenRouter key records the key's own usage before
// and after, and writes whatever the key spent that no ledger recorded as an "unledgered" cost
// record, so the ledgers track the key. Spend that escapes the per-call records: a billed attempt
// that callModel retried (a client timeout, status null, after the provider finished), a billed
// reply whose caller wrote no record (an unparseable judge reply), or any call outside the harness
// while the run was going. The key itself is never logged or printed.

import { existsSync } from "node:fs";
import { JUDGE_DIR, RunLog, priorSpend, type LogRecord } from "./log.ts";

/** Every ledger the caps read: probe and judging, pilot, and mini-game. */
export const LEDGER_DIRS = ["results", "results/pilot", "results/minigame"];

/** Total recorded across all ledgers (and a separate judge ledger, if PROBE_JUDGE_DIR points at one). */
export function ledgerTotal(): number {
  const dirs = new Set([...LEDGER_DIRS, JUDGE_DIR]);
  return [...dirs].filter((d) => existsSync(d)).reduce((sum, d) => sum + priorSpend(d), 0);
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

export interface KeyAudit {
  usage: number | null;
  ledger: number;
  at: string;
}

export async function keyAuditStart(key: string, ledger: () => number = ledgerTotal): Promise<KeyAudit> {
  return { usage: (await keyInfo(key))?.usage ?? null, ledger: ledger(), at: new Date().toISOString() };
}

/**
 * Reads the key again (after a short wait, since usage lags the last calls by a few seconds) and
 * writes a "key-usage" record; if the key spent more than every ledger recorded since the start,
 * also an "unledgered" record carrying that difference as its cost. The ledger side counts all
 * ledgers, so another harness run in the same window isn't mistaken for unledgered spend.
 */
export async function keyAuditEnd(
  start: KeyAudit,
  key: string,
  write: (record: Record<string, unknown>) => void,
  runId: string,
  settleMs = 8000,
  ledger: () => number = ledgerTotal,
): Promise<{ keyDelta: number | null; ledgerDelta: number; unledgered: number }> {
  // Nothing spent (an estimate, a report, a dry run): no record, and no wait.
  const now = (await keyInfo(key))?.usage ?? null;
  if (now === start.usage && ledger() === start.ledger) return { keyDelta: 0, ledgerDelta: 0, unledgered: 0 };
  await new Promise((r) => setTimeout(r, settleMs));
  const after = (await keyInfo(key))?.usage ?? null;
  const ledgerDelta = ledger() - start.ledger;
  const keyDelta = start.usage !== null && after !== null ? after - start.usage : null;
  const unledgered = keyDelta !== null ? Math.max(0, keyDelta - ledgerDelta) : 0;
  const at = new Date().toISOString();
  write({ type: "key-usage", runId, before: start.usage, after, keyDelta, ledgerDelta, at });
  // A few tenths of a cent is rounding in the key's usage; anything above a cent is recorded.
  if (unledgered >= 0.01) write({ type: "unledgered", runId, costUsd: Number(unledgered.toFixed(6)), keyDelta, ledgerDelta, since: start.at, at });
  return { keyDelta, ledgerDelta, unledgered };
}

/**
 * Runs an entry point's main() inside a key audit (OPENROUTER_API_KEY only; other keys aren't
 * audited). The records go to `key-audit-….jsonl` in that entry point's ledger directory, where
 * the caps' totals read them; a run that spent nothing writes none.
 */
export async function audited(main: () => Promise<void>, dir: string, label: string): Promise<void> {
  const key = process.env.OPENROUTER_API_KEY;
  const start = key ? await keyAuditStart(key) : null;
  try {
    await main();
  } finally {
    if (key && start) {
      const runId = `${start.at.replace(/[:.]/g, "-")}-${label}`;
      let log: RunLog | null = null;
      const write = (r: Record<string, unknown>) => (log ??= new RunLog(runId, "key-audit-", dir)).write(r as unknown as LogRecord);
      const r = await keyAuditEnd(start, key, write, runId);
      if (r.keyDelta !== null && (r.keyDelta > 0 || r.ledgerDelta > 0)) {
        console.log(`Key audit: the key spent $${r.keyDelta.toFixed(4)}, the ledgers recorded $${r.ledgerDelta.toFixed(4)}${r.unledgered >= 0.01 ? `; $${r.unledgered.toFixed(4)} recorded as unledgered` : ""}.`);
      }
    }
  }
}
