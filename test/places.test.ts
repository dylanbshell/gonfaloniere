// Named places in the engine (CC-20261114-11, #128; TD v0.49, Movement Implementation › Named places;
// Mechanics v0.35, Named Places): every conversation is in one of the setting's places, block 5 tells the
// room place by place and names the character's own, and the opening events record the place. Played on
// the fake model caller in a full-size room (all twelve guests): no model calls.

import assert from "node:assert/strict";
import { test } from "node:test";
import { docsFor } from "../probe.config.ts";
import { ROSTER } from "../src/game/roster.ts";
import { MiniGame, type GameEvent } from "../src/minigame/engine.ts";
import { roomText } from "../src/prompt/assemble.ts";
import { settingPack } from "../src/setting/pack.ts";
import { loadDocs } from "../src/sources/docs.ts";
import { fakeCaller, fakeSettings, playFakeOn } from "./fixtures/fake-game.ts";

const PLACES = settingPack().places!;
const cast = ROSTER.map((r) => r.name);
const docs48 = loadDocs(docsFor("0.48"));
const docs49 = loadDocs(docsFor("0.49"));
const full = { cast, turns: 6, briefings: docs49.briefings, checks: [] };
const g48 = await playFakeOn(docs48, full);
const g49 = await playFakeOn(docs49, full);
/** The same game again, for the same seed's places. */
const g49b = await playFakeOn(docs49, full);

const ROOM = /^Around the room: (.*)$/m;
const LABEL = /^You are in (.*)\.$/m;
/** A room line's places: name, guests, and whether it's a Colloquio. */
const parseRoom = (room: string) =>
  room
    .replace(/\.$/, "")
    .split("; ")
    .map((p) => {
      const [, place, rest] = p.match(/^([^:]+): (.*)$/)!;
      const privately = rest!.endsWith(", in private");
      return { place: place!, privately, names: rest!.replace(/, in private$/, "").split(/, | and /) };
    });
/** The place a block 5 label names, if any. */
const labelPlace = (label: string) => PLACES.find((p) => new RegExp(`^(a Capannello|a private Colloquio) in ${p} with `).test(label)) ?? null;

test("the setting's places: Lore's eight, in order, matching Mechanics v0.35's Named places; TD v0.49 loads Mechanics v0.35", () => {
  assert.deepEqual(PLACES, ["the great hall", "the window bay", "the anteroom", "the loggia", "the courtyard", "the study", "the painted room", "the dining room"]);
  assert.equal(docs49.versions.mechanics, "0.35");
  assert.equal(docs49.namedPlaces, PLACES.length);
  assert.equal(docs48.versions.mechanics, "0.30", "before TD v0.49, Mechanics v0.30 as before");
  assert.equal(docs48.namedPlaces, null);
  assert.deepEqual(docs49.tunables, docs48.tunables, "v0.35's table adds only Named places, read outside Tunables, so no value moves");
});

