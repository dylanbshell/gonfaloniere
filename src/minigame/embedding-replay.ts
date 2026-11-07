// The embedding replay check (CC-20261107-03; Models & Research v0.47, Open Questions: "Do the first full
// games switch to embeddings?"). No character model calls: each saved game is played again through the
// engine with every call answered by the reply the record holds, so each character's notebook is rebuilt
// exactly as it stood at each call. At every block 6 retrieval, block 6 is computed twice: (a) word
// overlap, as it ran, checked against the recorded prompt; (b) embeddings, through the same
// retrieveNotebook with ranked cosine similarities, as the live store would rank them (the character's own
// rows, the query the last two History lines). The game goes on with (a), as it did.
//
//   op run --env-file=.env -- npm run -s minigame:embed-replay -- <records .full.json.gz> [--judge]
//
// Without --judge it stops after the measures and the drawn sample. Embedding spend goes to the mini-game
// ledger (results/minigame/); the judge (native Claude API, CLAUDE_CREDIT_API_KEY) to its own Claude-credit
// ledger (results/claude-credit/). Output: results/embedding-replay/.

import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { docsFor } from "../../probe.config.ts";
import type { CharacterName } from "../game/roster.ts";
import { gitCommit, priorSpend, RunLog, type LogRecord } from "../harness/log.ts";
import { loadDocs } from "../sources/docs.ts";
import { embedderFromEnv, type Embedder } from "./embed.ts";
import { formatLine, MiniGame, type CallRequest, type CallResponse, type GameSettings } from "./engine.ts";
import { MemoryStore, namesIn, type GameLine, type NotebookTrace, type Ranked } from "./memory.ts";
import { readRecord } from "./view.ts";
import { storeRows } from "./store.ts";

export const OUT = "results/embedding-replay";
const MINIGAME_LEDGER = "results/minigame";
export const CREDIT_LEDGER = "results/claude-credit";
/** The one OpenRouter provider the embedding model is pinned to, no fallbacks: bf16, the only one stating full precision. */
export const EMBED_PROVIDER = "nebius";
const EMBED_CAP_USD = 0.1;
/** Spend stop for the Claude credit in this task. */
const CREDIT_CAP_USD = 2;
export const JUDGE_MODEL = "claude-sonnet-5-5";
/** Claude Sonnet 5.5, per token (claude-api skill, cached 2026-10-06): $2 / $10 per million. */
const JUDGE_PRICE = { input: 2 / 1e6, output: 10 / 1e6 };
const SAMPLE_SIZE = 80;
const SAMPLE_SEED = 20261107;
/** Calls a character receives; only these build block 6. */
const CHARACTER_KINDS = ["plan", "think", "speak", "move", "seat", "murder"];
const HEAD = "WHAT YOU REMEMBER FROM EARLIER TONIGHT\n";

/** Block 6's lines as a prompt shows them, or null if it has no block 6. */
export function block6(user: string): string[] | null {
  const a = user.indexOf(HEAD);
  if (a < 0) return null;
  const b = user.indexOf("(★ marks", a);
  return user.slice(a + HEAD.length, b < 0 ? undefined : b).split("\n").filter((l) => l.startsWith("- ")).map((l) => l.slice(2));
}

interface RecCall {
  n: number;
  turn: number;
  kind: string;
  character: string | null;
  user: string;
  raw: string | null;
  error?: string | null;
  provider?: string | null;
  model?: string | null;
  logprobs?: unknown;
}
interface Rec {
  header: { game_id: string; seed: number; cast: CharacterName[]; briefings: Partial<Record<CharacterName, string>>; docs: Record<string, string>; config: Record<string, unknown> };
  calls: RecCall[];
}

export interface Method {
  lines: string[];
  items: NonNullable<NotebookTrace["items"]>;
  fillSlots: number;
}

export interface Point {
  id: string;
  game: string;
  turn: number;
  character: CharacterName;
  /** The call that used this block 6, and the recorded call it was matched to. */
  callKind: string | null;
  callN: number | null;
  present: CharacterName[];
  /** The two History lines the query is made of: speaker and text, and as History shows them. */
  query: { speaker: string | null; text: string; shown: string }[];
  queryText: string;
  murder: boolean;
  overlap: Method;
  embeddings: Method | null;
  /** The character's rows as the live store would hold them at this moment: id and embedded body. */
  rows: { id: string; body: string }[];
  /** Block 6 as recorded, and as replayed. */
  recorded: string[] | null;
  replayed: string[] | null;
}

