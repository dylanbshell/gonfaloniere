// The player screen in a real browser (CC-20261112-02, #80): the two bugs from the first playtest, checked
// where they happened, in layout. Plays a fake game (no model calls) through `npm run play -- --fake`, and
// drives headless Chrome over its DevTools protocol (Node's own WebSocket; no new dependency). Skipped when
// Chrome isn't installed; set CHROME to its path if it's somewhere else.
//
// - A deck opens over the screen: wherever the briefing overlaps the input box, the briefing is on top.
// - The command menu closes when its slash is deleted, and on Escape; Speak is disabled for "", "@", "/".

import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

/** SCREENSHOTS=<dir> saves a picture at each check, for looking at the screen. */
const SHOTS = process.env.SCREENSHOTS;
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const skip = existsSync(CHROME) ? false : `no Chrome at ${CHROME}`;

/** Resolves with the first match of `re` in the process's output. */
function waitFor(p: ChildProcess, stream: "stdout" | "stderr", re: RegExp, ms = 60_000): Promise<RegExpMatchArray> {
  return new Promise((ok, fail) => {
    let seen = "";
    const timer = setTimeout(() => fail(new Error(`timed out waiting for ${re}: ${seen.slice(-500)}`)), ms);
    p[stream]!.on("data", (d: Buffer) => {
      seen += d.toString();
      const m = seen.match(re);
      if (m) {
        clearTimeout(timer);
        ok(m);
      }
    });
    p.on("exit", (code) => fail(new Error(`exited (${code}) before ${re}: ${seen.slice(-500)}`)));
  });
}

