// Il Notaio's guard (TD v0.51, Player Interface › The screen › Il Notaio's reading, The guard; CC-20261114-19,
// #146). The model is given only numbered lines and writes one sentence per line in reported speech; code
// checks every sentence against that sentence's own line, and a sentence that fails any check is replaced by
// code's plain version of the same line (G9), never dropped. Every check is exact and deterministic. The
// words the checks allow live in the setting pack (notaio-guard.json), the plain versions in notaio.json.

import { ALIASES, type CharacterName } from "../game/roster.ts";
import { notaioGuard, say } from "../setting/pack.ts";
import { parseJson } from "../output/json.ts";

/** One line as the model is given it: its number, who spoke it, and to whom (the player, a guest, or no one). */
export interface GuardLine {
  n: number;
  speaker: string;
  /** The addressee's full name, or null. The player is never named: see `toPlayer`. */
  addressee: string | null;
  /** Said to the player (by the addressee field, or in a Colloquio with them). */
  toPlayer: boolean;
  /** The line as spoken. */
  words: string;
}

export type Check = "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";

/** One line's outcome: the sentence shown, whether it's the model's, and the checks it failed (none when shown). */
export interface GuardVerdict {
  line: number;
  text: string;
  model: boolean;
  /** The model's sentence for this line, as written, or null if there was none. */
  wrote: string | null;
  failed: Check[];
}

/** TD G7: at most 40 quoted words a sentence; G9: a line of 40 words or fewer is quoted whole. */
export const QUOTED_MAX = 40;

/** TD G5: a span starts and ends at the line's ends or one of these. */
const CLAUSE_MARKS = ".!?;:,—";

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/** Words as G6 counts them: letters and digits (an apostrophe inside a word kept), lower case. */
const words = (s: string) => (norm(s).match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) ?? []).map((w) => w.toLowerCase());

/** A guest's full name and aliases (setting.json), longest first. */
export const namesOf = (name: string): string[] => [name, ...(ALIASES[name as CharacterName] ?? [])].sort((a, b) => b.length - a.length);

/** The setting's word for the player as an addressee. */
const you = () => say("notaio", "reading.you");

/** How the line is given to the model (TD's `{lines}`): `{n}. {speaker}: "{words}"`, or with `, to {addressee}`. */
export function promptLine(l: GuardLine): string {
  const to = l.toPlayer ? you() : l.addressee;
  return to ? say("notaio", "reading.lineTo", { n: l.n, speaker: l.speaker, addressee: to, words: l.words }) : say("notaio", "reading.line", { n: l.n, speaker: l.speaker, words: l.words });
}

/** The clause marks' positions in a normalized text: where a clause may start or end. */
const isMark = (ch: string | undefined) => ch !== undefined && CLAUSE_MARKS.includes(ch);

const MARK = new RegExp(`[${CLAUSE_MARKS}]`);

/**
 * G5's negation rule: does the clause right after `end` in `line` open with a negating word, after any
 * linking words? Only where a clause ends at `end`: a clause mark just before it, or just after it.
 */
