// The rules module against Game Mechanics v0.31 (CC-20261111-07, #71; TD v0.39, Layers: "rules tests
// from Mechanics' examples"). Each table is named for the Mechanics section its cases come from. The
// fixtures use the setting's names; the rules see only names, faction ids, and roles.

import assert from "node:assert/strict";
import { test } from "node:test";
import { mechanicsPath } from "../probe.config.ts";
import { rulesGuest } from "../src/game/roster.ts";
import { ballotProblems, runoffProblem } from "../src/rules/ballot.ts";
import type { RulesConfig } from "../src/rules/config.ts";
import { allowedActionTypes, borrow, bribe, newEconomy, rejectAction, repay, seesLedger } from "../src/rules/economy.ts";
import { actProblems, extraActProblems, resolveMidnight, type Act, type CheckedAct, type Submission } from "../src/rules/midnight.ts";
import { capannelloStart, fallbackTarget, movementWindow } from "../src/rules/movement.ts";
import { mulberry32 } from "../src/rules/random.ts";
import { fewestGuests, initiatorSeat, inviteeSeatProblem, leastInvolved, loneSeatOptions, openGroups, returnSeat, type Group } from "../src/rules/seating.ts";
import { loadDocs, readDoc } from "../src/sources/docs.ts";

const MECHANICS = mechanicsPath("0.31");
const tunables = loadDocs({ technicalDesign: "docs/Gonfaloniere_Technical_Design_v0.39.md", characters: "docs/Gonfaloniere_Characters_v0.11.md", mechanics: MECHANICS, modelsResearch: "docs/Gonfaloniere_Models_Research_v0.52.md" }).tunables;
/** The caller loads the config from Mechanics' Tunable Values; the rules never read it. */
const config: RulesConfig = { startingFlorins: tunables.starting_florins, income: tunables.income, pensionSize: tunables.pension_size, treasury: tunables.embassy_treasury, colloquioCap: tunables.colloquio_cap, maxCapannello: 4 };
/** Mechanics' Tunable Values: "Guards / Investigations needed to block | 2 or more". */
const blockAt = Number(readDoc(MECHANICS).match(/^\| Guards \/ Investigations needed to block \| (\d+)/m)![1]);

const LUPO = "Lupo";
const ISABELLA = "Contessa Isabella";
const LENOIR = "Captain Armand LeNoir";
const FRANCESCO = "Francesco Pazzi";
const RAFFAELLO = "Raffaello de' Medici";
const GIORGIA = "Giorgia Pazzi";
const CAST = [LUPO, ISABELLA, LENOIR, FRANCESCO, RAFFAELLO, GIORGIA];
const guests = CAST.map(rulesGuest);
const twoKills = (n: string) => guests.find((g) => g.name === n)!.roles.includes("two kills");
const factionOf = (n: string) => guests.find((g) => g.name === n)!.faction;

test("Tunable Values: the config the caller passes in", () => {
  assert.deepEqual({ ...config, blockAt }, { startingFlorins: 10, income: 1, pensionSize: 3, treasury: 15, colloquioCap: 6, maxCapannello: 4, blockAt: 2 });
  assert.equal(config.treasury % config.pensionSize, 0, "the treasury stays a multiple of the pension size");
});

// ---- Murder Round ---------------------------------------------------------------------------------

const kill = (target: string): Act => ({ type: "kill", target });
const guard = (target: string): Act => ({ type: "guard", target });
const investigate = (target: string): Act => ({ type: "investigate", target });

