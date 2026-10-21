// Scores logged runs against the Capability Probe Plan's thresholds (Models &
// Research v0.8, "Scoring and pass thresholds"). Re-validates every raw output
// with the current parser, so a parser fix rescoring old logs needs no new calls.
//
//   npm run score                          each model's latest run of each target
//   npm run score -- --all                 every run in results/
//   npm run score -- results/<run>.jsonl   specific runs

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { SCORING_LEVELS, parseThink, type ScoringLevel, type ThinkParseResult } from "../output/think.ts";
import {
  RESULTS_DIR,
  readRecords,
  runLogFiles,
  type CallRecord,
  type LogRecord,
  type RunRecord,
  type ThinkCallRecord,
} from "./log.ts";
import { gate3Cell, gate4Cell, gate5Cell, gate5Report, judgedReport, judgedRuns, type JudgedRun } from "./score-judged.ts";
import { unbriefedGuests } from "./scenarios.ts";

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
  call: ThinkCallRecord;
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

  // Judge verdicts under the current rubric, for the probe runs kept above.
  const allRecords = explicit.length ? readRecords(runLogFiles()) : records;

  const groups = unique(calls.map((c) => c.modelId)).map((modelId) => {
    const mine = calls.filter((c) => c.modelId === modelId);
    const judged = judgedRuns(allRecords, modelId);
    const scored = mine
      .filter((c): c is ThinkCallRecord => c.callType === "think" && c.target !== "preflight" && !c.error)
      // Unbriefed guests are ignored in contact lists (Dylan, Oct 21); older logs predate the field.
      .map((c) => ({ call: c, result: parseThink(c.raw!, { ...c.expect, ignoreNames: unbriefedGuests(c.target) }) }));
    return { modelId, calls: mine, scored, judged, runs: runs.filter((r) => r.modelId === modelId) };
  });
  const scenarios = unique(groups.flatMap((g) => g.scored.map((s) => s.call.target))).sort();

  const out: string[] = [
    `# Probe report`,
    ``,
    `Generated ${new Date().toISOString()} from ${runs.length} run(s).`,
    ``,
    `## Summary`,
    ``,
    `**Gate 1 status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now (Dylan, Oct 21).`,
    ``,
    `Gate 1 valid rates as **strict / revised / repaired** (Models & Research v0.7, Scoring). ` +
      `Raw covers ${scenarios.join(", ")}; constrained ran in S1 only. Thresholds: raw ≥${pct(GATE1.raw)} at each level, ` +
      `constrained ≥${pct(GATE1.constrained)}. Bold = below threshold.`,
    ``,
    `"Top-3 without purpose" is the share of parsed raw outputs where a top-three contact by urgency has no purpose, which no repair can fix.`,
    ``,
    `Gates 3–5 come from judge verdicts (each run's newest calibrated rubric); gate 3 so far covers the judged scenarios only. ` +
      `"Clues" are self-incriminating clues: reported, not leaks.`,
    ``,
    `| Model | Endpoint | Thinking off | Raw valid | Top-3 without purpose | Constrained valid | Gate 2 | Gate 3 (so far) | Gate 4 contradictions | Gate 5 | Cost per call | Median latency |`,
    `|---|---|---|---|---|---|---|---|---|---|---|---|`,
    ...groups.map((g) => summaryRow(g.modelId, g.calls, g.scored, g.judged, g.runs, allRecords)),
  ];
  for (const g of groups) out.push(...modelReport(g.modelId, g.calls, g.scored, g.judged, g.runs, allRecords));

  const report = out.join("\n");
  const path = join(RESULTS_DIR, `report-${new Date().toISOString().replace(/[:.]/g, "-")}.md`);
  writeFileSync(path, `${report}\n`);
  console.log(report);
  console.log(`\nSaved to ${path}`);
}

function summaryRow(
  modelId: string,
  calls: CallRecord[],
  scored: Scored[],
  judged: JudgedRun[],
  runs: RunRecord[],
  records: LogRecord[],
): string {
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
    `| ${modelId} | ${ep ? `${ep.tag} (${ep.quantization})` : "?"} | ${thinking} | ${cell("raw")} | ` +
    `${topThreeRate(scored.filter((s) => s.call.variant === "raw"))} | ${cell("constrained")} | ` +
    `${gate2Verdict(scored).short} | ${gate3Cell(judged)} | ${gate4Cell(judged)} | ${gate5Cell(records, calls, modelId)} | $${costPerCall.toFixed(5)} | ${latency.toFixed(1)}s |`
  );
}

