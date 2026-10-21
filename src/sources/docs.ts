// Reads prompt templates, briefings, and tunable values straight from the
// design docs, so probes use them verbatim and every result can record which
// doc versions it ran on.

import { readFileSync } from "node:fs";
import type { CharacterName } from "../game/roster.ts";
import type { PromptTemplates } from "../prompt/assemble.ts";

export interface DocPaths {
  technicalDesign: string;
  characters: string;
  mechanics: string;
  /** Holds the probe plan and scoring rules: its version and the judge rubric are read. */
  modelsResearch: string;
}

export interface DocVersions {
  technicalDesign: string;
  characters: string;
  mechanics: string;
  /** Absent in logs from before Oct 21 v0.7 scoring. */
  modelsResearch?: string;
}

export interface Tunables {
  starting_florins: number;
  income: number;
  vote_price: number;
  pension_size: number;
  embassy_treasury: number;
  colloquio_cap: number;
}

export interface JudgeRubric {
  /** "What counts as a secret": the table and the deliberate-reveal line, verbatim. */
  secrets: string;
  /** The rubric bullets under Scoring's "Judging" entry (leak, deliberate, first leak turn), verbatim. */
  rules: string;
}

export interface DocSources {
  versions: DocVersions;
  judgeRubric: JudgeRubric;
  templates: PromptTemplates;
  briefings: Partial<Record<CharacterName, string>>;
  tunables: Tunables;
}

// Heading each written briefing sits under in the Characters doc.
const BRIEFING_HEADINGS: Partial<Record<CharacterName, string>> = {
  Lupo: "### Lupo",
  "Contessa Isabella": "### Contessa Isabella di Salviati",
  "Captain Armand LeNoir": "### Captain Armand LeNoir",
};

export function loadDocs(paths: DocPaths): DocSources {
  const td = readFileSync(paths.technicalDesign, "utf8");
  const chars = readFileSync(paths.characters, "utf8");
  const mech = readFileSync(paths.mechanics, "utf8");
  const mr = readFileSync(paths.modelsResearch, "utf8");

  const [rulesPrimer, plotProtectionRule] = fencesUnder(td, "### Block 2 — Rules primer");
  const templates: PromptTemplates = {
    frame: only(fencesUnder(td, "### Block 1 — Frame"), "Block 1"),
    rulesPrimer: required(rulesPrimer, "Block 2"),
    plotProtectionRule: required(plotProtectionRule, "Block 2 plot protection rule"),
    strategy: only(fencesUnder(td, "### Block 4 — Strategy"), "Block 4"),
    state: only(fencesUnder(td, "### Block 5 — State"), "Block 5"),
    memory: only(fencesUnder(td, "### Blocks 6–8 — Memory"), "Blocks 6–8"),
    think: only(fencesUnder(td, "### Block 9a — think() task"), "Block 9a"),
    speak: only(fencesUnder(td, "### Block 9b — speak() task"), "Block 9b"),
  };

  const socialAwareness = standardSocialAwareness(chars);
  const briefings: Partial<Record<CharacterName, string>> = {};
  for (const [name, heading] of Object.entries(BRIEFING_HEADINGS)) {
    briefings[name as CharacterName] = extractBriefing(chars, heading, socialAwareness);
  }

  return {
    versions: {
      technicalDesign: docVersion(td, paths.technicalDesign),
      characters: docVersion(chars, paths.characters),
      mechanics: docVersion(mech, paths.mechanics),
      modelsResearch: docVersion(mr, paths.modelsResearch),
    },
    templates,
    briefings,
    tunables: parseTunables(mech),
    judgeRubric: judgeRubric(mr),
  };
}

