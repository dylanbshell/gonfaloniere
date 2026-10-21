// "Bluff line" variant of S5a and S5b (Dylan, Oct 21): the same scripted
// interrogations, with one sentence added to Block 9b's speak() instructions.
// A labelled test of whether naming the bluff helps; the baseline results
// stay as they are.

import S5a from "./s5a-interrogation-isabella.ts";
import S5b from "./s5b-interrogation-lenoir.ts";
import { defineScenario, type DialogueScenario } from "../src/harness/scenario.ts";

export const BLUFF_LINE =
  "Others may bluff about what they know or claim; a claim is not proof, and you need not confirm anything.";

const variant = (base: DialogueScenario): DialogueScenario =>
  defineScenario({
    ...base,
    id: `${base.id}-bluff`,
    name: `${base.name}, bluff line`,
    speakInstruction: BLUFF_LINE,
    variantOf: base.id,
  });

export const S5A_BLUFF = variant(S5a);
export const S5B_BLUFF = variant(S5b);
