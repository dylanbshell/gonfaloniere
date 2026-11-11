// TD v0.34–v0.35's In-World Names (CC-20261107-01): what characters hear, how it's version-gated, and
// that games on earlier TDs replay byte-identical.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { docsFor } from "../probe.config.ts";
import { castBriefings, standinsFor } from "../src/minigame/cast.ts";
import type { CallRequest } from "../src/minigame/engine.ts";
import { CHARACTER_CALLS, termHits } from "../src/minigame/names-check.ts";
import { parseStrategy } from "../src/output/strategy.ts";
import { assembleMurderPrompt } from "../src/prompt/assemble.ts";
import { gameAct, minglingPhase, minglingTime, partOf, usesInWorldNames } from "../src/prompt/names.ts";
import { loadDocs } from "../src/sources/docs.ts";
import { playFakeOn } from "./fixtures/fake-game.ts";

const docs32 = loadDocs(docsFor("0.32"));
const docs35 = loadDocs(docsFor("0.35", "0.10"));
const old = (await playFakeOn(docs32)).calls;
const neu = (await playFakeOn(docs35)).calls;
const TURNS = 6;

/** The fake game's prompts on TD v0.32, from main before this build (32c0e5d). */
const PROMPTS_V032 = "c8866238f2e233baca4a6d911ce14afcfa8fc5fc63a8fbb56fc37a8f0dbff95e";
function promptHash(calls: CallRequest[]): string {
  const h = createHash("sha256");
  for (const c of calls) h.update(`${c.kind}\u0000${c.character}\u0000${c.system}\u0000${c.user}\u0000${c.maxTokens}\u0001`);
  return h.digest("hex");
}

test("TD v0.32 (game names) replays byte-identical to before the build; it pairs with Characters v0.4 and its stand-ins", () => {
  assert.equal(docs32.inWorld, false);
  assert.equal(docs32.versions.characters, "0.4");
  assert.equal(promptHash(old), PROMPTS_V032);
  assert.deepEqual(standinsFor("0.4"), ["Francesco Pazzi", "Raffaello de' Medici", "Giorgia Pazzi"]);
});

test("TD v0.35 with Characters v0.10: all six briefings are Characters', no stand-ins, and no character prompt holds a game term", () => {
  assert.equal(docs35.inWorld, true);
  assert.equal(docs35.versions.characters, "0.10");
  assert.deepEqual(standinsFor("0.10"), []);
  const b = castBriefings(docs35);
  for (const c of ["Lupo", "Contessa Isabella", "Captain Armand LeNoir", "Francesco Pazzi", "Raffaello de' Medici", "Giorgia Pazzi"] as const) {
    assert.ok(b[c] && b[c] === docs35.briefings[c], c);
  }
  const chars = neu.filter((c) => CHARACTER_CALLS.includes(c.kind));
  assert.ok(chars.length > 300 && chars.some((c) => c.kind === "murder") && chars.some((c) => c.kind === "seat"));
  const hits = chars.flatMap((c) => [...termHits(c.system), ...termHits(c.user)].map((h) => `${c.kind} ${c.character}: ${h.context}`));
  assert.deepEqual(hits, []);
  // Blocks 1–3 are one system message per character, so the record's one prefix per character covers every call.
  for (const name of new Set(chars.map((c) => c.character))) assert.equal(new Set(chars.filter((c) => c.character === name).map((c) => c.system)).size, 1, name!);
  // The system passes (10a–10d) keep the game names.
  assert.ok(neu.some((c) => !CHARACTER_CALLS.includes(c.kind) && /\bT\d+\b|turn \d/.test(c.user)), "10a–10d still name turns");
});

