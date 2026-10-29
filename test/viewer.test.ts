// The replay viewer (tools/viewer/viewer.html) and its export (src/minigame/view.ts), CC-20261028-08.
// The loader under test is the one inside the viewer, run as the export runs it. It must read every
// saved mini-game record, old and new, and an export must hold no model calls, seeds, provider
// details, or anything key-shaped.

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import type { MiniGame } from "../src/minigame/engine.ts";
import { exportView, keyFindings, readRecord, viewerLoader, viewHtml } from "../src/minigame/view.ts";
import { playFake } from "./fixtures/fake-game.ts";

const loader = viewerLoader();

type Loaded = ReturnType<typeof loader.load> & {
  lines: Map<string, unknown>;
  steps: { kind: string; line?: string; event?: number }[];
  states: { loc: Record<string, string | null> }[];
  events: { type: string; character?: string; to?: string | null }[];
  eventStep: number[];
  notebooks: Map<string, { step: number; text: string }[]>;
};

/** A full record shaped as the runner writes it, from the fake game (seat calls included on TD v0.25). */
function fakeRecord(game: MiniGame) {
  return {
    schema_version: 1,
    variant: "full",
    complete: true,
    failure: null,
    header: {
      game_id: "fake-g1",
      seed: 2000,
      cast: [...new Set(game.lines.flatMap((l) => l.heardBy))],
      docs: { technicalDesign: "0.25" },
      config: { model: "fake/model", provider: "FakeProvider", quantization: "fp8", served_model: "fake/model-1", seed: 2000, turns: 6, recorder: { model: "fake/model", endpoint: "OpenRouter", provider: "FakeProvider", quantization: "fp8", served_model: "fake/model-1" } },
    },
    prefixes: game.prefixes,
    events: game.events,
    lines: game.lines,
    thoughts: game.thoughts,
    calls: game.calls,
    memory: { entries: game.memory.entries, beliefs: game.memory.beliefs, readings: game.memory.readings },
    snapshots: game.snapshots,
    murder_round: { resolved: false, acts: game.murderActs },
    knowledge_checks: game.knowledgeChecks,
    summary: {},
  };
}

const fake = await playFake();
const fakeFull = fakeRecord(fake.game);

function savedRecords(): string[] {
  const dir = "results/minigame";
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".full.json.gz")).map((f) => join(dir, f)) : [];
}
function publishedViews(): string[] {
  const dir = "results/published/minigame";
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".view.html")).map((f) => join(dir, f)) : [];
}
function embedded(html: string): unknown {
  const m = html.match(/<script type="application\/json" id="embedded-record">([\s\S]*?)<\/script>/);
  assert.ok(m && m[1]!.trim(), "an embedded record");
  return JSON.parse(m[1]!);
}

/** What any loaded record must satisfy. */
function checkLoaded(m: Loaded, label: string) {
  assert.ok(m.steps.length > 0, `${label}: steps`);
  const lineSteps = m.steps.filter((s) => s.kind === "line").map((s) => s.line);
  assert.equal(new Set(lineSteps).size, lineSteps.length, `${label}: each line appears once`);
  assert.equal(lineSteps.length, m.lines.size, `${label}: every line appears`);
  assert.equal(m.states.length, m.steps.length, `${label}: a room state per step`);
  for (let i = 1; i < m.eventStep.length; i++) assert.ok(m.eventStep[i]! >= m.eventStep[i - 1]!, `${label}: events stay in order`);
  // A seat that names its group puts the guest there at that moment.
  m.events.forEach((e, i) => {
    if (e.type === "seat" && e.to) assert.equal(m.states[m.eventStep[i]!]!.loc[e.character!], e.to, `${label}: seat event ${i}`);
  });
}

test("the loader reads every saved mini-game record without errors (full records and published views)", (t) => {
  const records = savedRecords();
  const views = publishedViews();
  if (!records.length && !views.length) t.diagnostic("no saved records here (results/ is gitignored); the fake record below still runs");
  for (const p of records) {
    let m: Loaded;
    assert.doesNotThrow(() => { m = loader.load(readRecord(p)) as Loaded; }, p);
    checkLoaded(m!, p);
  }
  for (const p of views) checkLoaded(loader.load(embedded(readFileSync(p, "utf8"))) as Loaded, p);
  t.diagnostic(`${records.length} saved records, ${views.length} published views`);
});

test("the loader reads the fake game: seat events place guests, and block 6 is kept per character", () => {
  const m = loader.load(fakeFull) as Loaded;
  checkLoaded(m, "fake");
  assert.ok(m.events.some((e) => e.type === "seat"), "the fake game has seat calls");
  assert.ok(m.notebooks.size >= 5, "notebooks for the cast");
  for (const [, views] of m.notebooks) for (let i = 1; i < views.length; i++) assert.notEqual(views[i]!.text, views[i - 1]!.text, "only changes are kept");
  // (Arrays from the loader live in its own context, so they are copied before comparing.)
  assert.deepEqual([...m.missing.filter((x) => !/post-game|readings|knowledge|Murder/.test(x))], []);
});

