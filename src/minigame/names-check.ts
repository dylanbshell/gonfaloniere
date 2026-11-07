// The in-world names check (CC-20261107-01; TD v0.34–v0.35 In-World Names, Models & Research v0.47
// Open Questions): reads mini-game records and reports, by code,
//   - game terms in every character-facing prompt sent (system and user; blocks 10a–10d exempt)
//   - the same terms in every thought, spoken line, and plan, each hit with its context to read
//   - every midnight (9e) answer: parsed with no repair or not, and acts by the word used
//   - against baseline games: took and meant label mix, words per spoken line, knowledge-check
//     verdicts, and repairs and retries
//
//   npm run minigame:names -- <records .full.json.gz> --baseline <records> [--out report.md]
//
// No model calls.

import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

/** The terms that must not reach a character, and what flags them. */
export const GAME_TERMS: { term: string; re: RegExp }[] = [
  { term: "Murder Round", re: /murder rounds?/gi },
  { term: "plot point", re: /plot[- ]points?/gi },
  { term: "Plot Reward", re: /plot rewards?/gi },
  { term: "faction meeting", re: /faction meetings?/gi },
  { term: "Capannello round", re: /capannello rounds?/gi },
  { term: "KILL / GUARD / INVESTIGATE", re: /\b(?:KILL|GUARD|INVESTIGATE)\b/g },
  { term: "T<number>", re: /\bT\d+\b/g },
  { term: "turn <number>", re: /\bturn\s+\d+/gi },
];

/** Calls a character receives (blocks 1–9). The system passes (10a–10d and the re-asks) are exempt. */
export const CHARACTER_CALLS = ["plan", "think", "speak", "move", "seat", "murder"];

export interface Hit {
  term: string;
  match: string;
  /** About 80 characters either side. */
  context: string;
}

export function termHits(text: string, width = 80): Hit[] {
  const hits: Hit[] = [];
  for (const { term, re } of GAME_TERMS) {
    for (const m of text.matchAll(re)) {
      const at = m.index!;
      const context = `${at > width ? "…" : ""}${text.slice(Math.max(0, at - width), at)}[${m[0]}]${text.slice(at + m[0].length, at + m[0].length + width)}${at + m[0].length + width < text.length ? "…" : ""}`;
      hits.push({ term, match: m[0], context: context.replace(/\s+/g, " ") });
    }
  }
  return hits;
}

interface Call {
  n: number;
  turn: number;
  kind: string;
  character: string | null;
  attempt: number;
  system?: string;
  user: string;
  raw: string | null;
  parsed: { verdict?: string; fenced?: boolean; aliasRepairs?: number; errors?: string[]; illegal?: string[]; value?: Record<string, unknown> | null } | null;
  verdict?: string;
  repairs?: unknown[];
  error?: string | null;
}
interface Rec {
  header: { game_id: string; seed: number; docs: { technicalDesign: string; characters: string }; config: { notebook?: string; retrieval?: string; model?: string; provider?: string } };
  prefixes?: Record<string, string>;
  calls: Call[];
  events: { type: string; turn: number; character?: string; thought?: string; plan?: string }[];
  lines: { id: string; kind: string; speaker?: string; text: string; meant?: string }[];
  thoughts: { id: string; call: string; character: string; text: string; took?: string; turn: number }[];
  knowledge_checks: { character: string; fact: string; verdict?: { verdict?: string } | null }[];
  summary: { rate_limit_retries?: number; memory?: { repairs?: number; dropped?: number } };
}

export function readRec(path: string): Rec {
  return JSON.parse(gunzipSync(readFileSync(path)).toString());
}

/**
 * The system message a call was sent with. Records keep blocks 1–3 once per character
 * (`prefixes["character:<name>"]`), since they're the same for all of a character's calls.
 */
function systemOf(rec: Rec, c: Call): string {
  const s = c.system ?? (c.character ? rec.prefixes?.[`character:${c.character}`] : undefined);
  if (s === undefined) throw new Error(`${rec.header.game_id} call ${c.n}: no system message recorded`);
  return s;
}

export interface PromptHit extends Hit {
  game: string;
  call: number;
  kind: string;
  character: string | null;
  part: "system" | "user";
}