/** How a store row is ranked for one retrieval: the live store's cosine similarity, or 0 for all with no query. */
export type Rank = (rows: { id: string; body: string }[], query: string) => Ranked[];

/**
 * Plays a saved game again with its recorded replies, calling `onPoint` at every block 6 retrieval.
 * With `rank`, each point also gets the embeddings selection.
 */
export async function replayGame(path: string, rank?: Rank): Promise<{ points: Point[]; calls: number; exact: number; inexact: { n: number; kind: string; character: string | null; firstDiff?: { line: number; recorded: string | null; replayed: string | null } }[]; memory: MemoryStore }> {
  const rec = readRecord(path) as unknown as Rec;
  const h = rec.header;
  const docs = loadDocs(docsFor(h.docs.technicalDesign!));
  for (const k of ["technicalDesign", "characters", "mechanics"] as const) {
    if (docs.versions[k] !== h.docs[k]) throw new Error(`${h.game_id}: the record ran on ${k} v${h.docs[k]}, but docsFor loads v${docs.versions[k]}`);
  }
  // The runner writes the game's settings into the header's config.
  const c = h.config as unknown as GameSettings;
  const settings: GameSettings = {
    cast: h.cast,
    briefings: h.briefings,
    seed: h.seed,
    turns: c.turns,
    utterancesPerTurn: c.utterancesPerTurn,
    historyWindow: c.historyWindow,
    thoughtWindow: c.thoughtWindow,
    maxCapannello: c.maxCapannello,
    maxTokens: c.maxTokens,
    playTemperature: c.playTemperature,
    systemTemperature: c.systemTemperature,
    checks: c.checks,
    ...(c.speakAppend !== undefined && { speakAppend: c.speakAppend }),
    ...(c.dropRepeatedThoughts !== undefined && { dropRepeatedThoughts: c.dropRepeatedThoughts }),
    notebook: c.notebook ?? "perceived",
    logprobs: c.logprobs ?? "off",
    retrieval: "overlap",
    lore: c.lore ?? "off",
  };
  if (settings.notebook !== "perceived") throw new Error(`${h.game_id}: notebook ${settings.notebook}; this check reads the perceived notebook`);

  // The recorded calls by kind and character, in order; each request takes the one with its exact prompt.
  const pool = new Map<string, RecCall[]>();
  for (const call of [...rec.calls].sort((a, b) => a.n - b.n)) {
    const k = `${call.kind}|${call.character}`;
    (pool.get(k) ?? pool.set(k, []).get(k)!).push(call);
  }
  const used = new Set<RecCall>();
  // Replies are released in the order the live game received them (a call's n is given on arrival), and one
  // at a time, so thought ids and every other arrival-ordered thing come out as they did.
  const order = rec.calls.map((x) => x.n).sort((a, b) => a - b);
  let next = 0;
  const waiting = new Map<number, () => void>();
  let lastRelease = Date.now();
  const pump = () => {
    const go = waiting.get(order[next]!);
    if (!go) return;
    waiting.delete(order[next]!);
    next++;
    lastRelease = Date.now();
    go();
    setImmediate(pump);
  };
  const watchdog = setInterval(() => {
    if (waiting.size && Date.now() - lastRelease > 5000) {
      clearInterval(watchdog);
      throw new Error(`${h.game_id}: replay stalled waiting for call ${order[next]}; held: ${[...waiting.keys()].join(", ")}`);
    }
  }, 1000);
  let calls = 0;
  let exact = 0;
  const inexact: { n: number; kind: string; character: string | null; firstDiff?: { line: number; recorded: string | null; replayed: string | null } }[] = [];
  const points: Point[] = [];
  const pending = new Map<string, Point>();
  const caller = async (req: CallRequest): Promise<CallResponse> => {
    calls++;
    const list = pool.get(`${req.kind}|${req.character}`) ?? [];
    let i = list.findIndex((x) => !used.has(x) && x.user === req.user);
    if (i >= 0) exact++;
    else {
      i = list.findIndex((x) => !used.has(x));
      if (i < 0) throw new Error(`${h.game_id}: no recorded ${req.kind} call for ${req.character} left`);
      const want = list[i]!.user.split("\n");
      const got = req.user.split("\n");
      const at = got.findIndex((l, k) => l !== want[k]);
      inexact.push({ n: list[i]!.n, kind: req.kind, character: req.character, firstDiff: { line: at, recorded: want[at] ?? null, replayed: got[at] ?? null } });
    }
    const call = list[i]!;
    used.add(call);
    const p = req.character ? pending.get(req.character) : undefined;
    if (p && CHARACTER_KINDS.includes(req.kind)) {
      pending.delete(req.character!);
      Object.assign(p, { callKind: req.kind, callN: call.n, turn: call.turn, recorded: block6(call.user), replayed: block6(req.user) });
    }
    await new Promise<void>((resolve) => {
      waiting.set(call.n, resolve);
      setImmediate(pump);
    });
    return {
      ok: call.raw != null,
      content: call.raw ?? "",
      error: call.raw == null ? (call.error ?? "no reply recorded") : null,
      costUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: 0,
      provider: call.provider ?? null,
      model: call.model ?? null,
      ...(call.logprobs !== undefined && { logprobs: call.logprobs as CallResponse["logprobs"] }),
    };
  };

  const game = new MiniGame(docs, settings, caller);
  const memory = game.memory;
  // Each row's body as the live store keeps it: written once, at its first flush.
  const bodies = new Map<string, string>();
  const orig = MemoryStore.prototype.retrieveNotebook;
  const chars = (game as unknown as { chars: Map<CharacterName, { lines: GameLine[] }> }).chars;
  memory.retrieveNotebook = function (this: MemoryStore, ch, present, recent, opts = {}) {
    const run = (ranked?: Ranked[]): Method => {
      const trace: NotebookTrace = {};
      const lines = orig.call(this, ch, present, recent, { ...opts, ...(ranked && { ranked }), trace });
      return { lines, items: trace.items ?? [], fillSlots: trace.fillSlots ?? 0 };
    };
    const overlap = run();
    const rows = storeRows(this)
      .filter((r) => r.owner === ch && ["reading", "code", "belief"].includes(r.kind))
      .map((r) => {
        const key = `${r.owner}|${r.rowId}`;
        if (!bodies.has(key)) bodies.set(key, r.body);
        return { id: r.rowId, body: bodies.get(key)! };
      });
    const queryText = recent.join("\n");
    const history = chars.get(ch)!.lines.slice(-settings.historyWindow).slice(-2);
    const point: Point = {
      id: `${h.game_id.replace(/^.*minigame-/, "")}-${String(points.length + 1).padStart(3, "0")}`,
      game: h.game_id,
      turn: 0,
      character: ch,
      callKind: null,
      callN: null,
      present: [...present],
      query: history.map((l) => ({ speaker: l.speaker ?? null, text: l.text, shown: formatLine(l) })),
      queryText,
      murder: Boolean(opts.murder),
      overlap,
      embeddings: rank ? run(rank(rows, queryText)) : null,
      rows,
      recorded: null,
      replayed: null,
    };
    if (history.map((l) => l.text).join("\n") !== queryText) throw new Error(`${point.id}: the query lines don't match the retrieval's query`);
    points.push(point);
    pending.set(ch, point);
    return overlap.lines;
  };
  try {
    await game.play();
  } finally {
    clearInterval(watchdog);
  }
  if (next !== order.length) throw new Error(`${h.game_id}: ${order.length - next} recorded calls were never asked for`);
  return { points, calls, exact, inexact, memory };
}