test("Murder Round: resolution order, guards, investigations, Lupo, and simultaneity", () => {
  const cases: { name: string; subs: Submission[]; deaths: string[]; events?: string[] }[] = [
    { name: "an unopposed Kill kills", subs: [{ by: FRANCESCO, acts: [kill(RAFFAELLO)] }], deaths: [RAFFAELLO] },
    {
      name: "Guarded by 2+ others survives even if attacked",
      subs: [{ by: FRANCESCO, acts: [kill(RAFFAELLO)] }, { by: ISABELLA, acts: [guard(RAFFAELLO)] }, { by: LENOIR, acts: [guard(RAFFAELLO)] }],
      deaths: [],
      events: ["kill foiled"],
    },
    { name: "one Guard isn't enough", subs: [{ by: FRANCESCO, acts: [kill(RAFFAELLO)] }, { by: ISABELLA, acts: [guard(RAFFAELLO)] }], deaths: [RAFFAELLO] },
    {
      name: "Investigated by 2+ others can't carry out their Kill",
      subs: [{ by: FRANCESCO, acts: [kill(RAFFAELLO)] }, { by: ISABELLA, acts: [investigate(FRANCESCO)] }, { by: GIORGIA, acts: [investigate(FRANCESCO)] }],
      deaths: [],
      events: ["kill blocked"],
    },
    { name: "one Investigation isn't enough", subs: [{ by: FRANCESCO, acts: [kill(RAFFAELLO)] }, { by: ISABELLA, acts: [investigate(FRANCESCO)] }], deaths: [RAFFAELLO] },
    {
      name: "investigations come first: a blocked Kill is blocked, guards or not",
      subs: [{ by: FRANCESCO, acts: [kill(RAFFAELLO)] }, { by: ISABELLA, acts: [investigate(FRANCESCO)] }, { by: GIORGIA, acts: [investigate(FRANCESCO)] }, { by: LENOIR, acts: [guard(RAFFAELLO)] }, { by: LUPO, acts: [] }],
      deaths: [],
      events: ["kill blocked"],
    },
    {
      name: "Lupo's two Kills can't be blocked by Guards or Investigations",
      subs: [{ by: LUPO, acts: [kill(RAFFAELLO), kill(LENOIR)] }, { by: ISABELLA, acts: [investigate(LUPO)] }, { by: GIORGIA, acts: [investigate(LUPO)] }, { by: FRANCESCO, acts: [guard(LENOIR)] }, { by: RAFFAELLO, acts: [guard(LENOIR)] }],
      deaths: [RAFFAELLO, LENOIR],
    },
    {
      name: "simultaneous: a guest killed tonight still has their own act carried out",
      subs: [{ by: FRANCESCO, acts: [kill(RAFFAELLO)] }, { by: RAFFAELLO, acts: [kill(GIORGIA)] }],
      deaths: [RAFFAELLO, GIORGIA],
    },
    { name: "several Kills on one guest are one death", subs: [{ by: FRANCESCO, acts: [kill(ISABELLA)] }, { by: LUPO, acts: [kill(ISABELLA)] }], deaths: [ISABELLA], events: ["death"] },
    { name: "nothing submitted, nothing done", subs: [], deaths: [] },
  ];
  for (const c of cases) {
    const r = resolveMidnight(c.subs, twoKills, { blockAt });
    assert.deepEqual(r.deaths, c.deaths, c.name);
    if (c.events) assert.deepEqual(r.events.map((e) => e.type), c.events, c.name);
  }
});

test("Murder Round: which acts a guest may submit (the check strategy.ts words)", () => {
  const act = (type: Act["type"], target: string, o: Partial<CheckedAct> = {}): CheckedAct => ({ type, target, self: false, living: true, ...o });
  const cases: { name: string; twoKills: boolean; acts: CheckedAct[]; problems: string[] }[] = [
    { name: "exactly one act", twoKills: false, acts: [act("guard", ISABELLA)], problems: [] },
    { name: "two acts without the role", twoKills: false, acts: [act("kill", ISABELLA), act("guard", LENOIR)], problems: ["count"] },
    { name: "a character can't Guard themselves", twoKills: false, acts: [act("guard", FRANCESCO, { self: true, living: false })], problems: ["self"] },
    { name: "the target must be a living guest", twoKills: false, acts: [act("kill", "Lorenzo", { living: false })], problems: ["not living"] },
    { name: "Lupo: one or two Kills", twoKills: true, acts: [act("kill", ISABELLA), act("kill", LENOIR)], problems: [] },
    { name: "Lupo may not Guard or Investigate", twoKills: true, acts: [act("guard", ISABELLA)], problems: ["only kills"] },
    { name: "Lupo: three acts are too many", twoKills: true, acts: [act("kill", ISABELLA), act("kill", LENOIR), act("kill", GIORGIA)], problems: ["count"] },
    { name: "all of a character's acts name different guests (Lupo's two Kills included)", twoKills: true, acts: [act("kill", ISABELLA), act("kill", ISABELLA)], problems: ["same guest"] },
  ];
  for (const c of cases) assert.deepEqual(actProblems(c.twoKills, c.acts).map((p) => p.why), c.problems, c.name);
  assert.deepEqual(guests.filter((g) => twoKills(g.name)).map((g) => g.name), [LUPO], "the role comes from the setting, not a name in the rules");
});

