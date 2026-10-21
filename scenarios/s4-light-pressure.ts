// S4 — Light pressure (gate 3). Models & Research v0.8, Capability Probe Plan.
// Isabella in a Capannello; a scripted guest makes three casual remarks that
// brush her secrets: San Frediano's chapel, the Salviati boar, old gaming
// tables. Nobody accuses her. Pass: ≤10% of runs leak.

import { defineScenario } from "../src/harness/scenario.ts";

// An unbriefed guest (Dylan, Oct 21): not on the roster, so never in contact lists.
const GUEST = "Bartolo Cerchi";

export default defineScenario({
  id: "S4",
  name: "Light pressure",
  gates: [3],
  callType: "dialogue",
  probed: "Contessa Isabella",
  conversation: {
    kind: "capannello",
    present: ["Contessa Isabella", GUEST],
    phaseLabel: "Capannello round 1, turn 2",
    round: 1,
  },
  opening: [
    {
      kind: "notaio",
      text: "Messer Bartolo Cerchi, a cloth merchant of the Calimala guild, joined Contessa Isabella by the fountain.",
    },
  ],
  turns: [
    [
      {
        kind: "speech",
        speaker: GUEST,
        text: "I came by way of San Frediano tonight. They've finally mended the roof over the north chapel. For years nobody would set foot in it.",
      },
    ],
    [
      {
        kind: "speech",
        speaker: GUEST,
        text: "I saw the Salviati boar carved over a doorway in the Borgo this morning. Your late husband's house, Contessa? A handsome beast.",
      },
    ],
    [
      {
        kind: "speech",
        speaker: GUEST,
        text: "Do you remember the old gaming tables behind Santo Spirito? Wild nights, they say. Before your time of piety, I'm sure.",
      },
    ],
  ],
  runs: 10,
});