function negatedAfter(line: string, end: number): boolean {
  const g = notaioGuard();
  let rest = line.slice(end).replace(/^[\s"'“”’]*/, "");
  if (isMark(rest[0])) rest = rest.slice(1);
  else if (!isMark(line.slice(0, end).trimEnd().at(-1))) return false;
  const next = words(rest);
  let i = 0;
  while (i < next.length && g.linking.includes(next[i]!)) i++;
  return i < next.length && g.negating.includes(next[i]!);
}

/** G4 and G5 for one quoted span against its line: the problems, or none. */
function spanProblems(span: string, line: string): Check[] {
  if (/…|\.\.\./.test(span)) return ["G4"];
  const q = norm(span).replace(/^["'\s]+|["'\s]+$/g, "").replace(/[.,;:!?]+$/, "").trim();
  const l = norm(line);
  if (!q) return ["G4"];
  const at: number[] = [];
  for (let i = l.indexOf(q); i >= 0; i = l.indexOf(q, i + 1)) at.push(i);
  if (!at.length) return ["G4"];
  const whole = q === l.replace(/[.,;:!?]+$/, "").trim();
  const ok = at.some((i) => {
    const before = l.slice(0, i).trimEnd();
    const after = l.slice(i + q.length);
    const starts = !before || isMark(before.at(-1)) || /^["']$/.test(before.at(-1)!);
    const ends = !after.trim() || isMark(after.trimStart()[0]);
    const long = whole || words(q).length >= 3;
    return starts && ends && long && !negatedAfter(l, i + q.length);
  });
  return ok ? [] : ["G5"];
}

/** The double-quoted spans of a sentence (straight or curly), with the text outside them; null if a quote is left open. */
function quotes(sentence: string): { spans: string[]; outside: string[] } | null {
  const spans: string[] = [];
  const outside: string[] = [];
  let rest = sentence;
  for (;;) {
    const open = rest.search(/["“”]/);
    if (open < 0) {
      outside.push(rest);
      return { spans, outside };
    }
    const close = rest.slice(open + 1).search(/["“”]/);
    if (close < 0) return null;
    outside.push(rest.slice(0, open));
    spans.push(rest.slice(open + 1, open + 1 + close));
    rest = rest.slice(open + 2 + close);
  }
}

/** True if `ws` starts at `i` with one of these names, as words: returns how many words it took, or 0. */
function nameAt(ws: string[], i: number, names: string[]): number {
  for (const n of names) {
    const nw = words(n);
    if (nw.length && nw.every((w, k) => ws[i + k] === w)) return nw.length;
  }
  return 0;
}

/** Every check G2–G7 on one sentence against its own line: the checks it fails, in order (none: it passes). */
export function checkSentence(sentence: string, l: GuardLine): Check[] {
  const g = notaioGuard();
  const failed = new Set<Check>();
  const text = sentence.trim();
  // G2: it begins with the speaker, by full name or an alias.
  const speakerNames = namesOf(l.speaker);
  const lead = speakerNames.find((n) => norm(text).startsWith(norm(n)) && !/[\p{L}\p{N}]/u.test(norm(text).charAt(norm(n).length)));
  if (!lead) failed.add("G2");
  const q = quotes(text);
  if (!q) {
    failed.add("G4");
    failed.add("G6");
    return [...failed].sort();
  }
  // G4 and G5: one or two spans, each a whole clause of this line, word for word.
  if (q.spans.length < 1 || q.spans.length > 2) failed.add("G4");
  for (const s of q.spans) for (const p of spanProblems(s, l.words)) failed.add(p);
  // G7: at most 40 quoted words.
  if (q.spans.reduce((n, s) => n + words(s).length, 0) > QUOTED_MAX) failed.add("G7");
  // G3 and G6: the words outside the quotes.
  const v = g.verbs;
  const verbWords = [v.said, v.told, v.asked];
  const segments = q.outside.map(words);
  const all = segments.flat();
  const used = all.filter((w) => verbWords.includes(w));
  if (used.length !== 1) failed.add("G3");
  const verb = used.length === 1 ? used[0]! : null;
  if (verb === v.told) {
    // `told` only with an addressee, and followed by them.
    const to = l.toPlayer ? [you()] : l.addressee ? namesOf(l.addressee) : [];
    const i = all.indexOf(v.told);
    if (!to.length || !nameAt(all, i + 1, to)) failed.add("G3");
  }
  if (verb === v.asked && !q.spans.at(-1)?.trim().endsWith("?")) failed.add("G3");
  const allowedNames = [...speakerNames, ...(l.addressee && !l.toPlayer ? namesOf(l.addressee) : [])];
  segments.forEach((seg, k) => {
    for (let i = 0; i < seg.length; ) {
      const took = nameAt(seg, i, allowedNames);
      if (took) {
        i += took;
        continue;
      }
      const w = seg[i]!;
      const ok = w === verb || g.small.includes(w) || (g.betweenQuotes.includes(w) && q.spans.length === 2 && k === 1);
      if (!ok) failed.add("G6");
      i++;
    }
  });
  return [...failed].sort();
}

/**
 * G9's words: the whole line if it's 40 words or fewer; otherwise its first sentence, extended clause by
 * clause while the next clause opens with a negating word (G5's rule), so the cut can't flip its meaning.
 */
export function plainWords(line: string): string {
  const text = line.trim();
  if (words(text).length <= QUOTED_MAX) return text;
  let cut = text.match(/^.*?[.!?](?=\s|$)/s)?.[0].length ?? text.length;
  while (cut < text.length && negatedAfter(text, cut)) {
    // Take in the next clause, and its mark if it ends a sentence.
    const start = cut + text.slice(cut).match(/^[\s"'“”’]*[.!?;:,—]?/)![0].length;
    const rel = text.slice(start).search(MARK);
    cut = rel < 0 ? text.length : start + rel + (/[.!?]/.test(text[start + rel]!) ? 1 : 0);
  }
  return text.slice(0, cut).trim();
}

/** G9: code's plain version of a line, from notaio.json. */
export function fallback(l: GuardLine): string {
  const w = plainWords(l.words);
  const to = l.toPlayer ? you() : l.addressee;
  return to ? say("notaio", "reading.fallbackTo", { speaker: l.speaker, addressee: to, words: w }) : say("notaio", "reading.fallback", { speaker: l.speaker, words: w });
}

/**
 * G1: the reply's shape. Null when it isn't JSON at all (a parse failure, which is repaired once); otherwise
 * each line's sentence, or null where there's no usable one (missing, duplicated, with extra keys, out of
 * order, or under extra top-level keys).
 */
export function sentencesOf(raw: string, n: number): (string | null)[] | null {
  const j = parseJson(raw);
  if (j.error) return null;
  const none = Array.from({ length: n }, () => null);
  const o = j.json as { sentences?: unknown } | null;
  if (!o || typeof o !== "object" || Array.isArray(o) || Object.keys(o).join() !== "sentences" || !Array.isArray(o.sentences)) return none;
  const items = o.sentences as unknown[];
  const shaped = items.map((x) => (x && typeof x === "object" && !Array.isArray(x) && Object.keys(x).sort().join() === "line,text" && Number.isInteger((x as { line: unknown }).line) && typeof (x as { text: unknown }).text === "string" ? (x as { line: number; text: string }) : null));
  const nums = shaped.map((x) => x?.line ?? NaN);
  if (nums.some((x, i) => i > 0 && !(x > nums[i - 1]!))) return none;
  return none.map((_, i) => {
    const hits = shaped.filter((x) => x?.line === i + 1);
    return hits.length === 1 ? hits[0]!.text : null;
  });
}

/** G1–G9 over one reply: every line's verdict, in order. `raw` null: no usable reply, so every line falls back. */
export function guard(raw: string | null, lines: GuardLine[]): GuardVerdict[] {
  const got = raw === null ? null : sentencesOf(raw, lines.length);
  return lines.map((l, i) => {
    const wrote = got?.[i] ?? null;
    const failed: Check[] = wrote === null ? ["G1"] : checkSentence(wrote, l);
    return failed.length ? { line: l.n, text: fallback(l), model: false, wrote, failed } : { line: l.n, text: wrote!.trim(), model: true, wrote, failed };
  });
}