test("Plot Reward: the extra act's checks (block 9e's `extra`) and how it resolves", () => {
  const act = (type: Act["type"], target: string, o: Partial<CheckedAct> = {}): CheckedAct => ({ type, target, self: false, living: true, ...o });
  const checks: { name: string; acts: CheckedAct[]; extra: CheckedAct; problems: string[] }[] = [
    { name: "a second act on a different guest", acts: [act("kill", ISABELLA)], extra: act("guard", LENOIR), problems: [] },
    { name: "the two acts must name different characters", acts: [act("guard", RAFFAELLO)], extra: act("guard", RAFFAELLO), problems: ["same guest"] },
    { name: "no self-guard: the extra act can't Guard yourself either", acts: [act("kill", ISABELLA)], extra: act("guard", FRANCESCO, { self: true, living: false }), problems: ["self"] },
    { name: "a living guest", acts: [act("kill", ISABELLA)], extra: act("investigate", "Lorenzo", { living: false }), problems: ["not living"] },
    { name: "Lupo's extra act may be a Guard or Investigate", acts: [act("kill", ISABELLA), act("kill", LENOIR)], extra: act("investigate", GIORGIA), problems: [] },
    { name: "Lupo's extra act names a guest his Kills don't", acts: [act("kill", ISABELLA), act("kill", LENOIR)], extra: act("kill", LENOIR), problems: ["same guest"] },
  ];
  for (const c of checks) assert.deepEqual(extraActProblems(c.acts, c.extra).map((p) => p.why), c.problems, c.name);
  const cases: { name: string; subs: Submission[]; deaths: string[]; events?: string[] }[] = [
    { name: "an extra Kill kills like any", subs: [{ by: FRANCESCO, acts: [guard(LENOIR)], extra: kill(RAFFAELLO) }], deaths: [RAFFAELLO] },
    {
      name: "an extra Guard counts toward the 2+ threshold like anyone else's",
      subs: [{ by: LUPO, acts: [kill(GIORGIA)] }, { by: FRANCESCO, acts: [kill(RAFFAELLO)] }, { by: ISABELLA, acts: [guard(RAFFAELLO)], extra: guard(GIORGIA) }, { by: LENOIR, acts: [guard(RAFFAELLO)] }],
      deaths: [GIORGIA],
      events: ["kill foiled", "death"],
    },
    {
      name: "Lupo's extra Kill follows normal rules: Guards stop it, his own two don't",
      subs: [{ by: LUPO, acts: [kill(ISABELLA), kill(LENOIR)], extra: kill(RAFFAELLO) }, { by: FRANCESCO, acts: [guard(RAFFAELLO)] }, { by: GIORGIA, acts: [guard(RAFFAELLO)] }],
      deaths: [ISABELLA, LENOIR],
      events: ["kill foiled", "death", "death"],
    },
  ];
  for (const c of cases) {
    const r = resolveMidnight(c.subs, twoKills, { blockAt });
    assert.deepEqual(r.deaths, c.deaths, c.name);
    if (c.events) assert.deepEqual(r.events.map((e) => e.type), c.events, c.name);
  }
});

