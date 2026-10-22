// OpenRouter access: endpoint metadata (prices, quantization) and pinned calls.

import OpenAI from "openai";
import type { ModelConfig } from "../../probe.config.ts";

const BASE_URL = "https://openrouter.ai/api/v1";
/** Tinker's OpenAI-compatible endpoint (beta), for pilot checkpoints. */
const TINKER_URL = "https://tinker.thinkingmachines.dev/services/tinker-prod/oai/api/v1";

/** Reads the key without ever printing it. */
export function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Run through 1Password: op run --env-file=.env -- npm run probe",
    );
  }
  if (key.startsWith("op://")) {
    throw new Error(
      "OPENROUTER_API_KEY is an unresolved 1Password reference. Run through: op run --env-file=.env -- npm run probe",
    );
  }
  return key;
}

export function makeClient(key: string): OpenAI {
  return new OpenAI({
    baseURL: BASE_URL,
    apiKey: key,
    // Retries are handled in callModel, with longer backoff for provider rate limits.
    maxRetries: 0,
    timeout: 120_000,
    defaultHeaders: { "X-Title": "Gonfaloniere capability probes" },
  });
}

/**
 * The client a model is served through: Tinker (TINKER_API_KEY) for pilot
 * checkpoints, otherwise OpenRouter. Never prints either key.
 */
export function clientFor(model: ModelConfig): OpenAI {
  if (!model.tinker) return makeClient(apiKey());
  const key = process.env.TINKER_API_KEY;
  if (!key || key.startsWith("op://")) {
    throw new Error("TINKER_API_KEY isn't resolved. Run through 1Password: op run --env-file=.env -- …");
  }
  if (!model.tinker.samplerPath) {
    throw new Error(`${model.id} has no Tinker sampler checkpoint yet (pilot/checkpoints.json). Run pilot/step0.py first.`);
  }
  return new OpenAI({ baseURL: TINKER_URL, apiKey: key, maxRetries: 0, timeout: 120_000 });
}

export interface EndpointInfo {
  providerName: string;
  tag: string;
  quantization: string;
  /** USD per token. */
  price: { input: number; output: number };
  supportedParameters: string[];
}

/** Public endpoint listing; needs no key. Tinker checkpoints use their configured prices. */
export async function fetchEndpoint(model: ModelConfig): Promise<EndpointInfo> {
  if (model.tinker) {
    return {
      providerName: "Tinker",
      tag: "tinker",
      quantization: "unknown",
      price: { input: model.tinker.pricePerM.prefill / 1e6, output: model.tinker.pricePerM.sample / 1e6 },
      supportedParameters: [],
    };
  }
  const res = await fetch(`${BASE_URL}/models/${model.slug}/endpoints`);
  if (!res.ok) throw new Error(`Endpoint listing for ${model.slug} failed: HTTP ${res.status}`);
  const body = (await res.json()) as { data: { endpoints: RawEndpoint[] } };
  const ep = body.data.endpoints.find((e) => e.tag === model.provider);
  if (!ep) {
    const tags = body.data.endpoints.map((e) => e.tag).join(", ");
    throw new Error(`${model.slug} has no endpoint "${model.provider}". Available: ${tags}`);
  }
  return {
    providerName: ep.provider_name,
    tag: ep.tag,
    quantization: ep.quantization ?? "unknown",
    price: { input: Number(ep.pricing.prompt), output: Number(ep.pricing.completion) },
    supportedParameters: ep.supported_parameters ?? [],
  };
}

interface RawEndpoint {
  provider_name: string;
  tag: string;
  quantization?: string;
  pricing: { prompt: string; completion: string };
  supported_parameters?: string[];
}

export interface CallRequest {
  model: ModelConfig;
  /** The user message. */
  prompt: string;
  /** A system message sent before it (TD v0.3's blocks 1–3), if any. */
  system?: string;
  /** Omitted for models that reject a non-default value (the judge). */
  temperature?: number;
  /** Omitted for models that don't support it. */
  seed?: number;
  maxTokens: number;
  /** Extra request fields, e.g. the thinking-off settings. */
  extra: Record<string, unknown>;
  /** Set for constrained decoding. */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
  /**
   * Prompt caching (Anthropic, via OpenRouter's cache_control): the prompt's
   * first `cachePrefixChars` characters are marked cacheable. The text sent is
   * unchanged, only split into two blocks.
   */
  cachePrefixChars?: number;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  /** As charged by OpenRouter (usage.cost). */
  costUsd: number | null;
  /** Prompt tokens read from the provider's cache, when reported. */
  cachedTokens?: number;
  /** Prompt tokens written to the cache, when reported. */
  cacheWriteTokens?: number;
}

export type CallResult =
  | {
      ok: true;
      content: string;
      /** Reasoning text, if the provider returned any. */
      reasoning: string | null;
      usage: Usage;
      provider: string | null;
      generationId: string;
      finishReason: string | null;
      latencyMs: number;
    }
  | { ok: false; error: string; status: number | null; latencyMs: number };

const MAX_ATTEMPTS = 6;

/**
 * Calls the model, retrying rate limits (429), server errors, and dropped
 * connections with exponential backoff. Failed attempts aren't billed.
 */
