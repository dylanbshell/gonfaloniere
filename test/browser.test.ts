// The player screen in a real browser (CC-20261112-02, #80): the two bugs from the first playtest, checked
// where they happened, in layout. Plays a fake game (no model calls) through `npm run play -- --fake`, and
// drives headless Chrome over its DevTools protocol (Node's own WebSocket; no new dependency). Skipped when
// Chrome isn't installed; set CHROME to its path if it's somewhere else.
//
// - A deck opens over the screen: wherever the briefing overlaps the input box, the briefing is on top.
// - The command menu closes when its slash is deleted, and on Escape; Speak is disabled for "", "@", "/".
// - #88: the start button's explanation closes when the game starts; on a short window every left-column
//   control is in sight or behind a "more below" hint; a failing panel leaves the rest working (`?fault=`);
//   and the screen holds still as the first events arrive.

import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
    // Every animation that ends has ended (a beckoning or pulsing one never does).
    await this.until(`document.getAnimations().every((a) => a.effect?.getComputedTiming().iterations === Infinity)`);
    const { data } = await this.send<{ data: string }>("Page.captureScreenshot", { format: "png" });
    mkdirSync(SHOTS, { recursive: true });
    writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(data, "base64"));
  }
}

let play: ChildProcess | null = null;
let chrome: ChildProcess | null = null;
let profile = "";
let page: Page;
/** The screen's address, and what the start button's explanation said before and after the game started. */
let base = "";
let startTip: string | null = null;
let tipAfterStart: string | null = null;

const VIEW = { width: 1200, height: 700 };

before(async () => {
  if (skip) return;
  play = spawn("npx", ["tsx", "src/minigame/play.ts", "--minigame", "--fake", "--no-open", "--port", "0", "--fake-delay", "0", "--turns", "4"], { stdio: ["ignore", "pipe", "pipe"], detached: true });
  const [, url] = await waitFor(play, "stdout", /The player screen: (http:\S+)/);
  base = url!;
  profile = mkdtempSync(join(tmpdir(), "screen-chrome-"));
  chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, "--remote-debugging-port=0", `--window-size=${VIEW.width},${VIEW.height}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"], detached: true });
  const [, devtools] = await waitFor(chrome, "stderr", /DevTools listening on (ws:\/\/\S+)/);
  const targets = (await (await fetch(`http://${new URL(devtools!).host}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
  page = await Page.open(targets.find((t) => t.type === "page")!.webSocketDebuggerUrl);
  await page.send("Emulation.setDeviceMetricsOverride", { ...VIEW, deviceScaleFactor: 1, mobile: false });
  await page.send("Runtime.enable");
  await page.send("Page.navigate", { url });
  // Choose the card as a player would: hover (its explanation shows), then click. The game
  // starts and waits for the player, with the sheet (the decks) in hand.
  await page.until(`document.querySelector(".start-card button")`);
  const b = await page.eval<{ x: number; y: number }>(`(() => { const r = document.querySelector(".start-card button").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...b });
  await page.until(`document.querySelector(".tip:not(.measuring)")`);
  startTip = await page.eval<string>(`document.querySelector(".tip").textContent`);
  // A click that doesn't move focus to the button, as in Safari and Firefox on a Mac (Chrome's focus would
  // hide the explanation by a blur when the button is disabled, so headless Chrome alone never saw this).
  await page.eval(`document.querySelector(".start-card button").click()`);
  await page.until(`document.querySelector(".input textarea") && !document.querySelector('[data-hint="briefing"]').disabled`);
  tipAfterStart = await page.eval<string | null>(`document.querySelector(".tip")?.textContent ?? null`);
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
  const tab = () => page.eval<string>(`document.querySelector(".deck .tab.on")?.textContent ?? ""`);
  // Your briefing is the deck (Interface v0.5: the rules became buttons, and the city a list).
  await page.eval(`document.querySelector('[data-hint="briefing"]').click()`);
  await page.until(`document.querySelector(".deck-card")`);
  const first = await tab();
  await page.eval(`document.querySelector(".deck-card").click()`);
  const second = await tab();
  assert.notEqual(second, first, "a click on the card goes to the next");
  await page.key("ArrowLeft", 37);
  assert.equal(await tab(), first, "the left arrow goes back");
  await page.key("ArrowRight", 39);
  await page.shot("briefing-deck");
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".deck-card")`);
  await page.eval(`document.querySelector('[data-hint="briefing"]').click()`);
  await page.until(`document.querySelector(".deck-card")`);
  assert.equal(await tab(), second, "the deck kept its place");
  await page.key("Escape", 27);
});

test("selecting a guest shows them on the right; Escape clears it", { skip }, async () => {
  const name = await page.eval<string>(`document.querySelector(".here .guest").textContent`);
  await page.eval(`document.querySelector(".here .guest").click()`);
  await page.until(`document.querySelector('.side.right .look')?.dataset.guest === ${JSON.stringify(name)} && document.querySelector('.side.right [data-hint="lookingAt"]')`);
  await page.shot("looking-at");
  await page.eval(`document.querySelector(".input textarea").blur()`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector('.side.right .look:not(.leaving)')`);
});

test("a note written in the Web of Secrets stays with the game across a refresh", { skip }, async () => {
  await page.eval(`document.querySelector('[data-hint="web"]').click()`);
  await page.until(`document.querySelector(".web-dock.open .node") && document.querySelector(".web-dock").getAnimations().length === 0`);
  // Over everything: near every corner (inside the rounded ones), the panel shows.
  const top = await page.eval<boolean>(`(() => { const r = document.querySelector(".web-dock").getBoundingClientRect(); return [[r.left + 20, r.top + 20], [r.right - 20, r.top + 20], [r.left + 20, r.bottom - 20], [r.right - 20, r.bottom - 20]].every(([x, y]) => document.elementFromPoint(x, y)?.closest(".web-dock")); })()`);
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
  await page.eval(`document.querySelector('[data-hint="notesTab"]').click()`);
  await page.until(`[...document.querySelectorAll(".note-text")].some((n) => n.textContent === "Watch who leaves first.")`);
});

// ---- CC-20261113-01 (#88) --------------------------------------------------------------------------------

test("the start button's explanation closes once the game starts", { skip }, () => {
  assert.ok(startTip && startTip.length > 10, "hovering the start button showed its explanation");
  assert.notEqual(tipAfterStart, startTip, "and it went when the button did");
  assert.equal(tipAfterStart, null, "no explanation is left on the game screen");
});

/** The left column's controls outside the column's visible part, and whether the "more below" hint is in sight. */
const leftColumn = () =>
  page.eval<{ out: string[]; overflow: boolean; hint: boolean; decks: boolean }>(`(() => {
    const col = document.querySelector(".side.left");
    const box = col.getBoundingClientRect();
    const inside = (e) => { const b = e.getBoundingClientRect(); return b.top >= box.top - 1 && b.bottom <= box.bottom + 1; };
    const controls = [...col.querySelectorAll("button, [tabindex]")].filter((e) => !e.classList.contains("more-below"));
    const hint = col.querySelector(".more-below");
    return { out: controls.filter((e) => !inside(e)).map((e) => e.dataset.hint ?? e.textContent), overflow: col.scrollHeight > col.clientHeight + 2, hint: !!hint && inside(hint), decks: [...col.querySelectorAll(".decks button")].every(inside) };
  })()`);

test("on a short window, every left-column control is in sight, or a hint says there's more below and scrolls to it", { skip }, async () => {
  // Nothing open over the columns (the notes test leaves the web viewer open).
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".web-dock.open, .overlay")`);
  for (const height of [680, 480]) {
    await page.send("Emulation.setDeviceMetricsOverride", { width: VIEW.width, height, deviceScaleFactor: 1, mobile: false });
    await page.until(`innerHeight === ${height}`);
    await page.eval(`document.querySelector(".side.left").scrollTop = 0`);
    await new Promise((r) => setTimeout(r, 100));
    const r = await leftColumn();
    await page.shot(`left-${height}`);
    if (height === 680) assert.ok(r.decks, "at 680px the decks and the web are in sight without scrolling");
    if (height === 480) assert.ok(r.overflow, "at 480px the column has more than fits (so the hint is tested)");
    if (r.out.length === 0) continue;
    assert.ok(r.hint, `controls below the fold (${r.out.join(", ")}) and a hint in sight`);
    // The hint scrolls the column on, until its end, where the hint goes.
    let step = r;
    let top = 0;
    for (let i = 0; i < 10 && step.hint; i++) {
      await page.eval(`document.querySelector(".side.left .more-below").click()`);
      await new Promise((ok) => setTimeout(ok, 400));
      const now = await page.eval<number>(`document.querySelector(".side.left").scrollTop`);
      assert.ok(now > top, "each click scrolls on");
      top = now;
      step = await leftColumn();
    }
    assert.equal(step.hint, false, "at the end the hint goes");
    // Every control below the fold can be brought wholly into sight in the column.
    const unreachable = await page.eval<string[]>(`(() => {
      const col = document.querySelector(".side.left");
      return [...col.querySelectorAll("button, [tabindex]")].filter((e) => !e.classList.contains("more-below")).filter((e) => {
        e.scrollIntoView({ block: "nearest" });
        const b = e.getBoundingClientRect(), box = col.getBoundingClientRect();
        return !(b.top >= box.top - 1 && b.bottom <= box.bottom + 1) && b.height <= box.height;
      }).map((e) => e.dataset.hint ?? e.textContent);
    })()`);
    assert.deepEqual(unreachable, [], "every control can be scrolled into sight");
  }
  await page.send("Emulation.setDeviceMetricsOverride", { ...VIEW, deviceScaleFactor: 1, mobile: false });
  await page.eval(`document.querySelector(".side.left").scrollTop = 0`);
});

