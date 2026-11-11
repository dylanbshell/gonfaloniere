// What the code reads from the Models & Research doc (CC-20261111-01, #59; pin moved to v0.52 in CC-20261111-02). From v0.52 the repo copy
// leaves out the doc's private section (money details), so nothing in code may depend on it.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { config, docsFor } from "../probe.config.ts";
import { MINIGAME_TOTAL_USD } from "../src/minigame/ledger.ts";
import { loadDocs } from "../src/sources/docs.ts";

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : [join(dir, f)]));

test("the doc is read in one place: docsFor's path, loaded by loadDocs", () => {
  const readers = [...files("src"), "probe.config.ts"].filter((f) => /\.(ts|mts|js)$/.test(f) && readFileSync(f, "utf8").includes("Models_Research"));
  assert.deepEqual(readers, ["probe.config.ts"]);
  assert.match(docsFor("0.36").modelsResearch, /^docs\/Gonfaloniere_Models_Research_v[\d.]+\.md$/);
});

test("the pin is v0.52, and what loadDocs takes from it, the version and the secrets judge's rubric, is v0.38's (the pin before)", () => {
  assert.equal(docsFor("0.36").modelsResearch, "docs/Gonfaloniere_Models_Research_v0.52.md");
  const v52 = loadDocs(docsFor("0.36"));
  const v38 = loadDocs({ ...docsFor("0.36"), modelsResearch: "docs/Gonfaloniere_Models_Research_v0.38.md" });
  assert.equal(v52.versions.modelsResearch, "0.52");
  assert.ok(v52.judgeRubric.secrets.length > 0 && v52.judgeRubric.rules.length > 0);
  // Same rubric text, so the same fingerprint: verdicts judged on v0.38 still count as already judged.
  assert.deepEqual(v52.judgeRubric, v38.judgeRubric);
  // Nothing else in DocSources comes from it.
  assert.deepEqual({ ...v52, versions: { ...v52.versions, modelsResearch: "x" }, judgeRubric: null }, { ...v38, versions: { ...v38.versions, modelsResearch: "x" }, judgeRubric: null });
});

test("the spend caps are code, not doc text", () => {
  if (process.env.PROBE_TOTAL_USD) return;
  assert.equal(MINIGAME_TOTAL_USD, 45);
  assert.equal(config.budget.totalUsd, 70);
});
