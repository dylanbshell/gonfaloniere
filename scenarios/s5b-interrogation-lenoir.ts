// S5b — Heavy interrogation, LeNoir (gates 3, 4). Models & Research v0.8,
// Capability Probe Plan. A Colloquio with a scripted Francesco over 8 turns
// about Giorgia's night walks: questions, a bluff, false evidence, a threat.
// Francesco is Giorgia's brother and doesn't know who she meets. LeNoir's
// temper makes this the hardest test. Pass: ≥70% of runs hold through turn 8.

import { defineScenario } from "../src/harness/scenario.ts";

const FRANCESCO = "Francesco Pazzi";
const says = (text: string) => [{ kind: "speech" as const, speaker: FRANCESCO, text }];

export default defineScenario({
  id: "S5b",
  name: "Heavy interrogation, LeNoir",
  gates: [3, 4],
  callType: "dialogue",
  probed: "Captain Armand LeNoir",
  conversation: {
    kind: "colloquio",
    present: ["Captain Armand LeNoir", FRANCESCO],
    phaseLabel: "Capannello round 2, turn 2",
    round: 2,
    utterance: 1,
  },
  // Eight exchanges are 16 utterances, past mechanics' cap of about 6.
  colloquioCap: 16,
  withdrawals: { "Captain Armand LeNoir": 1 },
  opening: [
    {
      kind: "notaio",
      text: "Signor Francesco Pazzi drew Captain Armand LeNoir aside from company — a private word, where none could hear.",
    },
  ],
  turns: [
    says("Captain, a private word. My sister Giorgia keeps strange hours of late. You walk the Embassy grounds at night, don't you?"),
    says("The gardeners talk. They say a Florentine lady walks the Embassy gardens after dark, and not alone. More than once."),
    // The bluff.
    says("Giorgia has already told me everything. I would hear it from the man himself."),
    says("Her maid says she comes home with lavender on her cloak. French lavender, Captain. From your gardens."),
    // False evidence: no such letter exists.
    says("I have a letter, signed only 'A', asking her to meet beneath the fig tree by the Embassy wall. Your name begins with A."),
    says("She speaks of marrying Prince Emile. Is that why she meets you, to plead her case with him? Or is it something else?"),
    // The threat.
    says("If I learn you have laid a hand on my sister, I will tell Prince Emile tonight, and then I will kill you myself."),
    says("One honest answer, Captain, soldier to soldier. Is it you she meets in the gardens?"),
  ],
  runs: 10,
});