/** Opens the screen afresh, at `query`, once the game screen is up. */
async function reopen(query = ""): Promise<void> {
  await page.send("Page.navigate", { url: `${base}${query}` });
  await page.until(`document.querySelector(".layout") && document.querySelector(".stream .ln, [data-panel-error='stream']")`);
}

test("one panel's failure stays in its panel: the rest of the screen keeps working", { skip }, async () => {
  const parts: Record<string, string> = { left: `.side.left [data-hint="briefing"]`, stream: `.stream .ln`, right: `.side.right .person.talk`, input: `.input textarea` };
  for (const panel of ["stream", "left", "right"]) {
    await reopen(`?fault=${panel}`);
    await page.until(`document.querySelector('[data-panel-error="${panel}"]')`);
    for (const [other, sel] of Object.entries(parts)) if (other !== panel) assert.ok(await page.eval<boolean>(`!!document.querySelector(${JSON.stringify(sel)})`), `with the ${panel} failed, the ${other} still shows`);
    await page.shot(`fault-${panel}`);
  }
  // The Web of Secrets fails in its own bar at the bottom, and the rest keeps working.
  await reopen(`?fault=web`);
  await page.until(`document.querySelector('.web-dock [data-panel-error="web"]')`);
  assert.ok(await page.eval<boolean>(`!!document.querySelector(".input textarea") && !!document.querySelector(".stream .ln") && !!document.querySelector(".side.right")`));
  await reopen();
});

test("the screen holds still while the first events arrive (layout shift under 0.1)", { skip }, async (t) => {
  await reopen();
  await page.until(`document.querySelector(".hint-text") && document.querySelector(".input .prompt")`);
  await new Promise((r) => setTimeout(r, 500));
  const shifts = await page.eval<{ value: number; sources: string[] }[]>(`new Promise((ok) => {
    const all = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) all.push({ value: e.value, sources: e.sources.map((s) => s.node?.className ?? s.node?.nodeName ?? "?") }); }).observe({ type: "layout-shift", buffered: true });
    setTimeout(() => ok(all), 200);
  })`);
  const cls = shifts.reduce((a, s) => a + s.value, 0);
  t.diagnostic(`cumulative layout shift ${cls.toFixed(3)}`);
  assert.ok(cls < 0.1, `cumulative layout shift ${cls.toFixed(3)}: ${JSON.stringify(shifts)}`);
});

// ---- CC-20261113-02 (#90) --------------------------------------------------------------------------------

test("the Web of Secrets: a bar along the bottom that slides up to nine-tenths and down again; its key highlights a type", { skip }, async () => {
  await reopen();
  const bar = await page.eval<{ top: number; bottom: number; layoutBottom: number }>(`(() => { const b = document.querySelector(".web-bar").getBoundingClientRect(); return { top: b.top, bottom: b.bottom, layoutBottom: document.querySelector(".layout").getBoundingClientRect().bottom }; })()`);
  assert.equal(Math.round(bar.bottom), VIEW.height, "the bar sits on the window's bottom edge");
  assert.ok(bar.layoutBottom <= bar.top + 1, "the columns stand above it, so it covers nothing");
  await page.eval(`document.querySelector(".web-bar").click()`);
  await page.until(`document.querySelector(".web-dock.open") && document.querySelector(".web-dock").getAnimations().length === 0`);
  const h = await page.eval<number>(`document.querySelector(".web-dock").getBoundingClientRect().height`);
  assert.ok(Math.abs(h - 0.9 * VIEW.height) < 2, `open to nine-tenths of the window (${h}px)`);
  // The key: a type lights its lines and dims the rest; again clears it.
  const type = await page.eval<string>(`document.querySelector(".key-type").dataset.type`);
  await page.eval(`document.querySelector(".key-type").click()`);
  const lit = await page.eval<{ on: number; off: number; ofType: number }>(`({ on: document.querySelectorAll(".web-diagram .edge.key-on").length, off: document.querySelectorAll(".web-diagram .edge.key-off").length, ofType: document.querySelectorAll(".web-diagram .edge.rel-${type}").length })`);
  assert.equal(lit.on, lit.ofType, "every line of the type is lit");
  assert.ok(lit.off > 0, "the others are dimmed");
  await page.shot("web-key");
  await page.eval(`document.querySelector(".key-type").click()`);
  assert.equal(await page.eval<number>(`document.querySelectorAll(".web-diagram .key-on, .web-diagram .key-off").length`), 0, "clicking again clears it");
  // Il Notaio's box answers a selection: on the default TD (v0.45), the fake caller's reading, past the quote check.
  await page.eval(`document.querySelector('.web .node').dispatchEvent(new MouseEvent("click", { bubbles: true }))`);
  await page.until(`document.querySelector(".reading-text")?.dataset.reading === "reading"`);
  await page.shot("web-reading");
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".web-dock.open") && document.querySelector(".web-dock").getAnimations().length === 0`);
  assert.equal(Math.round(await page.eval<number>(`document.querySelector(".web-dock").getBoundingClientRect().height`)), Math.round(bar.bottom - bar.top), "Escape slides it down to the bar");
});

// ---- CC-20261113-04 (#95) --------------------------------------------------------------------------------

test("the room in the left column: your group marked, others as tokens that spread on hover; a token selects its guest", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector('.room [data-cluster="mine"]') && document.querySelector(".room .token")`);
  const name = await page.eval<string>(`document.querySelector(".room .token").getAttribute("aria-label")`);
  // Overlapping, then spread on hover.
  const gap = () => page.eval<number>(`(() => { const t = [...document.querySelector(".cluster:not(.pair) .stack")?.querySelectorAll(".token") ?? []]; return t.length > 1 ? t[1].getBoundingClientRect().left - t[0].getBoundingClientRect().right : 0; })()`);
  const multi = await page.eval<boolean>(`[...document.querySelectorAll(".cluster:not(.pair) .stack")].some((s) => s.querySelectorAll(".token").length > 1)`);
  if (multi) {
    await page.eval(`document.querySelector(".cluster:not(.pair) .stack").scrollIntoView({ block: "center" })`);
    // Two frames, so the scroll reaches the browser's hit testing before the mouse moves.
    await page.eval(`new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)))`);
    assert.ok((await gap()) < 0, "a group's tokens overlap");
    const r = await page.eval<{ x: number; y: number }>(`(() => { const b = document.querySelector(".cluster:not(.pair) .stack").getBoundingClientRect(); return { x: b.left + 4, y: b.top + b.height / 2 }; })()`);
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...r });
    await page.until(`document.getAnimations().length === 0`);
    const why = await page.eval<string>(`(() => { const s = document.querySelector(".cluster:not(.pair) .stack"); const b = s.getBoundingClientRect(); return JSON.stringify({ hover: s.closest(".cluster").matches(":hover"), at: document.elementFromPoint(b.left + 4, b.top + b.height / 2)?.className, rect: [b.left, b.top, b.width, b.height] }); })()`);
    assert.ok((await gap()) > 0, `and spread out on hover: ${why}`);
  }
  await page.shot("room");
  await page.eval(`document.querySelector(".room .token").click()`);
  await page.until(`document.querySelector('.side.right .look')?.dataset.guest === ${JSON.stringify(name)}`);
  await page.key("Escape", 27);
});

