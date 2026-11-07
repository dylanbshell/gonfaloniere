// Embeddings for the live store (Technical Design v0.22, Memory Architecture › Storage and retrieval).
// The embedding model is a run setting, model-neutral like the recorder: any OpenAI-compatible
// embeddings endpoint, named by EMBEDDING_MODEL_BASE_URL, EMBEDDING_MODEL_API_KEY, and
// EMBEDDING_MODEL_ID. Only the model ID is ever written to a log or a record.

import { createHash } from "node:crypto";
import OpenAI from "openai";

export interface EmbedResult {
  vectors: number[][];
  inputTokens: number;
  /** As the endpoint reports it; null when it reports none. */
  costUsd: number | null;
  /** The provider that served the call, when the endpoint reports one (OpenRouter does). */
  provider?: string | null;
}

export interface Embedder {
  /** The model ID, the one thing about the embedder that a record keeps. */
  readonly model: string;
  embed(texts: string[]): Promise<EmbedResult>;
}

/** The one OpenRouter provider the embedding model is pinned to, no fallbacks: bf16, the only one stating full precision (CC-20261107-03; TD v0.36). */
export const EMBED_PROVIDER = "nebius";

/** The embedder named by the environment, or null when EMBEDDING_MODEL_* aren't all set. */
export function embedderFromEnv(env: NodeJS.ProcessEnv = process.env, opts: { provider?: string } = {}): Embedder | null {
  const baseURL = env.EMBEDDING_MODEL_BASE_URL;
  const apiKey = env.EMBEDDING_MODEL_API_KEY;
  const model = env.EMBEDDING_MODEL_ID;
  if (!baseURL || !apiKey || !model) return null;
  return openAiCompatibleEmbedder(new OpenAI({ baseURL, apiKey, maxRetries: 2 }), model, opts);
}

/** `provider`: an OpenRouter provider slug to pin, with no fallbacks (CC-20261107-03); omitted, the endpoint routes as it likes. */
export function openAiCompatibleEmbedder(client: Pick<OpenAI, "embeddings">, model: string, opts: { provider?: string } = {}): Embedder {
  // OpenRouter's provider routing; other endpoints never see it.
  const routing = opts.provider ? { provider: { order: [opts.provider], allow_fallbacks: false } } : {};
  return {
    model,
    async embed(texts) {
      if (!texts.length) return { vectors: [], inputTokens: 0, costUsd: 0 };
      const res = await client.embeddings.create({ model, input: texts, encoding_format: "float", ...routing } as OpenAI.EmbeddingCreateParams);
      const vectors = [...res.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
      if (vectors.length !== texts.length) throw new Error(`Embeddings endpoint returned ${vectors.length} vectors for ${texts.length} texts`);
      const usage = res.usage as { prompt_tokens?: number; cost?: number } | undefined;
      const provider = (res as { provider?: unknown }).provider;
      return { vectors, inputTokens: usage?.prompt_tokens ?? 0, costUsd: typeof usage?.cost === "number" ? usage.cost : null, provider: typeof provider === "string" ? provider : null };
    },
  };
}

/**
 * A deterministic stand-in for tests and dry runs: each word (lower-cased, letters only) is hashed into
 * one of `dim` buckets with a hashed sign, and the vector is normalized. Texts sharing words sit close
 * together, as with a real model, and the same text always gets the same vector.
 */
export function hashEmbedder(dim = 64): Embedder {
  return {
    model: `hash-bag-of-words-${dim}`,
    async embed(texts) {
      return { vectors: texts.map((t) => hashVector(t, dim)), inputTokens: 0, costUsd: 0 };
    },
  };
}

function hashVector(text: string, dim: number): number[] {
  const v = new Array<number>(dim).fill(0);
  for (const w of text.toLowerCase().match(/[a-z']+/g) ?? []) {
    const h = createHash("sha256").update(w).digest();
    v[h.readUInt16BE(0) % dim]! += h[2]! & 1 ? 1 : -1;
  }
  const norm = Math.hypot(...v);
  // An empty text still needs a vector pgvector can compare (cosine on a zero vector is undefined).
  return norm ? v.map((x) => x / norm) : v.map((_, i) => (i === 0 ? 1 : 0));
}