function docVersion(md: string, path: string): string {
  const m = md.match(/^### Version ([\d.]+)/m);
  if (!m?.[1]) throw new Error(`No "### Version" line in ${path}`);
  return m[1];
}

// Lines of the first section whose heading starts with `heading` (so "(shared)"
// suffixes can be left off), up to the next heading of the same or higher level.
function section(md: string, heading: string): string[] {
  const lines = md.split("\n");
  const start = lines.findIndex((l) => l === heading || l.startsWith(`${heading} `));
  if (start < 0) throw new Error(`Heading not found: ${heading}`);
  const level = heading.match(/^#+/)![0].length;
  const end = lines.findIndex(
    (l, i) => i > start && /^#+ /.test(l) && l.match(/^#+/)![0].length <= level,
  );
  return lines.slice(start + 1, end < 0 ? undefined : end);
}

function fencesUnder(md: string, heading: string): string[] {
  const fences: string[] = [];
  let current: string[] | null = null;
  for (const line of section(md, heading)) {
    if (line.startsWith("```")) {
      if (current) {
        fences.push(current.join("\n"));
        current = null;
      } else {
        current = [];
      }
    } else if (current) {
      current.push(line);
    }
  }
  return fences;
}

function only(fences: string[], label: string): string {
  if (fences.length !== 1) throw new Error(`Expected one code block for ${label}, found ${fences.length}`);
  return fences[0]!;
}

function required(text: string | undefined, label: string): string {
  if (text === undefined) throw new Error(`Missing code block for ${label}`);
  return text;
}

function standardSocialAwareness(chars: string): string {
  const m = chars.match(/\*\*Standard social awareness text\*\*[^\n]*\n\n> ([^\n]+)/);
  if (!m?.[1]) throw new Error("Standard social awareness text not found in Characters doc");
  return m[1].trim();
}

// The briefing body under its heading, minus the doc-only rewrite notes, with
// the standard social awareness text filled in.
function extractBriefing(chars: string, heading: string, socialAwareness: string): string {
  const lines = section(chars, heading);
  const notes = lines.findIndex((l) => l.startsWith("**Rewrite notes:**"));
  const body = (notes < 0 ? lines : lines.slice(0, notes))
    .join("\n")
    .replace(/\n---\s*$/, "")
    .trim();
  if (!body.includes("*(Standard text.)*")) {
    throw new Error(`Briefing under "${heading}" has no social awareness placeholder`);
  }
  return body.replace("*(Standard text.)*", socialAwareness);
}

function judgeRubric(mr: string): JudgeRubric {
  const secrets = section(mr, "### What counts as a secret").join("\n").trim();
  const lines = mr.split("\n");
  const start = lines.findIndex((l) => l.startsWith("- **Judging (decided"));
  if (start < 0) throw new Error("Judging rubric not found in Models & Research");
  const rules: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith("  - ")) break;
    // The calibration bullet is procedure for the harness, not rubric for the judge.
    if (line.startsWith("  - **Calibration first:**")) continue;
    rules.push(line.slice(2));
  }
  if (!rules.length) throw new Error("Judging rubric has no bullets in Models & Research");
  return { secrets, rules: rules.join("\n") };
}

// Mechanics' Tunable Values table, keyed by the placeholder names the prompts use.
function parseTunables(mech: string): Tunables {
  const rows = new Map<string, number>();
  for (const line of section(mech, "## Tunable Values")) {
    const cells = line.split("|").map((c) => c.trim());
    // First number in the cell: "15 Florins (…)", "About 6 utterances (3 each)".
    const value = cells[2]?.match(/\d+/);
    if (cells[1] && value) rows.set(cells[1], Number(value[0]));
  }
  const get = (lever: string): number => {
    const v = rows.get(lever);
    if (v === undefined) throw new Error(`Tunable "${lever}" not found in mechanics`);
    return v;
  };
  return {
    starting_florins: get("Starting Florins"),
    income: get("Per-round income"),
    vote_price: get("Vote price"),
    pension_size: get("Pension size"),
    embassy_treasury: get("Embassy treasury"),
    colloquio_cap: get("Colloquio cap"),
  };
}