// ---- CC-20261114-04 (#102) -------------------------------------------------------------------------------

test("the errand card with plot_reward off (the mini-game): the no-extra-act line in the card's accent, and no deadline mark", { skip }, async () => {
  await page.until(`document.querySelector(".errand .errand-reward")`);
  const card = await page.eval<{ line: string; kind: string; hover: string | null; colour: string; accent: string; inside: boolean }>(`(() => {
    const card = document.querySelector(".errand");
    const line = card.querySelector(".errand-reward");
    const probe = document.createElement("span");
    probe.style.color = "var(--errand-accent)";
    card.appendChild(probe);
    const accent = getComputedStyle(probe).color;
    probe.remove();
    const c = card.getBoundingClientRect(), l = line.getBoundingClientRect();
    return { line: line.textContent, kind: line.dataset.reward, hover: card.getAttribute("aria-description"), colour: getComputedStyle(line).color, accent, inside: l.top >= c.top && l.bottom <= c.bottom && l.height > 0 };
  })()`);
  const words = JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { screen: { errandCard: { noReward: string }; hints: { errandNoReward: string } } };
  assert.equal(card.kind, "noReward");
  assert.equal(card.line, words.screen.errandCard.noReward);
  assert.equal(card.hover, words.screen.hints.errandNoReward, "the card's hover says the same");
  assert.equal(card.colour, card.accent, "in the card's accent (theme.css)");
  assert.ok(card.inside, "laid out inside the card");
  assert.equal(await page.eval<number>(`document.querySelectorAll(".track .errand-mark").length`), 0, "no deadline mark with the flag off");
  await page.shot("errand-card");
});

// ---- CC-20261114-05 (#109) -------------------------------------------------------------------------------