test("at load, a game on TD v0.49 refuses to start unless the pack's places and Mechanics' count agree, and number at least 7", () => {
  const start = (docs: typeof docs49) => new MiniGame(docs, fakeSettings({ briefings: docs.briefings }), fakeCaller([]));
  assert.doesNotThrow(() => start(docs49));
  assert.throws(() => start({ ...docs49, namedPlaces: 9 }), /names 8 places, and Mechanics' Named places is 9/);
  assert.throws(() => start({ ...docs49, namedPlaces: null }), /no Named places row/);
  assert.doesNotThrow(() => start({ ...docs48, namedPlaces: 3 }), "before TD v0.49 there are no places to check");
});

test("the opening events record the place: the round's groups, each Colloquio, and each new group; none before TD v0.49", () => {
  const ev = (g: MiniGame, type: string) => g.events.filter((e) => e.type === type);
  const start = ev(g49.game, "capannelli")[0]!;
  const groups = start.groups as string[][];
  const places = start.places as string[];
  assert.equal(places.length, groups.length);
  assert.equal(new Set(places).size, places.length, "all different");
  assert.ok(places.every((p) => PLACES.includes(p)));
  const opened = ev(g49.game, "colloquio-open");
  assert.ok(opened.length > 2 && opened.every((e) => PLACES.includes(e.place as string)));
  assert.ok(ev(g49.game, "seatless-pair").every((e) => PLACES.includes(e.place as string)));
  assert.ok(!ev(g49.game, "engine-failure").length);
  // The same seed gives the same places; the record before v0.49 has none.
  const placed = (g: MiniGame) => g.events.filter((e) => "place" in e || "places" in e).map((e) => [e.type, e.place ?? e.places]);
  assert.deepEqual(placed(g49b.game), placed(g49.game));
  assert.ok(g48.game.events.every((e) => !("place" in e) && !("places" in e)));
});

test("places use their own generator: with places on, every other draw and every line of play is unchanged", () => {
  /** An event as it would be without places, and without the turn's timing and token counts (prompts differ by the room line). */
  const plain = (e: GameEvent) => {
    const { place: _p, places: _ps, ...rest } = e;
    if (e.type === "turn-end") return { type: e.type, turn: e.turn, calls: e.calls };
    return rest;
  };
  assert.deepEqual(g49.game.events.map(plain), g48.game.events.map(plain), "the same groups, rotation, moves, seats, and Colloquios");
  assert.deepEqual(g49.game.lines, g48.game.lines);
  assert.deepEqual(g49.calls.map((c) => `${c.kind}|${c.character}`), g48.calls.map((c) => `${c.kind}|${c.character}`));
});

test("{conversation_label} names the character's own place after the conversation's kind; the gathering and seat calls have none", () => {
  let labelled = 0;
  for (const c of g49.calls) {
    const label = c.user.match(LABEL)?.[1];
    if (!label) continue;
    if (c.kind === "murder" || c.kind === "seat") {
      assert.equal(label, "the gathering", `${c.kind}: no place outside a conversation`);
      continue;
    }
    const place = labelPlace(label);
    assert.ok(place, `${c.kind} ${c.character}: ${label}`);
    labelled++;
    // The character's own place is never repeated in the room line.
    const room = c.user.match(ROOM)?.[1];
    if (room) assert.ok(!parseRoom(room).some((p) => p.place === place), `${c.character}: ${room}`);
  }
  assert.ok(labelled > 100);
  assert.ok(g49.calls.some((c) => /^You are in a private Colloquio in the [a-z ]+ with .+ \(utterance \d of \d\)\.$/m.test(c.user)), "a Colloquio's label: the place, then the utterance count as before");
  // Before TD v0.49, no label or room line names a place.
  for (const c of g48.calls) {
    const label = c.user.match(LABEL)?.[1] ?? "";
    assert.equal(labelPlace(label), null, label);
    assert.ok(!PLACES.some((p) => (c.user.match(ROOM)?.[1] ?? "").includes(`${p}:`)));
  }
});

test("{room} with places: every other occupied place in the pack's order, `place: guests`, `, in private` after a Colloquio, never empty or the character's own", () => {
  let busy = 0;
  for (const c of g49.calls) {
    const room = c.user.match(ROOM)?.[1];
    if (!room) continue;
    const places = parseRoom(room);
    const order = places.map((p) => PLACES.indexOf(p.place));
    assert.ok(order.every((i) => i >= 0), room);
    assert.deepEqual(order, [...order].sort((a, b) => a - b), `in the pack's order: ${room}`);
    assert.equal(new Set(order).size, order.length, `one conversation per place: ${room}`);
    const named = places.flatMap((p) => p.names);
    assert.ok(named.every((n) => cast.includes(n)) && !named.includes(c.character!), room);
    assert.equal(new Set(named).size, named.length, room);
    for (const p of places) assert.deepEqual(p.names, [...p.names].sort((a, b) => cast.indexOf(a) - cast.indexOf(b)), `roster order within a place: ${room}`);
    if (places.some((p) => p.privately) && places.some((p) => !p.privately)) busy++;
    assert.ok(room.endsWith("."));
  }
  assert.ok(busy > 0, "a room with groups and a Colloquio");
  assert.ok(g49.calls.filter((c) => c.kind === "murder" || c.kind === "seat").every((c) => !ROOM.test(c.user)), "left out at midnight and between seats, as before");
});

test("{room}'s words, with and without places: TD's examples, with the setting pack's joining words", () => {
  assert.equal(
    roomText({ places: [
      { place: "the great hall", members: ["Giorgia Pazzi", "Raffaello de' Medici", "Captain Armand LeNoir"], private: false },
      { place: "the window bay", members: ["Friar Tommaso", "Sister Beatrice"], private: true },
    ] }),
    "the great hall: Giorgia Pazzi, Raffaello de' Medici and Captain Armand LeNoir; the window bay: Friar Tommaso and Sister Beatrice, in private.",
  );
  assert.equal(roomText({ places: [{ place: "the loggia", members: ["Lupo"], private: false }, { place: "the study", members: [], private: false }] }), "the loggia: Lupo.", "a guest on their own; an empty place isn't listed");
  assert.equal(roomText({ places: [] }), "", "nothing to see: no line");
  assert.equal(roomText({ groups: [["Lupo", "Clarice Orsini"]], colloquios: [] }), "Lupo and Clarice Orsini together.", "before v0.49, as before");
});

test("{room}'s size in a full-size room (reported; TD estimates 50–110 tokens)", (t) => {
  /** The repo's estimate, as test/room.test.ts uses: characters / 4. */
  const tokens = (s: string) => s.length / 4;
  const lens = g49.calls.map((c) => c.user.match(/^Around the room: .*$/m)?.[0]).filter((x): x is string => !!x).map(tokens);
  const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
  // The fullest the rules allow: the character in a pair, the ten others in five conversations (three groups of two, two Colloquios).
  const fullest = `Around the room: ${roomText({ places: [
    { place: "the great hall", members: ["Piero de' Medici", "Clarice Orsini"], private: false },
    { place: "the window bay", members: ["Raffaello de' Medici", "Francesco Pazzi"], private: false },
    { place: "the anteroom", members: ["Giorgia Pazzi", "Lupo"], private: false },
    { place: "the painted room", members: ["Contessa Isabella", "Jeanne d'Orléans"], private: true },
    { place: "the dining room", members: ["Emile de Valois", "Captain Armand LeNoir"], private: true },
  ] })}`;
  const four = `Around the room: ${roomText({ places: [
    { place: "the great hall", members: ["Giorgia Pazzi", "Raffaello de' Medici", "Captain Armand LeNoir"], private: false },
    { place: "the window bay", members: ["Friar Tommaso", "Contessa Isabella", "Jeanne d'Orléans"], private: false },
    { place: "the painted room", members: ["Piero de' Medici", "Clarice Orsini", "Francesco Pazzi"], private: false },
  ] })}`;
  t.diagnostic(`room line in the fake full-size game: ${lens.length} calls, ~${Math.round(Math.min(...lens))}–${Math.round(Math.max(...lens))} tokens, ~${Math.round(avg)} on average (characters / 4)`);
  t.diagnostic(`a round's start (four groups of three): ~${Math.round(tokens(four))} tokens; the fullest room (five other conversations): ~${Math.round(tokens(fullest))} tokens`);
  assert.ok(Math.max(...lens, tokens(fullest)) <= 110);
});