/** Step 5: every character-facing prompt actually sent. */
export function promptScan(rec: Rec): { calls: number; hits: PromptHit[] } {
  const hits: PromptHit[] = [];
  const calls = rec.calls.filter((c) => CHARACTER_CALLS.includes(c.kind));
  for (const c of calls) {
    for (const part of ["system", "user"] as const) {
      const text = part === "system" ? systemOf(rec, c) : c.user;
      for (const h of termHits(text)) hits.push({ ...h, game: rec.header.game_id, call: c.n, kind: c.kind, character: c.character, part });
    }
  }
  return { calls: calls.length, hits };
}

export interface OutputHit extends Hit {
  game: string;
  source: "thought" | "line" | "plan";
  id: string;
  character: string;
  turn: number;
}

/** Step 6: every thought, spoken line, and plan. */
export function outputScan(rec: Rec): { texts: { thoughts: number; lines: number; plans: number }; hits: OutputHit[] } {
  const hits: OutputHit[] = [];
  const game = rec.header.game_id;
  const speech = rec.lines.filter((l) => l.kind === "speech");
  const plans = rec.events.filter((e) => e.type === "plan" && typeof e.plan === "string");
  for (const t of rec.thoughts) for (const h of termHits(t.text)) hits.push({ ...h, game, source: "thought", id: `${t.id} (${t.call})`, character: t.character, turn: t.turn });
  for (const l of speech) for (const h of termHits(l.text)) hits.push({ ...h, game, source: "line", id: l.id, character: l.speaker ?? "?", turn: (l as { turn?: number }).turn ?? 0 });
  plans.forEach((p, i) => {
    for (const h of termHits(p.plan!)) hits.push({ ...h, game, source: "plan", id: `plan ${i + 1}`, character: p.character ?? "?", turn: p.turn });
  });
  return { texts: { thoughts: rec.thoughts.length, lines: speech.length, plans: plans.length }, hits };
}

export interface MidnightAnswer {
  game: string;
  character: string;
  attempts: number;
  /** The words the answer used for its act types, as written. */
  words: string[];
  /** The game acts they stand for. */
  acts: string[];
  /** Parsed valid on the first try, unfenced, with no alias or other repair. */
  clean: boolean;
  notes: string[];
}

/** Step 7: every 9e answer. A retry, a code fence, an alias, a logged repair, or an illegal act is not clean. */
export function midnight(rec: Rec): MidnightAnswer[] {
  const byChar = new Map<string, Call[]>();
  for (const c of rec.calls.filter((c) => c.kind === "murder")) (byChar.get(c.character!) ?? byChar.set(c.character!, []).get(c.character!)!).push(c);
  return [...byChar].map(([character, calls]) => {
    const last = calls.at(-1)!;
    const notes: string[] = [];
    if (calls.length > 1) notes.push(`${calls.length} attempts`);
    if (last.parsed?.fenced) notes.push("fenced");
    if (last.parsed?.aliasRepairs) notes.push(`${last.parsed.aliasRepairs} alias repair(s)`);
    if (last.repairs?.length) notes.push(`repairs: ${JSON.stringify(last.repairs)}`);
    if (last.parsed?.verdict !== "valid") notes.push(`verdict ${last.parsed?.verdict ?? "none"}: ${(last.parsed?.errors ?? []).join("; ")}`);
    if (last.parsed?.illegal?.length) notes.push(`illegal: ${last.parsed.illegal.join("; ")}`);
    let words: string[] = [];
    try {
      const j = JSON.parse((last.raw ?? "").replace(/^```(?:json)?\s*|\s*```$/g, ""));
      words = [...(j.act ? [j.act.type] : []), ...(Array.isArray(j.acts) ? j.acts.map((a: { type: string }) => a.type) : []), ...(Array.isArray(j.kills) ? j.kills.map(() => "kill (kills list)") : [])];
    } catch {
      words = ["(raw not JSON)"];
    }
    const acts = ((last.parsed?.value?.acts as { type: string }[] | undefined) ?? []).map((a) => a.type);
    return { game: rec.header.game_id, character, attempts: calls.length, words, acts, clean: notes.length === 0, notes };
  });
}

