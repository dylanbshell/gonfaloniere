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
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { titleCase, titleRule } from "../web/src/model.ts";
import { CHROME, Page, skip, stop, waitFor } from "./fixtures/chrome.ts";

/** A name from another doc as the screen shows it: in title case, by the setting pack's rule (Interface v0.17). */
const TC = (text: string) => titleCase(text, titleRule((JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { titleCase: unknown }).titleCase));

let play: ChildProcess | null = null;
let chrome: ChildProcess | null = null;
let profile = "";
let page: Page;
/** The screen's address, and what the start button's explanation said before and after the game started. */
let base = "";
let startTip: string | null = null;
let tipAfterStart: string | null = null;
/** The opening as it was written, before the game started (Interface v0.7), and the tour's first step after the choice. */
type Story = { paras: { state: string; text: string; full: string }[]; choice: boolean; gloss: string | null; name: string | null; phrases: string[]; heading: string | null; locked: string[]; footInView: boolean };
const opening: Partial<Record<"beforeWriting" | "writing" | "afterClick" | "end" | "skipped" | "reduced", Story>> & { headTop?: number } = {};
let tourAtStart: string | null = null;
/** TD v0.51, the tour's hold: what the screen had while the tour ran, and what came once it was skipped. */
const held: { lines?: number; places?: number; errand?: boolean; sent?: string[]; linesAfter?: number; breathes?: boolean; breathesAfterClick?: boolean } = {};

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
  // The opening (Interface v0.7): what it shows as Il Notaio writes, a click, Skip, and reduced motion; then the
  // choice, and the tour that follows it. Seen here, before the game starts, and checked in the tests below.
  const story = `({ paras: [...document.querySelectorAll(".opening-para")].map((p) => ({ state: p.dataset.state, text: p.textContent, full: p.dataset.full ?? p.textContent })), choice: !!document.querySelector(".opening-choice .start-card"), gloss: document.querySelector(".opening-gloss")?.textContent ?? null, name: document.querySelector(".opening-name")?.textContent ?? null, phrases: [...document.querySelectorAll(".opening-phrase")].map((x) => x.textContent), heading: document.querySelector(".opening-choice h2")?.textContent ?? null, locked: [...document.querySelectorAll(".start-card.locked")].map((c) => c.dataset.guest + ": " + c.querySelector(".locked-label").textContent + (c.querySelector("button") ? " (a button)" : "")), footInView: (() => { const f = document.querySelector(".opening-foot")?.getBoundingClientRect(); return !!f && f.top <= innerHeight + 2; })() })`;
  await page.send("Page.navigate", { url });
  await page.until(`document.querySelector(".opening .opening-name")`);
  opening.beforeWriting = await page.eval(story);
  await page.until(`(() => { const p = document.querySelector('.opening-para[data-state="writing"]'); return p && p.textContent.length > 0 && p.textContent.length < p.dataset.full.length; })()`, 10_000);
  opening.writing = await page.eval(story);
  await page.shot("opening-writing");
  const head = await page.eval<{ top: number }>(`({ top: document.querySelector(".opening-head").getBoundingClientRect().top })`);
  opening.headTop = head.top;
  await page.eval(`document.querySelector(".opening-story").click()`);
  opening.afterClick = await page.eval(story);
  // The rest, a click finishing each paragraph as he writes it (#148's six take over a minute by pen). Only
  // mid-paragraph: a click in the pause between paragraphs would start the pause again.
  await page.until(`(() => { const p = document.querySelector('.opening-para[data-state="writing"]'); if (p && p.textContent.length < p.dataset.full.length) document.querySelector(".opening-story").click(); return document.querySelector(".opening-choice .start-card"); })()`, 20_000);
  // The page follows the text down (a smooth scroll), bringing the choice into view.
  await page.until(`document.querySelector(".opening-foot").getBoundingClientRect().top <= innerHeight + 2`, 5_000);
  opening.end = await page.eval(story);
  await page.eval(`document.querySelector(".opening-choice").scrollIntoView({ block: "end" })`);
  await page.shot("opening-choice");
  // Again from the start: Skip writes it all out at once.
  await page.send("Page.reload");
  await page.until(`document.querySelector(".opening-skip")`);
  await page.eval(`document.querySelector(".opening-skip").click()`);
  opening.skipped = await page.eval(story);
  // With reduced motion set, each paragraph appears whole.
  await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await page.send("Page.reload");
  await page.until(`document.querySelector(".opening-para")`, 10_000);
  opening.reduced = await page.eval(story);
  await page.until(`document.querySelector(".opening-choice .start-card button")`, 20_000);
  await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  // Choose the card as a player would: hover (its explanation shows), then click. The game
  // starts and waits for the player, with the sheet (the decks) in hand.
  // The story runs past the window now (#148), so scroll down to the card first, as a player would.
  const b = await page.eval<{ x: number; y: number }>(`(() => { const e = document.querySelector(".start-card button"); e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...b });
  await page.until(`document.querySelector(".tip:not(.measuring)")`);
  startTip = await page.eval<string>(`document.querySelector(".tip").textContent`);
  // A click that doesn't move focus to the button, as in Safari and Firefox on a Mac (Chrome's focus would
  // hide the explanation by a blur when the button is disabled, so headless Chrome alone never saw this).
  await page.eval(`document.querySelector(".start-card button").click()`);
  await page.until(`document.querySelector(".input textarea") && !document.querySelector('[data-hint="briefing"]').disabled`);
  tipAfterStart = await page.eval<string | null>(`document.querySelector(".tip")?.textContent ?? null`);
  // The tour starts by itself after the choice (Interface v0.8); skipped here, so the tests below have the
  // screen to themselves, and run again with Show me around in its own test.
  await page.until(`document.querySelector(".tour")`);
  tourAtStart = await page.eval<string>(`document.querySelector(".tour").dataset.step`);
  await page.shot("tour-after-choice");
  // TD v0.51: the game holds its first line while the tour runs, with the sheet, errand, and room in hand.
  await new Promise((r) => setTimeout(r, 300));
  Object.assign(held, await page.eval(`({ lines: document.querySelectorAll(".stream .ln").length, places: document.querySelectorAll(".places .place").length, errand: !!document.querySelector(".side.left .errand") })`));
  await page.eval(`(() => { window.__sent = []; const send = WebSocket.prototype.send; WebSocket.prototype.send = function (d) { window.__sent.push(JSON.parse(d)); return send.call(this, d); }; })()`);
  await page.eval(`document.querySelector(".tour-skip").click()`);
  await page.until(`!document.querySelector(".tour")`);
  await page.until(`document.querySelector(".stream .ln")`);
  held.sent = await page.eval<string[]>(`window.__sent.map((m) => m.type)`);
  // Interface v0.16: after a skipped tour, Your briefing breathes until the player clicks it or anywhere else.
  held.breathes = await page.eval<boolean>(`document.querySelector('.side.left [data-hint="briefing"]').classList.contains("breathe")`);
  await page.eval(`new Promise((ok) => setTimeout(ok, 50))`);
  await page.eval(`document.querySelector(".side.left .label").click()`);
  held.breathesAfterClick = await page.eval<boolean>(`document.querySelector('.side.left [data-hint="briefing"]').classList.contains("breathe")`);
  held.linesAfter = await page.eval<number>(`document.querySelectorAll(".stream .ln").length`);
});

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
  const name = await page.eval<string>(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").dataset.guest`);
  await page.eval(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").click()`);
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
  // Il Notaio's box answers a selection: on the default TD (v0.51), his guarded reading, every sentence checked.
  await page.eval(`document.querySelector('.web .node:not(.me)').dispatchEvent(new MouseEvent("click", { bubbles: true }))`);
  await page.until(`document.querySelector(".reading-text")?.dataset.reading === "guarded"`);
  await page.shot("web-reading");
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".web-dock.open") && document.querySelector(".web-dock").getAnimations().length === 0`);
  assert.equal(Math.round(await page.eval<number>(`document.querySelector(".web-dock").getBoundingClientRect().height`)), Math.round(bar.bottom - bar.top), "Escape slides it down to the bar");
});

// ---- CC-20261113-04 (#95) --------------------------------------------------------------------------------

/**
 * Plays the screen with each incoming state changed by `transform` (a function's source, state => state), for
 * moments the fake game can't reach (a council, a private place on demand), then puts the page back as it was.
 * The screen sees only what its connection delivers, so this is a fixture state, not a change to the screen.
 */
async function withStates(transform: string, check: () => Promise<void>): Promise<void> {
  return withEvents(`(e) => { if (e.type === "state" && e.state) e.state = (${transform})(e.state); return e; }`, check);
}

/**
 * The same for any incoming event: `transform` (a function's source, event => event, or => a list of events to
 * deliver in its place) can change a sheet's track or follow an event with a request the fake game doesn't make.
 */
async function withEvents(transform: string, check: () => Promise<void>): Promise<void> {
  // The Page domain must be on for a script to run on the next document.
  await page.send("Page.enable");
  const { identifier } = await page.send<{ identifier: string }>("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => { const T = ${transform}; const W = window.WebSocket; window.WebSocket = class extends W { set onmessage(f) { super.onmessage = (m) => { for (const e of [T(JSON.parse(m.data))].flat()) f({ data: JSON.stringify(e) }); }; } get onmessage() { return super.onmessage; } }; })()`,
  });
  try {
    await reopen();
    await check();
  } finally {
    await page.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
    await reopen();
  }
}

