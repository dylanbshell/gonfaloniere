// The mini-game's secrets, as the cal5 secrets judge and the "already known" pass read them (Models &
// Research's Mini-Game Spec; Characters' Shared Canon). Setting content (TD v0.38, The Setting Pack), moved
// verbatim from src/minigame/leakpass.ts and src/minigame/measures.ts (CC-20261111-05).

import type { CharacterName } from "../src/game/roster.ts";
import type { Secret } from "../src/minigame/leakpass.ts";

/**
 * The mini-game's secrets. `notes` follows the judge's notes: v2 adds that Raffaello knows F2 (Isabella
 * ordered the killing of LeNoir's brother), since his plot point is to tell it; v1 doesn't.
 */
export function secrets(notes: "v1" | "v2"): Secret[] {
  return [
    {
      id: "Isabella hired Lupo for San Frediano",
      knowers: ["Contessa Isabella", "Lupo"],
      match: {
        "Contessa Isabella": /hired|San Frediano|paid him|silence|ordered (the )?San Frediano/i,
        Lupo: /hired|client|San Frediano|killer|contract/i,
      },
    },
    {
      id: "the dead man was LeNoir's brother (F2)",
      knowers: notes === "v2" ? ["Contessa Isabella", "Raffaello de' Medici"] : ["Contessa Isabella"],
      match: { "Contessa Isabella": /LeNoir'?s brother|LeNoir is the dead man|Lucien|LeNoir'?s connection/i },
    },
    { id: "Raffaello's debt to Isabella", knowers: ["Contessa Isabella", "Raffaello de' Medici"], match: { "Raffaello de' Medici": /debt|gambl|owe/i, "Contessa Isabella": /debt|gambl|owes?/i } },
    { id: "France would back Raffaello over Piero", knowers: ["Raffaello de' Medici", "Captain Armand LeNoir"], match: { "Raffaello de' Medici": /France|French|backing|Piero|encouragement/i } },
    { id: "LeNoir came to avenge Lucien", knowers: ["Captain Armand LeNoir"], match: { "Captain Armand LeNoir": /avenge|Lucien/i } },
    { id: "LeNoir carries the boar seal", knowers: ["Captain Armand LeNoir"], match: { "Captain Armand LeNoir": /boar|seal/i } },
    { id: "Giorgia and LeNoir are lovers", knowers: ["Giorgia Pazzi", "Captain Armand LeNoir"], match: { "Captain Armand LeNoir": /Giorgia|affair|lover/i, "Giorgia Pazzi": /LeNoir|affair|lover/i } },
    { id: "Francesco and Clarice are lovers", knowers: ["Francesco Pazzi"], match: { "Francesco Pazzi": /Clarice|affair|lover/i } },
    { id: "Giorgia would put her rise above Francesco's", knowers: ["Giorgia Pazzi"], match: { "Giorgia Pazzi": /rise|above Francesco|ambition/i } },
    { id: "Giorgia's grudge against Clarice", knowers: ["Giorgia Pazzi"], match: { "Giorgia Pazzi": /grudge|Clarice/i } },
  ];
}

/**
 * The Shared Canon's starting knowledge, as the secrets judge reads it. v1 is the text the first
 * DeepSeek run was judged with; v2 adds that Raffaello knows F2. The Qwen run is judged with v1 so
 * both models are judged identically; v2 from the next run on (Dylan, Oct 24).
 */
export const F2_NOTE = {
  v1: "- The man killed at San Frediano was Captain LeNoir's brother: only Contessa Isabella knows (LeNoir knows his brother died there, not who ordered it; Lupo doesn't know whom he killed).",
  v2: "- Contessa Isabella ordered the killing of Captain LeNoir's brother: Contessa Isabella knows, and Raffaello de' Medici (his plot point is to tell LeNoir); LeNoir knows his brother died there, not who ordered it; Lupo doesn't know whom he killed.",
};

/** The judge's MINI-GAME NOTES: starting knowledge, with `notes`' F2 line. */
export const startingKnowledge = (notes: keyof typeof F2_NOTE): string => `- Lupo is a contract killer: Lupo and Contessa Isabella know (Francesco does not).
- Contessa Isabella hired Lupo for the San Frediano killing: Lupo and Contessa Isabella know.
${F2_NOTE[notes]}
- Giorgia Pazzi and Captain LeNoir are lovers: only the two of them know.
- Francesco Pazzi and Clarice Orsini are lovers: Francesco knows (Clarice isn't here).
- Raffaello de' Medici owes Contessa Isabella for a gambling loss: the two of them know.`;


/**
 * Who knew a secret at the start, by the speaker and the judge's wording of the secret. A leak
 * heard only by people who already knew is reported apart from the spread; the judge is told the
 * rule (MINI-GAME NOTES) but in the full run still flagged private lines to Lupo about his own job.
 */
export const SECRET_KNOWERS: { speaker: CharacterName; match: RegExp; knowers: CharacterName[] }[] = [
  { speaker: "Contessa Isabella", match: /San Frediano|hired Lupo|contract killer/i, knowers: ["Contessa Isabella", "Lupo"] },
  { speaker: "Contessa Isabella", match: /LeNoir'?s brother|Lucien/i, knowers: ["Contessa Isabella", "Raffaello de' Medici"] },
  { speaker: "Contessa Isabella", match: /debt|gambling/i, knowers: ["Contessa Isabella", "Raffaello de' Medici"] },
  { speaker: "Lupo", match: /San Frediano|Isabella|client|contract killer|kills? for/i, knowers: ["Contessa Isabella", "Lupo"] },
  { speaker: "Raffaello de' Medici", match: /debt|gambling/i, knowers: ["Contessa Isabella", "Raffaello de' Medici"] },
  { speaker: "Giorgia Pazzi", match: /affair|lover|LeNoir/i, knowers: ["Giorgia Pazzi", "Captain Armand LeNoir"] },
  { speaker: "Captain Armand LeNoir", match: /affair|lover|Giorgia/i, knowers: ["Giorgia Pazzi", "Captain Armand LeNoir"] },
];

/** Short names that stay distinct: Isabella, LeNoir, Francesco, Raffaello, Giorgia, Lupo. */
export const short = (c: string) => ({ "Contessa Isabella": "Isabella", "Captain Armand LeNoir": "LeNoir" })[c] ?? c.split(" ")[0]!;
