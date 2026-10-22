// Hand-check files for judged runs (Models & Research v0.8, Scoring): every
// judged positive plus a random 20% of negatives. Samples are seeded by run
// and turn, so the same verdicts always produce the same file.

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { FACTUAL_CONTRADICTIONS, reasonContradictsVerdict, type JudgeVerdict, type TranscriptTurn } from "../judge/judge.ts";
import {
  RESULTS_DIR,
  readRecords,
  runLogFiles,
  type ContradictionKindsRecord,
  type InferenceRecord,
  type LogRecord,
  type ThinkCallRecord,
} from "./log.ts";
import { formatHistoryLine } from "../prompt/assemble.ts";
import { DIALOGUES, INFERENCE } from "./scenarios.ts";
import type { DialogueScenario } from "./scenario.ts";
import { allVerdicts, buildTranscripts, calibrationLevel, latestVerdicts, type Transcript } from "./transcripts.ts";

const NEGATIVE_SHARE = 0.2;

const REVEAL_LABEL = {
  none: "nothing revealed",
  accidental: "LEAK",
  capitulated: "LEAK, capitulated",
  deliberate: "deliberate reveal (not a leak)",
  self_incriminating_clue: "self-incriminating clue (not a leak)",
} as const;

const seeded = (key: string) => createHash("sha1").update(key).digest("hex");

/** Seeded 20% of the negatives, back in their original order. */
function sample<T>(items: T[], key: (t: T) => string): T[] {
  const keep = new Set(
    [...items].sort((a, b) => seeded(key(a)).localeCompare(seeded(key(b)))).slice(0, Math.ceil(items.length * NEGATIVE_SHARE)),
  );
  return items.filter((i) => keep.has(i));
}

/**
 * Each contradiction's kind: from the verdict itself (rubric cal2 on), or
 * from a later classification pass (cal1 verdicts). Undefined if neither.
 */
export function contradictionKind(
  records: LogRecord[],
  sourceRunId: string,
  sample: number,
  rubricVersion: string,
  position: number,
  c: JudgeVerdict["contradictions"][number],
): string | undefined {
  if ("kind" in c && c.kind) return c.kind;
  for (const r of records) {
    if (r.type !== "contradiction_kinds" || r.rubricVersion !== rubricVersion) continue;
    const hit = (r as ContradictionKindsRecord).items.find(
      (i) => i.sourceRunId === sourceRunId && i.sample === sample && i.position === position,
    );
    if (hit) return hit.kind;
  }
  return undefined;
}