test("a note's conclusion fills the input box and highlights Do, sending nothing; Do runs it and the set-aside message comes back", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".input textarea")`);
  // Every message the screen sends, from here on.
  await page.eval(`(() => { window.__sent = []; const send = WebSocket.prototype.send; WebSocket.prototype.send = function (d) { window.__sent.push(JSON.parse(d)); return send.call(this, d); }; })()`);
  const commandsSent = () => page.eval<string[]>(`window.__sent.filter((m) => m.type === "command").map((m) => m.text)`);
  const box = () => page.eval<string>(`document.querySelector(".input textarea").value`);
  const words = JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { commands: { conclude: { name: string } } };
  const NOTE = "Watches the door all evening.";
  const conclusion = `${words.commands.conclude.name} ${NOTE}`;
  // An unsent message in the box.
  const DRAFT = "A word, when you have a moment.";
  await page.eval(`document.querySelector(".input textarea").focus()`);
  await page.type(DRAFT);
  // A note on a guest, and a free note, in the Web of Secrets.
  await page.eval(`document.querySelector(".web-bar").click()`);
  await page.until(`document.querySelector(".web-dock.open .node")`);
  await page.eval(`document.querySelector('[data-hint="notesTab"]').click()`);
  await page.until(`document.querySelector(".web textarea")`);
  await page.eval(`document.querySelector(".web textarea").focus()`);
  await page.type("A free thought.");
  await page.eval(`document.querySelector('[data-hint="noteSave"]').click()`);
  await page.until(`[...document.querySelectorAll(".note")].some((n) => n.querySelector(".note-text").textContent === "A free thought.")`);
  assert.equal(await page.eval<boolean>(`[...document.querySelectorAll(".note")].find((n) => n.querySelector(".note-text").textContent === "A free thought.").querySelector(".conclude") === null`), true, "a free note has no conclusion button");
  await page.eval(`document.querySelector('.web .node:not(.me)').dispatchEvent(new MouseEvent("click", { bubbles: true }))`);
  await page.until(`document.querySelector(".web .node.picked")`);
  const bar = await page.eval<string>(`document.querySelector(".web-bar-sel").textContent`);
  await page.eval(`document.querySelector(".web textarea").focus()`);
  await page.type(NOTE);
  await page.eval(`document.querySelector('[data-hint="noteSave"]').click()`);
  const noteButton = `[...document.querySelectorAll(".note")].find((n) => n.querySelector(".note-text").textContent === ${JSON.stringify(NOTE)})?.querySelector(".conclude")`;
  await page.until(noteButton);
  // "This is my conclusion": the web slides down, the box holds the command and the note, Do is lit, nothing sent.
  await page.eval(`${noteButton}.click()`);
  await page.until(`!document.querySelector(".web-dock.open") && document.querySelector(".web-dock").getAnimations().length === 0`);
  assert.equal(Math.round(await page.eval<number>(`document.querySelector(".web-bar").getBoundingClientRect().bottom`)), VIEW.height, "down to its bar, in sight");
  assert.equal(await box(), conclusion, "the box holds the conclude command and the note");
  assert.equal(await page.eval<boolean>(`(() => { const a = document.querySelector(".input textarea"); return document.activeElement === a && a.selectionStart === a.value.length && a.selectionEnd === a.value.length; })()`), true, "focused, with the cursor at the end");
  assert.equal(await page.eval<boolean>(`document.querySelector('[data-hint="do"]').classList.contains("lit") && getComputedStyle(document.querySelector('[data-hint="do"]')).boxShadow !== "none"`), true, "Do is highlighted");
  assert.deepEqual(await commandsSent(), [], "nothing was sent");
  assert.equal(await page.eval<string>(`document.querySelector(".web-bar-sel").textContent`), bar, "the web keeps its selection");
  await page.shot("conclusion-in-box");
  // Do runs it, once; the set-aside message comes back.
  await page.eval(`document.querySelector('[data-hint="do"]').click()`);
  await page.until(`window.__sent.some((m) => m.type === "command")`);
  assert.deepEqual(await commandsSent(), [conclusion], "one conclusion went through");
  await page.until(`document.querySelector(".input textarea").value === ${JSON.stringify(DRAFT)}`);
  // Again, then edited and cleared without running it: the highlight goes once the box stops being a command,
  // and clearing the box brings the message back.
  await page.eval(`document.querySelector(".web-bar").click()`);
  await page.until(`document.querySelector(".web-dock.open") && ${noteButton}`);
  await page.eval(`${noteButton}.click()`);
  await page.until(`document.querySelector(".input textarea").value === ${JSON.stringify(conclusion)} && document.querySelector('[data-hint="do"].lit')`);
  await page.eval(`document.querySelector(".input textarea").setSelectionRange(0, 1)`);
  await page.key("Backspace", 8);
  await page.until(`!document.querySelector('[data-hint="do"]')`);
  await page.eval(`document.querySelector(".input textarea").setSelectionRange(0, 0)`);
  await page.type("/");
  await page.until(`document.querySelector('[data-hint="do"]')`);
  assert.equal(await page.eval<boolean>(`document.querySelector('[data-hint="do"]').classList.contains("lit")`), false, "the highlight stays off once the box stopped starting with /");
  await page.eval(`document.querySelector(".input textarea").select()`);
  await page.key("Backspace", 8);
  await page.until(`document.querySelector(".input textarea").value === ${JSON.stringify(DRAFT)}`);
  assert.deepEqual(await commandsSent(), [conclusion], "clearing it sent nothing");
});

// ---- CC-20261114-06 (#113) -------------------------------------------------------------------------------

test("the stage bar: hovering expands a past or a future stage; a past stage opens read-only with Return; a draft survives; nothing is sent from it; a future stage can't be opened; a selected guest's dots", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".stage-bar .mark.past") && document.querySelector(".stage-bar .mark.next") && document.querySelector(".input textarea")`);
  await page.eval(`(() => { window.__sent = []; const send = WebSocket.prototype.send; WebSocket.prototype.send = function (d) { window.__sent.push(JSON.parse(d)); return send.call(this, d); }; })()`);
  const sent = () => page.eval<string[]>(`window.__sent.filter((m) => m.type === "say" || m.type === "command" || m.type === "pass" || m.type === "end").map((m) => m.type)`);
  const words = JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { screen: { stageBar: { descriptions: Record<string, string> } } };
  const centre = (sel: string) => page.eval<{ x: number; y: number }>(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: b.left + Math.min(8, b.width / 2), y: b.top + b.height / 2 }; })()`);
  const move = async (at: { x: number; y: number }) => page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...at });
  const click = async (sel: string) => {
    const at = await centre(sel);
    for (const type of ["mousePressed", "mouseReleased"]) await page.send("Input.dispatchMouseEvent", { type, ...at, button: "left", clickCount: 1 });
  };
  const nowName = () => page.eval<boolean>(`!!document.querySelector(".stage-bar .mark.now .stage-name")`);
  assert.equal(await nowName(), true, "the current stage is an oval with its name");
  // Hovering a past stage, then a future one, expands it with its name and description; the current one shrinks back.
  for (const kind of ["past", "next"]) {
    await move(await centre(`.stage-bar .mark.${kind} .stage`));
    await page.until(`document.querySelector(".stage-bar .mark.${kind}.expanded .stage-desc")`);
    const m = await page.eval<{ stage: string; name: string; desc: string }>(`(() => { const li = document.querySelector(".stage-bar .mark.${kind}.expanded"); return { stage: li.getAttribute("aria-label"), name: li.querySelector(".stage-name").textContent, desc: li.querySelector(".stage-desc").textContent }; })()`);
    assert.equal(m.name, m.stage);
    assert.equal(m.desc, words.screen.stageBar.descriptions[m.stage], `${kind}: its description`);
    assert.equal(await nowName(), false, `${kind}: the current stage shrinks back`);
    await page.shot(`stage-bar-hover-${kind}`);
  }
  await move({ x: VIEW.width / 2, y: VIEW.height / 2 });
  await page.until(`document.querySelector(".stage-bar .mark.now .stage-name")`);
  // A future stage can't be opened: it isn't a button, and clicking it changes nothing.
  assert.equal(await page.eval<string>(`document.querySelector(".stage-bar .mark.next .stage").tagName`), "SPAN");
  await click(".stage-bar .mark.next .stage");
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".past-stage")`), false, "no future stage opens");
  // A draft in the box, then a past stage: read-only, its own lines, Return in Speak's and Pass's place.
  const DRAFT = "Not a word of this until I'm back.";
  await page.eval(`document.querySelector(".input textarea").focus()`);
  await page.type(DRAFT);
  const stage = await page.eval<string>(`document.querySelector(".stage-bar .mark.past").getAttribute("aria-label")`);
  const open = async () => {
    await click(`.stage-bar .mark.past[aria-label="${stage.replace(/"/g, '\\"')}"] .stage`);
    await page.until(`document.querySelector(".past-stage") && document.querySelector('[data-hint="return"]')`);
  };
  await open();
  const view = await page.eval<{ stage: string; lines: number; buttons: string[]; box: string; open: boolean }>(`({
    stage: document.querySelector(".past-stage").dataset.stage,
    lines: document.querySelectorAll(".past-stage .ln").length,
    buttons: [...document.querySelectorAll(".input .actions button")].map((b) => b.dataset.hint),
    box: document.querySelector(".input textarea").value,
    open: document.querySelector(".stage-bar .mark.open")?.getAttribute("aria-label") === document.querySelector(".past-stage").dataset.stage,
  })`);
  assert.equal(view.stage, stage);
  assert.ok(view.lines > 0, "the stage's lines");
  assert.deepEqual(view.buttons, ["return"], "Return alone, in Speak's and Pass's place");
  assert.equal(view.box, DRAFT, "the draft stays in the box");
  assert.ok(view.open, "the bar marks the open stage");
  // While the game waits for the player, Return and the current stage beckon.
  if (await page.eval<boolean>(`!!document.querySelector(".prompt.waiting")`)) assert.equal(await page.eval<boolean>(`!!document.querySelector("button.return.beckon") && !!document.querySelector(".stage-bar .mark.now.beckon")`), true, "Return and the current stage beckon");
  await page.shot("past-stage");
  // Enter returns, sending nothing; the draft survives.
  await page.eval(`document.querySelector(".input textarea").focus()`);
  await page.key("Enter", 13);
  await page.until(`!document.querySelector(".past-stage") && document.querySelector('[data-hint="speak"]')`);
  assert.equal(await page.eval<string>(`document.querySelector(".input textarea").value`), DRAFT, "the draft survives the return");
  // Return, and clicking the current stage, return too.
  await open();
  await click(`[data-hint="return"]`);
  await page.until(`!document.querySelector(".past-stage")`);
  await open();
  await click(".stage-bar .mark.now .stage");
  await page.until(`!document.querySelector(".past-stage")`);
  assert.equal(await page.eval<string>(`document.querySelector(".input textarea").value`), DRAFT);
  assert.deepEqual(await sent(), [], "nothing was sent from the past stage");
  // A selected guest's dots: on each past stage they appear in.
  await open();
  await page.until(`document.querySelector(".past-stage .guest, .past-stage .ln")`);
  const name = await page.eval<string | null>(`document.querySelector(".past-stage .guest")?.textContent ?? null`);
  if (name) {
    await page.eval(`document.querySelector(".past-stage .guest").click()`);
  } else {
    await click(`[data-hint="return"]`);
    await page.eval(`document.querySelector(".here .guest").click()`);
  }
  await page.until(`document.querySelector(".side.right .look:not(.leaving)")`);
  const picked = await page.eval<string>(`document.querySelector(".side.right .look:not(.leaving)").dataset.guest`);
  if (name) await page.until(`document.querySelector(${JSON.stringify(`.stage-bar .mark.past[aria-label="${stage.replace(/"/g, '\\"')}"] .stage-dot`)})`);
  const dots = await page.eval<number>(`document.querySelectorAll(".stage-bar .stage-dot").length`);
  if (name) assert.ok(dots > 0, `${picked} has a dot on the stage they appear in`);
  await page.shot("stage-dots");
  await page.eval(`document.querySelector(".input textarea").blur()`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".stage-bar .stage-dot")`);
  if (await page.eval<boolean>(`!!document.querySelector(".past-stage")`)) await click(`[data-hint="return"]`);
  await page.until(`!document.querySelector(".past-stage")`);
  assert.deepEqual(await sent(), [], "still nothing sent");
  // On a narrow window the bar scrolls sideways, keeping the current stage in view.
  await page.send("Emulation.setDeviceMetricsOverride", { width: 900, height: VIEW.height, deviceScaleFactor: 1, mobile: false });
  await page.until(`innerWidth === 900`);
  await new Promise((r) => setTimeout(r, 100));
  const narrow = await page.eval<{ scrolls: boolean; inView: boolean }>(`(() => {
    const ol = document.querySelector(".stage-bar"), bar = ol.getBoundingClientRect(), now = document.querySelector(".stage-bar .mark.now .stage").getBoundingClientRect();
    return { scrolls: ol.scrollWidth > ol.clientWidth, inView: now.left >= bar.left - 1 && now.right <= bar.right + 1 };
  })()`);
  await page.shot("stage-bar-narrow");
  assert.ok(narrow.scrolls, "the bar is wider than its column, so it scrolls sideways");
  assert.ok(narrow.inView, "with the current stage in view");
  await page.send("Emulation.setDeviceMetricsOverride", { ...VIEW, deviceScaleFactor: 1, mobile: false });
});

// ---- CC-20261114-07 (#114) -------------------------------------------------------------------------------

/** A real click (pressed and released) at a point, or at an element's centre. */
async function clickAt(at: { x: number; y: number } | string): Promise<void> {
  const p = typeof at === "string" ? await page.eval<{ x: number; y: number }>(`(() => { const b = document.querySelector(${JSON.stringify(at)}).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`) : at;
  for (const type of ["mousePressed", "mouseReleased"]) await page.send("Input.dispatchMouseEvent", { type, ...p, button: "left", clickCount: 1 });
}
const settled = `document.querySelector(".web-dock").getAnimations().length === 0`;
const webUp = async () => {
  if (!(await page.eval<boolean>(`!!document.querySelector(".web-dock.open")`))) await page.eval(`document.querySelector(".web-bar").click()`);
  await page.until(`document.querySelector(".web-dock.open .node") && ${settled}`);
};
const webDown = async () => {
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".web-dock.open") && ${settled}`);
};
const pickNode = (name: string) => page.eval(`document.querySelector(${JSON.stringify(`.web .node[data-guest="${name.replace(/"/g, '\\"')}"]`)}).dispatchEvent(new MouseEvent("click", { bubbles: true }))`);
const webPicked = () => page.eval<string[]>(`[...document.querySelectorAll(".web .node.picked")].map((n) => n.dataset.guest)`);
const barSel = () => page.eval<string>(`document.querySelector(".web-bar-sel")?.textContent ?? ""`);
const looking = () => page.eval<string | null>(`document.querySelector(".side.right .look:not(.leaving)")?.dataset.guest ?? null`);

