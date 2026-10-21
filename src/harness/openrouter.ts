// OpenRouter access: endpoint metadata (prices, quantization) and pinned calls.

import OpenAI from "openai";
import type { ModelConfig } from "../../probe.config.ts";

const BASE_URL = "https://openrouter.ai/api/v1";

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

export interface EndpointInfo {
  providerName: string;
  tag: string;
  quantization: string;
  /** USD per token. */
  price: { input: number; output: number };
  supportedParameters: string[];
}

/** Public endpoint listing; needs no key. */
export async function fetchEndpoint(model: ModelConfig): Promise<EndpointInfo> {
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
  prompt: string;
  /** Omitted for models that reject a non-default value (the judge). */
  temperature?: number;
  /** Omitted for models that don't support it. */
  seed?: number;
  maxTokens: number;
  /** Extra request fields, e.g. the thinking-off settings. */
  extra: Record<string, unknown>;
  /** Set for constrained decoding. */
  jsonSchema?: { name: string; schema: Record<string, unknown> };
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  /** As charged by OpenRouter (usage.cost). */
  costUsd: number | null;
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

async function callOnce(
  client: OpenAI,
  req: CallRequest,
): Promise<CallResult & { retryAfterMs?: number }> {
  const body = {
    model: req.model.slug,
    messages: [{ role: "user" as const, content: req.prompt }],
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
