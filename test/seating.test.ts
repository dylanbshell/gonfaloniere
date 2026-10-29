// TD v0.23–v0.24 seating (Movement Implementation › Seating; Block 9h; Output Validation's Seat row),
// driven on hand-built seatings through the engine's own seating steps, with a fake seat caller.

import assert from "node:assert/strict";
import { test } from "node:test";
import { config, technicalDesignPath } from "../probe.config.ts";
import { CAST, STANDINS, STANDIN_FILE } from "../src/minigame/cast.ts";
import { MiniGame, type CallRequest, type Caller, type GameEvent } from "../src/minigame/engine.ts";
import { loadDocs, loadStandinBriefings } from "../src/sources/docs.ts";
import type { CharacterName } from "../src/game/roster.ts";
import { seatingHealth } from "../src/minigame/seating-health.ts";

const docs24 = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.24") });
const docs21 = loadDocs({ ...config.docs, technicalDesign: technicalDesignPath("0.21") });
const briefings = { ...docs24.briefings, ...loadStandinBriefings(STANDIN_FILE, STANDINS, docs24.socialAwareness) };

const L: CharacterName = "Lupo";
const I: CharacterName = "Contessa Isabella";
const A: CharacterName = "Captain Armand LeNoir";
const F: CharacterName = "Francesco Pazzi";
const R: CharacterName = "Raffaello de' Medici";
const G: CharacterName = "Giorgia Pazzi";

type Reply = object | string;

/**
 * A game with these Capannelli, at turn 1. Seat calls take the queued replies in order (a function
 * gets the request); any other call fails the test, since seating makes only seat calls.
 */
function seated(groups: CharacterName[][], replies: (Reply | ((req: CallRequest) => Reply))[] = [], opts: { td?: "0.24" | "0.21"; max?: number; seed?: number } = {}) {
  const calls: CallRequest[] = [];
  const caller: Caller = async (req) => {
    calls.push(req);
    if (req.kind !== "seat") throw new Error(`unexpected ${req.kind} call`);
    const next = replies.shift();
    if (next === undefined) throw new Error("no seat reply queued");
    const r = typeof next === "function" ? next(req) : next;
    return { ok: true, content: typeof r === "string" ? r : JSON.stringify(r), error: null, costUsd: 0, inputTokens: 0, outputTokens: 0, latencyMs: 0, provider: "fake", model: "fake" };
  };
  const g = new MiniGame(
    opts.td === "0.21" ? docs21 : docs24,
    {
      cast: CAST,
      briefings,
      seed: opts.seed ?? 7,
      turns: 3,
      utterancesPerTurn: 12,
      historyWindow: 10,
      thoughtWindow: 4,
      maxCapannello: opts.max ?? 4,
      maxTokens: { plan: 400, think: 250, speak: 200, move: 500, seat: 250, murder: 300, "star-pass": 1800, "claims-pass": 1000, "sweep-reask": 1800, "thought-pass": 600, "perception-pass": 800, "knowledge-check": 300 },
      playTemperature: 0.7,
      systemTemperature: 0,
      checks: [],
      notebook: "perceived",
    },
    caller,
  );
  // The engine's internals, for building a seating by hand.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const x = g as any;
  x.turn = 1;
  for (const m of groups) x.newConversation("capannello", m);
  const convOf = (c: CharacterName) => x.convs.get(x.chars.get(c).conversation);
  return {
    g,
    x,
    calls,
    /** Open Capannelli, as sorted member lists. */
    groups: (): string[][] => [...x.convs.values()].filter((c: { open: boolean; kind: string }) => c.open && c.kind === "capannello").map((c: { members: string[] }) => [...c.members].sort()).sort((a: string[], b: string[]) => a.join().localeCompare(b.join())),
    convOf,
    /** A movement window's choice, as the engine applies it (TD v0.23). */
    move: (mover: CharacterName, choice: "join" | "colloquio", target: CharacterName) => x.moveSeated(mover, choice, target) as Promise<void>,
    /** Ends the Colloquio this guest is in, as after its closing think. */
    end: (c: CharacterName) => x.endColloquio(convOf(c), "ended") as Promise<void>,
    events: (type: string): GameEvent[] => g.events.filter((e) => e.type === type),
  };
}