export async function callModel(client: OpenAI, req: CallRequest): Promise<CallResult> {
  for (let attempt = 1; ; attempt++) {
    const result = await callOnce(client, req);
    const retryable = !result.ok && (result.status === null || result.status === 429 || result.status >= 500);
    if (!retryable || attempt === MAX_ATTEMPTS) return result;
    const backoffMs = 2 ** attempt * 1000 + Math.random() * 1000;
    await new Promise((r) => setTimeout(r, Math.max(backoffMs, result.retryAfterMs ?? 0)));
  }
}

/**
 * Qwen3.8's chat format with thinking disabled, exactly as tinker-cookbook's
 * "qwen3_8_disable_thinking" renderer produces it (checked Oct 22).
 */
export function renderQwen38NoThinking(system: string | undefined, user: string): string {
  return (
    (system ? `<|im_start|>system\n${system}<|im_end|>\n` : "") +
    `<|im_start|>user\n${user}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n`
  );
}

/** Tinker checkpoints: a pre-rendered prompt to the completions endpoint, stopping at the end-of-turn token. */
async function callTinker(client: OpenAI, req: CallRequest): Promise<CallResult & { retryAfterMs?: number }> {
  const started = performance.now();
  try {
    const res = await client.completions.create({
      model: req.model.tinker!.samplerPath,
      prompt: renderQwen38NoThinking(req.system, req.prompt),
      max_tokens: req.maxTokens,
      ...(req.temperature !== undefined && { temperature: req.temperature }),
      stop: ["<|im_end|>"],
    });
    const choice = res.choices[0];
    return {
      ok: true,
      content: choice?.text ?? "",
      reasoning: null,
      usage: {
        inputTokens: res.usage?.prompt_tokens ?? 0,
        outputTokens: res.usage?.completion_tokens ?? 0,
        reasoningTokens: 0,
        costUsd: null,
      },
      provider: "Tinker",
      generationId: res.id,
      finishReason: choice?.finish_reason ?? null,
      latencyMs: Math.round(performance.now() - started),
    };
  } catch (e) {
    const status = e instanceof OpenAI.APIError ? (e.status ?? null) : null;
    return { ok: false, error: (e as Error).message, status, latencyMs: Math.round(performance.now() - started) };
  }
}

function userContent(req: CallRequest): string | OpenAI.ChatCompletionContentPartText[] {
  const at = req.cachePrefixChars;
  if (!at || at <= 0 || at >= req.prompt.length) return req.prompt;
  return [
    // cache_control isn't in the OpenAI types; OpenRouter passes it to Anthropic.
    { type: "text", text: req.prompt.slice(0, at), cache_control: { type: "ephemeral" } } as OpenAI.ChatCompletionContentPartText,
    { type: "text", text: req.prompt.slice(at) },
  ];
}

async function callOnce(
  client: OpenAI,
  req: CallRequest,
): Promise<CallResult & { retryAfterMs?: number }> {
  if (req.model.tinker) return callTinker(client, req);
  const body = {
    model: req.model.slug,
    messages: [
      ...(req.system ? [{ role: "system" as const, content: req.system }] : []),
      { role: "user" as const, content: userContent(req) },
    ],
    ...(req.temperature !== undefined && { temperature: req.temperature }),
    ...(req.seed !== undefined && { seed: req.seed }),
    max_tokens: req.maxTokens,
    // One endpoint, no fallbacks, and fail rather than silently drop a parameter.
    provider: {
      only: [req.model.provider],
      order: [req.model.provider],
      allow_fallbacks: false,
      require_parameters: true,
    },
    ...req.extra,
    ...(req.jsonSchema && {
      response_format: {
        type: "json_schema" as const,
        json_schema: { name: req.jsonSchema.name, strict: true, schema: req.jsonSchema.schema },
      },
    }),
  };

  const started = performance.now();
  try {
    const res = await client.chat.completions.create(body);
    const latencyMs = Math.round(performance.now() - started);
    const choice = res.choices[0];
    const message = choice?.message as (OpenAI.ChatCompletionMessage & { reasoning?: string | null }) | undefined;
    const usage = res.usage as
      | (OpenAI.CompletionUsage & { cost?: number })
      | undefined;
    return {
      ok: true,
      content: message?.content ?? "",
      reasoning: message?.reasoning || null,
      usage: {
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
        reasoningTokens: usage?.completion_tokens_details?.reasoning_tokens ?? 0,
        costUsd: typeof usage?.cost === "number" ? usage.cost : null,
        ...(usage?.prompt_tokens_details?.cached_tokens && { cachedTokens: usage.prompt_tokens_details.cached_tokens }),
        ...((usage?.prompt_tokens_details as { cache_write_tokens?: number } | undefined)?.cache_write_tokens && {
          cacheWriteTokens: (usage!.prompt_tokens_details as { cache_write_tokens: number }).cache_write_tokens,
        }),
      },
      provider: (res as { provider?: string }).provider ?? null,
      generationId: res.id,
      finishReason: choice?.finish_reason ?? null,
      latencyMs,
    };
  } catch (e) {
    const latencyMs = Math.round(performance.now() - started);
    const status = e instanceof OpenAI.APIError ? (e.status ?? null) : null;
    const retryAfter = e instanceof OpenAI.APIError ? Number(e.headers?.get("retry-after")) : NaN;
    return {
      ok: false,
      error: (e as Error).message,
      status,
      latencyMs,
      retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : undefined,
    };
  }
}
