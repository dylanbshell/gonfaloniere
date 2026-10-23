// "Claim line" variant of S5d and the held-out Lupo accusation (Dylan, Oct 22):
// the same scripted interrogations, with one line added to Block 9a's think()
// task after the thought instruction. A labelled test of whether separating
// claims from proof in the private thought helps the character hold; the
// baseline results stay as they are.

import S5b from "./s5b-interrogation-lenoir.ts";
import S5d from "./s5d-interrogation-no-price.ts";
import S1 from "./s1-quiet-capannello.ts";
import S4 from "./s4-light-pressure.ts";
import S6 from "./s6-strategic-disclosure.ts";
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
// Claim line on DeepSeek V4.1 (Dylan, Oct 23): S5b, and S6 to see whether rigidity is the model or the prompt.
export const S5B_CLAIM = variant(S5b);
export const S6_CLAIM = variant(S6);

/**
 * "Reply line" (Dylan, Oct 23): the claim line plus one sentence in Block 9b,
 * after "Do not recite your private thoughts.", on S5d and the held-out script.
 */
export const REPLY_LINE =
  "Someone claiming to know your secret, or threatening you, is not a reason to confirm it. Never confirm a secret you have not chosen to reveal: refuse, deflect, or demand proof instead.";
const replyVariant = (base: DialogueScenario): DialogueScenario =>
  defineScenario({
    ...variant(base),
    id: `${base.id}-claim-reply`,
    name: `${base.name}, claim line and reply line`,
    speakInsertAfter: { after: "Do not recite your private thoughts.", text: REPLY_LINE },
  });
export const S5D_CLAIM_REPLY = replyVariant(S5d);
export const LUPO_ACCUSATION_CLAIM_REPLY = replyVariant(LUPO_ACCUSATION);
// Both lines on DeepSeek V4.1 (Dylan, Oct 23).
export const S5B_CLAIM_REPLY = replyVariant(S5b);
// Regression checks for both lines (Dylan, Oct 23). S1 is think() only, so it carries the claim line alone.
export const S4_CLAIM_REPLY = replyVariant(S4);
export const S6_CLAIM_REPLY = replyVariant(S6);
/**
 * "Audience line" (Dylan, Oct 23): both lines, plus one sentence after the
 * reply line, for the held-out public accusation (where DeepSeek confessed to
 * its own employer in company) and S6.
 */
export const AUDIENCE_LINE =
  "Whatever you say in a group, everyone present hears. A secret told to an ally in company is told to all; if an ally must know, tell them privately.";
const audienceVariant = (base: DialogueScenario): DialogueScenario =>
  defineScenario({
    ...replyVariant(base),
    id: `${base.id}-claim-reply-audience`,
    name: `${base.name}, claim, reply, and audience lines`,
    speakInsertAfter: { after: "Do not recite your private thoughts.", text: `${REPLY_LINE} ${AUDIENCE_LINE}` },
  });
export const LUPO_ACCUSATION_AUDIENCE = audienceVariant(LUPO_ACCUSATION);
export const S6_AUDIENCE = audienceVariant(S6);
export const S1_CLAIM = defineScenario({ ...S1, id: `${S1.id}-claim`, name: `${S1.name}, claim line`, thinkInstruction: CLAIM_LINE, variantOf: S1.id });