const sorted = (...xs: CharacterName[][]) => xs.map((m) => [...m].sort()).sort((a, b) => a.join().localeCompare(b.join()));
const seat = (target: string | null, choice?: string) => ({ thought: "Where now.", ...(choice && { choice }), target });

// ---- Lone guests -------------------------------------------------------------------------------------

test("lone guests, in the order they arose: 2+ open groups → a seat call; exactly one → joins it, no call ('only one open')", async () => {
  const s = seated([[L, G], [I, A], [F, R]], [seat("Contessa Isabella")]);
  await s.move(G, "colloquio", F); // leaves Lupo alone, then Raffaello
  const lone = s.events("seat").filter((e) => e.form === "lone");
  assert.equal(lone.length, 2);
  assert.equal(lone[0]!.character, L);
  assert.equal(lone[0]!.rule, "call");
  assert.equal((lone[0]!.offered as unknown[]).length, 2, "both other open groups offered");
  assert.equal(lone[1]!.character, R);
  assert.equal(lone[1]!.rule, "only one open");
  assert.equal(s.calls.filter((c) => c.kind === "seat").length, 1, "no call for the one-open case");
  assert.deepEqual(s.groups(), sorted([I, A, L, R]));
  // Old Capannelli close for good at zero guests.
  assert.equal(s.events("capannello-closed").length, 2);
});

test("a lone guest with no other open group stays; their Capannello of one takes the next returner", async () => {
  const s = seated([[L, G, R], [I, A, F]], [seat("Lupo", "join")], { max: 3 });
  await s.move(G, "colloquio", R);
  const stays = s.events("seat").filter((e) => e.form === "lone");
  assert.equal(stays.length, 1);
  assert.equal(stays[0]!.rule, "none open, stays");
  assert.equal(s.calls.length, 0);
  // The invitee is offered Lupo's group of one, joins it, and Giorgia goes back to her own (snapshot: Lupo, Raffaello).
  await s.end(G);
  assert.deepEqual(s.groups(), sorted([L, G, R], [I, A, F]));
  const initiator = s.events("seat").find((e) => e.form === "initiator")!;
  assert.equal(initiator.rule, "own Capannello");
});