test("the places (Interface v0.9): all eight in the pack's order, empty ones faded, yours marked, a private one behind a closed door; tokens spread on hover and select; a place's name shows its description", { skip }, async () => {
  const pack = (JSON.parse(readFileSync("setting/florence-1492/setting.json", "utf8")) as { places: string[] }).places;
  const words = JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { screen: { places: { descriptions: Record<string, string> }; hints: Record<string, string> } };
  await reopen();
  await page.until(`document.querySelectorAll(".places .place").length > 0`);
  const rows = await page.eval<{ name: string; heading: string; empty: boolean; own: boolean; opacity: number; tokens: number }[]>(`[...document.querySelectorAll(".places .place")].map((r) => ({ name: r.dataset.place, heading: r.querySelector(".place-name").textContent, empty: r.classList.contains("empty"), own: r.classList.contains("own"), opacity: Number(getComputedStyle(r).opacity), tokens: r.querySelectorAll(".token").length }))`);
  assert.equal(pack.length, 8);
  assert.deepEqual(rows.map((r) => r.name), pack, "all eight, in the pack's order");
  assert.deepEqual(rows.map((r) => r.heading), pack.map((n) => n[0]!.toUpperCase() + n.slice(1)), "headings capitalize only the first letter");
  assert.ok(rows.some((r) => r.empty), "some places are empty");
  for (const r of rows) {
    assert.equal(r.empty, r.tokens === 0, `${r.name}: empty means no one there`);
    assert.ok(r.empty ? r.opacity < 1 : r.opacity === 1, `${r.name}: an empty place is faded, an occupied one isn't`);
  }
  assert.equal(rows.filter((r) => r.own).length, 1, "your own place is marked");
  assert.equal(await page.eval<boolean>(`!!document.querySelector('.place.own .token[data-guest="Francesco Pazzi"]')`), true, "with you in it");
  // Interface v0.16: "You are here" on its own line, under the place's name.
  const here = await page.eval<{ text: string; below: boolean }>(`(() => { const r = document.querySelector(".place.own"); const n = r.querySelector(".place-name").getBoundingClientRect(); const o = r.querySelector(".place-own"); return { text: o.textContent, below: o.getBoundingClientRect().top >= n.bottom - 1 }; })()`);
  assert.deepEqual(here, { text: "You are here", below: true });
  assert.equal(await page.eval<boolean>(`getComputedStyle(document.querySelector(".place.own")).borderLeftColor !== getComputedStyle(document.querySelector(".place:not(.own)")).borderLeftColor`), true, "marked by the accent");
  // The place isn't a control; only its portraits are.
  assert.equal(await page.eval<boolean>(`[...document.querySelectorAll(".places .place")].every((r) => !r.closest("button") && !r.querySelector(".place-head button"))`), true);
  // Hovering a place's name shows its description, even with the explanations off.
  const hover = async (sel: string) => {
    await page.eval(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: "center" })`);
    await page.eval(`new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)))`);
    const at = await page.eval<{ x: number; y: number }>(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...at });
    await page.until(`document.querySelector(".tip:not(.measuring)")`);
    return page.eval<string>(`document.querySelector(".tip").textContent`);
  };
  const loggia = pack[3]!;
  assert.equal(await hover(`.place[data-place="${loggia}"] .place-name`), words.screen.places.descriptions[loggia]);
  // Interface v0.16: a hover about the world is a light card, apart from the dark explanations.
  const tipLook = () => page.eval<{ world: boolean; bg: string }>(`(() => { const t = document.querySelector(".tip"); return { world: t.classList.contains("world"), bg: getComputedStyle(t).backgroundColor }; })()`);
  const worldTip = await tipLook();
  assert.equal(worldTip.world, true);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 600, y: 300 });
  await page.until(`!document.querySelector(".tip")`);
  await hover('.side.left [data-hint="briefing"]');
  const plainTip = await tipLook();
  assert.equal(plainTip.world, false);
  assert.notEqual(worldTip.bg, plainTip.bg, "the world card and an explanation look apart");
  await page.eval(`document.querySelector(".switch:not(.tour-again)").click()`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 600, y: 300 });
  await page.until(`!document.querySelector(".tip")`);
  assert.equal(await hover(`.place[data-place="${pack[0]}"] .place-name`), words.screen.places.descriptions[pack[0]!], "even with the explanations off");
  await page.eval(`document.querySelector(".switch:not(.tour-again)").click()`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 600, y: 300 });
  // Overlapping, then spread on hover, in a place with more than one guest.
  const many = `[...document.querySelectorAll(".places .place")].find((r) => r.querySelectorAll(".token").length > 1)`;
  assert.equal(await page.eval<boolean>(`!!${many}`), true, "a place with company");
  const gap = () => page.eval<number>(`(() => { const t = [...${many}.querySelectorAll(".token")]; return t[1].getBoundingClientRect().left - t[0].getBoundingClientRect().right; })()`);
  await page.eval(`${many}.scrollIntoView({ block: "center" })`);
  await page.eval(`new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)))`);
  assert.ok((await gap()) < 0, "a place's tokens overlap");
  const r = await page.eval<{ x: number; y: number }>(`(() => { const b = ${many}.querySelector(".stack").getBoundingClientRect(); return { x: b.left + 4, y: b.top + b.height / 2 }; })()`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...r });
  await page.until(`document.getAnimations().length === 0`);
  assert.ok((await gap()) > 0, "and spread out on hover");
  await page.shot("places");
  // A portrait in a place selects its guest.
  const name = await page.eval<string>(`document.querySelector(".places button.token[data-guest]").dataset.guest`);
  await page.eval(`document.querySelector(".places button.token[data-guest]").click()`);
  await page.until(`document.querySelector('.side.right .look')?.dataset.guest === ${JSON.stringify(name)}`);
  await page.key("Escape", 27);
  // Interface v0.16: your own portrait selects you, and the right panel shows your own card.
  await page.eval(`document.querySelector('.places button.token[data-guest="Francesco Pazzi"]').click()`);
  await page.until(`document.querySelector('.side.right .look:not(.leaving)')?.dataset.guest === "Francesco Pazzi"`);
  assert.equal(await page.eval<boolean>(`!document.querySelector(".overlay")`), true, "it doesn't open the briefing");
  await page.key("Escape", 27);
  // The conversation line names your place.
  const own = rows.find((r) => r.own)!.name;
  assert.match(await page.eval<string>(`document.querySelector(".members .muted").textContent`), new RegExp(`^In ${own}(,| with )`), "the conversation line names the place");
  // A Colloquio's place is marked private, with a closed door (a fixture: the first other occupied place made private).
  const priv = `(s) => { const p = s.places && s.places.find((x) => !x.own && x.guests.length); if (p) p.private = true; return s; }`;
  await withStates(priv, async () => {
    await page.until(`document.querySelector(".places .place.private")`);
    const p = await page.eval<{ door: boolean; doorW: number; own: boolean }>(`(() => { const r = document.querySelector(".places .place.private"); const d = r.querySelector(".door"); return { door: !!d, doorW: d ? d.getBoundingClientRect().width : 0, own: r.classList.contains("own") }; })()`);
    assert.ok(p.door && p.doorW > 0, "a closed-door mark, drawn");
    assert.equal(await hover(".places .place.private .door"), words.screen.hints.placePrivate);
    await page.shot("places-private");
  });
});

test("the places in a council (a fixture state: the mini-game has none): only your own place, with your faction; the conversation line says the same", { skip }, async () => {
  // Seated in a place (as a council always is): the first occupied place is yours if none is at this moment.
  const council = `(s) => { if (!s.places) return s; const places = s.places.some((p) => p.own) ? s.places : s.places.map((p, i, all) => ({ ...p, own: i === all.findIndex((x) => x.guests.length) })); return { ...s, places, conversation: { kind: "council" } }; }`;
  await withStates(council, async () => {
    await page.until(`document.querySelectorAll(".places .place").length === 1`);
    const row = await page.eval<{ own: boolean; heading: string; name: string }>(`(() => { const r = document.querySelector(".places .place"); return { own: r.classList.contains("own"), heading: r.querySelector(".place-name").textContent, name: r.dataset.place }; })()`);
    assert.ok(row.own, "only your own place");
    assert.equal(row.heading, `The Pazzi council, in ${row.name}`, "with your faction");
    assert.equal(await page.eval<string>(`document.querySelector(".members .muted").textContent`), row.heading);
    await page.shot("places-council");
  });
});

// ---- CC-20261114-15 (#141) -------------------------------------------------------------------------------

test("the player's words (Interface v0.12; v0.16): the sheet shows Payments from France and Secret conversations, its hover in plain words; a group's line without places reads A group with …", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".sheet-panel .facts .fact-label")`);
  const facts = await page.eval<string[]>(`[...document.querySelectorAll(".sheet-panel .facts .fact-label")].map((d) => d.textContent)`);
  assert.deepEqual(facts, ["Purse", "Payments from France", "Secret Conversations"]);
  assert.ok(!facts.some((f) => /pension/i.test(f)));
  await HINTS_OFF(false);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  // Between the name and the lines of the sheet, the panel's own explanation.
  const at = await page.eval<{ x: number; y: number }>(`(() => { const a = document.querySelector(".sheet-panel .me-briefing").getBoundingClientRect(); const b = document.querySelector(".sheet-panel .facts").getBoundingClientRect(); return { x: b.left + b.width / 2, y: (a.bottom + b.top) / 2 }; })()`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...at });
  await page.until(`document.querySelector(".tip:not(.measuring)")`);
  assert.equal(await page.eval<string>(`document.querySelector(".tip").textContent`), "This is you: your money, your payments from France, and your secret conversations.");
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  // A state without places (a game before TD v0.49), in a group with two others.
  const group = `(s) => { const { places, ...rest } = s; const others = s.livingOthers.slice(0, 2); return { ...rest, conversation: { kind: "capannello", others }, present: others }; }`;
  await withStates(group, async () => {
    await page.until(`document.querySelector(".members .muted")?.textContent.startsWith("A group with ")`);
    const line = await page.eval<string>(`document.querySelector(".members .muted").textContent`);
    assert.match(line, /^A group with \S/);
    assert.ok(!/Capannello/.test(line), line);
    await page.shot("group-line");
  });
});

// ---- CC-20261116-03 (#177): Interface v0.16, the left panel ------------------------------------------------

test("the left panel (Interface v0.16): the switches centred at the top; You are … over the role; each sheet line opens its rules section; the errand card shows just the task and opens the briefing at the errand; its reward line opens the rules", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".side.left .errand") && !document.querySelector('[data-hint="briefing"]').disabled`);
  const top = await page.eval<{ first: string; centred: boolean; you: string; role: string; label: boolean; nameCentred: boolean }>(`(() => {
    const left = document.querySelector(".side.left");
    const head = left.querySelector(".side-head");
    const hb = head.getBoundingClientRect();
    const bs = [...head.querySelectorAll("button")].map((b) => b.getBoundingClientRect());
    const mid = (Math.min(...bs.map((b) => b.left)) + Math.max(...bs.map((b) => b.right))) / 2;
    const who = left.querySelector(".me-briefing");
    const n = who.querySelector(".name").getBoundingClientRect();
    const wb = who.getBoundingClientRect();
    return { first: left.firstElementChild.className, centred: Math.abs(mid - (hb.left + hb.width / 2)) < 2, you: who.querySelector(".name").textContent, role: who.querySelector(".role").textContent, label: [...left.querySelectorAll(".label")].some((l) => l.textContent === "You"), nameCentred: Math.abs(n.left + n.width / 2 - (wb.left + wb.width / 2)) < 2 };
  })()`);
  assert.equal(top.first, "side-head");
  assert.equal(top.centred, true, "Show me around and the switch, centred");
  assert.equal(top.you, "You are Francesco Pazzi");
  assert.ok(top.role.length > 5, "a role line (the public subtitle, for now)");
  assert.equal(top.label, false, "no You label");
  assert.equal(top.nameCentred, true);
  // Each line of the sheet opens the rules section behind its glossary word.
  const pack = JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { screen: { factLinks: Record<string, string> }; glossary: { entries: { term: string; rules?: string[] }[] } };
  for (const fact of ["purse", "pensions", "withdrawals", "midnight"]) {
    await page.eval(`document.querySelector('.side.left [data-fact="${fact}"]').click()`);
    await page.until(`document.querySelector(".modal.deck-rules section.rules-section.open")`);
    const title = await page.eval<string>(`document.querySelector(".modal.deck-rules section.rules-section.open h3").textContent`);
    const behind = pack.glossary.entries.find((e) => e.term === pack.screen.factLinks[fact])!.rules!.map((r) => r.toLowerCase());
    assert.ok(behind.includes(title.toLowerCase()), `${fact} opens ${title}`);
    await page.eval(`document.querySelector(".deck-close").click()`);
    await page.until(`!document.querySelector(".overlay")`);
  }
  // The errand card: just the task, ending where the bold part's sentence does.
  const errand = await page.eval<string>(`document.querySelector(".side.left .errand-text").textContent`);
  assert.equal(errand, "This comes first: it is what you came for. Before the last council before midnight, give Friar Tommaso at least 3 Florins in total, in one gift or several.");
  await page.shot("left-v016");
  // Clicking it opens the briefing at the errand's card.
  await page.eval(`document.querySelector(".side.left .errand-text").click()`);
  await page.until(`document.querySelector(".modal.deck-briefing .deck-card h3")`);
  assert.equal(await page.eval<string>(`document.querySelector(".modal.deck-briefing .deck-card h3").textContent`), "Your Errand Tonight");
  assert.ok((await page.eval<string>(`document.querySelector(".modal.deck-briefing .deck-card").textContent`)).includes("a gift to the friars that the city will hear of"), "the reasons stay in the briefing");
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".overlay")`);
  // Its reward line opens the rules on errands: the player's own rules have Your Errand (Interface v0.17).
  await page.eval(`document.querySelector(".side.left .errand-reward").click()`);
  await page.until(`document.querySelector(".modal.deck-rules section.rules-section.open")`);
  assert.equal(await page.eval<string>(`document.querySelector(".modal.deck-rules section.rules-section.open h3").textContent`), "Your Errand");
  await page.eval(`document.querySelector(".deck-close").click()`);
  await page.until(`!document.querySelector(".overlay")`);
});

// ---- CC-20261116-04 (#177): Interface v0.16, the centre, decision cards, commands, and the right panel -------

test("a decision card sits in the message box's place (Interface v0.16); every group full says so; from a past stage, one wide Return brings it back", { skip }, async () => {
  // A fixture: a seat choice with no group to join, delivered right after the first state, in place of the game's own requests.
  const seat = `(() => { let sent = false; return (e) => { if (e.type === "request") return []; if (e.type !== "state" || sent || !e.state) return e; sent = true; return [e, { type: "request", seq: 100000, id: "fixture-seat", kind: "seat", options: { form: "invitee", initiator: e.state.livingOthers[0], groups: [], colloquio: e.state.livingOthers.slice(1, 3), wait: true } }]; }; })()`;
  await withEvents(seat, async () => {
    await page.until(`document.querySelector(".input.decision .card")`);
    const geo = await page.eval<{ inBox: boolean; inStream: boolean; textarea: boolean; atFoot: boolean; note: string; shadow: boolean; radius: number }>(`(() => {
      const box = document.querySelector(".input.decision"), b = box.getBoundingClientRect(), c = document.querySelector(".centre").getBoundingClientRect();
      return { inBox: !!box.querySelector(".card"), inStream: !!document.querySelector(".stream .card"), textarea: !!document.querySelector(".input textarea"), atFoot: c.bottom - b.bottom < 20 && b.top > c.top + c.height / 2, note: box.querySelector(".card-note")?.textContent ?? "", shadow: getComputedStyle(box).boxShadow !== "none", radius: parseFloat(getComputedStyle(box).borderTopLeftRadius) };
    })()`);
    assert.ok(geo.inBox && !geo.inStream && !geo.textarea, "the card is in the box's place, not at the end of the conversation");
    assert.ok(geo.atFoot, "at the foot of the centre");
    assert.equal(geo.note, "Every group is full.");
    assert.ok(geo.shadow && geo.radius > 6, "the same floating card");
    // The controls: starting a secret conversation shows the picker and the confirm button at the right.
    await page.eval(`[...document.querySelectorAll(".input.decision .tile")].find((t) => t.dataset.hint === "colloquio").click()`);
    await page.until(`document.querySelector(".input.decision select") && document.querySelector(".input.decision button.confirm")`);
    const controls = await page.eval<{ selectH: number; right: boolean; appearance: string }>(`(() => { const s = document.querySelector(".input.decision select"), k = document.querySelector(".input.decision button.confirm").getBoundingClientRect(), c = document.querySelector(".input.decision .card").getBoundingClientRect(); return { selectH: s.getBoundingClientRect().height, right: Math.abs(k.right - c.right) < 2 && k.width < c.width / 2, appearance: getComputedStyle(s).appearance }; })()`);
    assert.equal(controls.selectH, 32);
    assert.equal(controls.appearance, "none", "its own arrow, not the browser's");
    assert.ok(controls.right, "the confirm button at the right, at its own width");
    await page.shot("decision-card");
    // Reading an earlier stage while it waits: one wide Return button fills the bottom card.
    if (await page.eval<boolean>(`!!document.querySelector(".stage-bar .mark.past .stage")`)) {
      await page.eval(`document.querySelector(".stage-bar .mark.past .stage").click()`);
      await page.until(`document.querySelector(".input.past.decision button.return.wide")`);
      const ret = await page.eval<{ buttons: number; fills: boolean; card: boolean }>(`(() => { const box = document.querySelector(".input.past.decision"), b = box.getBoundingClientRect(), r = box.querySelector("button.return").getBoundingClientRect(); return { buttons: box.querySelectorAll("button, textarea").length, fills: r.width > b.width * 0.85 && r.height > b.height * 0.5, card: !!document.querySelector(".card") }; })()`);
      assert.deepEqual(ret, { buttons: 1, fills: true, card: false });
      await page.shot("decision-return");
      await page.eval(`document.querySelector(".input.past.decision button.return").click()`);
      await page.until(`document.querySelector(".input.decision .card") && !document.querySelector(".past-stage")`);
      assert.equal(await page.eval<string>(`document.querySelector(".input.decision .card-note").textContent`), "Every group is full.", "returning brings the card back");
    }
  });
});