test("one selection, shared with the Web of Secrets: chat to web, web to chat, a pair, clearing, and Open in the Web of Secrets", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".here .guest")`);
  // Interface v0.7: with no one selected the bar shows no names at all.
  const none = "";
  const me = await page.eval<string>(`document.querySelector(".web .node.me").dataset.guest`);
  // Chat to web: a guest selected in the chat shows on the web's bar while it's down, and is selected when it opens.
  const name = await page.eval<string>(`document.querySelector(".here .guest").textContent`);
  await page.eval(`document.querySelector(".here .guest").click()`);
  await page.until(`document.querySelector(".side.right .look")`);
  assert.equal(await barSel(), name, "on the bar while the web is down");
  await page.shot("shared-bar");
  await webUp();
  assert.deepEqual(await webPicked(), [name], "already selected when the web opens");
  // Web to chat: a second guest makes a pair, on the bar and in the web; the chat holds the one picked last.
  const others = await page.eval<string[]>(`[...document.querySelectorAll(".web .node:not(.me)")].map((n) => n.dataset.guest).filter((n) => n !== ${JSON.stringify(name)})`);
  const [a, b] = [others[0]!, others[1]!];
  await pickNode(a);
  assert.deepEqual((await webPicked()).sort(), [name, a].sort(), "a pair in the web");
  const pairBar = await barSel();
  assert.ok(pairBar.includes(name) && pairBar.includes(a), `the pair on the bar: ${pairBar}`);
  await webDown();
  assert.equal(await looking(), a, "the chat holds the one picked last");
  assert.equal(await barSel(), pairBar, "and the bar keeps the pair while the web is down");
  // A new selection in the chat replaces the pair.
  await page.eval(`document.querySelector(".here .guest").click()`);
  await page.until(`document.querySelector(".side.right .look")?.dataset.guest === ${JSON.stringify(name)}`);
  assert.equal(await barSel(), name, "the pair is replaced by the chat's one guest");
  // Clearing in the chat clears both.
  await page.eval(`document.activeElement?.blur()`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".side.right .look:not(.leaving)")`);
  assert.equal(await barSel(), none, "cleared on the bar");
  await webUp();
  assert.deepEqual(await webPicked(), [], "and in the web");
  // The web drops one of a pair: the chat holds the other.
  await pickNode(a);
  await pickNode(b);
  await pickNode(b);
  assert.deepEqual(await webPicked(), [a]);
  await webDown();
  assert.equal(await looking(), a, "the chat holds the one left");
  // Clearing in the web clears the chat.
  await webUp();
  await pickNode(a);
  await webDown();
  assert.equal(await looking(), null, "cleared in the web, cleared in the chat");
  assert.equal(await barSel(), none);
  // "Open in the Web of Secrets" just opens the web, with the selection it already has.
  await page.eval(`document.querySelector(".here .guest").click()`);
  await page.until(`document.querySelector('.side.right .look [data-hint="openWeb"]')`);
  await page.eval(`document.querySelector('.side.right .look [data-hint="openWeb"]').click()`);
  await page.until(`document.querySelector(".web-dock.open") && ${settled}`);
  assert.deepEqual(await webPicked(), [name]);
  // A lore topic clears the guests in both places (when the stream names one).
  await webDown();
  if (await page.eval<boolean>(`!!document.querySelector(".stream .lore-link")`)) {
    await page.eval(`document.querySelector(".stream .lore-link").click()`);
    await page.until(`document.querySelector(".side.right .look .lore-entry")`);
    assert.equal(await barSel(), none, "a lore topic clears the guests");
    await page.eval(`document.activeElement?.blur()`);
    await page.key("Escape", 27);
  }
  void me;
});

test("Il Notaio's box in What you heard and saw: expanded over the dialogue with a strip peeking; a click minimizes it to the foot, another expands it; nothing selected, no box", { skip }, async () => {
  await reopen();
  await webUp();
  const guest = await page.eval<string>(`document.querySelector(".web .node:not(.me)").dataset.guest`);
  await pickNode(guest);
  await page.until(`document.querySelector('.reading[data-state="expanded"] .reading-text')`);
  const geo = () =>
    page.eval<{ pane: { top: number; bottom: number; height: number }; box: { top: number; bottom: number; height: number }; state: string; head: boolean }>(`(() => {
      const r = (e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, height: b.height }; };
      const box = document.querySelector(".reading"), head = box.querySelector(".reading-head").getBoundingClientRect(), b = box.getBoundingClientRect();
      return { pane: r(document.querySelector(".record-pane")), box: r(box), state: box.dataset.state, head: head.top >= b.top && head.bottom <= b.bottom && head.height > 0 };
    })()`);
  const steady = () => page.until(`document.getAnimations().every((a) => a.effect?.getComputedTiming().iterations === Infinity)`);
  let g = await geo();
  assert.ok(g.box.top - g.pane.top > 10 && g.box.top - g.pane.top < 80, `a strip of the dialogue peeks out at the top (${g.box.top - g.pane.top}px)`);
  assert.ok(g.box.height > g.pane.height * 0.7, "it covers almost all the dialogue");
  await page.shot("reading-expanded");
  // A click on the box minimizes it to the column's foot, still showing its first lines.
  await clickAt(".reading");
  await page.until(`document.querySelector('.reading[data-state="minimized"]')`);
  await steady();
  g = await geo();
  assert.ok(g.pane.bottom - g.box.bottom < 20 && g.box.height < g.pane.height * 0.4, "minimized at the foot");
  assert.ok(g.head, "its first lines still show");
  await page.shot("reading-minimized");
  // The dialogue can be read, and a click on it leaves the box minimized; clicking the box expands it again.
  await clickAt({ x: (await page.eval<number>(`(() => { const b = document.querySelector(".record-pane").getBoundingClientRect(); return b.left + 30; })()`)), y: g.pane.top + 12 });
  assert.equal((await geo()).state, "minimized");
  await clickAt(".reading");
  await page.until(`document.querySelector('.reading[data-state="expanded"]')`);
  // A click on the dialogue behind it (its peeking strip) minimizes it too.
  await steady();
  g = await geo();
  const left = await page.eval<number>(`document.querySelector(".record-pane").getBoundingClientRect().left + 30`);
  await clickAt({ x: left, y: g.pane.top + (g.box.top - g.pane.top) / 2 });
  await page.until(`document.querySelector('.reading[data-state="minimized"]')`);
  // Nothing selected: one line asking for a guest, and no box.
  await pickNode(guest);
  await page.until(`document.querySelector(".web-side .record-pick") && !document.querySelector(".reading")`);
  await page.shot("record-empty");
  await webDown();
});