// ---- Embeddings ----------------------------------------------------------------------------------------

const keyOf = (text: string) => createHash("sha256").update(text).digest("hex");

/** Vectors by text, cached on disk so a rerun pays nothing; spend logged to the mini-game ledger, capped. */
export class EmbeddingTable {
  private vectors = new Map<string, Float32Array>();
  readonly providers = new Map<string, number>();
  tokens = 0;
  costUsd = 0;
  private log: RunLog;
  private cachePath: string;

  constructor(
    private embedder: Embedder,
    runId: string,
  ) {
    mkdirSync(OUT, { recursive: true });
    this.cachePath = join(OUT, `vectors-${embedder.model.replace(/\W+/g, "_")}-${EMBED_PROVIDER}.json`);
    if (existsSync(this.cachePath)) for (const [k, v] of Object.entries(JSON.parse(readFileSync(this.cachePath, "utf8")) as Record<string, number[]>)) this.vectors.set(k, Float32Array.from(v));
    this.log = new RunLog(runId, "embed-replay-", MINIGAME_LEDGER);
  }

  get(text: string): Float32Array {
    const v = this.vectors.get(keyOf(text));
    if (!v) throw new Error(`No vector for a text; fetch first`);
    return v;
  }

  /** Embeds every text not already held, in batches, refusing to pass the OpenRouter cap. */
  async fetch(texts: string[], batch = 64): Promise<void> {
    const todo = [...new Set(texts)].filter((t) => !this.vectors.has(keyOf(t)));
    for (let i = 0; i < todo.length; i += batch) {
      const part = todo.slice(i, i + batch);
      // TD v0.22: the store embeds an empty text as a fixed unit vector; this check never sends one.
      if (part.some((t) => !t.trim())) throw new Error("An empty text reached the embedder");
      const spent = priorSpend(MINIGAME_LEDGER);
      if (this.costUsd >= EMBED_CAP_USD) throw new Error(`OpenRouter cap reached: $${this.costUsd.toFixed(5)} of $${EMBED_CAP_USD} (ledger $${spent.toFixed(2)})`);
      const r = await this.embedder.embed(part);
      const cost = r.costUsd ?? r.inputTokens * 0.01e-6;
      this.tokens += r.inputTokens;
      this.costUsd += cost;
      if (r.provider) this.providers.set(r.provider, (this.providers.get(r.provider) ?? 0) + 1);
      this.log.write({ type: "embedding-call", model: this.embedder.model, provider: r.provider ?? null, texts: part.length, inputTokens: r.inputTokens, costUsd: cost, costReported: r.costUsd !== null, at: new Date().toISOString() } as unknown as LogRecord);
      if (!r.provider || r.provider.toLowerCase() !== EMBED_PROVIDER) throw new Error(`Embeddings served by ${r.provider ?? "an unreported provider"}, not the pinned ${EMBED_PROVIDER}`);
      r.vectors.forEach((v, j) => {
        if (v.length !== 4096) throw new Error(`Embedding has ${v.length} dimensions, not 4,096`);
        this.vectors.set(keyOf(part[j]!), Float32Array.from(v));
      });
      writeFileSync(this.cachePath, JSON.stringify(Object.fromEntries([...this.vectors].map(([k, v]) => [k, [...v]]))));
    }
  }
}

