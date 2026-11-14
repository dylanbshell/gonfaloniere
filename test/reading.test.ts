// The Web of Secrets' engine side (CC-20261113-02, #90; TD v0.44–v0.46): relationship types as the six,
// Il Notaio's reading (first-hand material, the quote check and its fallback to the tally, the cache, never
// in a character's prompt or a replay), and the evening's track for the mini-game. Played in process on the
// fake model caller: no model calls.

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { docsFor } from "../probe.config.ts";
import { HumanController, type Connection } from "../src/core/human.ts";
import type { Outgoing } from "../src/core/protocol.ts";
import { castBriefings } from "../src/minigame/cast.ts";
import { MiniGame, type CallRequest, type Caller } from "../src/minigame/engine.ts";
import { FAKE_READING, fakeCaller } from "../src/minigame/fake-caller.ts";
import { readLoreFile } from "../src/minigame/lore.ts";
import { screenContent } from "../src/minigame/player.ts";
import { unfoundQuotes } from "../src/minigame/reading.ts";
import { buildRecord } from "../src/minigame/record.ts";
import { exportView } from "../src/minigame/view.ts";
import { relationshipTypes, relationships } from "../src/setting/pack.ts";
import { loadDocs, type DocSources } from "../src/sources/docs.ts";
import { fakeDocs, fakeSettings } from "./fixtures/fake-game.ts";

const F = "Francesco Pazzi";
// TD v0.44: the first with the reading (v0.45 adds block 5's room line, which #95 builds).
const docs44 = loadDocs(docsFor("0.44"));
const SERVED = { model: { slug: "fake" }, endpoint: { providerName: "fake", quantization: null }, servedId: null };
/** What the reading caller says about Giorgia: a quote nobody spoke, so the check must drop it. */
const INVENTED = 'She said "I will see the wine poisoned before midnight." Watch her.';

test("relationship types: the six, with labels, and every connection the screen gets uses one", () => {
  assert.deepEqual(relationshipTypes(), ["romance", "kin", "service", "alliance", "rivalry", "money"]);
  for (const t of relationshipTypes()) assert.ok(relationships().types[t]!.label.length > 2, t);
  // What the screen gets: the public lines and Francesco's own, each typed as one of the six.
  const conns = screenContent(F, "off", []).connections;
  assert.ok(conns.length > 0 && conns.every((c) => relationshipTypes().includes(c.type)), conns.map((c) => c.type).join(", "));
  assert.ok(conns.some((c) => c.private) && conns.some((c) => !c.private));
});

test("the quote check: every double-quoted span must be in the material, word for word after normalizing", () => {
  const material = `WHAT YOU HEARD AND SAW TONIGHT\n1st round, early · Lupo (to you): "I'll keep the door, Messer. Nobody passes."`;
  assert.deepEqual(unfoundQuotes("No quotes at all.", material), []);
  assert.deepEqual(unfoundQuotes('He said "I’ll keep the door," and meant it.', material), [], "curly apostrophe, closing comma");
  assert.deepEqual(unfoundQuotes("He said “nobody passes.”", material), [], "curly quotes, any case");
  assert.deepEqual(unfoundQuotes('"I\'ll keep the door … Nobody passes."', material), [], "an ellipsis joins two found parts");
  assert.deepEqual(unfoundQuotes('He said "I will poison the wine."', material), ["I will poison the wine."]);
  assert.deepEqual(unfoundQuotes('"I\'ll keep the door … and the cellar"', material), ["I'll keep the door … and the cellar"], "every part of an ellipsis must be found");
});

/** The reading caller: the fake caller, with an invented quote whenever the reading is about Giorgia alone. */
function readingCaller(calls: CallRequest[]): Caller {
  const base = fakeCaller(calls);
  return async (req) => {
    const r = (await base(req))!;
    return req.kind === "notaio-reading" && req.user.includes("ABOUT\nGiorgia Pazzi\n") ? { ...r, content: INVENTED } : r;
  };
}

