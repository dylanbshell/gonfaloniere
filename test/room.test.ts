// Everyone sees the room (CC-20261113-04, #95; TD v0.45, Block 5's {room}; Mechanics, Everyone Sees the
// Room): the room line in AI guests' prompts, from TD v0.45 only, in open play only, the present moment
// only, without the character's own conversation or the dead. Played on the fake model caller in a
// full-size room (all twelve guests): no model calls.

import assert from "node:assert/strict";
import { test } from "node:test";
import { docsFor } from "../probe.config.ts";
import { ROSTER } from "../src/game/roster.ts";
import { roomText } from "../src/prompt/assemble.ts";
import { loadDocs } from "../src/sources/docs.ts";
import { playFakeOn } from "./fixtures/fake-game.ts";

const LINE = /^Around the room: (.*)$/m;
const cast = ROSTER.map((r) => r.name);
const docs45 = loadDocs(docsFor("0.45", "0.12"));
const full = await playFakeOn(docs45, { cast, turns: 6, briefings: docs45.briefings, checks: [] });
const rooms = full.calls.map((c) => ({ c, room: c.user.match(LINE)?.[1] ?? null }));
/** Block 5's Present line, as names. */
const present = (user: string) => (user.match(/^Present: (.*)$/m)?.[1] ?? "").split(", ").filter(Boolean);

test("the room line's words: TD's example, with the setting pack's joining words", () => {
  assert.equal(
    roomText({ groups: [["Giorgia Pazzi", "Raffaello de' Medici", "Captain Armand LeNoir"]], colloquios: [["Fra Tommaso", "Sister Beatrice"]] }),
    "Giorgia Pazzi, Raffaello de' Medici and Captain Armand LeNoir together; Fra Tommaso and Sister Beatrice in private.",
  );
  assert.equal(roomText({ groups: [], colloquios: [] }), "", "nothing to see: no line");
  assert.equal(roomText({ groups: [["Lupo"]], colloquios: [] }), "Lupo on their own.");
});

test("{room} in a turn with two groups and a Colloquio: every other group, then every Colloquio, in roster order, never the character's own", () => {
  const place = (n: string) => cast.indexOf(n);
  const busy = rooms.filter((r) => r.room && (r.room.match(/ together/g) ?? []).length >= 2 && r.room.includes(" in private"));
  assert.ok(busy.length > 0, "a turn with two groups and a Colloquio");
  for (const { c, room } of rooms.filter((r) => r.room)) {
    const parts = room!.replace(/\.$/, "").split("; ");
    const sets = parts.map((p) => ({ privately: p.endsWith(" in private"), names: p.replace(/ (together|in private|on their own)$/, "").split(/, | and /) }));
    // Groups first, then the private pairs; each in roster order, and ordered by their first member.
    const firstPrivate = sets.findIndex((s) => s.privately);
    assert.ok(firstPrivate < 0 || sets.slice(firstPrivate).every((s) => s.privately), room!);
    for (const s of sets) assert.deepEqual(s.names, [...s.names].sort((a, b) => place(a) - place(b)), room!);
    for (const run of [sets.filter((s) => !s.privately), sets.filter((s) => s.privately)]) assert.deepEqual(run.map((s) => place(s.names[0]!)), run.map((s) => place(s.names[0]!)).sort((a, b) => a - b), room!);
    // Never the character, the people with them, or anyone twice.
    const named = sets.flatMap((s) => s.names);
    assert.ok(!named.includes(c.character!) && !present(c.user).some((p) => named.includes(p)), `${c.character}: ${room}`);
    assert.equal(new Set(named).size, named.length);
    assert.ok(named.every((n) => cast.includes(n)), room!);
  }
});

test("{room} is left out at midnight and outside a conversation", () => {
  const midnight = full.calls.filter((c) => c.kind === "murder");
  assert.ok(midnight.length > 0 && midnight.every((c) => !LINE.test(c.user)), "midnight: no room");
  assert.ok(full.calls.filter((c) => c.kind === "seat").every((c) => !LINE.test(c.user)), "between seats (outside a conversation): no room");
  // In open play, every character call that shows block 5 has the line (the mini-game has no councils).
  assert.ok(full.calls.filter((c) => c.kind === "speak").every((c) => LINE.test(c.user)));
  // (The mini-game's deaths come at midnight, after open play; the room lists only living guests by construction.)
});

test("{room} only from TD v0.45: the same game on v0.44 has no room line", async () => {
  const g44 = await playFakeOn(loadDocs(docsFor("0.44", "0.12")), { cast, turns: 6, briefings: docs45.briefings, checks: [] });
  assert.ok(g44.calls.every((c) => !c.user.includes("Around the room")));
});

test("the room line's size in a full-size room (reported; TD estimates 40–90 tokens)", (t) => {
  const lens = rooms.filter((r) => r.room).map((r) => `Around the room: ${r.room}`.length / 4);
  const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
  t.diagnostic(`room line: ${lens.length} calls, ~${Math.round(Math.min(...lens))}–${Math.round(Math.max(...lens))} tokens, ~${Math.round(avg)} on average (characters / 4)`);
  assert.ok(Math.max(...lens) <= 90);
});
