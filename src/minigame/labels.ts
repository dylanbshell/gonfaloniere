// Took readings by label, written out in full for reading by eye (CC-20261029-01). No model calls.
// For each think() thought with the label: the character, the speaker, the full line, the quoted words,
// the character's thought, and whether the attachment rule stored it as a reading or ignored it.
//
//   npm run minigame:labels -- --record <record> [--record …] --label admission [--label insult]
//     [--sample pressure=10@0.27] [--seed 20261029] [--title "…"] --out <file.md>
//
// --label writes every reading with that label, side by side (a side is a TD version). --sample
// draws n at random from the readings with that label on one TD version. The thoughts counted are the
// register check's: think() calls, closing thinks included, that were asked for a label.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { readRecord } from "./view.ts";

type Line = { id: string; turn: number; conversation: string; kind: string; speaker: string | null; text: string };
type Thought = { id: string; turn: number; character: string; call: string; text: string; conversation?: string; closing?: boolean; took?: string | null; took_target?: string; target_line?: string | null; after_line?: string; words?: string | null; words_log?: Record<string, unknown> };
type Rec = {
  header: { game_id: string; seed: number; docs: { technicalDesign: string } };
  lines: Line[];
  thoughts: Thought[];
  memory: { readings?: { id: string; thought: string | null }[]; label_log?: { thought: string; reason: string; standing?: string }[] };
};

export type Reading = { td: string; game: string; seed: number; thought: Thought; line: Line | null; stored: string };

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Every labelled think() thought in a record, with its line and what the attachment rule did with it. */
export function readingsOf(r: Rec): Reading[] {
  const lines = new Map(r.lines.map((l) => [l.id, l]));
  const stored = new Map((r.memory.readings ?? []).filter((x) => x.thought).map((x) => [x.thought!, x.id]));
  const logged = new Map((r.memory.label_log ?? []).map((x) => [x.thought, x]));
  return r.thoughts
    .filter((t) => t.call === "think" && t.took_target !== "none" && t.took)
    .map((t) => {
      const lg = logged.get(t.id);
      const st = stored.get(t.id) ? `stored as reading ${stored.get(t.id)}` : lg ? `not stored: ${lg.reason}${lg.standing ? ` (reading ${lg.standing} stands)` : ""}` : "not stored";
      return { td: r.header.docs.technicalDesign, game: r.header.game_id, seed: r.header.seed, thought: t, line: lines.get(t.target_line ?? t.after_line ?? "") ?? null, stored: st };
    });
}

const one = (s: string) => s.replace(/\s+/g, " ").trim();

function wordsNote(x: Reading): string {
  const w = x.thought.words;
  if (!w) return "none given";
  const inLine = x.line && one(x.line.text).toLowerCase().includes(one(w).replace(/^[…."'\s]+|[…."'\s]+$/g, "").toLowerCase());
  const log = x.thought.words_log ?? {};
  const why = log.wrong_line ? `; matched line ${log.wrong_line} instead` : log.same_speaker ? `; matched the same speaker's earlier line ${log.same_speaker}` : log.fallback ? `; fallback: ${log.fallback}` : "";
  return `“${one(w)}”${inLine ? "" : " (not found in this line)"}${why}`;
}

export function readingMd(x: Reading): string {
  const t = x.thought;
  const l = x.line;
  return [
    `#### ${t.id}: ${t.character}, turn ${t.turn}, ${t.conversation ?? l?.conversation ?? "?"}${t.closing ? " (closing think)" : ""}`,
    "",
    `- Game: ${x.game} (seed ${x.seed})`,
    `- Character: ${t.character}`,
    `- Speaker: ${l ? (l.kind === "notaio" ? "Il Notaio" : l.speaker ?? l.kind) : "?"}${l ? ` (line ${l.id}${t.target_line && t.after_line && t.target_line !== t.after_line ? `, an earlier line; the thought followed ${t.after_line}` : ""})` : ""}`,
    `- Line: ${l ? one(l.text) : "(no line)"}`,
    `- Quoted words: ${wordsNote(x)}`,
    `- Thought: ${one(t.text)}`,
    `- ${x.stored[0]!.toUpperCase()}${x.stored.slice(1)}`,
    "",
  ].join("\n");
}

export function labelsMd(recs: Rec[], opts: { labels: string[]; samples: { label: string; n: number; td: string }[]; seed: number; title: string; intro?: string }): string {
  const all = recs.flatMap(readingsOf);
  const tds = [...new Set(all.map((x) => x.td))].sort((a, b) => Number(a.split(".")[1]) - Number(b.split(".")[1]));
  const games = (td: string) => recs.filter((r) => r.header.docs.technicalDesign === td).map((r) => `${r.header.game_id} (seed ${r.header.seed})`).join(", ");
  const out = [`# ${opts.title}`, "", ...(opts.intro ? [opts.intro, ""] : []), ...tds.map((td) => `- TD v${td}: ${games(td)}, ${all.filter((x) => x.td === td).length} labelled think() thoughts`), ""];
  for (const label of opts.labels) {
    out.push(`## took: ${label}`, "", `| TD | Readings | Share | Stored |`, "|---|---|---|---|");
    for (const td of tds) {
      const side = all.filter((x) => x.td === td);
      const xs = side.filter((x) => x.thought.took === label);
      out.push(`| v${td} | ${xs.length} | ${side.length ? ((100 * xs.length) / side.length).toFixed(1) : "0.0"}% | ${xs.filter((x) => x.stored.startsWith("stored")).length} |`);
    }
    out.push("");
    for (const td of tds) {
      const xs = all.filter((x) => x.td === td && x.thought.took === label);
      out.push(`### TD v${td}: ${xs.length}`, "", ...(xs.length ? xs.map(readingMd) : ["None.", ""]));
    }
  }
  const rand = mulberry32(opts.seed);
  for (const s of opts.samples) {
    const pool = all.filter((x) => x.td === s.td && x.thought.took === s.label);
    const a = pool.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    const picked = a.slice(0, s.n).sort((x, y) => x.game.localeCompare(y.game) || Number(x.thought.id.slice(1)) - Number(y.thought.id.slice(1)));
    out.push(`## took: ${s.label}, ${picked.length} at random from TD v${s.td}`, "", `Drawn with seed ${opts.seed} from ${pool.length} readings.`, "", ...picked.map(readingMd));
  }
  return out.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { record: { type: "string", multiple: true }, label: { type: "string", multiple: true }, sample: { type: "string", multiple: true }, seed: { type: "string", default: "20261029" }, title: { type: "string", default: "Took readings by label" }, intro: { type: "string" }, out: { type: "string" } } });
  if (!values.record?.length || !values.out) {
    console.error("Usage: npm run minigame:labels -- --record <record> [--record …] [--label <label> …] [--sample <label>=<n>@<td> …] [--seed N] [--title …] --out <file.md>");
    process.exit(1);
  }
  const samples = (values.sample ?? []).map((s) => {
    const m = s.match(/^(\w+)=(\d+)@([\d.]+)$/);
    if (!m) throw new Error(`--sample ${s}: expected <label>=<n>@<td>, as pressure=10@0.27`);
    return { label: m[1]!, n: Number(m[2]), td: m[3]! };
  });
  const recs = values.record.map((p) => readRecord(p) as unknown as Rec);
  mkdirSync(dirname(values.out), { recursive: true });
  writeFileSync(values.out, labelsMd(recs, { labels: values.label ?? [], samples, seed: Number(values.seed), title: values.title!, intro: values.intro }));
  console.log(`Wrote ${values.out}`);
}
