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
import { ROSTER } from "../src/game/roster.ts";
import type { MiniGame } from "../src/minigame/engine.ts";
import { pngSize } from "../src/minigame/preview.ts";
import { exportView, keyFindings, readRecord, siteContent, siteHeadTags, siteMeta, siteUrl, viewerLoader, viewHtml } from "../src/minigame/view.ts";
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
  const cast = [...new Set(game.lines.flatMap((l) => l.heardBy))];
  const faction = (c: string) => ROSTER.find((r) => r.name === c)?.faction ?? "";
  return {
    schema_version: 1,
    variant: "full",
    complete: true,
    failure: null,
    header: {
      game_id: "fake-g1",
      seed: 2000,
      cast,
      roster: ROSTER,
      briefings: Object.fromEntries(cast.map((c) => [c, `*${faction(c)} · a guest*\n\n**Who you are**\n\nYou are ${c}, a guest tonight. More follows.`])),
      docs: { technicalDesign: "0.25" },
      config: { model: "fake/model", provider: "FakeProvider", quantization: "fp8", served_model: "fake/model-1", seed: 2000, turns: 6, recorder: { model: "fake/model", endpoint: "OpenRouter", provider: "FakeProvider", quantization: "fp8", served_model: "fake/model-1" } },
    },
    prefixes: game.prefixes,
    events: game.events,
    lines: game.lines,
    thoughts: game.thoughts,
    calls: game.calls,
    memory: { entries: game.memory.entries, beliefs: game.memory.beliefs, readings: game.memory.readings, label_log: game.memory.labelLog },
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
function publishedSites(): string[] {
  const dir = "results/published/sites";
  return existsSync(dir) ? readdirSync(dir).map((d) => join(dir, d)).filter((d) => existsSync(join(d, "index.html"))) : [];
}
/** The content of a <meta property|name="key"> tag, or null. */
function metaTag(html: string, key: string): string | null {
  const m = html.match(new RegExp(`<meta (?:property|name)="${key.replace(/[.:]/g, "\\$&")}" content="([^"]*)">`));
  return m ? m[1]! : null;
}
const SITE_TAGS = ["description", "og:type", "og:title", "og:description", "og:url", "og:image", "og:image:alt", "twitter:card", "twitter:title", "twitter:description", "twitter:image"];
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
  assert.equal(r.memory.label_log.length, fakeFull.memory.label_log.length, "the attachment rule's log stays, for the line modal");
});

test("the line modal's indexes: readings and ignored labels by line, each spoken line's event, and every thought", () => {
  const m = loader.load(fakeFull) as Loaded & {
    thoughts: { id: string | null; event: number; character: string; call: string }[];
    lineEvent: Map<string, number>;
    readingsByLine: Map<string, { id: string }[]>;
    ignoredByLine: Map<string, { thought: string; reason: string }[]>;
  };
  const g = fake.game;
  assert.equal([...m.readingsByLine.values()].flat().length, g.memory.readings.length);
  for (const r of g.memory.readings) assert.ok(m.readingsByLine.get(r.line)!.some((x) => x.id === r.id), r.id);
  assert.ok(g.memory.labelLog.length > 0, "the fake game ignores some labels");
  for (const x of g.memory.labelLog) assert.ok(m.ignoredByLine.get(x.line)!.some((y) => y.thought === x.thought && y.reason === x.reason), x.thought);
  for (const l of g.lines.filter((l) => l.kind === "speech")) assert.equal((g.events[m.lineEvent.get(l.id)!] as { line?: string }).line, l.id, l.id);
  assert.equal(m.thoughts.length, g.events.filter((e) => e.type === "thought").length);
  assert.ok(m.thoughts.every((t, i) => t.id && (i === 0 || t.event > m.thoughts[i - 1]!.event)), "thought ids, in event order");
});

