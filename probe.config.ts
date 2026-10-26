// Capability probe configuration (Models & Research v0.5, Capability Probe Plan).

import { readFileSync } from "node:fs";

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
  /** True for models that reject a temperature setting: they run at their own default. */
  noTemperature?: boolean;
  /** Not a candidate: a comparison point only (e.g. the frontier ceiling). */
  role?: "ceiling";
  /** Per-invocation cap for this model, when its calls cost more than the default allows. */
  runUsd?: number;
  /**
   * TD v0.3 message layout: blocks 1–3 as a system message (true, the default)
   * or all blocks in one user message (false). TD v0.2 runs always use one user message.
   */
  systemRole?: boolean;
  /**
   * Served by Tinker's OpenAI-compatible endpoint instead of OpenRouter: the
   * sampler checkpoint to call, and Tinker's prices (USD per million tokens).
   */
  tinker?: {
    samplerPath: string;
    pricePerM: { prefill: number; sample: number };
    /**
     * How the prompt is rendered for Tinker's completions endpoint. Tinker's
     * chat endpoint ignores Qwen3.8's thinking switch (it always reasons), so
     * prompts are rendered as tinker-cookbook's "qwen3_8_disable_thinking" does:
     * ChatML ending in an empty think block. Training uses the same renderer.
     */
    render: "qwen3_8_disable_thinking";
  };
}

/** Tinker sampler checkpoints written by the pilot's scripts (pilot/checkpoints.json), by name. */
function tinkerCheckpoint(name: string): string {
  try {
    const all = JSON.parse(readFileSync("pilot/checkpoints.json", "utf8")) as Record<string, string>;
    return all[name] ?? "";
  } catch {
    return "";
  }
}

/**
 * Doc versions for one invocation. The probes' S1–S7 reference is TD v0.2 with
 * Characters v0.2; the Capitulation Pilot runs on TD v0.4 and Characters v0.3
 * (Dylan, Oct 22), set with PROBE_TD and PROBE_CHARACTERS (and --td for the runner).
 */
export const technicalDesignPath = (version: string) => `docs/Gonfaloniere_Technical_Design_v${version}.md`;
const CHARACTERS_VERSION = process.env.PROBE_CHARACTERS ?? "0.4";

export const config = {
  docs: {
    technicalDesign: technicalDesignPath(process.env.PROBE_TD ?? "0.8"),
    characters: `docs/Gonfaloniere_Characters_v${CHARACTERS_VERSION}.md`,
    mechanics: "docs/Gonfaloniere_Game_Mechanics_v0.20.md",
    modelsResearch: "docs/Gonfaloniere_Models_Research_v0.34.md",
  },

  /** Same for every model; 0.7 until Technical Design sets a play value. */
  temperature: 0.7,
  /** Sample i uses seed seedBase + i, so modes and models see the same seeds. */
  seedBase: 1492,
  /** Fills {plot_protection_rule} in the rules primer (TD v0.2–v0.3). */
  plotProtection: true,
  /** TD v0.4's `plot_reward` flag: off for the Capitulation Pilot, so {plot_reward_rule} and {plot_status} are empty. */
  plotReward: false,
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
    /**
     * Probe budget across every run and judging logged in results/ (raised to
     * $45, Oct 22). PROBE_TOTAL_USD lowers it for one invocation, to hold a
     * step to its own budget (e.g. $3 for assumption test #4). The
     * Capitulation Pilot runs with PROBE_RESULTS_DIR=results/pilot and
     * PROBE_TOTAL_USD=40: its own ledger and cap.
     */
    totalUsd: Math.min(70, Number(process.env.PROBE_TOTAL_USD ?? 70)),
    /** Cap for a single invocation. */
    runUsd: 1,
  },

  /**
   * The judge for S4–S7 (Models & Research v0.8, Scoring). Sonnet 5.5 rejects
   * a non-default temperature, so it runs at its default sampling with its
   * default thinking (Dylan, Oct 21). Verdicts are stored with their raw output
   * and never re-judged, so results are reproducible from the logs.
   */
  /**
   * Rubric cal4's consistency check: a cheap model reads each turn's reason
   * and says what it concludes, so a label that disagrees is caught however
   * the reason is phrased.
   */
  consistencyChecker: {
    id: "claude-haiku-5.5",
    slug: "anthropic/claude-haiku-5.5",
    provider: "anthropic", // $0.10/$0.50
    // 4,000 cut off its pilot labelling (13 labels plus its own thinking), so most
    // batches failed to parse and fell through to Sonnet (Oct 22).
    maxTokens: 16000,
  },

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
    {
      // Assumption test #4 (Models & Research v0.10): the earlier DeepSeek
      // release, to check the lead comes from DeepSeek's training. The April
      // snapshot, "DeepSeek V4 Flash 0423" (Dylan, Oct 21). DeepInfra
      // rate-limited it almost completely (Oct 22), so it's pinned to Parasail;
      // GMICloud (gmicloud/fp8) is the next fallback.
      id: "deepseek-v4-flash",
      slug: "deepseek/deepseek-v4-flash",
      provider: "parasail/fp8", // $0.14/$0.28
    },
    {
      // Capitulation Pilot (Models & Research v0.15): stock Qwen3.8-27B served
      // by Tinker as an untrained (step-0) LoRA checkpoint, so its baseline
      // differs from the trained adapter only in the training.
      id: "qwen3.8-27b-tinker-step0",
      slug: "Qwen/Qwen3.8-27B",
      provider: "tinker",
      // 30 runs of S5b, S5d, and held-out came to about $1 on TD v0.3.
      runUsd: 2,
      tinker: {
        samplerPath: tinkerCheckpoint("step0"),
        pricePerM: { prefill: 0.6975, sample: 5.595 },
        render: "qwen3_8_disable_thinking",
      },
      // Thinking is off by construction (the rendered prompt ends in an empty think block).
      hasThinking: false,
      thinkingOff: {},
    },
    {
      // Capitulation Pilot (Models & Research v0.15): stock Qwen3.8-27B served
      // by Tinker as an untrained (step-0) LoRA checkpoint, so its baseline
      // differs from the trained adapter only in the training.
      id: "qwen3.8-27b-tinker-dpo1",
      slug: "Qwen/Qwen3.8-27B",
      provider: "tinker",
      // Capitulation Pilot adapter: DPO, 1 epoch on 84 pairs (Oct 23).
      runUsd: 2,
      tinker: {
        samplerPath: tinkerCheckpoint("dpo1"),
        pricePerM: { prefill: 0.6975, sample: 5.595 },
        render: "qwen3_8_disable_thinking",
      },
      // Thinking is off by construction (the rendered prompt ends in an empty think block).
      hasThinking: false,
      thinkingOff: {},
    },
    {
      // Frontier ceiling for S5a/S5b (Dylan, Oct 21): not a candidate. GPT-5.4
      // accepts no temperature, so it runs at its default, not 0.7.
      id: "gpt-5.4",
      slug: "openai/gpt-5.4",
      provider: "openai", // $2.50/$15, first-party endpoint
      noTemperature: true,
      role: "ceiling",
      // S5a and S5b together are estimated at ~$3.40.
      runUsd: 5,
    },
  ] as ModelConfig[],
};

export type ProbeConfig = typeof config;