function modelReport(
  modelId: string,
  calls: CallRecord[],
  scored: Scored[],
  judged: JudgedRun[],
  runs: RunRecord[],
  records: LogRecord[],
): string[] {
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
  out.push(...gate7PreviewReport(scored));
  out.push(...judgedReport(judged, calls));
  out.push(...gate5Report(records, calls, modelId));
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
    "**Status: pending Technical Design's contact decision.** No model is eliminated on gate 1 for now.",
    "",
    "*Strict = the rule as written; revised = extra purposes dropped by code (warning); repaired = also fences stripped, " +
      "aliases and near-miss names matched, duplicate contacts dropped (higher urgency kept), missing contacts filled at urgency 0, " +
      "`done` ignored outside a Colloquio (and set to null there if missing). " +
      "Gate 1 is judged over every think() from every scenario.*",
    "",
    "| Scenario | Mode | Calls | Strict | Revised | Repaired | Top-3 without purpose | Syntax failures | Threshold |",
    "|---|---|---|---|---|---|---|---|---|",
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
      out.push(
        `| ${label} | ${mode} | ${rows.length} | ${cells.join(" | ")} | ${topThreeRate(rows)} | ${syntax} | ≥${pct(GATE1[mode])} |`,
      );
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
    const pairs = (xs: [string, string][]) => xs.map(([a, b]) => `"${a}" → "${b}"`);
    const aliases = tally(parsed.flatMap((s) => pairs(s.result.repairs!.aliasesMatched)));
    const matched = tally(parsed.flatMap((s) => pairs(s.result.repairs!.namesMatched)));
    const dupes = tally(parsed.flatMap((s) => s.result.repairs!.duplicatesDropped));
    const filled = tally(parsed.flatMap((s) => s.result.repairs!.contactsFilled));
    out.push(
      "",
      "Repairs applied at the repaired level (raw outputs):",
      "",
      `- Fence stripped: ${r((s) => +s.result.repairs!.fenceStripped)}`,
      `- Extra purposes dropped: ${r((s) => s.result.repairs!.purposesDropped)} (${total((s) => s.result.repairs!.purposesDropped)} purposes)`,
      `- Aliases matched: ${r((s) => s.result.repairs!.aliasesMatched.length)}` +
        (aliases.length ? ` — ${aliases.map(([m, n]) => `${n}× ${m}`).join(", ")}` : ""),
      `- Near-miss names matched: ${r((s) => s.result.repairs!.namesMatched.length)}` +
        (matched.length ? ` — ${matched.map(([m, n]) => `${n}× ${m}`).join(", ")}` : ""),
      `- Duplicate contacts dropped: ${r((s) => s.result.repairs!.duplicatesDropped.length)}` +
        (dupes.length ? ` — ${dupes.map(([m, n]) => `${m} ${n}×`).join(", ")}` : ""),
      `- Missing contacts filled: ${r((s) => s.result.repairs!.contactsFilled.length)} (${total((s) => s.result.repairs!.contactsFilled.length)} names)` +
        (filled.length ? ` — most often ${filled.slice(0, 4).map(([m, n]) => `${m} ${n}×`).join(", ")}` : ""),
      `- \`done\` ignored outside a Colloquio: ${r((s) => +s.result.repairs!.doneIgnored)}`,
      `- Missing \`done\` set to null outside a Colloquio: ${r((s) => +s.result.repairs!.doneFilled)}`,
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

/** S3: does `done` fire once the deal is struck? (Gate 7 preview; reported, not gated.) */
function gate7PreviewReport(scored: Scored[]): string[] {
  const s3 = scored.filter((s) => s.call.target === "S3" && s.result.strict.value);
  if (!s3.length) return [];
  const out = ["", "### Gate 7 preview: `done` after a deal (S3)", "", "| Character | n | done true | done false | done null or missing |", "|---|---|---|---|---|"];
  for (const character of unique(s3.map((s) => s.call.character))) {
    const rows = s3.filter((s) => s.call.character === character).map((s) => s.result.strict.value!.done);
    const n = (pred: (d: boolean | null | undefined) => boolean) => rows.filter(pred).length;
    // Lupo's plot point needs 5 Florins and he's been paid 3, so he has reason
    // to continue: the preview counts Isabella only (Models & Research v0.8).
    const label = character === "Contessa Isabella" ? "**Contessa Isabella** (counted)" : `${character} (not counted: scenario flaw)`;
    out.push(
      `| ${label} | ${rows.length} | ${pct(n((d) => d === true) / rows.length)} | ` +
        `${n((d) => d === false)} | ${n((d) => d === null || d === undefined)} |`,
    );
  }
  out.push("", "*Outputs that failed to parse at all are left out.*");
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

/** Share of parsed outputs with a top-three contact lacking a purpose (after repairs). */
function topThreeRate(rows: Scored[]): string {
  const parsed = rows.filter((s) => s.result.topThreeWithoutPurpose !== null);
  if (!parsed.length) return "–";
  const n = parsed.filter((s) => s.result.topThreeWithoutPurpose).length;
  return `${pct(n / parsed.length)} (${n}/${parsed.length})`;
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
