// JSONL run logs in results/. One file per run; every call is one line.

import { execSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContradictionKind, JudgeVerdict } from "../judge/judge.ts";
import type { InferenceVerdict } from "../judge/inference.ts";
import type { SpeakExpectation, SpeakParseResult } from "../output/speak.ts";
import type { ThinkExpectation, ThinkParseResult } from "../output/think.ts";
import type { DocVersions } from "../sources/docs.ts";
import type { EndpointInfo, Usage } from "./openrouter.ts";

export const RESULTS_DIR = "results";

export interface RunRecord {
  type: "run";
  runId: string;
  startedAt: string;
  modelId: string;
  modelSlug: string;
  endpoint: EndpointInfo;
  docVersions: DocVersions;
  gitCommit: string | null;
  targets: string[];
  settings: Record<string, unknown>;
}

interface CallBase {
  type: "call";
  runId: string;
  modelId: string;
  providerTag: string;
  /** "preflight" or a scenario id. */
  target: string;
  /** thinking-off / control-thinking-on for the pre-flight; raw / constrained for scenarios. */
  variant: string;
  character: string;
  /** Sample index, or the run index in a dialogue. */
  sample: number;
  /** Dialogue only: 1-based turn within the run. */
  turn?: number;
  /** Dialogue speak() only: 0 for the first try, then each retry after an unparseable reply. */
  attempt?: number;
  seed: number;
  temperature: number;
  maxTokens: number;
  requestExtra: Record<string, unknown>;
  constrained: boolean;
  prompt: string;
  raw: string | null;
  reasoning: string | null;
  usage: Usage | null;
  /** usage.cost, or computed from tokens when OpenRouter didn't report it. */
  costUsd: number;
  latencyMs: number;
  /** Provider that actually served the call, as OpenRouter reports it. */
  provider: string | null;
  generationId: string | null;
  finishReason: string | null;
  error: { message: string; status: number | null } | null;
  at: string;
}

export interface ThinkCallRecord extends CallBase {
  callType: "think";
  expect: ThinkExpectation;
  parsed: ThinkParseResult | null;
}

export interface SpeakCallRecord extends CallBase {
  callType: "speak";
  expect: SpeakExpectation;
  parsed: SpeakParseResult | null;
}

export type CallRecord = ThinkCallRecord | SpeakCallRecord;

/** A dialogue run that couldn't continue (e.g. speak() never produced a usable line). */
export interface AbortRecord {
  type: "abort";
  runId: string;
  modelId: string;
  target: string;
  sample: number;
  turn: number;
  reason: string;
  at: string;
}

/** One judge call on one dialogue run (Models & Research v0.8, Scoring). */
export interface JudgeRecord {
  type: "judge";
  /** This judging batch. */
  runId: string;
  /** The probe run whose transcript was judged. */
  sourceRunId: string;
  modelId: string;
  target: string;
  /** The dialogue run index within the source run. */
  sample: number;
  character: string;
  judgeModel: string;
  judgeProvider: string;
  rubricVersion: string;
  prompt: string;
  raw: string | null;
  reasoning: string | null;
  verdict: JudgeVerdict | null;
  parseErrors: string[];
  usage: Usage | null;
  costUsd: number;
  latencyMs: number;
  provider: string | null;
  generationId: string | null;
  error: { message: string; status: number | null } | null;
  at: string;
}

/** One judge call on all samples of one S7 version for one model (gate 5). */
export interface InferenceRecord {
  type: "inference";
  runId: string;
  sourceRunId: string;
  modelId: string;
  target: string;
  character: string;
  judgeModel: string;
  rubricVersion: string;
  prompt: string;
  raw: string | null;
  verdict: InferenceVerdict | null;
  parseErrors: string[];
  usage: Usage | null;
  costUsd: number;
  latencyMs: number;
  error: { message: string; status: number | null } | null;
  at: string;
}

/** Kinds for contradictions judged before verdicts carried one (rubric cal1). */
export interface ContradictionKindsRecord {
  type: "contradiction_kinds";
  runId: string;
  modelId: string;
  target: string;
  /** The rubric version of the verdicts whose contradictions were classified. */
  rubricVersion: string;
  /** One per contradiction: its run, and its position in that run's list. */
  items: { sourceRunId: string; sample: number; position: number; kind: ContradictionKind; reason: string }[];
  judgeModel: string;
  prompt: string;
  raw: string | null;
  usage: Usage | null;
  costUsd: number;
  latencyMs: number;
  error: { message: string; status: number | null } | null;
  at: string;
}

export interface StopRecord {
  type: "stop";
  runId: string;
  reason: string;
  spentUsd: number;
  at: string;
}

export interface EndRecord {
  type: "end";
  runId: string;
  calls: number;
  spentUsd: number;
  stoppedByBudget: boolean;
  at: string;
}

export type LogRecord =
  | RunRecord
  | CallRecord
  | AbortRecord
  | JudgeRecord
  | InferenceRecord
  | ContradictionKindsRecord
  | StopRecord
  | EndRecord;

type CostRecord = CallRecord | JudgeRecord | InferenceRecord | ContradictionKindsRecord;

export class RunLog {
  readonly path: string;

  /** `prefix` separates judging logs ("judge-…") from probe runs. */
  constructor(runId: string, prefix = "") {
    mkdirSync(RESULTS_DIR, { recursive: true });
    this.path = join(RESULTS_DIR, `${prefix}${runId}.jsonl`);
  }

  write(record: LogRecord): void {
    appendFileSync(this.path, `${JSON.stringify(record)}\n`);
  }
}

export function runLogFiles(): string[] {
  if (!existsSync(RESULTS_DIR)) return [];
  return readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .sort()
    .map((f) => join(RESULTS_DIR, f));
}

export function readRecords(files: string[]): LogRecord[] {
  return files.flatMap((f) =>
    readFileSync(f, "utf8")
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((l) => JSON.parse(l) as LogRecord),
  );
}

/** Total spent across every logged run and judging batch, for the probe-wide cap. */
export function priorSpend(): number {
  return readRecords(runLogFiles())
    .filter((r): r is CostRecord => "costUsd" in r)
    .reduce((sum, r) => sum + r.costUsd, 0);
}

/** The current commit, recorded with every run so results trace back to code. */
export function gitCommit(): string | null {
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}
