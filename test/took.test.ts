// TD v0.9, Output Validation & Repair, `took`: normalization and parsing.
import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeTook, parseThink } from "../src/output/think.ts";

test("took: case, article, and plural are normalized", () => {
  assert.deepEqual(normalizeTook("threat"), { took: "threat", unknown: false });
  assert.deepEqual(normalizeTook("Threat"), { took: "threat", unknown: false });
  assert.deepEqual(normalizeTook("a threat"), { took: "threat", unknown: false });
  assert.deepEqual(normalizeTook("An admission"), { took: "admission", unknown: false });
  assert.deepEqual(normalizeTook("the deal"), { took: "deal", unknown: false });
  assert.deepEqual(normalizeTook("Promises"), { took: "promise", unknown: false });
  assert.deepEqual(normalizeTook("denials."), { took: "denial", unknown: false });
  assert.deepEqual(normalizeTook("NONE"), { took: "none", unknown: false });
});

test("took: missing or unknown becomes none, flagged", () => {
  assert.deepEqual(normalizeTook(undefined), { took: "none", unknown: true });
  assert.deepEqual(normalizeTook(null), { took: "none", unknown: true });
  assert.deepEqual(normalizeTook("jest"), { took: "none", unknown: true });
  assert.deepEqual(normalizeTook("threat and promise"), { took: "none", unknown: true });
  assert.deepEqual(normalizeTook(3), { took: "none", unknown: true });
});

test("parseThink: took read when asked; missing or unknown is a repair, never a failure", () => {
  const expect = { conversation: "capannello" as const, livingOthers: [], format: "td0.3" as const, took: true };
  const ok = parseThink('{"thought": "He means it.", "took": "a threat", "importance": 70}', expect);
  assert.equal(ok.repaired.verdict, "valid");
  assert.equal(ok.repaired.value?.took, "threat");
  assert.equal(ok.repairs?.tookFilled, false);
  for (const raw of ['{"thought": "Hm.", "importance": 10}', '{"thought": "Hm.", "took": "sarcasm", "importance": 10}']) {
    const r = parseThink(raw, expect);
    assert.equal(r.repaired.verdict, "valid", raw);
    assert.equal(r.repaired.value?.took, "none");
    assert.equal(r.repairs?.tookFilled, true);
  }
});

test("parseThink: an older TD's think() (no took asked) is unchanged", () => {
  const r = parseThink('{"thought": "Hm.", "importance": 10}', { conversation: "capannello", livingOthers: [], format: "td0.3" });
  assert.equal(r.repaired.verdict, "valid");
  assert.equal(r.repaired.value?.took, undefined);
  assert.equal(r.repairs?.tookFilled, undefined);
});
