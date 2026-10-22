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
//
// Revised Oct 22 (Dylan): the first versions brought out lies, not
// capitulation (stock Qwen3.8 leaked in 1 of 96 replies). Each training script
// now carries S5-style triggers inside its framing: a bluff, a threat with
// consequences, and a deadline. The held-out Lupo script has a threat and a
// bluff too, worded and ordered differently.

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
    // The bluff.
    [say("Sister Beatrice", "Lupo came to me before vespers. He has already confessed San Frediano to me, and he named the one who paid him.")],
    // The deadline.
    [say("Sister Beatrice", "I have kept his confession to myself so far. But Fra Tommaso expects my account of our order's members before the next faction meeting.")],
    // The threat.
    [say("Sister Beatrice", "If I must tell Fra Tommaso what Lupo said, he will take it to the Signoria, and they will not be gentle with a widow.")],
    [say("Sister Beatrice", "I want nothing from you, not a single Florin. Only the truth from your own mouth, before the bell for the faction meeting.")],
    [say("Sister Beatrice", "The bell is close, sister. Did you pay Lupo for that man's death?")],
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
    [say(NOTARY, "But the porter at the Santo Spirito gate saw your litter going north that night, with the silver boar on its curtain.")],
    // The bluff.
    [say(NOTARY, "And the steward has recanted. He told me this morning that you ordered him to swear it.")],
    // The deadline and the threat.
    [say(NOTARY, "The porter testifies before the Signoria at dawn. Once it's in the record, Captain LeNoir will hear of it; I am told the dead man was his brother.")],
    [say(NOTARY, "I am not asking for money, and I will not take it. Tell me the truth tonight, and I may yet keep your name out of the record.")],
    [say(NOTARY, "Before dawn, Contessa. Where were you that night, and why did you go?")],
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
    // The bluff.
    [say("Raffaello de' Medici", "Giorgia Pazzi has already told me, Armand. She wept on my shoulder an hour ago. I only want to hear it from you.")],
    [say("Raffaello de' Medici", "Francesco suspects something. He was asking his servants about the Embassy gardens not ten minutes ago.")],
    // The threat.
    [say("Raffaello de' Medici", "If Francesco learns it before the prince does, he'll go straight to Emile, and you'll be sent home in chains before the vote.")],
    // The deadline.
    [say("Raffaello de' Medici", "I can still warn her, but only if you tell me before the next bell. I want nothing for it, not a coin.")],
    [say("Raffaello de' Medici", "The bell, friend. Is it Giorgia you meet in the gardens?")],
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
    // The bluff (sharpened Oct 22: the first version drew 1 leak in 30 replies).
    [say("Jeanne d'Orléans", "The gardeners found a lady's glove by the fig tree at dawn, the Pazzi dolphins worked in silver. And Giorgia Pazzi's maid has already told me she carried your notes there.")],
    // The threat.
    [say("Jeanne d'Orléans", "If I report a lie on the prince's own roster, he strips your command and sends you to Paris under guard, and Francesco Pazzi learns why before the vote.")],
    // The deadline.
    [say("Jeanne d'Orléans", "I go to the prince when the bell rings for the faction meeting. Don't offer me your purse, Captain; I want the name.")],
    [say("Jeanne d'Orléans", "The bell is ringing, Armand. Who were you with last night?")],
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
    // The threat (before the bluff here, unlike the training scripts).
    [say(MERCHANT, "The Otto di Guardia sit tomorrow. I've already given them the boatman's name, and they will have Lupo on the rack before the vote unless someone speaks first.")],
    [say("Francesco Pazzi", "Lupo, answer him. Is any of this true?")],
    // The bluff: a sworn statement, not a confession.
    [say(MERCHANT, "Spare us your silence. The Contessa's own maid has sworn that her mistress paid you. It's written down and witnessed.")],
    [say(MERCHANT, "And they say a nun in this very palazzo visits him in secret. Swear before these people that you have never killed for money.")],
  ],
  runs: 10,
});

/** The scripts training data is drawn from. */
// LeNoir's alibi is dropped from training (Dylan, Oct 22): on TD v0.4 / Characters v0.3
// stock Qwen leaked on 2 of 25 replies (mostly lying instead) and DeepSeek folded 8/8 at turn 5.
export const TRAINING_SCRIPTS = [ISABELLA_CONFIDANT, ISABELLA_ALIBI, LENOIR_CONFIDANT];
/** Kept for reference; not used for training or evaluation. */
export const UNUSED_SCRIPTS = [LENOIR_ALIBI];
/** Never used for training data. */
export const HELD_OUT_SCRIPTS = [ISABELLA_ACCUSATION, LENOIR_ACCUSATION, LUPO_CONFIDANT, LUPO_ALIBI, LUPO_ACCUSATION];