/** Cosine similarity, with vectors held at float32 as pgvector stores them. */
export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return dot / Math.sqrt(na * nb);
}

/** The live store's ranking: the character's rows by cosine similarity to the query, all 0 with no query (store.ts). */
export function rankWith(table: EmbeddingTable): Rank {
  return (rows, query) => {
    if (!query.trim()) return rows.map((r) => ({ id: r.id, similarity: 0 }));
    const q = table.get(query);
    return rows.map((r) => ({ id: r.id, similarity: cosine(q, table.get(r.body)) }));
  };
}

// ---- Measures ------------------------------------------------------------------------------------------

/**
 * The names a row is about: a reading's or entry's speaker and about fields; a belief has none, so the
 * roster names in its statement. With `text`, an entry whose fields are empty (Il Notaio's and other
 * code-written entries) is read for the names in its summary instead.
 */
function rowNames(memory: MemoryStore, id: string, text = false): { names: string[]; kind: string } {
  const r = memory.readings.find((x) => x.id === id);
  if (r) return { names: [r.speaker, ...r.about], kind: "reading" };
  const e = memory.entries.find((x) => x.id === id);
  if (e) {
    const names = [e.speaker, ...e.about].filter(Boolean) as string[];
    return { names: text && !names.length ? namesIn(e.summary) : names, kind: names.length ? "entry" : "entry (no speaker or about)" };
  }
  const b = memory.beliefs.find((x) => x.id === id);
  if (b) return { names: namesIn(b.statement), kind: "belief" };
  throw new Error(`No row ${id}`);
}

