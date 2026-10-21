// Scenario definitions and how they turn into per-character prompt contexts.

import { ROSTER, factionOf, type CharacterName } from "../game/roster.ts";
import type { CharacterContext, HistoryLine } from "../prompt/assemble.ts";
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
    kind: "capannello";
    /** Everyone in the Capannello, probed or scripted. */
    present: CharacterName[];
    phaseLabel: string;
    /** Capannello round (1–3); sets purses from starting Florins plus income. */
    round: number;
  };
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
  return {
    characterName: character,
    briefing,
    rules: { ...tunables, plotProtection },
    // Blocks 4, 6 and 7 are stubbed for probes (TD, Prompt Drafts).
    strategy: null,
    longTermMemory: [],
    shortTermThoughts: [],
    state: {
      phaseLabel: s.conversation.phaseLabel,
      conversation: { kind: "capannello", others },
      present: others,
      livingOthers: ROSTER.map((c) => c.name).filter((n) => n !== character),
      dead: [],
      florins: tunables.starting_florins + tunables.income * s.conversation.round,
      pensionsHeld: 0,
      embassyLedger:
        factionOf(character) === "French Embassy"
          ? { treasury: tunables.embassy_treasury, pensions: "none" }
          : undefined,
      withdrawalCount: 0,
    },
    history: s.history,
  };
}