test("v0.35's prompts are v0.32's with only the changelog's changes: block 2's names, the briefings, block 5's phase, block 6's times, and 9e", () => {
  assert.deepEqual(neu.map((c) => `${c.kind}|${c.character}`), old.map((c) => `${c.kind}|${c.character}`));
  const b32 = castBriefings(docs32);
  const b35 = castBriefings(docs35);
  const block2: [string, string][] = [
    [
      "three rounds of mingling, each opened by a meeting of your own faction. Then the Murder Round. Then the Medici and Pazzi each choose a candidate, the candidates give speeches, every faction meets one last time, and a secret ballot is held.",
      "three rounds of mingling, each opened by a council of your own faction. Then midnight. Then the Medici and Pazzi each choose a candidate, the candidates give speeches, every faction holds one last council, and a secret ballot is held.",
    ],
    [
      "The Murder Round: each living guest secretly chooses one act: KILL, GUARD, or INVESTIGATE someone. All acts take effect at once, so a guest who dies that night still carries out their own act. A guest guarded by two or more survives an attack. A guest investigated by two or more cannot carry out their kill.",
      "Midnight: each living guest secretly chooses one act: to kill, guard, or watch someone. All acts take effect at once, so a guest who dies at midnight still carries out their own act. A guest guarded by two or more survives an attack. A guest watched by two or more cannot carry out their kill.",
    ],
  ];
  const sys = (s: string, c: string) => block2.reduce((t, [x, y]) => t.replace(x, y), s.replace(b32[c as keyof typeof b32]!, b35[c as keyof typeof b35]!));
  const user = (u: string) =>
    u
      .replace(/^Capannello round 1, turn (\d+)$/m, (_, n) => minglingPhase(Number(n), TURNS))
      .replace(/^The Murder Round$/m, "Midnight")
      .replace(/^- T(\d+) · /gm, (_, n) => `- ${minglingTime(Number(n), TURNS)} · `);
  // Block 6 is cut to ~450 tokens of rendered text (TD v0.10), and "1st round, early" is longer than "T2",
  // so a call can fit fewer lines. Its lines are compared as renderings, apart from the rest of the prompt.
  const HEAD = "WHAT YOU REMEMBER FROM EARLIER TONIGHT\n";
  const split = (u: string) => {
    const a = u.indexOf(HEAD);
    if (a < 0) return { rest: u, notebook: [] as string[] };
    const b = u.indexOf("(★ marks", a);
    return { rest: u.slice(0, a + HEAD.length) + u.slice(b), notebook: u.slice(a + HEAD.length, b).split("\n").filter(Boolean) };
  };
  const rendered = new Map<string, Set<string>>();
  for (const o of old) if (o.character) for (const l of split(user(o.user)).notebook) (rendered.get(o.character) ?? rendered.set(o.character, new Set()).get(o.character)!).add(l);
  const task = (u: string) => u.slice(u.lastIndexOf("TASK: "));
  let systems = 0;
  let murders = 0;
  let fewer = 0;
  let notebooks = 0;
  neu.forEach((c, i) => {
    const o = old[i]!;
    if (!CHARACTER_CALLS.includes(c.kind)) {
      assert.equal(c.system, o.system, `${c.kind} ${i}: system pass unchanged`);
      return;
    }
    assert.equal(c.system, sys(o.system, c.character!), `${c.kind} ${i}: system`);
    if (o.system.includes(block2[0]![0])) systems++;
    const n = split(c.user);
    const e = split(user(o.user));
    for (const l of n.notebook) assert.ok(rendered.get(c.character!)?.has(l), `${c.kind} ${i}: block 6 line isn't a relabelled v0.32 line: ${l}`);
    if (n.notebook.length) notebooks++;
    if (n.notebook.length < e.notebook.length) fewer++;
    if (c.kind !== "murder") return assert.equal(n.rest, e.rest, `${c.kind} ${i}: user`);
    murders++;
    // 9e: everything before the task as above; the task is TD v0.35's, filled from its own table.
    assert.equal(n.rest.slice(0, n.rest.lastIndexOf("TASK: ")), e.rest.slice(0, e.rest.lastIndexOf("TASK: ")), `${c.kind} ${i}: before 9e`);
    assert.ok(task(c.user).startsWith("TASK: MIDNIGHT\nMidnight has come."), `${c.kind} ${i}: 9e heading`);
  });
  // Seven 9e calls: the fake game answers "guard" for everyone, so Lupo, who may only kill, is asked twice.
  assert.ok(systems > 300 && murders === old.filter((c) => c.kind === "murder").length && murders >= 6, `${systems} systems, ${murders} murder calls`);
  // Reported, not gated: how often the longer labels cost block 6 a line in the fake game.
  console.log(`block 6: ${fewer} of ${notebooks} character calls fit fewer lines than on v0.32`);
});

test("9e takes \"watch\" as Investigate, and \"investigate\" with no repair; Lupo and the others get TD's own table values", () => {
  const expect = { character: "Contessa Isabella", livingOthers: ["Lupo", "Giorgia Pazzi"] };
  for (const word of ["watch", "investigate"]) {
    const r = parseStrategy("murder", JSON.stringify({ thought: "Quietly.", act: { type: word, target: "Lupo" } }), expect);
    assert.equal(r.verdict, "valid", word);
    assert.deepEqual(r.illegal, [], word);
    assert.equal(r.aliasRepairs, 0, word);
    assert.deepEqual((r.value as { acts: { type: string }[] }).acts.map((a) => a.type), ["investigate"], word);
  }
  assert.equal(parseStrategy("murder", JSON.stringify({ thought: "x", act: { type: "WATCH", target: "Lupo" } }), expect).verdict, "syntax");
  assert.equal(gameAct("kill"), "kill");
  assert.equal(gameAct("_comment"), null);
  const lupo = neu.find((c) => c.kind === "murder" && c.character === "Lupo")!;
  const other = neu.find((c) => c.kind === "murder" && c.character !== "Lupo")!;
  assert.match(lupo.user, /\nkill up to two living guests\. Your kills cannot be stopped by guards or watchers\. You may not guard or watch with them\.\n/);
  assert.match(lupo.user, /\{"thought": "\.\.\.", "kills": \["\.\.\.", "\.\.\."\]\}$/);
  assert.match(other.user, /\nkill, guard, or watch any living guest\. You cannot guard yourself\.\n/);
  assert.match(other.user, /\{"thought": "\.\.\.", "act": \{"type": "kill" or "guard" or "watch", "target": "\.\.\."\}\}$/);
  assert.ok(typeof assembleMurderPrompt === "function");
});

test("time labels: thirds of the round's turns, turn 0 counts as early; the short form opens block 6 lines", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map((t) => partOf(t, 6)), [0, 0, 0, 1, 1, 2, 2]);
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8].map((t) => partOf(t, 8)), [0, 0, 1, 1, 1, 2, 2, 2]);
  assert.equal(minglingPhase(4, 8), "The first round of mingling, midway");
  assert.equal(minglingTime(8, 8), "1st round, late");
  assert.equal(minglingPhase(1, 8, 2), "The second round of mingling, early");
});

test("a prompt never mixes the two sets: loadDocs refuses TD v0.35 with Characters v0.4, and TD v0.32 with Characters v0.10", () => {
  assert.throws(() => usesInWorldNames({ technicalDesign: "0.35", characters: "0.4" }), /would mix/);
  assert.throws(() => usesInWorldNames({ technicalDesign: "0.32", characters: "0.10" }), /would mix/);
  assert.throws(() => loadDocs({ ...docsFor("0.35"), characters: docsFor("0.32").characters }), /would mix/);
  assert.equal(usesInWorldNames({ technicalDesign: "0.34", characters: "0.10" }), true);
  assert.equal(usesInWorldNames({ technicalDesign: "0.9", characters: "0.2" }), false);
});