/** A minimal DevTools protocol client for one page. */
class Page {
  private n = 0;
  private waiting = new Map<number, { ok: (v: unknown) => void; fail: (e: Error) => void }>();
  /** The page's errors and console errors, reported if a wait times out. */
  errors: string[] = [];
  constructor(private ws: WebSocket) {
    ws.onmessage = (m) => {
      const msg = JSON.parse(String(m.data)) as { id?: number; method?: string; params?: Record<string, any>; result?: unknown; error?: { message: string } };
      if (msg.method === "Runtime.exceptionThrown") this.errors.push(JSON.stringify(msg.params!.exceptionDetails.exception?.description ?? msg.params!.exceptionDetails.text));
      if (msg.method === "Runtime.consoleAPICalled" && msg.params!.type === "error") this.errors.push(msg.params!.args.map((a: { value?: unknown; description?: string }) => a.value ?? a.description).join(" "));
      const w = msg.id !== undefined ? this.waiting.get(msg.id) : undefined;
      if (!w) return;
      this.waiting.delete(msg.id!);
      if (msg.error) w.fail(new Error(msg.error.message));
      else w.ok(msg.result);
    };
  }
  static async open(url: string): Promise<Page> {
    const ws = new WebSocket(url);
    await new Promise((ok, fail) => ((ws.onopen = ok), (ws.onerror = fail)));
    return new Page(ws);
  }
  send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const id = ++this.n;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((ok, fail) => this.waiting.set(id, { ok: ok as (v: unknown) => void, fail }));
  }
  /** Evaluates an expression in the page and returns its value. */
  async eval<T>(expr: string): Promise<T> {
    const r = await this.send<{ result: { value: T }; exceptionDetails?: { text: string } }>("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`${expr}: ${JSON.stringify(r.exceptionDetails)}`);
    return r.result.value;
  }
  async until(expr: string, ms = 30_000): Promise<void> {
    const end = Date.now() + ms;
    while (!(await this.eval<boolean>(`!!(${expr})`))) {
      if (Date.now() > end) throw new Error(`timed out: ${expr}\n${this.errors.join("\n")}\n${await this.eval<string>("document.body.innerText.slice(0, 1500)")}`);
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  type = (text: string) => this.send("Input.insertText", { text });
  key = (key: string, code: number) => Promise.all(["keyDown", "keyUp"].map((type) => this.send("Input.dispatchKeyEvent", { type, key, code: key, windowsVirtualKeyCode: code })));
  close = () => this.ws.close();
  async shot(name: string): Promise<void> {
    if (!SHOTS) return;
    await this.until(`document.getAnimations().length === 0`);
    const { data } = await this.send<{ data: string }>("Page.captureScreenshot", { format: "png" });
    mkdirSync(SHOTS, { recursive: true });
    writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(data, "base64"));
  }
}

let play: ChildProcess | null = null;
let chrome: ChildProcess | null = null;
let profile = "";
let page: Page;

const VIEW = { width: 1200, height: 700 };

before(async () => {
  if (skip) return;
  play = spawn("npx", ["tsx", "src/minigame/play.ts", "--minigame", "--fake", "--no-open", "--port", "0", "--fake-delay", "0", "--turns", "4"], { stdio: ["ignore", "pipe", "pipe"], detached: true });
  const [, url] = await waitFor(play, "stdout", /The player screen: (http:\S+)/);
  profile = mkdtempSync(join(tmpdir(), "screen-chrome-"));
  chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, "--remote-debugging-port=0", `--window-size=${VIEW.width},${VIEW.height}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"], detached: true });
  const [, devtools] = await waitFor(chrome, "stderr", /DevTools listening on (ws:\/\/\S+)/);
  const targets = (await (await fetch(`http://${new URL(devtools!).host}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
  page = await Page.open(targets.find((t) => t.type === "page")!.webSocketDebuggerUrl);
  await page.send("Emulation.setDeviceMetricsOverride", { ...VIEW, deviceScaleFactor: 1, mobile: false });
  await page.send("Runtime.enable");
  await page.send("Page.navigate", { url });
  // Choose the card; the game starts and waits for the player, with the sheet (the decks) in hand.
  await page.until(`document.querySelector(".start-card button")`);
  await page.eval(`document.querySelector(".start-card button").click()`);
  await page.until(`document.querySelector(".input textarea") && !document.querySelector('[data-hint="briefing"]').disabled`);
});

/** Stops a process and its children (npx starts tsx, which starts node), and waits for it to go. */
async function stop(p: ChildProcess | null): Promise<void> {
  if (!p || p.exitCode !== null) return;
  const gone = new Promise((r) => p.once("exit", r));
  try {
    process.kill(-p.pid!, "SIGTERM");
  } catch {
    p.kill();
  }
  await gone;
}

after(async () => {
  page?.close();
  await stop(chrome);
  await stop(play);
  if (profile) rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
});

test("a deck opens over the screen: the input box is under it everywhere, and the deck under nothing", { skip }, async () => {
  await page.eval(`document.querySelector('[data-hint="briefing"]').click()`);
  await page.until(`document.querySelector(".modal")`);
  const r = await page.eval<{ overInput: string[]; overModal: string[]; inView: boolean }>(`(() => {
    const grid = (b, inside) => {
      const hits = [];
      for (let x = b.left + 2; x < b.right; x += (b.right - b.left) / 7) for (let y = b.top + 2; y < b.bottom; y += (b.bottom - b.top) / 5) {
        const el = document.elementFromPoint(x, y);
        hits.push(el && el.closest(inside) ? "deck" : (el ? el.className || el.tagName : "nothing"));
      }
      return hits;
    };
    const m = document.querySelector(".modal").getBoundingClientRect();
    return { overInput: grid(document.querySelector(".input").getBoundingClientRect(), ".overlay"), overModal: grid(m, ".modal"), inView: m.top >= 0 && m.bottom <= innerHeight };
  })()`);
  await page.shot("deck");
  assert.deepEqual([...new Set(r.overInput)], ["deck"], "everywhere over the input box, the deck's layer is on top");
  assert.deepEqual([...new Set(r.overModal)], ["deck"], "every point of the deck shows the deck");
  assert.ok(r.inView, "the whole deck is in the window");
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".modal")`);
});

const menu = (kind: string) => page.eval<boolean>(`!!document.querySelector('[data-menu="${kind}"]')`);
const speakDisabled = () => page.eval<boolean>(`document.querySelector('[data-hint="speak"]')?.disabled ?? true`);

test("the command menu opens with its slash and closes when the slash is deleted, or on Escape", { skip }, async () => {
  await page.eval(`document.querySelector(".input textarea").focus()`);
  assert.equal(await speakDisabled(), true, "Speak is disabled with an empty box");
  await page.type("/");
  await page.until(`document.querySelector('[data-menu="commands"]')`);
  await page.shot("command-menu");
  assert.equal(await speakDisabled(), true, "Speak is disabled with only /");
  await page.key("Backspace", 8);
  await page.until(`document.querySelector(".input textarea").value === ""`);
  assert.equal(await menu("commands"), false, "deleting the slash closes the menu");
  await page.type("/");
  await page.until(`document.querySelector('[data-menu="commands"]')`);
  await page.key("Escape", 27);
  assert.equal(await menu("commands"), false, "Escape closes it");
  await page.key("Backspace", 8);
  await page.type("/");
  assert.equal(await menu("commands"), true, "and typing the slash again opens it");
  // Clicking away closes it too.
  await page.send("Input.dispatchMouseEvent", { type: "mousePressed", x: VIEW.width / 2, y: 120, button: "left", clickCount: 1 });
  await page.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: VIEW.width / 2, y: 120, button: "left", clickCount: 1 });
  assert.equal(await menu("commands"), false, "clicking away closes it");
});

test("Speak is disabled for an @ alone, and active with something to say; a command gets Do instead", { skip }, async () => {
  await page.eval(`document.querySelector(".input textarea").focus()`);
  await page.key("Backspace", 8);
  await page.until(`document.querySelector(".input textarea").value === ""`);
  await page.type("@");
  assert.equal(await speakDisabled(), true, "Speak is disabled with only @");
  await page.key("Backspace", 8);
  await page.type("Good evening.");
  assert.equal(await speakDisabled(), false, "Speak is active with words");
  for (let i = 0; i < "Good evening.".length; i++) await page.key("Backspace", 8);
  await page.type("/borrow");
  await page.until(`document.querySelector('[data-hint="do"]')`);
  assert.equal(await page.eval<boolean>(`!document.querySelector('[data-hint="speak"]') && !document.querySelector('[data-hint="do"]').disabled`), true, "Do replaces Speak");
  // A hover explanation, for the pictures.
  const r = await page.eval<{ x: number; y: number }>(`(() => { const b = document.querySelector('[data-hint="do"]').getBoundingClientRect(); return { x: b.x + 5, y: b.y + 5 }; })()`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...r });
  await page.until(`document.querySelector(".tip:not(.measuring)")`);
  await page.shot("do-and-explanation");
});

// ---- CC-20261112-03 (#81) --------------------------------------------------------------------------------

test("a deck swipes to the next card on a click, goes back with the arrow key, and keeps its place when reopened", { skip }, async () => {
  const tab = () => page.eval<string>(`document.querySelector(".tab.on")?.textContent ?? ""`);
  await page.eval(`document.querySelector('[data-hint="rules"]').click()`);
  await page.until(`document.querySelector(".deck-card")`);
  const first = await tab();
  await page.eval(`document.querySelector(".deck-card").click()`);
  const second = await tab();
  assert.notEqual(second, first, "a click on the card goes to the next");
  await page.key("ArrowLeft", 37);
  assert.equal(await tab(), first, "the left arrow goes back");
  await page.key("ArrowRight", 39);
  await page.shot("rules-deck");
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".deck-card")`);
  await page.eval(`document.querySelector('[data-hint="rules"]').click()`);
  await page.until(`document.querySelector(".deck-card")`);
  assert.equal(await tab(), second, "the deck kept its place");
  await page.key("Escape", 27);
});