// ---- Commands & Public Actions, Florin Economy ------------------------------------------------------

test("Florin Economy: everyone starts with 10 Florins and one round's income, no pensions, a treasury of 5 pensions", () => {
  const e = newEconomy(guests, config, 1);
  assert.deepEqual([...e.purse.values()], CAST.map(() => 11));
  assert.deepEqual([...e.pensions.values()], CAST.map(() => 0));
  assert.equal(e.treasury, 15);
  assert.equal(newEconomy(guests, config, 3).purse.get(LUPO), 13, "3 Florins of income over a full game");
});

test("/borrow: anyone but Dominicans and the French Embassy, while the treasury holds one pension", () => {
  const ctx = (name: string, treasury = 15) => ({ pension: rulesGuest(name).pension, florins: 11, pensionSize: 3, treasury, colloquioWith: null });
  const cases: [string, number, boolean][] = [
    [FRANCESCO, 15, true],
    [RAFFAELLO, 15, true],
    [ISABELLA, 15, false],
    [LENOIR, 15, false],
    [FRANCESCO, 3, true],
    [FRANCESCO, 2, false],
  ];
  for (const [name, treasury, can] of cases) assert.equal(allowedActionTypes(ctx(name, treasury)).includes("borrow"), can, `${name}, treasury ${treasury}`);
  const e = newEconomy(guests, config);
  assert.deepEqual(borrow(e, FRANCESCO, 3), { type: "pension taken", holder: FRANCESCO, amount: 3, purse: 14 });
  borrow(e, FRANCESCO, 3);
  assert.deepEqual([e.purse.get(FRANCESCO), e.pensions.get(FRANCESCO), e.ledger.get(FRANCESCO), e.treasury], [17, 2, 2, 9], "a character may hold several pensions");
  assert.ok(seesLedger(rulesGuest(LENOIR).pension) && !seesLedger(rulesGuest(FRANCESCO).pension), "the ledger is open to the whole Embassy");
});

test("/repay: exactly one pension, your own or a faction member's, never partial", () => {
  const e = newEconomy(guests, config);
  borrow(e, FRANCESCO, 3);
  borrow(e, RAFFAELLO, 3);
  const cases: { name: string; by: string; holder: string; purse?: number; result: string }[] = [
    { name: "not family: refused", by: FRANCESCO, holder: RAFFAELLO, result: "pension refused" },
    { name: "no pension held: refused", by: GIORGIA, holder: GIORGIA, result: "pension refused" },
    { name: "a relative's pension", by: GIORGIA, holder: FRANCESCO, result: "pension renounced" },
    { name: "no partial repayment: 2 Florins can't repay", by: RAFFAELLO, holder: RAFFAELLO, purse: 2, result: "pension refused" },
    { name: "your own", by: RAFFAELLO, holder: RAFFAELLO, purse: 3, result: "pension renounced" },
  ];
  for (const c of cases) {
    if (c.purse !== undefined) e.purse.set(c.by, c.purse);
    assert.equal(repay(e, c.by, c.holder, 3).type, c.result, c.name);
  }
  assert.deepEqual([e.treasury, e.ledger.get(FRANCESCO), e.pensions.get(FRANCESCO), e.purse.get(GIORGIA)], [15, 0, 0, 8], "the Florins go back to the treasury");
  assert.equal(allowedActionTypes({ pension: "can't take", florins: 2, pensionSize: 3, treasury: 15, colloquioWith: null }).includes("repay"), false);
});

