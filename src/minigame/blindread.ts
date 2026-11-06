// Scores a marked blind read (read.md from minigame:register, or the voice check's) against its key
// (CC-20261029-01). No model calls. A mark is a ticked box, "- [x] …", under a numbered item; the key
// says which side each number came from.
//
//   npm run minigame:score -- --read <read.md> --key <key.md>

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";

export type Marks = Map<string, Map<number, string[]>>;
type Keyed = Map<string, Map<number, string>>;

/** Each section's ticked boxes by item number, from read.md. A section is a "## " heading. */
export function readMarks(md: string): Marks {
  const out: Marks = new Map();
  let section = "";
  let item = 0;
  for (const line of md.split("\n")) {
    const h = line.match(/^## (.+)$/);
    if (h) { section = h[1]!.trim(); item = 0; out.set(section, new Map()); continue; }
    const n = line.match(/^\*\*(\d+)\.\*\*/);
    if (n) { item = Number(n[1]); out.get(section)?.set(item, []); continue; }
    const box = line.match(/^- \[([ xX])\] (.+)$/);
    if (box && item && box[1] !== " ") out.get(section)!.get(item)!.push(box[2]!.trim());
  }
  return out;
}

/** The side of each item number per section, from key.md ("## Spoken lines (…)" tables). */
export function readKey(md: string): Keyed {
  const out: Keyed = new Map();
  let section = "";
  for (const line of md.split("\n")) {
    const h = line.match(/^## (.+?)(?: \(.*\))?$/);
    if (h) { section = h[1]!.trim(); out.set(section, new Map()); continue; }
    const row = line.match(/^\| (\d+) \| (.+?) \|/);
    if (row && section) out.get(section)!.set(Number(row[1]), row[2]!.replace(/\*/g, "").trim());
  }
  return out;
}

/** Marked counts per section, side, and box. */
export function score(marks: Marks, key: Keyed) {
  const out: { section: string; sides: { side: string; items: number; marked: Record<string, number[]> }[] }[] = [];
  for (const [section, sides] of key) {
    const m = marks.get(section);
    if (!m) throw new Error(`read.md has no section "${section}"`);
    const bySide = new Map<string, { side: string; items: number; marked: Record<string, number[]> }>();
    for (const [n, side] of sides) {
      if (!m.has(n)) throw new Error(`read.md has no item ${n} under "${section}"`);
      if (!bySide.has(side)) bySide.set(side, { side, items: 0, marked: {} });
      const s = bySide.get(side)!;
      s.items++;
      for (const box of m.get(n)!) (s.marked[box] ??= []).push(n);
    }
    out.push({ section, sides: [...bySide.values()] });
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { read: { type: "string" }, key: { type: "string" } } });
  if (!values.read || !values.key) {
    console.error("Usage: npm run minigame:score -- --read <read.md> --key <key.md>");
    process.exit(1);
  }
  const s = score(readMarks(readFileSync(values.read, "utf8")), readKey(readFileSync(values.key, "utf8")));
  console.log(JSON.stringify(s, null, 2));
}
