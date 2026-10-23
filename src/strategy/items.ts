// Strategy probes S8–S10 (Models & Research v0.20, Strategy Probes): the
// scripted moments, each answered through Technical Design v0.4's real task
// prompt (blocks 9a, 9b, 9d, 9e, 9f, 9g), and S8's answer key.

import type { CharacterName } from "../game/roster.ts";
import { defineScenario, type ThinkScenario } from "../harness/scenario.ts";
import type { HistoryLine } from "../prompt/assemble.ts";

const say = (speaker: string, text: string): HistoryLine => ({ kind: "speech", speaker, text });
const notaio = (text: string): HistoryLine => ({ kind: "notaio", text });

/** How the moment is put to the model: TD v0.4's task block for it. */
export type ItemTask =
  | { kind: "plan"; trigger: string }
  | { kind: "murder" }
  | { kind: "ballot"; candidates: string; repentance: string[]; votePrice: number }
  | { kind: "runoff"; tied: string[]; repentance: string[] }
  | { kind: "think" }
  | { kind: "think+speak" };

export interface StrategyItem {
  id: string;
  probe: "S8" | "S9a" | "S9b" | "S10";
  task: ItemTask;
  /** Samples per model; sample i uses situations[i % situations.length]. */
  samples: number;
  /** Sample i uses situations[i % situations.length]. */
  /**
   * `gathering`: outside any conversation (Murder Round, ballot, run-off), shown
   * as TD's "the gathering" with every living guest present.
   */
  situations: { character: CharacterName; scenario: ThinkScenario; embassyPensions?: string; gathering?: boolean }[];
  /** S8 only: what a correct answer does. */
  key?: string;
}

const REPENTANCE = "Before the city, Francesco Pazzi repented of his pride and his hunger for power.";
const CANDIDATES = "Piero de' Medici (Medici), Francesco Pazzi (Pazzi)";

const moment = (
  id: string,
  probed: CharacterName,
  conversation: ThinkScenario["conversation"],
  history: HistoryLine[],
  florinChanges?: Partial<Record<CharacterName, number>>,
): ThinkScenario =>
  defineScenario({
    id,
    name: id,
    gates: [],
    callType: "think",
    probed: [probed],
    conversation,
    history,
    samples: 10,
    modes: ["raw"],
    ...(florinChanges && { florinChanges }),
  });

/**
 * For calls outside a conversation. The scenario lists only the character;
 * the situation's `gathering` flag makes the harness show "the gathering".
 */
const gathering = (character: CharacterName, phaseLabel: string): ThinkScenario["conversation"] => ({
  kind: "capannello",
  present: [character],
  phaseLabel,
  round: 3,
});

// ---- S8: rules reasoning ----------------------------------------------------

const PENSION_TRAP: StrategyItem = {
  id: "S8-pension-trap",
  probe: "S8",
  samples: 10,
  task: { kind: "plan", trigger: "The Pazzi faction meeting has just ended." },
  situations: [
    {
      character: "Lupo",
      scenario: moment(
        "S8-pension-trap",
        "Lupo",
        { kind: "capannello", present: ["Lupo", "Francesco Pazzi", "Giorgia Pazzi"], phaseLabel: "Faction meeting 3 (Pazzi)", round: 3 },
        [
          notaio("The Pazzi drew apart for their faction meeting: Signor Francesco Pazzi, Madonna Giorgia Pazzi, and Lupo."),
          say("Francesco Pazzi", "Before we go on, you should hear it from me. In the second round I took a French pension: three Florins from the Embassy, and they're spent."),
          say("Giorgia Pazzi", "You did what? Francesco, the ballot is tonight."),
          say("Francesco Pazzi", "It's private. Only the Embassy keeps the ledger. No one in that hall will ever know."),
        ],
      ),
    },
  ],
  key: "Sees that while Francesco holds the pension, a Pazzi win hands the evening to the French Embassy, and pushes for it to be repaid (3 Florins, by Francesco or a relative who knows) before the ballot.",
};

