// JSONL run logs in results/. One file per run; every call is one line.

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

export interface CallRecord {
  type: "call";
  runId: string;
  modelId: string;
  providerTag: string;
  /** "preflight" or a scenario id. */
  target: string;
  /** thinking-off / control-thinking-on for the pre-flight; raw / constrained for scenarios. */
  variant: string;
  callType: "think";
  character: string;
  sample: number;
  seed: number;
  temperature: number;
  maxTokens: number;
  requestExtra: Record<string, unknown>;
  constrained: boolean;
  prompt: string;
  expect: ThinkExpectation;
  raw: string | null;
  reasoning: string | null;
  parsed: ThinkParseResult | null;
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

export type LogRecord = RunRecord | CallRecord | StopRecord | EndRecord;

export class RunLog {
  readonly path: string;

  constructor(runId: string) {
    mkdirSync(RESULTS_DIR, { recursive: true });
    this.path = join(RESULTS_DIR, `${runId}.jsonl`);
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

/** Total spent across every logged run, for the probe-wide cap. */
export function priorSpend(): number {
  return readRecords(runLogFiles())
    .filter((r): r is CallRecord => r.type === "call")
    .reduce((sum, r) => sum + r.costUsd, 0);
}
