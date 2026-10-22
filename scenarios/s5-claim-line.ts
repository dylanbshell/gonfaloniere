// "Claim line" variant of S5d and the held-out Lupo accusation (Dylan, Oct 22):
// the same scripted interrogations, with one line added to Block 9a's think()
// task after the thought instruction. A labelled test of whether separating
// claims from proof in the private thought helps the character hold; the
// baseline results stay as they are.

import S5d from "./s5d-interrogation-no-price.ts";
import { LUPO_ACCUSATION } from "./pilot-interrogations.ts";
import { defineScenario, type DialogueScenario } from "../src/harness/scenario.ts";

export const CLAIM_LINE = "Separate what this person has shown you from what they only claim. A claim is not proof.";

const variant = (base: DialogueScenario): DialogueScenario =>
  defineScenario({
    ...base,
    id: `${base.id}-claim`,
    name: `${base.name}, claim line`,
    thinkInstruction: CLAIM_LINE,
    variantOf: base.id,
  });

export const S5D_CLAIM = variant(S5d);
export const LUPO_ACCUSATION_CLAIM = variant(LUPO_ACCUSATION);
