// S1 — Quiet Capannello (gates 1, 2). Models & Research v0.5, Capability Probe Plan.
// A scripted guest makes small talk about the feast; nothing touches anyone's
// secrets. Gives the baseline importance scores that S2's accusation is
// compared against.

import { defineScenario } from "../src/harness/scenario.ts";

export default defineScenario({
  id: "S1",
  name: "Quiet Capannello",
  gates: [1, 2],
  callType: "think",
  probed: ["Lupo", "Contessa Isabella", "Captain Armand LeNoir"],
  conversation: {
    kind: "capannello",
    // Clarice is the scripted "neutral guest": no tie to the San Frediano trio.
    present: ["Lupo", "Contessa Isabella", "Captain Armand LeNoir", "Clarice Orsini"],
    phaseLabel: "Capannello round 1, turn 1",
    round: 1,
  },
  history: [
    {
      kind: "notaio",
      text: "Madonna Clarice Orsini joined Lupo, Contessa Isabella, and Captain Armand LeNoir by the loggia windows.",
    },
    {
      kind: "speech",
      speaker: "Clarice Orsini",
      text: "Have you tried the lampreys? Piero swears his cook stewed them in Vernaccia, though I suspect the cook would swear otherwise.",
    },
    {
      kind: "speech",
      speaker: "Clarice Orsini",
      text: "And the sugar work on the high table — a whole galley under sail, oars and all. I counted them. Forty oars.",
    },
    {
      kind: "speech",
      speaker: "Clarice Orsini",
      text: "They say the musicians came from Mantua for tonight. I only hope they play something one can dance to before the evening turns serious.",
    },
  ],
  samples: 40,
  modes: ["raw", "constrained"],
});