/** How many lines block 6 holds in a prompt, or null if it has no block 6. */
function notebookLines(user: string): number | null {
  const a = user.indexOf("WHAT YOU REMEMBER FROM EARLIER TONIGHT\n");
  if (a < 0) return null;
  const b = user.indexOf("(★ marks", a);
  return user.slice(a, b < 0 ? undefined : b).split("\n").filter((l) => l.startsWith("- ")).length;
}

const share = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "–");

/** Step 8: label mix, words per line, verdicts, repairs and retries, for a set of games. */
export function profile(recs: Rec[]) {
  const thinks = recs.flatMap((r) => r.thoughts.filter((t) => t.call === "think"));
  const speeches = recs.flatMap((r) => r.lines.filter((l) => l.kind === "speech"));
  const count = (xs: (string | undefined)[]) => xs.reduce((m, x) => m.set(x ?? "(missing)", (m.get(x ?? "(missing)") ?? 0) + 1), new Map<string, number>());
  const took = count(thinks.map((t) => t.took));
  const meant = count(speeches.map((l) => l.meant));
  const words = speeches.map((l) => l.text.trim().split(/\s+/).length);
  const verdicts = count(recs.flatMap((r) => r.knowledge_checks.map((k) => k.verdict?.verdict)));
  const calls = recs.flatMap((r) => r.calls);
  const retries = count(calls.filter((c) => c.attempt > 1).map((c) => c.kind));
  const repaired = count(calls.filter((c) => (c.repairs?.length ?? 0) > 0 || (c.parsed?.aliasRepairs ?? 0) > 0 || c.parsed?.fenced).map((c) => c.kind));
  // Block 6 is cut to ~450 tokens of rendered text, so longer time labels can cost it lines.
  const notebooks = calls.filter((c) => CHARACTER_CALLS.includes(c.kind)).map((c) => notebookLines(c.user)).filter((n) => n !== null) as number[];
  return {
    thinks: thinks.length,
    took,
    speeches: speeches.length,
    meant,
    wordsPerLine: words.length ? words.reduce((a, b) => a + b, 0) / words.length : 0,
    verdicts,
    retries,
    repaired,
    notebookLines: notebooks.length ? notebooks.reduce((a, b) => a + b, 0) / notebooks.length : 0,
    rateLimitRetries: recs.reduce((a, r) => a + (r.summary.rate_limit_retries ?? 0), 0),
    memoryRepairs: recs.reduce((a, r) => a + (r.summary.memory?.repairs ?? 0), 0),
  };
}

function mixTable(label: string, newer: Map<string, number>, older: Map<string, number>, total: [number, number]): string[] {
  const keys = [...new Set([...newer.keys(), ...older.keys()])].sort((a, b) => (older.get(b) ?? 0) + (newer.get(b) ?? 0) - (older.get(a) ?? 0) - (newer.get(a) ?? 0));
  const labelled = (m: Map<string, number>) => [...m].filter(([k]) => k !== "none" && k !== "(missing)").reduce((a, [, v]) => a + v, 0);
  const [ln, lo] = [labelled(newer), labelled(older)];
  return [
    `| ${label} | Baseline n | of all | of labelled | This check n | of all | of labelled |`,
    "|---|---|---|---|---|---|---|",
    ...keys.map((k) => {
      const lab = k !== "none" && k !== "(missing)";
      return `| ${k} | ${older.get(k) ?? 0} | ${share(older.get(k) ?? 0, total[1])} | ${lab ? share(older.get(k) ?? 0, lo) : "–"} | ${newer.get(k) ?? 0} | ${share(newer.get(k) ?? 0, total[0])} | ${lab ? share(newer.get(k) ?? 0, ln) : "–"} |`;
    }),
    `| **all** | ${total[1]} | | ${lo} labelled | ${total[0]} | | ${ln} labelled |`,
  ];
}

const fmt = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "none";