test("the right panel hides to a strip with a handle, the chat widens; selecting doesn't reopen it; remembered on reload", { skip }, async () => {
  await reopen();
  const width = (sel: string) => page.eval<number>(`document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect().width`);
  const centre = await width(".centre");
  await page.eval(`document.querySelector('[data-hint="hideRight"]').click()`);
  await page.until(`document.querySelector(".side.right.hidden .right-handle")`);
  assert.ok((await width(".side.right")) < 60, "a thin strip");
  assert.ok((await width(".centre")) > centre + 150, "the chat widens");
  // Selecting a guest doesn't reopen it; the handle shows their small portrait.
  await page.until(`document.querySelector(".here .guest")`);
  const name = await page.eval<string>(`document.querySelector(".here .guest").textContent`);
  await page.eval(`document.querySelector(".here .guest").click()`);
  await page.until(`document.querySelector(".right-handle-guest .portrait")`);
  assert.equal(await page.eval<string>(`document.querySelector(".right-handle-guest").dataset.guest`), name);
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".side.right.hidden")`), true, "still hidden");
  await page.shot("right-hidden");
  // Remembered on reload.
  await reopen();
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".side.right.hidden")`), true, "still hidden after a reload");
  // The handle brings it back, and that's remembered too.
  await page.eval(`document.querySelector('[data-hint="showRight"]').click()`);
  await page.until(`document.querySelector(".side.right:not(.hidden) .person.talk")`);
  assert.ok(Math.abs((await width(".centre")) - centre) < 2, "the chat back to its width");
  await reopen();
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".side.right:not(.hidden) .person.talk")`), true, "shown after a reload");
});

test("the rules: a button per section filling the modal; one grows to fill it, its × shrinks it back. The city: a list; a row opens its entry, the arrow goes back", { skip }, async () => {
  await reopen();
  await page.eval(`document.querySelector('[data-hint="rules"]').click()`);
  await page.until(`document.querySelector(".deck-rules button.rules-section")`);
  const buttons = await page.eval<number>(`document.querySelectorAll(".deck-rules button.rules-section").length`);
  assert.ok(buttons >= 6, `a button per section (${buttons})`);
  const fill = await page.eval<number>(`(() => { const m = document.querySelector(".deck-rules .rules-body").getBoundingClientRect(), g = document.querySelector(".rules-buttons").getBoundingClientRect(); return g.width / m.width; })()`);
  assert.ok(fill > 0.85, "the buttons fill the modal's width");
  await page.shot("rules-buttons");
  const title = await page.eval<string>(`document.querySelectorAll(".deck-rules button.rules-section")[1].textContent`);
  await page.eval(`document.querySelectorAll(".deck-rules button.rules-section")[1].click()`);
  await page.until(`document.querySelector(".deck-rules section.rules-section.open")`);
  assert.equal(await page.eval<string>(`document.querySelector(".deck-rules section.rules-section h3").textContent`), title);
  assert.equal(await page.eval<number>(`document.querySelectorAll(".deck-rules button.rules-section").length`), 0, "the section fills the modal");
  await page.shot("rules-section");
  await page.eval(`document.querySelector('[data-hint="rulesShrink"]').click()`);
  await page.until(`document.querySelectorAll(".deck-rules button.rules-section").length === ${buttons}`);
  // It remembers an open section.
  await page.eval(`document.querySelectorAll(".deck-rules button.rules-section")[1].click()`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".overlay")`);
  await page.eval(`document.querySelector('[data-hint="rules"]').click()`);
  await page.until(`document.querySelector(".deck-rules section.rules-section.open")`);
  await page.eval(`document.querySelector('[data-hint="rulesShrink"]').click()`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".overlay")`);
  // The city: rows under subject headers, each a title and a one-line preview; a row opens its entry, with a back arrow.
  await page.eval(`document.querySelector('[data-hint="city"]').click()`);
  await page.until(`document.querySelector(".deck-city .city-row")`);
  const rows = await page.eval<{ n: number; subjects: number; oneLine: boolean; scrolls: boolean }>(`(() => {
    const list = document.querySelector(".city-list"), p = document.querySelector(".city-preview");
    return { n: document.querySelectorAll(".city-row").length, subjects: document.querySelectorAll(".city-subject").length, oneLine: p.getBoundingClientRect().height < parseFloat(getComputedStyle(p).lineHeight) * 1.5, scrolls: getComputedStyle(list).overflowY === "auto" };
  })()`);
  assert.ok(rows.n > 0 && rows.subjects > 0, "rows under subject headers");
  assert.ok(rows.oneLine, "a one-line preview");
  assert.ok(rows.scrolls, "the list scrolls");
  await page.shot("city-list");
  const entry = await page.eval<{ id: string; title: string }>(`(() => { const r = document.querySelectorAll(".city-row")[0]; return { id: r.dataset.lore, title: r.querySelector(".city-title").textContent }; })()`);
  await page.eval(`document.querySelectorAll(".city-row")[0].click()`);
  await page.until(`document.querySelector(".city-entry")`);
  assert.equal(await page.eval<string>(`document.querySelector(".city-entry").dataset.lore`), entry.id);
  assert.equal(await page.eval<string>(`document.querySelector(".city-entry h3").textContent`), entry.title);
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".side.right .look:not(.leaving)")`), false, "not on the right: the city opens here");
  await page.shot("city-entry");
  await page.eval(`document.querySelector('[data-hint="cityBack"]').click()`);
  await page.until(`document.querySelector(".city-row") && !document.querySelector(".city-entry")`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".overlay")`);
});

test("the placeholder carries the example, with an @ and a /; no example line under the box; the counter stays", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".input textarea")`);
  const r = await page.eval<{ placeholder: string; example: boolean; count: boolean; commands: string[] }>(`({
    placeholder: document.querySelector(".input textarea").placeholder,
    example: !!document.querySelector(".input .example"),
    count: !!document.querySelector(".input .count"),
    commands: [],
  })`);
  assert.ok(r.placeholder.includes("@") && r.placeholder.includes("/"), r.placeholder);
  assert.equal(r.example, false);
  assert.equal(r.count, true);
  // Only a command allowed now: the one in the placeholder is in the command menu.
  const named = r.placeholder.match(/\/[a-z]+/)?.[0];
  await page.eval(`document.querySelector(".input textarea").focus()`);
  await page.type("/");
  await page.until(`document.querySelector('[data-menu="commands"]')`);
  const menu = await page.eval<string[]>(`[...document.querySelectorAll('[data-menu="commands"] .cmd')].map((c) => c.textContent.split(" ")[0])`);
  if (named) assert.ok(menu.includes(named), `${named} is allowed now (${menu.join(", ")})`);
  await page.key("Backspace", 8);
  await page.shot("placeholder");
});

// ---- CC-20261114-08 (#117, part 1 of 3) ------------------------------------------------------------------

test("the midnight line in the sheet: one act, and with plot_reward off (the mini-game) no second line, before the check or after", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".sheet-panel .midnight-line")`);
  const words = JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { screen: { midnightLine: { acts: string } } };
  const r = await page.eval<{ text: string; extra: boolean; inside: boolean }>(`(() => {
    const l = document.querySelector(".sheet-panel .midnight-line"), p = document.querySelector(".sheet-panel").getBoundingClientRect(), b = l.getBoundingClientRect();
    return { text: l.firstElementChild.textContent, extra: !!l.querySelector(".midnight-extra"), inside: b.top >= p.top && b.bottom <= p.bottom && b.height > 0 };
  })()`);
  assert.equal(r.text, words.screen.midnightLine.acts);
  assert.equal(r.extra, false, "the mini-game runs with plot_reward off, so there's no +1 line");
  assert.ok(r.inside, "in the sheet");
  await page.shot("midnight-line");
});

test("the web's bar is one centered group; with someone selected, a dot and their small portraits and names", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".here .guest")`);
  const centred = () =>
    page.eval<{ off: number; names: boolean; arrow: string }>(`(() => {
      const bar = document.querySelector(".web-bar").getBoundingClientRect(), g = document.querySelector(".web-bar-group").getBoundingClientRect();
      return { off: Math.abs((g.left + g.right) / 2 - (bar.left + bar.right) / 2), names: !!document.querySelector(".web-bar-sel"), arrow: document.querySelector(".web-bar-arrow").textContent };
    })()`);
  let c = await centred();
  assert.ok(c.off < 2, `centered (${c.off}px off)`);
  assert.equal(c.names, false, "no one selected: just the arrow and the title");
  assert.equal(c.arrow, "▲");
  const name = await page.eval<string>(`document.querySelector(".here .guest").textContent`);
  await page.eval(`document.querySelector(".here .guest").click()`);
  await page.until(`document.querySelector(".web-bar-sel")`);
  c = await centred();
  assert.ok(c.off < 2, `still centered with a selection (${c.off}px off)`);
  assert.equal(await barSel(), name);
  assert.equal(await page.eval<number>(`document.querySelectorAll(".web-bar-portraits .portrait").length`), 1, "their small portrait");
  await page.shot("web-bar-selected");
  await webUp();
  assert.equal((await centred()).arrow, "▼", "▼ when open");
  await webDown();
  await page.eval(`document.activeElement?.blur()`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".web-bar-sel")`);
});

test("one Notes tab: the writing box on top, and one list filtered by the selection, for none, one, and a pair; a note's pair selects them", { skip }, async () => {
  await reopen();
  await webUp();
  await page.eval(`document.querySelector('[data-hint="notesTab"]').click()`);
  await page.until(`document.querySelector(".web textarea")`);
  assert.equal(await page.eval<number>(`document.querySelectorAll(".web-side .tabs .tab").length`), 2, "two tabs, no All your notes");
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".web-side select")`), false, "no filter");
  const others = await page.eval<string[]>(`[...document.querySelectorAll(".web .node:not(.me)")].map((n) => n.dataset.guest)`);
  const [a, b, c] = [others[0]!, others[1]!, others[2]!];
  const write = async (text: string) => {
    await page.eval(`document.querySelector(".web textarea").focus()`);
    await page.type(text);
    await page.eval(`document.querySelector('[data-hint="noteSave"]').click()`);
    await page.until(`[...document.querySelectorAll(".note-text")].some((n) => n.textContent === ${JSON.stringify(text)})`);
  };
  const clearPicks = async () => {
    for (const g of await webPicked()) await pickNode(g);
  };
  await clearPicks();
  await pickNode(a);
  await write("On A alone.");
  await pickNode(b);
  await write("On A and B.");
  await clearPicks();
  await pickNode(b);
  await write("On B alone.");
  await pickNode(c);
  await write("On B and C.");
  const list = () => page.eval<{ texts: string[]; headings: string[]; boxOnTop: boolean }>(`(() => {
    const ours = new Set(["On A alone.", "On A and B.", "On B alone.", "On B and C."]);
    const box = document.querySelector(".web textarea").getBoundingClientRect(), first = document.querySelector(".note-list")?.getBoundingClientRect();
    return { texts: [...document.querySelectorAll(".note-text")].map((n) => n.textContent).filter((t) => ours.has(t)), headings: [...document.querySelectorAll(".note-heading")].map((h) => h.textContent), boxOnTop: !first || first.top >= box.bottom };
  })()`);
  // None selected: every note, newest first, grouped by guest and pair.
  await clearPicks();
  let l = await list();
  assert.deepEqual(l.texts, ["On B and C.", "On B alone.", "On A and B.", "On A alone."], "none: every note, by group, newest group first");
  assert.ok(l.headings.length >= 4, `grouped: ${l.headings.join(" | ")}`);
  assert.ok(l.boxOnTop, "the writing box on top");
  await page.shot("notes-none");
  // One guest: theirs and any pair with them.
  await pickNode(b);
  l = await list();
  assert.deepEqual(l.texts, ["On B and C.", "On B alone.", "On A and B."], "one: their notes and every pair with them, newest first");
  assert.deepEqual(l.headings, [], "one list");
  await page.shot("notes-one");
  // A pair: the pair's notes first, then each of the two's, under small headings.
  await pickNode(a);
  l = await list();
  assert.deepEqual(l.texts, ["On A and B.", "On B alone.", "On A alone."]);
  assert.equal(l.headings.length, 3, `under small headings: ${l.headings.join(" | ")}`);
  await page.shot("notes-pair");
  // Clicking a note's pair selects them.
  await clearPicks();
  await page.eval(`[...document.querySelectorAll(".note")].find((n) => n.querySelector(".note-text").textContent === "On B and C.").closest(".note-group").querySelector(".note-heading .note-about").click()`);
  await page.until(`document.querySelectorAll(".web .node.picked").length === 2`);
  assert.deepEqual((await webPicked()).sort(), [b, c].sort(), "the pair is selected, in the web and on its bar");
  await clearPicks();
  await webDown();
});

