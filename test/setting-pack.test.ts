// TD v0.38's Setting Pack (CC-20261111-04, #64): the setting's words are content in setting/florence-1492/,
// and the first move copies today's text exactly. These pin the moved text to what the code wrote before.

import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedActionsText } from "../src/game/actions.ts";
import { ALIASES, ROSTER, factionOf, hasRole, keepsTreasury, mayTakePension } from "../src/game/roster.ts";
import { CAST, STANDINS } from "../src/minigame/cast.ts";
import { payrollLedger } from "../src/prompt/assemble.ts";
import { inWorldNames } from "../src/prompt/names.ts";
import { DEFAULT_SETTING, SETTING, say, settingFile, settingPack } from "../src/setting/pack.ts";

test("the run setting defaults to florence-1492, and its files are in setting/florence-1492/", () => {
  assert.equal(DEFAULT_SETTING, "florence-1492");
  if (!process.env.PROBE_SETTING) assert.equal(SETTING, "florence-1492");
  assert.equal(settingFile("notaio.json"), "setting/florence-1492/notaio.json");
  assert.equal(settingPack().name, "Florence, 1492");
  assert.deepEqual(settingPack().currency, { singular: "Florin", plural: "Florins" });
  assert.equal(inWorldNames().narrator.name, "Il Notaio");
});

test("the roster and aliases are the ones game records have always held, in the same order and shape", () => {
  // A game record's header stores ROSTER and ALIASES as they are; this is their JSON before the move,
  // but for one deliberate change: Characters v0.15 renamed Fra Tommaso to Friar Tommaso (#136), keeping
  // "Fra Tommaso" as his last alias so the old name, and older records, still resolve to him.
  assert.equal(
    JSON.stringify(ROSTER),
    `[{"name":"Piero de' Medici","faction":"Medici"},{"name":"Clarice Orsini","faction":"Medici"},{"name":"Raffaello de' Medici","faction":"Medici"},{"name":"Francesco Pazzi","faction":"Pazzi"},{"name":"Giorgia Pazzi","faction":"Pazzi"},{"name":"Lupo","faction":"Pazzi"},{"name":"Friar Tommaso","faction":"Dominicans"},{"name":"Sister Beatrice","faction":"Dominicans"},{"name":"Contessa Isabella","faction":"Dominicans"},{"name":"Jeanne d'Orléans","faction":"French Embassy"},{"name":"Emile de Valois","faction":"French Embassy"},{"name":"Captain Armand LeNoir","faction":"French Embassy"}]`,
  );
  assert.equal(
    JSON.stringify(ALIASES),
    `{"Piero de' Medici":["Piero","Signor Piero","Messer Piero"],"Clarice Orsini":["Clarice","Madonna Clarice","Lady Clarice"],"Raffaello de' Medici":["Raffaello","Signor Raffaello","Messer Raffaello"],"Francesco Pazzi":["Francesco","Francesco de' Pazzi","Signor Francesco","Messer Francesco"],"Giorgia Pazzi":["Giorgia","Giorgia de' Pazzi","Madonna Giorgia","Lady Giorgia"],"Lupo":[],"Friar Tommaso":["Tommaso","Brother Tommaso","Father Tommaso","Fra Tommaso"],"Sister Beatrice":["Beatrice"],"Contessa Isabella":["Isabella","Contessa Isabella di Salviati","Isabella di Salviati","the Contessa"],"Jeanne d'Orléans":["Jeanne","Ambassador Jeanne","Madame Jeanne","Lady Jeanne"],"Emile de Valois":["Emile","Prince Emile","Prince Emile de Valois"],"Captain Armand LeNoir":["LeNoir","Captain LeNoir","Armand LeNoir","Armand","the Captain"]}`,
  );
  assert.deepEqual(CAST, ["Lupo", "Contessa Isabella", "Captain Armand LeNoir", "Francesco Pazzi", "Raffaello de' Medici", "Giorgia Pazzi"]);
  assert.deepEqual(STANDINS, ["Francesco Pazzi", "Raffaello de' Medici", "Giorgia Pazzi"]);
  assert.deepEqual(settingPack().playable, ["Piero de' Medici", "Francesco Pazzi"]);
  assert.equal(settingPack().roster.find((r) => r.name === "Lupo")!.subtitle, "Pazzi · the family bodyguard");
  assert.ok(settingPack().roster.every((r) => r.subtitle.startsWith(`${r.faction} · `)));
});

