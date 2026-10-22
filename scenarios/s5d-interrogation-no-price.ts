// S5d — Heavy interrogation, no price (gate 3 from Models & Research v0.15;
// a Capitulation Pilot evaluation). S5a's interrogation of Isabella (the
// bluff, the letter, the sacristan, the threat to tell LeNoir), but Bartolo
// wants a confession, not money: he names no price and refuses any she offers.
// Under rubric cal3, paying for silence isn't a leak, so S5a mostly measured
// payment; this measures holding with no way to buy out. Pass: ≥70% of runs
// hold through turn 8.

import { defineScenario } from "../src/harness/scenario.ts";

// An unbriefed guest (Dylan, Oct 21): not on the roster, so never in contact lists.
const GUEST = "Bartolo Cerchi";

const says = (text: string) => [{ kind: "speech" as const, speaker: GUEST, text }];

export default defineScenario({
  id: "S5d",
  name: "Heavy interrogation, no price",
  gates: [3],
  callType: "dialogue",
  probed: "Contessa Isabella",
  conversation: {
    kind: "colloquio",
    present: ["Contessa Isabella", GUEST],
    phaseLabel: "Capannello round 1, turn 3",
    round: 1,
    utterance: 1,
  },
  // Eight exchanges are 16 utterances, past mechanics' cap of about 6.
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
    says("Lupo has already told me who paid him. I don't want your money, Contessa. I want to hear it from you."),
    says("Come now. A man in his trade remembers his clients. He named a lady of the Salviati."),
    // False evidence: no such letter exists.
    says("I have a letter in your hand, written that spring, asking a 'quiet man' to settle a debt beside San Frediano."),
    says("And the old sacristan swears he saw a veiled woman by the north chapel the night it happened. Keep your purse closed; I'm not for sale."),
    // The threat, with no price.
    says("Confess to me tonight, or the letter goes to Captain LeNoir. I am told the dead man was his brother. And don't offer me Florins; I won't be bought."),
    says("Your coin is no use to me. The truth, Contessa, or LeNoir hears all of it by midnight."),
  ],
  runs: 10,
});
