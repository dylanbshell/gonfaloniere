// The link-preview image for a hosted replay (CC-20261029-04): headless Chrome opens an exported
// page, finds a moment a few turns in with a conversation in full view, follows a guest who just
// spoke (the inner-life box stays collapsed), and screenshots it at 1200×630. Driven over the
// DevTools protocol with Node's own WebSocket, so nothing is installed. The page must make no
// network request: every request it makes is returned, and the export refuses any but file: and data:.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const PREVIEW = { width: 1200, height: 630 };

const CHROMES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

/** A Chrome to run headless: $CHROME_PATH, or the usual install places. */
export function findChrome(): string | null {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  return CHROMES.find((p) => existsSync(p)) ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * In the page: over the steps of turns `from` to `to` (both included), the one whose
 * fully shown conversations (no scrolling, inside the viewport) hold the most lines, where the largest
 * holds at least two. Leaves the page there, following the guest who spoke last in the largest of
 * them, and returns that moment; null if no step has one.
 */
const WINDOWS: [number, number][] = [[3, 5], [2, 6], [0, 99]];
const PICK_MOMENT = (from: number, to: number) => `(() => {
  const slider = document.getElementById("slider");
  const go = (i) => { slider.value = String(i); slider.dispatchEvent(new Event("input")); };
  const starts = [...document.querySelectorAll("#ticks button")].map((b) => ({ turn: b.textContent === "Start" ? 0 : Number(b.textContent), step: Number(b.dataset.step) }));
  const last = Number(slider.max);
  const a = starts.find((t) => t.turn === ${from});
  const b = starts.find((t) => t.turn === ${to} + 1);
  const lo = a ? a.step : 0, hi = b ? b.step - 1 : last;
  let best = null;
  for (let i = lo; i <= hi; i++) {
    go(i);
    let lines = 0, top = null;
    for (const p of document.querySelectorAll("#panels .panel")) {
      const body = p.querySelector(".body"), r = p.getBoundingClientRect(), n = p.querySelectorAll(".ln").length;
      if (body.scrollHeight > body.clientHeight + 1 || r.bottom > innerHeight || r.right > innerWidth) continue;
      lines += n;
      if (!top || n > top.n) top = { n, panel: p };
    }
    if (top && top.n >= 2 && (!best || lines > best.lines)) best = { step: i, lines, speaker: [...top.panel.querySelectorAll(".ln.speech .sp [data-name]")].map((s) => s.dataset.name).at(-1) ?? null };
  }
  if (!best) return null;
  go(best.step);
  const g = best.speaker && document.querySelector('#room .guest[data-focus="' + CSS.escape(best.speaker) + '"]');
  if (g) g.click();
  return { step: best.step, lines: best.lines, focus: g ? best.speaker : null, turn: document.getElementById("now").firstChild.textContent };
})()`;

export interface Preview { png: Buffer; moment: { step: number; lines: number; focus: string | null; turn: string }; requests: string[] }

/** Screenshots an exported page (index.html on disk) at 1200×630, a few turns in: turns 3–5, else 2–6, else anywhere. */
export async function capturePreview(htmlPath: string): Promise<Preview> {
  const chrome = findChrome();
  if (!chrome) throw new Error("No Chrome found for the preview image: set CHROME_PATH");
  const profile = mkdtempSync(join(tmpdir(), "gonf-preview-"));
  const proc = spawn(chrome, [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
    "--hide-scrollbars", "--mute-audio", `--window-size=${PREVIEW.width},${PREVIEW.height}`, "about:blank",
  ], { stdio: "ignore" });
  let ws: WebSocket | null = null;
  try {
    // Chrome writes the port it chose to DevToolsActivePort.
    const portFile = join(profile, "DevToolsActivePort");
    for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
    if (!existsSync(portFile)) throw new Error("Chrome didn't start");
    const port = readFileSync(portFile, "utf8").split("\n")[0];
    const targets = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("Chrome has no page to drive");
    const sock = new WebSocket(page.webSocketDebuggerUrl);
    ws = sock;
    await new Promise((ok, fail) => { sock.addEventListener("open", ok); sock.addEventListener("error", fail); });

    let id = 0;
    const pending = new Map<number, (m: { result?: any; error?: { message: string } }) => void>();
    const requests: string[] = [];
    const errors: string[] = [];
    let loaded = false;
    sock.addEventListener("message", (ev) => {
      const m = JSON.parse(String(ev.data));
      if (m.id && pending.has(m.id)) { pending.get(m.id)!(m); pending.delete(m.id); }
      else if (m.method === "Network.requestWillBeSent") requests.push(m.params.request.url);
      else if (m.method === "Page.loadEventFired") loaded = true;
      else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    });
    const send = (method: string, params: object = {}) => new Promise<any>((ok, fail) => {
      const n = ++id;
      pending.set(n, (m) => (m.error ? fail(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
      sock.send(JSON.stringify({ id: n, method, params }));
    });
    const evaluate = async (expression: string) => {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true });
      if (r.exceptionDetails) throw new Error(`In the page: ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}`);
      return r.result.value;
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: PREVIEW.width, height: PREVIEW.height, deviceScaleFactor: 1, mobile: false });
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }, { name: "prefers-reduced-motion", value: "reduce" }] });
    await send("Page.navigate", { url: pathToFileURL(resolve(htmlPath)).href });
    for (let i = 0; i < 200 && !loaded; i++) await sleep(50);
    if (!loaded) throw new Error("The page didn't finish loading");
    if (!(await evaluate(`!document.getElementById("game").hidden`))) throw new Error(`The page didn't open its game${errors.length ? `: ${errors.join("; ")}` : ""}`);

    let moment = null;
    for (const [from, to] of WINDOWS) if (!moment) moment = await evaluate(PICK_MOMENT(from, to));
    if (!moment) throw new Error("No moment with a conversation of two or more lines in full view");
    await sleep(300);
    const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: PREVIEW.width, height: PREVIEW.height, scale: 1 } });
    if (errors.length) throw new Error(`The page threw: ${errors.join("; ")}`);
    return { png: Buffer.from(shot.data, "base64"), moment, requests };
  } finally {
    ws?.close();
    proc.kill();
    await sleep(200);
    rmSync(profile, { recursive: true, force: true });
  }
}

/** A PNG's width and height, from its header. */
export function pngSize(png: Buffer): { width: number; height: number } {
  if (png.subarray(1, 4).toString("latin1") !== "PNG") throw new Error("not a PNG");
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

/** Writes a capture, for trying the picker by hand: tsx src/minigame/preview.ts <page.html> <out.png>. */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [page, out] = process.argv.slice(2);
  if (!page || !out) { console.error("Usage: tsx src/minigame/preview.ts <page.html> <out.png>"); process.exit(1); }
  const p = await capturePreview(page);
  writeFileSync(out, p.png);
  console.log(`${out}  ${(p.png.length / 1024).toFixed(0)} KB  ${JSON.stringify(p.moment)}`);
}