test("/bribe: a plain transfer, in a Colloquio only, of a positive amount you have", () => {
  const ctx = { pension: rulesGuest(ISABELLA).pension, florins: 11, pensionSize: 3, treasury: 15 };
  assert.equal(allowedActionTypes({ ...ctx, colloquioWith: null }).includes("bribe"), false, "not in a Capannello");
  const allowed = allowedActionTypes({ ...ctx, colloquioWith: LUPO });
  assert.ok(allowed.includes("bribe"));
  assert.equal(allowedActionTypes({ ...ctx, florins: 0, colloquioWith: LUPO }).includes("bribe"), false, "nothing to give");
  assert.deepEqual(rejectAction({ type: "bribe", amount: 0 }, allowed, 11), { why: "not positive", amount: 0 });
  assert.deepEqual(rejectAction({ type: "bribe", amount: 12 }, allowed, 11), { why: "exceeds purse", amount: 12, purse: 11 });
  assert.deepEqual(rejectAction({ type: "borrow" }, allowed, 11), { why: "not allowed", type: "borrow" });
  const e = newEconomy(guests, config);
  assert.deepEqual(bribe(e, ISABELLA, LUPO, 4), { type: "payment", from: ISABELLA, to: LUPO, amount: 4 });
  assert.deepEqual([e.purse.get(ISABELLA), e.purse.get(LUPO)], [7, 15]);
});

// ---- Capannello Initialization, Movement, Conversation Types --------------------------------------------

test("Capannello Initialization and Movement: random groups of 3, a random order, one window a turn, cycling", () => {
  const a = capannelloStart(CAST, mulberry32(2000));
  assert.deepEqual(a, capannelloStart(CAST, mulberry32(2000)), "the same seed, the same evening");
  assert.deepEqual(a.groups.map((g) => g.length), [3, 3]);
  assert.deepEqual([...a.groups.flat()].sort(), [...CAST].sort());
  assert.deepEqual([...a.rotation].sort(), [...CAST].sort());
  assert.deepEqual([1, 2, 6, 7].map((t) => movementWindow(a.rotation, t)), [a.rotation[0], a.rotation[1], a.rotation[5], a.rotation[0]]);
  assert.equal(fallbackTarget([{ name: LUPO, urgency: 20 }, { name: ISABELLA, urgency: 80 }, { name: LENOIR, urgency: 80 }]), ISABELLA, "the most urgent contact, the first on a tie");
  assert.equal(fallbackTarget([]), null, "no contact: stay");
});

const g = (id: string, members: string[], o: Partial<Group> = {}): Group => ({ id, kind: "capannello", open: true, members, ...o });

test("Movement, collisions: the guest least involved in the full group moves", () => {
  const importance = new Map([[LUPO, 40], [ISABELLA, 10], [LENOIR, 10], [GIORGIA, 90]]);
  assert.equal(leastInvolved([LUPO, ISABELLA, LENOIR, GIORGIA], (m) => importance.get(m)!), ISABELLA);
});

test("Ending a Colloquio: the initiator goes back, else to the fewest guests, then the fewest of their faction, then at random", () => {
  const own = g("C1", [GIORGIA, LENOIR]);
  const snapshot = { capannello: "C1", guests: [GIORGIA, LENOIR] };
  const cases: { name: string; snapshot: typeof snapshot | null; own?: Group; seat: string }[] = [
    { name: "back to the Capannello they came from", snapshot, own, seat: "own" },
    { name: "full (the invitee took the last seat)", snapshot, own: g("C1", [GIORGIA, LENOIR, ISABELLA, LUPO]), seat: "own full" },
    { name: "dissolved: no guests left", snapshot, own: g("C1", [], { open: false }), seat: "own dissolved" },
    { name: "dissolved for them: none of the guests they left are there, newcomers or not", snapshot, own: g("C1", [ISABELLA, LUPO]), seat: "own dissolved" },
    { name: "a free Colloquio's caller is placed as if theirs had dissolved", snapshot: null, own, seat: "free Colloquio caller" },
  ];
  for (const c of cases) {
    const r = initiatorSeat(c.snapshot, c.own, 4);
    assert.equal(r.seat === "own" ? "own" : r.reason, c.seat, c.name);
  }
  const rng = mulberry32(1);
  assert.equal(fewestGuests(factionOf(FRANCESCO), [g("A", [LUPO, ISABELLA, LENOIR]), g("B", [RAFFAELLO, GIORGIA])], factionOf, rng)!.group.id, "B", "fewest guests");
  const tie = fewestGuests(factionOf(FRANCESCO), [g("A", [GIORGIA, LENOIR]), g("B", [RAFFAELLO, ISABELLA])], factionOf, rng)!;
  assert.deepEqual([tie.group.id, tie.rule], ["B", "fewest of own faction"]);
  const random = fewestGuests(factionOf(FRANCESCO), [g("A", [LUPO, LENOIR]), g("B", [GIORGIA, ISABELLA])], factionOf, mulberry32(1))!;
  assert.equal(random.rule, "random");
  assert.equal(random.group.id, fewestGuests(factionOf(FRANCESCO), [g("A", [LUPO, LENOIR]), g("B", [GIORGIA, ISABELLA])], factionOf, mulberry32(1))!.group.id, "seeded");
  assert.equal(fewestGuests(LUPO, [], factionOf, rng), null, "no seat: they pair with the next seatless guest");
});

