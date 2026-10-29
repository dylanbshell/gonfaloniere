// TD v0.27's register check (src/minigame/register.ts): the text measures and the label-mix flag rule
// set in advance by Models & Research v0.45.

import assert from "node:assert/strict";
import { test } from "node:test";
import { fkGrade, labelFlag, sentences, syllables, words } from "../src/minigame/register.ts";

test("words, sentences, and syllables", () => {
  assert.equal(words("Signor Raffaello's well-born friend owes 30 Florins.").length, 7);
  assert.equal(sentences('I know. You lied! Did you? "Yes." Fine'), 5);
  assert.equal(sentences("No full stop at all"), 1);
  assert.deepEqual(["the", "Florence", "Medici", "table", "everyone"].map(syllables), [1, 2, 3, 2, 3]);
  // Short plain sentences grade low, long Latinate ones high.
  assert.ok(fkGrade(["The cat sat on the mat."]) < 1);
  assert.ok(fkGrade(["Considerations of reputation, obligation, and circumstance necessitate extraordinary deliberation."]) > 15);
});

test("a label flags only when its share both doubles or halves and moves 5 points or more", () => {
  assert.equal(labelFlag(10, 20), true);
  assert.equal(labelFlag(20, 10), true);
  assert.equal(labelFlag(2, 4), false, "doubles but moves 2 points");
  assert.equal(labelFlag(30, 36), false, "moves 6 points but doesn't double");
  assert.equal(labelFlag(0, 5), true);
  assert.equal(labelFlag(0, 4.9), false);
});