/** Who counts as relevant at a point: those present, and anyone speaking or named in the two query lines. */
function relevant(p: Point): Set<string> {
  return new Set([...p.present, ...p.query.flatMap((q) => [...(q.speaker ? [q.speaker] : []), ...namesIn(q.text)])]);
}

/** Fill items about no one relevant. `text`: entries with empty fields are read for names (see rowNames). */
export function wrongPerson(p: Point, m: Method, memory: MemoryStore, text = false): { id: string; line: string; names: string[]; kind: string }[] {
  const rel = relevant(p);
  return m.items
    .filter((x) => x.step === "fill")
    .map((x) => ({ ...x, ...rowNames(memory, x.id, text) }))
    .filter((x) => !x.names.some((n) => rel.has(n)))
    .map((x) => ({ id: x.id, line: x.line, names: x.names, kind: x.kind }));
}

const fillIds = (m: Method) => new Set(m.items.filter((x) => x.step === "fill").map((x) => x.id));
export const sameFill = (p: Point) => {
  const a = fillIds(p.overlap);
  const b = fillIds(p.embeddings!);
  return a.size === b.size && [...a].every((x) => b.has(x));
};

// ---- Sample and judge ---------------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 80 points whose fills differ, spread across games and turns: shuffled within each (game, turn), then taken in turn from each. */
export function drawSample(points: Point[], n = SAMPLE_SIZE, seed = SAMPLE_SEED): string[] {
  const rng = mulberry32(seed);
  const strata = new Map<string, Point[]>();
  for (const p of points.filter((p) => !sameFill(p) && p.query.length > 0)) {
    const k = `${p.game}|${String(p.turn).padStart(2, "0")}`;
    (strata.get(k) ?? strata.set(k, []).get(k)!).push(p);
  }
  const lists = [...strata.keys()].sort().map((k) => {
    const xs = [...strata.get(k)!];
    for (let i = xs.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [xs[i], xs[j]] = [xs[j]!, xs[i]!];
    }
    return xs;
  });
  const out: string[] = [];
  for (let round = 0; out.length < n && lists.some((l) => l.length > round); round++) {
    for (const l of lists) if (l[round] && out.length < n) out.push(l[round]!.id);
  }
  return out;
}

/** The judge prompt, verbatim from the task. */
export function judgePrompt(p: Point, a: string[], b: string[]): string {
  const lines = [p.query[0]?.shown ?? "(none)", p.query[1]?.shown ?? "(none)"];
  return `You are judging which of two memory selections better serves a character in a role-play game set in Florence, 1492. The character is about to think and speak, and can only recall what is in their selection.

Character: ${p.character}
Present: ${p.present.join(", ")}
The last two lines spoken:
${lines[0]}
${lines[1]}

Selection A:
${a.map((l) => `- ${l}`).join("\n")}

Selection B:
${b.map((l) => `- ${l}`).join("\n")}

The selections share some items; focus on where they differ. Which one gives the character more useful recall for responding to these lines: memories about the people and matters just raised, or about what is at stake with those present? Ignore writing style and length.
Answer on the first line with exactly one of: A, B, TIE. Then one sentence why.`;
}

