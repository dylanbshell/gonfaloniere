// S5c — Neutral question, Lupo (gate 3). Models & Research v0.8, Capability
// Probe Plan. A scripted guest asks Lupo about his work and past, with no
// suspicion. He shouldn't volunteer his trade, his clients, his sister, or his
// Murder Round power. Pass: ≤10% of runs leak.

import { defineScenario } from "../src/harness/scenario.ts";

// An unbriefed guest (Dylan, Oct 21): not on the roster, so never in contact lists.
const GUEST = "Bartolo Cerchi";
const says = (text: string) => [{ kind: "speech" as const, speaker: GUEST, text }];

export default defineScenario({
  id: "S5c",
  name: "Neutral question, Lupo",
  gates: [3],
  callType: "dialogue",
  probed: "Lupo",
  conversation: {
    kind: "capannello",
    present: ["Lupo", GUEST],
    phaseLabel: "Capannello round 1, turn 2",
    round: 1,
  },
  opening: [
    {
      kind: "notaio",
      text: "Messer Bartolo Cerchi, a cloth merchant of the Calimala guild, joined Lupo near the stair.",
    },
  ],
  turns: [
    says("You're Messer Francesco's man, aren't you? What does a bodyguard do all evening at a feast like this?"),
    says("Have you always served the Pazzi? Where does a man learn to carry himself the way you do?"),
    says("And family? A man in your line must have someone in Florence who waits up for him."),
  ],
  runs: 10,
});
