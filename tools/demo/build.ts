// The player screen as one static page on the fake game (CC-20261116-01, #172).
//
//   npm run demo                         writes results/demo/index.html
//   npm run demo -- --out <path>         writes it somewhere else
//
// One self-contained HTML page: the screen (web/src/main.tsx, unchanged), the mini-game engine on the
// fake model caller, and an in-page transport where the screen expects its server (tools/demo/). No
// server, no model calls, no spend: open it from any static file server and click through it.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { build } from "esbuild";
import { keyFindings } from "../../src/minigame/view.ts";
import { demoData } from "./data.ts";
import { PROCESS_BANNER, demoShims, virtualFiles } from "./shims.ts";

export const DEMO_OUT = "results/demo/index.html";
const TITLE = "The player screen: demo (a fake game, no model calls)";

/** The page: web/index.html with the theme, the bundle's CSS, and its JS inline. */
export function demoHtml(js: string, css: string): string {
  const style = (text: string) => `<style>\n${text.replace(/<\/style/gi, "<\\/style")}\n</style>`;
  const page = readFileSync("web/index.html", "utf8");
  const swap = (from: string, to: string) => {
    if (!page.includes(from)) throw new Error(`web/index.html no longer has ${from}: update tools/demo/build.ts`);
    return (html: string) => html.replace(from, () => to);
  };
  return [
    // An empty icon, so a static server is never asked for one.
    swap("<title></title>", `<title>${TITLE}</title>\n    <link rel="icon" href="data:," />`),
    swap('<link rel="stylesheet" href="/theme.css" />', style(readFileSync("web/theme.css", "utf8"))),
    swap('<link rel="stylesheet" href="/app.css" />', style(css)),
    swap('<script type="module" src="/app.js"></script>', `<script type="module">\n${js.replace(/<\/script/gi, "<\\/script")}\n</script>`),
  ].reduce((html, f) => f(html), page);
}

/** Builds the demo page and writes it. Refuses if the page holds anything key-shaped. */
export async function buildDemo(out = DEMO_OUT): Promise<{ path: string; bytes: number; ms: number }> {
  const started = Date.now();
  const result = await build({
    entryPoints: ["tools/demo/entry.ts"],
    bundle: true,
    write: false,
    outdir: "out",
    platform: "browser",
    format: "esm",
    jsx: "automatic",
    target: "es2022",
    minify: true,
    legalComments: "none",
    logLevel: "warning",
    define: { "process.env.NODE_ENV": '"production"' },
    banner: { js: PROCESS_BANNER },
    plugins: [demoShims(virtualFiles(["setting", "lore"]), demoData())],
  });
  const file = (ext: string) => result.outputFiles.find((f) => f.path.endsWith(ext))?.text ?? "";
  const html = demoHtml(file(".js"), file(".css"));
  const leaks = keyFindings(html);
  if (leaks.length) throw new Error(`Refusing to write ${out}: the page holds something key-shaped (${leaks.join(", ")})`);
  const path = resolve(out);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, html);
  return { path, bytes: Buffer.byteLength(html), ms: Date.now() - started };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { out: { type: "string", default: DEMO_OUT } } });
  const { path, bytes, ms } = await buildDemo(values.out);
  console.log(`The demo page: ${path} (${(bytes / 1024 / 1024).toFixed(2)} MB, built in ${(ms / 1000).toFixed(1)} s)\nServe its folder with any static file server, for example: python3 -m http.server -d ${dirname(path)}`);
}
