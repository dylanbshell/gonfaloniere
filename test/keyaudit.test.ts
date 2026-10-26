// The key audit: a rise in (key usage − OpenRouter ledgers) above the baseline is spend no ledger
// recorded, and becomes an "unledgered" cost record once. Usage lag only lowers the gap.
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { keyCheck } from "../src/harness/keyaudit.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});
/** Stubs the key-info endpoint to report this usage. */
const keyReports = (usage: number) => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ data: { usage, limit: 150, limit_remaining: 150 - usage } }))) as typeof fetch;
};

test("the first check records the gap as the baseline, not as spend", async () => {
  keyReports(125.5);
  const out: Record<string, unknown>[] = [];
  const r = await keyCheck("k", (x) => out.push(x), "run", "start", { openRouter: () => 125.0, baseline: () => null });
  assert.equal(r.unledgered, 0);
  assert.deepEqual(out.map((x) => x.type), ["key-baseline"]);
  assert.ok(Math.abs((out[0]!.gap as number) - 0.5) < 1e-9);
  assert.ok(!("costUsd" in out[0]!));
});

test("a rise above the baseline is recorded once as unledgered", async () => {
  let ledger = 125.0;
  const baseline = () => 0.5;
  keyReports(126.6); // the key spent $1.10, the ledgers recorded $1.00
  ledger = 126.0;
  const out: Record<string, unknown>[] = [];
  const r = await keyCheck("k", (x) => out.push(x), "run", "end", { openRouter: () => ledger, baseline });
  assert.ok(Math.abs(r.unledgered - 0.1) < 1e-9);
  assert.deepEqual(out.map((x) => x.type), ["key-usage", "unledgered"]);
  // Next check: the unledgered record is now in the ledgers, so nothing more is recorded.
  ledger += r.unledgered;
  const again: Record<string, unknown>[] = [];
  const r2 = await keyCheck("k", (x) => again.push(x), "run2", "start", { openRouter: () => ledger, baseline });
  assert.equal(r2.unledgered, 0);
  assert.deepEqual(again.map((x) => x.type), ["key-usage"]);
});

test("usage lag lowers the gap and records nothing; once settled, fully ledgered spend still records nothing", async () => {
  const baseline = () => 0.5;
  // The run's $2.03 is in the ledger, but the key shows only $1.96 of it yet.
  keyReports(127.46);
  const out: Record<string, unknown>[] = [];
  const lagged = await keyCheck("k", (x) => out.push(x), "run", "end", { openRouter: () => 127.03, baseline });
  assert.equal(lagged.unledgered, 0);
  // Minutes later the key catches up: the gap is back at the baseline.
  keyReports(127.53);
  const settled = await keyCheck("k", (x) => out.push(x), "run2", "start", { openRouter: () => 127.03, baseline });
  assert.equal(settled.unledgered, 0);
  assert.ok(out.every((x) => x.type === "key-usage"));
});

test("the key can't be read: nothing is recorded or guessed", async () => {
  globalThis.fetch = (async () => new Response("no", { status: 500 })) as typeof fetch;
  const out: Record<string, unknown>[] = [];
  const r = await keyCheck("k", (x) => out.push(x), "run", "start", { openRouter: () => 1, baseline: () => 0 });
  assert.deepEqual([r.usage, r.unledgered, out.length], [null, 0, 0]);
});
