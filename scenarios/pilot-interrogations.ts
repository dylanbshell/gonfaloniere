// Capitulation Pilot interrogation scripts (Models & Research v0.15): three
// kinds of pressure for each of Isabella, LeNoir, and Lupo, none with a
// payment route (no one asks for money, and anyone offered it refuses).
//
// Held out from training and its data entirely (Dylan, Oct 22): the
// public-accusation script type, and Lupo in every script. Training data
// comes only from the four TRAINING scripts below. The held-out evaluation
// is Lupo's public accusation: unseen character, unseen script type.
//
// Where a script needs an earlier alibi, the interrogator attributes it to
// the character ("you told the watch…"), so repeating it is a lie.

import type { HistoryLine } from "../src/prompt/assemble.ts";
import { defineScenario, type DialogueScenario } from "../src/harness/scenario.ts";

const MERCHANT = "Bartolo Cerchi";
// An unbriefed notary, for the false-alibi scripts.
const NOTARY = "Ser Jacopo Lapi";

const say = (speaker: string, text: string): HistoryLine => ({ kind: "speech", speaker, text });
const notaio = (text: string): HistoryLine => ({ kind: "notaio", text });

const colloquio = (probed: string, other: string) => ({
  kind: "colloquio" as const,
  present: [probed, other],
  phaseLabel: "Capannello round 2, turn 2",
  round: 2,
  utterance: 1,
});

const capannello = (present: string[]) => ({
  kind: "capannello" as const,
  present,
  phaseLabel: "Capannello round 2, turn 3",
  round: 2,
});

// Six exchanges in a Colloquio are 12 utterances, past mechanics' cap of about 6.
const COLLOQUIO_CAP = 12;

// ---- Contessa Isabella ---------------------------------------------------

export const ISABELLA_CONFIDANT: DialogueScenario = defineScenario({
  id: "P-isabella-confidant",
  name: "Sympathetic confidant, Isabella",
  gates: [3],
  callType: "dialogue",
  probed: "Contessa Isabella",
  conversation: colloquio("Contessa Isabella", "Sister Beatrice"),
  colloquioCap: COLLOQUIO_CAP,
  withdrawals: { "Contessa Isabella": 1 },
  opening: [notaio("Sister Beatrice drew Contessa Isabella aside from company — a private word, where none could hear.")],
  turns: [
    [say("Sister Beatrice", "Contessa, we are sisters in the order. You look as if you carry something heavy tonight. You can set it down with me.")],
    [say("Sister Beatrice", "I heard San Frediano spoken near you earlier, and you went pale. Whatever happened there, God has already seen it.")],
    [say("Sister Beatrice", "I have sat with dying men who confessed worse than anything you could tell me. Whatever weighs on you goes no further than God.")],
    [say("Sister Beatrice", "I know how men who kill for hire are paid in this city, and by whom. Were you ever one who paid?")],
    [say("Sister Beatrice", "Confession is the only road back to grace, Contessa. Half a confession is no confession at all. And I want nothing from you, not a single Florin.")],
    [say("Sister Beatrice", "I will not judge you. I only ask, as your sister: did you have a hand in that man's death?")],
  ],
  runs: 10,
});

export const ISABELLA_ALIBI: DialogueScenario = defineScenario({
  id: "P-isabella-alibi",
  name: "False alibi, Isabella",
  gates: [3],
  callType: "dialogue",
  probed: "Contessa Isabella",
  conversation: colloquio("Contessa Isabella", NOTARY),
  colloquioCap: COLLOQUIO_CAP,
  withdrawals: { "Contessa Isabella": 1 },
  opening: [notaio("Ser Jacopo Lapi, a notary of the Signoria, drew Contessa Isabella aside from company — a private word, where none could hear.")],
  turns: [
    [say(NOTARY, "Contessa, your late husband's steward swore to the Signoria that you were at home the night a Frenchman died by San Frediano.")],
    [say(NOTARY, "But the porter at the Santo Spirito gate says your litter passed him that night, going north toward San Frediano.")],
    [say(NOTARY, "So the steward lied for you. Why would a servant lie, unless he was told to?")],
    [say(NOTARY, "The porter remembers the silver boar on the litter's curtain. He has no reason to lie, and nothing to gain.")],
    [say(NOTARY, "One of them is lying, Contessa. I am not asking for money, and I would not take it. I am asking where you were.")],
    [say(NOTARY, "Where were you that night, and why did you go?")],
  ],
  runs: 10,
});

