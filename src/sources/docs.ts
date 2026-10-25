// Reads prompt templates, briefings, and tunable values straight from the
// design docs, so probes use them verbatim and every result can record which
// doc versions it ran on.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
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

/** A system prompt (blocks 10a–10d): the cached instructions, and the per-call data template. */
export interface SystemPrompt {
  system: string;
  user: string;
}

/** TD v0.6, Output Validation & Repair: the Summary verbs table and the Beliefs row's hedge list. */
export interface MemoryRules {
  /** Allowed first verb after the speaker's name, by entry type. */
  verbs: Record<string, string[]>;
  hedges: string[];
}

/** A plot-point fact the knowledge check tests (TD v0.5, Plot Point Checks). */
export interface PlotFact {
  id: string;
  fact: string;
  mustInclude: string;
  doesNotCount: string;
}

export interface DocSources {
  versions: DocVersions;
  judgeRubric: JudgeRubric;
  templates: PromptTemplates;
  briefings: Partial<Record<CharacterName, string>>;
  tunables: Tunables;
  /** Characters' standard social awareness text, filled into every briefing. */
  socialAwareness: string;
  /** TD v0.6's system prompts (★ pass, claims pass, thought pass, knowledge check), and from v0.8 the perception pass; absent before v0.6. */
  systemPrompts?: { starPass: SystemPrompt; claimsPass: SystemPrompt; thoughtPass: SystemPrompt; knowledgeCheck: SystemPrompt; perceptionPass?: SystemPrompt };
  /** TD v0.6's checks on memory writing (Output Validation & Repair); absent before v0.6. */
  memoryRules?: MemoryRules;
  /** TD v0.5's plot-point facts (F1–F4, and the optional F5); empty before v0.5. */
  plotFacts: PlotFact[];
}

// Heading each written briefing sits under in the Characters doc.
const BRIEFING_HEADINGS: Partial<Record<CharacterName, string>> = {
  Lupo: "### Lupo",
  "Contessa Isabella": "### Contessa Isabella di Salviati",
  "Captain Armand LeNoir": "### Captain Armand LeNoir",
};

/**
 * The commit that removed or renamed a doc from docs/, or null. docs/ holds only current
 * versions (TD v0.4 and v0.5 left with TD v0.6, Characters v0.3 with v0.4); a run pinned to an
 * older version reads it from git history, as it was just before its removal.
 */
function removedIn(path: string): string | null {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%H", "--diff-filter=DR", "--", path], { stdio: ["ignore", "pipe", "ignore"] });
    return out.toString().trim() || null;
  } catch {
    return null;
  }
}

/** Whether a doc can be read: in docs/, or in git history. */
export function docAvailable(path: string): boolean {
  return existsSync(path) || removedIn(path) !== null;
}

/** Reads a doc from docs/, or from git history if it has been removed (see removedIn). */
export function readDoc(path: string): string {
  if (existsSync(path)) return readFileSync(path, "utf8");
  const commit = removedIn(path);
  if (!commit) throw new Error(`${path} is neither in docs/ nor in git history`);
  return execFileSync("git", ["show", `${commit}^:${path}`], { maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }).toString();
}

