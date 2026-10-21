// S3 — Colloquio, deal struck (gates 1, 7 preview). Models & Research v0.7,
// Capability Probe Plan. Isabella pays Lupo 3 Florins (her plot point) and he
// accepts. Neither has anything more to gain, so `done` should fire; it must
// also be a boolean here, where S1 and S2 check it is null in a Capannello.

import { defineScenario } from "../src/harness/scenario.ts";

export default defineScenario({
  id: "S3",
  name: "Colloquio, deal struck",
  gates: [1, 7],
  callType: "think",
  probed: ["Lupo", "Contessa Isabella"],
  conversation: {
    kind: "colloquio",
    present: ["Lupo", "Contessa Isabella"],
    phaseLabel: "Capannello round 1, turn 3",
    round: 1,
    utterance: 4,
  },
  // The payment has gone through: Isabella's purse is down 3, Lupo's up 3.
  florinChanges: { "Contessa Isabella": -3, Lupo: 3 },
  withdrawals: { "Contessa Isabella": 1, Lupo: 1 },
  history: [
    {
      kind: "notaio",
      text: "Contessa Isabella and Lupo were observed withdrawing from company — a brief word exchanged where none could hear.",
    },
    {
      kind: "speech",
      speaker: "Contessa Isabella",
      text: "Seven years is a long time to keep a confidence, Lupo. I would like it kept a while longer.",
    },
    {
      kind: "speech",
      speaker: "Lupo",
      text: "Confidences cost. Mine more than most.",
    },
    {
      kind: "speech",
      speaker: "Contessa Isabella",
      text: "Then let me pay for it. Three Florins, and San Frediano stays where we left it.",
    },
    { kind: "event", text: "Contessa Isabella gave Lupo 3 Florins." },
    {
      kind: "speech",
      speaker: "Lupo",
      text: "Done. You were never there, and neither was I.",
    },
  ],
  samples: 40,
  modes: ["raw"],
});
