// Scores logged runs against the Capability Probe Plan's thresholds (Models &
// Research v0.7, "Scoring and pass thresholds"). Re-validates every raw output
// with the current parser, so a parser fix rescoring old logs needs no new calls.
//
//   npm run score                          each model's latest run of each target
//   npm run score -- --all                 every run in results/
//   npm run score -- results/<run>.jsonl   specific runs

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { SCORING_LEVELS, parseThink, type ScoringLevel, type ThinkParseResult } from "../output/think.ts";
import { RESULTS_DIR, readRecords, runLogFiles, type CallRecord, type RunRecord } from "./log.ts";

// Set before running so results can't move the goalposts. The raw bar applies
// at every scoring level; constrained decoding ran in S1 only.
const GATE1 = { raw: 0.95, constrained: 0.99 };
const GATE2 = { character: "Captain Armand LeNoir", s2AboveS1Median: 30, minSd: 10 };

const IMPORTANCE_BANDS = [
  [0, 20],
  [21, 40],
  [41, 60],
  [61, 80],
  [81, 100],
] as const;

interface Scored {
  call: CallRecord;
  result: ThinkParseResult;
}

function main(): void {
  const args = process.argv.slice(2);
  const explicit = args.filter((a) => a !== "--all");
  const files = explicit.length ? explicit : runLogFiles();
  if (!files.length) throw new Error("No run logs in results/. Run the probes first.");
  const records = readRecords(files);
  let calls = records.filter((r): r is CallRecord => r.type === "call");

  // By default, each model's latest run of each target (pre-flight, S1, S2…).
  if (!explicit.length && !args.includes("--all")) {
    const latest = new Map<string, string>();
    for (const c of calls) latest.set(`${c.modelId}|${c.target}`, c.runId);
    calls = calls.filter((c) => latest.get(`${c.modelId}|${c.target}`) === c.runId);
  }
  const runIds = new Set(calls.map((c) => c.runId));
  const runs = records.filter((r): r is RunRecord => r.type === "run" && runIds.has(r.runId));

  const groups = unique(calls.map((c) => c.modelId)).map((modelId) => {
    const mine = calls.filter((c) => c.modelId === modelId);
    const scored = mine
      .filter((c) => c.target !== "preflight" && !c.error)
      .map((c) => ({ call: c, result: parseThink(c.raw!, c.expect) }));
    return { modelId, calls: mine, scored, runs: runs.filter((r) => r.modelId === modelId) };
  });
  const scenarios = unique(groups.flatMap((g) => g.scored.map((s) => s.call.target))).sort();

  const out: string[] = [
    `# Probe report`,
    ``,
    `Generated ${new Date().toISOString()} from ${runs.length} run(s).`,
    ``,
    `## Summary`,
    ``,
    `Gate 1 valid rates as **strict / revised / repaired** (Models & Research v0.7, Scoring). ` +
      `Raw covers ${scenarios.join(", ")}; constrained ran in S1 only. Thresholds: raw ≥${pct(GATE1.raw)} at each level, ` +
      `constrained ≥${pct(GATE1.constrained)}. Bold = below threshold.`,
    ``,
    `| Model | Endpoint | Thinking off | Raw valid | Constrained valid | Gate 2 | Cost per call | Median latency |`,
    `|---|---|---|---|---|---|---|---|`,
    ...groups.map((g) => summaryRow(g.modelId, g.calls, g.scored, g.runs)),
  ];
  for (const g of groups) out.push(...modelReport(g.modelId, g.calls, g.scored, g.runs));

  const report = out.join("\n");
  const path = join(RESULTS_DIR, `report-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
  writeFileSync(path, `${report}\n`);
  console.log(report);
  console.log(`\nSaved to ${path}`);
}

function summaryRow(modelId: string, calls: CallRecord[], scored: Scored[], runs: RunRecord[]): string {
  const ep = runs.at(-1)?.endpoint;
  const off = calls.filter((c) => !c.error && c.target === "preflight" && c.variant === "thinking-off");
  const leaked = off.filter((c) => c.usage!.reasoningTokens > 0 || c.reasoning).length;
  const thinking = !off.length ? "not run" : leaked ? `**FLAG** (${leaked}/${off.length})` : `pass (${off.length}/${off.length})`;

  const cell = (mode: "raw" | "constrained") => {
    const rows = scored.filter((s) => s.call.variant === mode);
    if (!rows.length) return "–";
    return SCORING_LEVELS.map((level) => {
      const rate = validRate(rows, level);
      return rate >= GATE1[mode] ? pct(rate) : `**${pct(rate)}**`;
    }).join(" / ");
  };

  const scenarioCalls = calls.filter((c) => c.target !== "preflight" && !c.error);
  const costPerCall = scenarioCalls.reduce((t, c) => t + c.costUsd, 0) / scenarioCalls.length;
  const latency = median(scenarioCalls.map((c) => c.latencyMs)) / 1000;
  return (
    `| ${modelId} | ${ep ? `${ep.tag} (${ep.quantization})` : "?"} | ${thinking} | ${cell("raw")} | ${cell("constrained")} | ` +
    `${gate2Verdict(scored).short} | $${costPerCall.toFixed(5)} | ${latency.toFixed(1)}s |`
  );
}

function modelReport(modelId: string, calls: CallRecord[], scored: Scored[], runs: RunRecord[]): string[] {
  const out: string[] = ["", `## ${modelId}`, ""];
  const run = runs.at(-1);
  if (run) {
    out.push(`- Model: \`${run.modelSlug}\`, endpoint ${run.endpoint.tag} (${run.endpoint.providerName}, ${run.endpoint.quantization})`);
  }
  out.push(`- Runs: ${runs.map((r) => `${r.runId} [${r.targets.join(", ")}] (git ${r.gitCommit ?? "?"})`).join(", ")}`);
  out.push(`- Doc versions: ${unique(runs.map((r) => formatVersions(r.docVersions))).join("; ")}`);
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
  if (!control.length) out.push("- Control, thinking on: skipped (no thinking mode)");
  for (const c of control) {
    out.push(
      `- Control, thinking on: ${c.usage!.reasoningTokens} reasoning tokens` +
        (c.usage!.reasoningTokens > 0 ? " (the check can see reasoning)" : " — **zero, so the check proves nothing**"),
    );
  }
  out.push(`- Request fields: \`${JSON.stringify(off[0]?.requestExtra ?? {})}\``);
  return out;
}

function gate1Report(scored: Scored[]): string[] {
  if (!scored.length) return [];
  const out = [
    "",
    "### Gate 1: structured output",
    "",
    "*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, " +
      "near-miss names matched, missing contacts filled at urgency 0, `done` ignored outside a Colloquio. " +
      "Gate 1 is judged over every think() from every scenario.*",
    "",
    "| Scenario | Mode | Calls | Strict | Revised | Repaired | Syntax failures | Threshold |",
    "|---|---|---|---|---|---|---|---|",
  ];
  const scenarios = unique(scored.map((s) => s.call.target)).sort();
  for (const mode of ["raw", "constrained"] as const) {
    const byMode = scored.filter((s) => s.call.variant === mode);
    const rowsFor = [...scenarios.map((t) => [t, byMode.filter((s) => s.call.target === t)] as const)];
    if (mode === "raw" && scenarios.length > 1) rowsFor.push(["**all**", byMode]);
    for (const [label, rows] of rowsFor) {
      if (!rows.length) continue;
      const cells = SCORING_LEVELS.map((l) => {
        const r = validRate(rows, l);
        return r >= GATE1[mode] ? pct(r) : `**${pct(r)}**`;
      });
      const syntax = rows.filter((s) => s.result.strict.verdict === "syntax").length;
      out.push(`| ${label} | ${mode} | ${rows.length} | ${cells.join(" | ")} | ${syntax} | ≥${pct(GATE1[mode])} |`);
    }
  }

  const raw = scored.filter((s) => s.call.variant === "raw");
  if (raw.length) {
    const parsed = raw.filter((s) => s.result.repairs);
    const r = (pick: (s: Scored) => number) => {
      const hits = parsed.filter((s) => pick(s) > 0);
      return `${hits.length} of ${raw.length} outputs`;
    };
    const total = (pick: (s: Scored) => number) => parsed.reduce((t, s) => t + pick(s), 0);
    const matched = tally(parsed.flatMap((s) => s.result.repairs!.namesMatched.map(([a, b]) => `"${a}" → "${b}"`)));
    const filled = tally(parsed.flatMap((s) => s.result.repairs!.contactsFilled));
    out.push(
      "",
      "Repairs applied at the repaired level (raw outputs):",
      "",
      `- Fence stripped: ${r((s) => +s.result.repairs!.fenceStripped)}`,
      `- Extra purposes dropped: ${r((s) => s.result.repairs!.purposesDropped)} (${total((s) => s.result.repairs!.purposesDropped)} purposes)`,
      `- Near-miss names matched: ${r((s) => s.result.repairs!.namesMatched.length)}` +
        (matched.length ? ` — ${matched.map(([m, n]) => `${n}× ${m}`).join(", ")}` : ""),
      `- Missing contacts filled: ${r((s) => s.result.repairs!.contactsFilled.length)} (${total((s) => s.result.repairs!.contactsFilled.length)} names)` +
        (filled.length ? ` — most often ${filled.slice(0, 4).map(([m, n]) => `${m} ${n}×`).join(", ")}` : ""),
      `- \`done\` ignored outside a Colloquio: ${r((s) => +s.result.repairs!.doneIgnored)}`,
    );
  }

  for (const level of SCORING_LEVELS) {
    const failures = scored.filter((s) => s.result[level].verdict !== "valid");
    if (!failures.length) continue;
    out.push("", `Failure reasons, ${level} (one output can have several):`, "");
    const reasons = failures.flatMap((s) =>
      s.result[level].errors.map((e) => `${s.call.target} ${s.call.variant} · ${s.result[level].verdict} · ${e}`),
    );
    for (const [reason, n] of tally(reasons).slice(0, 10)) out.push(`- ${n}× ${reason}`);
  }

  const long = scored.filter((s) => s.result.strict.warnings.some((w) => w.includes("over six words"))).length;
  if (long) out.push("", `Outputs with a purpose over six words (not a validity failure): ${long}`);
  return out;
}

function gate2Verdict(scored: Scored[]): { short: string; detail: string[] } {
  const raw = scored.filter((s) => s.call.variant === "raw" && s.result.repaired.value);
  const importance = (target: string) =>
    raw
      .filter((s) => s.call.target === target && s.call.character === GATE2.character)
      .map((s) => s.result.repaired.value!.importance);
  const [s1, s2] = [importance("S1"), importance("S2")];
  const all = raw.map((s) => s.result.repaired.value!.importance);
  if (!s1.length || !s2.length) return { short: "needs S1 and S2", detail: [] };
  const delta = median(s2) - median(s1);
  const spread = sd(all);
  const pass = delta >= GATE2.s2AboveS1Median && spread > GATE2.minSd;
  return {
    short: `${pass ? "pass" : "**fail**"} (Δ${delta >= 0 ? "+" : ""}${delta}, SD ${spread.toFixed(1)})`,
    detail: [
      `- LeNoir's median importance: S1 ${median(s1)}, S2 ${median(s2)}; difference ${delta} (needs ≥${GATE2.s2AboveS1Median}): **${delta >= GATE2.s2AboveS1Median ? "pass" : "fail"}**`,
      `- SD of all raw importance scores across scenarios: ${spread.toFixed(1)} (needs >${GATE2.minSd}): **${spread > GATE2.minSd ? "pass" : "fail"}**`,
      `- Gate 2: **${pass ? "PASS" : "FAIL"}**`,
    ],
  };
}

function gate2Report(scored: Scored[]): string[] {
  const parsed = scored.filter((s) => s.call.variant === "raw" && s.result.repaired.value);
  if (!parsed.length) return [];
  const out = [
    "",
    "### Gate 2: importance scores",
    "",
    "*Raw outputs, at the repaired level (repairs don't change importance; they only let more outputs count).*",
    "",
    ...gate2Verdict(scored).detail,
    "",
    "| Scenario | Character | n | Median | Mean | SD | Min–max | " + IMPORTANCE_BANDS.map(([a, b]) => `${a}–${b}`).join(" | ") + " |",
    "|---|---|---|---|---|---|---|" + IMPORTANCE_BANDS.map(() => "---|").join(""),
  ];
  for (const target of unique(parsed.map((s) => s.call.target)).sort()) {
    const inTarget = parsed.filter((s) => s.call.target === target);
    for (const character of [...unique(inTarget.map((s) => s.call.character)), "all"]) {
      const xs = inTarget
        .filter((s) => character === "all" || s.call.character === character)
        .map((s) => s.result.repaired.value!.importance);
      const bands = IMPORTANCE_BANDS.map(([a, b]) => xs.filter((x) => x >= a && x <= b).length);
      out.push(
        `| ${target} | ${character === "all" ? "**all**" : character} | ${xs.length} | ${median(xs)} | ` +
          `${mean(xs).toFixed(1)} | ${sd(xs).toFixed(1)} | ${Math.min(...xs)}–${Math.max(...xs)} | ${bands.join(" | ")} |`,
      );
    }
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

function validRate(rows: Scored[], level: ScoringLevel): number {
  return rows.filter((s) => s.result[level].verdict === "valid").length / rows.length;
}

function formatVersions(v: RunRecord["docVersions"]): string {
  const mr = v.modelsResearch ? `, Models & Research v${v.modelsResearch}` : "";
  return `TD v${v.technicalDesign}, Characters v${v.characters}, Mechanics v${v.mechanics}${mr}`;
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