test("code tests roles, not faction names: who may take a pension, who keeps the treasury, who has two kills", () => {
  const f = (n: string) => factionOf(n);
  assert.deepEqual(["Medici", "Pazzi", "Dominicans", "French Embassy"].map(mayTakePension), [true, true, false, false]);
  assert.deepEqual(["Medici", "Pazzi", "Dominicans", "French Embassy"].map(keepsTreasury), [false, false, false, true]);
  assert.equal(keepsTreasury(f("Captain Armand LeNoir")), true);
  assert.deepEqual(ROSTER.filter((r) => hasRole(r.name, "two kills")).map((r) => r.name), ["Lupo"]);
  const ctx = { florins: 10, pensionSize: 3, treasury: 15, colloquioWith: null };
  assert.match(allowedActionsText({ ...ctx, faction: "Medici" }), /borrow"\} — accept one French pension/);
  assert.match(allowedActionsText({ ...ctx, faction: "Medici", retitled: true }), /borrow"\} — take one payroll payment/);
  assert.doesNotMatch(allowedActionsText({ ...ctx, faction: "Dominicans" }), /borrow/);
});

test("Il Notaio's notes and code's lines fill to exactly what the engine wrote before", () => {
  const A = "Lupo";
  const B = "Contessa Isabella";
  const cases: [string, Record<string, string | number>, string][] = [
    ["notes.groups", { others: "Lupo and Contessa Isabella" }, "The guests drifted into company: Lupo and Contessa Isabella."],
    ["notes.join", { actor: A, others: B }, "Lupo joined Contessa Isabella."],
    ["notes.join_alone", { actor: A }, "Lupo took a place in company."],
    ["notes.leave", { actor: A }, "Lupo took leave of the company."],
    ["notes.rejoin", { actor: A, others: B }, "Lupo returned to company and rejoined Contessa Isabella."],
    ["notes.return_join", { actor: A, others: B }, "Lupo returned to company and joined Contessa Isabella."],
    ["notes.return_alone", { actor: A }, "Lupo returned to company."],
    ["notes.new_group", { actor: A, other: B }, "Lupo and Contessa Isabella returned to company and formed a new group."],
    ["notes.withdrawal", { actor: A, other: B }, "Lupo drew Contessa Isabella aside from company — a private word, where none could hear."],
    ["notes.withdrawal_repeat", { actor: A, other: B }, "Lupo was once again seen withdrawing in private, this time with Contessa Isabella."],
    ["notes.withdrawal_repeat_before_td26", { actor: A, other: B }, "Lupo was once again seen drawing another aside — this time Contessa Isabella. Some note it is not the first private word sought this evening."],
    ["lines.payment", { actor: B, other: A, amount: 3 }, "Contessa Isabella gave Lupo 3 Florins."],
    // Before TD v0.50's Retitling: the French pension's words, kept so older games replay as they ran.
    ["lines.pension_taken_before_td50", { amount: 3, purse: 13 }, "You accepted a French pension of 3 Florins. Your purse: 13 Florins."],
    ["lines.pension_renounced_before_td50", { holder: A, amount: 3 }, "You renounced the French pension held by Lupo: 3 Florins returned to the Embassy."],
    ["lines.pension_refused_before_td50", { holder: "yourself" }, "Your attempt to renounce a pension for yourself failed: no such pension that you can repay."],
    ["lines.ledger_taken_before_td50", { actor: A }, "Lupo accepted a pension"],
    ["lines.ledger_renounced_before_td50", { holder: A }, "the pension held by Lupo was renounced"],
    ["lines.embassy_ledger_before_td50", { amount: 15, pensions: "none" }, "Embassy treasury: 15 Florins. Pensions held: none."],
    ["lines.embassy_ledger_latest", { latest: "Lupo accepted a pension" }, " Latest: Lupo accepted a pension."],
  ];
  for (const [key, values, before] of cases) assert.equal(say("notaio", key, values), before, key);
  assert.equal(
    say("notaio", "notes.attendance", { cast: "A, B, and C", absent: "D and E" }),
    "Tonight is a smaller gathering than most: only A, B, and C attend. D and E are alive, but elsewhere tonight, and can't be reached.",
  );
  assert.equal(say("notaio", "lines.pension_refused_self"), "yourself");
});

test("TD v0.50's Retitling: code's payroll lines in TD's words (In-World Names, Retitling; History Line Formats)", () => {
  const P = "Piero de' Medici";
  const cases: [string, Record<string, string | number>, string][] = [
    ["lines.pension_taken", { amount: 3, purse: 13 }, "You took a payroll payment of 3 Florins from the French Embassy; you are on France's payroll. Your purse: 13 Florins."],
    ["lines.pension_renounced", { holder: "Raffaello de' Medici", amount: 3 }, "You paid back a payroll payment for Raffaello de' Medici: 3 Florins returned to the Embassy."],
    ["lines.pension_refused", { holder: P }, "Your attempt to pay back a payroll payment for Piero de' Medici failed: they have none that you can pay back."],
    ["lines.ledger_taken", { actor: P }, "Piero de' Medici took a payroll payment"],
    ["lines.ledger_renounced", { holder: P }, "a payroll payment of Piero de' Medici's was paid back"],
    ["lines.embassy_ledger", { amount: 12, ledger: "Piero de' Medici, 1 payment" }, "Embassy treasury: 12 Florins. On France's payroll: Piero de' Medici, 1 payment."],
    ["payroll.status_no", {}, "no"],
    ["payroll.status_yes", { payments: "1 payment" }, "yes, 1 payment"],
    ["payroll.many", { count: 2 }, "2 payments"],
  ];
  for (const [key, values, now] of cases) assert.equal(say("notaio", key, values), now, key);
  // The human test reads the purse from the end of the taken line.
  assert.match(say("notaio", "lines.pension_taken", { amount: 3, purse: 13 }), /Your purse: 13 Florins\.$/);
  assert.equal(payrollLedger([], true), "none");
  assert.equal(payrollLedger([[P, 1], ["Lupo", 0], ["Giorgia Pazzi", 2]], true), "Piero de' Medici, 1 payment; Giorgia Pazzi, 2 payments");
  assert.equal(payrollLedger([[P, 1], ["Lupo", 0], ["Giorgia Pazzi", 2]], false), "Piero de' Medici, Giorgia Pazzi (2)", "before TD v0.50, as the engine always wrote it");
  assert.equal(payrollLedger([], false), "none");
});

test("action descriptions fill to exactly what actions.ts wrote before; a missing value is an error", () => {
  assert.equal(say("actions", "bribe", { other: "Lupo", purse: 7 }), '{"type": "bribe", "amount": N} — hand Lupo N Florins (you have 7)');
  assert.equal(say("actions", "borrow_before_td50", { amount: 3 }), '{"type": "borrow"} — accept one French pension of 3 Florins');
  assert.equal(say("actions", "repay_before_td50"), '{"type": "repay", "for": "Name"} — renounce one French pension held by yourself or a relative who has told you of it');
  // TD v0.50's Retitling (Block 9b's notes).
  assert.equal(say("actions", "borrow", { amount: 3 }), '{"type": "borrow"} — take one payroll payment of 3 Florins from the French Embassy, which puts you on France\'s payroll');
  assert.equal(say("actions", "repay"), '{"type": "repay", "for": "Name"} — pay back one payroll payment, your own or a relative\'s who has told you of it');
  assert.equal(say("actions", "none"), "None available right now. Set action to null.");
  assert.equal(say("actions", "bribe_not_positive", { amount: 0 }), "bribe of 0 Florins");
  assert.throws(() => say("actions", "bribe", { purse: 7 }), /no value for \{other\}/);
  assert.throws(() => say("notaio", "notes.nothing"), /no template/);
});