test("the command menu lists every command (Interface v0.16): what's open first, the rest folded under Not available now, greyed, each with its reason; a refused command is explained in Il Notaio's hint until the player types", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".input textarea") && document.querySelector(".prompt")`);
  await page.eval(`document.querySelector(".input textarea").focus()`);
  await page.type("/");
  await page.until(`document.querySelector('[data-menu="commands"] .menu-more')`);
  const folded = await page.eval<{ open: string[]; more: string; expanded: string; closed: number }>(`(() => { const m = document.querySelector('[data-menu="commands"]'); return { open: [...m.querySelectorAll(":scope > li > button[data-command]")].map((b) => b.dataset.command), more: m.querySelector(".menu-more").textContent, expanded: m.querySelector(".menu-more").getAttribute("aria-expanded"), closed: m.querySelectorAll(".cmd-closed").length }; })()`);
  assert.ok(folded.open.length > 0 && !folded.open.includes("bribe"), `what's open now comes first (${folded.open})`);
  assert.equal(folded.more, `Not available now (${7 - folded.open.length})`);
  assert.deepEqual([folded.expanded, folded.closed], ["false", 0], "the rest wait in a folded section");
  await page.eval(`document.querySelector('[data-menu="commands"] .menu-more').click()`);
  await page.until(`document.querySelector('[data-menu="commands"] .cmd-closed')`);
  const closed = await page.eval<Record<string, { usage: string; why: string; opacity: number; button: boolean }>>(`Object.fromEntries([...document.querySelectorAll('[data-menu="commands"] .cmd-closed')].map((c) => [c.dataset.command, { usage: c.querySelector(".cmd").textContent, why: c.querySelector(".why").textContent, opacity: Number(getComputedStyle(c).opacity), button: !!c.closest("button") || !!c.querySelector("button") }]))`);
  assert.equal(closed.bribe!.why, "Only in a secret conversation.", "an unavailable command, with its reason in place of its hint");
  assert.equal(closed.kill!.why, "Only at midnight.");
  assert.equal(closed.conclude!.why, "Only for an errand that asks you to find something out.");
  assert.ok(closed.bribe!.opacity < 1 && !closed.bribe!.button, "greyed, and not a control");
  await page.shot("command-menu-unavailable");
  // Clicking an unavailable command does nothing.
  await page.eval(`document.querySelector('[data-menu="commands"] .cmd-closed[data-command="bribe"]').click()`);
  assert.equal(await page.eval<string>(`document.querySelector(".input textarea").value`), "/");
  // Narrowed to a command that isn't open, the section opens by itself.
  await page.type("br");
  await page.until(`document.querySelectorAll('[data-menu="commands"] .cmd-closed').length === 1 && document.querySelector('[data-menu="commands"] .menu-more').getAttribute("aria-expanded") === "true"`);
  // Running it anyway: Il Notaio explains the refusal in his hint, which flashes; no notice above the box.
  const usual = await page.eval<string>(`document.querySelector(".hint-text").textContent`);
  await page.type("ibe @Giorgia 2");
  await page.key("Enter", 13);
  await page.until(`document.querySelector('.hint-text[data-moment="refusal"]')`);
  assert.equal(await page.eval<string>(`document.querySelector(".hint-text").textContent`), "Money can only change hands in a secret conversation. Start one with the guest first, then try /bribe again.");
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".notaio-hint .hint-glow") && document.querySelector(".hint-text").classList.contains("fresh")`), true, "his box flashes and the new words fade in");
  assert.equal(await page.eval<boolean>(`!document.querySelector(".input .notice")`), true, "no notice above the box");
  await page.shot("notaio-refusal");
  // Folded, his box opens for a refusal.
  await page.eval(`document.querySelector(".hint-head").click()`);
  await page.until(`!document.querySelector(".hint-text")`);
  await page.eval(`document.querySelector(".input textarea").focus()`);
  await page.type("/kill @Giorgia");
  await page.key("Enter", 13);
  await page.until(`document.querySelector('.hint-text[data-moment="refusal"]')?.textContent === "That has to wait for midnight."`);
  // His usual line comes back as soon as the player types again.
  await page.type("W");
  await page.until(`document.querySelector(".hint-text")?.dataset.moment !== "refusal"`);
  assert.equal(await page.eval<string>(`document.querySelector(".hint-text").textContent`), usual);
  await page.key("Backspace", 8);
});

test("the centre's floating cards and the message box (Interface v0.16): shadows and rounded corners, the conversation fading at its edges, the count over the buttons, a two-line placeholder, no scrollbar on the empty box", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".input textarea") && document.querySelector(".stream .ln")`);
  const c = await page.eval<{ head: { shadow: boolean; radius: number; inset: number }; box: { shadow: boolean; radius: number; inset: number }; mask: boolean; count: { right: number; top: number; text: string }; buttons: { right: number; top: number }; prompt: { left: number; top: number }; field: { left: number }; placeholder: string; overflow: string; members: boolean }>(`(() => {
    const r = (e) => e.getBoundingClientRect();
    const centre = r(document.querySelector(".centre")), head = document.querySelector(".conv-head"), box = document.querySelector(".input"), count = document.querySelector(".input .count"), ta = document.querySelector(".input textarea");
    const look = (e) => ({ shadow: getComputedStyle(e).boxShadow !== "none", radius: parseFloat(getComputedStyle(e).borderTopLeftRadius), inset: r(e).left - centre.left });
    const m = r(document.querySelector(".members .muted")), h = r(head);
    return { head: look(head), box: look(box), mask: getComputedStyle(document.querySelector(".stream")).maskImage.includes("gradient"), count: { right: r(count).right, top: r(count).top, text: count.textContent }, buttons: { right: r(document.querySelector(".input .actions")).right, top: r(document.querySelector(".input .actions")).top }, prompt: { left: r(document.querySelector(".input .prompt")).left, top: r(document.querySelector(".input .prompt")).top }, field: { left: r(ta).left }, placeholder: ta.placeholder, overflow: getComputedStyle(ta).overflowY, members: Math.abs(m.left + m.width / 2 - (h.left + h.width / 2)) < 2 };
  })()`);
  for (const k of ["head", "box"] as const) assert.ok(c[k].shadow && c[k].radius > 6 && c[k].inset > 4, `${k}: a rounded card with a shadow, clear of the column's edge`);
  assert.ok(c.mask, "the conversation fades where it slides under the cards");
  assert.match(c.count.text, /^0\/\d+$/);
  assert.ok(Math.abs(c.count.right - c.buttons.right) < 2 && c.count.top < c.buttons.top, "the character count at the right, over the buttons");
  assert.ok(Math.abs(c.prompt.left - c.field.left) < 2 && Math.abs(c.prompt.top - c.count.top) < 8, "the prompt at the left of the same line");
  assert.match(c.placeholder, /^Speak as your character would…\n“@[^”]+”, or “\/\w+/, "the example on two lines");
  assert.equal(c.overflow, "hidden", "no scrollbar on the empty box");
  assert.ok(c.members, "the members line is centred under the bar");
  await page.eval(`document.querySelector(".input textarea").focus()`);
  await page.type("A word.");
  assert.equal(await page.eval<string>(`getComputedStyle(document.querySelector(".input textarea")).overflowY`), "auto", "it comes back once there's text");
  for (let i = 0; i < 7; i++) await page.key("Backspace", 8);
});

test("End conversation is in the header and under Speak and Pass, both solid red (Interface v0.16); Return to current stage is as tall as the box and narrower", { skip }, async () => {
  // A fixture: a secret conversation with the first other guest.
  const aside = `(s) => ({ ...s, conversation: { kind: "colloquio", other: s.livingOthers[0] }, present: [s.livingOthers[0]] })`;
  await withStates(aside, async () => {
    await page.until(`document.querySelectorAll('[data-hint="end"]').length === 2`);
    const ends = await page.eval<{ where: string; bg: string; color: string; width: number }[]>(`[...document.querySelectorAll('[data-hint="end"]')].map((b) => ({ where: b.closest(".members") ? "header" : b.closest(".actions") ? "actions" : "?", bg: getComputedStyle(b).backgroundColor, color: getComputedStyle(b).color, width: b.getBoundingClientRect().width }))`);
    assert.deepEqual(ends.map((e) => e.where), ["header", "actions"]);
    for (const e of ends) {
      const [r, g, b] = e.bg.match(/\d+/g)!.map(Number);
      assert.ok(r! > 150 && g! < 90 && b! < 90, `solid red (${e.bg})`);
      assert.equal(e.color, "rgb(255, 255, 255)", "white words");
    }
    const row = await page.eval<number>(`document.querySelector(".input .actions-row").getBoundingClientRect().width`);
    assert.ok(Math.abs(ends[1]!.width - row) < 2, "under Speak and Pass, the width of the two");
    await page.shot("end-conversation");
  });
  await page.until(`document.querySelector(".stage-bar .mark.past .stage")`);
  await page.eval(`document.querySelector(".stage-bar .mark.past .stage").click()`);
  await page.until(`document.querySelector(".input.past button.return")`);
  const ret = await page.eval<{ tall: boolean; narrow: boolean; lines: number }>(`(() => { const b = document.querySelector(".input.past button.return"), r = b.getBoundingClientRect(), f = document.querySelector(".input .field").getBoundingClientRect(); return { tall: Math.abs(r.height - f.height) < 2, narrow: r.width <= 124, lines: Math.round((r.height - 10) / parseFloat(getComputedStyle(b).lineHeight)) >= 2 ? Math.round(b.scrollHeight ? (() => { const range = document.createRange(); range.selectNodeContents(b); return range.getClientRects().length; })() : 0) : 0 }; })()`);
  assert.ok(ret.tall, "as tall as the box beside it");
  assert.ok(ret.narrow, "and narrower");
  assert.equal(ret.lines, 2, "its words on two lines");
  await page.eval(`document.querySelector(".input.past button.return").click()`);
  await page.until(`!document.querySelector(".past-stage")`);
});

test("the right panel (Interface v0.16): short of the top with rounded top corners; dragging well past its narrowest fades it, and letting go hides it; your own card", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".side.right .resize")`);
  const top = await page.eval<{ gap: number; radius: number; tokens: boolean }>(`(() => { const p = document.querySelector(".side.right"), l = document.querySelector(".layout").getBoundingClientRect(); return { gap: p.getBoundingClientRect().top - l.top, radius: parseFloat(getComputedStyle(p).borderTopLeftRadius), tokens: !!p.querySelector(".tokens") }; })()`);
  assert.ok(top.gap >= 8 && top.gap <= 24, `it stops a little short of the top (${top.gap}px)`);
  assert.ok(top.radius > 6, "rounded top corners");
  assert.equal(top.tokens, false, "no row of tokens on the talking-with card");
  // Your own card.
  await page.eval(`document.querySelector('.places button.token[data-guest="Francesco Pazzi"]').click()`);
  await page.until(`document.querySelector(".side.right .look.self:not(.leaving)")`);
  const own = await page.eval<{ label: string; tag: string; edge: boolean; faction: number }>(`(() => { const c = document.querySelector(".side.right .look.self"); return { label: c.querySelector(".person-head .label").textContent, tag: c.querySelector(".you-tag").textContent, edge: getComputedStyle(c).boxShadow.includes("inset"), faction: c.querySelectorAll(".who .muted").length }; })()`);
  assert.deepEqual(own, { label: "This Is You", tag: "You", edge: true, faction: 1 });
  await page.shot("own-card");
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".side.right .look:not(.leaving)")`);
  // Drag the handle to the right, past the narrowest and then well past it.
  const h = await page.eval<{ x: number; y: number; width: number }>(`(() => { const b = document.querySelector(".side.right .resize").getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + 200, width: document.querySelector(".side.right").getBoundingClientRect().width }; })()`);
  const mouse = (type: string, x: number, y = h.y) => page.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mouseReleased" ? 0 : 1, clickCount: 1 });
  await mouse("mouseMoved", h.x);
  await mouse("mousePressed", h.x);
  await mouse("mouseMoved", h.x + (h.width - 220) + 20);
  const atMin = await page.eval<{ width: number; hiding: boolean }>(`({ width: document.querySelector(".side.right").getBoundingClientRect().width, hiding: document.querySelector(".side.right").classList.contains("hiding") })`);
  assert.deepEqual(atMin, { width: 220, hiding: false }, "at its narrowest, not yet hiding");
  await mouse("mouseMoved", h.x + (h.width - 220) + 90);
  await page.until(`document.querySelector(".side.right").classList.contains("hiding")`);
  assert.ok((await page.eval<number>(`Number(getComputedStyle(document.querySelector(".side.right")).opacity)`)) < 1, "past the point, the panel fades to show what letting go will do");
  await page.shot("right-hiding");
  // Letting go off the window still finishes the drag.
  await mouse("mouseMoved", VIEW.width + 40, -20);
  await mouse("mouseReleased", VIEW.width + 40, -20);
  await page.until(`document.querySelector(".side.right.hidden .right-handle")`);
  await page.eval(`document.querySelector(".right-handle").click()`);
  await page.until(`document.querySelector(".side.right .resize")`);
  assert.equal(await page.eval<number>(`document.querySelector(".side.right").getBoundingClientRect().width`), h.width, "it comes back at the width it had");
  assert.equal(await page.eval<boolean>(`!document.querySelector(".side.right").classList.contains("hiding")`), true);
});

