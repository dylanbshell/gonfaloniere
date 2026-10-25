// The recorder model (Technical Design v0.7, Model Routing → The recorder
// model; Run Configuration): the memory passes (10a, 10b, 10d) and knowledge
// checks (10c) run on a model configured separately from the play model, and
// by default the same stock model with the same endpoint.
//
// Settings, each defaulting to the play model's:
//   RECORDER_MODEL_BASE_URL, RECORDER_MODEL_API_KEY   endpoint and key (.env only; never logged)
//     ← PLAY_MODEL_BASE_URL, PLAY_MODEL_API_KEY ← OpenRouter, OPENROUTER_API_KEY
//   --recorder-model <id> or RECORDER_MODEL_ID        model, from probe.config.ts (provider pin, thinking-off fields, system_role)
//   RECORDER_MODEL_PROVIDER                           override the pinned provider tag
//   RECORDER_MODEL_TEMPERATURE                        default 0; not sent for a model that rejects temperature
//   RECORDER_MODEL_SYSTEM_ROLE=false                  fold the instructions into the user message
//   RECORDER_MODEL_PRICE="in,out" (USD per million)   required for a non-OpenRouter endpoint, for the spending cap
// The record keeps the model, provider, temperature actually sent, thinking, and message layout,
// never a key or a private endpoint.

import type OpenAI from "openai";
import { config, type ModelConfig } from "../../probe.config.ts";
import { fetchEndpoint, makeClient, type EndpointInfo } from "../harness/openrouter.ts";

export interface ModelRoute {
  role: "play" | "recorder";
  model: ModelConfig;
  client: OpenAI;
  endpoint: EndpointInfo;
  /** The temperature to send; undefined when the model rejects the parameter. */
  temperature: number | undefined;
  /** Blocks or instructions as a system message (true), or folded into the user message (false). */
  systemRole: boolean;
  /** Request fields that turn thinking off. */
  thinking: Record<string, unknown>;
  /** "OpenRouter" or the name of the variable that set a private endpoint (the URL itself isn't recorded). */
  endpointLabel: string;
}

const OPENROUTER = "https://openrouter.ai/api/v1";

function key(name: string): string | undefined {
  const v = process.env[name];
  if (v?.startsWith("op://")) throw new Error(`${name} is an unresolved 1Password reference; put the key in .env`);
  return v || undefined;
}

/** The play model's route (character calls, temperature `playTemperature`). */
export async function playRoute(modelId: string, playTemperature: number): Promise<ModelRoute> {
  const model = pick(modelId);
  const baseURL = process.env.PLAY_MODEL_BASE_URL || OPENROUTER;
  const apiKey = key("PLAY_MODEL_API_KEY") ?? key("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("No API key: set OPENROUTER_API_KEY (or PLAY_MODEL_API_KEY) in .env");
  return {
    role: "play",
    model,
    client: makeClient(apiKey, baseURL),
    endpoint: await endpointFor(model, baseURL, process.env.PLAY_MODEL_PRICE),
    temperature: model.noTemperature ? undefined : playTemperature,
    systemRole: model.systemRole !== false,
    thinking: model.thinkingOff ?? config.thinkingOff,
    endpointLabel: baseURL === OPENROUTER ? "OpenRouter" : "PLAY_MODEL_BASE_URL",
  };
}

/** The harness's default play model (the mini-game runner's --model default). */
export const DEFAULT_PLAY_MODEL = "deepseek-v4.1-flash";

/**
 * The recorder's route: every setting defaults to the play model's (TD v0.7). `offline` skips the
 * endpoint listing (no network at all), for dry runs.
 */
export async function recorderRoute(playModelId: string, recorderModelId?: string, opts: { offline?: boolean } = {}): Promise<ModelRoute> {
  const model = { ...pick(recorderModelId ?? process.env.RECORDER_MODEL_ID ?? playModelId) };
  if (process.env.RECORDER_MODEL_PROVIDER) model.provider = process.env.RECORDER_MODEL_PROVIDER;
  const baseURL = process.env.RECORDER_MODEL_BASE_URL || process.env.PLAY_MODEL_BASE_URL || OPENROUTER;
  const apiKey = key("RECORDER_MODEL_API_KEY") ?? key("PLAY_MODEL_API_KEY") ?? key("OPENROUTER_API_KEY");
  if (!apiKey && !opts.offline) throw new Error("No API key for the recorder: set RECORDER_MODEL_API_KEY or OPENROUTER_API_KEY in .env");
  const t = process.env.RECORDER_MODEL_TEMPERATURE;
  return {
    role: "recorder",
    model,
    // Offline (dry run): a client with no key, never used.
    client: makeClient(apiKey ?? "dry-run-no-key", baseURL),
    endpoint: opts.offline
      ? { providerName: `${model.provider} (not looked up: dry run)`, tag: model.provider, quantization: "unknown", price: { input: 0, output: 0 }, supportedParameters: [] }
      : await endpointFor(model, baseURL, process.env.RECORDER_MODEL_PRICE ?? process.env.PLAY_MODEL_PRICE),
    // TD: 0, or the lowest the model accepts; a model that rejects the parameter gets none.
    temperature: model.noTemperature ? undefined : t !== undefined ? Number(t) : 0,
    systemRole: process.env.RECORDER_MODEL_SYSTEM_ROLE ? process.env.RECORDER_MODEL_SYSTEM_ROLE !== "false" : model.systemRole !== false,
    thinking: model.thinkingOff ?? config.thinkingOff,
    endpointLabel: process.env.RECORDER_MODEL_BASE_URL ? "RECORDER_MODEL_BASE_URL" : process.env.PLAY_MODEL_BASE_URL ? "PLAY_MODEL_BASE_URL" : "OpenRouter",
  };
}

/** How a route is kept in the game record: no keys, no private URLs. */
export function describeRoute(r: ModelRoute, servedModel: string | null) {
  return {
    model: r.model.slug,
    model_id: r.model.id,
    endpoint: r.endpointLabel,
    provider: r.endpoint.providerName,
    quantization: r.endpoint.quantization,
    served_model: servedModel,
    temperature_sent: r.temperature ?? "not sent (the model rejects temperature)",
    thinking: r.thinking,
    system_role: r.systemRole,
  };
}

/** The request for a route: instructions as a system message, or folded into the user message. */
export function messages(r: ModelRoute, system: string, user: string): { system?: string; prompt: string } {
  return r.systemRole ? { system, prompt: user } : { prompt: `${system}\n\n${user}` };
}

function pick(id: string): ModelConfig {
  const m = config.models.find((x) => x.id === id);
  if (!m) throw new Error(`No model "${id}" in probe.config.ts`);
  return m;
}

async function endpointFor(model: ModelConfig, baseURL: string, price: string | undefined): Promise<EndpointInfo> {
  if (baseURL === OPENROUTER) return fetchEndpoint(model);
  const [input, output] = (price ?? "").split(",").map(Number);
  if (!Number.isFinite(input) || !Number.isFinite(output)) throw new Error("A non-OpenRouter endpoint needs its price for the spending cap: set RECORDER_MODEL_PRICE (or PLAY_MODEL_PRICE) to \"input,output\" in USD per million tokens");
  return { providerName: "custom", tag: model.provider, quantization: "unknown", price: { input: input! / 1e6, output: output! / 1e6 }, supportedParameters: [] };
}
