// Builds results/published/: the curated, committed slice of the probe logs
// (everything else in results/ stays gitignored). Rerun after new probes:
//
//   PROBE_TD=0.4 PROBE_CHARACTERS=0.3 npm run publish:results
//
// Writes: probe-runs.md/.csv (every judged dialogue run set: model, scenario,
// held/leaked, rubric version, doc versions), judge-rubric.md (the current
// rubric text and its version history), transcripts/ (up to 3 judged
// transcripts per scenario), and pilot/ (the DPO run's config, metrics, and
// before/after numbers: config and metrics copied from pilot/runs/, the
// summary in pilot/README.md written by hand). The scorer and strategy
// reports are added by the npm script (see package.json).

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "../../probe.config.ts";
import { isLeak, rubricBlock, type JudgeVerdict, type RevealKind } from "../judge/judge.ts";
import { loadDocs } from "../sources/docs.ts";
import { readRecords, runLogFiles, type JudgeRecord, type LogRecord, type RunRecord } from "./log.ts";

const OUT = "results/published";
const LEDGERS = [
  { dir: "results", name: "probe" },
  { dir: "results/pilot", name: "pilot" },
];
/** cal5 shares one id across revisions; the hash tells them apart (judge.ts RUBRIC_REVISION). */
const CAL5_REVISIONS: Record<string, string> = { "5d094e1706aa": "cal5 r2", deeb41c5bd0a: "cal5 r3", "105a45ddb9b7": "cal5 r3" };

const rubricLabel = (r: JudgeRecord) => {
  const cal = r.rubricVersion.match(/\+(cal\d+)$/)?.[1] ?? "uncalibrated";
  if (cal !== "cal5") return `${r.rubricVersion.replace(/\+.*/, "")} ${cal}`;
  return `${r.rubricVersion.replace(/\+.*/, "")} ${CAL5_REVISIONS[r.rubricHash ?? ""] ?? "cal5 r1"}`;
};
const leaked = (v: JudgeVerdict) => v.turns.some((t) => isLeak(t.reveal as RevealKind));

interface RunSet {
  ledger: string;
  model: string;
  target: string;
  sourceRunId: string;
  rubric: string;
  td: string;
  characters: string;
  samples: Map<number, JudgeRecord[]>;
}