// ---- CC-20261116-06 (#177): Interface v0.16, the Web of Confidences ---------------------------------------

test("the Web of Confidences (Interface v0.16): the top layer, sliding over 600 ms with a shadow that grows; one line per pair and type, the halo only on secret ties; the key's Secret row; lines fading around a selection; the drawing clear of the key; the key and side column scaling with the window", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".web-dock") && document.querySelector(".input textarea")`);
  assert.equal(await page.eval<string>(`document.querySelector(".web-bar-title").textContent`), "Web of Confidences");
  assert.equal(await page.eval<boolean>(`!document.body.innerText.includes("Web of Secrets")`), true, "no Web of Secrets a player can see");
  // The dock: over everything, the floating cards included; a deep shadow that grows as it opens; 600 ms.
  const dock = () => page.eval<{ z: number; float: number; shadow: string; ms: number }>(`(() => { const d = getComputedStyle(document.querySelector(".web-dock")); return { z: Number(d.zIndex), float: Math.max(...[".conv-head", ".input", ".notaio-hint"].map((x) => Number(getComputedStyle(document.querySelector(x)).zIndex) || 0)), shadow: d.boxShadow, ms: Math.max(...d.transitionDuration.split(",").map(parseFloat)) * 1000 }; })()`);
  const blur = (shadow: string) => Math.max(...[...shadow.matchAll(/(-?\d+(?:\.\d+)?)px (-?\d+(?:\.\d+)?)px (\d+(?:\.\d+)?)px/g)].map((m) => Number(m[3])));
  const down = await dock();
  assert.ok(down.z > down.float, "the top layer");
  assert.equal(down.ms, 600, "it slides over 600 ms");
  await webUp();
  const up = await dock();
  assert.ok(blur(up.shadow) > blur(down.shadow), `the shadow grows as it opens (${down.shadow} to ${up.shadow})`);
  const over = await page.eval<boolean>(`(() => { const d = document.querySelector(".web-dock").getBoundingClientRect(), b = document.querySelector(".input").getBoundingClientRect(); const e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return d.top < b.top && !!e.closest(".web-dock"); })()`);
  assert.ok(over, "it slides up over the message box's floating card");
  // One line per pair and type; the halo marks only the secret ties.
  const ties = await page.eval<{ key: string; secret: boolean; halo: boolean; lines: number }[]>(`[...document.querySelectorAll(".web-diagram .tie")].map((g) => ({ key: g.dataset.between + "|" + g.dataset.type, secret: g.dataset.secret === "true", halo: !!g.querySelector(".edge-under"), lines: g.querySelectorAll("path.edge").length }))`);
  assert.ok(ties.length > 10);
  assert.equal(new Set(ties.map((t) => t.key)).size, ties.length, "one line per pair and type");
  assert.ok(ties.every((t) => t.lines === 1 && t.halo === t.secret), "the halo only on secret ties");
  assert.deepEqual(ties.filter((t) => t.secret).map((t) => t.key).sort(), ["Clarice Orsini|Francesco Pazzi|romance", "Francesco Pazzi|Friar Tommaso|alliance", "Francesco Pazzi|Raffaello de' Medici|rivalry"]);
  // The key: the six types, then "Secret" with its halo swatch and a short line; selectable like the rest.
  const key = await page.eval<{ rows: string[]; covers: string; swatch: boolean }>(`(() => { const k = document.querySelector(".web-key"); return { rows: [...k.querySelectorAll(".key-type")].map((b) => b.dataset.type), covers: k.querySelector(".key-covers").textContent, swatch: !!k.querySelector(".key-secret .swatch .edge-under") }; })()`);
  assert.equal(key.rows.length, 7);
  assert.equal(key.rows.at(-1), "*secret");
  assert.equal(await page.eval<string>(`document.querySelector(".key-secret .key-secret-words span").textContent`), "Secret");
  assert.equal(key.covers, "A tie no other guest knows of. Ties everyone knows are drawn plain.");
  assert.ok(key.swatch, "its halo swatch");
  await page.eval(`document.querySelector(".key-secret").click()`);
  await page.until(`document.querySelector(".key-secret").getAttribute("aria-pressed") === "true"`);
  const keyed = await page.eval<{ on: number; off: number; secretOn: boolean }>(`(() => { const lines = [...document.querySelectorAll(".web-diagram .tie path.edge")]; return { on: lines.filter((l) => l.classList.contains("key-on")).length, off: lines.filter((l) => l.classList.contains("key-off")).length, secretOn: [...document.querySelectorAll('.web-diagram .tie[data-secret="true"] path.edge')].every((l) => l.classList.contains("key-on")) }; })()`);
  assert.deepEqual(keyed, { on: 3, off: ties.length - 3, secretOn: true }, "it lights its lines and fades the rest");
  await page.shot("web-key-secret");
  await page.eval(`document.querySelector(".key-secret").click()`);
  await page.until(`!document.querySelector(".web-diagram .key-on, .web-diagram .key-off")`);
  // Selecting: a ring twice as thick, no focus box, and every line that doesn't touch the selection fades.
  for (const g of await webPicked()) await pickNode(g);
  const plain = await page.eval<number>(`parseFloat(getComputedStyle(document.querySelector('.web .node:not(.picked) circle')).strokeWidth)`);
  await pickNode("Lupo");
  await page.until(`document.querySelector('.web .node[data-guest="Lupo"].picked')`);
  const sel = await page.eval<{ ring: number; outline: string; touching: number; faded: number; rest: number }>(`(() => { const n = document.querySelector('.web .node[data-guest="Lupo"]'); const ties = [...document.querySelectorAll(".web-diagram .tie")]; const touch = (t) => t.dataset.between.split("|").includes("Lupo"); return { ring: parseFloat(getComputedStyle(n.querySelector("circle")).strokeWidth), outline: getComputedStyle(n).outlineStyle, touching: ties.filter((t) => touch(t) && !t.querySelector("path.edge").classList.contains("sel-off")).length, faded: ties.filter((t) => !touch(t) && t.querySelector("path.edge").classList.contains("sel-off")).length, rest: ties.filter((t) => !touch(t)).length }; })()`);
  assert.ok(sel.ring >= plain * 2, `a selected guest's ring is at least twice as thick (${plain} to ${sel.ring})`);
  assert.equal(sel.outline, "none", "no focus box around a clicked guest");
  assert.ok(sel.touching > 0 && sel.faded === sel.rest && sel.rest > 0, "every line that doesn't touch the selection fades");
  // An empty pair says why.
  await pickNode("Contessa Isabella");
  await page.until(`document.querySelectorAll(".web .node.picked").length === 2`);
  await page.eval(`document.querySelector('[data-hint="recordTab"]').click()`);
  await page.until(`document.querySelector(".record-none")`);
  assert.equal(await page.eval<string>(`document.querySelector(".record-none").textContent`), "You haven't yet heard Lupo or Contessa Isabella speak to the other. Only what one says to the other shows here.");
  // Il Notaio's reading opens about a seventh of the way down the column, with the column behind it faded.
  await page.until(`document.querySelector('.record-pane .reading[data-state="expanded"]')`);
  await page.until(`document.querySelector(".web-dock").getAnimations({ subtree: true }).every((a) => a.effect?.getComputedTiming().iterations === Infinity)`);
  const reading = await page.eval<{ down: number; faded: number; shadow: boolean }>(`(() => { const p = document.querySelector(".record-pane").getBoundingClientRect(), r = document.querySelector(".record-pane .reading"); return { down: (r.getBoundingClientRect().top - p.top) / p.height, faded: Number(getComputedStyle(document.querySelector(".record-pane .record")).opacity), shadow: getComputedStyle(r).boxShadow !== "none" }; })()`);
  assert.ok(reading.down > 0.12 && reading.down < 0.17, `a seventh of the way down (${reading.down})`);
  assert.ok(reading.faded < 0.6 && reading.shadow, "the column behind it faded, under an upward shadow");
  for (const g of await webPicked()) await pickNode(g);
  // The drawing: fitted to its space, centred left of the side column, and clear of the key at its top-left corner.
  const fit = () =>
    page.eval<{ under: number; inside: boolean; centred: number; fills: number; key: number; side: number }>(`(() => {
      const map = document.querySelector(".web-map").getBoundingClientRect(), k = document.querySelector(".web-key").getBoundingClientRect();
      const boxes = [...document.querySelectorAll(".web-diagram .node circle, .web-diagram .node-name, .web-diagram .faction-label")].map((x) => x.getBoundingClientRect());
      const l = Math.min(...boxes.map((b) => b.left)), r = Math.max(...boxes.map((b) => b.right)), t = Math.min(...boxes.map((b) => b.top)), bt = Math.max(...boxes.map((b) => b.bottom));
      return { under: boxes.filter((b) => b.left < k.right && b.top < k.bottom).length, inside: l >= map.left - 1 && r <= map.right + 1 && t >= map.top - 1 && bt <= map.bottom + 1, centred: Math.abs((t + bt) / 2 - (map.top + map.height / 2)), fills: Math.max((r - l) / map.width, (bt - t) / map.height), key: parseFloat(getComputedStyle(document.querySelector(".web-key")).fontSize), side: document.querySelector(".web-side").getBoundingClientRect().width / innerWidth };
    })()`);
  const sizes: Record<number, Awaited<ReturnType<typeof fit>>> = {};
  try {
    for (const width of [1100, 1440, 2100]) {
      await page.send("Emulation.setDeviceMetricsOverride", { width, height: width > 1500 ? 1100 : VIEW.height, deviceScaleFactor: 1, mobile: false });
      await page.until(`innerWidth === ${width}`);
      await new Promise((r) => setTimeout(r, 250));
      const f = (sizes[width] = await fit());
      assert.equal(f.under, 0, `${width}: nothing runs under the key`);
      assert.ok(f.inside, `${width}: the drawing is inside its space`);
      assert.ok(f.centred < 14, `${width}: centred top to bottom (${f.centred})`);
      assert.ok(f.fills > 0.9, `${width}: fitted to its space (${f.fills})`);
      assert.ok(Math.abs(f.side - 0.28) < 0.01, `${width}: the side column is about 28% of the window (${f.side})`);
      await page.shot(`web-${width}`);
    }
  } finally {
    await page.send("Emulation.setDeviceMetricsOverride", { ...VIEW, deviceScaleFactor: 1, mobile: false });
  }
  // The key grows and shrinks with the window: about 0.8 to 1.45 times its size at 1440 pixels.
  assert.ok(Math.abs(sizes[1440]!.key - 13) < 0.1, `its size at 1440 (${sizes[1440]!.key})`);
  assert.ok(Math.abs(sizes[1100]!.key / sizes[1440]!.key - 0.8) < 0.03, `smaller in a small window (${sizes[1100]!.key})`);
  assert.ok(Math.abs(sizes[2100]!.key / sizes[1440]!.key - 1.45) < 0.03, `larger in a large one (${sizes[2100]!.key})`);
  await page.until(`innerWidth === ${VIEW.width}`);
  await webDown();
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

test("a note's conclusion fills the input box and highlights Do, sending nothing; Do runs it and the set-aside message comes back", { skip }, () =>
  // Only a player with a knowledge errand sees the button (TD v0.51's flag); the fake game is Francesco's, so the
  // states are given the flag, as the game would send it for Piero.
  withStates("(s) => ({ ...s, knowledgeErrand: true })", async () => {
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
}));

// ---- CC-20261114-20 (#146, part 2 of 2) ----------------------------------------------------------------------

test("TD v0.51, the tour's hold: while the tour runs the screen has the sheet, errand, and places, and no line; skipping it sends begin and the evening starts", { skip }, () => {
  assert.equal(held.lines, 0, "no line while the tour ran");
  assert.ok(held.errand && held.places! > 0, "the errand and the places were there to point at");
  assert.deepEqual(held.sent!.filter((t) => t === "begin"), ["begin"], "skipping it began the game");
  assert.ok(held.linesAfter! > 0, "then the first lines");
  // Interface v0.16: after a skipped tour, Your briefing breathes (a soft pulsing outline) until a click.
  assert.equal(held.breathes, true, "Your briefing breathes after a skipped tour");
  assert.equal(held.breathesAfterClick, false, "until the player clicks anywhere");
});