/**
 * A game as Francesco, in process, on `docs`: the player answers every request at once, and at each of his
 * speaking turns asks for readings of Lupo (twice, at once), of Giorgia, and of the pair.
 */
async function playWithReadings(docs: DocSources, seed = 2000) {
  const ctrl = new HumanController(F);
  const calls: CallRequest[] = [];
  const game = new MiniGame(docs, fakeSettings({ briefings: castBriefings(docs), seed, turns: 6, human: F }), readingCaller(calls), {}, null, ctrl);
  const log: Outgoing[] = [];
  let reply: (d: string) => void = () => {};
  const conn: Connection = {
    send: (d) => {
      const ev = JSON.parse(d) as Outgoing;
      log.push(ev);
      if (ev.type !== "request" || ev.closed) return;
      const o = ev.options as Record<string, unknown>;
      queueMicrotask(() => {
        if (ev.kind === "speak") {
          for (const guests of [["Lupo"], ["Lupo"], ["Giorgia Pazzi"], ["Lupo", "Giorgia Pazzi"]]) reply(JSON.stringify({ type: "reading", guests }));
          reply(JSON.stringify(o.conversation === "colloquio" && !o.closing ? { type: "say", text: "@Lupo between us, then." } : { type: "pass" }));
        } else if (ev.kind === "move") reply(JSON.stringify({ type: "choice", request: ev.id, value: { choice: "stay" } }));
        else if (ev.kind === "seat") {
          const g = o.groups as { members: string[] }[];
          reply(JSON.stringify({ type: "choice", request: ev.id, value: g.length ? { choice: "join", target: g[0]!.members[0] } : { choice: "wait", target: null } }));
        } else reply(JSON.stringify({ type: "choice", request: ev.id, value: { acts: [{ type: "watch", target: (o.guests as string[])[0] }] } }));
      });
    },
    onMessage: (cb) => void (reply = cb),
    onClose: () => {},
  };
  ctrl.attach(conn);
  await game.play();
  // Let the last readings finish.
  await new Promise((r) => setTimeout(r, 20));
  const readings = log.filter((e): e is Extract<Outgoing, { type: "reading" }> => e.type === "reading");
  return { game, calls, ctrl, log, readings };
}

test("Il Notaio's reading: one call per selection until its record grows; a reading with an invented quote falls back to the tally", async () => {
  const { game, calls, readings } = await playWithReadings(docs44);
  const made = game.calls.filter((c) => c.kind === "notaio-reading");
  assert.ok(made.length > 3, "readings were made");
  // The cache: one call per selection and record, however often it was asked.
  const keys = new Set(readings.map((r) => `${[...r.guests].sort().join("|")}@${r.upTo}`));
  assert.equal(made.length, keys.size, "one call per selection until its record grows");
  assert.ok(readings.length > keys.size, "asked more often than called");
  // Every call: the recorder's temperature, the player screen's source, TD's prompt with the setting's words.
  const reqs = calls.filter((c) => c.kind === "notaio-reading");
  assert.ok(reqs.every((r) => r.temperature === 0 && r.character === null));
  assert.ok(made.every((c) => c.source === "player screen"));
  assert.match(reqs[0]!.system, /^You are Il Notaio, the notary who records/);
  assert.match(reqs[0]!.user, /^ABOUT\n(Lupo|Giorgia Pazzi)/);
  // Fed only first-hand material: every quoted line in the record is one Francesco heard.
  const heard = new Set(game.lines.filter((l) => l.heardBy.includes(F)).map((l) => l.text));
  for (const r of reqs) for (const m of r.user.split("WHAT YOU HEARD AND SAW TONIGHT\n")[1]!.matchAll(/: "(.*)"$/gm)) assert.ok(heard.has(m[1]!), `${m[1]} is in Francesco's History`);
  // The guarded reading: Lupo's is shown; Giorgia's invented quote is dropped for the tally.
  const lupo = readings.filter((r) => r.guests.join() === "Lupo");
  assert.ok(lupo.length && lupo.every((r) => r.text === FAKE_READING));
  const giorgia = readings.filter((r) => r.guests.join() === "Giorgia Pazzi");
  assert.ok(giorgia.length && giorgia.every((r) => r.text === null && /Giorgia Pazzi/.test(r.tally)), JSON.stringify(giorgia[0]));
  const dropped = made.filter((c) => c.raw === INVENTED);
  assert.ok(dropped.length && dropped.every((c) => c.verdict === "default" && /quotes not in the material/.test(c.error!)));
});