test("seat call: the lone-guest form, with block 5 outside a conversation, block 8 as WHAT YOU LAST HEARD, and ~250 max tokens", async () => {
  const s = seated([[L, G], [I, A], [F, R]], [seat("Contessa Isabella")]);
  await s.move(G, "colloquio", F);
  const req = s.calls[0]!;
  assert.equal(req.maxTokens, 250);
  assert.match(req.user, /TASK: FIND A SEAT\nEveryone else here has gone, and you stand alone\./);
  assert.match(req.user, /Groups with room:\n- Contessa Isabella, Captain Armand LeNoir \(room for 2\)\n- Raffaello de' Medici \(room for 3\)/);
  assert.match(req.user, /You are in the gathering\.\nPresent: no one; you decide alone/);
  assert.match(req.user, /WHAT YOU LAST HEARD\n/);
  assert.ok(!req.user.includes("THE CONVERSATION SO FAR"));
  assert.match(req.user, /Reply with only this JSON:\n\{"thought": "\.\.\.", "target": "\.\.\."\}$/);
});

test("seat validation: an invalid target uses the default at once (a repair, no retry); a parse failure retries", async () => {
  // Invalid: Francesco is in a Colloquio, not in a group with room. Default: fewest guests (Raffaello's group of one).
  const s = seated([[L, G], [I, A], [F, R]], [seat("Francesco Pazzi")]);
  await s.move(G, "colloquio", F);
  const lone = s.events("seat").find((e) => e.character === L)!;
  assert.match(lone.rule as string, /^default \(target not in another group with room\): fewest guests$/);
  assert.equal(s.calls.length, 1, "no retry");
  assert.deepEqual(s.g.calls[0]!.repairs, ["seatInvalid"]);
  assert.deepEqual(s.groups(), sorted([I, A], [L, R]));

  // A parse failure (prose) retries once; a second failure uses the default.
  const t = seated([[L, G], [I, A], [F, R]], ["Not JSON.", "Still not."]);
  await t.move(G, "colloquio", F);
  assert.equal(t.calls.length, 2);
  assert.match(t.events("seat").find((e) => e.character === L)!.rule as string, /^default \(call failed\)/);
});

// ---- The invitee --------------------------------------------------------------------------------------

test("invitee joins a group; the initiator goes back to their own (not dissolved, room)", async () => {
  const s = seated([[L, G, I], [A, F, R]], [seat("Francesco Pazzi", "join")]);
  await s.move(L, "colloquio", A);
  await s.end(A);
  const req = s.calls[0]!;
  assert.match(req.user, /Your private word with Lupo is over\./);
  assert.match(req.user, /- Giorgia Pazzi, Contessa Isabella \(room for 2\) — Lupo came from here/);
  const [inv, ini] = s.events("seat");
  assert.equal(inv!.form, "invitee");
  assert.equal(inv!.choice, "join");
  assert.equal(ini!.form, "initiator");
  assert.equal(ini!.rule, "own Capannello");
  assert.deepEqual(s.groups(), sorted([L, G, I], [A, F, R]));
});

test("invitee calls a free Colloquio: Il Notaio tells the target's group, both withdrawals count, the chain continues", async () => {
  const s = seated([[L, G, I], [A, F, R]], [seat("Giorgia Pazzi", "colloquio")]);
  await s.move(L, "colloquio", A);
  await s.end(A);
  const open = s.events("colloquio-open");
  assert.equal(open.length, 2);
  assert.deepEqual([open[1]!.initiator, open[1]!.invitee, open[1]!.chain, open[1]!.position, open[1]!.free, open[1]!.snapshot], [A, G, "K1", 2, true, null]);
  assert.equal(s.x.chars.get(A).withdrawals, 2);
  assert.equal(s.x.chars.get(G).withdrawals, 1);
  const note = s.g.lines.filter((l) => l.kind === "notaio" && l.text.includes("drawing another aside — this time Giorgia Pazzi"));
  assert.equal(note.length, 1);
  assert.deepEqual([...note[0]!.heardBy].sort(), [I, G].sort(), "the target's group only");
  // Lupo goes back to his own Capannello: Isabella is still in it.
  assert.deepEqual(s.groups(), sorted([I, L], [F, R]));
  assert.equal(s.convOf(A).kind, "colloquio");
});

test("invitee waits when no group has room (wait form); both go seatless and pair into a new Capannello", async () => {
  const s = seated([[L, G], [A, F], [I, R]], [seat(null, "wait")], { max: 2 });
  await s.move(L, "colloquio", A); // Giorgia and Francesco are left alone; Giorgia joins Francesco (only one open)
  assert.deepEqual(s.groups(), sorted([F, G], [I, R]));
  await s.end(A);
  const req = s.calls[0]!;
  assert.match(req.user, /Groups with room:\nNone: every group is full\./);
  assert.match(req.user, /"wait" {7}no group has room, so you and Lupo will form a new group together/);
  assert.ok(!/"join" {7}join the group/.test(req.user));
  assert.match(req.user, /exactly as written in "All living guests besides you"\. null if you wait\./);
  const ini = s.events("seat").find((e) => e.form === "initiator")!;
  assert.equal(ini.reason, "own dissolved");
  assert.equal(ini.rule, "seatless");
  const pair = s.events("seatless-pair");
  assert.equal(pair.length, 1);
  assert.deepEqual(pair[0]!.members, [A, L], "in the order they became seatless");
  assert.deepEqual(s.groups(), sorted([A, L], [F, G], [I, R]));
});

test("invitee calls the initiator back: the initiator becomes the new invitee and isn't placed ('called back')", async () => {
  const s = seated([[L, G, I], [A, F, R]], [seat("Lupo", "colloquio")]);
  await s.move(L, "colloquio", A);
  await s.end(A);
  const open = s.events("colloquio-open")[1]!;
  assert.deepEqual([open.initiator, open.invitee, open.chain, open.position, open.note], [A, L, "K1", 2, "called back"]);
  assert.equal(s.events("seat").filter((e) => e.form === "initiator").length, 0);
  assert.equal(s.events("seat")[0]!.note, "called back");
  assert.equal(s.convOf(L), s.convOf(A));
});

test("invitee: wait while a group has room is invalid → the default (placed as an initiator would be)", async () => {
  const s = seated([[L, G, I], [A, F, R]], [seat(null, "wait")]);
  await s.move(L, "colloquio", A);
  await s.end(A);
  const inv = s.events("seat")[0]!;
  assert.match(inv.rule as string, /^default \(wait while a group has room\): /);
  assert.equal(inv.asked, "wait");
  assert.notEqual(s.convOf(A).kind, "colloquio");
});

// ---- The initiator ------------------------------------------------------------------------------------

test("initiator: own group full because the invitee took the last seat → the open group with the fewest guests", async () => {
  const s = seated([[L, G, I], [A, F, R]], [seat("Giorgia Pazzi", "join")], { max: 3 });
  await s.move(L, "colloquio", A);
  await s.end(A);
  const ini = s.events("seat").find((e) => e.form === "initiator")!;
  assert.equal(ini.reason, "own full");
  assert.equal(ini.rule, "fewest guests");
  // The groups as offered, before the initiator took the seat (CC-20261028-08: was logged after).
  assert.deepEqual(ini.offered, [{ conversation: s.convOf(F).id, members: [F, R], room: 1 }]);
  assert.deepEqual(s.groups(), sorted([A, G, I], [F, L, R]));
});

test("the record keeps each moment: snapshots and the opening groups copy members, not share them (CC-20261028-08)", async () => {
  const s = seated([], []);
  s.x.openCapannelli();
  const opening = structuredClone(s.events("capannelli")[0]!.groups);
  s.x.snapshot("before");
  const before = structuredClone(s.x.snapshots[0].conversations);
  // A seat pushed into a group later (as a lone guest's or a returner's) must not reach back.
  const [c1, c2] = [...s.x.convs.values()];
  c1.members.push(c2.members[0]);
  assert.deepEqual(s.events("capannelli")[0]!.groups, opening);
  assert.deepEqual(s.x.snapshots[0].conversations, before);
});

test("initiator: own group dissolved because it emptied (closed for good)", async () => {
  const s = seated([[L, A], [G, I], [F, R]], [seat("Giorgia Pazzi", "join")]);
  await s.move(L, "colloquio", A);
  assert.equal(s.events("capannello-closed").length, 1);
  await s.end(A);
  const ini = s.events("seat").find((e) => e.form === "initiator")!;
  assert.equal(ini.reason, "own dissolved");
  assert.equal(ini.rule, "fewest guests");
  assert.deepEqual(s.groups(), sorted([A, G, I], [F, L, R]));
});

test("initiator: own group dissolved because only newcomers remain (the snapshot's guests have all left)", async () => {
  const s = seated([[L, G, I], [A, F, R]], [seat("Raffaello de' Medici", "join")]);
  await s.move(L, "colloquio", A); // snapshot: Giorgia, Isabella
  const own = s.convOf(G);
  // Francesco joins Lupo's old group; then Giorgia and Isabella leave it for Raffaello's.
  s.x.joinGroup(F, own);
  s.x.joinGroup(G, s.convOf(R));
  s.x.joinGroup(I, s.convOf(R));
  assert.deepEqual(own.members, [F]);
  await s.end(A);
  const ini = s.events("seat").find((e) => e.form === "initiator")!;
  assert.equal(ini.reason, "own dissolved");
  assert.equal(own.open, true, "still open, with a newcomer");
  assert.deepEqual(s.groups(), sorted([A, G, I, R], [F, L]));
});

/** A free Colloquio between Lupo (its caller) and LeNoir, so Lupo is placed as if his group had dissolved (Edge case (a)). */
function freeColloquio(groups: CharacterName[][], seed = 7) {
  const s = seated(groups, [], { seed });
  const conv = s.x.newConversation("colloquio", [L, A]);
  conv.seating = { initiator: L, invitee: A, snapshot: null, chain: "K1", position: 2, free: true };
  s.x.placeInitiator(conv, conv.seating);
  return { s, ini: s.events("seat").find((e) => e.form === "initiator")! };
}

test("tie-breaks: fewest guests, then fewest of the initiator's own faction, then at random (seeded); a free Colloquio's caller as if dissolved", () => {
  const fewest = freeColloquio([[I, R, G], [F]]);
  assert.deepEqual([fewest.ini.reason, fewest.ini.rule, fewest.ini.to], ["free Colloquio caller", "fewest guests", fewest.s.convOf(F).id]);
  // Lupo is Pazzi: [Isabella, Raffaello] has none, [Giorgia, Francesco] two.
  const faction = freeColloquio([[I, R], [G, F]]);
  assert.deepEqual([faction.ini.rule, faction.ini.to], ["fewest of own faction", faction.s.convOf(I).id]);
  // One Pazzi in each: at random, from the seed.
  const a = freeColloquio([[I, G], [R, F]], 11);
  const b = freeColloquio([[I, G], [R, F]], 11);
  assert.equal(a.ini.rule, "random");
  assert.equal(a.ini.to, b.ini.to, "same seed, same draw");
  const draws = new Set([3, 4, 5, 6, 7, 8, 9, 10].map((seed) => freeColloquio([[I, G], [R, F]], seed).s.convOf(L).members.includes(I)));
  assert.equal(draws.size, 2, "both groups are drawn across seeds");
});

// ---- Chains, waiting calls and joins ------------------------------------------------------------------

test("chain IDs across a three-link chain; a free Colloquio's caller is placed as if dissolved; a new call starts a new chain", async () => {
  const s = seated([[L, G, I], [A, F, R]], [seat("Giorgia Pazzi", "colloquio"), seat("Francesco Pazzi", "colloquio"), seat("Contessa Isabella", "join")]);
  await s.move(L, "colloquio", A); // K1, 1
  await s.end(A); // LeNoir calls Giorgia: K1, 2
  await s.end(G); // Giorgia calls Francesco: K1, 3
  const opens = s.events("colloquio-open");
  assert.deepEqual(opens.map((e) => [e.chain, e.position, e.free]), [["K1", 1, false], ["K1", 2, true], ["K1", 3, true]]);
  const closes = s.events("colloquio-close");
  assert.deepEqual(closes.map((e) => [e.chain, e.position]), [["K1", 1], ["K1", 2]]);
  // LeNoir called Giorgia freely, so he had no Capannello to go back to.
  const lenoir = s.events("seat").find((e) => e.form === "initiator" && e.character === A)!;
  assert.equal(lenoir.reason, "free Colloquio caller");
  await s.end(F); // Francesco joins Isabella's group; Giorgia placed as a free caller
  assert.deepEqual(s.events("colloquio-close").at(-1)!.chain, "K1");
  await s.move(R, "colloquio", I);
  assert.deepEqual([s.events("colloquio-open").at(-1)!.chain, s.events("colloquio-open").at(-1)!.position], ["K2", 1]);
});

test("a Colloquio call waiting on a guest opens before seating: they go straight in as its invitee, with no seat call", async () => {
  const s = seated([[L, G, I], [A, F, R]], []);
  await s.move(L, "colloquio", A);
  await s.move(R, "colloquio", A); // LeNoir is in a Colloquio: Raffaello's call waits
  assert.equal(s.events("colloquio-waits").length, 1);
  assert.equal(s.events("colloquio-waits")[0]!.chain, "K1");
  await s.end(A);
  assert.equal(s.calls.length, 0, "LeNoir skips the seat call");
  const open = s.events("colloquio-open").at(-1)!;
  assert.deepEqual([open.initiator, open.invitee, open.waited, open.chain, open.position], [R, A, true, "K2", 1]);
  // Il Notaio's note goes to the caller's group; Lupo is placed by code, back to his own group.
  assert.ok(s.g.lines.some((l) => l.kind === "notaio" && l.text.includes("drew Captain Armand LeNoir aside") && l.heardBy.includes(F) && !l.heardBy.includes(L)));
  assert.equal(s.events("seat").find((e) => e.form === "initiator")!.rule, "own Capannello");
  assert.equal(s.convOf(A), s.convOf(R));
});

test("a join toward a guest in a Colloquio waits, then goes to their group once they're seated", async () => {
  const s = seated([[L, G, I], [A, F, R]], [seat("Contessa Isabella", "join")]);
  await s.move(L, "colloquio", A);
  await s.move(R, "join", A);
  assert.equal(s.events("join-waits").length, 1);
  assert.equal(s.convOf(R), s.convOf(F), "Raffaello stays put while he waits");
  await s.end(A);
  const resolved = s.events("join-resolved");
  assert.equal(resolved.length, 1);
  assert.equal(s.convOf(R), s.convOf(A), "Raffaello joined LeNoir's new group");
  // Lupo went back too, so the group was full: the usual collision rule moves its lowest-importance guest to Raffaello's old group.
  assert.deepEqual(s.groups(), sorted([I, A, L, R], [F, G]));
});

test("a waiting join lapses if the target isn't seated by the end of the next turn; the mover stays", async () => {
  const s = seated([[L, G, I], [A, F, R]], [seat("Contessa Isabella", "join")]);
  await s.move(L, "colloquio", A);
  await s.move(R, "join", A);
  s.x.turn = 1;
  await s.x.turnEndSeating();
  assert.equal(s.events("join-lapsed").length, 0, "not in the turn it was made");
  s.x.turn = 2;
  await s.x.turnEndSeating();
  assert.equal(s.events("join-lapsed").length, 1);
  assert.equal(s.convOf(R), s.convOf(F));
  await s.end(A);
  assert.equal(s.events("join-resolved").length, 0);
});

// ---- The old path -------------------------------------------------------------------------------------

test("TD v0.21 keeps the interim rule: a lone guest joins the fullest other group at once, no seat call, nothing closes", async () => {
  const s = seated([[L, G], [I, A], [F, R]], [], { td: "0.21" });
  s.x.openColloquio(G, F); // Lupo and Raffaello left alone
  assert.equal(s.calls.length, 0);
  assert.deepEqual(s.events("lone-guest-join").map((e) => e.character), [L, R]);
  assert.equal(s.events("seat").length + s.events("capannello-closed").length, 0);
  assert.deepEqual(s.groups(), sorted([], [], [I, A, L, R]), "the emptied Capannelli stay open with no guests");
  // The close returns both to the Capannelli they left, even empty ones; Giorgia, alone again, joins Francesco.
  s.x.closeColloquio(s.convOf(G), "ended");
  assert.deepEqual(s.groups(), sorted([], [I, A, L, R], [F, G]));
  assert.equal(s.events("colloquio-open")[0]!.chain, undefined, "no chains before v0.23");
  assert.equal(s.calls.length, 0);
});

test("the Seating health metric, from a game's events (and the interim rule's joins on an older record)", async () => {
  const s = seated([[L, G], [A, F], [I, R]], [seat(null, "wait")], { max: 2 });
  await s.move(L, "colloquio", A);
  await s.end(A);
  assert.deepEqual(seatingHealth(s.g.events), {
    loneGuestMoves: 1,
    loneGuestStays: 0,
    inviteeChoices: { join: 0, colloquio: 0, wait: 1, calledBack: 0, defaulted: 0 },
    displacedInitiators: { full: 0, dissolved: 1, freeCaller: 0 },
    seatlessPairs: 1,
    lapsedJoins: 0,
    chainLengths: [1],
  });
  const chain = seated([[L, G, I], [A, F, R]], [seat("Lupo", "colloquio"), seat("Giorgia Pazzi", "colloquio"), seat("Francesco Pazzi", "join")]);
  await chain.move(L, "colloquio", A);
  await chain.end(A); // LeNoir calls Lupo back
  await chain.end(L); // Lupo calls Giorgia
  const h = seatingHealth(chain.g.events);
  assert.deepEqual([h.chainLengths, h.inviteeChoices.calledBack, h.inviteeChoices.colloquio], [[3], 1, 2]);
  assert.equal(seatingHealth([{ type: "lone-guest-join" }, { type: "lone-guest-join" }]).loneGuestMoves, 2);
});
