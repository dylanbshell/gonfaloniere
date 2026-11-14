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
  await page.until(`document.querySelector('.side.right .look')?.dataset.guest === ${JSON.stringify(name)} && document.querySelector('.side.right [data-hint="lookingAt"]')`);
  await page.shot("looking-at");
  await page.eval(`document.querySelector(".input textarea").blur()`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector('.side.right .look')`);
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
  await page.eval(`document.querySelector('[data-hint="allTab"]').click()`);
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
  const parts: Record<string, string> = { left: `.side.left [data-hint="briefing"]`, stream: `.stream .ln`, right: `.side.right [data-hint="openWeb"]`, input: `.input textarea` };
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