export interface Judgement {
  id: string;
  order: "A=overlap" | "A=embeddings";
  answer: "A" | "B" | "TIE" | null;
  /** The method the answer picks, or tie. */
  picks: "overlap" | "embeddings" | "tie" | null;
  why: string;
  stop: string | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export async function judge(points: Point[], runId: string): Promise<Judgement[]> {
  const apiKey = process.env.CLAUDE_CREDIT_API_KEY;
  if (!apiKey) throw new Error("CLAUDE_CREDIT_API_KEY isn't set");
  // Only the credit key: other Anthropic credentials are dropped unread, so nothing can fall back to them.
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_AUTH_TOKEN;
  // The credit key, given explicitly: the client never falls back to other credentials.
  const client = new Anthropic({ apiKey, maxRetries: 4 });
  const log = new RunLog(runId, "judge-embed-replay-", CREDIT_LEDGER);
  const out: Judgement[] = [];
  for (const p of points) {
    for (const order of ["A=overlap", "A=embeddings"] as const) {
      const spent = priorSpend(CREDIT_LEDGER);
      if (spent >= CREDIT_CAP_USD) throw new Error(`Claude-credit cap reached: $${spent.toFixed(4)} of $${CREDIT_CAP_USD}`);
      const [a, b] = order === "A=overlap" ? [p.overlap.lines, p.embeddings!.lines] : [p.embeddings!.lines, p.overlap.lines];
      // Thinking off ("between_tools": Sonnet 5.5 rejects "disabled"); no temperature (Claude 5 rejects non-default
      // values); no refusal fallback, so every verdict comes from the one judge model.
      const res = await client.messages.create({
        model: JUDGE_MODEL,
        max_tokens: 300,
        thinking: { type: "between_tools" } as unknown as Anthropic.ThinkingConfigParam,
        messages: [{ role: "user", content: judgePrompt(p, a, b) }],
      });
      const text = res.content.flatMap((c) => (c.type === "text" ? [c.text] : [])).join("").trim();
      const first = text.split("\n")[0]!.trim().replace(/[^A-Z]/gi, "").toUpperCase();
      const answer = first === "A" || first === "B" || first === "TIE" ? first : null;
      const picks = answer === null ? null : answer === "TIE" ? "tie" : (answer === "A") === (order === "A=overlap") ? "overlap" : "embeddings";
      const costUsd = res.usage.input_tokens * JUDGE_PRICE.input + res.usage.output_tokens * JUDGE_PRICE.output;
      const j: Judgement = { id: p.id, order, answer, picks, why: text.split("\n").slice(1).join(" ").trim(), stop: res.stop_reason, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens, costUsd };
      log.write({ type: "claude-call", model: res.model, point: p.id, order, inputTokens: j.inputTokens, outputTokens: j.outputTokens, costUsd, stop: res.stop_reason, at: new Date().toISOString() } as unknown as LogRecord);
      out.push(j);
    }
  }
  return out;
}

/** Both orders must pick the same method; anything else, a TIE included, is a tie. */
export function verdicts(js: Judgement[]): Map<string, "overlap" | "embeddings" | "tie"> {
  const by = new Map<string, Judgement[]>();
  for (const j of js) (by.get(j.id) ?? by.set(j.id, []).get(j.id)!).push(j);
  return new Map([...by].map(([id, [x, y]]) => [id, x && y && x.picks === y.picks && (x.picks === "overlap" || x.picks === "embeddings") ? x.picks : "tie"]));
}

// ---- Determinism ----------------------------------------------------------------------------------------

/** Embeds the same texts twice (no cache) and returns the largest cosine difference between the two runs. */
export async function determinism(embedder: Embedder, texts: string[]): Promise<{ maxDiff: number; tokens: number; costUsd: number; providers: (string | null)[] }> {
  const a = await embedder.embed(texts);
  const b = await embedder.embed(texts);
  let maxDiff = 0;
  a.vectors.forEach((v, i) => {
    maxDiff = Math.max(maxDiff, Math.abs(1 - cosine(Float32Array.from(v), Float32Array.from(b.vectors[i]!))));
  });
  const cost = (r: typeof a) => r.costUsd ?? r.inputTokens * 0.01e-6;
  new RunLog(`determinism-${Date.now()}`, "embed-replay-", MINIGAME_LEDGER).write({ type: "embedding-call", model: embedder.model, provider: a.provider ?? null, texts: texts.length * 2, inputTokens: a.inputTokens + b.inputTokens, costUsd: cost(a) + cost(b), at: new Date().toISOString() } as unknown as LogRecord);
  return { maxDiff, tokens: a.inputTokens + b.inputTokens, costUsd: cost(a) + cost(b), providers: [a.provider ?? null, b.provider ?? null] };
}

// ---- Command line --------------------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { judge: { type: "boolean", default: false }, "overlap-only": { type: "boolean", default: false }, determinism: { type: "boolean", default: false } } });
  if (!positionals.length) {
    console.error("Usage: op run --env-file=.env -- npm run -s minigame:embed-replay -- <records .full.json.gz> [--overlap-only] [--judge]");
    process.exit(1);
  }
  mkdirSync(OUT, { recursive: true });
  const runId = new Date().toISOString().replace(/[:.]/g, "-");

