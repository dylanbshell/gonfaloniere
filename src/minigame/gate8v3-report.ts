// Gate 8 v3's report (CC-20261107-05): per recorder, from the fixed list and the judge's matches, with no
// model calls. Also draws the hand-check samples (fixed seed) and applies hand-check corrections.
//
//   npx tsx src/minigame/gate8v3-report.ts <records> [--corrections results/gate8v3/corrections.json]

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { formatLine } from "./engine.ts";
import { convTurns, entriesOf, OUT, readRec, RECORDERS, type Item, type Rec } from "./gate8v3.ts";

const { values: opts, positionals } = parseArgs({ allowPositionals: true, options: { corrections: { type: "string" } } });

const SYSTEM_KINDS = new Set(["star-pass", "claims-pass", "thought-pass", "knowledge-check", "sweep-reask", "perception-pass"]);

interface Match {
  convTurns: { key: string; matches: { item: string; entry: string | null }[]; unmatched: { entry: string; verdict: string; kind: string | null; reason: string }[] }[];
  beliefs: { turn: number; unsupported: { belief: string; reason: string }[] }[];
}
/** Hand-check results: judge errors found, by recorder, game, and ID. */
interface Corrections {
  /** An "invented" flag that is wrong: the entry is valid (it becomes valid but unlisted). */
  notInvented?: { recorder: string; game: string; entry: string; why: string }[];
  /** A "missed" item that an entry did capture. */
  captured?: { recorder: string; game: string; item: string; entry: string; why: string }[];
  /** A list item that isn't a valid item by the definitions (dropped from the list for every recorder). */
  notItems?: { game: string; item: string; why: string }[];
}

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
function sample<T>(xs: T[], n: number, seed: number): T[] {
  const r = mulberry32(seed);
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a.slice(0, n);
}