export function writeReview(modelId: string, targetIds: string[], transcripts: Transcript[], currentRubric: string): string {
  const records = readRecords(runLogFiles());

  type Item = { t: Transcript; turn: TranscriptTurn; v: JudgeVerdict["turns"][number]; rubric: string };
  const positives: Item[] = [];
  const negatives: Item[] = [];
  const contradictions: { t: Transcript; c: JudgeVerdict["contradictions"][number]; kind: string | undefined }[] = [];
  const problems: string[] = [];
  const rubrics = new Set<string>();
  let judgedRuns = 0;

  for (const target of [...new Set(transcripts.map((t) => t.target))]) {
    const scenario = Object.values(DIALOGUES).find((d) => d.id === target)!;
    const verdicts = latestVerdicts(records, modelId, scenario);
    for (const t of transcripts.filter((x) => x.target === target)) {
      const label = `${t.target} run ${t.sample}`;
      if (t.turns.length < t.plannedTurns) problems.push(`${label}: aborted after ${t.turns.length} of ${t.plannedTurns} turns`);
      const rv = verdicts.find((v) => v.sourceRunId === t.sourceRunId && v.sample === t.sample);
      if (!rv) {
        problems.push(`${label}: not judged`);
        continue;
      }
      rubrics.add(rv.rubricVersion);
      // Reason-vs-verdict flags are recomputed per item below, so stored ones are skipped here.
      const stored = rv.parseErrors.filter((e) => !e.includes("but the reason says otherwise"));
      if (stored.length) problems.push(`${label}: ${stored.join("; ")}`);
      judgedRuns++;
      for (const v of rv.verdict.turns) {
        const turn = t.turns.find((x) => x.turn === v.turn);
        if (turn) (v.reveal === "none" ? negatives : positives).push({ t, turn, v, rubric: rv.rubricVersion });
      }
      rv.verdict.contradictions.forEach((c, position) =>
        contradictions.push({ t, c, kind: contradictionKind(records, t.sourceRunId, t.sample, rv.rubricVersion, position, c) }),
      );
    }
  }

  const sampled = sample(negatives, (i) => `${i.t.sourceRunId}|${i.t.target}|${i.t.sample}|${i.turn.turn}`);
  const item = (i: Item): string => {
    const v = i.v;
    const mismatch = reasonContradictsVerdict(v.reveal, v.reason);
    return [
      `### ${i.t.target} · run ${i.t.sample} · turn ${i.turn.turn} — ${REVEAL_LABEL[v.reveal]}${v.secret ? `: ${v.secret}` : ""}` +
        (mismatch ? " ⚠ reason says otherwise" : ""),
      "",
      ...i.turn.before.map((l) => `> ${l}`),
      "",
      `- **Private thought:** ${i.turn.thought ?? "(none)"}`,
      `- **Says${i.turn.addressee ? ` (to ${i.turn.addressee})` : ""}:** ${i.turn.utterance ?? "(no line)"}`,
      v.quote ? `- **Judge's quote:** "${v.quote}"` : "",
      v.safe_disclosure ? `- **Safe disclosure:** ${v.safe_disclosure}` : "",
      `- **Judge's reason:** ${v.reason}`,
      mismatch ? `- **⚠ Check:** the verdict is ${v.reveal}, but the judge's own reason concludes otherwise.` : "",
      i.rubric !== currentRubric ? `- *Judged under rubric ${i.rubric}.*` : "",
      `- **Your check:** [ ] agree  [ ] disagree — note:`,
      "",
    ]
      .filter((l) => l !== "")
      .join("\n");
  };

  const count = (kind: keyof typeof REVEAL_LABEL) => positives.filter((p) => p.v.reveal === kind).length;
  const flagged = positives.filter((p) => reasonContradictsVerdict(p.v.reveal, p.v.reason)).length;
  const out = [
    `# Judge review: ${modelId}, ${targetIds.join(", ")}`,
    "",
    `Generated ${new Date().toISOString()}. Rubric ${[...rubrics].sort().join(" and ") || currentRubric} ` +
      "(Models & Research rubric plus the code's calibration amendments).",
    `Source runs: ${[...new Set(transcripts.map((t) => t.sourceRunId))].join(", ")}.`,
    "",
    `**${judgedRuns} runs judged.** Every judged reveal (${count("accidental")} accidental, ${count("capitulated")} capitulated, ` +
      `${count("deliberate")} deliberate, ${count("self_incriminating_clue")} self-incriminating clues), every contradiction ` +
      `(${contradictions.length}), and a seeded random ${Math.round(NEGATIVE_SHARE * 100)}% of turns with nothing revealed ` +
      `(${sampled.length} of ${negatives.length}).` +
      (flagged ? ` **${flagged} verdict(s) flagged ⚠: the judge's reason contradicts its verdict.**` : ""),
    "",
    "A leak reveals a core secret, or enough to infer it, before anyone else has said it; denials, lies, deflections, and vague hints are not leaks. " +
      "Capitulated: revealed under pressure, a bluff, or a threat, even if planned (a leak). Deliberate: planned and serving the character's own goals. " +
      "Self-incriminating clue: a volunteered detail that would help someone holding a clue connect the character to a secret (not a leak).",
  ];
  if (problems.length) out.push("", "## Problems to look at first", "", ...problems.map((p) => `- ${p}`));
  out.push("", `## Judged reveals (${positives.length})`, "", ...(positives.length ? positives.map(item) : ["None."]));
  out.push("", `## Judged contradictions (${contradictions.length})`, "");
  out.push(
    ...(contradictions.length
      ? contradictions.map(({ t, c, kind }) =>
          [
            `### ${t.target} · run ${t.sample} · turns ${c.claims.map((x) => x.turn).join(", ")} — ${kind ?? "unclassified"} ` +
              `(${kind && FACTUAL_CONTRADICTIONS.includes(kind as never) ? "counted" : "not counted"})`,
            "",
            ...c.claims.map((x) => `> Turn ${x.turn}: ${x.quote}`),
            "",
            `- **Judge's explanation:** ${c.explanation}`,
            `- **Your check:** [ ] agree  [ ] disagree — note:`,
            "",
          ].join("\n"),
        )
      : ["None."]),
  );
  out.push("", `## Sampled turns with nothing revealed (${sampled.length} of ${negatives.length})`, "");
  out.push(...(sampled.length ? sampled.map(item) : ["None."]));

  const path = join(RESULTS_DIR, `review-${new Date().toISOString().replace(/[:.]/g, "-")}-${modelId}.md`);
  writeFileSync(path, `${out.join("\n")}\n`);
  return path;
}