test("a clean transcript: no inner-life toggle, lines carry only their dialogue, and the focus box starts collapsed (CC-20261029-03)", () => {
  const src = readFileSync("tools/viewer/viewer.html", "utf8");
  assert.doesNotMatch(src, /type="checkbox" id="inner"|ui\.inner\b/);
  const renderLine = src.slice(src.indexOf("function renderLine("), src.indexOf("\n  }\n", src.indexOf("function renderLine(")));
  for (const inline of ["margin", "<mark", "took", "meant", "importance", "thought"]) assert.ok(!renderLine.includes(inline), inline);
  assert.match(src, /id="fc-toggle" aria-expanded="false" aria-controls="fc-inner"/);
  assert.match(src, /<div id="fc-inner" hidden><\/div>/);
  assert.match(src, /innerOpen: false/);
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

test("every export carries the content credit, in its footer and <head> (CC-20261029-04)", () => {
  const credit = siteContent().credit;
  for (const html of [viewHtml(loader.toReplay(fakeFull)), ...publishedViews().map((p) => readFileSync(p, "utf8"))]) {
    const footer = html.match(/<footer class="credit" id="credit">([\s\S]*?)<\/footer>/)?.[1] ?? "";
    assert.equal(footer.replace(/<[^>]+>/g, ""), credit.text);
    assert.ok(footer.includes(`<a href="${credit.licenceUrl}" rel="license">${credit.link}</a>`));
    assert.ok(html.includes(`<link rel="license" href="${credit.licenceUrl}">`));
    assert.equal(metaTag(html, "dcterms.rights"), credit.text);
  }
});

test("a --site page: link-preview tags from the record, an absolute image URL, and no fragment in og:url", () => {
  const replay = loader.toReplay(fakeFull);
  const meta = siteMeta(replay, "https://replay.example/games#step=40");
  assert.equal(meta.url, "https://replay.example/games/");
  assert.equal(meta.image, "https://replay.example/games/preview.png");
  assert.equal(meta.title, "Gonfaloniere: Minigame Replay #1");
  const talks = fake.game.events.filter((e) => e.type === "colloquio-open").length;
  const say = (n: number) => ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);
  assert.ok(meta.description.includes(` ${say(replay.header.cast.length)} AI characters `), meta.description);
  assert.ok(meta.description.includes(" over 6 turns.") && meta.description.includes(` ${say(talks)} private talk${talks === 1 ? "" : "s"}.`), meta.description);
  assert.ok(meta.title.length < 60 && meta.description.length < 160);
  // Nothing from the briefings.
  assert.ok(!meta.description.includes("a guest tonight"));
  const html = viewHtml(replay, undefined, undefined, meta);
  for (const k of SITE_TAGS) assert.ok(metaTag(html, k), k);
  assert.ok(html.includes(`<link rel="canonical" href="https://replay.example/games/">`));
  assert.ok(html.includes(`<title>Gonfaloniere: Minigame Replay #1</title>`));
  assert.deepEqual(siteHeadTags(meta).filter((t) => !html.includes(t)), []);
  assert.equal(siteUrl("https://a.example"), "https://a.example/");
  assert.throws(() => siteUrl("file:///tmp/x"), /http/);
});

test("published sites: every preview tag, an absolute https image, a 1200×630 preview under 1 MB, nothing fetched, nothing key-shaped", () => {
  for (const dir of publishedSites()) {
    const html = readFileSync(join(dir, "index.html"), "utf8");
    for (const k of SITE_TAGS) assert.ok(metaTag(html, k), `${dir}: ${k}`);
    const url = metaTag(html, "og:url")!;
    assert.ok(!url.includes("#"), url);
    for (const k of ["og:image", "twitter:image"]) assert.equal(metaTag(html, k), new URL("preview.png", url).href, k);
    assert.match(metaTag(html, "og:image")!, /^https:\/\//);
    assert.equal(metaTag(html, "twitter:card"), "summary_large_image");
    assert.ok(metaTag(html, "og:title")!.length < 60 && metaTag(html, "og:description")!.length < 160);
    // Opens offline: no external scripts, stylesheets, images, or frames.
    assert.doesNotMatch(html, /<(script|img|iframe)[^>]+src="https?:|<link[^>]+rel="(stylesheet|preload|modulepreload|icon)"[^>]+href="https?:/);
    const png = readFileSync(join(dir, "preview.png"));
    assert.deepEqual(pngSize(png), { width: 1200, height: 630 });
    assert.ok(png.length < 1024 * 1024, `${png.length} bytes`);
    assert.deepEqual(keyFindings(html, {}), [], dir);
    assert.deepEqual(keyFindings(png.toString("latin1"), {}), [], `${dir}/preview.png`);
  }
});
