// The "already known" leak pass (Models & Research v0.36): a flagged line is already known when every
// listener present already knew the secret, from the start or from an earlier flagged line.
import assert from "node:assert/strict";
import { test } from "node:test";
import { alreadyKnownPass, secretIds, secrets, type FlaggedLine } from "../src/minigame/leakpass.ts";
import type { CharacterName } from "../src/game/roster.ts";

const R = "Raffaello de' Medici" as CharacterName;
const I = "Contessa Isabella" as CharacterName;
const L = "Lupo" as CharacterName;
const C = "Captain Armand LeNoir" as CharacterName;
const F = "Francesco Pazzi" as CharacterName;
const G = "Giorgia Pazzi" as CharacterName;
const run = (flagged: FlaggedLine[], heard: Record<string, CharacterName[]>) =>
  alreadyKnownPass(flagged, (l) => heard[l]!, (l) => Number(l.slice(1)));

test("a first reveal is not already known", () => {
  const { marks, lineKnown } = run([{ line: "L34", speaker: R, secret: "Debt to Contessa Isabella" }], { L34: [R, L, C] });
  assert.deepEqual(marks.map((m) => [m.secret, m.alreadyKnown, m.newListeners]), [["Raffaello's debt to Isabella", false, [L, C]]]);
  assert.equal(lineKnown.get("L34"), false);
});

test("a repeat to the same listeners is already known; so is a repeat to a listener who knew from the start", () => {
  const { lineKnown } = run(
    [
      { line: "L40", speaker: R, secret: "Your debt to Contessa Isabella" },
      { line: "L50", speaker: R, secret: "His debt to Contessa Isabella" },
      { line: "L81", speaker: R, secret: "Debt to Contessa Isabella" },
    ],
    // Isabella is the creditor (knew from the start); Lupo and LeNoir heard L40.
    { L40: [R, L, C], L50: [R, L, C], L81: [R, L, I] },
  );
  assert.deepEqual([lineKnown.get("L40"), lineKnown.get("L50"), lineKnown.get("L81")], [false, true, true]);
});

test("a repeat with one new listener is not already known, and names the new listener", () => {
  const { marks, lineKnown } = run(
    [
      { line: "L40", speaker: R, secret: "Debt to Contessa Isabella" },
      { line: "L92", speaker: R, secret: "Your debt to Contessa Isabella" },
    ],
    { L40: [R, L, C], L92: [R, L, C, F] },
  );
  assert.equal(lineKnown.get("L92"), false);
  assert.deepEqual(marks.find((m) => m.line === "L92")!.newListeners, [F]);
});

test("two different secrets in one line: each marked on its own, and the line is already known only if both are", () => {
  const flagged: FlaggedLine[] = [
    { line: "L50", speaker: R, secret: "Debt to Contessa Isabella" },
    { line: "L90", speaker: R, secret: "Debt to Contessa Isabella; France's backing over Piero" },
  ];
  // LeNoir heard the debt at L50, and France's backing is his own offer (he knew it from the start).
  const both = run(flagged, { L50: [R, C], L90: [R, C] });
  assert.deepEqual(both.marks.filter((m) => m.line === "L90").map((m) => [m.secret, m.alreadyKnown]), [["Raffaello's debt to Isabella", true], ["France would back Raffaello over Piero", true]]);
  assert.equal(both.lineKnown.get("L90"), true);
  // Giorgia present too: she heard neither, so neither secret is already known, and nor is the line.
  const fresh = run(flagged, { L50: [R, C], L90: [R, C, G] });
  assert.deepEqual(fresh.marks.filter((m) => m.line === "L90").map((m) => m.alreadyKnown), [false, false]);
  assert.equal(fresh.lineKnown.get("L90"), false);
});

test("one fact owned by two speakers is one secret: Lupo's and Isabella's wordings of the hire match", () => {
  const list = secrets("v1");
  assert.deepEqual(secretIds(L, "Contessa Isabella hired you for the San Frediano killing.", list), ["Isabella hired Lupo for San Frediano"]);
  assert.deepEqual(secretIds(I, "She hired Lupo for the San Frediano killing", list), ["Isabella hired Lupo for San Frediano"]);
  // Isabella reveals it to LeNoir; Lupo later says it again with LeNoir present: already known.
  const { lineKnown } = run(
    [
      { line: "L57", speaker: I, secret: "She hired Lupo for the San Frediano killing" },
      { line: "L71", speaker: L, secret: "Contessa Isabella was his client (paid him over San Frediano)" },
    ],
    { L57: [I, L, C], L71: [L, C] },
  );
  assert.deepEqual([lineKnown.get("L57"), lineKnown.get("L71")], [false, true]);
});

test("a wording the list doesn't know stays the speaker's own secret, known only to them", () => {
  assert.deepEqual(secretIds(G, "Your pension hopes with Emile", secrets("v1")), ["Giorgia Pazzi: Your pension hopes with Emile"]);
  const { lineKnown } = run([{ line: "L5", speaker: G, secret: "Your pension hopes with Emile" }], { L5: [G, C] });
  assert.equal(lineKnown.get("L5"), false);
});