test("portraits select like names; the player's own name or portrait opens Your briefing, with the hover \"Your briefing\"", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".here button.token")`);
  const name = await page.eval<string>(`document.querySelector(".here button.token").dataset.guest`);
  await page.eval(`document.querySelector(".here button.token").click()`);
  await page.until(`document.querySelector(".side.right .look:not(.leaving)")?.dataset.guest === ${JSON.stringify(name)}`);
  assert.equal(await page.eval<boolean>(`document.querySelector(".here button.token").getAttribute("aria-pressed") === "true"`), true, "marked as selected");
  // Again: deselects.
  await page.eval(`document.querySelector(".here button.token").click()`);
  await page.until(`!document.querySelector(".side.right .look:not(.leaving)")`);
  // The tokens under the "talking with" card, where there are any.
  if (await page.eval<boolean>(`!!document.querySelector(".side.right .tokens button.token")`)) {
    const t = await page.eval<string>(`document.querySelector(".side.right .tokens button.token").dataset.guest`);
    await page.eval(`document.querySelector(".side.right .tokens button.token").click()`);
    await page.until(`document.querySelector(".side.right .look:not(.leaving)")?.dataset.guest === ${JSON.stringify(t)}`);
    await page.eval(`document.activeElement?.blur()`);
    await page.key("Escape", 27);
    await page.until(`!document.querySelector(".side.right .look:not(.leaving)")`);
  }
  // The player's own: opens the briefing, and selects no one.
  const at = await page.eval<{ x: number; y: number }>(`(() => { const b = document.querySelector(".me-briefing .portrait").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...at });
  await page.until(`document.querySelector(".tip:not(.measuring)")`);
  assert.equal(await page.eval<string>(`document.querySelector(".tip").textContent`), "Your briefing");
  await clickAt(at);
  await page.until(`document.querySelector(".deck-briefing .deck-card")`);
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".side.right .look:not(.leaving)")`), false, "no one selected");
  await page.shot("own-portrait-briefing");
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".overlay")`);
});

test("the right panel's card slides down when deselected, and clicking empty background in the stream or the panel deselects; names, buttons, and the box don't", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".here .guest") && document.querySelector(".stream .ln")`);
  const select = async () => {
    await page.eval(`document.querySelector(".here .guest").click()`);
    await page.until(`document.querySelector(".side.right .look:not(.leaving)") && document.querySelector(".side.right .look").getAnimations().every((a) => a.playState === "finished")`);
  };
  const isSelected = () => page.eval<boolean>(`!!document.querySelector(".side.right .look:not(.leaving)")`);
  // The ×: the card slides down (a leaving card for a moment), then it's gone.
  await select();
  await page.eval(`document.querySelector('.side.right .look [data-hint="deselect"]').click()`);
  await page.until(`document.querySelector(".side.right .look.leaving")`);
  await page.until(`!document.querySelector(".side.right .look")`);
  // Clicking a name, a link, a button, or the message box keeps the selection.
  await select();
  await clickAt(".input textarea");
  assert.equal(await isSelected(), true, "the message box doesn't deselect");
  // A line's words are the stream's background: they deselect, but not a name in the stream.
  const words = await page.eval<{ x: number; y: number } | null>(`(() => {
    const s = document.querySelector(".stream").getBoundingClientRect();
    for (const tx of [...document.querySelectorAll(".stream .ln .tx")].reverse()) {
      const r = tx.getClientRects()[0];
      if (!r || r.top < s.top || r.bottom > s.bottom) continue;
      const at = { x: r.left + 2, y: r.top + r.height / 2 };
      if (!document.elementFromPoint(at.x, at.y)?.closest("button, a")) return at;
    }
    return null;
  })()`);
  assert.ok(words, "a line's words in sight");
  await clickAt(words!);
  await page.until(`!document.querySelector(".side.right .look:not(.leaving)")`);
  await select();
  // A name in the stream (another guest's) selects them; its click never counts as the background's.
  const now = await looking();
  const g = await page.eval<string | null>(`[...document.querySelectorAll(".stream .guest")].map((b) => b.textContent).find((t) => t !== ${JSON.stringify(now)}) ?? null`);
  if (g) {
    await page.eval(`[...document.querySelectorAll(".stream .guest")].find((b) => b.textContent === ${JSON.stringify(g)}).click()`);
    await page.until(`document.querySelector(".side.right .look:not(.leaving)")?.dataset.guest === ${JSON.stringify(g)}`);
  }
  // The card's own buttons don't deselect (Open in the Web of Secrets opens the web, keeping the selection).
  await page.eval(`document.querySelector('.side.right .look [data-hint="openWeb"]').click()`);
  await page.until(`document.querySelector(".web-dock.open") && ${settled}`);
  await webDown();
  assert.equal(await isSelected(), true, "a button isn't background");
  // The stream's empty background deselects.
  const empty = await page.eval<{ x: number; y: number }>(`(() => { const s = document.querySelector(".stream").getBoundingClientRect(); const end = document.querySelector(".stream > :last-child").getBoundingClientRect(); return { x: s.left + 10, y: Math.min(s.bottom - 4, Math.max(end.bottom + 2, s.top + 4)) }; })()`);
  await clickAt(empty);
  await page.until(`!document.querySelector(".side.right .look:not(.leaving)")`);
  // The right panel's empty background deselects too: the blank space at the foot of the card that fills it.
  await select();
  const blank = await page.eval<{ x: number; y: number }>(`(() => { const c = document.querySelector(".side.right .look:not(.leaving)").getBoundingClientRect(); return { x: c.left + c.width / 2, y: c.bottom - 8 }; })()`);
  assert.equal(await page.eval<boolean>(`!document.elementFromPoint(${blank.x}, ${blank.y})?.closest("button, a, [tabindex]")`), true, "blank space");
  await clickAt(blank);
  await page.until(`!document.querySelector(".side.right .look:not(.leaving)")`);
  // Switching: the current card slides down and the new one comes up right behind it.
  await select();
  const current = await looking();
  const other = await page.eval<string | null>(`[...document.querySelectorAll(".room button.token")].map((b) => b.dataset.guest).find((g) => g !== ${JSON.stringify(current)}) ?? null`);
  if (other) {
    await page.eval(`[...document.querySelectorAll(".room button.token")].find((b) => b.dataset.guest === ${JSON.stringify(other)}).click()`);
    await page.until(`document.querySelector(".side.right .look.leaving") && document.querySelector(".side.right .look.follows")?.dataset.guest === ${JSON.stringify(other)}`);
    await page.until(`!document.querySelector(".side.right .look.leaving")`);
  }
  await page.eval(`document.activeElement?.blur()`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".side.right .look")`);
});