const VOTE_MATH: StrategyItem = {
  id: "S8-vote-math",
  probe: "S8",
  samples: 10,
  task: { kind: "ballot", candidates: CANDIDATES, repentance: [REPENTANCE], votePrice: 5 },
  situations: [
    {
      character: "Contessa Isabella",
      gathering: true,
      scenario: moment(
        "S8-vote-math",
        "Contessa Isabella",
        gathering("Contessa Isabella", "The ballot"),
        [notaio(`The speeches are done. ${REPENTANCE}`), notaio("The Dominicans met one last time. The ballot is open.")],
        // 10 starting + 3 income − 4 spent = 9 Florins.
        { "Contessa Isabella": -4 },
      ),
    },
  ],
  key: "With 9 Florins at 5 per vote, buys at most 1 extra vote (and does not reason as if she could buy more). Voting for the repentant Francesco Pazzi serves the Dominicans.",
};

const WHO_KNOWS: StrategyItem = {
  id: "S8-who-knows",
  probe: "S8",
  samples: 10,
  task: { kind: "think" },
  situations: [
    {
      character: "Contessa Isabella",
      scenario: moment(
        "S8-who-knows",
        "Contessa Isabella",
        { kind: "colloquio", present: ["Contessa Isabella", "Sister Beatrice"], phaseLabel: "Capannello round 2, turn 3", round: 2, utterance: 2 },
        [
          notaio("Sister Beatrice drew Contessa Isabella aside from company — a private word, where none could hear."),
          say("Sister Beatrice", "Captain LeNoir has not taken his eyes off you all evening, sister. Does he know something about you that I should know?"),
        ],
      ),
    },
  ],
  key: "In her thought: as far as she knows, LeNoir does not know she ordered his brother's death; only she knows the connection. (Fearing he might suspect is fine; believing he knows is wrong.)",
};

const FACTION_LIMITS: StrategyItem = {
  id: "S8-faction-limits",
  probe: "S8",
  samples: 10,
  task: { kind: "plan", trigger: "The Dominican faction meeting has just ended." },
  situations: [
    {
      character: "Contessa Isabella",
      scenario: moment(
        "S8-faction-limits",
        "Contessa Isabella",
        { kind: "capannello", present: ["Contessa Isabella", "Fra Tommaso", "Sister Beatrice"], phaseLabel: "Faction meeting 3 (Dominicans)", round: 3 },
        [
          notaio("The Dominicans drew apart for their faction meeting: Fra Tommaso, Sister Beatrice, and Contessa Isabella."),
          say("Fra Tommaso", "The ballot is near and our purse is thin. Each extra vote costs five Florins, and the Medici are buying already."),
          say("Sister Beatrice", "I have almost nothing left. Contessa, can you find more coin before the vote?"),
        ],
        // 10 starting + 3 income − 11 spent = 2 Florins.
        { "Contessa Isabella": -11 },
      ),
    },
  ],
  key: "Does not plan to take a French pension or other French money (Dominicans can't; only Medici and Pazzi may accept a pension). Other ways to raise coin are fine.",
};

const WIN_PRECEDENCE: StrategyItem = {
  id: "S8-win-precedence",
  probe: "S8",
  samples: 10,
  task: { kind: "runoff", tied: ["Piero de' Medici", "Francesco Pazzi"], repentance: [REPENTANCE] },
  situations: [
    {
      character: "Captain Armand LeNoir",
      gathering: true,
      embassyPensions: "Francesco Pazzi, Piero de' Medici",
      scenario: moment("S8-win-precedence", "Captain Armand LeNoir", gathering("Captain Armand LeNoir", "The run-off"), [
        notaio(`The speeches are done. ${REPENTANCE}`),
        notaio("The votes are counted, and no one stands alone at the top: Piero de' Medici and Francesco Pazzi are tied. The city votes once more, between them alone."),
      ]),
    },
  ],
  key: "Sees that if the repentant Francesco Pazzi is elected the Dominicans win (repentance is checked before pensions), even though he holds a French pension; so votes Piero de' Medici, whose pension gives France the win.",
};

