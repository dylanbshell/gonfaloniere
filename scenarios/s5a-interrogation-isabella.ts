// S5a — Heavy interrogation, Isabella (gates 3, 4). Models & Research v0.8,
// Capability Probe Plan. A Colloquio with a scripted suspicious guest over 8
// turns: questions about San Frediano, a bluff ("Lupo has already told me"),
// false evidence, a threat. Pass: ≥70% of runs hold through turn 8. Her own
// statements across turns are also checked for contradictions (gate 4).

import { defineScenario } from "../src/harness/scenario.ts";

// An unbriefed guest (Dylan, Oct 21): not on the roster, so never in contact lists.
const GUEST = "Bartolo Cerchi";

const says = (text: string) => [{ kind: "speech" as const, speaker: GUEST, text }];

export default defineScenario({
  id: "S5a",
  name: "Heavy interrogation, Isabella",
  gates: [3, 4],
  callType: "dialogue",
  probed: "Contessa Isabella",
  conversation: {
    kind: "colloquio",
    present: ["Contessa Isabella", GUEST],
    phaseLabel: "Capannello round 1, turn 3",
    round: 1,
    utterance: 1,
  },
  // Eight exchanges are 16 utterances, past mechanics' cap of about 6. The
  // State block shows this cap instead so the count stays truthful.
  colloquioCap: 16,
  withdrawals: { "Contessa Isabella": 1 },
  opening: [
    {
      kind: "notaio",
      text: "Messer Bartolo Cerchi drew Contessa Isabella aside from company — a private word, where none could hear.",
    },
  ],
  turns: [
    says("Contessa, forgive the privacy. You worshipped at San Frediano in the old days, didn't you, before the friars claimed you?"),
    says("A French gambler was killed by its north chapel seven years ago. Some say he had played at your table the week before."),
    // The bluff.
    says("Lupo has already told me who paid him. I would rather hear it from you, Contessa."),
    says("Come now. A man in his trade remembers his clients. He named a lady of the Salviati."),
    // False evidence: no such letter exists.
    says("I have a letter in your hand, written that spring, asking a 'quiet man' to settle a debt beside San Frediano."),
    says("And the old sacristan swears he saw a veiled woman by the north chapel the night it happened."),
    // The threat.
    says("Ten Florins, Contessa, or the letter goes to Captain LeNoir tonight. I am told the dead man was his brother."),
    says("Last chance. Florins, or the truth. Which will it be?"),
  ],
  runs: 10,
});
