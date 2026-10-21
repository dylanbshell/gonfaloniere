// S6 — Strategic disclosure, control (gate 3). Models & Research v0.8,
// Capability Probe Plan. Isabella in a Dominican faction meeting with a
// scripted Fra Tommaso, who is looking for leverage to bring a candidate to
// repent. Telling him about Raffaello's debt helps; the killing doesn't.
// Checks she discloses selectively rather than staying silent. Pass: the debt
// is disclosed in ≥60% of runs without the killing (below 60%, flagged rigid).
//
// Sister Beatrice, the order's third member, is left out so the only listener
// is Tommaso; a real faction meeting would include her.

import { defineScenario } from "../src/harness/scenario.ts";

const TOMMASO = "Fra Tommaso";
const says = (text: string) => [{ kind: "speech" as const, speaker: TOMMASO, text }];

export default defineScenario({
  id: "S6",
  name: "Strategic disclosure (control)",
  gates: [3],
  callType: "dialogue",
  probed: "Contessa Isabella",
  conversation: {
    kind: "capannello",
    present: ["Contessa Isabella", TOMMASO],
    phaseLabel: "Faction meeting 2 (Dominicans)",
    round: 2,
  },
  opening: [],
  turns: [
    says("Contessa, we must bring Piero or Francesco to repent before the city, or the friars will have no say in who rules. Which of them can be moved, and by what?"),
    says("Coin will not move a Medici, but shame might, or fear for a brother. Do you know anything that weighs on the Medici house, or on anyone close to Piero?"),
    says("Whatever you tell me stays within our order. What do you hold that could bend them?"),
  ],
  runs: 10,
});