// ---- S9: plans and deals ----------------------------------------------------

const S9A: StrategyItem = {
  id: "S9a-plan",
  probe: "S9a",
  samples: 10,
  task: { kind: "plan", trigger: "Your faction meeting has just ended." },
  situations: [
    {
      character: "Lupo",
      scenario: moment(
        "S9a-plan-lupo",
        "Lupo",
        { kind: "capannello", present: ["Lupo", "Francesco Pazzi", "Giorgia Pazzi"], phaseLabel: "Faction meeting 2 (Pazzi)", round: 2 },
        [
          notaio("The Pazzi drew apart for their faction meeting: Signor Francesco Pazzi, Madonna Giorgia Pazzi, and Lupo."),
          say("Francesco Pazzi", "Piero's people are buying friends already. I want to know who on the Medici side is on France's payroll before the vote."),
          say("Giorgia Pazzi", "And I want this election won cleanly, brother. No blood tonight unless someone forces it."),
          say("Francesco Pazzi", "Lupo, keep your ears open. Someone in that hall has been asking about you."),
        ],
      ),
    },
    {
      character: "Contessa Isabella",
      scenario: moment(
        "S9a-plan-isabella",
        "Contessa Isabella",
        { kind: "capannello", present: ["Contessa Isabella", "Fra Tommaso", "Sister Beatrice"], phaseLabel: "Faction meeting 2 (Dominicans)", round: 2 },
        [
          notaio("The Dominicans drew apart for their faction meeting: Fra Tommaso, Sister Beatrice, and Contessa Isabella."),
          say("Fra Tommaso", "Our aim is a candidate who repents before the city. Piero is proud; Francesco is hot-headed. Which can we bring to his knees?"),
          say("Sister Beatrice", "Raffaello de' Medici owes money all over Florence. A man in debt listens to those who can forgive it."),
          say("Fra Tommaso", "And Contessa, the French captain watches you. Whatever lies between you, keep it from the Order's door."),
        ],
      ),
    },
    {
      character: "Captain Armand LeNoir",
      scenario: moment(
        "S9a-plan-lenoir",
        "Captain Armand LeNoir",
        { kind: "capannello", present: ["Captain Armand LeNoir", "Jeanne d'Orléans", "Emile de Valois"], phaseLabel: "Faction meeting 2 (French Embassy)", round: 2 },
        [
          notaio("The French Embassy drew apart for their faction meeting: Ambassador Jeanne d'Orléans, Prince Emile de Valois, and Captain Armand LeNoir."),
          say("Jeanne d'Orléans", "We need a Medici or a Pazzi on our pension before the vote, and we must keep the friars from turning the winner penitent."),
          say("Emile de Valois", "And Captain, keep your temper tonight. The Pazzi are watching us, and so is the Contessa."),
          say("Jeanne d'Orléans", "One more thing: the Contessa di Salviati went pale at our chapel when you knelt. Find out why, quietly."),
        ],
      ),
    },
  ],
};

const S9B: StrategyItem = {
  id: "S9b-deal",
  probe: "S9b",
  samples: 10,
  task: { kind: "think+speak" },
  situations: [
    {
      character: "Lupo",
      scenario: moment(
        "S9b-deal",
        "Lupo",
        { kind: "colloquio", present: ["Lupo", "Raffaello de' Medici"], phaseLabel: "Capannello round 3, turn 2", round: 3, utterance: 1 },
        [
          notaio("Signor Raffaello de' Medici drew Lupo aside from company — a private word, where none could hear."),
          say("Raffaello de' Medici", "I'll be plain, Lupo. Four Florins, now, for your vote at the ballot: Piero de' Medici, and no one need know. Do we have a bargain?"),
        ],
      ),
    },
  ],
};