export function loadDocs(paths: DocPaths): DocSources {
  const td = readDoc(paths.technicalDesign);
  const chars = readDoc(paths.characters);
  const mech = readDoc(paths.mechanics);
  const mr = readDoc(paths.modelsResearch);

  const [rulesPrimer, plotRule] = fencesUnder(td, "### Block 2 — Rules primer");
  // TD v0.4's Capannello addressee instruction: an indented block under 9b.
  const [addresseeInstruction] = fencesUnder(td, "### Block 9b — speak() task", { indented: true });
  const templates: PromptTemplates = {
    frame: only(fencesUnder(td, "### Block 1 — Frame"), "Block 1"),
    rulesPrimer: required(rulesPrimer, "Block 2"),
    plotRule: required(plotRule, "Block 2 plot rule"),
    strategy: only(fencesUnder(td, "### Block 4 — Strategy"), "Block 4"),
    state: only(fencesUnder(td, "### Block 5 — State"), "Block 5"),
    memory: only(fencesUnder(td, "### Blocks 6–8 — Memory"), "Blocks 6–8"),
    think: only(fencesUnder(td, "### Block 9a — think() task"), "Block 9a"),
    speak: only(fencesUnder(td, "### Block 9b — speak() task"), "Block 9b"),
    ...(addresseeInstruction && { addresseeInstruction }),
    // TD v0.4's strategy, Murder Round, ballot, and run-off tasks (blocks 9d–9g); absent before v0.4.
    ...optionalTemplate(td, "### Block 9c — Movement task", "move"),
    ...optionalTemplate(td, "### Block 9d — Strategy task", "plan"),
    ...optionalTemplate(td, "### Block 9e — Murder Round task", "murder"),
    ...optionalTemplate(td, "### Block 9f — Ballot task", "ballot"),
    ...optionalTemplate(td, "### Block 9g — Run-off task", "runoff"),
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
    socialAwareness,
    ...(systemPrompts(td) && { systemPrompts: systemPrompts(td)! }),
    ...(memoryRules(td) && { memoryRules: memoryRules(td)! }),
    plotFacts: plotFacts(td),
  };
}

/**
 * Blocks 10a–10e (TD v0.6–v0.8): each heading holds the system message's code block, then the user
 * message's; 10d (claims pass) uses 10a's user message.
 */
function systemPrompts(td: string): DocSources["systemPrompts"] | null {
  const blocks = (heading: string): string[] => {
    try {
      return fencesUnder(td, heading);
    } catch {
      return [];
    }
  };
  const pair = (heading: string): SystemPrompt | null => {
    const [system, user] = blocks(heading);
    return system && user ? { system, user } : null;
  };
  const starPass = pair("### Block 10a — ★ pass");
  const thoughtPass = pair("### Block 10b — Thought pass");
  const knowledgeCheck = pair("### Block 10c — Knowledge check");
  const [claimsSystem] = blocks("### Block 10d — Claims pass");
  if (!starPass || !thoughtPass || !knowledgeCheck || !claimsSystem) return null;
  // TD v0.8: the perception pass (block 10e); absent before v0.8.
  const perceptionPass = pair("### Block 10e — Perception pass");
  return { starPass, claimsPass: { system: claimsSystem, user: starPass.user }, thoughtPass, knowledgeCheck, ...(perceptionPass && { perceptionPass }) };
}

/** Terms each recorder prompt defines in its DEFINITIONS section (TD v0.7's definitions contract). */
export const DEFINITION_TERMS = { starPass: ["promise", "deal", "threat", "admission", "toward"], claimsPass: ["claim", "denial"] } as const;

/**
 * The DEFINITIONS lines of blocks 10a and 10d, verbatim: each is one line beginning "- term:"
 * (TD v0.7). The gate 8 judge (rubric gate8 v2) reads these, so the judge and the recorder share one
 * wording. Throws if any of the seven terms is missing or unparseable: there is no fallback.
 */
export function memoryDefinitions(docs: DocSources): { term: string; line: string }[] {
  const sp = docs.systemPrompts;
  if (!sp) throw new Error(`TD v${docs.versions.technicalDesign} has no recorder prompts (blocks 10a–10d), so it has no DEFINITIONS to judge by`);
  const out: { term: string; line: string }[] = [];
  for (const [pass, terms] of Object.entries(DEFINITION_TERMS) as [keyof typeof DEFINITION_TERMS, readonly string[]][]) {
    const lines = sp[pass].system.split("\n");
    const start = lines.findIndex((l) => l.trim() === "DEFINITIONS");
    if (start < 0) throw new Error(`TD v${docs.versions.technicalDesign} block ${pass === "starPass" ? "10a" : "10d"} has no DEFINITIONS section`);
    const section: string[] = [];
    for (const l of lines.slice(start + 1)) {
      if (!l.trim()) break;
      section.push(l);
    }
    for (const term of terms) {
      const hits = section.filter((l) => l.startsWith(`- ${term}: `));
      if (hits.length !== 1) throw new Error(`TD v${docs.versions.technicalDesign} block ${pass === "starPass" ? "10a" : "10d"} DEFINITIONS: expected one line starting "- ${term}: ", found ${hits.length}`);
      out.push({ term, line: hits[0]! });
    }
  }
  return out;
}

