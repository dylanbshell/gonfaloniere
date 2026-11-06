// Exports a mini-game record as one watchable file (CC-20261028-08): game-<id>.view.html is the
// replay viewer (tools/viewer/viewer.html) with the replay variant of the record embedded, so it
// opens by double-click with no server and no network. The replay variant is TD's (Game Record &
// Export): no model calls, no static prefixes, no seeds, no provider details; it is built by the
// viewer's own loader, so the viewer, this export, and the tests share one loader. The post-game
// checks the runner wrote beside the record (game-<id>.checks.json) are carried along.
//
//   npm run minigame:view -- results/minigame/game-<id>.full.json.gz [more records] [--out <dir>]
//   npm run minigame:view -- results/minigame/game-<id>.full.json.gz --site <url> [--out <dir>]
//
// Every export carries the content credit from scenarios/replay-site.json, in its footer and <head>
// (CC-20261029-04). With --site, one record becomes a folder ready to deploy at that URL: index.html
// with link-preview tags (Open Graph, Twitter, canonical, description) and preview.png, a 1200×630
// screenshot of the viewer a few turns in (src/minigame/preview.ts).
//
// Never written: API keys or environment values. The export is scanned for key-shaped strings and
// for the value of every secret-looking environment variable, and refuses to write if it finds one.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { runInNewContext } from "node:vm";
import { pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import { capturePreview, pngSize, PREVIEW } from "./preview.ts";

export const VIEWER = "tools/viewer/viewer.html";
export const SITE_CONTENT = "scenarios/replay-site.json";
const EMBED_OPEN = '<script type="application/json" id="embedded-record">';
const CREDIT_SLOT = '<footer class="credit" id="credit"></footer>';
const PREVIEW_FILE = "preview.png";
const MAX_PREVIEW_BYTES = 1024 * 1024;

/** The published replay's text: title and description templates, and the content credit. */
export interface SiteContent {
  title: string;
  description: string;
  credit: { text: string; link: string; licenceUrl: string };
}
export function siteContent(path = SITE_CONTENT): SiteContent {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** What a --site export writes into <head>. */
export interface SiteMeta { title: string; description: string; url: string; image: string; imageAlt: string }

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

const attr = (x: string) => x.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The credit as the footer shows it: its licence words link to the licence. */
export function creditHtml(credit: SiteContent["credit"]): string {
  const i = credit.text.indexOf(credit.link);
  const a = (t: string) => `<a href="${attr(credit.licenceUrl)}" rel="license">${attr(t)}</a>`;
  return i < 0 ? a(credit.text) : attr(credit.text.slice(0, i)) + a(credit.link) + attr(credit.text.slice(i + credit.link.length));
}

/** The <head> tags of a --site export, in the order written. */
export function siteHeadTags(meta: SiteMeta): string[] {
  const p = (property: string, content: string) => `<meta property="${property}" content="${attr(content)}">`;
  const n = (name: string, content: string) => `<meta name="${name}" content="${attr(content)}">`;
  return [
    n("description", meta.description),
    `<link rel="canonical" href="${attr(meta.url)}">`,
    p("og:type", "website"),
    p("og:title", meta.title),
    p("og:description", meta.description),
    p("og:url", meta.url),
    p("og:image", meta.image),
    p("og:image:width", String(PREVIEW.width)),
    p("og:image:height", String(PREVIEW.height)),
    p("og:image:alt", meta.imageAlt),
    n("twitter:card", "summary_large_image"),
    n("twitter:title", meta.title),
    n("twitter:description", meta.description),
    n("twitter:image", meta.image),
  ];
}

/**
 * The viewer page with one replay record embedded. `<` is escaped so no text can close the script.
 * The content credit goes in the footer and <head>; with `site`, so do the link-preview tags.
 */
export function viewHtml(replay: object, html = readFileSync(VIEWER, "utf8"), content: SiteContent = siteContent(), site?: SiteMeta): string {
  if (!html.includes(EMBED_OPEN + "</script>")) throw new Error(`${VIEWER}: no empty embedded-record script`);
  if (!html.includes(CREDIT_SLOT)) throw new Error(`${VIEWER}: no empty footer#credit`);
  const json = JSON.stringify(replay).replace(/</g, "\\u003c");
  const id = String((replay as { header?: { game_id?: string } }).header?.game_id ?? "game");
  const title = site ? site.title : `${id.replace(/[<&>]/g, "")}: Gonfaloniere replay`;
  const head = [
    ...(site ? siteHeadTags(site) : []),
    `<link rel="license" href="${attr(content.credit.licenceUrl)}">`,
    `<meta name="dcterms.rights" content="${attr(content.credit.text)}">`,
  ];
  return html
    .replace(EMBED_OPEN + "</script>", () => EMBED_OPEN + json + "</script>")
    .replace("<title>Gonfaloniere replay</title>", () => [`<title>${attr(title)}</title>`, ...head].join("\n"))
    .replace(CREDIT_SLOT, () => `<footer class="credit" id="credit">${creditHtml(content.credit)}</footer>`);
}

const NUMBER_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const words = (n: number) => NUMBER_WORDS[n] ?? String(n);
const capital = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** A site's address as og:url gives it: no #fragment, and a trailing slash so preview.png sits beside the page. */
export function siteUrl(site: string): string {
  const u = new URL(site);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error(`--site: ${site} isn't an http(s) address`);
  u.hash = "";
  if (!u.pathname.endsWith("/")) u.pathname += "/";
  return u.href;
}

/** Title and description from the record: counts only, nothing from the briefings. */
export function siteMeta(replay: Record<string, any>, site: string, content: SiteContent = siteContent()): SiteMeta {
  const header = replay.header ?? {};
  const cast: unknown[] = Array.isArray(header.cast) && header.cast.length ? header.cast : header.config?.cast ?? [];
  const turns = header.turns ?? header.config?.turns ?? Math.max(0, ...(replay.events ?? []).map((e: { turn?: number }) => e.turn ?? 0));
  const talks = (replay.events ?? []).filter((e: { type?: string }) => e.type === "colloquio-open").length;
  const fill = (t: string, cap: boolean) => t
    .replace(/\{cast\}/g, cap ? capital(words(cast.length)) : words(cast.length))
    .replace(/\{turns\}/g, String(turns))
    .replace(/\{privateTalks\}/g, `${words(talks)} private talk${talks === 1 ? "" : "s"}`);
  const title = fill(content.title, true);
  const description = fill(content.description, false);
  if (title.length >= 60) throw new Error(`Site title is ${title.length} characters, over 60: ${title}`);
  if (description.length >= 160) throw new Error(`Site description is ${description.length} characters, over 160: ${description}`);
  const url = siteUrl(site);
  return { title, description, url, image: new URL(PREVIEW_FILE, url).href, imageAlt: `The replay viewer partway through the game: the conversations as they happen, beside a map of the room.` };
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

/**
 * Writes a folder ready to deploy at `site`: index.html (the view, with link-preview tags) and
 * preview.png. Refuses if either file holds anything key-shaped, or the page makes a network request.
 */
export async function exportSite(recordPath: string, site: string, outDir?: string): Promise<{ dir: string; meta: SiteMeta; head: string[]; png: number; moment: object }> {
  const html = readFileSync(VIEWER, "utf8");
  const loader = viewerLoader(html);
  const replay = loader.toReplay(readRecord(recordPath), checksFor(recordPath));
  const content = siteContent();
  const meta = siteMeta(replay, site, content);
  const out = viewHtml(replay, html, content, meta);
  const leaks = keyFindings(out);
  if (leaks.length) throw new Error(`${recordPath}: not exported, the page would contain ${[...new Set(leaks)].join(", ")}`);
  const id = String((replay.header as { game_id?: string }).game_id ?? "game");
  const dir = outDir ?? join(dirname(recordPath), `site-${id}`);
  mkdirSync(dir, { recursive: true });
  const page = join(dir, "index.html");
  writeFileSync(page, out);
  const shot = await capturePreview(page);
  const online = shot.requests.filter((u) => !/^(file|data):/.test(u));
  if (online.length) throw new Error(`${page}: the page makes network requests: ${online.join(", ")}`);
  const size = pngSize(shot.png);
  if (size.width !== PREVIEW.width || size.height !== PREVIEW.height) throw new Error(`preview is ${size.width}×${size.height}, not ${PREVIEW.width}×${PREVIEW.height}`);
  if (shot.png.length > MAX_PREVIEW_BYTES) throw new Error(`preview is ${(shot.png.length / 1024).toFixed(0)} KB, over 1 MB`);
  const pngLeaks = keyFindings(shot.png.toString("latin1"));
  if (pngLeaks.length) throw new Error(`preview.png: not written, it would contain ${pngLeaks.join(", ")}`);
  writeFileSync(join(dir, PREVIEW_FILE), shot.png);
  return { dir, meta, head: siteHeadTags(meta), png: shot.png.length, moment: shot.moment };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: { out: { type: "string" }, site: { type: "string" } } });
  if (!positionals.length || (values.site && positionals.length !== 1)) {
    console.error("Usage: npm run minigame:view -- <game record .full.json.gz> [more] [--out <dir>]\n       npm run minigame:view -- <one game record> --site <url> [--out <dir>]");
    process.exit(1);
  }
  if (values.site) {
    const r = await exportSite(positionals[0]!, values.site, values.out);
    console.log(`${r.dir}/index.html and ${PREVIEW_FILE} (${(r.png / 1024).toFixed(0)} KB, ${JSON.stringify(r.moment)})\n${r.head.join("\n")}`);
  } else {
    for (const p of positionals) {
      const r = exportView(p, values.out);
      console.log(`${r.path}  ${(r.bytes / 1024).toFixed(0)} KB${r.missing.length ? `  not in this record: ${r.missing.join("; ")}` : ""}`);
    }
  }
}