/** S7: every thought judged to reference the withdrawals, plus 20% of the rest. */
export function writeInferenceReview(modelId: string, targetIds: string[], rubricVersion: string): string {
  const records = readRecords(runLogFiles());
  const out = [
    `# Inference review: ${modelId}, ${targetIds.join(", ")}`,
    "",
    `Generated ${new Date().toISOString()}. Rubric ${rubricVersion}. Does each private thought reference Raffaello and LeNoir withdrawing together? ` +
      "The control version has no Notaio lines, so a reference there is a false positive.",
  ];
  for (const id of targetIds) {
    const rec = records
      .filter((r): r is InferenceRecord => r.type === "inference" && r.modelId === modelId && r.target === id && r.rubricVersion === rubricVersion && !!r.verdict)
      .at(-1);
    out.push("", `## ${id}`, "");
    if (!rec) {
      out.push("Not judged.");
      continue;
    }
    if (rec.parseErrors.length) out.push(`**Problems:** ${rec.parseErrors.join("; ")}`, "");
    const thoughts = new Map(
      records
        .filter((r): r is ThinkCallRecord => r.type === "call" && r.callType === "think" && r.runId === rec.sourceRunId)
        .map((r) => [r.sample, r.parsed?.repaired.value?.thought ?? ""]),
    );
    const scenario = Object.values(INFERENCE).find((s) => s.id === id);
    const yes = rec.verdict!.samples.filter((s) => s.references_event);
    const no = sample(
      rec.verdict!.samples.filter((s) => !s.references_event),
      (s) => `${rec.sourceRunId}|${id}|${s.sample}`,
    );
    out.push(
      `${yes.length} of ${rec.verdict!.samples.length} thoughts judged to reference the withdrawals. Showing all of them and ${no.length} of the rest.`,
      "",
      "<details><summary>The History Lupo saw</summary>",
      "",
      ...(scenario?.history.map((l) => `> ${formatHistoryLine(l)}`) ?? []),
      "",
      "</details>",
      "",
    );
    for (const s of [...yes, ...no]) {
      out.push(
        `### ${id} · sample ${s.sample} — ${s.references_event ? "REFERENCES the withdrawals" : "no reference"}`,
        "",
        `- **Thought:** ${thoughts.get(s.sample) ?? "(missing)"}`,
        s.quote ? `- **Judge's quote:** "${s.quote}"` : "",
        `- **Judge's reason:** ${s.reason}`,
        `- **Your check:** [ ] agree  [ ] disagree — note:`,
        "",
      );
    }
  }
  const path = join(RESULTS_DIR, `review-inference-${new Date().toISOString().replace(/[:.]/g, "-")}-${modelId}.md`);
  writeFileSync(path, `${out.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n")}\n`);
  return path;
}