/** The Summary verbs table and the Beliefs row's hedge list, verbatim from Output Validation & Repair. */
function memoryRules(td: string): MemoryRules | null {
  let lines: string[];
  try {
    lines = section(td, "## Output Validation & Repair");
  } catch {
    return null;
  }
  const verbs: Record<string, string[]> = {};
  const start = lines.findIndex((l) => l.startsWith("**Summary verbs**"));
  if (start < 0) return null;
  for (const l of lines.slice(start)) {
    const m = l.match(/^\| (promise|deal|threat|admission|claim|denial) \| ([^|]+) \|$/);
    if (m) verbs[m[1]!] = m[2]!.split(",").map((v) => v.trim().toLowerCase());
  }
  const hedge = lines.join("\n").match(/any hedge from 10b's list \(([^)]+)\)/);
  if (!hedge || Object.keys(verbs).length !== 6) return null;
  return { verbs, hedges: hedge[1]!.split(",").map((h) => h.trim().toLowerCase()) };
}

/**
 * The plot-point facts table (TD v0.5), plus the optional F5 the same section
 * describes in prose ("Lupo kills for hire").
 */
function plotFacts(td: string): PlotFact[] {
  let lines: string[];
  try {
    lines = section(td, "### Plot-point facts");
  } catch {
    return [];
  }
  const cells = (l: string) => l.split("|").slice(1, -1).map((c) => c.trim());
  const facts = lines
    .filter((l) => /^\| \*\*F\d\*\* \|/.test(l))
    .map((l) => {
      const [id, fact, mustInclude, doesNotCount] = cells(l);
      return { id: id!.replace(/\*/g, ""), fact: fact!, mustInclude: mustInclude!, doesNotCount: doesNotCount! };
    });
  const f5 = lines.join("\n").match(/\*\*F5\*\* "([^"]+)" \(must include: ([^;]+); doesn't count: ([^)]+)\)/);
  if (f5) facts.push({ id: "F5", fact: `${f5[1]}.`, mustInclude: f5[2]!.trim(), doesNotCount: f5[3]!.trim() });
  return facts;
}

/**
 * Briefings from a stand-in file written in Characters' briefing format
 * (e.g. the mini-game's stand-ins), with the standard social awareness text.
 */
export function loadStandinBriefings(path: string, names: CharacterName[], socialAwareness: string): Partial<Record<CharacterName, string>> {
  const md = readFileSync(path, "utf8");
  return Object.fromEntries(names.map((n) => [n, extractBriefing(md, `### ${n}`, socialAwareness)]));
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

/** Top-level code blocks under a heading, or with `indented`, those nested in a list (de-indented). */
function fencesUnder(md: string, heading: string, opts: { indented?: boolean } = {}): string[] {
  const fences: string[] = [];
  let current: string[] | null = null;
  let indent = "";
  for (const raw of section(md, heading)) {
    const fence = raw.trimStart().startsWith("```") && (opts.indented ? raw[0] === " " : raw.startsWith("```"));
    if (fence && !current) indent = raw.slice(0, raw.length - raw.trimStart().length);
    const line = raw.startsWith(indent) ? raw.slice(indent.length) : raw;
    if (fence) {
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

/** A task template that only later TD versions have: its first code block, under `key`, or nothing. */
function optionalTemplate(td: string, heading: string, key: string): Record<string, string> {
  try {
    const [first] = fencesUnder(td, heading);
    return first ? { [key]: first } : {};
  } catch {
    return {};
  }
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
