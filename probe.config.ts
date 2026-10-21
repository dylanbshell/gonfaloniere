// Capability probe configuration (Models & Research v0.5, Capability Probe Plan).

export interface ModelConfig {
  /** Short id used on the command line and in logs. */
  id: string;
  /** OpenRouter model slug. */
  slug: string;
  /**
   * The one OpenRouter endpoint this model is pinned to, as an endpoint tag
   * (provider/variant). Fallbacks are off, so a call never lands elsewhere.
   */
  provider: string;
  /** Extra request fields that turn thinking off, if the default doesn't work. */
  thinkingOff?: Record<string, unknown>;
}

export const config = {
  docs: {
    technicalDesign: "docs/Gonfaloniere_Technical_Design_v0.2.md",
    characters: "docs/Gonfaloniere_Characters_v0.2.md",
    mechanics: "docs/Gonfaloniere_Game_Mechanics_v0.18.md",
  },

  /** Same for every model; 0.7 until Technical Design sets a play value. */
  temperature: 0.7,
  /** Sample i uses seed seedBase + i, so modes and models see the same seeds. */
  seedBase: 1492,
  /** Fills {plot_protection_rule} in the rules primer. */
  plotProtection: true,
  /** Output cap per think() call. TD estimates ~250 tokens of output. */
  maxTokens: { think: 800 },
  /** Crusoe rate-limited heavily at 4 parallel requests (Oct 21). */
  concurrency: 2,

  /** Request fields that turn thinking off, unless a model overrides them. */
  thinkingOff: { reasoning: { effort: "none" } } as Record<string, unknown>,

  preflight: {
    /** Calls with thinking off; each must report zero reasoning tokens. */
    calls: 5,
    /**
     * One call with thinking on, to show reasoning tokens are actually
     * reported. If the control also shows zero, the check proves nothing.
     */
    controlThinkingOn: { reasoning: { effort: "low" } } as Record<string, unknown>,
  },

  budget: {
    /** Probe budget across every run logged in results/ (plan: ≤$15). */
    totalUsd: 15,
    /** Cap for a single invocation. */
    runUsd: 1,
  },

  models: [
    {
      id: "gemma-4-31b",
      slug: "google/gemma-4-31b-it",
      // bf16 (full precision), $0.14/$0.40 per M tokens, supports seed and
      // structured outputs. Checked Oct 21, 2026.
      provider: "crusoe/bf16",
    },
  ] as ModelConfig[],
};

export type ProbeConfig = typeof config;
