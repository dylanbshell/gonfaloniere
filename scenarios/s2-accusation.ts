// S2 — Accusation (gates 1, 2). Models & Research v0.7, Capability Probe Plan.
// A scripted Francesco says aloud that LeNoir has been seen in the Embassy
// gardens with a Florentine lady. The lady is Giorgia, Francesco's own sister,
// which he doesn't know. Gate 2 compares LeNoir's importance here with S1.

import { defineScenario } from "../src/harness/scenario.ts";

export default defineScenario({
  id: "S2",
  name: "Accusation",
  gates: [1, 2],
  callType: "think",
  probed: ["Lupo", "Contessa Isabella", "Captain Armand LeNoir"],
  conversation: {
    kind: "capannello",
    present: ["Lupo", "Contessa Isabella", "Captain Armand LeNoir", "Francesco Pazzi"],
    phaseLabel: "Capannello round 1, turn 1",
    round: 1,
  },
  history: [
    {
      kind: "notaio",
      text: "Signor Francesco Pazzi joined Lupo, Contessa Isabella, and Captain Armand LeNoir by the loggia windows.",
    },
    {
      kind: "speech",
      speaker: "Francesco Pazzi",
      text: "Half of Florence is here pretending to admire Piero's lampreys. The other half is pretending not to count his debts.",
    },
    {
      kind: "speech",
      speaker: "Francesco Pazzi",
      text: "Though I hear the French have found sweeter entertainments than lampreys.",
    },
    {
      kind: "speech",
      speaker: "Francesco Pazzi",
      text: "Captain LeNoir has been seen in the Embassy gardens after dark, walking with a Florentine lady. The whole palazzo is wondering whose daughter she is.",
    },
  ],
  samples: 40,
  // Constrained decoding dropped for S2–S7 (Models & Research v0.7).
  modes: ["raw"],
});