test("rooms from a record before aa6e187: an opening group rewritten by later seating doesn't move a guest the opening lines placed", () => {
  const rec = structuredClone(fakeFull) as unknown as { events: { type: string; groups?: string[][]; line?: string }[]; lines: { id: string; turn: number; conversation: string }[] };
  const cap = rec.events.find((e) => e.type === "capannelli")!;
  const [first, second] = cap.groups!;
  // The bug's shape: a guest of the first group also shows in the second, which is read last.
  const guest = first![0]!;
  second!.push(guest);
  // So that the next line shown is the second group's, drop the first group's lines before it.
  const firstC2 = rec.lines.find((l) => l.turn > 0 && l.conversation === "C2")!;
  const dropped = new Set(rec.lines.filter((l) => l.turn > 0 && l.conversation === "C1" && Number(l.id.slice(1)) < Number(firstC2.id.slice(1))).map((l) => l.id));
  assert.ok(dropped.size > 0);
  rec.lines = rec.lines.filter((l) => !dropped.has(l.id));
  rec.events = rec.events.filter((e) => !(e.line && dropped.has(e.line)));
  const m = loader.load(rec) as Loaded;
  checkLoaded(m, "rewritten opening");
  const at = m.steps.findIndex((s) => s.line === firstC2.id);
  assert.equal(m.states[at]!.loc[guest], "C1", `${guest} stays where the opening lines put them`);
});

test("the replay variant has no model calls, prefixes, seeds, or provider details, and keeps the inner life", () => {
  const r = loader.toReplay(fakeFull) as Record<string, any>;
  assert.equal(r.variant, "replay");
  for (const k of ["calls", "prefixes"]) assert.ok(!(k in r), k);
  assert.ok(!("seed" in r.header) && !("seed" in r.header.config));
  for (const k of ["provider", "quantization", "served_model"]) assert.ok(!(k in r.header.config), k);
  for (const k of ["provider", "endpoint", "quantization", "served_model"]) assert.ok(!(k in r.header.config.recorder), `recorder ${k}`);
  assert.ok(!JSON.stringify(r).includes("FakeProvider"));
  assert.equal(r.thoughts.length, fakeFull.thoughts.length);
  assert.equal(r.events.length, fakeFull.events.length);
  assert.ok(r.notebook_views.length > 0);
  assert.ok(!JSON.stringify(r).includes("TASK: THINK"), "no prompt text beyond block 6");
});

test("an export embeds one replay record, contains no key-shaped strings, and refuses one that would", () => {
  const dir = mkdtempSync(join(tmpdir(), "view-"));
  const rec = join(dir, "game-fake-g1.full.json.gz");
  writeFileSync(rec, gzipSync(JSON.stringify(fakeFull)));
  writeFileSync(join(dir, "game-fake-g1.checks.json"), JSON.stringify({ recordParses: true, everyoneSpoke: true }));
  const out = exportView(rec, dir);
  const html = readFileSync(out.path, "utf8");
  assert.deepEqual(keyFindings(html, {}), []);
  const r = embedded(html) as Record<string, any>;
  assert.equal(r.variant, "replay");
  assert.deepEqual(r.post_game_checks, { recordParses: true, everyoneSpoke: true });
  // The embedded text can't close its script early.
  assert.equal(html.split("</script>").length, readFileSync("tools/viewer/viewer.html", "utf8").split("</script>").length);
  for (const p of publishedViews()) assert.deepEqual(keyFindings(readFileSync(p, "utf8"), {}), [], p);

  // A planted key in a line, or an environment secret's value, stops the export.
  const planted = structuredClone(fakeFull);
  planted.lines[3]!.text += " sk-or-v1-" + "0123456789abcdef".repeat(4);
  writeFileSync(rec, gzipSync(JSON.stringify(planted)));
  assert.throws(() => exportView(rec, dir), /OpenRouter key/);
  assert.deepEqual(keyFindings("the cellar at midnight", { SOME_API_KEY: "the cellar" }), ["the value of SOME_API_KEY"]);
  assert.ok(keyFindings("token Ab3dEf6hIj9kLm2nOp5qRs8tUv1wXy4z here").includes("key-shaped token"));
  assert.deepEqual(keyFindings("2026-10-28T23-46-26-090Z-minigame-g1 Gonfaloniere_Technical_Design_v0.25 " + "a".repeat(64)), []);
  assert.throws(() => viewHtml({}, "<html></html>"), /embedded-record/);
});