test("Il Notaio's reading never reaches a character's prompt, the game's state, or the replay export; it's in the full record", async () => {
  const { game, calls } = await playWithReadings(docs44, 7);
  assert.ok(game.calls.some((c) => c.kind === "notaio-reading" && c.raw === FAKE_READING));
  for (const c of calls.filter((x) => x.kind !== "notaio-reading")) {
    assert.ok(!c.system.includes(FAKE_READING) && !c.user.includes(FAKE_READING), `the reading reached a ${c.kind} prompt`);
    assert.ok(!c.user.includes("WHAT YOUR OWN PAST TELLS YOU"), `the reading's prompt reached a ${c.kind} prompt`);
  }
  const { calls: _calls, prefixes: _prefixes, ctrl: _ctrl, player: _player, readings: _readings, ...rest } = game as unknown as Record<string, unknown>;
  const where = Object.entries(rest)
    .filter(([, x]) => typeof x !== "function" && JSON.stringify(x ?? null).includes(FAKE_READING))
    .map(([k]) => k);
  assert.deepEqual(where, [], "the reading reached the game's other state");
  const dir = mkdtempSync(join(tmpdir(), "reading-"));
  try {
    const record = buildRecord(game, { gameId: "reading", seed: 7, docs: docs44, briefings: castBriefings(docs44), served: { character: SERVED, system: { ...SERVED, recorder: { model: "fake" } } }, settings: { ...fakeSettings({ turns: 6, human: F }), briefings: undefined }, ms: 0, failure: null, tree: { tracked_changes: [], untracked: [] }, retries: 0, lore: { file: readLoreFile(), loaded: [] }, embeddingModel: null, store: null });
    assert.ok(JSON.stringify(record).includes(FAKE_READING), "recorded in the full record, as a call");
    const path = join(dir, "game-reading.full.json.gz");
    writeFileSync(path, gzipSync(JSON.stringify(record)));
    const html = readFileSync(exportView(path).path, "utf8");
    assert.ok(html.length > 1000 && !html.includes(FAKE_READING) && !html.includes("WHAT YOUR OWN PAST TELLS YOU"), "the reading reached the replay export");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("before TD v0.44 there is no reading: the tally, and no call", async () => {
  const docs36 = loadDocs(docsFor("0.36"));
  assert.equal(docs36.notaioReading, undefined);
  const { game, readings } = await playWithReadings(docs36);
  assert.equal(game.calls.filter((c) => c.kind === "notaio-reading").length, 0);
  assert.ok(readings.length > 0 && readings.every((r) => r.text === null && r.tally.length > 10));
});

test("the evening's track for the mini-game: the arrival, the round of mingling by its thirds, and midnight", async () => {
  const { game, log } = await playWithReadings(fakeDocs);
  assert.deepEqual(game.stages(), ["The guests' arrival", "The first round of mingling, early", "The first round of mingling, midway", "The first round of mingling, late", "Midnight"]);
  const sheet = log.find((e) => e.type === "state" && e.sheet) as Extract<Outgoing, { type: "state" }>;
  assert.deepEqual(sheet.sheet!.track, game.stages(), "sent with the player's sheet");
  // Every phase the player saw is a stage on the track.
  const phases = new Set(log.filter((e) => e.type === "state").map((e) => (e as Extract<Outgoing, { type: "state" }>).state.phaseLabel as string));
  for (const p of phases) assert.ok(game.stages().includes(p), p);
});

// ---- TD v0.51: the guarded reading and past-stage summaries (CC-20261114-19, #146) --------------------------

const docs51 = loadDocs(docsFor("0.51"));

/**
 * A game as Francesco on TD v0.51, in process: he begins at once (the tour's hold), answers every request at
 * once, and at each speaking turn selects Lupo, Giorgia, and the pair. `caller` wraps the fake caller.
 */
async function playGuarded(seed = 2000, wrap: (base: Caller) => Caller = (b) => b) {
  const ctrl = new HumanController(F);
  const calls: CallRequest[] = [];
  const game = new MiniGame(docs51, fakeSettings({ briefings: castBriefings(docs51), seed, turns: 6, human: F }), wrap(fakeCaller(calls)), {}, null, ctrl);
  const log: Outgoing[] = [];
  let reply: (d: string) => void = () => {};
  const conn: Connection = {
    send: (d) => {
      const ev = JSON.parse(d) as Outgoing;
      log.push(ev);
      if (log.length === 1) queueMicrotask(() => reply(JSON.stringify({ type: "begin" })));
      if (ev.type !== "request" || ev.closed) return;
      const o = ev.options as Record<string, unknown>;
      queueMicrotask(() => {
        if (ev.kind === "speak") {
          for (const guests of [["Lupo"], ["Lupo"], ["Giorgia Pazzi"], ["Lupo", "Giorgia Pazzi"], []]) reply(JSON.stringify({ type: "select", guests }));
          reply(JSON.stringify(o.conversation === "colloquio" && !o.closing ? { type: "say", text: "@Lupo between us, then." } : { type: "pass" }));
        } else if (ev.kind === "move") reply(JSON.stringify({ type: "choice", request: ev.id, value: { choice: "stay" } }));
        else if (ev.kind === "seat") {
          const g = o.groups as { members: string[] }[];
          reply(JSON.stringify({ type: "choice", request: ev.id, value: g.length ? { choice: "join", target: g[0]!.members[0] } : { choice: "wait", target: null } }));
        } else reply(JSON.stringify({ type: "choice", request: ev.id, value: { acts: [{ type: "watch", target: (o.guests as string[])[0] }] } }));
      });
    },
    onMessage: (cb) => void (reply = cb),
    onClose: () => {},
  };
  ctrl.attach(conn);
  await game.play();
  await new Promise((r) => setTimeout(r, 20));
  const readings = log.filter((e): e is Extract<Outgoing, { type: "reading" }> => e.type === "reading");
  const summaries = log.filter((e): e is Extract<Outgoing, { type: "stage-summary" }> => e.type === "stage-summary");
  return { game, calls, ctrl, log, readings, summaries };
}

test("TD v0.51's reading: background, then a paragraph per stage; every sentence checked; one call per chosen set; recorded with each verdict", async () => {
  const { game, calls, log, readings } = await playGuarded();
  assert.ok(readings.length > 5);
  for (const r of readings) {
    assert.equal(r.text, null);
    assert.ok(r.guarded, "the guarded reading");
    assert.ok(r.tally.length > 10, "the tally stays as the closing line");
  }
  const made = game.calls.filter((c) => c.kind === "notaio-reading");
  assert.ok(made.length > 2 && made.every((c) => c.source === "player screen" && c.verdict === "valid"));
  const reqs = calls.filter((c) => c.kind === "notaio-reading");
  assert.ok(reqs.every((r) => r.temperature === 0 && r.character === null && r.maxTokens > 0));
  // The cache: asked more often than called.
  assert.ok(readings.length > made.length);
  // Every verdict is in the record, line by line.
  for (const c of made) {
    const p = c.parsed as { guests: string[]; sentences: { line: number; shown: string; failed: string[] }[] };
    assert.ok(p.guests.length && p.sentences.length > 0 && p.sentences.every((s) => s.shown === "model" && s.failed.length === 0), JSON.stringify(p));
  }
  // Lupo's: his lines only, each sentence his; the paragraphs in the track's order, each opening with its stage.
  const lupo = readings.filter((r) => r.guests.join() === "Lupo").at(-1)!.guarded!;
  const track = game.stages();
  assert.deepEqual(lupo.stages.map((s) => s.stage), [...lupo.stages.map((s) => s.stage)].sort((a, b) => track.indexOf(a) - track.indexOf(b)));
  for (const s of lupo.stages) assert.equal(s.heading, `In ${s.stage.charAt(0).toLowerCase()}${s.stage.slice(1)}:`);
  const sentences = lupo.stages.flatMap((s) => s.items).filter((i) => i.kind === "sentence");
  assert.ok(sentences.length > 0 && sentences.length <= 8 && sentences.every((i) => i.text.startsWith("Lupo ")));
  for (const i of sentences) {
    const line = log.find((e) => e.seq === (i as { seq: number }).seq) as Extract<Outgoing, { type: "line" }>;
    assert.equal(line.speaker, "Lupo");
    assert.ok(i.text.includes(`"${line.text}"`), "his sentence quotes that line");
  }
  // The background: the connection lines that involve Lupo, from the sheet, verbatim.
  const sheet = log.find((e) => e.type === "state" && e.sheet) as Extract<Outgoing, { type: "state" }>;
  const conns = sheet.sheet!.connections as { between: string[]; line: string }[];
  assert.deepEqual(lupo.background.connections.map((c) => c.line), conns.filter((c) => c.between.includes("Lupo")).map((c) => c.line));
  // The fake guests speak of the loggia, which names a public lore entry: a note after the line, once per reading.
  const notes = lupo.stages.flatMap((s) => s.items).filter((i) => i.kind === "note");
  assert.ok(notes.length <= new Set(notes.map((n) => (n as { entry: string }).entry)).size, "each entry noted once");
  // The model's input: the chosen lines only.
  const eventTexts = log.filter((e) => e.type === "notaio" || e.type === "action").map((e) => (e as { text: string }).text);
  for (const r of calls.filter((c) => c.kind === "notaio-reading" || c.kind === "notaio-summary")) {
    assert.match(r.user, /^LINES\n\d+\. [^\n]+(\n\d+\. [^\n]+)*$/, "numbered lines and nothing else");
    for (const t of [...eventTexts, ...conns.map((c) => c.line), ...track]) assert.ok(!r.user.includes(t), `the model was given: ${t}`);
    assert.ok(!/ABOUT|WHAT YOU/.test(r.user), "no selection, no record heading");
  }
  for (const n of notes) assert.ok(!calls.some((c) => c.user.includes((n as { text: string }).text)), "no note reaches any prompt");
});

test("TD v0.51's past-stage summaries: written once as each stage ends, grouped by conversation, kept in the player's log", async () => {
  const { game, summaries, log } = await playGuarded(7);
  const track = game.stages();
  // Every stage the player's state moved on from, once each, in order: the arrival and the round's thirds.
  assert.deepEqual(summaries.map((s) => s.stage), track.slice(0, -1));
  const made = game.calls.filter((c) => c.kind === "notaio-summary");
  assert.equal(made.length, summaries.filter((s) => s.groups.some((g) => g.items.some((i) => i.kind === "sentence"))).length, "one call per stage with lines");
  assert.ok(made.every((c) => c.source === "player screen" && (c.parsed as { stage: string }).stage));
  for (const s of summaries) {
    const sentences = s.groups.flatMap((g) => g.items).filter((i) => i.kind === "sentence");
    assert.ok(sentences.length <= 10);
    assert.equal(s.empty, sentences.length ? null : "Nothing reached you in this stage.");
    // Each group is one stretch the player was in during the stage, by its first line in the log.
    for (const g of s.groups) {
      const first = log.find((e) => e.seq === g.from) as { conversation?: string };
      assert.equal(first.conversation, g.conversation);
    }
  }
});

test("TD v0.51's guard in play: a reply that isn't JSON is repaired once, then every line is code's plain version", async () => {
  const broken = (base: Caller): Caller => async (req) => {
    const r = (await base(req))!;
    return req.kind === "notaio-summary" ? { ...r, content: "Lupo spoke of many things tonight." } : r;
  };
  const { game, summaries } = await playGuarded(2000, broken);
  const made = game.calls.filter((c) => c.kind === "notaio-summary");
  assert.ok(made.length >= 2);
  const attempts = made.map((c) => c.attempt);
  assert.equal(attempts.filter((a) => a === 1).length, attempts.filter((a) => a === 2).length, "every call re-asked once");
  assert.ok(made.every((c) => (c.attempt === 1 ? c.verdict === "failed" : c.verdict === "default") && c.error === "not JSON"));
  assert.ok(made.filter((c) => c.attempt === 2).every((c) => /Your last reply could not be used/.test(c.user)));
  const sentences = summaries.flatMap((s) => s.groups.flatMap((g) => g.items)).filter((i) => i.kind === "sentence");
  assert.ok(sentences.length > 0 && sentences.every((i) => / (said|told [^:]+): "/.test(i.text)), "G9's plain versions, never dropped");
});

test("TD v0.51's reading and summaries never reach a character's prompt, the game's state, or the replay export", async () => {
  const { game, calls, readings, summaries } = await playGuarded(7);
  const shown = [...readings.flatMap((r) => r.guarded!.stages.flatMap((s) => s.items)), ...summaries.flatMap((s) => s.groups.flatMap((g) => g.items))]
    .filter((i) => i.kind === "sentence")
    .map((i) => i.text);
  assert.ok(shown.length > 5);
  const raws = game.calls.filter((c) => c.source === "player screen").map((c) => c.raw!);
  for (const c of calls.filter((x) => x.kind !== "notaio-reading" && x.kind !== "notaio-summary")) {
    for (const t of shown) assert.ok(!c.user.includes(t) && !c.system.includes(t), `a sentence reached a ${c.kind} prompt`);
    assert.ok(!c.user.startsWith("LINES\n"));
  }
  const { calls: _calls, prefixes: _prefixes, ctrl: _ctrl, player: _player, readings: _r, sentences: _s, summaryJobs: _j, backgrounds: _b, ...rest } = game as unknown as Record<string, unknown>;
  const where = Object.entries(rest)
    .filter(([, x]) => typeof x !== "function" && raws.some((raw) => JSON.stringify(x ?? null).includes(JSON.stringify(raw).slice(1, 40))))
    .map(([k]) => k);
  assert.deepEqual(where, [], "a reading reached the game's other state");
  const dir = mkdtempSync(join(tmpdir(), "guarded-"));
  try {
    const record = buildRecord(game, { gameId: "guarded", seed: 7, docs: docs51, briefings: castBriefings(docs51), served: { character: SERVED, system: { ...SERVED, recorder: { model: "fake" } } }, settings: { ...fakeSettings({ turns: 6, human: F }), briefings: undefined }, ms: 0, failure: null, tree: { tracked_changes: [], untracked: [] }, retries: 0, lore: { file: readLoreFile(), loaded: [] }, embeddingModel: null, store: null });
    assert.ok(JSON.stringify(record).includes(JSON.stringify(raws[0]!).slice(1, -1)), "recorded in the full record, as a call");
    const path = join(dir, "game-guarded.full.json.gz");
    writeFileSync(path, gzipSync(JSON.stringify(record)));
    const html = readFileSync(exportView(path).path, "utf8");
    assert.ok(html.length > 1000 && !html.includes('"sentences"') && !html.includes("LINES\\n1."), "a reading reached the replay export");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("before TD v0.51 the reading is today's: no guarded field, no summaries, no hold", async () => {
  const { readings, log } = await playWithReadings(fakeDocs);
  assert.ok(readings.length > 0 && readings.every((r) => r.guarded === undefined));
  assert.ok(!log.some((e) => e.type === "stage-summary"));
});