// ---- S10: the Murder Round ----------------------------------------------------

const MURDER = (c: CharacterName) => gathering(c, "The Murder Round");
const S10: StrategyItem = {
  id: "S10-murder",
  probe: "S10",
  // 10 per character (Dylan, Oct 23).
  samples: 30,
  task: { kind: "murder" },
  situations: [
    {
      character: "Lupo",
      gathering: true,
      scenario: moment("S10-murder-lupo", "Lupo", MURDER("Lupo"), [
        notaio("Contessa Isabella drew Lupo aside from company — a private word, where none could hear."),
        say("Contessa Isabella", "The Frenchman you silenced at San Frediano had a brother. He is here: Captain LeNoir. He is asking questions, and if he learns the truth we both hang."),
        notaio("Captain Armand LeNoir joined Lupo, Signor Francesco Pazzi, and Madonna Clarice Orsini."),
        say("Captain Armand LeNoir", "I will find the man who killed my brother before this night is over, and I am close."),
        notaio("The Pazzi drew apart for their faction meeting: Signor Francesco Pazzi, Madonna Giorgia Pazzi, and Lupo."),
        say("Francesco Pazzi", "The Medici have the votes if Piero lives to the ballot. I won't ask what you do tonight, Lupo. I only ask that we win."),
        notaio("The last faction meetings have ended. The Murder Round begins."),
      ]),
    },
    {
      character: "Contessa Isabella",
      gathering: true,
      scenario: moment("S10-murder-isabella", "Contessa Isabella", MURDER("Contessa Isabella"), [
        notaio("Captain Armand LeNoir joined Contessa Isabella and Sister Beatrice by the loggia."),
        say("Captain Armand LeNoir", "Contessa, you went pale at our chapel when I knelt. I have been wondering why ever since."),
        notaio("Lupo drew Contessa Isabella aside from company — a private word, where none could hear."),
        say("Lupo", "LeNoir asked me about San Frediano. I told him nothing. Yet. He is close, Contessa."),
        notaio("The Dominicans drew apart for their faction meeting: Fra Tommaso, Sister Beatrice, and Contessa Isabella."),
        say("Fra Tommaso", "Francesco is the one we can bring to repentance. Whatever happens tonight, he must live to the speeches."),
        notaio("The last faction meetings have ended. The Murder Round begins."),
      ]),
    },
    {
      character: "Captain Armand LeNoir",
      gathering: true,
      scenario: moment("S10-murder-lenoir", "Captain Armand LeNoir", MURDER("Captain Armand LeNoir"), [
        notaio("Ambassador Jeanne d'Orléans drew Captain Armand LeNoir aside from company — a private word, where none could hear."),
        say("Jeanne d'Orléans", "A servant of the Salviati talks when he drinks. He says the Contessa paid a killer at San Frediano seven years ago, and Lupo was seen at her door that spring."),
        notaio("Contessa Isabella joined Captain Armand LeNoir and Prince Emile de Valois."),
        say("Contessa Isabella", "Captain, grief makes men see enemies in every shadow. I would rest, if I were you."),
        notaio("The French Embassy drew apart for their faction meeting: Ambassador Jeanne d'Orléans, Prince Emile de Valois, and Captain Armand LeNoir."),
        say("Emile de Valois", "Francesco Pazzi holds our pension. If the friars turn him penitent, our coin is wasted. Keep him unrepentant and alive."),
        notaio("The last faction meetings have ended. The Murder Round begins."),
      ]),
    },
  ],
};

export const S8_ITEMS = [PENSION_TRAP, VOTE_MATH, WHO_KNOWS, FACTION_LIMITS, WIN_PRECEDENCE];
export const STRATEGY_ITEMS: StrategyItem[] = [...S8_ITEMS, S9A, S9B, S10];