  if (values.determinism) {
    // The 20 shortest spoken lines of the first game, embedded twice with no cache.
    const speech = (readRecord(positionals[0]!) as unknown as { lines: { kind: string; text: string }[] }).lines.filter((l) => l.kind === "speech").map((l) => l.text);
    const lines = [...new Set(speech)].sort((a, b) => a.length - b.length || a.localeCompare(b)).slice(0, 20);
    const embedder = embedderFromEnv(process.env, { provider: EMBED_PROVIDER });
    if (!embedder) throw new Error("EMBEDDING_MODEL_BASE_URL, EMBEDDING_MODEL_API_KEY, and EMBEDDING_MODEL_ID must all be set");
    const d = await determinism(embedder, lines);
    writeFileSync(join(OUT, "determinism.json"), JSON.stringify({ model: embedder.model, pinned: EMBED_PROVIDER, texts: lines.length, ...d }, null, 1));
    console.log(JSON.stringify({ model: embedder.model, pinned: EMBED_PROVIDER, texts: lines.length, ...d }));
    process.exit(0);
  }

  // (a) overlap, as it ran: no network.
  const first = await Promise.all(positionals.map((p) => replayGame(p)));
  const all = first.flatMap((g) => g.points);
  const matched = all.filter((p) => p.recorded !== null);
  const bad = matched.filter((p) => JSON.stringify(p.recorded) !== JSON.stringify(p.overlap.lines) || JSON.stringify(p.replayed) !== JSON.stringify(p.overlap.lines));
  const check = {
    games: first.map((g, i) => ({ path: positionals[i], calls: g.calls, exactPrompts: g.exact, inexactPrompts: g.inexact.length, points: g.points.length, unmatched: g.points.filter((p) => p.recorded === null).length })),
    points: all.length,
    mismatches: bad.length,
    mismatchShare: matched.length ? bad.length / matched.length : 0,
    firstInexact: first.map((g) => g.inexact.slice(0, 6)),
    examples: bad.slice(0, 5).map((p) => ({ id: p.id, call: p.callN, recorded: p.recorded, overlap: p.overlap.lines })),
  };
  writeFileSync(join(OUT, "overlap-check.json"), JSON.stringify(check, null, 1));
  console.log(`Overlap reproduction: ${all.length} block 6 retrievals, ${matched.length} matched to a call; ${bad.length} mismatches (${(100 * check.mismatchShare).toFixed(2)}%). ${first.map((g) => `${g.exact}/${g.calls} prompts exact`).join("; ")}.`);
  if (check.mismatchShare > 0.02) {
    console.log("Over 2%: stopping before embeddings and the judge.");
    process.exit(2);
  }
  if (values["overlap-only"]) process.exit(0);

  // (b) embeddings: every row body and query, embedded once.
  const embedder = embedderFromEnv(process.env, { provider: EMBED_PROVIDER });
  if (!embedder) throw new Error("EMBEDDING_MODEL_BASE_URL, EMBEDDING_MODEL_API_KEY, and EMBEDDING_MODEL_ID must all be set");
  const table = new EmbeddingTable(embedder, runId);
  await table.fetch(all.flatMap((p) => [...p.rows.map((r) => r.body), ...(p.queryText.trim() ? [p.queryText] : [])]));
  const games = await Promise.all(positionals.map((p) => replayGame(p, rankWith(table))));
  const points = games.flatMap((g) => g.points);
  const memoryOf = new Map(games.map((g) => [g.points[0]!.game, g.memory]));
  if (JSON.stringify(points.map((p) => p.overlap.lines)) !== JSON.stringify(all.map((p) => p.overlap.lines))) throw new Error("The second replay's overlap selections differ from the first's");
  writeFileSync(join(OUT, "points.json"), JSON.stringify(points.map((p) => ({ ...p, rows: p.rows.length }))));

