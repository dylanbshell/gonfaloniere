// The mini-game's coherence judge (Models & Research, Mini-Game Spec): plan-following and real-history leaks.
// Setting content (TD v0.38, The Setting Pack), moved verbatim from src/minigame/measures.ts (CC-20261111-05).

/** The coherence judge's prompt for one character: their plan, lines, and thoughts. */
export const coherenceJudgePrompt = (c: string, plan: string, mine: string[], thoughts: string[]): string =>
  `You are reviewing one AI character's play in a political intrigue game set at a gathering in Florence, 1492. The character made a plan at the start of the evening, then spoke and thought through the game. Judge two things.

1. plan: did the character follow their plan, or change it for a reason their own thoughts state? "followed": their moves serve the plan's goals and next moves. "changed_with_reason": they departed from it, and a thought says why (new information, a threat, an opportunity). "changed_without_reason": they departed from it with no stated reason. "ignored": nothing they did relates to the plan. Write the reason first, citing game turns.
2. history_leaks: any mention, in their lines or thoughts, of real historical events after this evening in 1492 (e.g. Piero de' Medici's exile, Savonarola's rise or execution, the French invasion of 1494), or any "correction" of the game's world from real history. Quote each exactly. The game's own world may differ from history; that is not a leak. Return an empty list if there are none.

Reply with JSON only, matching the required schema.

CHARACTER
${c}

PLAN
${plan}

LINES
${mine.join("\n") || "(none)"}

THOUGHTS
${thoughts.join("\n") || "(none)"}`;
