// TD v0.29's voice check (Open Questions, "The voice check"), v0.29 games against the register check's
// v0.27 games on the same seeds (CC-20261029-01). No model calls. Writes:
//   - <read>: Dylan's blind read, published directly. 15 spoken lines drawn at random from each side,
//     shuffled together and numbered, text only, each with two boxes: hard to follow, and has real character
//   - <out>/key.md: which side, game, line, and speaker each number is (kept local until the read is done)
//   - <out>/measures.md and measures.json: the code measures and guardrails below
//
//   npm run minigame:voice -- --baseline <v0.27 record> --baseline … --new <v0.29 record> --new …
//     [--seed 20261029] [--out results/voice-check] [--read results/published/voice-check/read.md]
//
// Code measures: words per spoken line (mean, longest, over 40), sentences per line, Flesch–Kincaid grade
// for lines and thoughts, and a rough flourish rate (lines with "like a", "as a", or "as if"). Guardrails:
// a mean above 36 words per line, the register check's label-mix rule, the runner's knowledge checks, and
// repairs and retries on think() and speak().

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { draw, labelFlag, LABELS, measureSide, mulberry32, shuffle, speech, type Item, type Rec } from "./register.ts";
import { readRecord } from "./view.ts";

/** Simile or metaphor markers, as a rough flourish rate. */
export const FLOURISH = /\b(?:like a|as a|as if)\b/i;
export const MEAN_WORDS_FLAG = 36;
export const BOXES = ["hard to follow", "has real character (a line only this person would say)"];

export function voiceCheck(baselinePaths: string[], newPaths: string[], seed: number) {
  const load = (ps: string[]) => ps.map((p) => readRecord(p) as unknown as Rec);
  const sides = { baseline: load(baselinePaths), new: load(newPaths) };
  const flourish = (recs: Rec[], side: Item["side"]) => speech(recs, side).filter((x) => FLOURISH.test(x.text)).length;
  const m = {
    baseline: { ...measureSide(sides.baseline, "baseline"), flourish: flourish(sides.baseline, "baseline") },
    new: { ...measureSide(sides.new, "new"), flourish: flourish(sides.new, "new") },
  };
  const flags = {
    meanWords: m.new.lines.meanWords > MEAN_WORDS_FLAG,
    took: LABELS.filter((l) => labelFlag(m.baseline.took[l]!.pct, m.new.took[l]!.pct)),
    meant: LABELS.filter((l) => labelFlag(m.baseline.meant[l]!.pct, m.new.meant[l]!.pct)),
  };
  const rand = mulberry32(seed);
  const lines = shuffle([...draw(speech(sides.baseline, "baseline"), 15, rand), ...draw(speech(sides.new, "new"), 15, rand)], rand);
  return { measures: m, flags, read: { seed, lines }, tds: { baseline: sides.baseline[0]!.header.docs.technicalDesign, new: sides.new[0]!.header.docs.technicalDesign } };
}

type Result = ReturnType<typeof voiceCheck>;

export function readMd(lines: Item[]): string {
  const item = (x: Item, i: number) => `**${i + 1}.** ${x.text}\n\n${BOXES.map((b) => `- [ ] ${b}`).join("\n")}\n`;
  return [
    "# The voice check: blind read",
    "",
    "Mark each line you find hard to follow, and each line with real character: a line only this person would say. A line can get both marks, or neither. The speaker, game, and version are left out on purpose, and the key is kept apart until the read is done.",
    "",
    "## Spoken lines",
    "",
    lines.map(item).join("\n"),
  ].join("\n");
}

export function keyMd(r: Result): string {
  const tag = (x: Item) => (x.side === "new" ? `**new (TD v${r.tds.new})**` : `baseline (TD v${r.tds.baseline})`);
  const games = (k: "baseline" | "new") => r.measures[k].games.map((g) => `${g.id} (seed ${g.seed})`).join(", ");
  return [
    "# The voice check: answer key",
    "",
    `Drawn with seed ${r.read.seed} (\`npm run minigame:voice\`). Baseline: ${games("baseline")}. New: ${games("new")}.`,
    "",
    "Decision rule (TD v0.29, Open Questions): adopt v0.29 if it gets at least 3 more \"real character\" marks than v0.28, at most 2 more \"hard to follow\" marks, and no guardrail flags. Otherwise v0.28 stays.",
    "",
    `## Spoken lines (${r.read.lines.filter((x) => x.side === "new").length} new, ${r.read.lines.filter((x) => x.side === "baseline").length} baseline)`,
    "",
    "| # | Side | Game | Line | Speaker |",
    "|---|---|---|---|---|",
    ...r.read.lines.map((x, i) => `| ${i + 1} | ${tag(x)} | ${x.game} | ${x.id} | ${x.who} |`),
    "",
  ].join("\n");
}