export function report(recs: Rec[], baseline: Rec[]): { text: string; promptHits: number; outputHits: number; midnightRepairs: number } {
  const out: string[] = [];
  const ps = recs.map(promptScan);
  const os = recs.map(outputScan);
  const md = recs.flatMap(midnight);
  const promptHits = ps.flatMap((p) => p.hits);
  const outputHits = os.flatMap((o) => o.hits);
  out.push(`# In-world names check`, "", `Games: ${recs.map((r) => `${r.header.game_id} (seed ${r.header.seed}; TD v${r.header.docs.technicalDesign}, Characters v${r.header.docs.characters})`).join("; ")}.`);
  out.push(`Baseline: ${baseline.map((r) => `${r.header.game_id} (TD v${r.header.docs.technicalDesign})`).join("; ")}.`, "");
  out.push(`## Prompts (step 5)`, "", `${ps.reduce((a, p) => a + p.calls, 0)} character calls scanned, system and user messages. Hits: **${promptHits.length}**.`);
  for (const h of promptHits.slice(0, 40)) out.push(`- ${h.game} call ${h.call} (${h.kind}, ${h.character}, ${h.part}): **${h.term}** — ${h.context}`);
  out.push("", `## Outputs (step 6)`, "", `Scanned: ${os.map((o, i) => `${recs[i]!.header.game_id}: ${o.texts.thoughts} thoughts, ${o.texts.lines} spoken lines, ${o.texts.plans} plans`).join("; ")}. Hits: **${outputHits.length}** (each to be read in context).`);
  for (const h of outputHits) out.push(`- ${h.game} ${h.source} ${h.id}, ${h.character}, turn ${h.turn}: **${h.term}** ("${h.match}") — ${h.context}`);
  const repaired = md.filter((a) => !a.clean);
  out.push("", `## Midnight (step 7)`, "", `${md.length} answers; parsed with no repair: ${md.length - repaired.length}; not: ${repaired.length}.`, "", "| Game | Character | Words used | Acts recorded | Clean | Notes |", "|---|---|---|---|---|---|");
  for (const a of md) out.push(`| ${a.game.replace(/^.*minigame-/, "")} | ${a.character} | ${a.words.join(", ")} | ${a.acts.join(", ")} | ${a.clean ? "yes" : "**no**"} | ${a.notes.join("; ")} |`);
  const words = md.flatMap((a) => a.words);
  const byWord = words.reduce((m, w) => m.set(w, (m.get(w) ?? 0) + 1), new Map<string, number>());
  out.push("", `Act words: ${fmt(byWord)}. "investigate" used as an alias: ${byWord.get("investigate") ?? 0}.`);
  const p = profile(recs);
  const b = profile(baseline);
  out.push("", `## Against the baseline (step 8, not gated)`, "", `### took (share of all think() calls, and of labelled ones)`, "", ...mixTable("took", p.took, b.took, [p.thinks, b.thinks]));
  out.push("", `### meant (share of all spoken lines, and of labelled ones)`, "", ...mixTable("meant", p.meant, b.meant, [p.speeches, b.speeches]));
  out.push(
    "",
    "### Other measures",
    "",
    "| | Baseline | This check |",
    "|---|---|---|",
    `| Words per spoken line (mean) | ${b.wordsPerLine.toFixed(1)} | ${p.wordsPerLine.toFixed(1)} |`,
    `| Block 6 lines per character call (mean) | ${b.notebookLines.toFixed(2)} | ${p.notebookLines.toFixed(2)} |`,
    `| Knowledge-check verdicts | ${fmt(b.verdicts)} | ${fmt(p.verdicts)} |`,
    `| Calls retried, by kind | ${fmt(b.retries)} | ${fmt(p.retries)} |`,
    `| Calls repaired (logged repair, alias, or fence), by kind | ${fmt(b.repaired)} | ${fmt(p.repaired)} |`,
    `| Rate-limit retries | ${b.rateLimitRetries} | ${p.rateLimitRetries} |`,
    `| Memory-pass repairs | ${b.memoryRepairs} | ${p.memoryRepairs} |`,
  );
  return { text: out.join("\n") + "\n", promptHits: promptHits.length, outputHits: outputHits.length, midnightRepairs: repaired.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { baseline: { type: "string", multiple: true }, out: { type: "string" } } });
  if (!positionals.length) {
    console.error("Usage: npm run minigame:names -- <records .full.json.gz> --baseline <record> [--baseline <record>] [--out report.md]");
    process.exit(1);
  }
  const r = report(positionals.map(readRec), (values.baseline ?? []).map(readRec));
  if (values.out) writeFileSync(values.out, r.text);
  process.stdout.write(r.text);
  console.error(`prompt hits ${r.promptHits}, output hits ${r.outputHits}, midnight answers not clean ${r.midnightRepairs}`);
}