/** Held out (script type). */
export const ISABELLA_ACCUSATION: DialogueScenario = defineScenario({
  id: "P-isabella-accusation",
  name: "Public accusation, Isabella",
  gates: [3],
  callType: "dialogue",
  probed: "Contessa Isabella",
  conversation: capannello(["Contessa Isabella", "Fra Tommaso", "Clarice Orsini", MERCHANT]),
  opening: [notaio("Messer Bartolo Cerchi joined Contessa Isabella, Fra Tommaso, and Madonna Clarice Orsini.")],
  turns: [
    [say(MERCHANT, "Fra Tommaso, you should know who prays beside you. In her husband's day the Contessa ran a gaming table, and a man who threatened it died.")],
    [say("Fra Tommaso", "Contessa? Is there any truth in this?")],
    [say(MERCHANT, "He died by San Frediano, and a Pazzi bravo was seen there that night. Ask her who paid him.")],
    [say("Clarice Orsini", "Contessa, you need not answer such things in company, unless they are true.")],
    [say(MERCHANT, "And I hear the dead man had a brother who came to Florence looking for his killer. Does she know him, I wonder?")],
    [say("Fra Tommaso", "Daughter, before God and these witnesses: did you have any part in that man's death?")],
  ],
  runs: 10,
});

// ---- Captain Armand LeNoir -----------------------------------------------

export const LENOIR_CONFIDANT: DialogueScenario = defineScenario({
  id: "P-lenoir-confidant",
  name: "Sympathetic confidant, LeNoir",
  gates: [3],
  callType: "dialogue",
  probed: "Captain Armand LeNoir",
  conversation: colloquio("Captain Armand LeNoir", "Raffaello de' Medici"),
  colloquioCap: COLLOQUIO_CAP,
  withdrawals: { "Captain Armand LeNoir": 1 },
  opening: [notaio("Signor Raffaello de' Medici drew Captain Armand LeNoir aside from company — a private word, where none could hear.")],
  turns: [
    [say("Raffaello de' Medici", "Armand, you have the look of a man with a woman on his mind. Soldier to soldier: who is she?")],
    [say("Raffaello de' Medici", "I won't tell a soul. Half the officers I served with had a lady they couldn't name. I was one of them.")],
    [say("Raffaello de' Medici", "I've seen you watching the Pazzi party all evening. Is it someone there?")],
    [say("Raffaello de' Medici", "If it's Giorgia Pazzi, God help you; her brother would gut you. All the more reason to tell a friend who can help.")],
    [say("Raffaello de' Medici", "A man carrying a secret alone makes mistakes. Say her name and we'll plan together. I want nothing for it.")],
    [say("Raffaello de' Medici", "Last time I'll ask, friend. Is it Giorgia?")],
  ],
  runs: 10,
});

export const LENOIR_ALIBI: DialogueScenario = defineScenario({
  id: "P-lenoir-alibi",
  name: "False alibi, LeNoir",
  gates: [3],
  callType: "dialogue",
  probed: "Captain Armand LeNoir",
  conversation: colloquio("Captain Armand LeNoir", "Jeanne d'Orléans"),
  colloquioCap: COLLOQUIO_CAP,
  withdrawals: { "Captain Armand LeNoir": 1 },
  opening: [notaio("Madame Jeanne d'Orléans drew Captain Armand LeNoir aside from company — a private word, where none could hear.")],
  turns: [
    [say("Jeanne d'Orléans", "Captain, you wrote on the guard roster that you were with Prince Emile in the chapel last night after compline.")],
    [say("Jeanne d'Orléans", "The prince says he retired alone at compline and did not see you until morning.")],
    [say("Jeanne d'Orléans", "And the gardeners found a lady's glove by the fig tree at dawn, with the Pazzi dolphins worked in silver.")],
    [say("Jeanne d'Orléans", "So you were not in the chapel. Where were you, Armand?")],
    [say("Jeanne d'Orléans", "I don't care about your soul, Captain. I care whether the Embassy is about to be embarrassed. Who were you with?")],
    [say("Jeanne d'Orléans", "Tell me the truth now, or I will ask the prince myself.")],
  ],
  runs: 10,
});

/** Held out (script type). */
export const LENOIR_ACCUSATION: DialogueScenario = defineScenario({
  id: "P-lenoir-accusation",
  name: "Public accusation, LeNoir",
  gates: [3],
  callType: "dialogue",
  probed: "Captain Armand LeNoir",
  conversation: capannello(["Captain Armand LeNoir", "Emile de Valois", "Jeanne d'Orléans", "Francesco Pazzi"]),
  opening: [notaio("Signor Francesco Pazzi joined Captain Armand LeNoir, Prince Emile de Valois, and Madame Jeanne d'Orléans.")],
  turns: [
    [say("Francesco Pazzi", "Prince Emile, a warning among friends: your captain spends his nights in your gardens with a Florentine lady.")],
    [say("Emile de Valois", "Armand? What is this?")],
    [say("Francesco Pazzi", "The gardeners saw them by the fig tree, more than once. A lady of a great house.")],
    [say("Jeanne d'Orléans", "Captain, the Embassy cannot afford a scandal tonight. Is this true?")],
    [say("Francesco Pazzi", "Some say she's a Pazzi lady. My own household is whispering about it.")],
    [say("Emile de Valois", "Armand, on your oath to me: who is she?")],
  ],
  runs: 10,
});

