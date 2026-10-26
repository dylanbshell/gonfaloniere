// The key audit: spend the key saw that no ledger recorded becomes an "unledgered" cost record.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { keyAuditEnd, keyAuditStart } from "../src/harness/keyaudit.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});
/** Stubs the key-info endpoint to report these usages in turn (the last one repeats). */
function keyReports(...usages: number[]) {
  let i = 0;
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: { usage: usages[Math.min(i++, usages.length - 1)], limit: 150, limit_remaining: 150 - usages[0]! } }))) as typeof fetch;
}

test("spend the ledgers didn't record is written as an unledgered cost", async () => {
  keyReports(100, 100.5, 100.5);
  let ledger = 30;
  const start = await keyAuditStart("k", () => ledger);
  ledger = 30.4; // the run recorded $0.40 of the $0.50 the key spent
  const out: Record<string, unknown>[] = [];
  const r = await keyAuditEnd(start, "k", (x) => out.push(x), "run", 0, () => ledger);
  assert.ok(Math.abs(r.unledgered - 0.1) < 1e-9);
  assert.deepEqual(out.map((x) => x.type), ["key-usage", "unledgered"]);
  assert.ok(Math.abs((out[1]!.costUsd as number) - 0.1) < 1e-9);
});

test("fully ledgered spend, or another run's ledgered spend in the window, writes no unledgered record", async () => {
  keyReports(100, 100.5, 100.5);
  let ledger = 30;
  const start = await keyAuditStart("k", () => ledger);
  ledger = 30.5; // this run $0.30 + another harness run $0.20, both ledgered
  const out: Record<string, unknown>[] = [];
  const r = await keyAuditEnd(start, "k", (x) => out.push(x), "run", 0, () => ledger);
  assert.equal(r.unledgered, 0);
  assert.deepEqual(out.map((x) => x.type), ["key-usage"]);
});

test("nothing spent (an estimate or a report): no record at all", async () => {
  keyReports(100);
  const start = await keyAuditStart("k", () => 30);
  const out: Record<string, unknown>[] = [];
  await keyAuditEnd(start, "k", (x) => out.push(x), "run", 0, () => 30);
  assert.equal(out.length, 0);
});

test("the key can't be read: usage is recorded as unknown and nothing is guessed", async () => {
  globalThis.fetch = (async () => new Response("no", { status: 500 })) as typeof fetch;
  let ledger = 30;
  const start = await keyAuditStart("k", () => ledger);
  ledger = 30.2;
  const out: Record<string, unknown>[] = [];
  const r = await keyAuditEnd(start, "k", (x) => out.push(x), "run", 0, () => ledger);
  assert.equal(r.keyDelta, null);
  assert.deepEqual(out.map((x) => [x.type, x.keyDelta]), [["key-usage", null]]);
});
