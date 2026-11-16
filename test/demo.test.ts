// The demo page (CC-20261116-01, #172): `npm run demo` builds the player screen as one static page on the
// fake game. Built here, served as a plain static file with no other process, and clicked through in
// headless Chrome: the opening, the choice, the tour, and the evening's first lines. No model calls.
// The browser part is skipped when Chrome isn't installed, like test/browser.test.ts.

import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { promisify } from "node:util";
import { keyFindings } from "../src/minigame/view.ts";
import { demoData } from "../tools/demo/data.ts";
import { closeChrome, launchChrome, skip } from "./fixtures/chrome.ts";

const ME = "Francesco Pazzi";
const dir = mkdtempSync(join(tmpdir(), "demo-page-"));
const out = join(dir, "index.html");
let printed = "";
let server: Server | null = null;
let browser: Awaited<ReturnType<typeof launchChrome>> | null = null;
let requests: string[] = [];

before(async () => {
  // The command itself, as `npm run demo -- --out <path>` runs it.
  printed = (await promisify(execFile)("npx", ["tsx", "tools/demo/build.ts", "--out", out])).stdout;
  if (skip) return;
  // A plain static file server: the one page, and nothing else.
  server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    if (req.method === "GET" && new URL(req.url ?? "/", "http://localhost").pathname === "/") res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(readFileSync(out));
    else res.writeHead(404).end();
  });
  await new Promise<void>((ok) => server!.listen(0, "127.0.0.1", ok));
  browser = await launchChrome({ width: 1200, height: 700 });
});

after(async () => {
  await closeChrome(browser);
  server?.close();
  rmSync(dir, { recursive: true, force: true });
});

test("npm run demo writes one self-contained page and prints its path and size", () => {
  assert.match(printed, /The demo page: (\S+) \((\d+\.\d+) MB/);
  assert.ok(printed.includes(out), "the path it wrote");
  const html = readFileSync(out, "utf8");
  assert.equal(printed.match(/\((\d+\.\d+) MB/)![1], (statSync(out).size / 1024 / 1024).toFixed(2), "the size it printed");
  // Self-contained: nothing loaded from elsewhere, and the screen's own page around it.
  assert.doesNotMatch(html, /<link[^>]+rel="stylesheet"|<script[^>]+src=/);
  assert.match(html, /<title>[^<]*demo[^<]*<\/title>/);
  assert.match(html, /<div id="root"><\/div>/);
  // One inline script, closed only once: every "</script" inside the bundle is escaped.
  assert.equal(html.match(/<\/script/gi)!.length, 1);
  assert.deepEqual(keyFindings(html, {}), [], "nothing key-shaped");
});

test("the build-time data round-trips through JSON unchanged", () => {
  const data = demoData();
  assert.deepEqual(JSON.parse(JSON.stringify(data)), data);
  assert.ok(data.choices.includes(ME));
  assert.ok(Object.keys(data.briefings).length >= data.choices.length);
});

test("the page plays from a static file server: the opening skipped, the character chosen, the tour skipped, then the stage bar, the message box, and the evening's first lines, and Il Notaio's reading, with no console errors", { skip }, async () => {
  const { page } = browser!;
  const { port } = server!.address() as AddressInfo;
  await page.send("Page.navigate", { url: `http://127.0.0.1:${port}/?delay=0` });
  await page.until(`document.querySelector(".opening-skip")`);
  await page.eval(`document.querySelector(".opening-skip").click()`);
  await page.until(`document.querySelector('.start-card[data-guest="${ME}"] button')`);
  await page.eval(`document.querySelector('.start-card[data-guest="${ME}"] button').click()`);
  // The game is in the page: the screen has its sheet, and the tour holds the first line (TD v0.51).
  await page.until(`document.querySelector(".input textarea") && !document.querySelector('[data-hint="briefing"]').disabled`);
  await page.until(`document.querySelector(".tour")`);
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(await page.eval(`document.querySelectorAll(".stream .ln").length`), 0, "no line while the tour runs");
  await page.eval(`document.querySelector(".tour-skip").click()`);
  await page.until(`!document.querySelector(".tour")`);
  await page.until(`document.querySelector(".stream .ln")`);
  assert.ok(await page.eval(`!!document.querySelector(".stage-bar .stage")`), "the stage bar");
  assert.ok(await page.eval(`(() => { const r = document.querySelector(".input textarea").getBoundingClientRect(); return r.width > 0 && r.height > 0; })()`), "the message box");
  await page.shot("demo-evening");

  // The review picker: Alt-click copies a reference, and the click never reaches the screen.
  const at = await page.eval<{ x: number; y: number }>(`(() => { const r = document.querySelector('.side.left [data-hint="briefing"]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  for (const type of ["mousePressed", "mouseReleased"]) await page.send("Input.dispatchMouseEvent", { type, ...at, button: "left", clickCount: 1, modifiers: 1 });
  await page.until(`document.querySelector(".demo-toast-ref")`);
  const ref = await page.eval<string>(`document.querySelector(".demo-toast-ref").textContent`);
  assert.ok(ref.startsWith("[hint:briefing"), ref);
  assert.match(ref, / · stage: [^\]]+\]$/);
  assert.equal(await page.eval(`!!document.querySelector(".modal, dialog[open]")`), false, "the Alt-click opened nothing");
  // The same click without Alt reaches the screen.
  for (const type of ["mousePressed", "mouseReleased"]) await page.send("Input.dispatchMouseEvent", { type, ...at, button: "left", clickCount: 1 });
  await page.until(`document.querySelector(".modal, dialog[open]")`);
  await page.shot("demo-picker");

  // Il Notaio's reading (TD v0.51): a call on the recorder model, answered in the page by the fake caller.
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".modal, dialog[open]")`);
  await page.eval(`document.querySelector(".web-bar").click()`);
  await page.until(`document.querySelector(".web-dock.open .node:not(.me)")`);
  await page.eval(`document.querySelector(".web .node:not(.me)").dispatchEvent(new MouseEvent("click", { bubbles: true }))`);
  await page.until(`document.querySelector('.reading-text[data-reading="guarded"]')`);

  assert.deepEqual(page.errors, [], "no errors in the console");
  assert.deepEqual(requests.filter((r) => r !== "GET /?delay=0"), [], "the page asked the server for nothing else");
});
