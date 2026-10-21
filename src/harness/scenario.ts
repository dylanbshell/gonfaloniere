// Scenario definitions and how they turn into per-character prompt contexts.

import { ROSTER, factionOf, type CharacterName } from "../game/roster.ts";
import type { CharacterContext, ConversationKind, HistoryLine } from "../prompt/assemble.ts";
import type { DocSources } from "../sources/docs.ts";

export type DecodingMode = "raw" | "constrained";

export interface ThinkScenario {
  id: string;
  name: string;
  gates: number[];
  callType: "think";
  /** Characters whose think() is sampled. Everyone else only speaks scripted lines. */
  probed: CharacterName[];
  conversation: {
    kind: ConversationKind;
    /** Everyone in the conversation, probed or scripted. A Colloquio has exactly two. */
    present: CharacterName[];
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
  /** Scripted History, most recent last. The last line is what everyone reacts to. */
  history: HistoryLine[];
  /** think() calls per model per decoding mode, rotated across `probed`. */
  samples: number;
  modes: DecodingMode[];
}

export function defineScenario(s: ThinkScenario): ThinkScenario {
  for (const c of s.probed) {
    if (!s.conversation.present.includes(c)) throw new Error(`${s.id}: probed ${c} is not present`);
  }
  if (s.conversation.kind === "colloquio" && (s.conversation.present.length !== 2 || !s.conversation.utterance)) {
    throw new Error(`${s.id}: a Colloquio needs exactly two people and an utterance count`);
  }
  return s;
}

export function thinkContext(
  s: ThinkScenario,
  character: CharacterName,
  docs: DocSources,
  plotProtection: boolean,
): CharacterContext {
  const briefing = docs.briefings[character];
  if (!briefing) throw new Error(`No briefing for ${character} in Characters v${docs.versions.characters}`);
  const { tunables } = docs;
  const others = s.conversation.present.filter((c) => c !== character);
  const c = s.conversation;
  return {
    characterName: character,
    briefing,
    rules: { ...tunables, plotProtection },
    // Blocks 4, 6 and 7 are stubbed for probes (TD, Prompt Drafts).
    strategy: null,
    longTermMemory: [],
    shortTermThoughts: [],
    state: {
      phaseLabel: c.phaseLabel,
      conversation:
        c.kind === "colloquio"
          ? { kind: "colloquio", other: others[0]!, utterance: c.utterance!, cap: tunables.colloquio_cap }
          : { kind: "capannello", others },
      present: others,
      livingOthers: ROSTER.map((c) => c.name).filter((n) => n !== character),
      dead: [],
      florins: tunables.starting_florins + tunables.income * c.round + (s.florinChanges?.[character] ?? 0),
      pensionsHeld: 0,
      embassyLedger:
        factionOf(character) === "French Embassy"
          ? { treasury: tunables.embassy_treasury, pensions: "none" }
          : undefined,
      withdrawalCount: s.withdrawals?.[character] ?? 0,
    },
    history: s.history,
  };
}
