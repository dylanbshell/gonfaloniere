// Label log probabilities (Technical Design v0.21, Run Configuration → Log probabilities): where the
// provider supports them, think() and speak() calls ask for log probabilities, and code stores the
// top 5 candidates at the token where the `took` (think) or `meant` (speak) label is written. A
// research record only: nothing in play reads them, and the prompts are unchanged. Never required:
// if the provider returns none, or rejects the parameter, the field is null and the call carries on.

import type { CallResult, TokenLogprob } from "../harness/openrouter.ts";

/** `labels` (default): the label token's top 5; `all`: every output token's top 5 (large, for debugging); `off`: none requested. */
export type LogprobsSetting = "labels" | "off" | "all";
export const LOGPROBS_SETTINGS: readonly LogprobsSetting[] = ["labels", "off", "all"];

/** A candidate token and its probability (converted from the log probability). */
export interface Candidate {
  token: string;
  p: number;
}

/** What a call record stores: the label token's candidates (`labels`), or every token's (`all`). */
export type StoredLogprobs =
  | { at: "took" | "meant"; token: string; index: number; candidates: Candidate[] }
  | { at: "all"; tokens: { token: string; candidates: Candidate[] }[] };

const TOP = 5;

/** Which label a call writes: `took` in think(), `meant` in speak(); other calls ask for none. */
export function labelKey(kind: string): "took" | "meant" | null {
  return kind === "think" ? "took" : kind === "speak" ? "meant" : null;
}

/** The request fields for a call, or null when it asks for none (off, a system call, or no label in this call). */
export function logprobsRequest(setting: LogprobsSetting, kind: string): Record<string, unknown> | null {
  if (setting === "off" || !labelKey(kind)) return null;
  return { logprobs: true, top_logprobs: TOP };
}

const candidates = (t: TokenLogprob): Candidate[] =>
  (t.top.length ? t.top : [{ token: t.token, logprob: t.logprob }])
    .slice(0, TOP)
    .map((a) => ({ token: a.token, p: Number(Math.exp(a.logprob).toFixed(6)) }));

/**
 * The token where the label's value starts in the reply (`"took": "pressure"` → the token holding
 * the "p"), with its top 5 candidates. Offsets come from the tokens themselves, so the search runs on
 * their joined text. Null when the label isn't in the reply.
 */
export function labelCandidates(tokens: TokenLogprob[], key: "took" | "meant"): StoredLogprobs | null {
  const text = tokens.map((t) => t.token).join("");
  const m = new RegExp(`"${key}"\\s*:\\s*"`).exec(text);
  if (!m) return null;
  const start = m.index + m[0].length;
  let at = 0;
  for (let i = 0; i < tokens.length; i++) {
    const end = at + tokens[i]!.token.length;
    if (start < end) return { at: key, token: tokens[i]!.token, index: i, candidates: candidates(tokens[i]!) };
    at = end;
  }
  return null;
}

/** Stores what the setting asks for, from a reply's tokens; null when there are none. */
export function storedLogprobs(setting: LogprobsSetting, kind: string, tokens: TokenLogprob[] | null | undefined): StoredLogprobs | null {
  const key = labelKey(kind);
  if (setting === "off" || !key || !tokens?.length) return null;
  if (setting === "all") return { at: "all", tokens: tokens.map((t) => ({ token: t.token, candidates: candidates(t) })) };
  return labelCandidates(tokens, key);
}

/**
 * A reply that refused the request over the logprobs parameter: with OpenRouter's
 * require_parameters, a provider that doesn't support it isn't routed to (no endpoint can handle
 * the parameters), or the provider rejects it outright.
 */
export function rejectedForLogprobs(res: CallResult): boolean {
  return !res.ok && (res.status === 400 || res.status === 404 || res.status === 422) && /logprob|support(ed)? (the )?(requested )?param|handle the requested param/i.test(res.error);
}

/** Per-run state: whether to keep asking, and whether the "not supported" note has been logged. */
export interface LogprobsState {
  supported: boolean;
  noted: boolean;
}

/**
 * Sends a call, asking for log probabilities when the setting, the call kind, and the provider allow.
 * If the request is refused over the parameter, it's sent again without it (that request wasn't
 * served, so nothing was billed), and the run stops asking; the "not supported" note is made once.
 * The logprobs never fail or retry a call by themselves.
 */
export async function callWithLogprobs(
  send: (extra: Record<string, unknown>) => Promise<CallResult>,
  setting: LogprobsSetting,
  kind: string,
  state: LogprobsState,
  note: (message: string) => void,
): Promise<{ res: CallResult; logprobs: StoredLogprobs | null | undefined }> {
  const ask = state.supported ? logprobsRequest(setting, kind) : null;
  let res = await send(ask ?? {});
  if (ask && rejectedForLogprobs(res)) {
    state.supported = false;
    if (!state.noted) {
      state.noted = true;
      note(`The provider rejected log probabilities (${res.ok ? "" : res.error.slice(0, 160)}); this run stores null for them.`);
    }
    res = await send({});
  }
  // undefined: a call that writes no label (a system call) doesn't carry the field; think() and speak() always do.
  if (!labelKey(kind)) return { res, logprobs: undefined };
  return { res, logprobs: res.ok ? storedLogprobs(setting, kind, res.logprobs) : null };
}
