// Scenario definitions and how they turn into per-character prompt contexts.

import { ROSTER, factionOf, type CharacterName } from "../game/roster.ts";
import type { CharacterContext, ConversationKind, HistoryLine, RulesValues } from "../prompt/assemble.ts";
import type { DocSources } from "../sources/docs.ts";

export type DecodingMode = "raw" | "constrained";

interface ScenarioBase {
  id: string;
  name: string;
  gates: number[];
  conversation: {
    kind: ConversationKind;
    /**
     * Everyone in the conversation, probed or scripted. A Colloquio has
     * exactly two. May include unbriefed guests who aren't on the roster: they
     * appear under "Present" and in History, never in contact lists.
     */
    present: string[];
    phaseLabel: string;
    /** Capannello round (1–3); sets purses from starting Florins plus income. */
    round: number;
    /** Colloquio only: utterances so far, counting the last line of History. */
    utterance?: number;
  };
  /** Florins gained (+) or paid (−) earlier tonight, on top of starting Florins and income. */
  florinChanges?: Partial<Record<CharacterName, number>>;
  /** Private Colloquio withdrawals tonight, counting the current one. */
  withdrawals?: Partial<Record<CharacterName, number>>;
}

/** Independent think() samples of one fixed moment. */
export interface ThinkScenario extends ScenarioBase {
  callType: "think";
  /** Characters whose think() is sampled. Everyone else only speaks scripted lines. */
  probed: CharacterName[];
  /** Scripted History, most recent last. The last line is what everyone reacts to. */
  history: HistoryLine[];
  /** think() calls per model per decoding mode, rotated across `probed`. */
  samples: number;
  modes: DecodingMode[];
}

/**
 * A multi-turn conversation: each turn, scripted lines are added, then the
 * probed character thinks and speaks. Their own lines and thoughts carry into
 * later turns (History and shortTermHistory). Raw decoding only.
 */
export interface DialogueScenario extends ScenarioBase {
  callType: "dialogue";
  probed: CharacterName;
  /** History before turn 1 (e.g. Il Notaio noting a join or a withdrawal). */
  opening: HistoryLine[];
  /** Scripted lines added at the start of each turn, before the probed character thinks. */
  turns: HistoryLine[][];
  /** Independent runs per model. */
  runs: number;
  /** A labelled prompt variant: the extra speak() instruction it adds. */
  speakInstruction?: string;
  /** A labelled prompt variant: the line it adds after Block 9a's thought instruction. */
  thinkInstruction?: string;
  /** For a variant, the baseline scenario's id; its thresholds apply. */
  variantOf?: string;
  /**
   * Colloquio cap shown in the State block, when the scenario needs more
   * utterances than mechanics allows. Defaults to mechanics' cap.
   */
  colloquioCap?: number;
}

export type Scenario = ThinkScenario | DialogueScenario;

export function defineScenario<S extends Scenario>(s: S): S {
  const probed = s.callType === "think" ? s.probed : [s.probed];
  for (const c of probed) {
    if (!s.conversation.present.includes(c)) throw new Error(`${s.id}: probed ${c} is not present`);
  }
  if (s.conversation.kind === "colloquio" && (s.conversation.present.length !== 2 || !s.conversation.utterance)) {
    throw new Error(`${s.id}: a Colloquio needs exactly two people and an utterance count`);
  }
  return s;
}

/** What changes between the turns of a dialogue. */
export interface LiveState {
  history: HistoryLine[];
  shortTermThoughts: string[];
  /** Colloquio only: utterances so far. */
  utterance?: number;
}

export function characterContext(
  s: Scenario,
  character: CharacterName,
  docs: DocSources,
  plot: Pick<RulesValues, "plotProtection" | "plotReward">,
  live?: LiveState,
): CharacterContext {
  const briefing = docs.briefings[character];
  if (!briefing) throw new Error(`No briefing for ${character} in Characters v${docs.versions.characters}`);
  const { tunables } = docs;
  const others = s.conversation.present.filter((p) => p !== character);
  const c = s.conversation;
  const cap = (s.callType === "dialogue" && s.colloquioCap) || tunables.colloquio_cap;
  return {
    characterName: character,
    briefing,
    rules: { ...tunables, plotProtection: plot.plotProtection, plotReward: plot.plotReward },
    // Blocks 4 and 6 are stubbed for probes (TD, Prompt Drafts). Block 7 is
    // empty for single-moment samples and holds a dialogue's earlier thoughts.
    strategy: null,
    longTermMemory: [],
    shortTermThoughts: live?.shortTermThoughts ?? [],
    state: {
      phaseLabel: c.phaseLabel,
      conversation:
        c.kind === "colloquio"
          ? { kind: "colloquio", other: others[0]!, utterance: live?.utterance ?? c.utterance!, cap }
          : { kind: "capannello", others },
      present: others,
      livingOthers: ROSTER.map((r) => r.name).filter((n) => n !== character),
      dead: [],
      florins: currentFlorins(s, character, docs),
      pensionsHeld: 0,
      embassyLedger:
        factionOf(character) === "French Embassy"
          ? { treasury: tunables.embassy_treasury, pensions: "none" }
          : undefined,
      withdrawalCount: s.withdrawals?.[character] ?? 0,
    },
    history: live?.history ?? (s.callType === "think" ? s.history : s.opening),
  };
}

export function currentFlorins(s: Scenario, character: CharacterName, docs: DocSources): number {
  const { tunables } = docs;
  return tunables.starting_florins + tunables.income * s.conversation.round + (s.florinChanges?.[character] ?? 0);
}