const count = (xs: string[]) => xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map<string, number>());
const fmt = (m: Map<string, number>) => [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "none";

function main(): void {
  const corr: Corrections = opts.corrections && existsSync(opts.corrections) ? JSON.parse(readFileSync(opts.corrections, "utf8")) : {};
  const notItem = new Set((corr.notItems ?? []).map((x) => `${x.game}|${x.item}`));
  const notInvented = new Set((corr.notInvented ?? []).map((x) => `${x.recorder}|${x.game}|${x.entry}`));
  const capturedFix = new Map((corr.captured ?? []).map((x) => [`${x.recorder}|${x.game}|${x.item}`, x.entry]));

  type Row = { game: string; listed: number; captured: number; missed: Map<string, number>; invented: Map<string, number>; inventedN: number; unlistedStar: number; unlisted10d: number; unsupported: number; drops: Map<string, number>; reasks: number; cost: number; calls: Map<string, number> };
  const rows = new Map<string, Row[]>(RECORDERS.map((r) => [r.name, []]));
  const hand: Record<string, unknown> = {};
  const misses: Record<string, unknown[]> = {};
  const inventedFlags: Record<string, unknown[]> = {};
  const listChecks: unknown[] = [];
  const kc = new Map<string, Record<string, unknown>>();

  for (const [gi, path] of positionals.entries()) {
    const base = readRec(path);
    const game = base.header.game_id;
    const dir = join(OUT, game);
    const fixed = JSON.parse(readFileSync(join(dir, "list.json"), "utf8")) as { convTurns: { key: string; items: Item[] }[] };
    const items = fixed.convTurns.flatMap((c) => c.items.map((i) => ({ ...i, key: c.key }))).filter((i) => !notItem.has(`${game}|${i.id}`));
    const cts = new Map(convTurns(base).map((c) => [c.key, c]));
    const lineText = (ids: string[]) => ids.map((id) => base.lines.find((l) => l.id === id)).filter(Boolean).map((l) => formatLine(l!)).join(" / ");
    // 10 list items per game, for checking the list against the transcript.
    for (const i of sample(items, 10, 1000 + gi)) listChecks.push({ game, item: i.id, type: i.type, speaker: i.speaker, description: i.description, lines: i.lines.map((id) => `[${id}] ${lineText([id])}`), context: cts.get(i.key)!.context.map((l) => `[${l.id}] ${formatLine(l)}`) });
    for (const r of RECORDERS) {
      const rec: Rec = readRec(r.path(path));
      const m = JSON.parse(readFileSync(join(dir, `match-${r.name}.json`), "utf8")) as Match;
      const byKey = new Map(m.convTurns.map((c) => [c.key, c]));
      const entries = new Map(rec.memory.entries.map((e) => [e.id, e]));
      let captured = 0;
      const missed: (Item & { key: string })[] = [];
      for (const i of items) {
        const hit = byKey.get(i.key)?.matches.find((x) => x.item === i.id)?.entry ?? capturedFix.get(`${r.name}|${game}|${i.id}`) ?? null;
        if (hit) captured++;
        else missed.push(i);
      }
      const unmatched = m.convTurns.flatMap((c) => c.unmatched.map((u) => ({ ...u, key: c.key })));
      // An entry the hand-check found valid moves from invented to valid but unlisted.
      const inv = unmatched.filter((u) => u.verdict === "invented" && !notInvented.has(`${r.name}|${game}|${u.entry}`));
      const unl = unmatched.filter((u) => u.verdict !== "invented" || notInvented.has(`${r.name}|${game}|${u.entry}`));
      const srcOf = (id: string) => entries.get(id)?.source ?? "?";
      const sysCalls = rec.calls.filter((c) => SYSTEM_KINDS.has(c.kind));
      rows.get(r.name)!.push({
        game,
        listed: items.length,
        captured,
        missed: count(missed.map((i) => i.type)),
        invented: count(inv.map((u) => `${entries.get(u.entry)?.type ?? "?"} (${u.kind ?? "?"})`)),
        inventedN: inv.length,
        unlistedStar: unl.filter((u) => srcOf(u.entry) === "10a").length,
        unlisted10d: unl.filter((u) => srcOf(u.entry) === "10d").length,
        unsupported: m.beliefs.reduce((a, b) => a + b.unsupported.length, 0),
        drops: count(rec.memory.dropped.map((d) => d.pass)),
        reasks: (rec.memory.notes ?? []).filter((n) => n.kind === "sweep re-ask").length,
        cost: r.name === "deepseek" ? sysCalls.reduce((a, c) => a + c.costUsd, 0) : (rec.summary.replay?.cost_usd ?? 0),
        calls: count(sysCalls.filter((c) => c.attempt === 1).map((c) => c.kind)),
      });
      if (r.name !== "deepseek") {
        (misses[r.name] ??= []).push(...missed.map((i) => ({ game, item: i.id, type: i.type, speaker: i.speaker, description: i.description, lines: i.lines.map((id) => `[${id}] ${lineText([id])}`), entries: entriesOf(rec, cts.get(i.key)!).filter((e) => e.source === "10a").map((e) => `[${e.id}] ${e.type} ${e.speaker}: ${e.summary}`) })));
        (inventedFlags[r.name] ??= []).push(...inv.map((u) => { const e = entries.get(u.entry); return { game, entry: u.entry, kind: u.kind, reason: u.reason, recorded: e ? `${e.type} (${e.source}); speaker ${e.speaker}; line ${e.line ?? e.lines[0]}: ${e.summary}${e.quote ? ` ("${e.quote}")` : ""}` : "?", line: e ? lineText([e.line ?? e.lines[0]!]) : "?", context: e?.context ? lineText(e.context) : "" }; }));
      }
      for (const k of rec.knowledge_checks) {
        const id = `${game}|${k.character}|${k.fact}`;
        const ev = (k.verdict?.evidence ?? []).map((x) => { const e = entries.get(x); const b = rec.memory.beliefs.find((y) => y.id === x); return e ? `${x}: ${e.summary}` : b ? `${x}: ${b.statement}` : x; });
        (kc.get(id) ?? kc.set(id, {}).get(id)!)[r.name] = { verdict: k.verdict?.verdict ?? "none", told_by: k.verdict?.told_by ?? [], evidence: ev, reasoning: k.verdict?.reasoning ?? "" };
      }
    }
  }
  // Hand-check samples, fixed seeds: 20 invented flags and 20 misses per Claude recorder.
  for (const name of ["haiku", "sonnet"]) hand[name] = { invented: sample(inventedFlags[name] ?? [], 20, 7), missed: sample(misses[name] ?? [], 20, 11) };
  writeFileSync(join(OUT, "handcheck.json"), JSON.stringify({ ...hand, list: listChecks }, null, 1));

  const out: string[] = [];
  const sum = (rs: Row[], k: "listed" | "captured" | "inventedN" | "unlistedStar" | "unlisted10d" | "unsupported" | "reasks" | "cost") => rs.reduce((a, r) => a + r[k], 0);
  const merge = (rs: Row[], k: "missed" | "invented" | "drops" | "calls") => rs.reduce((m, r) => { for (const [x, v] of r[k]) m.set(x, (m.get(x) ?? 0) + v); return m; }, new Map<string, number>());
  const results: Record<string, { captured: number; inventedPerGame: number; costPerGame: number }> = {};
  for (const r of RECORDERS) {
    const rs = rows.get(r.name)!;
    const listed = sum(rs, "listed");
    const cap = sum(rs, "captured");
    results[r.name] = { captured: listed ? cap / listed : 0, inventedPerGame: sum(rs, "inventedN") / rs.length, costPerGame: sum(rs, "cost") / rs.length };
    out.push(
      `## ${r.label}`,
      `- ★ captured: ${cap} of ${listed} (${((100 * cap) / listed).toFixed(1)}%); by game ${rs.map((x) => `${x.captured}/${x.listed}`).join(", ")}`,
      `- missed by kind: ${fmt(merge(rs, "missed"))}`,
      `- invented: ${sum(rs, "inventedN")} (${(sum(rs, "inventedN") / rs.length).toFixed(2)} per game); by kind ${fmt(merge(rs, "invented"))}`,
      `- valid but unlisted: ★ ${sum(rs, "unlistedStar")}, claims and denials ${sum(rs, "unlisted10d")}`,
      `- unsupported beliefs: ${sum(rs, "unsupported")}`,
      `- code drops: ${fmt(merge(rs, "drops"))}; sweep re-asks ${sum(rs, "reasks")}`,
      `- recorder cost: $${sum(rs, "cost").toFixed(4)} for ${rs.length} games ($${(sum(rs, "cost") / rs.length).toFixed(4)} per game); first-attempt calls ${fmt(merge(rs, "calls"))}`,
      "",
    );
  }
  const disagree = [...kc].filter(([, v]) => new Set(Object.values(v).map((x) => (x as { verdict: string }).verdict)).size > 1);
  out.push(`## Knowledge checks where the recorders disagree (${disagree.length} of ${kc.size})`);
  for (const [id, v] of disagree) {
    out.push(`- ${id}`);
    for (const [name, x] of Object.entries(v) as [string, { verdict: string; told_by: string[]; evidence: string[] }][]) out.push(`  - ${name}: ${x.verdict}${x.told_by.length ? ` (told by ${x.told_by.join(", ")})` : ""}; evidence ${x.evidence.join(" | ") || "none"}`);
  }
  writeFileSync(join(OUT, `report${opts.corrections ? "-corrected" : ""}.md`), out.join("\n") + "\n");
  writeFileSync(join(OUT, `results${opts.corrections ? "-corrected" : ""}.json`), JSON.stringify(results, null, 1));
  console.log(out.join("\n"));
  console.log(JSON.stringify(results));
  console.log(`Hand-check samples: ${join(OUT, "handcheck.json")}; judge call logs: ${readdirSync("results/claude-credit").filter((f) => f.startsWith("judge-gate8v3-")).length} files`);
}

main();
