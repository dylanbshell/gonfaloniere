// Exports a mini-game record as one watchable file (CC-20261028-08): game-<id>.view.html is the
// replay viewer (tools/viewer/viewer.html) with the replay variant of the record embedded, so it
// opens by double-click with no server and no network. The replay variant is TD's (Game Record &
// Export): no model calls, no static prefixes, no seeds, no provider details; it is built by the
// viewer's own loader, so the viewer, this export, and the tests share one loader. The post-game
// checks the runner wrote beside the record (game-<id>.checks.json) are carried along.
//
//   npm run minigame:view -- results/minigame/game-<id>.full.json.gz [more records] [--out <dir>]
//
// Never written: API keys or environment values. The export is scanned for key-shaped strings and
// for the value of every secret-looking environment variable, and refuses to write if it finds one.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { runInNewContext } from "node:vm";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

export const VIEWER = "tools/viewer/viewer.html";
const EMBED_OPEN = '<script type="application/json" id="embedded-record">';

export interface ViewerLoader {
  load(record: unknown, checks?: unknown): { steps: unknown[]; missing: string[]; neverSpoke: string[]; cast: string[] };
  toReplay(record: unknown, checks?: unknown): Record<string, unknown>;
  notebookViews(record: unknown): unknown[];
}

/** The loader script from the viewer, run outside the browser. */
export function viewerLoader(html = readFileSync(VIEWER, "utf8")): ViewerLoader {
  const m = html.match(/<script id="loader">([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`${VIEWER}: no <script id="loader">`);
  const ctx: { GonfaloniereLoader?: ViewerLoader } = {};
  runInNewContext(m[1]!, ctx);
  return ctx.GonfaloniereLoader!;
}

/** A record from disk: .json.gz or .json. */
export function readRecord(path: string): Record<string, unknown> {
  const bytes = readFileSync(path);
  return JSON.parse((bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes).toString("utf8"));
}

/** The runner's post-game checks beside a record, if any. */
export function checksFor(path: string): Record<string, unknown> | null {
  const p = path.replace(/\.full\.json(\.gz)?$/, ".checks.json");
  return p !== path && existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : null;
}

const KEY_PATTERNS: [string, RegExp][] = [
  ["OpenRouter key", /sk-or-v1-[0-9a-f]{20,}/],
  ["Anthropic key", /sk-ant-[A-Za-z0-9_-]{20,}/],
  ["OpenAI-style key", /\bsk-(proj-)?[A-Za-z0-9_-]{20,}/],
  ["Tinker key", /\btml-[A-Za-z0-9_-]{20,}/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["bearer token", /Bearer\s+[A-Za-z0-9._-]{20,}/],
  ["1Password reference", /op:\/\/[^\s"']+/],
  ["URL with a password", /[a-z]+:\/\/[^\s/:@"']+:[^\s/@"']+@/],
  // A long run of letters and digits, mixing upper, lower, and digits: the shape of most keys.
  ["key-shaped token", /\b(?=[A-Za-z0-9]*[A-Z])(?=[A-Za-z0-9]*[a-z])(?=[A-Za-z0-9]*[0-9])[A-Za-z0-9]{32,}\b/],
];

/** Key-shaped strings in a text, and any secret-looking environment value that appears in it. */
export function keyFindings(text: string, env: NodeJS.ProcessEnv = process.env): string[] {
  const found = KEY_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
  for (const [name, value] of Object.entries(env)) {
    if (!value || value.length < 8 || !/KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL/i.test(name)) continue;
    if (text.includes(value)) found.push(`the value of ${name}`);
  }
  return found;
}

/** The viewer page with one replay record embedded. `<` is escaped so no text can close the script. */
export function viewHtml(replay: object, html = readFileSync(VIEWER, "utf8")): string {
  if (!html.includes(EMBED_OPEN + "</script>")) throw new Error(`${VIEWER}: no empty embedded-record script`);
  const json = JSON.stringify(replay).replace(/</g, "\\u003c");
  const id = String((replay as { header?: { game_id?: string } }).header?.game_id ?? "game");
  return html.replace(EMBED_OPEN + "</script>", () => EMBED_OPEN + json + "</script>").replace("<title>Gonfaloniere replay</title>", () => `<title>${id.replace(/[<&>]/g, "")}: Gonfaloniere replay</title>`);
}

/** Writes game-<id>.view.html for one record; returns its path, size, and what the viewer couldn't find. */
export function exportView(recordPath: string, outDir = dirname(recordPath)): { path: string; bytes: number; missing: string[]; neverSpoke: string[] } {
  const html = readFileSync(VIEWER, "utf8");
  const loader = viewerLoader(html);
  const replay = loader.toReplay(readRecord(recordPath), checksFor(recordPath));
  const model = loader.load(replay);
  const out = viewHtml(replay, html);
  const leaks = keyFindings(out);
  if (leaks.length) throw new Error(`${recordPath}: not exported, the view would contain ${[...new Set(leaks)].join(", ")}`);
  const id = String((replay.header as { game_id?: string }).game_id ?? basename(recordPath).replace(/^game-|\.full\.json(\.gz)?$/g, ""));
  mkdirSync(outDir, { recursive: true });
  const path = join(outDir, `game-${id}.view.html`);
  writeFileSync(path, out);
  return { path, bytes: Buffer.byteLength(out), missing: model.missing, neverSpoke: model.neverSpoke };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" } } });
  if (!positionals.length) {
    console.error("Usage: npm run minigame:view -- <game record .full.json.gz> [more] [--out <dir>]");
    process.exit(1);
  }
  for (const p of positionals) {
    const r = exportView(p, values.out);
    console.log(`${r.path}  ${(r.bytes / 1024).toFixed(0)} KB${r.missing.length ? `  not in this record: ${r.missing.join("; ")}` : ""}`);
  }
}