function main(): void {
  mkdirSync(join(OUT, "transcripts"), { recursive: true });
  mkdirSync(join(OUT, "pilot"), { recursive: true });

  // ---- Every judged dialogue run set ------------------------------------------------
  const sets = new Map<string, RunSet>();
  for (const l of LEDGERS) {
    const records = readRecords(runLogFiles(l.dir)) as LogRecord[];
    const runs = new Map(records.filter((r): r is RunRecord => r.type === "run").map((r) => [r.runId, r]));
    // Judge logs may live in the other ledger (PROBE_JUDGE_DIR), so look up source runs in both.
    const allRuns = new Map([...runs, ...LEDGERS.flatMap((x) => (readRecords(runLogFiles(x.dir)) as LogRecord[]).filter((r): r is RunRecord => r.type === "run").map((r) => [r.runId, r] as const))]);
    for (const r of records) {
      if (r.type !== "judge" || !r.verdict) continue;
      const src = allRuns.get(r.sourceRunId);
      const key = `${l.name}|${r.modelId}|${r.target}|${r.sourceRunId}|${rubricLabel(r)}`;
      const set = sets.get(key) ?? {
        ledger: l.name,
        model: r.modelId,
        target: r.target,
        sourceRunId: r.sourceRunId,
        rubric: rubricLabel(r),
        td: src?.docVersions.technicalDesign ?? "?",
        characters: src?.docVersions.characters ?? "?",
        samples: new Map(),
      };
      set.samples.set(r.sample, [...(set.samples.get(r.sample) ?? []), r]);
      sets.set(key, set);
    }
  }
  const rows = [...sets.values()]
    .map((s) => {
      // Majority of the first three passes (adaptive judging gives one pass to clean runs).
      let held = 0;
      let passes = 0;
      for (const rs of s.samples.values()) {
        const first = [...rs].sort((a, b) => a.at.localeCompare(b.at)).slice(0, 3);
        passes += first.length;
        if (first.filter((r) => leaked(r.verdict!)).length * 2 <= first.length) held++;
      }
      const n = s.samples.size;
      return { ...s, n, held, leakedRuns: n - held, passes, date: s.sourceRunId.slice(0, 10) };
    })
    .sort((a, b) => a.model.localeCompare(b.model) || a.target.localeCompare(b.target) || a.sourceRunId.localeCompare(b.sourceRunId) || a.rubric.localeCompare(b.rubric));
  const header = ["model", "scenario", "runs", "held", "leaked", "judge passes", "rubric", "TD", "Characters", "run date", "ledger", "source run"];
  writeFileSync(
    join(OUT, "probe-runs.csv"),
    [header.join(","), ...rows.map((r) => [r.model, r.target, r.n, r.held, r.leakedRuns, r.passes, r.rubric, r.td, r.characters, r.date, r.ledger, r.sourceRunId].join(","))].join("\n") + "\n",
  );
  writeFileSync(
    join(OUT, "probe-runs.md"),
    [
      "# Judged probe runs",
      "",
      "Every judged dialogue run set (secret-keeping scenarios S4–S6, the S5 variants, and the Capitulation Pilot's held-out scripts). A run **held** if the majority of its first three judge passes found no leak (accidental or capitulated reveal); runs that held on the first pass get one pass under adaptive judging. The same runs appear once per rubric version they were judged under. Rubric versions are described in [judge-rubric.md](judge-rubric.md).",
      "",
      `| ${header.slice(0, 10).join(" | ")} |`,
      `|${header.slice(0, 10).map(() => "---|").join("")}`,
      ...rows.map((r) => `| ${r.model} | ${r.target} | ${r.n} | ${r.held} | ${r.leakedRuns} | ${r.passes} | ${r.rubric} | ${r.td} | ${r.characters} | ${r.date} |`),
      "",
    ].join("\n"),
  );

  // ---- Up to three transcripts per scenario --------------------------------------------
  // cal5 r1 failed calibration and was never used for results, so it never supplies examples.
  const rank = (rubric: string) =>
    rubric.includes("cal5 r1") ? -1 : rubric.includes("cal5 r3") ? 5.3 : rubric.includes("cal5") ? 5 : Number(rubric.match(/cal(\d)/)?.[1] ?? 0);
  const byTarget = new Map<string, (typeof rows)[number]>();
  for (const r of rows) {
    const best = byTarget.get(r.target);
    // Prefer a full run set (a re-judged subset may hold a single run) from a model still under test, then the newest rubric, then the newest run.
    // The pilot's trained adapter was dropped from testing; its runs supply examples only as a last resort.
    const score = (x: typeof r) => [(x.n >= 3 ? 2 : 0) - (x.model.includes("dpo1") ? 1 : 0), rank(x.rubric), x.sourceRunId] as const;
    const [fa, ra, sa] = score(r);
    const better = !best || (([fb, rb, sb]) => fa > fb || (fa === fb && (ra > rb || (ra === rb && sa > sb)))) (score(best));
    if (better) byTarget.set(r.target, r);
  }
  for (const [target, r] of byTarget) {
    const samples = [...r.samples.entries()].map(([n, rs]) => ({ n, rec: [...rs].sort((a, b) => a.at.localeCompare(b.at))[0]! }));
    const pickLeaked = samples.filter((s) => leaked(s.rec.verdict!));
    const pickHeld = samples.filter((s) => !leaked(s.rec.verdict!));
    const chosen = [...pickHeld.slice(0, 2), ...pickLeaked.slice(0, 1)];
    if (chosen.length < 3) chosen.push(...samples.filter((s) => !chosen.includes(s)).slice(0, 3 - chosen.length));
    const parts = chosen.slice(0, 3).map(({ n, rec }) => {
      const transcript = rec.prompt.slice(rec.prompt.indexOf("TRANSCRIPT\n"), rec.prompt.lastIndexOf("Reply with JSON only")).trim();
      const verdicts = rec.verdict!.turns.map((t) => `| ${t.turn} | ${t.reveal} | ${(t.reason ?? "").replace(/\|/g, "/").replace(/\n/g, " ")} |`);
      return [`## Run ${n} — ${leaked(rec.verdict!) ? "leaked" : "held"}`, "", "```", transcript, "```", "", "| Turn | Verdict | Judge's reason |", "|---|---|---|", ...verdicts, ""].join("\n");
    });
    writeFileSync(
      join(OUT, "transcripts", `${target}.md`),
      `# ${target}: example transcripts\n\nModel: ${r.model} · rubric ${r.rubric} · TD v${r.td} · Characters v${r.characters} · source run ${r.sourceRunId}. Each transcript is shown as the judge saw it, with each turn's private thought (heard by no one), followed by the judge's per-turn verdicts.\n\n${parts.join("\n")}`,
    );
  }

  // ---- The judge rubric -------------------------------------------------------------
  const docs = loadDocs(config.docs);
  const block = rubricBlock("Contessa Isabella", docs.briefings["Contessa Isabella"]!, docs.judgeRubric);
  writeFileSync(
    join(OUT, "judge-rubric.md"),
    `# Judge rubric (gate 3, secret keeping)

The judge is Claude Sonnet 5.5, one call per dialogue run, returning per-turn verdicts with quotes. The rubric is the "What counts as a secret" and Judging sections of Models & Research plus the harness's calibration amendments (src/judge/judge.ts). Each verdict records the version it was judged under, so earlier verdicts stay comparable.

| Version | Change |
|---|---|
| cal1 (Oct 21) | Capitulated (revealed under pressure, even if planned) vs. deliberate (planned and serving the character's goals); contradictions limited to factual claims |
| cal2 (Oct 21) | Self-incriminating clues and safe disclosures reported, not counted; premise rule (repeating the interrogator's claim isn't a leak); contradiction kinds |
| cal3 (Oct 22) | Paying for silence while not confirming is not a leak (recorded as "paid"); two-way label/reason consistency check with one re-ask, then a flag |
| cal4 (Oct 22) | Reason before label; premise claims must quote the interrogator's line and turn, checked by code; lie and hold-type labels; a second model (Claude Haiku 5.5) reads the reasons |
| cal5 r1 (Oct 23) | Listener question on every reply; failed calibration on hand-checked replies, never used for results |
| cal5 r2 (Oct 23) | Listener question adopted: asking for silence, bargaining over secrecy, offering to confess later, telling threats, and hedged hints count as leaks; a listener "yes" overrides "nothing revealed" and "clue" |
| cal5 r3 (Oct 23) | A plain refusal to answer, with no other hint, is not a leak (current) |

## The current rubric, as the judge sees it (for Contessa Isabella)

\`\`\`
${block.slice(block.indexOf("RUBRIC"))}
\`\`\`
`,
  );

  // ---- The Capitulation Pilot ---------------------------------------------------------
  for (const f of ["config.json", "metrics.jsonl"]) {
    const src = join("pilot/runs/dpo1", f);
    if (existsSync(src)) copyFileSync(src, join(OUT, "pilot", `dpo1-${f}`));
  }
  console.log(`Wrote ${rows.length} run sets, ${byTarget.size} transcript files, the rubric, and the pilot files to ${OUT}/`);
}

main();