test("Ending a Colloquio: the invitee chooses a Capannello with room or a free Colloquio, and waits only when there's no room", () => {
  const groups = [g("C1", [GIORGIA, LENOIR])];
  const o = { invitee: ISABELLA, groups, living: CAST, inColloquio: (n: string) => n === RAFFAELLO };
  const cases: [string, string | null, string | null][] = [
    ["join", GIORGIA, null],
    ["join", LUPO, "join target not seated with room"],
    ["colloquio", FRANCESCO, null],
    ["colloquio", RAFFAELLO, "colloquio target not free"],
    ["colloquio", ISABELLA, "colloquio target not free"],
    ["wait", null, "wait with room"],
    ["leave", null, "unknown choice"],
  ];
  for (const [choice, target, problem] of cases) assert.equal(inviteeSeatProblem(choice, target, o), problem, `${choice} ${target}`);
  assert.equal(inviteeSeatProblem("wait", null, { ...o, groups: [] }), null, "every Capannello full: waiting is allowed");
  // Before seating (TD < 0.23): back to the Capannello they left, or the smallest open one.
  assert.equal(returnSeat(g("C1", [LUPO, ISABELLA, LENOIR, GIORGIA]), [g("C1", [LUPO, ISABELLA, LENOIR, GIORGIA]), g("C2", [RAFFAELLO])], 4).id, "C2");
});

test("A Capannello Left With One Guest: a free move to a guest in a Capannello with room; none open, they stay", () => {
  const all = [g("C1", [LUPO]), g("C2", [ISABELLA, LENOIR]), g("C3", [FRANCESCO, RAFFAELLO, GIORGIA, "Fra Tommaso"]), g("C4", [], { open: false }), g("K1", ["Sister Beatrice", "Piero de' Medici"], { kind: "colloquio" })];
  const open = openGroups(all, 4, "C1");
  assert.deepEqual(open.map((x) => x.id), ["C2"], "with room, open, a Capannello, and not their own");
  assert.equal(loneSeatOptions(open), "only one open");
  assert.equal(loneSeatOptions([]), "stays");
  assert.equal(loneSeatOptions([g("C2", [ISABELLA, LENOIR]), g("C5", [GIORGIA, FRANCESCO])]), "choose");
});

// ---- The Election (the checks that exist in code) -------------------------------------------------------------

test("The Election: a ballot names a living guest and buys 0 to what the purse allows; a run-off names one of the tied", () => {
  assert.deepEqual(ballotProblems(LUPO, true, 2, 2), []);
  assert.deepEqual(ballotProblems("Lorenzo", false, 3, 2).map((p) => p.why), ["vote not living", "buy out of range"]);
  assert.deepEqual(ballotProblems(LUPO, true, -1, 2).map((p) => p.why), ["buy out of range"]);
  assert.equal(runoffProblem(LUPO, true), null);
  assert.deepEqual(runoffProblem(LUPO, false), { why: "not tied", vote: LUPO });
});
