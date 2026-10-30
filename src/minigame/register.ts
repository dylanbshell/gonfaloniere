// TD v0.27's register check (Models & Research v0.45, Open Questions, "The register check"), new games
// against a baseline on the same seeds. No model calls. Writes, into --out:
//   - read.md: Dylan's blind read. Spoken lines drawn at random from each side, shuffled together and
//     numbered, then thoughts the same way. Only the text: no speaker, game, or version
//   - key.md: which side, game, line, and speaker each number is
//   - measures.md and measures.json: the code measures and guardrails below
//
//   npm run minigame:register -- --baseline <record> --baseline <record> --new <record> --new <record>
//
// Code measures: words per spoken line and per think() thought (mean, longest, over each side's limit),
// sentences per line, Flesch–Kincaid grade. Guardrails: the took and meant label mix (a label flags
// when its share both doubles or halves and moves 5 points or more), the secret spread from the
// runner's knowledge checks, and repairs and retries on think() and speak().

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { KNOWS_AT_START } from "./cast.ts";
import { readRecord } from "./view.ts";

export type Rec = {
  header: { game_id: string; seed: number; docs: { technicalDesign: string } };
  lines: { id: string; kind: string; speaker: string | null; text: string; meant?: string | null }[];
  thoughts: { id: string; character: string; call: string; text: string; took?: string | null; took_target?: string }[];
  calls: { kind: string; attempt: number; verdict: string; repairs: unknown[] }[];
  knowledge_checks: { character: string; fact: string; verdict: { verdict: string; told_by: string[] } | null }[];
  summary: { rate_limit_retries?: number; cost_usd: number };
};

export const LABELS = ["promise", "deal", "threat", "admission", "claim", "denial", "insult", "pressure", "none"] as const;

// ---- Text measures ------------------------------------------------------------------------------

