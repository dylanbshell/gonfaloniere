// Il Notaio's live golden set (TD v0.51, Player Interface › The screen › Il Notaio's reading; CC-20261114-19,
// #146): the hand-made records (scenarios/notaio-golden.json), each built to tempt the model into one of TD's
// failure cases, and the checks a reading must pass. This module is the material and the judging, with no
// model calls; golden.ts runs it, and only with a spending stop from Dylan.
//
// For each record the reading must pass:
// - No failed sentence reaches the screen: every model sentence shown is checked again from the record
// - No new fact: block 10c's knowledge check, run on the rendered reading, finds no plot-point fact that it
//   doesn't also find in a single line of the material or a single note
// - The fallback rate (sentences replaced by G9) is reported

import { readFileSync } from "node:fs";
import type { PlotFact, SystemPrompt } from "../sources/docs.ts";
import { checkSentence, guard, type GuardLine, type GuardVerdict } from "./guard.ts";
import { glossOf, guardedPrompt, type PublicLore } from "./reading.ts";
import { loreParts, type LoreEntry } from "../../web/src/model.ts";

export const GOLDEN_FILE = "scenarios/notaio-golden.json";

export interface GoldenCase {
  id: string;
  /** TD's failure cases (1–21) it's built to tempt. */
  tempts: number[];
  /** Plot-point facts split across its lines, so a connected reading would state them. */
  facts?: string[];
  lines: { speaker: string; to?: string; toPlayer?: boolean; words: string }[];
}

export function goldenSet(path = GOLDEN_FILE): { reader: string; cases: GoldenCase[] } {
  return JSON.parse(readFileSync(path, "utf8"), (k, v) => (k.startsWith("_") ? undefined : v)) as { reader: string; cases: GoldenCase[] };
}

/** A case's lines as the model is given them (guard.ts). */
export const caseLines = (c: GoldenCase): GuardLine[] => c.lines.map((l, i) => ({ n: i + 1, speaker: l.speaker, addressee: l.to ?? null, toPlayer: !!l.toPlayer, words: l.words }));

export const casePrompt = (p: SystemPrompt & { names: [string, string] }, c: GoldenCase) => guardedPrompt(p, caseLines(c));

/** What the screen would show for the case, item by item: each line's sentence, then its lore note (once per entry). */
export function rendered(c: GoldenCase, verdicts: GuardVerdict[], lore: PublicLore[]): { kind: "sentence" | "note"; text: string }[] {
  const noted = new Set<string>();
  return c.lines.flatMap((l, i) => {
    const out: { kind: "sentence" | "note"; text: string }[] = [{ kind: "sentence", text: verdicts[i]!.text }];
    const hit = loreParts(l.words, lore as LoreEntry[]).find((p) => typeof p !== "string");
    if (hit && typeof hit !== "string" && !noted.has(hit.entry.id)) {
      noted.add(hit.entry.id);
      out.push({ kind: "note", text: `${hit.entry.title}: ${glossOf(hit.entry as PublicLore)}` });
    }
    return out;
  });
}

/** The first check: every sentence the model wrote that's shown passes every check again, from the record. */
export function recheck(c: GoldenCase, raw: string | null): { shownFailing: number[]; verdicts: GuardVerdict[] } {
  const lines = caseLines(c);
  const verdicts = guard(raw, lines);
  const shownFailing = verdicts.filter((v) => v.model && checkSentence(v.text, lines[v.line - 1]!).length > 0).map((v) => v.line);
  return { shownFailing, verdicts };
}

/** Block 10c's user message for one piece of evidence: the reader, as of the reading, with the items as entries. */
export function knowledgeUser(template: string, reader: string, fact: PlotFact, items: string[]): string {
  const values: Record<string, string> = {
    character_name: reader,
    deadline_label: "the end of the reading",
    fact: fact.fact,
    must_include: fact.mustInclude,
    does_not_count: fact.doesNotCount,
    memory_entries: items.length ? items.map((t, i) => `[M${i + 1}] ${t}`).join("\n") : "None.",
    beliefs: "None.",
  };
  return template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}

/** A 10c verdict that counts as learning the fact. */
export const learned = (verdict: string | undefined) => verdict === "told" || verdict === "conclusion";
