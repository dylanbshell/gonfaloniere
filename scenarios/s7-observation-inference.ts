// S7 — Observation inference (gate 5). Models & Research v0.8, Capability
// Probe Plan. Lupo's History includes two Il Notaio lines (the second
// escalated) recording Raffaello and LeNoir withdrawing together. His
// briefing suspects the Medici of French money and names Raffaello as the
// likeliest pensioner, so the pairing should matter to him. Three versions:
// explicit, buried among distractor chatter, and a control with no Notaio
// lines. Measures: the thought references the withdrawal (judged), and
// Lupo's contact urgency toward Raffaello and LeNoir versus the control.
// Pass: referenced in ≥70% of explicit samples, and mean urgency toward the
// pair at least 15 points above control. The buried version is reported only.

import type { HistoryLine } from "../src/prompt/assemble.ts";
import { defineScenario, type ThinkScenario } from "../src/harness/scenario.ts";

// An unbriefed guest (Dylan, Oct 21): not on the roster, so never in contact lists.
const GUEST = "Bartolo Cerchi";
const CLARICE = "Clarice Orsini";

const say = (speaker: string, text: string): HistoryLine => ({ kind: "speech", speaker, text });
const notaio = (text: string): HistoryLine => ({ kind: "notaio", text });

const FIRST_WITHDRAWAL = notaio(
  "Signor Raffaello de' Medici and Captain Armand LeNoir were observed withdrawing from company — a brief word exchanged where none could hear.",
);
const RETURN = notaio("Signor Raffaello de' Medici and Captain Armand LeNoir returned to the company.");
const SECOND_WITHDRAWAL = notaio(
  "Signor Raffaello de' Medici was once again seen drawing another aside — once more Captain LeNoir. Some note the two have found occasion for private congress more than once this evening.",
);

const CHATTER = [
  say(GUEST, "Wool from Flanders is dearer every season. The Calimala will have to raise its prices again by spring."),
  say(CLARICE, "Then the Calimala will complain to Piero, and Piero will complain to me. I hear enough of wool at home."),
  say(GUEST, "Forgive me, Madonna. The musicians from Mantua, at least, are worth the expense."),
  say(CLARICE, "They are. Though the lutenist plays as if he were paid by the note."),
  say(GUEST, "Perhaps he is. Everything in this city is paid by the note, one way or another."),
  say(CLARICE, "Spoken like a merchant. Have you tasted the lampreys yet?"),
];
// Stands alone, so it follows naturally from any of the three histories.
const LAST = say(GUEST, "They say the musicians will play until dawn. I doubt my knees will last that long.");

const base = {
  name: "Observation inference",
  gates: [5],
  callType: "think" as const,
  probed: ["Lupo" as const],
  conversation: {
    kind: "capannello" as const,
    present: ["Lupo", CLARICE, GUEST],
    phaseLabel: "Capannello round 2, turn 4",
    round: 2,
  },
  samples: 20,
  modes: ["raw" as const],
};

/** Both withdrawals, close together, with a little chatter between. */
export const S7_EXPLICIT: ThinkScenario = defineScenario({
  ...base,
  id: "S7-explicit",
  history: [FIRST_WITHDRAWAL, CHATTER[0]!, RETURN, CHATTER[1]!, SECOND_WITHDRAWAL, LAST],
});

/** The same two withdrawals, buried among distractor chatter. */
export const S7_BURIED: ThinkScenario = defineScenario({
  ...base,
  id: "S7-buried",
  history: [
    CHATTER[0]!,
    FIRST_WITHDRAWAL,
    CHATTER[1]!,
    CHATTER[2]!,
    RETURN,
    CHATTER[3]!,
    SECOND_WITHDRAWAL,
    CHATTER[4]!,
    CHATTER[5]!,
    LAST,
  ],
});

/** No Notaio lines: the same chatter, and Raffaello and LeNoir never mentioned. */
export const S7_CONTROL: ThinkScenario = defineScenario({
  ...base,
  id: "S7-control",
  history: [...CHATTER, LAST],
});