export function measuresMd(r: Result): string {
  const { baseline: b, new: n } = r.measures;
  const B = `v${r.tds.baseline}`, N = `v${r.tds.new}`;
  const f1 = (x: number) => x.toFixed(1);
  const mix = (k: "took" | "meant") => [
    `| ${k} | ${B} | ${N} | Change | Flag |`,
    "|---|---|---|---|---|",
    ...LABELS.map((l) => {
      const x = b[k][l]!, y = n[k][l]!;
      return `| ${l} | ${f1(x.pct)}% (${x.n}) | ${f1(y.pct)}% (${y.n}) | ${y.pct - x.pct >= 0 ? "+" : ""}${f1(y.pct - x.pct)} | ${labelFlag(x.pct, y.pct) ? "**flag**" : ""} |`;
    }),
  ].join("\n");
  const rep = (k: "think" | "speak") => `| ${k}() | ${b[k].calls} / ${b[k].repaired} / ${b[k].reasked} / ${b[k].defaulted} | ${n[k].calls} / ${n[k].repaired} / ${n[k].reasked} / ${n[k].defaulted} |`;
  const pct = (x: number, of: number) => `${x} (${of ? f1((100 * x) / of) : "0.0"}%)`;
  return [
    "# The voice check: code measures and guardrails",
    "",
    `| Spoken lines | ${B} | ${N} |`,
    "|---|---|---|",
    `| Count | ${b.lines.count} | ${n.lines.count} |`,
    `| Words, mean | ${f1(b.lines.meanWords)} | ${f1(n.lines.meanWords)}${r.flags.meanWords ? " **flag** (above 36)" : ""} |`,
    `| Words, longest | ${b.lines.longest} | ${n.lines.longest} |`,
    `| Over 40 words | ${b.lines.over40} | ${n.lines.over40} |`,
    `| Sentences, mean | ${b.lines.meanSentences.toFixed(2)} | ${n.lines.meanSentences.toFixed(2)} |`,
    `| Sentences, most | ${b.lines.mostSentences} | ${n.lines.mostSentences} |`,
    `| More than 3 sentences | ${b.lines.overThreeSentences} | ${n.lines.overThreeSentences} |`,
    `| Flesch–Kincaid grade | ${f1(b.lines.fk)} | ${f1(n.lines.fk)} |`,
    `| Lines with "like a", "as a", or "as if" | ${pct(b.flourish, b.lines.count)} | ${pct(n.flourish, n.lines.count)} |`,
    "",
    `| Thoughts (think()) | ${B} | ${N} |`,
    "|---|---|---|",
    `| Count | ${b.thoughts.count} | ${n.thoughts.count} |`,
    `| Words, mean | ${f1(b.thoughts.meanWords)} | ${f1(n.thoughts.meanWords)} |`,
    `| Flesch–Kincaid grade | ${f1(b.thoughts.fk)} | ${f1(n.thoughts.fk)} |`,
    "",
    `took, over ${b.tookCount} and ${n.tookCount} thoughts that were asked for a label:`,
    "",
    mix("took"),
    "",
    `meant, over ${b.meantCount} and ${n.meantCount} spoken lines:`,
    "",
    mix("meant"),
    "",
    "Knowledge checks (secrets a character didn't start with):",
    "",
    `| | ${B} | ${N} |`,
    "|---|---|---|",
    `| Checks | ${b.spread.checks} | ${n.spread.checks} |`,
    `| told | ${b.spread.told} | ${n.spread.told} |`,
    `| conclusion | ${b.spread.conclusion} | ${n.spread.conclusion} |`,
    `| suspicion | ${b.spread.suspicion} | ${n.spread.suspicion} |`,
    `| told_by named | ${b.spread.toldBy} | ${n.spread.toldBy} |`,
    "",
    "Repairs (calls / repaired / re-asked / defaulted):",
    "",
    `| | ${B} | ${N} |`,
    "|---|---|---|",
    rep("think"),
    rep("speak"),
    `| Rate-limit retries (whole games) | ${b.games.reduce((s, g) => s + g.rateLimitRetries, 0)} | ${n.games.reduce((s, g) => s + g.rateLimitRetries, 0)} |`,
    "",
  ].join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { baseline: { type: "string", multiple: true }, new: { type: "string", multiple: true }, seed: { type: "string", default: "20261029" }, out: { type: "string", default: "results/voice-check" }, read: { type: "string", default: "results/published/voice-check/read.md" } } });
  if (!values.baseline?.length || !values.new?.length) {
    console.error("Usage: npm run minigame:voice -- --baseline <record> [--baseline …] --new <record> [--new …] [--seed N] [--out dir] [--read path]");
    process.exit(1);
  }
  const r = voiceCheck(values.baseline, values.new, Number(values.seed));
  mkdirSync(values.out!, { recursive: true });
  mkdirSync(dirname(values.read!), { recursive: true });
  writeFileSync(values.read!, readMd(r.read.lines));
  writeFileSync(join(values.out!, "key.md"), keyMd(r));
  const md = measuresMd(r);
  writeFileSync(join(values.out!, "measures.md"), md);
  writeFileSync(join(values.out!, "measures.json"), JSON.stringify({ measures: r.measures, flags: r.flags }, null, 2));
  console.log(md);
  console.log(`Flags: mean words ${r.flags.meanWords ? "FLAG" : "none"}; took ${r.flags.took.join(", ") || "none"}; meant ${r.flags.meant.join(", ") || "none"}`);
  console.log(`Wrote ${values.read}, and key.md, measures.md, measures.json to ${values.out}`);
}