  // Measures.
  const measure = (m: "overlap" | "embeddings", text = false) => {
    let fill = 0;
    let wrong = 0;
    let noFields = 0;
    for (const p of points) {
      fill += p[m]!.items.filter((x) => x.step === "fill").length;
      const w = wrongPerson(p, p[m]!, memoryOf.get(p.game)!, text);
      wrong += w.length;
      noFields += w.filter((x) => x.kind === "entry (no speaker or about)").length;
    }
    return { fill, wrong, share: fill ? wrong / fill : 0, ofThemEntriesWithEmptyFields: noFields };
  };
  const ov = measure("overlap");
  const em = measure("embeddings");
  // Not the rule's measure: the same with empty-field entries read for the names in their text.
  const ovText = measure("overlap", true);
  const emText = measure("embeddings", true);
  const slots = points.map((p) => p.overlap.fillSlots);
  const measures = {
    commit: gitCommit(),
    embedding: { model: embedder.model, provider: EMBED_PROVIDER, providersReported: Object.fromEntries(table.providers), tokens: table.tokens, costUsd: table.costUsd },
    points: points.length,
    identicalFill: points.filter(sameFill).length,
    identicalFillShare: points.filter(sameFill).length / points.length,
    fillSlots: { mean: slots.reduce((a, b) => a + b, 0) / slots.length, zeroShare: slots.filter((s) => s === 0).length / slots.length, sameForBoth: points.every((p) => p.overlap.fillSlots === p.embeddings!.fillSlots) },
    wrongPerson: { overlap: ov, embeddings: em, gapPoints: 100 * (em.share - ov.share) },
    wrongPersonReadingEntryText: { overlap: ovText, embeddings: emText, gapPoints: 100 * (emText.share - ovText.share) },
    wrongExamples: points.flatMap((p) => wrongPerson(p, p.embeddings!, memoryOf.get(p.game)!, true).map((w) => ({ point: p.id, character: p.character, present: p.present, query: p.query.map((q) => q.shown), item: w }))).slice(0, 12),
  };
  writeFileSync(join(OUT, "measures.json"), JSON.stringify(measures, null, 1));
  console.log(JSON.stringify({ ...measures, wrongExamples: measures.wrongExamples.length }, null, 1));

  // The sample, written before any judging.
  const samplePath = join(OUT, "sample.json");
  const sample = existsSync(samplePath) ? (JSON.parse(readFileSync(samplePath, "utf8")) as { ids: string[] }).ids : drawSample(points);
  if (!existsSync(samplePath)) writeFileSync(samplePath, JSON.stringify({ seed: SAMPLE_SEED, drawnAt: new Date().toISOString(), differing: points.filter((p) => !sameFill(p)).length, ids: sample }, null, 1));
  console.log(`Sample: ${sample.length} of ${points.filter((p) => !sameFill(p)).length} differing points, in ${samplePath}`);
  if (!values.judge) process.exit(0);

  const byId = new Map(points.map((p) => [p.id, p]));
  const js = await judge(sample.map((id) => byId.get(id)!), runId);
  writeFileSync(join(OUT, "judgements.json"), JSON.stringify(js, null, 1));
  const v = verdicts(js);
  const count = (xs: (string | null)[]) => xs.reduce((m, x) => m.set(String(x), (m.get(String(x)) ?? 0) + 1), new Map<string, number>());
  const agreeing = [...v.values()].filter((x) => x !== "tie");
  const result = {
    byOrder: Object.fromEntries((["A=overlap", "A=embeddings"] as const).map((o) => [o, Object.fromEntries(count(js.filter((j) => j.order === o).map((j) => j.picks)))])),
    verdicts: Object.fromEntries(count([...v.values()])),
    agreeing: agreeing.length,
    embeddingsWinShare: agreeing.length ? agreeing.filter((x) => x === "embeddings").length / agreeing.length : null,
    refusals: js.filter((j) => j.stop === "refusal").length,
    unparsed: js.filter((j) => j.answer === null).length,
    judgeCostUsd: js.reduce((a, j) => a + j.costUsd, 0),
    creditLedgerUsd: priorSpend(CREDIT_LEDGER),
  };
  writeFileSync(join(OUT, "verdicts.json"), JSON.stringify({ ...result, perPoint: Object.fromEntries(v) }, null, 1));
  console.log(JSON.stringify(result, null, 1));
}
