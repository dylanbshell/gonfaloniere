// Scores logged runs against the Capability Probe Plan's thresholds (Models &
// Research v0.5, "Scoring and pass thresholds"). Re-validates every raw output
// with the current parser, so a parser fix rescoring old logs needs no new calls.
//
//   npm run score                          the latest run
//   npm run score -- --all                 every run in results/
//   npm run score -- results/<run>.jsonl   specific runs

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PURPOSE_RULES, parseThink, type ThinkParseResult } from "../output/think.ts";
import { RESULTS_DIR, readRecords, runLogFiles, type CallRecord, type RunRecord } from "./log.ts";

// Set before running so results can't move the goalposts.
const GATE1 = { raw: 0.95, constrained: 0.99 };
const GATE2 = { s2AboveS1Median: 30, minSd: 10 };

const IMPORTANCE_BANDS = [
  [0, 20],
  [21, 40],
  [41, 60],
  [61, 80],
  [81, 100],
] as const;

function main(): void {
  const args = process.argv.slice(2);
  const all = runLogFiles();
  const files = args.includes("--all") ? all : args.length ? args : all.slice(-1);
  if (!files.length) throw new Error("No run logs in results/. Run the probes first.");
  const records = readRecords(files);
  const runs = records.filter((r): r is RunRecord => r.type === "run");
  const calls = records.filter((r): r is CallRecord => r.type === "call");

  const out: string[] = [`# Probe report`, ``, `Generated ${new Date().toISOString()} from ${files.length} log file(s).`];
  for (const key of unique(calls.map((c) => `${c.modelId}|${c.providerTag}`))) {
    const [modelId, providerTag] = key.split("|") as [string, string];
    const mine = calls.filter((c) => c.modelId === modelId && c.providerTag === providerTag);
    out.push(...modelReport(modelId, providerTag, mine, runs.filter((r) => r.modelId === modelId)));
  }

  const report = out.join("\n");
  const path = join(RESULTS_DIR, `report-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
  writeFileSync(path, `${report}\n`);
  console.log(report);
  console.log(`\nSaved to ${path}`);
}

function modelReport(modelId: string, providerTag: string, calls: CallRecord[], runs: RunRecord[]): string[] {
  const out: string[] = ["", `## ${modelId} via ${providerTag}`, ""];
  const ep = runs.at(-1)?.endpoint;
  if (ep) out.push(`- Endpoint: ${ep.providerName}, quantization **${ep.quantization}**`);
  out.push(`- Runs: ${runs.map((r) => `${r.runId} (git ${r.gitCommit ?? "?"})`).join(", ") || "none"}`);
  const versions = unique(runs.map((r) => JSON.stringify(r.docVersions)));
  out.push(`- Doc versions: ${versions.map(formatVersions).join("; ")}`);
  const served = unique(calls.filter((c) => !c.error).map((c) => c.provider ?? "(not reported)"));
  out.push(`- Served by: ${served.join(", ")}${served.length > 1 ? " — **more than one provider; pinning did not hold**" : ""}`);
  const errors = calls.filter((c) => c.error);
  if (errors.length) {
    out.push(`- API errors (excluded from rates): ${errors.length}`);
    for (const [msg, n] of tally(errors.map((c) => `${c.error!.status ?? ""} ${c.error!.message}`.trim()))) {
      out.push(`  - ${n}× ${msg}`);
    }
  }

  out.push(...preflightReport(calls.filter((c) => c.target === "preflight" && !c.error)));

  const scenarioCalls = calls.filter((c) => c.target !== "preflight" && !c.error);
  const scored = scenarioCalls.map((c) => ({ call: c, result: parseThink(c.raw!, c.expect) }));
  out.push(...gate1Report(scored));
  out.push(...gate2Report(scored));
  out.push(...costReport(calls.filter((c) => !c.error)));
  return out;
}

function preflightReport(calls: CallRecord[]): string[] {
  if (!calls.length) return [];
  const out = ["", "### Thinking-off pre-flight", ""];
  const off = calls.filter((c) => c.variant === "thinking-off");
  const leaked = off.filter((c) => c.usage!.reasoningTokens > 0 || c.reasoning);
  const reasoningTokens = off.reduce((s, c) => s + c.usage!.reasoningTokens, 0);
  out.push(
    `- Thinking off: ${off.length} calls, ${leaked.length} with reasoning (${reasoningTokens} reasoning tokens in total). ` +
      `**${leaked.length === 0 ? "PASS" : "FLAG: can't turn thinking off"}**`,
  );
  const control = calls.filter((c) => c.variant === "control-thinking-on");
  for (const c of control) {
    out.push(
      `- Control, thinking on: ${c.usage!.reasoningTokens} reasoning tokens` +
        (c.usage!.reasoningTokens > 0 ? " (the check can see reasoning)" : " — **zero, so the check proves nothing**"),
    );
  }
  out.push(`- Request fields: \`${JSON.stringify(off[0]?.requestExtra ?? {})}\``);
  return out;
}

interface Scored {
  call: CallRecord;
  result: ThinkParseResult;
}

function gate1Report(scored: Scored[]): string[] {
  if (!scored.length) return [];
  const out = [
    "",
    "### Gate 1: structured output",
    "",
    "*Gate 1 is judged over every think() from every scenario; this covers only the scenarios run so far.*",
    "",
    "Purpose rules: **original** = a purpose outside the three most urgent contacts is invalid; " +
      "**revised** = code keeps only the top three's purposes, extras are a warning. " +
      "Fenced = one ```json block and nothing else; counted valid.",
    "",
    "| Mode | Purpose rule | Calls | Valid | Syntax failures | Meaning failures | Fenced | Threshold | Result |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const mode of ["raw", "constrained"] as const) {
    const rows = scored.filter((s) => s.call.variant === mode);
    if (!rows.length) continue;
    const fenced = rows.filter((s) => s.result.fenced).length;
    for (const rule of PURPOSE_RULES) {
      const n = (v: string) => rows.filter((s) => s.result[rule].verdict === v).length;
      const valid = n("valid") / rows.length;
      out.push(
        `| ${mode} | ${rule} | ${rows.length} | ${pct(valid)} | ${n("syntax")} | ${n("meaning")} | ` +
          `${fenced} (${pct(fenced / rows.length)}) | ≥${pct(GATE1[mode])} | ` +
          `${valid >= GATE1[mode] ? "pass" : "**fail**"} |`,
      );
    }
  }

  for (const rule of PURPOSE_RULES) {
    const failures = scored.filter((s) => s.result[rule].verdict !== "valid");
    if (!failures.length) continue;
    out.push("", `Failure reasons, ${rule} rule (one output can have several):`, "");
    const reasons = failures.flatMap((s) =>
      s.result[rule].errors.map((e) => `${s.call.variant} · ${s.result[rule].verdict} · ${e}`),
    );
    for (const [reason, n] of tally(reasons).slice(0, 15)) out.push(`- ${n}× ${reason}`);
  }

  out.push("");
  for (const rule of PURPOSE_RULES) {
    const byCharacter = unique(scored.map((s) => s.call.character)).map((ch) => {
      const rows = scored.filter((s) => s.call.character === ch);
      return `${ch} ${pct(rows.filter((s) => s.result[rule].verdict === "valid").length / rows.length)} of ${rows.length}`;
    });
    out.push(`Valid by character, ${rule} rule: ${byCharacter.join("; ")}  `);
  }

  const warnings = tally(
    scored.flatMap((s) => s.result.revised.warnings.map((w) => w.replace(/^purpose for .* is/, "purpose is"))),
  );
  if (warnings.length) {
    out.push("", "Warnings (not validity failures):", "");
    for (const [w, n] of warnings) out.push(`- ${n}× ${w}`);
  }
  return out;
}

function gate2Report(scored: Scored[]): string[] {
  const parsed = scored.filter((s) => s.result.revised.value);
  if (!parsed.length) return [];
  const out = [
    "",
    "### Gate 2: importance scores (partial)",
    "",
    `*Pass needs S2: LeNoir's median in S2 ≥${GATE2.s2AboveS1Median} points above S1, and SD >${GATE2.minSd} across all scenarios. Baseline numbers only for now.*`,
    "",
    "| Scenario | Character | n | Median | Mean | SD | Min–max | " +
      IMPORTANCE_BANDS.map(([a, b]) => `${a}–${b}`).join(" | ") +
      " |",
    "|---|---|---|---|---|---|---|" + IMPORTANCE_BANDS.map(() => "---|").join(""),
  ];
  const groups = unique(parsed.map((s) => `${s.call.target}|${s.call.character}`));
  for (const g of [...groups, ...unique(parsed.map((s) => `${s.call.target}|all`))]) {
    const [target, character] = g.split("|") as [string, string];
    const xs = parsed
      .filter((s) => s.call.target === target && (character === "all" || s.call.character === character))
      .map((s) => s.result.revised.value!.importance);
    const bands = IMPORTANCE_BANDS.map(([a, b]) => xs.filter((x) => x >= a && x <= b).length);
    out.push(
      `| ${target} | ${character === "all" ? "**all**" : character} | ${xs.length} | ${median(xs)} | ` +
        `${mean(xs).toFixed(1)} | ${sd(xs).toFixed(1)} | ${Math.min(...xs)}–${Math.max(...xs)} | ${bands.join(" | ")} |`,
    );
  }
  return out;
}

function costReport(calls: CallRecord[]): string[] {
  if (!calls.length) return [];
  const out = [
    "",
    "### Cost, tokens, latency",
    "",
    "| Target | Variant | Calls | Mean in | Mean out | Reasoning tokens | Cost | Median latency | p95 latency |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const g of unique(calls.map((c) => `${c.target}|${c.variant}`))) {
    const [target, variant] = g.split("|") as [string, string];
    const rows = calls.filter((c) => c.target === target && c.variant === variant);
    const lat = rows.map((c) => c.latencyMs);
    out.push(
      `| ${target} | ${variant} | ${rows.length} | ${Math.round(mean(rows.map((c) => c.usage!.inputTokens)))} | ` +
        `${Math.round(mean(rows.map((c) => c.usage!.outputTokens)))} | ` +
        `${rows.reduce((s, c) => s + c.usage!.reasoningTokens, 0)} | ` +
        `$${rows.reduce((s, c) => s + c.costUsd, 0).toFixed(4)} | ${(median(lat) / 1000).toFixed(1)}s | ` +
        `${(quantile(lat, 0.95) / 1000).toFixed(1)}s |`,
    );
  }
  out.push("", `Total: $${calls.reduce((s, c) => s + c.costUsd, 0).toFixed(4)} over ${calls.length} calls.`);
  return out;
}

function formatVersions(json: string): string {
  const v = JSON.parse(json) as Record<string, string>;
  return `TD v${v.technicalDesign}, Characters v${v.characters}, Mechanics v${v.mechanics}`;
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

function tally(xs: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

function pct(x: number): string {
  return `${(x * 100).toFixed(x === 1 || x === 0 ? 0 : 1)}%`;
}

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

function sd(xs: number[]): number {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length);
}

function quantile(xs: number[], q: number): number {
  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * q;
  const lo = Math.floor(i);
  return s[lo]! + (s[Math.ceil(i)]! - s[lo]!) * (i - lo);
}

function median(xs: number[]): number {
  return quantile(xs, 0.5);
}

try {
  main();
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
}