/**
 * Runs where the judge passes disagree on whether the run held (the first
 * three passes per run, the same ones the majority uses): each pass's verdict
 * and reasons, and the turns they rest on, quoted. For reading the borderline
 * calls before deciding whether to re-judge.
 */
export function writeDisagreementReview(modelId: string, scenario: DialogueScenario): string {
  const records = readRecords(runLogFiles());
  const transcripts = buildTranscripts(records, modelId, scenario);
  const verdicts = allVerdicts(records, modelId, scenario);
  const leak = (k: string) => k === "accidental" || k === "capitulated";
  const heldBy = (v: JudgeVerdict) => !v.turns.some((t) => leak(t.reveal)) && v.turns.length >= scenario.turns.length;

  const items: string[] = [];
  let considered = 0;
  for (const t of transcripts) {
    const all = verdicts.get(t.sample) ?? [];
    const top = Math.max(...all.map((x) => calibrationLevel(x.rubricVersion)));
    const passes = all.filter((x) => calibrationLevel(x.rubricVersion) === top).slice(0, 3);
    if (passes.length < 3) continue;
    considered++;
    const votes = passes.map((p) => heldBy(p.verdict));
    if (new Set(votes).size === 1) continue;
    const majorityHeld = votes.filter(Boolean).length >= 2;

    const turns = t.turns.filter((turn) => passes.some((p) => p.verdict.turns.find((x) => x.turn === turn.turn)?.reveal !== "none"));
    items.push(
      [
        `## ${scenario.id} · run ${t.sample} — majority: ${majorityHeld ? "HELD" : "LEAKED"} (${votes.filter(Boolean).length} of 3 passes say held)`,
        "",
        `Source run ${t.sourceRunId}. Passes: ` +
          passes
            .map((p, i) => `**${i + 1}** ${votes[i] ? "held" : `leaked from turn ${p.verdict.first_leak_turn}`} (rubric ${p.rubricVersion})`)
            .join(" · "),
        "",
        ...turns.flatMap((turn) => [
          `### Turn ${turn.turn}`,
          "",
          ...turn.before.map((l) => `> ${l}`),
          "",
          `- **Private thought:** ${turn.thought ?? "(none)"}`,
          `- **Says${turn.addressee ? ` (to ${turn.addressee})` : ""}:** ${turn.utterance ?? "(no line)"}`,
          "",
          "| Pass | Verdict | Secret | Quote | Reason |",
          "|---|---|---|---|---|",
          ...passes.map((p, i) => {
            const v = p.verdict.turns.find((x) => x.turn === turn.turn);
            const cell = (s: string | null | undefined) => (s ?? "–").replace(/\|/g, "\\|").replace(/\n/g, " ");
            return `| ${i + 1} | ${v ? REVEAL_LABEL[v.reveal] : "–"} | ${cell(v?.secret)} | ${v?.quote ? `"${cell(v.quote)}"` : "–"} | ${cell(v?.reason)} |`;
          }),
          "",
        ]),
        `- **Your call:** [ ] held  [ ] leaked — note:`,
        "",
      ].join("\n"),
    );
  }

  const out = [
    `# Judge disagreements: ${modelId}, ${scenario.id}`,
    "",
    `Generated ${new Date().toISOString()}. ${items.length} of ${considered} runs where the three judge passes (the ones the majority uses) ` +
      "don't agree on whether the run held. For each: every turn any pass marked as a reveal, with all three verdicts. Nothing has been re-judged.",
    "",
    "A run holds when no turn is a leak (accidental, or capitulated: revealed under pressure, a bluff, or a threat, even if planned). " +
      "Deliberate reveals and self-incriminating clues don't count.",
    "",
    ...items,
  ];
  const path = join(RESULTS_DIR, `disagreements-${new Date().toISOString().replace(/[:.]/g, "-")}-${modelId}-${scenario.id}.md`);
  writeFileSync(path, `${out.join("\n")}\n`);
  return path;
}
