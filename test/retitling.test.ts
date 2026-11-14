// TD v0.50's In-World Names › Retitling (CC-20261114-16, #143): a French pension became a payroll payment
// that puts a guest on France's payroll, and a Capannello became a group, in every word a character reads,
// loaded only with Characters' payroll version (v0.16). Names only: no rule changes.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { CHARACTERS_BEFORE_PAYROLL, DEFAULT_CHARACTERS, charactersPath, config, docsFor } from "../probe.config.ts";
import type { CharacterName } from "../src/game/roster.ts";
import { castBriefings } from "../src/minigame/cast.ts";
import { MiniGame, type CallRequest, type Caller } from "../src/minigame/engine.ts";
import { isolationCheck } from "../src/minigame/isolation.ts";
import { rulesText } from "../src/prompt/assemble.ts";
import { conversationWords, usesRetitling } from "../src/prompt/names.ts";
import { say } from "../src/setting/pack.ts";
import { loadDocs, type DocSources } from "../src/sources/docs.ts";
import { fakeCaller, fakeSettings, playFakeOn } from "./fixtures/fake-game.ts";

const R = "Raffaello de' Medici" as CharacterName;
const G = "Giorgia Pazzi" as CharacterName;
const A = "Captain Armand LeNoir" as CharacterName;

/** Every prompt of a call list, hashed (as in store.test.ts). */
function promptHash(calls: CallRequest[]): string {
  const h = createHash("sha256");
  for (const c of calls) h.update(`${c.kind}\u0000${c.character}\u0000${c.system}\u0000${c.user}\u0000${c.maxTokens}\u0001`);
  return h.digest("hex");
}

/** The fake game's prompts on TD v0.49 with Characters v0.15, from main before the retitling was built (b3b1907). */
const PROMPTS_V049 = "c067a8a94b6c0ccc816957b7077fcaebaa287e2ac30f39deb770f5670026a526";

const v49docs = loadDocs(docsFor("0.49", "0.15"));
const v50docs = loadDocs(docsFor("0.50", "0.16"));

test("the loader pairs TD 0.50 with Characters 0.16, and refuses TD 0.50 with Characters 0.15 and TD 0.49 with Characters 0.16", () => {
  assert.equal(DEFAULT_CHARACTERS, "0.16");
  assert.equal(CHARACTERS_BEFORE_PAYROLL, "0.15");
  assert.equal(v50docs.retitled, true);
  assert.equal(v50docs.templates.retitled, true);
  assert.equal(v49docs.retitled, false);
  assert.equal("retitled" in v49docs.templates, false, "an older TD's templates are as they were");
  assert.throws(() => loadDocs({ ...docsFor("0.50"), characters: charactersPath("0.15") }), /would mix "pension" and "payroll"/);
  assert.throws(() => loadDocs({ ...docsFor("0.49"), characters: charactersPath("0.16") }), /would mix "pension" and "payroll"/);
  assert.throws(() => usesRetitling({ technicalDesign: "0.34", characters: "0.18" }), /would mix/);
  assert.equal(usesRetitling({ technicalDesign: "0.50", characters: "0.18" }), true, "Characters v0.17 and v0.18 change no briefing, so they pair too");
  assert.equal(usesRetitling({ technicalDesign: "0.49", characters: "0.15" }), false);
  // v0.17 (lore glosses) and v0.18 (the opening's check) leave every briefing as v0.16 wrote it, so v0.16 is the pin.
  const b16 = v50docs.briefings;
  for (const v of ["0.17", "0.18"]) assert.deepEqual(loadDocs(docsFor("0.50", v)).briefings, b16, `Characters v${v}`);
});

test("a game pinned to TD 0.49 builds its old prompts byte for byte", async () => {
  const { calls } = await playFakeOn(v49docs);
  assert.equal(calls.length, 447);
  assert.equal(promptHash(calls), PROMPTS_V049);
});