export const words = (text: string): string[] => text.match(/[A-Za-z0-9]+(?:[-'’][A-Za-z0-9]+)*/g) ?? [];

/** Sentences with at least one word; a closing quote or bracket stays with its sentence. */
export function sentences(text: string): number {
  return Math.max(1, text.split(/(?<=[.!?…])["'”’)\]]*\s+/).filter((s) => words(s).length).length);
}

/** A common English syllable heuristic: vowel groups, less a silent final e. The same on both sides. */
export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, (m) => m[0]!).replace(/^y/, "");
  return Math.max(1, (w.match(/[aeiouy]{1,2}/g) ?? []).length);
}

/** Flesch–Kincaid grade over a set of texts, pooled. */
export function fkGrade(texts: string[]): number {
  let w = 0, s = 0, syl = 0;
  for (const t of texts) {
    const ws = words(t);
    if (!ws.length) continue;
    w += ws.length;
    s += sentences(t);
    syl += ws.reduce((n, x) => n + syllables(x), 0);
  }
  return w ? 0.39 * (w / s) + 11.8 * (syl / w) - 15.59 : 0;
}

export function textStats(texts: string[]) {
  const n = texts.map((t) => words(t).length);
  const s = texts.map(sentences);
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  return {
    count: texts.length,
    meanWords: mean(n),
    longest: Math.max(0, ...n),
    over40: n.filter((x) => x > 40).length,
    over60: n.filter((x) => x > 60).length,
    meanSentences: mean(s),
    mostSentences: Math.max(0, ...s),
    overThreeSentences: s.filter((x) => x > 3).length,
    fk: fkGrade(texts),
  };
}

// ---- Guardrails -----------------------------------------------------------------------------------

export function shares(values: (string | null | undefined)[]): Record<string, { n: number; pct: number }> {
  const total = values.length;
  return Object.fromEntries(LABELS.map((l) => {
    const n = values.filter((v) => v === l).length;
    return [l, { n, pct: total ? (100 * n) / total : 0 }];
  }));
}

/** A label flags when its share both doubles or halves and moves 5 points or more (zero to anything doubles). */
export function labelFlag(base: number, now: number): boolean {
  const ratio = base === 0 ? (now === 0 ? 1 : Infinity) : now / base;
  return (ratio >= 2 || ratio <= 0.5) && Math.abs(now - base) >= 5;
}

/**
 * Who learned a secret they didn't start with, from the runner's knowledge checks (F2–F5 × cast). The
 * checker's verdicts are told, conclusion, suspicion, and none (src/minigame/extract.ts).
 */
export function spread(recs: Rec[]) {
  const out = { checks: 0, told: 0, conclusion: 0, suspicion: 0, toldBy: 0 };
  for (const r of recs)
    for (const k of r.knowledge_checks) {
      if ((KNOWS_AT_START[k.fact] ?? []).includes(k.character as never)) continue;
      out.checks++;
      if (k.verdict?.verdict === "told") out.told++;
      if (k.verdict?.verdict === "conclusion") out.conclusion++;
      if (k.verdict?.verdict === "suspicion") out.suspicion++;
      if (k.verdict?.told_by?.length) out.toldBy++;
    }
  return out;
}

export function repairs(recs: Rec[], kind: "think" | "speak") {
  const calls = recs.flatMap((r) => r.calls.filter((c) => c.kind === kind));
  const firsts = calls.filter((c) => c.attempt === 1);
  return { calls: firsts.length, repaired: firsts.filter((c) => c.repairs.length).length, reasked: calls.filter((c) => c.attempt === 2).length, defaulted: calls.filter((c) => c.verdict === "default").length };
}

// ---- The blind read -----------------------------------------------------------------------------

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export type Item = { side: "baseline" | "new"; game: string; id: string; who: string; text: string };

export function draw(pool: Item[], n: number, rand: () => number): Item[] {
  if (pool.length < n) throw new Error(`only ${pool.length} to draw ${n} from`);
  return shuffle(pool, rand).slice(0, n);
}

// ---- Main -----------------------------------------------------------------------------------------

export const speech = (recs: Rec[], side: Item["side"]): Item[] => recs.flatMap((r) => r.lines.filter((l) => l.kind === "speech" && words(l.text).length).map((l) => ({ side, game: r.header.game_id, id: l.id, who: l.speaker ?? "", text: l.text.replace(/\s+/g, " ").trim() })));
export const thinks = (recs: Rec[], side: Item["side"]): Item[] => recs.flatMap((r) => r.thoughts.filter((t) => t.call === "think" && words(t.text).length).map((t) => ({ side, game: r.header.game_id, id: t.id, who: t.character, text: t.text.replace(/\s+/g, " ").trim() })));

/** One side's code measures and guardrail counts. */
export function measureSide(recs: Rec[], side: Item["side"]) {
  const labelled = recs.flatMap((r) => r.thoughts.filter((t) => t.call === "think" && t.took_target !== "none"));
  return {
    games: recs.map((r) => ({ id: r.header.game_id, seed: r.header.seed, td: r.header.docs.technicalDesign, costUsd: r.summary.cost_usd, rateLimitRetries: r.summary.rate_limit_retries ?? 0 })),
    lines: textStats(speech(recs, side).map((x) => x.text)),
    thoughts: textStats(thinks(recs, side).map((x) => x.text)),
    took: shares(labelled.map((t) => t.took)),
    tookCount: labelled.length,
    meant: shares(recs.flatMap((r) => r.lines.filter((l) => l.kind === "speech").map((l) => l.meant))),
    meantCount: recs.reduce((n, r) => n + r.lines.filter((l) => l.kind === "speech").length, 0),
    spread: spread(recs),
    think: repairs(recs, "think"),
    speak: repairs(recs, "speak"),
  };
}

export function registerCheck(baselinePaths: string[], newPaths: string[], seed: number) {
  const load = (ps: string[]) => ps.map((p) => readRecord(p) as unknown as Rec);
  const sides = { baseline: load(baselinePaths), new: load(newPaths) };
  const m = { baseline: measureSide(sides.baseline, "baseline"), new: measureSide(sides.new, "new") };
  const flags = {
    took: LABELS.filter((l) => labelFlag(m.baseline.took[l]!.pct, m.new.took[l]!.pct)),
    meant: LABELS.filter((l) => labelFlag(m.baseline.meant[l]!.pct, m.new.meant[l]!.pct)),
  };

  const rand = mulberry32(seed);
  const lines = shuffle([...draw(speech(sides.baseline, "baseline"), 15, rand), ...draw(speech(sides.new, "new"), 15, rand)], rand);
  const thoughts = shuffle([...draw(thinks(sides.baseline, "baseline"), 10, rand), ...draw(thinks(sides.new, "new"), 10, rand)], rand);
  return { measures: m, flags, read: { seed, lines, thoughts } };
}

function readMd(lines: Item[], thoughts: Item[]): string {
  const item = (x: Item, i: number) => `**${i + 1}.** ${x.text}\n\n- [ ] hard to follow\n`;
  return [
    "# The register check: blind read",
    "",
    "Mark each line you find hard to follow. The speaker, game, and version are left out on purpose; the key is in key.md beside this file, so read this first.",
    "",
    "## Spoken lines",
    "",
    lines.map(item).join("\n"),
    "## Thoughts",
    "",
    "Reported beside the lines, not part of the decision rule.",
    "",
    thoughts.map(item).join("\n"),
  ].join("\n");
}

function keyMd(r: ReturnType<typeof registerCheck>): string {
  const row = (x: Item, i: number) => `| ${i + 1} | ${x.side === "new" ? "**new (TD v0.27)**" : "baseline (TD v0.19)"} | ${x.game} | ${x.id} | ${x.who} |`;
  const head = "| # | Side | Game | Line | Speaker |\n|---|---|---|---|---|";
  const count = (xs: Item[]) => `${xs.filter((x) => x.side === "new").length} new, ${xs.filter((x) => x.side === "baseline").length} baseline`;
  return [
    "# The register check: answer key",
    "",
    `Drawn with seed ${r.read.seed} (\`npm run minigame:register\`). Baseline: ${r.measures.baseline.games.map((g) => `${g.id} (seed ${g.seed})`).join(", ")}. New: ${r.measures.new.games.map((g) => `${g.id} (seed ${g.seed})`).join(", ")}.`,
    "",
    "Decision rule (Models & Research v0.45): adopt if at least 5 fewer new lines are marked hard to follow than baseline lines, and no guardrail flags.",
    "",
    `## Spoken lines (${count(r.read.lines)})`,
    "",
    head,
    ...r.read.lines.map(row),
    "",
    `## Thoughts (${count(r.read.thoughts)})`,
    "",
    head.replace("Line", "Thought").replace("Speaker", "Character"),
    ...r.read.thoughts.map(row),
    "",
  ].join("\n");
}

function measuresMd(r: ReturnType<typeof registerCheck>): string {
  const { baseline: b, new: n } = r.measures;
  const f1 = (x: number) => x.toFixed(1);
  const text = (label: string, k: "lines" | "thoughts") => {
    const x = b[k], y = n[k];
    return [
      `| ${label} | Baseline (v0.19) | New (v0.27) |`,
      "|---|---|---|",
      `| Count | ${x.count} | ${y.count} |`,
      `| Words, mean | ${f1(x.meanWords)} | ${f1(y.meanWords)} |`,
      `| Words, longest | ${x.longest} | ${y.longest} |`,
      ...(k === "lines" ? [`| Over the limit (60 baseline, 40 new) | ${x.over60} | ${y.over40} |`, `| Over 40 words | ${x.over40} | ${y.over40} |`, `| Over 60 words | ${x.over60} | ${y.over60} |`] : []),
      `| Sentences, mean | ${x.meanSentences.toFixed(2)} | ${y.meanSentences.toFixed(2)} |`,
      `| Sentences, most | ${x.mostSentences} | ${y.mostSentences} |`,
      ...(k === "lines" ? [`| More than 3 sentences | ${x.overThreeSentences} | ${y.overThreeSentences} |`] : []),
      `| Flesch–Kincaid grade | ${f1(x.fk)} | ${f1(y.fk)} |`,
    ].join("\n");
  };
  const mix = (k: "took" | "meant") =>
    [
      `| ${k} | Baseline | New | Change | Flag |`,
      "|---|---|---|---|---|",
      ...LABELS.map((l) => {
        const x = b[k][l]!, y = n[k][l]!;
        return `| ${l} | ${f1(x.pct)}% (${x.n}) | ${f1(y.pct)}% (${y.n}) | ${y.pct - x.pct >= 0 ? "+" : ""}${f1(y.pct - x.pct)} | ${labelFlag(x.pct, y.pct) ? "**flag**" : ""} |`;
      }),
    ].join("\n");
  const rep = (k: "think" | "speak") => `| ${k}() | ${b[k].calls} / ${b[k].repaired} / ${b[k].reasked} / ${b[k].defaulted} | ${n[k].calls} / ${n[k].repaired} / ${n[k].reasked} / ${n[k].defaulted} |`;
  return [
    "# The register check: code measures and guardrails",
    "",
    text("Spoken lines", "lines"),
    "",
    text("Thoughts (think())", "thoughts"),
    "",
    `took, over ${b.tookCount} and ${n.tookCount} thoughts that were asked for a label:`,
    "",
    mix("took"),
    "",
    `meant, over ${b.meantCount} and ${n.meantCount} spoken lines:`,
    "",
    mix("meant"),
    "",
    "Secret spread (knowledge checks for secrets a character didn't start with):",
    "",
    "| | Baseline | New |",
    "|---|---|---|",
    `| Checks | ${b.spread.checks} | ${n.spread.checks} |`,
    `| told | ${b.spread.told} | ${n.spread.told} |`,
    `| conclusion | ${b.spread.conclusion} | ${n.spread.conclusion} |`,
    `| suspicion | ${b.spread.suspicion} | ${n.spread.suspicion} |`,
    `| told_by named | ${b.spread.toldBy} | ${n.spread.toldBy} |`,
    "",
    "Repairs (calls / repaired / re-asked / defaulted):",
    "",
    "| | Baseline | New |",
    "|---|---|---|",
    rep("think"),
    rep("speak"),
    `| Rate-limit retries (whole games) | ${b.games.reduce((s, g) => s + g.rateLimitRetries, 0)} | ${n.games.reduce((s, g) => s + g.rateLimitRetries, 0)} |`,
    "",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { baseline: { type: "string", multiple: true }, new: { type: "string", multiple: true }, seed: { type: "string", default: "20261028" }, out: { type: "string", default: "results/register-check" } } });
  if (!values.baseline?.length || !values.new?.length) {
    console.error("Usage: npm run minigame:register -- --baseline <record> [--baseline …] --new <record> [--new …] [--seed N] [--out dir]");
    process.exit(1);
  }
  const r = registerCheck(values.baseline, values.new, Number(values.seed));
  mkdirSync(values.out!, { recursive: true });
  writeFileSync(join(values.out!, "read.md"), readMd(r.read.lines, r.read.thoughts));
  writeFileSync(join(values.out!, "key.md"), keyMd(r));
  const md = measuresMd(r);
  writeFileSync(join(values.out!, "measures.md"), md);
  writeFileSync(join(values.out!, "measures.json"), JSON.stringify({ measures: r.measures, flags: r.flags }, null, 2));
  console.log(md);
  console.log(`Flags: took ${r.flags.took.join(", ") || "none"}; meant ${r.flags.meant.join(", ") || "none"}`);
  console.log(`Wrote read.md, key.md, measures.md, measures.json to ${values.out}`);
}
