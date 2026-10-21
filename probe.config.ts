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
  /**
   * False for models with no thinking mode: no reasoning field is sent (the
   * endpoint would reject it) and the pre-flight skips its thinking-on control.
   */
  hasThinking?: boolean;
}

export const config = {
  docs: {
    technicalDesign: "docs/Gonfaloniere_Technical_Design_v0.2.md",
    characters: "docs/Gonfaloniere_Characters_v0.2.md",
    mechanics: "docs/Gonfaloniere_Game_Mechanics_v0.18.md",
    modelsResearch: "docs/Gonfaloniere_Models_Research_v0.8.md",
  },

  /** Same for every model; 0.7 until Technical Design sets a play value. */
  temperature: 0.7,
  /** Sample i uses seed seedBase + i, so modes and models see the same seeds. */
  seedBase: 1492,
  /** Fills {plot_protection_rule} in the rules primer. */
  plotProtection: true,
  /** Output caps. TD estimates ~250 tokens for think() and ~100 for speak(). */
  maxTokens: { think: 800, speak: 400 },
  /** Extra attempts when a speak() reply doesn't parse, since a dialogue can't continue without a line. */
  speakRetries: 2,
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
    /** Probe budget across every run and judging logged in results/ (raised to $20, Oct 21). */
    totalUsd: 20,
    /** Cap for a single invocation. */
    runUsd: 1,
  },

  /**
   * The judge for S4–S7 (Models & Research v0.8, Scoring). Sonnet 5.5 rejects
   * a non-default temperature, so it runs at its default sampling with its
   * default thinking (Dylan, Oct 21). Verdicts are stored with their raw output
   * and never re-judged, so results are reproducible from the logs.
   */
  judge: {
    id: "claude-sonnet-5.5",
    slug: "anthropic/claude-sonnet-5.5",
    provider: "anthropic", // $2/$10, first-party endpoint
    maxTokens: 16000,
    /**
     * Per-invocation cap for judging. Each call reserves its worst case
     * (16,000 output tokens, ~$0.16) before it's sent, so the probe-run cap
     * of $1 stopped judging after ~$0.40 with four calls in flight.
     */
    runUsd: 3,
  },

  // Endpoints chosen Oct 21, 2026: each supports seed, structured outputs, and
  // (for hybrid models) the reasoning control. bf16 where offered, otherwise
  // fp8; fp4 avoided. Prices are per M tokens, in/out.
  models: [
    {
      id: "gemma-4-31b",
      slug: "google/gemma-4-31b-it",
      provider: "crusoe/bf16", // $0.14/$0.40
    },
    {
      id: "qwen3.6-35b-a3b",
      slug: "qwen/qwen3.6-35b-a3b",
      provider: "parasail/fp8", // $0.10/$0.95; no bf16 endpoint
    },
    {
      id: "qwen3.8-27b",
      slug: "qwen/qwen3.8-27b",
      provider: "deepinfra/bf16", // $0.15/$1.875
    },
    {
      id: "qwen3.5-122b-a10b",
      slug: "qwen/qwen3.5-122b-a10b",
      provider: "atlas-cloud/fp8", // $0.30/$2.40; the only bf16 endpoint lacks structured outputs
    },
    {
      id: "deepseek-v4.1-flash",
      // Dated snapshot, for reproducibility (Dylan, Oct 21). Replaces the
      // undated deepseek-v4.1-flash used in the first S1 run.
      slug: "deepseek/deepseek-v4.1-flash-1017",
      provider: "deepinfra/fp8", // $0.098/$0.294
    },
    {
      id: "qwen3-235b-a22b-2507",
      slug: "qwen/qwen3-235b-a22b-2507",
      provider: "deepinfra/fp8", // $0.09/$0.55
      hasThinking: false,
      thinkingOff: {},
    },
  ] as ModelConfig[],
};

export type ProbeConfig = typeof config;