test("TD v0.51: the conclusion button is hidden for an errand a conclusion can't finish (Francesco's), on every note", { skip }, async () => {
  await reopen();
  await webUp();
  await page.eval(`document.querySelector('[data-hint="notesTab"]').click()`);
  await page.until(`document.querySelector(".web textarea")`);
  await pickNode(await page.eval<string>(`document.querySelector(".web .node:not(.me)").dataset.guest`));
  await page.eval(`document.querySelector(".web textarea").focus()`);
  await page.type("Hidden button check.");
  await page.eval(`document.querySelector('[data-hint="noteSave"]').click()`);
  await page.until(`[...document.querySelectorAll(".note .note-text")].some((n) => n.textContent === "Hidden button check.")`);
  assert.equal(await page.eval<number>(`document.querySelectorAll(".note .conclude").length`), 0, "no note has the button");
  await page.eval(`document.querySelector('[data-hint="recordTab"]').click()`);
  await webDown();
});

test("TD v0.51 in the Web of Secrets: the column is dialogue only, and Il Notaio's box holds the background, then tonight stage by stage, then the tally", { skip }, async () => {
  await reopen();
  // A guest the player has heard speak.
  await page.until(`document.querySelector(".stream .ln.speech:not(.mine) .guest")`);
  const guest = await page.eval<string>(`document.querySelector(".stream .ln.speech:not(.mine) .guest").textContent`);
  await webUp();
  await pickNode(guest);
  await page.until(`document.querySelector('.reading-text[data-reading="guarded"]')`);
  const r = await page.eval<{ column: string[]; extra: number; bg: boolean; stages: string[]; sentences: string[]; tally: boolean; order: boolean }>(`(() => {
    const rec = document.querySelector(".record"), box = document.querySelector(".reading-text.guarded");
    const at = (sel) => { const e = box.querySelector(sel); return e ? [...box.querySelectorAll("*")].indexOf(e) : -1; };
    return {
      column: [...rec.querySelectorAll(".heard li .sp")].map((e) => e.textContent),
      extra: rec.querySelectorAll(".connection, .saw, .label").length,
      bg: !!box.querySelector(".reading-background .reading-conn"),
      stages: [...box.querySelectorAll(".reading-stage-head")].map((e) => e.textContent),
      sentences: [...box.querySelectorAll(".reading-sentence")].map((e) => e.textContent),
      tally: !!box.querySelector(".reading-tally"),
      order: at(".reading-background") < at(".reading-stage") && at(".reading-stage") < at(".reading-tally"),
    };
  })()`);
  assert.ok(r.column.length > 0 && r.column.every((n) => n === guest), `${guest}'s lines only: ${JSON.stringify(r.column)}`);
  assert.equal(r.extra, 0, "no connections, events, or labels in the column");
  assert.ok(r.bg, "the background: his connection lines");
  assert.ok(r.stages.length > 0 && r.stages.every((h) => /^In .+:$/.test(h)), "a paragraph per stage, each opening with its name");
  assert.ok(r.sentences.length > 0 && r.sentences.length <= 8 && r.sentences.every((t) => t.startsWith(`${guest} `)), "his lines in Il Notaio's register");
  assert.ok(r.tally && r.order, "background, tonight, then the tally");
  await page.shot("guarded-reading");
  // A lore note opens its entry in The city, over everything.
  if (await page.eval<boolean>(`!!document.querySelector(".reading .reading-note .lore-link")`)) {
    const title = await page.eval<string>(`document.querySelector(".reading .reading-note .lore-link").textContent`);
    await page.eval(`document.querySelector(".reading .reading-note .lore-link").click()`);
    await page.until(`document.querySelector(".modal")`);
    assert.ok(await page.eval<boolean>(`document.querySelector(".modal").textContent.toLowerCase().includes(${JSON.stringify(title.toLowerCase())})`), "The city, at the entry");
    assert.ok(await page.eval<boolean>(`!!document.querySelector('.reading-text[data-reading="guarded"]')`), "the selection and the box stay");
    await page.eval(`document.querySelector('.modal [data-hint="close"]').click()`);
    await page.until(`!document.querySelector(".modal")`);
  }
  await webDown();
});

test("TD v0.51: Il Notaio's summary over a past stage, expanded with a strip of dialogue peeking; a click in the window minimizes it, a click on it expands it", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".stage-bar .mark.past")`);
  const stage = await page.eval<string>(`document.querySelector(".stage-bar .mark.past:last-of-type, .stage-bar .mark.past").dataset.stage`);
  await page.eval(`document.querySelector('.stage-bar .mark.past[data-stage="${stage.replace(/'/g, "\\'")}"] .stage').click()`);
  await page.until(`document.querySelector(".past-stage") && document.querySelector('.past-summary[data-state="expanded"]')`);
  const geo = () =>
    page.eval<{ area: { top: number; bottom: number; height: number }; box: { top: number; bottom: number; height: number }; groups: number; heads: number }>(`(() => {
      const r = (e) => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, height: b.height }; };
      const box = document.querySelector(".past-summary");
      return { area: r(document.querySelector(".stream-area")), box: r(box), groups: box.querySelectorAll(".summary-group").length, heads: box.querySelectorAll(".summary-where").length };
    })()`);
  const steady = () => page.until(`document.getAnimations().every((a) => a.effect?.getComputedTiming().iterations === Infinity)`);
  await steady();
  let g = await geo();
  // Interface v0.16: it opens a fifth of the way down, so a good stretch of the dialogue shows above it, faded while it's open.
  const down = (g.box.top - g.area.top) / g.area.height;
  assert.ok(down > 0.17 && down < 0.23, `it opens a fifth of the way down (${down})`);
  assert.ok(g.box.height > g.area.height * 0.7, "it covers the window down to the input box");
  const faded = () => page.eval<number>(`Number(getComputedStyle(document.querySelector(".past-stage")).opacity)`);
  assert.ok((await faded()) < 0.6, "the dialogue behind it fades");
  assert.equal(await page.eval<boolean>(`getComputedStyle(document.querySelector(".past-summary")).boxShadow !== "none"`), true, "an upward shadow");
  assert.equal(await page.eval<boolean>(`!document.querySelector(".notaio-hint")`), true, "Il Notaio's hint steps aside");
  assert.ok(g.groups > 0 && g.heads === g.groups, "bullets grouped under each conversation's line");
  await page.shot("past-summary");
  await clickAt({ x: (await page.eval<number>(`document.querySelector(".stream-area").getBoundingClientRect().left + 40`)), y: g.area.top + 12 });
  await page.until(`document.querySelector('.past-summary[data-state="minimized"]')`);
  await steady();
  assert.equal(await faded(), 1, "minimized, the dialogue is back");
  g = await geo();
  assert.ok(g.area.bottom - g.box.bottom < 20 && g.box.height < g.area.height * 0.4, "minimized at the foot, its first lines showing");
  await clickAt(".past-summary");
  await page.until(`document.querySelector('.past-summary[data-state="expanded"]')`);
  await page.eval(`document.querySelector('[data-hint="return"]').click()`);
  await page.until(`!document.querySelector(".past-stage") && !document.querySelector(".past-summary")`);
});

// ---- CC-20261114-06 (#113) -------------------------------------------------------------------------------

