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
import { relType, relationshipTypes, relationships } from "../src/setting/pack.ts";
import { loadDocs, type DocSources } from "../src/sources/docs.ts";
import { fakeDocs, fakeSettings } from "./fixtures/fake-game.ts";

const F = "Francesco Pazzi";
// TD v0.44: the first with the reading (v0.45 adds block 5's room line, which #95 builds).
const docs44 = loadDocs(docsFor("0.44"));
const SERVED = { model: { slug: "fake" }, endpoint: { providerName: "fake", quantization: null }, servedId: null };
/** What the reading caller says about Giorgia: a quote nobody spoke, so the check must drop it. */
const INVENTED = 'She said "I will see the wine poisoned before midnight." Watch her.';

test("relationship types: the six, with labels; the interim file's love, family, and enmity read as romance, kin, and rivalry", () => {
  assert.deepEqual(relationshipTypes(), ["romance", "kin", "service", "alliance", "rivalry", "money"]);
  for (const t of relationshipTypes()) assert.ok(relationships().types[t]!.label.length > 2, t);
  assert.deepEqual(["love", "family", "enmity", "romance", "kin", "service"].map((t) => relType(t)), ["romance", "kin", "rivalry", "romance", "kin", "service"]);
  assert.equal(relType("interest"), "interest", "anything else is kept as it is");
  // What the screen gets: Francesco's own lines, typed as the six where the interim file maps them.
  const types = screenContent(F, "off", []).connections.map((c) => c.type);
  assert.ok(!types.some((t) => ["love", "family", "enmity"].includes(t)), types.join(", "));
  assert.ok(types.includes("romance") && types.includes("kin") && types.includes("rivalry"));
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
  assert.equal(fakeDocs.notaioReading, undefined);
  const { game, readings } = await playWithReadings(fakeDocs);
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