// ---- CC-20261114-09 (#117, part 2 of 3) ------------------------------------------------------------------

const HINTS_OFF = async (off: boolean) => {
  const on = await page.eval<boolean>(`document.querySelector('[data-hint="switch"]').getAttribute("aria-pressed") === "true"`);
  if (on === off) await page.eval(`document.querySelector('[data-hint="switch"]').click()`);
};

test("four modals in a row: Your briefing, The rules, The city, Glossary; each between its faded neighbours; clicking one slides to it; nothing before the first or after the last; each keeps its place; Escape closes", { skip }, async () => {
  await reopen();
  await page.until(`!document.querySelector('[data-hint="glossary"]').disabled`);
  const row = () =>
    page.eval<{ open: string; left: string | null; right: string | null; leftFaded: boolean; rightFaded: boolean; inView: boolean }>(`(() => {
      const m = document.querySelector(".modal.deck"), l = document.querySelector(".modal-peek.left"), r = document.querySelector(".modal-peek.right");
      const b = m.getBoundingClientRect();
      return { open: [...m.classList].find((c) => c.startsWith("deck-")).slice(5), left: l.dataset.deck ?? null, right: r.dataset.deck ?? null,
        leftFaded: getComputedStyle(l).maskImage.startsWith("linear-gradient(to right"), rightFaded: getComputedStyle(r).maskImage.startsWith("linear-gradient(to left"),
        inView: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight };
    })()`);
  await page.eval(`document.querySelector('[data-hint="briefing"]').click()`);
  await page.until(`document.querySelector(".deck-briefing .deck-card")`);
  let r = await row();
  assert.deepEqual([r.open, r.left, r.right], ["briefing", null, "rules"], "nothing to the briefing's left");
  assert.ok(r.inView);
  // The briefing's place: its second card. The arrow keys still turn it.
  await page.key("ArrowRight", 39);
  const card = await page.eval<string>(`document.querySelector(".deck .tab.on").textContent`);
  // Along the row: rules, city, glossary, each with its neighbours, the left side faded on the left and the right on the right.
  for (const [want, left, right] of [["rules", "briefing", "city"], ["city", "rules", "glossary"], ["glossary", "city", null]] as const) {
    await page.until(`document.querySelector(".modal.deck").getAnimations().length === 0`);
    await clickAt(".modal-peek.right");
    await page.until(`document.querySelector(".modal.deck-${want}")`);
    r = await row();
    assert.deepEqual([r.open, r.left, r.right], [want, left, right], want);
    assert.ok(r.leftFaded, `${want}: the one before shows faded on its left`);
    if (right) assert.ok(r.rightFaded, `${want}: the next shows faded on its right`);
    await page.shot(`modal-row-${want}`);
  }
  // Nothing to the glossary's right: no neighbour there to move to.
  assert.equal(await page.eval<boolean>(`document.querySelector(".modal-peek.right").matches(".empty:not([role])")`), true, "nothing right of the glossary");
  // Back along: left to the briefing, which kept its card.
  for (const want of ["city", "rules", "briefing"]) {
    // Once the row has stopped sliding (the open one passes over its neighbour as it comes in).
    await page.until(`document.querySelector(".modal.deck").getAnimations().length === 0`);
    await clickAt(".modal-peek.left");
    await page.until(`document.querySelector(".modal.deck-${want}")`);
  }
  assert.equal(await page.eval<string>(`document.querySelector(".deck .tab.on").textContent`), card, "the briefing kept its place");
  assert.equal(await page.eval<boolean>(`document.querySelector(".modal-peek.left").matches(".empty:not([role])")`), true, "nothing left of the briefing");
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".overlay")`);
});

test("the glossary: alphabetical, a search that narrows as you type and is kept, and More in the rules opening that section", { skip }, async () => {
  await reopen();
  await page.until(`!document.querySelector('[data-hint="glossary"]').disabled`);
  await page.eval(`document.querySelector('[data-hint="glossary"]').click()`);
  await page.until(`document.querySelector(".glossary-entry")`);
  const terms = () => page.eval<string[]>(`[...document.querySelectorAll(".glossary-entry dt")].map((d) => d.textContent)`);
  const all = await terms();
  const key = (x: string) => x.replace(/^\//, "").toLowerCase();
  assert.deepEqual(all, [...all].sort((a, b) => key(a).localeCompare(key(b))), "alphabetical");
  assert.ok(!all.includes("Ballot"), "the mini-game leaves out the full game's terms");
  await page.eval(`document.querySelector(".glossary-search").focus()`);
  await page.type("payr");
  await page.until(`document.querySelectorAll(".glossary-entry").length < ${all.length}`);
  const narrowed = await terms();
  assert.ok(narrowed.length > 0 && narrowed.includes("France's payroll"), `narrowed as you type: ${narrowed.join(", ")}`);
  await page.shot("glossary-search");
  // The search is kept when the modal closes and opens again.
  await page.eval(`document.activeElement.blur()`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".overlay")`);
  await page.eval(`document.querySelector('[data-hint="glossary"]').click()`);
  await page.until(`document.querySelector(".glossary-search")`);
  assert.equal(await page.eval<string>(`document.querySelector(".glossary-search").value`), "payr");
  // More in the rules: the rules modal, at that section.
  await page.eval(`document.querySelector(".glossary-search").select()`);
  await page.key("Backspace", 8);
  await page.type("Florins");
  await page.until(`[...document.querySelectorAll(".glossary-entry")].some((e) => e.dataset.term === "Florins" && e.querySelector(".glossary-rules"))`);
  await page.eval(`[...document.querySelectorAll(".glossary-entry")].find((e) => e.dataset.term === "Florins").querySelector(".glossary-rules").click()`);
  await page.until(`document.querySelector(".deck-rules section.rules-section.open")`);
  assert.equal(await page.eval<string>(`document.querySelector(".deck-rules section.rules-section h3").textContent`), "Money");
  await page.shot("glossary-more-in-the-rules");
  await page.eval(`document.querySelector('[data-hint="rulesShrink"]').click()`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".overlay")`);
  // Clear the search for the tests after.
  await page.eval(`document.querySelector('[data-hint="glossary"]').click()`);
  await page.until(`document.querySelector(".glossary-search")`);
  await page.eval(`document.querySelector(".glossary-search").select()`);
  await page.key("Backspace", 8);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".overlay")`);
});

test("a glossary word in the chat: a faint dotted underline, its definition on hover, even with the explanations off; not a link", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".stream .ln")`);
  // The player's own line, with glossary words in it: the fake game's lines name none. Spoken at once while
  // the company waits for the player, or at the next pause.
  await page.until(`document.querySelector(".input textarea")`);
  await page.eval(`document.querySelector(".input textarea").focus()`);
  await page.type("Shall we speak of Florins before midnight?");
  await page.eval(`document.querySelector('[data-hint="speak"]').click()`);
  await page.until(`document.querySelector(".stream .ln.mine .gloss")`);
  await HINTS_OFF(true);
  await page.eval(`document.querySelector(".stream .gloss").scrollIntoView({ block: "center" })`);
  await page.eval(`new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)))`);
  const g = await page.eval<{ term: string; style: string; x: number; y: number }>(`(() => { const e = document.querySelector(".stream .ln.mine .gloss"), b = e.getBoundingClientRect(); return { term: e.dataset.gloss, style: getComputedStyle(e).textDecorationStyle, x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  assert.equal(g.style, "dotted");
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: g.x, y: g.y });
  await page.until(`document.querySelector(".tip:not(.measuring)")`);
  const tip = await page.eval<string>(`document.querySelector(".tip").textContent`);
  assert.ok(tip.startsWith(`${g.term}: `) && tip.length > g.term.length + 10, `its definition: ${tip}`);
  await page.shot("glossary-underline");
  // Not a link: clicking selects nothing.
  await clickAt({ x: g.x, y: g.y });
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".side.right .look:not(.leaving)")`), false);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
  await HINTS_OFF(false);
});