test("selecting a guest shows them on the right; Escape clears it", { skip }, async () => {
  const name = await page.eval<string>(`document.querySelector(".here .guest").textContent`);
  await page.eval(`document.querySelector(".here .guest").click()`);
  await page.until(`document.querySelector('.side.right [data-guest]')?.dataset.guest === ${JSON.stringify(name)} && document.querySelector('.side.right [data-hint="selected"]')`);
  await page.eval(`document.querySelector(".input textarea").blur()`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector('.side.right [data-hint="selected"]')`);
});

test("a note written in the web viewer stays with the game across a refresh", { skip }, async () => {
  await page.eval(`document.querySelector('[data-hint="web"]').click()`);
  await page.until(`document.querySelector(".web .node") && document.querySelector(".web").getAnimations().length === 0`);
  // Over everything: near every corner (inside the rounded ones), the panel shows.
  const top = await page.eval<boolean>(`(() => { const r = document.querySelector(".web").getBoundingClientRect(); return [[r.left + 20, r.top + 20], [r.right - 20, r.top + 20], [r.left + 20, r.bottom - 20], [r.right - 20, r.bottom - 20]].every(([x, y]) => document.elementFromPoint(x, y)?.closest(".web")); })()`);
  assert.equal(top, true);
  await page.eval(`document.querySelector('.web .node').dispatchEvent(new MouseEvent("click", { bubbles: true }))`);
  await page.eval(`document.querySelector('[data-hint="notesTab"]').click()`);
  await page.until(`document.querySelector(".web textarea")`);
  await page.eval(`document.querySelector(".web textarea").focus()`);
  await page.type("Watch who leaves first.");
  await page.eval(`document.querySelector('[data-hint="noteSave"]').click()`);
  await page.until(`[...document.querySelectorAll(".note-text")].some((n) => n.textContent === "Watch who leaves first.")`);
  await page.shot("web-viewer");
  await page.send("Page.reload");
  await page.until(`document.querySelector('[data-hint="web"]')`);
  await page.eval(`document.querySelector('[data-hint="web"]').click()`);
  await page.eval(`document.querySelector('[data-hint="allTab"]').click()`);
  await page.until(`[...document.querySelectorAll(".note-text")].some((n) => n.textContent === "Watch who leaves first.")`);
});
