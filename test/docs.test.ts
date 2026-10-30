// The doc loader on TD v0.9 (and v0.8 from git history).
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { gunzipSync } from "node:zlib";
import { config, technicalDesignPath } from "../probe.config.ts";
import { thinkAsksTook } from "../src/prompt/assemble.ts";
import { loadDocs, memoryDefinitions } from "../src/sources/docs.ts";

test("TD v0.9: 9a asks for took; no perception pass; 10a–10d and the seven definitions load", () => {
  const d = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.9") });
  assert.equal(d.versions.technicalDesign, "0.9");
  assert.ok(thinkAsksTook(d.templates));
  assert.match(d.templates.think, /\n2\. took — how you take the last thing said aloud, in one word: promise, deal, threat, admission, claim, denial, or none\./);
  assert.equal(d.systemPrompts?.perceptionPass, undefined);
  assert.ok(d.systemPrompts?.starPass && d.systemPrompts.claimsPass && d.systemPrompts.thoughtPass && d.systemPrompts.knowledgeCheck);
  assert.equal(memoryDefinitions(d).length, 7);
});

test("TD v0.8 still loads (from git history): perception pass present, no took", () => {
  const d = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.8") });
  assert.equal(d.versions.technicalDesign, "0.8");
  assert.ok(d.systemPrompts?.perceptionPass);
  assert.ok(!thinkAsksTook(d.templates));
});

test("saved v0.8 replay records still parse (skipped when results/ has none)", (t) => {
  const dir = "results/minigame/";
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith("-td0.8.full.json.gz")) : [];
  if (!files.length) return t.skip("no v0.8 replays in results/");
  for (const f of files.slice(0, 3)) {
    const rec = JSON.parse(gunzipSync(readFileSync(dir + f)).toString());
    assert.ok(Array.isArray(rec.memory.readings) && rec.memory.readings.length > 0, f);
    assert.ok("reaction" in rec.memory.readings[0], "v0.8 readings keep their 10e shape");
  }
});
