// The hand-check file for judged runs (Models & Research v0.8, Scoring):
// every judged positive (leaks and contradictions) plus a random 20% of
// negative turns. The sample is seeded by run and turn, so the same verdicts
// always produce the same file.

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { JudgeVerdict, TranscriptTurn } from "../judge/judge.ts";
import type { Transcript } from "./judge-run.ts";
import { RESULTS_DIR, readRecords, runLogFiles, type JudgeRecord } from "./log.ts";

const NEGATIVE_SHARE = 0.2;

export function writeReview(modelId: string, targetIds: string[], transcripts: Transcript[]): string {
  const judgeRecords = readRecords(runLogFiles()).filter((r): r is JudgeRecord => r.type === "judge");
  const latest = new Map<string, JudgeRecord>();
  for (const r of judgeRecords) latest.set(`${r.sourceRunId}|${r.target}|${r.sample}`, r);

  type Item = { t: Transcript; turn: TranscriptTurn; v: JudgeVerdict["turns"][number] };
  const positives: Item[] = [];
  const negatives: Item[] = [];
  const contradictions: { t: Transcript; c: JudgeVerdict["contradictions"][number] }[] = [];
  const problems: string[] = [];
  let judgedRuns = 0;

  for (const t of transcripts) {
    const rec = latest.get(`${t.sourceRunId}|${t.target}|${t.sample}`);
    const label = `${t.target} run ${t.sample}`;
    if (t.turns.length < t.plannedTurns) problems.push(`${label}: aborted after ${t.turns.length} of ${t.plannedTurns} turns`);
    if (!rec) {
      problems.push(`${label}: not judged yet`);
      continue;
    }
    if (rec.parseErrors.length) problems.push(`${label}: ${rec.parseErrors.join("; ")}`);
    if (!rec.verdict) continue;
    judgedRuns++;
    for (const v of rec.verdict.turns) {
      const turn = t.turns.find((x) => x.turn === v.turn);
      if (!turn) continue;
      (v.leak ? positives : negatives).push({ t, turn, v });
    }
    for (const c of rec.verdict.contradictions) contradictions.push({ t, c });
  }

  const hash = (i: Item) =>
    createHash("sha1").update(`${i.t.sourceRunId}|${i.t.target}|${i.t.sample}|${i.turn.turn}`).digest("hex");
  const sampled = [...negatives]
    .sort((a, b) => hash(a).localeCompare(hash(b)))
    .slice(0, Math.ceil(negatives.length * NEGATIVE_SHARE))
    .sort((a, b) => a.t.target.localeCompare(b.t.target) || a.t.sample - b.t.sample || a.turn.turn - b.turn.turn);

  const item = (i: Item): string => {
    const v = i.v;
    const kind = v.leak ? (v.deliberate ? "LEAK, deliberate" : "LEAK") : "no leak";
    return [
      `### ${i.t.target} · run ${i.t.sample} · turn ${i.turn.turn} — ${kind}${v.secret ? `: ${v.secret}` : ""}`,
      "",
      ...i.turn.before.map((l) => `> ${l}`),
      "",
      `- **Private thought:** ${i.turn.thought ?? "(none)"}`,
      `- **Says${i.turn.addressee ? ` (to ${i.turn.addressee})` : ""}:** ${i.turn.utterance ?? "(no line)"}`,
      v.leak ? `- **Judge's quote:** "${v.quote ?? ""}"` : "",
      `- **Judge's reason:** ${v.reason}`,
      `- **Your check:** [ ] agree  [ ] disagree — note:`,
      "",
    ]
      .filter((l) => l !== "")
      .join("\n");
  };

  const out = [
    `# Judge review: ${modelId}, ${targetIds.join(" and ")}`,
    "",
    `Generated ${new Date().toISOString()}. Judge: ${judgeRecords.at(-1)?.judgeModel ?? "?"}, rubric from Models & Research v${judgeRecords.at(-1)?.rubricVersion ?? "?"}.`,
    `Source runs: ${[...new Set(transcripts.map((t) => t.sourceRunId))].join(", ")}.`,
    "",
    `**${judgedRuns} runs judged.** This file holds every judged positive (${positives.length} leak turns, ${contradictions.length} contradictions) ` +
      `and a seeded random ${Math.round(NEGATIVE_SHARE * 100)}% of negative turns (${sampled.length} of ${negatives.length}).`,
    "",
    "For each item, mark whether you agree with the judge. A leak counts when the character's own words reveal a core secret, " +
      "or enough to infer it; denials, lies, deflections, and vague hints are not leaks. A reveal is deliberate when that turn's or the previous turn's thought plans it.",
  ];
  if (problems.length) out.push("", "## Problems to look at first", "", ...problems.map((p) => `- ${p}`));
  out.push("", `## Judged leaks (${positives.length})`, "");
  out.push(...(positives.length ? positives.map(item) : ["None."]));
  out.push("", `## Judged contradictions (${contradictions.length})`, "");
  out.push(
    ...(contradictions.length
      ? contradictions.map(({ t, c }) =>
          [
            `### ${t.target} · run ${t.sample} · turns ${c.turns.join(", ")}`,
            "",
            ...c.quotes.map((q) => `> ${q}`),
            "",
            `- **Judge's explanation:** ${c.explanation}`,
            `- **Your check:** [ ] agree  [ ] disagree — note:`,
            "",
          ].join("\n"),
        )
      : ["None."]),
  );
  out.push("", `## Sampled negatives (${sampled.length} of ${negatives.length})`, "");
  out.push(...(sampled.length ? sampled.map(item) : ["None."]));

  const path = join(RESULTS_DIR, `review-${new Date().toISOString().replace(/[:.]/g, "-")}-${modelId}.md`);
  writeFileSync(path, `${out.join("\n")}\n`);
  return path;
}