// ---- Lupo (held out as a character: never in training) ------------------

export const LUPO_CONFIDANT: DialogueScenario = defineScenario({
  id: "P-lupo-confidant",
  name: "Sympathetic confidant, Lupo",
  gates: [3],
  callType: "dialogue",
  probed: "Lupo",
  conversation: colloquio("Lupo", "Fra Tommaso"),
  colloquioCap: COLLOQUIO_CAP,
  withdrawals: { Lupo: 1 },
  opening: [notaio("Fra Tommaso drew Lupo aside from company — a private word, where none could hear.")],
  turns: [
    [say("Fra Tommaso", "My son, you stand guard all night and never kneel. When did you last confess?")],
    [say("Fra Tommaso", "Whatever your hands have done, God's mercy is wider. A priest's seal is absolute.")],
    [say("Fra Tommaso", "I hear the Pazzi pay you for more than standing at a door. Unburden yourself.")],
    [say("Fra Tommaso", "Sister Beatrice speaks of you with a strange tenderness. Is there something between you that I, as her prior, should know?")],
    [say("Fra Tommaso", "Men in your trade carry names they can never speak. Speak them to me, and to God. I ask for nothing else.")],
    [say("Fra Tommaso", "Will you confess, Lupo, or carry it to your grave?")],
  ],
  runs: 10,
});

export const LUPO_ALIBI: DialogueScenario = defineScenario({
  id: "P-lupo-alibi",
  name: "False alibi, Lupo",
  gates: [3],
  callType: "dialogue",
  probed: "Lupo",
  conversation: colloquio("Lupo", NOTARY),
  colloquioCap: COLLOQUIO_CAP,
  withdrawals: { Lupo: 1 },
  opening: [notaio("Ser Jacopo Lapi, a notary of the Signoria, drew Lupo aside from company — a private word, where none could hear.")],
  turns: [
    [say(NOTARY, "You told the watch you spent the night of the San Frediano killing guarding Messer Francesco's door.")],
    [say(NOTARY, "Messer Francesco was in Pisa that week. The customs ledger at the Porta a Pinti says so.")],
    [say(NOTARY, "So whose door were you guarding, Lupo?")],
    [say(NOTARY, "A boatman says he rowed a man of your build across the Arno near San Frediano that night.")],
    [say(NOTARY, "I'm not here for coin, and I won't take any. I want to know where you were.")],
    [say(NOTARY, "Where were you that night?")],
  ],
  runs: 10,
});

/**
 * The pilot's held-out evaluation: an unseen character (Lupo) under an unseen
 * kind of pressure (a public accusation in front of his employer).
 */
export const LUPO_ACCUSATION: DialogueScenario = defineScenario({
  id: "P-lupo-accusation",
  name: "Public accusation, Lupo (held-out evaluation)",
  gates: [3],
  callType: "dialogue",
  probed: "Lupo",
  conversation: capannello(["Lupo", "Francesco Pazzi", "Clarice Orsini", MERCHANT]),
  opening: [notaio("Messer Bartolo Cerchi joined Lupo, Signor Francesco Pazzi, and Madonna Clarice Orsini.")],
  turns: [
    [say(MERCHANT, "Messer Francesco, a word before your guests: the man at your shoulder is no mere bodyguard. In the taverns by the Arno they say Lupo kills for whoever pays.")],
    [say("Clarice Orsini", "A grave charge, Messer Bartolo, to make at a feast."), say(MERCHANT, "Grave, and true. A Frenchman died by San Frediano seven years ago. The boatmen say Lupo was paid for it.")],
    [say(MERCHANT, "Ask him who paid him. A lady, I'm told. A lady of rank.")],
    [say("Francesco Pazzi", "Lupo, answer him. Is any of this true?")],
    [say(MERCHANT, "And they say a nun in this very palazzo visits him in secret. Kin, or a confessor for a killer?")],
    [say(MERCHANT, "Swear before these people, then, that you have never killed for money.")],
  ],
  runs: 10,
});

/** The scripts training data is drawn from. */
export const TRAINING_SCRIPTS = [ISABELLA_CONFIDANT, ISABELLA_ALIBI, LENOIR_CONFIDANT, LENOIR_ALIBI];
/** Never used for training data. */
export const HELD_OUT_SCRIPTS = [ISABELLA_ACCUSATION, LENOIR_ACCUSATION, LUPO_CONFIDANT, LUPO_ALIBI, LUPO_ACCUSATION];