test("every prompt of a fake game on the new defaults, briefings included, says neither \"pension\" nor \"Capannello\"", async () => {
  if (process.env.PROBE_TD || process.env.PROBE_CHARACTERS) return;
  const docs = loadDocs(config.docs);
  assert.equal(docs.retitled, true);
  for (const [n, b] of Object.entries(docs.briefings)) assert.doesNotMatch(b!, /pension|capannell/i, n);
  assert.doesNotMatch(docs.socialAwareness, /pension|capannell/i);
  const { calls } = await playFakeOn(docs);
  assert.ok(calls.length > 400);
  // Character prompts and the recorder's alike (10a, 10d, the sweep re-ask, 10b, the knowledge check).
  for (const [i, c] of calls.entries()) assert.doesNotMatch(c.system + c.user, /pension|capannell/i, `${c.kind} ${i}`);
  assert.ok(calls.some((c) => /^You are in a group (in .+ )?with /m.test(c.user)), "block 5 says group");
  assert.ok(calls.some((c) => / · group · /.test(c.user)), "block 6 says group");
  assert.ok(calls.some((c) => /^Your purse: \d+ Florins\. On France's payroll: no\.$/m.test(c.user)));
});

test("TD v0.50 with Characters v0.16: every prompt is v0.49's with only the changelogs' changes", async () => {
  const v49 = await playFakeOn(v49docs);
  const v50 = await playFakeOn(v50docs);
  const key = (cs: CallRequest[]) => cs.map((c) => `${c.kind}|${c.character}`);
  assert.deepEqual(key(v50.calls), key(v49.calls), "the same calls");
  // Names only: play and memory don't change.
  const plain = (g: MiniGame) => ({ lines: g.lines, readings: g.memory.readings, beliefs: g.memory.beliefs, entries: g.memory.entries });
  assert.deepEqual(plain(v50.game), plain(v49.game));

  const rules = { ...v50docs.tunables, plotProtection: false, plotReward: false };
  const b15 = v49docs.briefings;
  const b16 = v50docs.briefings;
  const counts: Record<string, number> = {};
  const swap = (name: string, re: RegExp, to: string) => (t: string) => {
    const out = t.replace(re, to);
    if (out !== t) counts[name] = (counts[name] ?? 0) + 1;
    return out;
  };
  const amount = v50docs.tunables.pension_size;
  const steps = [
    // Characters v0.16: ten lines in nine briefings say "payroll" (the cast's five changed briefings here).
    (t: string) => {
      const out = Object.keys(b16).reduce((x, n) => x.split(b16[n as CharacterName]!).join(b15[n as CharacterName]!), t);
      if (out !== t) counts.briefing = (counts.briefing ?? 0) + 1;
      return out;
    },
    // Block 2: the win condition, "groups of 2–4 people", France's payroll, and midnight's line.
    (t: string) => {
      const out = t.split(rulesText(v50docs.templates, rules)).join(rulesText(v49docs.templates, rules));
      if (out !== t) counts.rules = (counts.rules ?? 0) + 1;
      return out;
    },
    // Block 5: {conversation_label}, {payroll_status}, and the Embassy's ledger.
    swap("label", /^You are in a group( in [^\n]+)? with /gm, "You are in a Capannello$1 with "),
    swap("purse", /^(Your purse: \d+ Florins\.) On France's payroll: no\.$/gm, "$1 French pensions you hold: none."),
    swap("ledger", /^(Embassy treasury: \d+ Florins\.) On France's payroll: none\.$/gm, "$1 Pensions held: none."),
    // Block 6's type label.
    swap("block 6", /^(- [^\n]*?) · group · /gm, "$1 · Capannello · "),
    // Block 9b's allowed actions.
    swap("borrow", /^\{"type": "borrow"\} — take one payroll payment of (\d+) Florins from the French Embassy, which puts you on France's payroll$/gm, '{"type": "borrow"} — accept one French pension of $1 Florins'),
    swap("repay", /^\{"type": "repay", "for": "Name"\} — pay back one payroll payment, your own or a relative's who has told you of it$/gm, '{"type": "repay", "for": "Name"} — renounce one French pension held by yourself or a relative who has told you of it'),
    // The recorder's passes name the conversation the same way (10a and 10d's CONVERSATION, the sweep re-ask).
    swap("recorder", /^group with ([^\n]*), turn (\d+)\. Present: /gm, "Capannello with $1, turn $2. Present: "),
    swap("timeline", /^— group with ([^\n]*) —$/gm, "— Capannello with $1 —"),
    swap("entries", /^(\[[^\]]+\] T\d+) · group with /gm, "$1 · Capannello with "),
  ];
  const as49 = (t: string) => steps.reduce((x, f) => f(x), t);
  // Block 6 is filled to a token budget, and "group" is shorter than "Capannello", so a notebook can fit a
  // line it couldn't before: compared apart, as a rendering of the character's own rows (the isolation check).
  const HEAD = "WHAT YOU REMEMBER FROM EARLIER TONIGHT\n";
  const split = (u: string) => {
    const a = u.indexOf(HEAD);
    if (a < 0) return { rest: u, notebook: [] as string[] };
    const b = u.indexOf("(★ marks", a);
    return { rest: u.slice(0, a + HEAD.length) + u.slice(b), notebook: u.slice(a + HEAD.length, b).split("\n").filter(Boolean) };
  };
  let same = 0;
  let refilled = 0;
  v50.calls.forEach((c, i) => {
    const o = v49.calls[i]!;
    assert.equal(as49(c.system), o.system, `${c.kind} ${i}: system`);
    const [n, b] = [split(as49(c.user)), split(o.user)];
    assert.equal(n.rest, b.rest, `${c.kind} ${i}: user, apart from block 6`);
    if (n.notebook.join("\n") === b.notebook.join("\n")) same++;
    else {
      refilled++;
      // The lines both hold are in the same order; at most a few come or go at the budget's edge.
      const both = n.notebook.filter((l) => b.notebook.includes(l));
      assert.deepEqual(both, b.notebook.filter((l) => n.notebook.includes(l)), `${c.kind} ${i}: block 6's shared lines in order`);
      assert.ok(n.notebook.length + b.notebook.length - 2 * both.length <= 4, `${c.kind} ${i}: block 6 differs only at its edge`);
    }
  });
  const iso = isolationCheck({
    header: { docs: v50docs.versions, notebook: "perceived", config: { turns: 6 } },
    calls: v50.game.calls,
    lines: v50.game.lines,
    memory: { entries: v50.game.memory.entries, beliefs: v50.game.memory.beliefs, readings: v50.game.memory.readings, lore: [] },
  });
  assert.ok(iso.memoryLines > 0);
  assert.deepEqual(iso.violations, [], "every block 6 line on v0.50 is a rendering of the character's own notebook, in the in-world words");
  assert.ok(same > refilled, `${same} notebooks the same but for the label, ${refilled} refilled`);
  console.log(`block 6: ${same} notebooks the same but for "group", ${refilled} refilled at the budget's edge`);
  assert.ok(amount > 0);
  for (const k of ["briefing", "rules", "label", "purse", "ledger", "block 6", "borrow", "repay", "recorder"]) assert.ok((counts[k] ?? 0) > 0, `${k}: ${JSON.stringify(counts)}`);
});

/**
 * The fake game with payroll payments: Raffaello takes one on his 2nd line and pays it back on his 4th; Giorgia
 * tries to pay one back for Lupo, who has none, on her 3rd. Everything else is the fake caller's.
 */
async function payrollGame(docs: DocSources): Promise<{ game: MiniGame; calls: CallRequest[] }> {
  const calls: CallRequest[] = [];
  const base = fakeCaller(calls);
  const said = new Map<string, number>();
  const caller: Caller = async (req) => {
    const r = await base(req);
    if (req.kind !== "speak" || !r?.ok || (req.character !== R && req.character !== G)) return r;
    const n = (said.get(req.character) ?? 0) + 1;
    said.set(req.character, n);
    const act = req.character === R ? (n === 2 ? { type: "borrow" } : n === 4 ? { type: "repay", for: R } : null) : n === 3 ? { type: "repay", for: "Lupo" } : null;
    return act ? { ...r, content: JSON.stringify({ ...JSON.parse(r.content!), action: act }) } : r;
  };
  const game = new (MiniGame as unknown as new (...a: unknown[]) => MiniGame)(docs, fakeSettings({ briefings: castBriefings(docs) }), caller);
  await game.play();
  return { game, calls };
}

test("payroll payments taken, paid back, and refused: TD 0.50's words in History, State, and the ledger; TD 0.49's as before", async () => {
  const now = await payrollGame(v50docs);
  const before = await payrollGame(v49docs);
  const text = (cs: CallRequest[]) => cs.map((c) => c.system + c.user).join("\n");
  const n50 = text(now.calls);
  const n49 = text(before.calls);
  assert.doesNotMatch(n50, /pension|capannell/i, "no prompt of the payroll game says pension or Capannello");
  const amount = v50docs.tunables.pension_size;
  // History: the private lines, the actor's only.
  assert.match(n50, new RegExp(`^\\[You took a payroll payment of ${amount} Florins from the French Embassy; you are on France's payroll\\. Your purse: \\d+ Florins\\.\\]$`, "m"));
  assert.match(n50, new RegExp(`^\\[You paid back a payroll payment for Raffaello de' Medici: ${amount} Florins returned to the Embassy\\.\\]$`, "m"));
  // State: his status, the Embassy's ledger and its latest change, and Giorgia's refusal.
  assert.match(n50, /^Your purse: \d+ Florins\. On France's payroll: yes, 1 payment\.$/m);
  assert.match(n50, /^Embassy treasury: \d+ Florins\. On France's payroll: Raffaello de' Medici, 1 payment\. Latest: Raffaello de' Medici took a payroll payment\.$/m);
  assert.match(n50, /^Embassy treasury: \d+ Florins\. On France's payroll: none\. Latest: a payroll payment of Raffaello de' Medici's was paid back\.$/m);
  assert.match(n50, /^Your attempt to pay back a payroll payment for Lupo failed: they have none that you can pay back\.$/m);
  // Only the actor hears his lines; LeNoir reads the ledger.
  for (const c of now.calls.filter((c) => c.character !== R)) assert.doesNotMatch(c.user, /^\[You (took|paid back) a payroll payment/m, `${c.kind} ${c.character}`);
  assert.ok(now.calls.some((c) => c.character === A && c.user.includes("On France's payroll: Raffaello de' Medici, 1 payment.")));
  // TD 0.49: the French pension's words, exactly as the engine always wrote them.
  assert.match(n49, new RegExp(`^\\[You accepted a French pension of ${amount} Florins\\. Your purse: \\d+ Florins\\.\\]$`, "m"));
  assert.match(n49, new RegExp(`^\\[You renounced the French pension held by Raffaello de' Medici: ${amount} Florins returned to the Embassy\\.\\]$`, "m"));
  assert.match(n49, /^Your purse: \d+ Florins\. French pensions you hold: 1\.$/m);
  assert.match(n49, /^Embassy treasury: \d+ Florins\. Pensions held: Raffaello de' Medici\. Latest: Raffaello de' Medici accepted a pension\.$/m);
  assert.match(n49, /^Embassy treasury: \d+ Florins\. Pensions held: none\. Latest: the pension held by Raffaello de' Medici was renounced\.$/m);
  assert.match(n49, /^Your attempt to renounce a pension for Lupo failed: no such pension that you can repay\.$/m);
  assert.doesNotMatch(n49, /payroll payment|On France's payroll:/, "TD 0.49's code never says payroll (Characters v0.15's briefings already say \"France's payroll\" in places)");
  // The same play either way: only the words differ.
  assert.deepEqual(now.game.events.map((e) => e.type), before.game.events.map((e) => e.type));
});

test("the conversation words come from the setting pack: \"group\" from TD 0.50, \"Capannello\" before; \"Colloquio\" and \"the gathering\" stay", () => {
  const inWorld = conversationWords(true);
  const game = conversationWords(false);
  assert.deepEqual(inWorld.type, { capannello: "group", colloquio: "Colloquio", gathering: "The gathering" });
  assert.deepEqual(game.type, { capannello: "Capannello", colloquio: "Colloquio", gathering: "The gathering" });
  assert.equal(inWorld.label.capannello, "a group{in_place} with {others}");
  assert.equal(game.label.capannello, "a Capannello{in_place} with {others}");
  assert.equal(inWorld.label.colloquio, game.label.colloquio);
  assert.equal(inWorld.label.gathering, "the gathering");
  // {in_place} is the room's joining words (TD v0.49).
  assert.equal(say("notaio", "room.in_place", { place: "the loggia" }), " in the loggia");
});