test("the stage bar (Interface v0.16): hovering changes nothing in the row, and a tooltip under it shows the stage's name, description, and explanation; a past stage opens read-only with Return; a draft survives; nothing is sent from it; a future stage can't be opened; a selected guest's dots", { skip }, async () => {
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
  // Hovering a past stage, then a future one, changes nothing in the row; a tooltip under the row shows its
  // name, its description, and its explanation. It switches at once between neighbours.
  const row = () => page.eval<string>(`JSON.stringify([...document.querySelectorAll(".stage-bar .mark .stage")].map((x) => { const b = x.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.width), x.textContent]; }))`);
  const before = await row();
  await HINTS_OFF(false);
  for (const kind of ["past", "next"]) {
    const stage = await page.eval<string>(`document.querySelector(".stage-bar .mark.${kind}").dataset.stage`);
    await move(await centre(`.stage-bar .mark.${kind} .stage`));
    await page.until(`document.querySelector(".stage-tip:not(.measuring)")?.dataset.stage === ${JSON.stringify(stage)}`);
    const m = await page.eval<{ name: string; desc: string; hint: string; under: boolean; inside: boolean }>(`(() => { const t = document.querySelector(".stage-tip"); const b = t.getBoundingClientRect(); const bar = document.querySelector(".stage-bar").getBoundingClientRect(); return { name: t.querySelector(".stage-tip-name").textContent, desc: t.querySelector(".stage-tip-desc").textContent, hint: t.querySelector(".stage-tip-hint").textContent, under: b.top >= bar.bottom - 1, inside: b.left >= bar.left - 1 && b.right <= bar.right + 1 }; })()`);
    assert.equal(m.name, TC(stage), "the stage's name, in title case (Interface v0.17)");
    assert.equal(m.desc, words.screen.stageBar.descriptions[stage], `${kind}: its description`);
    assert.equal(m.hint, kind === "past" ? `${stage}: over. Click to read it again.` : `${stage}: still to come.`, `${kind}: its explanation`);
    assert.ok(m.under && m.inside, `${kind}: under the row, within the bar`);
    assert.equal(await row(), before, `${kind}: nothing in the row moves or changes`);
    assert.equal(await nowName(), true, `${kind}: the current stage keeps its name`);
    assert.equal(await page.eval<boolean>(`!document.querySelector(".tip")`), true, `${kind}: no second explanation`);
    await page.shot(`stage-bar-hover-${kind}`);
  }
  await move({ x: VIEW.width / 2, y: VIEW.height / 2 });
  await page.until(`!document.querySelector(".stage-tip")`);
  // With the explanations off, the tooltip keeps the name and description, without the explanation.
  await HINTS_OFF(true);
  await move(await centre(`.stage-bar .mark.past .stage`));
  await page.until(`document.querySelector(".stage-tip:not(.measuring)")`);
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".stage-tip-name") && !document.querySelector(".stage-tip-hint")`), true);
  await move({ x: VIEW.width / 2, y: VIEW.height / 2 });
  await page.until(`!document.querySelector(".stage-tip")`);
  await HINTS_OFF(false);
  assert.equal(await page.eval<number>(`document.querySelector(".stage-bar").getAnimations({ subtree: true }).length`), 0, "no motion");
  // A future stage can't be opened: it isn't a button, and clicking it changes nothing.
  assert.equal(await page.eval<string>(`document.querySelector(".stage-bar .mark.next .stage").tagName`), "SPAN");
  await click(".stage-bar .mark.next .stage");
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".past-stage")`), false, "no future stage opens");
  // A draft in the box, then a past stage: read-only, its own lines, Return in Speak's and Pass's place.
  const DRAFT = "Not a word of this until I'm back.";
  await page.eval(`document.querySelector(".input textarea").focus()`);
  await page.type(DRAFT);
  const stage = await page.eval<string>(`document.querySelector(".stage-bar .mark.past").dataset.stage`);
  const open = async () => {
    await click(`.stage-bar .mark.past[data-stage="${stage.replace(/"/g, '\\"')}"] .stage`);
    await page.until(`document.querySelector(".past-stage") && document.querySelector('[data-hint="return"]')`);
  };
  await open();
  const view = await page.eval<{ stage: string; lines: number; buttons: string[]; box: string; open: boolean }>(`({
    stage: document.querySelector(".past-stage").dataset.stage,
    lines: document.querySelectorAll(".past-stage .ln").length,
    buttons: [...document.querySelectorAll(".input .actions button")].map((b) => b.dataset.hint),
    box: document.querySelector(".input textarea").value,
    open: document.querySelector(".stage-bar .mark.open")?.dataset.stage === document.querySelector(".past-stage").dataset.stage,
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
  // Il Notaio's summary covers the window (TD v0.51): a first click in it folds the box away.
  if (await page.eval<boolean>(`!!document.querySelector('.past-summary[data-state="expanded"]')`)) {
    await page.eval(`document.querySelector(".stream").click()`);
    await page.until(`document.querySelector('.past-summary[data-state="minimized"]')`);
  }
  const name = await page.eval<string | null>(`document.querySelector(".past-stage .guest")?.textContent ?? null`);
  if (name) {
    await page.eval(`document.querySelector(".past-stage .guest").click()`);
  } else {
    await click(`[data-hint="return"]`);
    await page.eval(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").click()`);
  }
  await page.until(`document.querySelector(".side.right .look:not(.leaving)")`);
  const picked = await page.eval<string>(`document.querySelector(".side.right .look:not(.leaving)").dataset.guest`);
  if (name) await page.until(`document.querySelector(${JSON.stringify(`.stage-bar .mark.past[data-stage="${stage.replace(/"/g, '\\"')}"] .stage-dot`)})`);
  const dots = await page.eval<number>(`document.querySelectorAll(".stage-bar .stage-dot").length`);
  if (name) assert.ok(dots > 0, `${picked} has a dot on the stage they appear in`);
  await page.shot("stage-dots");
  await page.eval(`document.querySelector(".input textarea").blur()`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".stage-bar .stage-dot")`);
  if (await page.eval<boolean>(`!!document.querySelector(".past-stage")`)) await click(`[data-hint="return"]`);
  await page.until(`!document.querySelector(".past-stage")`);
  assert.deepEqual(await sent(), [], "still nothing sent");
});

/** The full evening's track for a Pazzi player (Mechanics v0.37; Interface v0.16): eleven stages. A fixture: the mini-game's own track stays as the engine sends it. */
const ELEVEN = ["The first round of mingling", "The first Pazzi council", "The second round of mingling", "The second Pazzi council", "The third round of mingling", "The third Pazzi council", "Midnight", "The choosing of candidates", "The speeches", "The last Pazzi council", "The ballot"];

test("the stage bar fits eleven stages without scrolling from a 1100-pixel window up, stretching with the window (Interface v0.16)", { skip }, async () => {
  // The fifth stage is now, so the oval holds a long name.
  const full = `(e) => { if (e.type === "state") { if (e.sheet) e.sheet.track = ${JSON.stringify(ELEVEN)}; if (e.state) e.state.phaseLabel = ${JSON.stringify(ELEVEN[4])}; } return e; }`;
  const measure = () =>
    page.eval<{ marks: number; fits: boolean; inside: boolean; apart: boolean; name: string; whole: boolean; circle: number; line: number; span: number }>(`(() => {
      const ol = document.querySelector(".stage-bar"), bar = ol.getBoundingClientRect(), card = document.querySelector(".conv-head").getBoundingClientRect();
      const stages = [...ol.querySelectorAll(".mark .stage")].map((x) => x.getBoundingClientRect());
      const name = ol.querySelector(".mark.now .stage-name");
      return {
        marks: stages.length,
        fits: ol.scrollWidth <= ol.clientWidth && getComputedStyle(ol).overflowX === "visible",
        inside: stages.every((b) => b.left >= card.left && b.right <= card.right),
        apart: stages.every((b, i) => i === 0 || b.left >= stages[i - 1].right + 4),
        name: name.textContent,
        whole: name.scrollWidth <= name.clientWidth,
        circle: stages[0].width,
        line: stages[1].left - stages[0].right,
        span: (stages[stages.length - 1].right - stages[0].left) / card.width,
      };
    })()`);
  try {
    await page.send("Emulation.setDeviceMetricsOverride", { width: 1100, height: VIEW.height, deviceScaleFactor: 1, mobile: false });
    await withEvents(full, async () => {
      await page.until(`innerWidth === 1100 && document.querySelectorAll(".stage-bar .mark").length === 11`);
      const narrow = await measure();
      assert.equal(narrow.marks, 11);
      assert.ok(narrow.fits, "no scrolling at 1100 pixels");
      assert.ok(narrow.inside, "every stage is inside the floating card");
      assert.ok(narrow.apart, "with a line between each pair");
      assert.equal(narrow.name, TC(ELEVEN[4]!));
      assert.ok(narrow.whole, "the current stage's name shows whole");
      assert.equal(await page.eval<boolean>(`!document.querySelector(".stage-bar .mark.now .num")`), true, "no number in the current oval");
      await page.shot("stage-bar-eleven-1100");
      // Wider, the lines share out the room, the circles grow a little, and the bar spans most of the card.
      await page.send("Emulation.setDeviceMetricsOverride", { width: 1600, height: VIEW.height, deviceScaleFactor: 1, mobile: false });
      await page.until(`innerWidth === 1600`);
      await new Promise((r) => setTimeout(r, 100));
      const wide = await measure();
      assert.ok(wide.fits && wide.inside && wide.apart && wide.whole);
      assert.ok(wide.circle > narrow.circle, `the circles grow a little (${narrow.circle} to ${wide.circle})`);
      assert.ok(wide.line > narrow.line, `the lines stretch (${narrow.line} to ${wide.line})`);
      assert.ok(wide.span > 0.8, `the bar spans most of the card (${wide.span})`);
      await page.shot("stage-bar-eleven-1600");
      await page.send("Emulation.setDeviceMetricsOverride", { width: 1100, height: VIEW.height, deviceScaleFactor: 1, mobile: false });
    });
  } finally {
    await page.send("Emulation.setDeviceMetricsOverride", { ...VIEW, deviceScaleFactor: 1, mobile: false });
  }
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
  await page.until(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])")`);
  // Interface v0.7: with no one selected the bar shows no names at all.
  const none = "";
  const me = await page.eval<string>(`document.querySelector(".web .node.me").dataset.guest`);
  // Chat to web: a guest selected in the chat shows on the web's bar while it's down, and is selected when it opens.
  const name = await page.eval<string>(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").dataset.guest`);
  await page.eval(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").click()`);
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
  await page.eval(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").click()`);
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
  await page.eval(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").click()`);
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
  await page.until(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])")`);
  const name = await page.eval<string>(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").dataset.guest`);
  await page.eval(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").click()`);
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

test("the rules: a button per section filling the modal, staying in view; a section opens as a card over them; a click on it turns to the next; ×, Escape, or a click outside goes back. The city: a list; a row opens its entry, with Previous and Next topic; the way back stays put", { skip }, async () => {
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
  // Interface v0.16: the buttons stay in view, and the section is a card over them.
  const over = await page.eval<{ buttons: number; inert: boolean; inside: boolean; shadow: boolean }>(`(() => { const body = document.querySelector(".deck-rules .rules-body").getBoundingClientRect(), c = document.querySelector(".deck-rules section.rules-section.open"), b = c.getBoundingClientRect(); return { buttons: document.querySelectorAll(".deck-rules button.rules-section").length, inert: document.querySelector(".rules-buttons").inert, inside: b.left > body.left && b.right < body.right && b.top > body.top && b.bottom < body.bottom, shadow: getComputedStyle(c).boxShadow !== "none" }; })()`);
  assert.deepEqual(over, { buttons, inert: true, inside: true, shadow: true }, "the buttons stay in view, behind the card");
  await page.shot("rules-section");
  const sectionTitle = () => page.eval<string | null>(`document.querySelector(".deck-rules section.rules-section.open h3")?.textContent ?? null`);
  const titles = await page.eval<string[]>(`[...document.querySelectorAll(".deck-rules button.rules-section")].map((b) => b.textContent)`);
  // A click on the card turns to the next section; the footer's buttons go back and forth.
  await page.eval(`document.querySelector(".deck-rules section.rules-section.open .deck-text").click()`);
  await page.until(`document.querySelector(".deck-rules section.rules-section.open h3").textContent === ${JSON.stringify(titles[2])}`);
  assert.deepEqual(await page.eval<string[]>(`[...document.querySelectorAll(".deck-rules .deck-foot button")].map((b) => b.textContent)`), ["← Previous Rule", "Next Rule →"]);
  await page.eval(`document.querySelector(".deck-rules .deck-prev").click()`);
  await page.until(`document.querySelector(".deck-rules section.rules-section.open h3").textContent === ${JSON.stringify(titles[1])}`);
  assert.equal(await page.eval<boolean>(`document.querySelector(".deck-rules section.rules-section.open").classList.contains("from-left")`), true, "going back, it slides in from the left");
  // Its × goes back to the buttons; so does Escape, and a click outside the card. The modal stays open.
  await page.eval(`document.querySelector('[data-hint="rulesShrink"]').click()`);
  await page.until(`!document.querySelector(".deck-rules section.rules-section.open")`);
  await page.eval(`document.querySelectorAll(".deck-rules button.rules-section")[1].click()`);
  await page.until(`document.querySelector(".deck-rules section.rules-section.open")`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".deck-rules section.rules-section.open") && document.querySelector(".modal.deck-rules")`);
  await page.eval(`document.querySelectorAll(".deck-rules button.rules-section")[1].click()`);
  await page.until(`document.querySelector(".deck-rules section.rules-section.open")`);
  await page.eval(`document.querySelector(".deck-rules .rules-over").click()`);
  await page.until(`!document.querySelector(".deck-rules section.rules-section.open") && document.querySelector(".modal.deck-rules")`);
  // A click on the empty space around the buttons opens the first section.
  await page.eval(`document.querySelector(".deck-rules .rules-buttons").click()`);
  await page.until(`document.querySelector(".deck-rules section.rules-section.open")`);
  assert.equal(await sectionTitle(), titles[0]);
  assert.equal(titles[0], "The Evening", "the player's own rules (Interface v0.17), in the order a player learns the evening");
  assert.deepEqual(titles, ["The Evening", "How to Win", "Your Errand", "The Order of the Evening", "Stages and Turns", "Conversations", "Money and Bribes", "France's Payroll", "Midnight", "Candidates and the Vote"]);
  assert.deepEqual(await page.eval<string[]>(`[...document.querySelectorAll(".deck-rules .deck-foot button")].map((b) => b.textContent)`), ["← The Rules", "Next Rule →"]);
  // Opened from the left panel again, it's where it was left.
  await page.eval(`document.querySelector(".deck-close").click()`);
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
  // Interface v0.16: Next topic at its foot (nothing before the first: the way back to the list is above); a click on the entry turns on; the way back stays put.
  const ids = await page.eval<string[]>(`(() => { const e = document.querySelector(".city-entry"); return [e.dataset.lore]; })()`);
  assert.deepEqual(await page.eval<string[]>(`[...document.querySelectorAll(".deck-city .deck-foot button")].map((b) => b.textContent)`), rows.n > 1 ? ["Next Topic →"] : ["On to Glossary"]);
  if (rows.n > 1) {
    const backTop = () => page.eval<number>(`document.querySelector('[data-hint="cityBack"]').getBoundingClientRect().top`);
    const top = await backTop();
    await page.eval(`document.querySelector(".city-entry .deck-text").click()`);
    await page.until(`document.querySelector(".city-entry").dataset.lore !== ${JSON.stringify(ids[0])}`);
    assert.equal(await backTop(), top, "the way back to the list stays put");
    assert.equal(await page.eval<string>(`document.querySelector(".deck-city .deck-prev").textContent`), "← Previous Topic");
    await page.eval(`document.querySelector(".deck-city .deck-prev").click()`);
    await page.until(`document.querySelector(".city-entry").dataset.lore === ${JSON.stringify(ids[0])}`);
    assert.equal(await page.eval<boolean>(`document.querySelector(".city-entry").classList.contains("from-left")`), true);
  }
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
  await page.until(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])")`);
  const centred = () =>
    page.eval<{ off: number; names: boolean; arrow: string }>(`(() => {
      const bar = document.querySelector(".web-bar").getBoundingClientRect(), g = document.querySelector(".web-bar-group").getBoundingClientRect();
      return { off: Math.abs((g.left + g.right) / 2 - (bar.left + bar.right) / 2), names: !!document.querySelector(".web-bar-sel"), arrow: document.querySelector(".web-bar-arrow").textContent };
    })()`);
  let c = await centred();
  assert.ok(c.off < 2, `centered (${c.off}px off)`);
  assert.equal(c.names, false, "no one selected: just the arrow and the title");
  assert.equal(c.arrow, "▲");
  const name = await page.eval<string>(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").dataset.guest`);
  await page.eval(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").click()`);
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

test("the Notes tab (Interface v0.16): the writing box on top; every note always listed, grouped by guest, then pair, then free; a group folds; a note or its heading selects, and the selected group is lit", { skip }, async () => {
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
  await clearPicks();
  await write("A free note, long enough to wrap inside the column: " + "word ".repeat(30) + "averyveryveryveryveryveryveryveryveryveryveryveryveryverylongwordwithoutanybreakatall.");
  const ours = ["On A alone.", "On A and B.", "On B alone.", "On B and C."];
  const list = () => page.eval<{ texts: string[]; kinds: number[]; lit: string[]; boxOnTop: boolean }>(`(() => {
    const ours = new Set(${JSON.stringify(ours)});
    const box = document.querySelector(".web textarea").getBoundingClientRect(), first = document.querySelector(".note-list")?.getBoundingClientRect();
    const groups = [...document.querySelectorAll(".note-group")];
    return { texts: [...document.querySelectorAll(".note-text")].map((n) => n.textContent).filter((t) => ours.has(t)), kinds: groups.map((g) => g.dataset.group === "free" ? 0 : g.dataset.group.split("|").length), lit: groups.filter((g) => g.classList.contains("lit")).map((g) => g.dataset.group), boxOnTop: !first || first.top >= box.bottom };
  })()`);
  // None selected: every note, grouped: each guest (the newest group first), then each pair, then free notes.
  let l = await list();
  const all = l.texts;
  assert.deepEqual(all, ["On B alone.", "On A alone.", "On B and C.", "On A and B."], "each guest, then each pair");
  assert.deepEqual(l.kinds, [...l.kinds].sort((x, y) => (x || 9) - (y || 9)), `guests, then pairs, then free notes (${l.kinds})`);
  assert.equal(l.kinds.at(-1), 0, "free notes last");
  assert.deepEqual(l.lit, []);
  assert.ok(l.boxOnTop, "the writing box on top");
  await page.shot("notes-none");
  // Selecting no longer narrows the list: one guest, then a pair, and every note is still there; the selected one's group is lit.
  await pickNode(b);
  l = await list();
  assert.deepEqual(l.texts, all, "one selected: every note still listed");
  assert.deepEqual(l.lit, [b]);
  const litLook = await page.eval<{ heading: string; other: string; line: string; otherLine: string }>(`(() => { const lit = document.querySelector(".note-group.lit"), not = document.querySelector(".note-group:not(.lit)"); return { heading: getComputedStyle(lit.querySelector(".note-heading")).color, other: getComputedStyle(not.querySelector(".note-heading")).color, line: getComputedStyle(lit.querySelector(".note")).borderLeftColor, otherLine: getComputedStyle(not.querySelector(".note")).borderLeftColor }; })()`);
  assert.ok(litLook.heading !== litLook.other && litLook.line !== litLook.otherLine, "its heading and lines in the accent");
  await page.shot("notes-one");
  await pickNode(a);
  l = await list();
  assert.deepEqual(l.texts, all, "a pair selected: every note still listed");
  assert.deepEqual(l.lit, [[a, b].sort().join("|")]);
  await page.shot("notes-pair");
  // Clicking a note selects its guest; clicking a pair's heading selects the pair.
  await clearPicks();
  await page.eval(`[...document.querySelectorAll(".note")].find((n) => n.querySelector(".note-text").textContent === "On A alone.").querySelector(".note-text").click()`);
  await page.until(`document.querySelectorAll(".web .node.picked").length === 1`);
  assert.deepEqual(await webPicked(), [a], "a note selects its guest");
  await page.eval(`[...document.querySelectorAll(".note")].find((n) => n.querySelector(".note-text").textContent === "On B and C.").closest(".note-group").querySelector(".note-heading .note-about").click()`);
  await page.until(`document.querySelectorAll(".web .node.picked").length === 2`);
  assert.deepEqual((await webPicked()).sort(), [b, c].sort(), "the pair is selected, in the web and on its bar");
  assert.equal(await page.eval<boolean>(`(() => { const g = document.querySelector(".note-group.lit").getBoundingClientRect(), box = document.querySelector(".web-side .notes").getBoundingClientRect(); return g.top >= box.top - 1 && g.top < box.bottom; })()`), true, "and its group is in view");
  // A group folds under its heading: its notes go, and its count shows.
  const fold = `document.querySelector(".note-group.lit .note-fold")`;
  assert.equal(await page.eval<string>(`${fold}.getAttribute("aria-label")`), "Fold these notes");
  await page.eval(`${fold}.click()`);
  await page.until(`document.querySelector(".note-group.lit.folded")`);
  assert.deepEqual(await page.eval<[number, string, string]>(`(() => { const g = document.querySelector(".note-group.lit"); return [g.querySelectorAll(".note").length, g.querySelector(".note-count").textContent, g.querySelector(".note-fold").getAttribute("aria-label")]; })()`), [0, "1", "Show these notes"]);
  await page.eval(`${fold}.click()`);
  await page.until(`!document.querySelector(".note-group.folded")`);
  // Every note has the same straight line down its left; a long note wraps inside the column.
  const wrap = await page.eval<{ lines: number; inside: boolean; borders: number }>(`(() => { const col = document.querySelector(".web-side .notes"), notes = [...col.querySelectorAll(".note")], long = notes.find((n) => n.textContent.includes("averyvery")); return { lines: new Set(notes.map((n) => getComputedStyle(n).borderLeftWidth + getComputedStyle(n).borderLeftStyle)).size, inside: long.getBoundingClientRect().right <= col.getBoundingClientRect().right && col.scrollWidth <= col.clientWidth, borders: notes.length }; })()`);
  assert.equal(wrap.lines, 1);
  assert.ok(wrap.inside && wrap.borders >= 5, "long notes wrap inside the column");
  await clearPicks();
  await webDown();
});

test("portraits select like names; the player's own name or portrait opens Your briefing, with the hover \"Your briefing\"", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])")`);
  const name = await page.eval<string>(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").dataset.guest`);
  await page.eval(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").click()`);
  await page.until(`document.querySelector(".side.right .look:not(.leaving)")?.dataset.guest === ${JSON.stringify(name)}`);
  assert.equal(await page.eval<boolean>(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").getAttribute("aria-pressed") === "true"`), true, "marked as selected");
  // Again: deselects.
  await page.eval(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").click()`);
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
  await page.until(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])") && document.querySelector(".stream .ln")`);
  const select = async () => {
    await page.eval(`document.querySelector(".place.own button.token[data-guest]:not([data-guest='Francesco Pazzi'])").click()`);
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
  const other = await page.eval<string | null>(`[...document.querySelectorAll(".room button.token[data-guest]")].map((b) => b.dataset.guest).find((g) => g !== ${JSON.stringify(current)}) ?? null`);
  if (other) {
    await page.eval(`[...document.querySelectorAll(".room button.token[data-guest]")].find((b) => b.dataset.guest === ${JSON.stringify(other)}).click()`);
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

test("four modals in a row (Interface v0.16): solid neighbours with one-line summaries, the title centred; clicking one moves to it at its beginning; nothing before the first or after the last; Escape closes", { skip }, async () => {
  await reopen();
  await page.until(`!document.querySelector('[data-hint="glossary"]').disabled`);
  const row = () =>
    page.eval<{ open: string; left: string | null; right: string | null; solid: boolean; summaries: string[]; inView: boolean; centred: boolean; closeRight: boolean }>(`(() => {
      const m = document.querySelector(".modal.deck"), l = document.querySelector(".modal-peek.left"), r = document.querySelector(".modal-peek.right");
      const b = m.getBoundingClientRect(), h = m.querySelector("header h2").getBoundingClientRect(), c = m.querySelector(".deck-close").getBoundingClientRect();
      const peeks = [l, r].filter((p) => !p.classList.contains("empty"));
      return { open: [...m.classList].find((c) => c.startsWith("deck-")).slice(5), left: l.dataset.deck ?? null, right: r.dataset.deck ?? null,
        solid: peeks.every((p) => getComputedStyle(p).maskImage === "none" && getComputedStyle(p).opacity === "1" && getComputedStyle(p.querySelector(".peek-frame")).opacity === "1" && getComputedStyle(p).backgroundColor === getComputedStyle(m).backgroundColor),
        summaries: peeks.map((p) => p.querySelector(".peek-summary").textContent),
        inView: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight,
        centred: Math.abs(h.left + h.width / 2 - (b.left + b.width / 2)) < 2, closeRight: b.right - c.right < 24 };
    })()`);
  const summary = (JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { screen: { modalRow: { summary: Record<string, string> } } }).screen.modalRow.summary;
  await page.eval(`document.querySelector('[data-hint="briefing"]').click()`);
  await page.until(`document.querySelector(".deck-briefing .deck-card")`);
  let r = await row();
  assert.deepEqual([r.open, r.left, r.right], ["briefing", null, "rules"], "nothing to the briefing's left");
  assert.ok(r.inView && r.centred && r.closeRight, "the title centred, Close at the right");
  assert.deepEqual(r.summaries, [summary.rules]);
  // The briefing's second card. The arrow keys still turn it.
  await page.key("ArrowRight", 39);
  await page.until(`document.querySelectorAll(".deck .tab")[1].classList.contains("on")`);
  // Along the row: rules, city, glossary, each with its solid neighbours and their one-line summaries, each at its beginning.
  for (const [want, left, right] of [["rules", "briefing", "city"], ["city", "rules", "glossary"], ["glossary", "city", null]] as const) {
    await page.until(`document.querySelector(".modal.deck").getAnimations().length === 0`);
    await clickAt(".modal-peek.right");
    await page.until(`document.querySelector(".modal.deck-${want}")`);
    r = await row();
    assert.deepEqual([r.open, r.left, r.right], [want, left, right], want);
    assert.ok(r.solid, `${want}: its neighbours are solid, not see-through`);
    assert.deepEqual(r.summaries, [summary[left], ...(right ? [summary[right]] : [])], `${want}: one line each on what they are`);
    assert.ok(r.centred && r.closeRight, want);
    await page.shot(`modal-row-${want}`);
  }
  // Nothing to the glossary's right: no neighbour there to move to.
  assert.equal(await page.eval<boolean>(`document.querySelector(".modal-peek.right").matches(".empty:not([role])")`), true, "nothing right of the glossary");
  // Back along: left to the briefing, which starts from its beginning again (Interface v0.16).
  for (const want of ["city", "rules", "briefing"]) {
    // Once the row has stopped sliding (the open one passes over its neighbour as it comes in).
    await page.until(`document.querySelector(".modal.deck").getAnimations().length === 0`);
    await clickAt(".modal-peek.left");
    await page.until(`document.querySelector(".modal.deck-${want}")`);
    assert.equal(await page.eval<boolean>(`document.querySelector(".modal.deck").classList.contains("from-left")`), true, `${want}: it comes in from the left`);
  }
  assert.equal(await page.eval<boolean>(`document.querySelectorAll(".deck .tab")[0].classList.contains("on")`), true, "every modal starts from its beginning when you move to it");
  assert.equal(await page.eval<boolean>(`document.querySelector(".modal-peek.left").matches(".empty:not([role])")`), true, "nothing left of the briefing");
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".overlay")`);
});

test("the briefing shows five cards; the footers chain the four modals forward and back, with the highlights pointing the way (Interface v0.16)", { skip }, async () => {
  await reopen();
  await page.until(`!document.querySelector('[data-hint="briefing"]').disabled`);
  await page.eval(`document.querySelector('.side.left .me-briefing').click()`);
  await page.until(`document.querySelector(".deck-briefing .deck-card")`);
  // Start from the first card, however the briefing was left.
  await page.eval(`document.querySelectorAll(".deck-briefing .tab")[0].click()`);
  const tabs = await page.eval<string[]>(`[...document.querySelectorAll(".deck-briefing .tab")].map((t) => t.textContent)`);
  assert.deepEqual(tabs, ["Who You Are", "Your Errand Tonight", "What You Want", "What You Know", "Relationships"], "five cards for the player, their tabs in title case (Interface v0.17)");
  const merged = async (i: number) => {
    await page.eval(`document.querySelectorAll(".deck-briefing .tab")[${i}].click()`);
    await page.until(`document.querySelectorAll(".deck-briefing .tab")[${i}].classList.contains("on")`);
    return page.eval<string[]>(`[...document.querySelectorAll(".deck-briefing .deck-card .deck-text strong")].map((x) => x.textContent)`);
  };
  assert.ok((await merged(2)).includes("Your Own Reasons"), "What you want: the faction's aims, then Your own reasons");
  assert.ok((await merged(3)).includes("Keep to Yourself"), "What you know: then Keep to yourself");
  await page.shot("briefing-five");
  await page.eval(`document.querySelectorAll(".deck-briefing .tab")[0].click()`);
  const STATE = `(() => {
      const m = document.querySelector(".modal.deck"), p = m.querySelector(".deck-prev"), n = m.querySelector(".deck-next");
      return { deck: [...m.classList].find((c) => c.startsWith("deck-")).slice(5), at: m.querySelector(".tab.on")?.textContent ?? m.querySelector("section.rules-section.open")?.dataset.section ?? m.querySelector(".city-entry")?.dataset.lore ?? "", prev: p?.textContent ?? null, next: n?.textContent ?? null, prevCls: p?.className ?? "", nextCls: n?.className ?? "", close: m.querySelector(".deck-close").className, lit: [...document.querySelectorAll(".modal-peek.lit")].map((x) => x.dataset.deck), way: m.dataset.way };
    })()`;
  const state = () => page.eval<{ deck: string; at: string; prev: string | null; next: string | null; prevCls: string; nextCls: string; close: string; lit: string[]; way: string }>(STATE);
  const click = async (sel: string) => {
    const was = JSON.stringify(await state());
    await page.eval(`document.querySelector(".modal.deck ${sel}").click()`);
    await page.until(`JSON.stringify(${STATE}) !== ${JSON.stringify(was)}`);
    return state();
  };
  // Forward through the briefing: Next briefing, until the last card, where the way on breathes and the next modal's peek lights up.
  let st = await state();
  assert.deepEqual([st.prev, st.next], [null, "Next Briefing →"]);
  for (let i = 1; i < 5; i++) st = await click(".deck-next");
  assert.deepEqual([st.prev, st.next], ["← Previous Briefing", "On to the Rules"]);
  assert.ok(st.nextCls.includes("breathe"), "the way on breathes");
  assert.deepEqual(st.lit, ["rules"], "and the next modal's peek lights up");
  assert.equal(await page.eval<boolean>(`document.querySelector(".deck-next").getAnimations().some((a) => a.effect.getComputedTiming().iterations === Infinity)`), true, "a pulsing outline");
  // A click on the footer's blank space turns on within the deck only: on the last card it stays.
  await page.eval(`document.querySelector(".deck-briefing .deck-foot").click()`);
  assert.equal((await state()).deck, "briefing");
  await page.shot("modal-chain-on-to");
  // On to The rules: at its beginning, the buttons.
  st = await click(".deck-next");
  assert.deepEqual([st.deck, st.prev, st.next], ["rules", "Back to Your Briefing", "First Rule →"]);
  assert.equal(await page.eval<boolean>(`!document.querySelector(".deck-rules section.rules-section.open")`), true);
  // Through the rules to the last, then on to the city's list, its topics, and the glossary.
  const rules = await page.eval<number>(`document.querySelectorAll(".deck-rules button.rules-section").length`);
  for (let i = 0; i < rules; i++) st = await click(".deck-next");
  assert.deepEqual([st.prev, st.next], ["← Previous Rule", "On to the City"]);
  assert.deepEqual(st.lit, ["city"]);
  st = await click(".deck-next");
  assert.deepEqual([st.deck, st.prev, st.next], ["city", "Back to the Rules", "First Topic →"]);
  const topics = await page.eval<number>(`document.querySelectorAll(".deck-city .city-row").length`);
  for (let i = 0; i < topics; i++) st = await click(".deck-next");
  assert.equal(st.next, "On to Glossary");
  st = await click(".deck-next");
  // The glossary, the end of the chain: only the way back, and Close fills in.
  assert.deepEqual([st.deck, st.prev, st.next], ["glossary", "Back to the City", null]);
  assert.ok(st.close.includes("primary"), "Close fills in at the end of the chain");
  await page.shot("modal-chain-end");
  // Backward, everything mirrors: Back to The city opens it at its last topic, sliding in from the left.
  st = await click(".deck-prev");
  assert.deepEqual([st.deck, st.way, st.next], ["city", "back", "On to Glossary"]);
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".deck-city .city-entry") && document.querySelector(".modal.deck").classList.contains("from-left")`), true, "at its last topic");
  assert.ok(st.prevCls.includes("breathe") && !st.nextCls.includes("breathe"), "the back button carries the breathing outline; On to goes plain");
  assert.deepEqual(st.lit, []);
  // Back to the list, where the back button fills and the previous modal's peek lights up.
  await page.eval(`document.querySelector('[data-hint="cityBack"]').click()`);
  await page.until(`document.querySelector(".deck-city .city-list")`);
  st = await state();
  assert.deepEqual([st.prev, st.way], ["Back to the Rules", "back"]);
  assert.ok(st.prevCls.includes("primary") && st.prevCls.includes("breathe"), "on the first item the back button fills");
  assert.deepEqual(st.lit, ["rules"]);
  // Back to The rules: at its last rule; back through them to the buttons, then to the briefing's last card.
  st = await click(".deck-prev");
  assert.deepEqual([st.deck, st.next], ["rules", "On to the City"]);
  for (let i = 0; i < rules - 1; i++) st = await click(".deck-prev");
  assert.equal(st.prev, "← The Rules");
  st = await click(".deck-prev");
  assert.equal(st.prev, "Back to Your Briefing");
  st = await click(".deck-prev");
  assert.deepEqual([st.deck, st.prev, st.next], ["briefing", "← Previous Briefing", "On to the Rules"]);
  assert.equal(await page.eval<boolean>(`document.querySelectorAll(".deck-briefing .tab")[4].classList.contains("on")`), true, "at its last card");
  // Back to the first card, the start of the chain: Close fills in.
  for (let i = 0; i < 4; i++) st = await click(".deck-prev");
  assert.equal(st.prev, null);
  assert.ok(st.close.includes("primary"), "Close fills in at the start of the chain");
  assert.equal(await page.eval<boolean>(`document.querySelector(".deck-briefing .deck-card").classList.contains("from-left")`), true, "cards slide in from the left going back");
  // The motion's sizes: a card slides 24 pixels in 300 ms.
  const motion = await page.eval<{ ms: number; px: string }>(`(() => { const s = getComputedStyle(document.documentElement); return { ms: parseFloat(getComputedStyle(document.querySelector(".deck-briefing .deck-card")).animationDuration) * 1000, px: s.getPropertyValue("--swipe-distance").trim() }; })()`);
  assert.deepEqual(motion, { ms: 300, px: "24px" });
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
  assert.equal(await page.eval<string>(`document.querySelector(".deck-rules section.rules-section h3").textContent`), "Money and Bribes");
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

// ---- CC-20261114-10 (#117, part 3 of 3) ------------------------------------------------------------------

const NOTAIO_WORDS = JSON.parse(readFileSync("setting/florence-1492/notaio.json", "utf8")) as { name: { gloss: string; hover: string }; opening: { paragraphs: string[] }; tour: { steps: Record<string, string> } };

test("the opening (Interface v0.16): his name and its gloss before he writes, a phrase at a time, the page following the text, a click finishing the paragraph, Skip writing it all, reduced motion writing it whole, then the choice", { skip }, () => {
  const paras = NOTAIO_WORDS.opening.paragraphs;
  const o = opening as Required<typeof opening>;
  assert.equal(o.beforeWriting.name, "Il Notaio", "his name heads the page");
  assert.equal(o.beforeWriting.gloss, NOTAIO_WORDS.name.gloss, "with its gloss beneath it");
  assert.deepEqual(o.beforeWriting.paras, [], "before he writes");
  assert.equal(o.beforeWriting.choice, false);
  // Writing: part of the first paragraph, as by pen; the name kept at the top.
  const w = o.writing.paras.at(-1)!;
  assert.equal(w.state, "writing");
  assert.ok(w.text.length > 0 && w.text.length < w.full.length && w.full.startsWith(w.text), `part of the paragraph: "${w.text}"`);
  // A phrase at a time, split at commas and sentence ends: what's written so far is whole phrases.
  assert.ok(o.writing.phrases.length > 0 && o.writing.phrases.join("") === w.text, "whole phrases");
  for (const x of o.writing.phrases) assert.match(x, /[,;:.!?]["”’)]*\s*$/, `a phrase ends at a comma or a sentence end: "${x}"`);
  assert.equal(o.writing.gloss, NOTAIO_WORDS.name.gloss, "the gloss stays while he writes");
  assert.ok(o.headTop >= 0 && o.headTop < 5, "his name at the top");
  // A click finishes the paragraph being written.
  assert.equal(o.afterClick.paras.at(-1)!.text, paras[0], "a click finishes it");
  assert.equal(o.afterClick.choice, false, "the choice waits for the end");
  // At the end: every paragraph, kept on the page, and the choice.
  assert.deepEqual(o.end.paras.map((p) => p.text), paras, "earlier paragraphs stay on the page");
  assert.equal(o.end.choice, true);
  assert.ok(o.end.footInView, "the page follows the text down as it grows");
  // The choice: "Choose your family"; the full game's other playable character greyed out after the playable one, with no button.
  assert.equal(o.end.heading, "Choose Your Family");
  assert.deepEqual(o.end.locked, ["Piero de' Medici: In the Full Game"]);
  // Skip: everything at once, and the choice.
  assert.deepEqual(o.skipped.paras.map((p) => [p.state, p.text]), paras.map((p) => ["done", p]), "Skip writes everything out");
  assert.equal(o.skipped.choice, true);
  // Reduced motion: the first paragraph seen is already whole.
  assert.equal(o.reduced.paras[0]!.text, paras[0], "with reduced motion, it appears whole");
});

test("the tour after the choice, once: steps in order, each spotlit with its card; a click moves on, Back goes back; Skip tour; it ends on Your briefing, which opens; Show me around runs it again", { skip }, async () => {
  assert.equal(tourAtStart, "sheet", "it began by itself after the choice, on the sheet");
  await reopen();
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".tour")`), false, "it runs once: not after a reload");
  const steps = Object.keys(NOTAIO_WORDS.tour.steps);
  const target: Record<string, string> = { sheet: ".sheet-panel", decks: ".buttons.decks", errand: ".side.left .errand", room: ".side.left .room", stageBar: ".conv-where", conversation: ".centre .stream", right: ".side.right", web: ".web-bar", briefing: '.side.left [data-hint="briefing"]' };
  const look = () =>
    page.eval<{ step: string; text: string; covers: boolean; cardIn: boolean; overlaps: boolean }>(`(() => {
      const t = document.querySelector(".tour"), spot = document.querySelector(".tour-spot").getBoundingClientRect(), card = document.querySelector(".tour-card").getBoundingClientRect();
      const el = document.querySelector(${JSON.stringify(Object.fromEntries(Object.entries(target)))}[t.dataset.step]).getBoundingClientRect();
      return { step: t.dataset.step, text: document.querySelector(".tour-text").textContent,
        covers: spot.left <= el.left + 1 && spot.top <= el.top + 1 && spot.right >= el.right - 1 && spot.bottom >= el.bottom - 1,
        cardIn: card.left >= 0 && card.top >= 0 && card.right <= innerWidth && card.bottom <= innerHeight,
        overlaps: !(card.right <= spot.left || card.left >= spot.right || card.bottom <= spot.top || card.top >= spot.bottom) };
    })()`);
  const settle = () => page.until(`document.querySelector(".tour-spot") && document.querySelector(".tour-spot").getAnimations().length === 0 && !document.querySelector(".tour-card.measuring")`);
  await page.eval(`document.querySelector(".tour-again").click()`);
  await page.until(`document.querySelector(".tour")?.dataset.step === "sheet"`);
  // The rest of the screen is dimmed: the spot's shadow covers the window.
  assert.match(await page.eval<string>(`getComputedStyle(document.querySelector(".tour-spot")).boxShadow`), /rgba?\(/);
  for (const [i, step] of steps.entries()) {
    await page.until(`document.querySelector(".tour")?.dataset.step === ${JSON.stringify(step)}`);
    await settle();
    const l = await look();
    assert.equal(l.text, NOTAIO_WORDS.tour.steps[step], `${step}: its card`);
    assert.ok(l.covers, `${step}: spotlit`);
    assert.ok(l.cardIn, `${step}: the card in the window`);
    if (step !== "right" && step !== "conversation") assert.ok(!l.overlaps, `${step}: the card beside it, not over it`);
    await page.shot(`tour-${i + 1}-${step}`);
    if (step === "decks") {
      // Back goes back, and a click anywhere moves on again.
      await page.eval(`document.querySelector('[data-hint="tourBack"]').click()`);
      await page.until(`document.querySelector(".tour")?.dataset.step === "sheet"`);
      await clickAt({ x: VIEW.width / 2, y: VIEW.height / 2 });
      await page.until(`document.querySelector(".tour")?.dataset.step === "decks"`);
    }
    if (i < steps.length - 1) await clickAt({ x: 8, y: VIEW.height - 8 });
  }
  // The last: Your briefing. Moving on opens the briefing and ends the tour.
  await clickAt('.side.left [data-hint="briefing"]');
  await page.until(`!document.querySelector(".tour") && document.querySelector(".deck-briefing .deck-card")`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".overlay")`);
  // Show me around again, then Skip tour on a later step; Escape skips too.
  await page.eval(`document.querySelector(".tour-again").click()`);
  await page.until(`document.querySelector(".tour")`);
  await clickAt({ x: 8, y: VIEW.height - 8 });
  await page.until(`document.querySelector(".tour")?.dataset.step === "decks"`);
  await page.eval(`document.querySelector(".tour-skip").click()`);
  await page.until(`!document.querySelector(".tour")`);
  await page.eval(`document.querySelector(".tour-again").click()`);
  await page.until(`document.querySelector(".tour")`);
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".tour")`);
  // With reduced motion, the spotlight jumps.
  await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await page.eval(`document.querySelector(".tour-again").click()`);
  await page.until(`document.querySelector(".tour-spot")`);
  assert.equal(await page.eval<string>(`getComputedStyle(document.querySelector(".tour-spot")).transitionDuration.split(",").every((d) => parseFloat(d) === 0) ? "jumps" : "glides"`), "jumps");
  await page.key("Escape", 27);
  await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "no-preference" }] });
  await reopen();
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".tour")`), false, "still once");
});

test("Il Notaio's name: its hover glosses it, even with the hover explanations off, in the stream, his hint, and the tour's card", { skip }, async () => {
  await reopen();
  await page.until(`document.querySelector(".ln.notaio .narrator-name")`);
  await HINTS_OFF(true);
  const hoverOn = async (sel: string) => {
    await page.eval(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({ block: "nearest" })`);
    await page.eval(`new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)))`);
    const at = await page.eval<{ x: number; y: number }>(`(() => { const b = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
    await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...at });
    await page.until(`document.querySelector(".tip:not(.measuring)")`);
    return page.eval<string>(`document.querySelector(".tip").textContent`);
  };
  assert.equal(await hoverOn(".ln.notaio .narrator-name"), NOTAIO_WORDS.name.hover, "his notes in the stream");
  await page.shot("notaio-name-hover");
  assert.equal(await hoverOn(".notaio-hint .narrator-name"), NOTAIO_WORDS.name.hover, "his hint");
  // A control's explanation stays off meanwhile.
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  const speak = await page.eval<{ x: number; y: number }>(`(() => { const b = document.querySelector(".input .actions button").getBoundingClientRect(); return { x: b.left + 4, y: b.top + 4 }; })()`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...speak });
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(await page.eval<boolean>(`!!document.querySelector(".tip")`), false, "explanations are off");
  await page.eval(`document.querySelector(".tour-again").click()`);
  await page.until(`document.querySelector(".tour-card:not(.measuring) .narrator-name")`);
  assert.equal(await hoverOn(".tour-card .narrator-name"), NOTAIO_WORDS.name.hover, "the tour's card");
  await page.key("Escape", 27);
  await page.until(`!document.querySelector(".tour")`);
  await page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 1, y: 1 });
  await HINTS_OFF(false);
});
