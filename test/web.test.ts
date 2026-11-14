// The player screen (CC-20261111-09, #62; TD v0.39, The screen). Rendered on the server over a whole
// fake game's log: every view renders, and every word it shows is the setting pack's (a missing word
// would show its key). And the rules the screen is built under: one theme file for the look, and no
// words or setting terms in the web app's code.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { HumanController, type Connection } from "../src/core/human.ts";
import { MiniGame } from "../src/minigame/engine.ts";
import { castBriefings } from "../src/minigame/cast.ts";
import type { CharacterName } from "../src/game/roster.ts";
import { errandText, screenContent } from "../src/minigame/player.ts";
import type { LoreEntry as StoredLore } from "../src/minigame/lore.ts";
import { screenInfo } from "../src/minigame/screen-info.ts";
import { settingPack } from "../src/setting/pack.ts";
import { GameView, Start } from "../web/src/App.tsx";
import type { Ev } from "../web/src/connection.ts";
import { canDo, canSpeak, openMenu, trigger, withMention } from "../web/src/input.ts";
import { appearsIn, briefingCards, cityCards, derive, errandDeadline, errandLine, factionLabels, heardAndSaw, hintMoment, loreParts, readingFor, rulesCards, talkingWith, trackMarks, webLayout, type LoreEntry, type View } from "../web/src/model.ts";
import { notaioHint, setInfo, type StartInfo } from "../web/src/words.ts";
import { fakeCaller, fakeDocs, fakeSettings } from "./fixtures/fake-game.ts";

const F = "Francesco Pazzi";
const files = (dir: string, ext: RegExp) => readdirSync(dir).filter((f) => ext.test(f)).map((f) => join(dir, f));
const noComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/**
 * A fake game as Francesco, answered in process; the log at every request, with which kind was open.
 * `Game` plays a subclass (one that earns the extra act); `midnight` answers each midnight request in turn.
 */
async function playedLog(opts: { Game?: typeof MiniGame; midnight?: (guests: string[], n: number) => unknown } = {}): Promise<{ log: Ev[]; at: Record<string, Ev[]>; game: MiniGame }> {
  const ctrl = new HumanController(F);
  const game = new (opts.Game ?? MiniGame)(fakeDocs, fakeSettings({ briefings: castBriefings(fakeDocs), seed: 2000, turns: 12, human: F }), fakeCaller(), {}, null, ctrl);
  let midnights = 0;
  const log: Ev[] = [];
  const at: Record<string, Ev[]> = {};
  let reply: (d: string) => void = () => {};
  let moves = 0;
  /** The open midnight request, answered again after a refusal. */
  let midnight: Ev | null = null;
  const conn: Connection = {
    send: (d) => {
      let ev = JSON.parse(d) as Ev;
      log.push(ev);
      if (ev.type === "refusal" && midnight && opts.midnight) ev = midnight;
      else if (ev.type === "request" && ev.kind === "midnight") midnight = ev.closed ? null : ev;
      if (ev.type !== "request" || ev.closed) return;
      const o = ev.options as Record<string, unknown>;
      const key = ev.kind === "speak" ? `speak:${o.conversation}${o.answering ? ":answering" : ""}${o.closing ? ":closing" : ""}` : String(ev.kind);
      at[key] ??= [...log];
      queueMicrotask(() => {
        if (ev.kind === "speak") reply(JSON.stringify(o.conversation === "colloquio" && !o.closing ? { type: "say", text: "@Lupo between us, then." } : { type: "pass" }));
        else if (ev.kind === "move") reply(JSON.stringify({ type: "choice", request: ev.id, value: moves++ ? { choice: "stay" } : { choice: "colloquio", target: (o.guests as string[])[0] } }));
        else if (ev.kind === "seat") {
          const g = o.groups as { members: string[] }[];
          reply(JSON.stringify({ type: "choice", request: ev.id, value: g.length ? { choice: "join", target: g[0]!.members[0] } : { choice: "wait", target: null } }));
        } else reply(JSON.stringify({ type: "choice", request: ev.id, value: opts.midnight?.(o.guests as string[], midnights++) ?? { acts: [{ type: "watch", target: (o.guests as string[])[0] }] } }));
      });
    },
    onMessage: (cb) => void (reply = cb),
    onClose: () => {},
  };
  ctrl.attach(conn);
  queueMicrotask(() => reply(JSON.stringify({ type: "command", text: "/borrow" })));
  await game.play();
  return { log, at, game };
}

const info = { ...screenInfo([F], castBriefings(fakeDocs)), started: null, ws: null } as StartInfo;
setInfo(info);
const html = (el: ReturnType<typeof createElement>) => renderToString(el);
/** Words the screen shows but couldn't find in player.json come out as their keys. */
const missingWords = (h: string) => h.match(/\bscreen\.[\w.]+|\b(?:refusals|commands|hints)\.[\w.]+|undefined|\[object Object\]/g) ?? [];

test("the start screen: one card, for Francesco, with his public line and his briefing's first paragraph", () => {
  const h = html(createElement(Start, { onStart: () => {} }));
  assert.deepEqual(missingWords(h), []);
  assert.equal(info.playable.length, 1);
  assert.match(h, /Francesco Pazzi/);
  assert.ok(h.includes(info.playable[0]!.intro.slice(0, 40).replace(/'/g, "&#x27;")), "the first paragraph");
  assert.ok(!info.playable[0]!.intro.startsWith("*"), "not the subtitle line");
});

test("the game screen renders at every kind of wait, and the end screen at the end, with every word from the setting pack", async () => {
  const { log, at } = await playedLog();
  for (const k of ["speak:capannello", "speak:colloquio", "move", "seat", "midnight"]) assert.ok(at[k], `the game waited for ${k}: ${Object.keys(at).join(", ")}`);
  for (const [k, l] of Object.entries(at)) {
    const v = derive(l);
    assert.ok(v.pending, `${k}: a request is open`);
    const h = html(createElement(GameView, { me: F, v, send: () => {}, status: "open" }));
    assert.deepEqual(missingWords(h), [], k);
    if (k === "move" || k === "seat" || k === "midnight") assert.match(h, /class="card"/, `${k}: a decision card`);
    else assert.match(h, /<textarea/, `${k}: the input box`);
  }
  const end = derive(log);
  assert.ok(end.result && !end.pending);
  const h = html(createElement(GameView, { me: F, v: end, send: () => {}, status: "open" }));
  assert.deepEqual(missingWords(h), []);
  assert.match(h, /class="end"/);
  // The sheet (blocks 2 and 3, and the errand) arrived with the first state.
  assert.ok(end.sheet?.briefing && end.sheet.rules && end.sheet.errand);
});

/** The log at the last speak request, by which point the player has been in several conversations. */
async function lateView() {
  const { at, log } = await playedLog();
  const idx = log.findLastIndex((e) => e.type === "request" && e.kind === "speak" && !e.closed);
  const v = derive(log.slice(0, idx + 1));
  assert.ok(v.segments.length > 2, `several conversations by then: ${v.segments.length}`);
  return { v, at };
}

test("only the current conversation is open: earlier ones are one line each under Earlier tonight", async () => {
  const { v } = await lateView();
  const h = html(createElement(GameView, { me: F, v, send: () => {}, status: "open" }));
  assert.deepEqual(missingWords(h), []);
  assert.match(h, /class="earlier"/);
  assert.equal((h.match(/class="earlier-line"/g) ?? []).length, v.segments.length - 1, "one line per earlier conversation");
  assert.ok(h.includes('aria-expanded="false"'), "collapsed until clicked");
  const id = (l: { id: string }) => `data-line="${l.id}"`;
  for (const seg of v.segments.slice(0, -1)) for (const l of seg.lines) assert.ok(!h.includes(id(l)), `an earlier line is folded away: ${l.id}`);
  for (const l of v.segments.at(-1)!.lines) assert.ok(h.includes(id(l)), `a current line is shown: ${l.id}`);
});

test("the errand card: pinned under the sheet, with the briefing's errand section", async () => {
  const errand = errandText(castBriefings(fakeDocs)[F]!);
  assert.ok(errand.length > 40 && !errand.includes("**" + "\n"), errand);
  const { v } = await lateView();
  assert.equal(v.sheet!.errand, errand);
  const h = html(createElement(GameView, { me: F, v, send: () => {}, status: "open" }));
  const card = h.indexOf('class="errand"');
  assert.ok(card > h.indexOf('class="facts"') && card < h.indexOf('class="here"'), "between the sheet and the room");
});

test("buttons by job: Speak is the one filled button, disabled with nothing to say; Pass is outlined; End sits in the header", async () => {
  for (const t of ["", "  ", "@", "/", " / ", "@ ", "@@"]) assert.equal(canSpeak(t), false, JSON.stringify(t));
  for (const t of ["Good evening.", "@Lupo stay close.", "a"]) assert.equal(canSpeak(t), true, t);
  // A command (a `/` and a name) is Do's, never Speak's; a lone `/` is neither yet.
  assert.equal(canSpeak("/borrow"), false);
  assert.equal(canDo("/"), false);
  assert.equal(canDo("/borrow"), true);
  const { at } = await playedLog();
  const v = derive(at["speak:colloquio"]!);
  const h = html(createElement(GameView, { me: F, v, send: () => {}, status: "open" }));
  assert.equal((h.match(/class="primary"/g) ?? []).length, 1, "one primary button");
  assert.match(h, /<button class="primary" disabled=""[^>]*>Speak</, "Speak disabled while the box is empty");
  assert.match(h, /<button class="secondary"[^>]*data-hint="pass"/);
  const head = h.slice(h.indexOf('class="conv-head"'), h.indexOf("</header>", h.indexOf('class="conv-head"')));
  assert.match(head, /data-hint="end"/, "End conversation is in the Colloquio's header");
  const input = h.slice(h.indexOf('class="input"'));
  assert.doesNotMatch(input, /data-hint="end"/);
  assert.match(input, /class="field-icons"><button class="icon"[^>]*>@<\/button><button class="icon"[^>]*>\/<\/button>/, "@ and / are icons inside the box");
});

test("the menus open and close with their character", () => {
  assert.equal(trigger("/")?.kind, "commands");
  assert.equal(trigger("/bor")?.query, "bor");
  assert.equal(trigger(""), null, "deleting the slash closes the command menu");
  assert.equal(trigger("/borrow "), null, "a chosen command closes it");
  assert.equal(trigger("Hello / there"), null, "a slash inside speech isn't a command");
  assert.deepEqual(trigger("A word for @Lu"), { kind: "guests", query: "Lu", at: 11 });
  assert.equal(trigger("A word for "), null, "deleting the @ closes the guest menu");
  // Escape or clicking away dismisses a menu where its character is; typing it again elsewhere reopens.
  const d = trigger("/");
  assert.equal(openMenu("/", d), null);
  assert.equal(openMenu("/bo", d), null, "still dismissed while that slash stays");
  assert.deepEqual(openMenu("@", trigger("Hi @")), trigger("@"), "a new @ at another place opens again");
  assert.equal(withMention(""), "@");
  assert.equal(withMention("Hello"), "Hello @");
});

test("the decks open over the whole screen: after every column, and above them", async () => {
  const { at } = await playedLog();
  const h = html(createElement(GameView, { me: F, v: derive(at["speak:capannello"]!), send: () => {}, status: "open", deck: "briefing" }));
  assert.ok(h.lastIndexOf('class="overlay"') > h.lastIndexOf('class="input"'), "the deck comes after the input box");
  const css = readFileSync("web/src/app.css", "utf8");
  const z = (sel: string) => css.match(new RegExp(`\\${sel} \\{[^}]*z-index: var\\((--z-[\\w-]+)\\)`))?.[1];
  const theme = readFileSync("web/theme.css", "utf8");
  const val = (t: string) => Number(theme.match(new RegExp(`${t}:\\s*(\\d+)`))![1]);
  assert.ok(val(z(".overlay")!) > val(z(".dropdown")!), "the deck is above the menus");
  assert.ok(val(z(".tip")!) > val(z(".overlay")!), "the explanations are above the deck");
});

test("hover explanations: every control and panel has one, in player.json's words", async () => {
  const { at } = await playedLog();
  const hints = new Set<string>();
  for (const l of Object.values(at)) {
    const h = html(createElement(GameView, { me: F, v: derive(l), send: () => {}, status: "open" }));
    for (const m of h.matchAll(/data-hint="(\w+)"/g)) hints.add(m[1]!);
    // Every button and textarea explains itself (the menus' items and the earlier lines say what they are already).
    const controls = [...h.matchAll(/<(button|textarea|select)\b[^>]*>/g)].map((m) => m[0]);
    const bare = controls.filter((c) => !c.includes("data-hint") && !/earlier-line/.test(c) && !c.startsWith("<select"));
    assert.deepEqual(bare, [], "controls without an explanation");
  }
  hints.add("play");
  const words = (info.words as { screen: { hints: Record<string, string> } }).screen.hints;
  for (const k of hints) assert.ok(typeof words[k] === "string" && words[k].length > 10, `screen.hints.${k}`);
  assert.match(html(createElement(GameView, { me: F, v: derive(at.move!), send: () => {}, status: "open" })), /class="switch" aria-pressed="true"/, "on by default");
});

test("one theme file: the components' CSS uses only theme.css's tokens, and every token it uses is defined", () => {
  const theme = readFileSync("web/theme.css", "utf8");
  const defined = new Set([...theme.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]!));
  for (const f of files("web/src", /\.css$/)) {
    const css = noComments(readFileSync(f, "utf8"));
    const literal = css.replace(/var\(--[\w-]+\)/g, "").match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|\b\d*\.?\d+(px|em|rem|vh|vw|pt)\b|font-family:\s*(?!var\()[^;\s]/g);
    assert.deepEqual(literal, null, `${f}: literal values belong in theme.css`);
    const used = [...css.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]!);
    assert.deepEqual(used.filter((t) => !defined.has(t)), [], `${f}: tokens theme.css doesn't define`);
  }
  // The components' inline styles are only token references (a portrait's faction colour).
  for (const f of files("web/src", /\.tsx$/)) assert.doesNotMatch(readFileSync(f, "utf8"), /style=\{\{[^}]*["'`](?!var\()/, f);
});

test("no words and no setting terms in the web app's code", () => {
  const pack = settingPack();
  const terms = [...pack.roster.flatMap((r) => [r.name, ...r.aliases]), ...pack.factions.map((x) => x.name), pack.currency.singular, pack.currency.plural, "Capannello", "Colloquio", "Notaio"];
  for (const f of [...files("web/src", /\.(tsx?|css)$/), "web/index.html"]) {
    const code = noComments(readFileSync(f, "utf8"));
    for (const t of terms) assert.ok(!new RegExp(`(?<![\\p{L}])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}])`, "u").test(code), `${f}: "${t}"`);
    // JSX text: anything between tags that isn't an expression.
    // JSX text: words right after an element's opening or closing tag.
    if (f.endsWith(".tsx")) assert.deepEqual(code.match(/<\/?[a-z][\w.]*(?:\s[^<>]*)?>\s*[A-Za-z][^<>{}]*</g), null, `${f}: words in JSX belong in player.json`);
  }
  assert.match(readFileSync("web/index.html", "utf8"), /<title><\/title>/);
});

// ---- CC-20261112-03 (#81): decks, selection, lore links, the web and the record, notes, Il Notaio's hint ----

const game = (props: Record<string, unknown>) => html(createElement(GameView, { me: F, send: () => {}, status: "open", ...props } as Parameters<typeof GameView>[0]));
const LORE: LoreEntry[] = [
  { id: "L1", title: "San Frediano", aliases: ["the Oltrarno church"], subject: "Places", text: "A church across the river." },
  { id: "L2", title: "1478", aliases: [], subject: "History", text: "The year the Pazzi rose." },
  { id: "L3", title: "The Signoria", aliases: ["Signoria"], subject: null, text: "The city's government." },
];
/** A view with public lore in its sheet, and a line that names two entries. */
function withLore(v: View): View {
  const said = { ...v.stream.find((l) => l.item === "line" && !l.you)!, id: "LX", seq: 1e6, text: "They say the Signoria met at San Frediano after 1478." };
  const segments = v.segments.map((seg, i) => (i === v.segments.length - 1 ? { ...seg, lines: [...seg.lines, said] } : seg));
  return { ...v, sheet: { ...v.sheet!, lore: LORE }, stream: [...v.stream, said], segments };
}

test("the decks: one card per briefing section and per rules topic, with Your past; The city grouped by subject", async () => {
  const briefing = castBriefings(fakeDocs)[F]!;
  const cards = briefingCards(briefing);
  assert.deepEqual(cards.slice(0, 4).map((c) => c.title), ["Who you are", "How you speak", "Your errand tonight", "Your faction"]);
  assert.ok(cards.every((c) => c.text.trim() && !/^\*\*[^*]+\*\*$/m.test(c.text)), "every card has text, and no heading inside");
  assert.equal(cards.map((c) => c.text).join(" ").length > briefing.length * 0.85, true, "the briefing's text is all there");
  const { at } = await playedLog();
  const v = derive(at.move!);
  const rules = rulesCards(v.sheet!.rules);
  assert.ok(rules.length >= 6 && rules.every((c) => c.title && c.text), rules.map((c) => c.title).join(", "));
  assert.deepEqual(cityCards(LORE).map((c) => [c.group, c.title]), [["History", "1478"], ["Places", "San Frediano"], [null, "The Signoria"]]);
  // Rendered: tabs along the top, one per card; the first card open; a back control; Your past when lore is on.
  const past = { ...v, sheet: { ...v.sheet!, past: [{ id: "P1", title: "The garden wall", text: "You climbed it once." }] } };
  for (const [deck, view, n] of [["briefing", past, cards.length + 1], ["rules", v, rules.length], ["city", withLore(v), 3]] as const) {
    const h = game({ v: view, deck });
    assert.deepEqual(missingWords(h), [], deck);
    // The deck's own tabs (the Web of Secrets, always on the page, has tabs of its own).
    assert.equal((h.slice(h.indexOf('class="overlay"')).match(/class="tab( on)?"/g) ?? []).length, n, `${deck}: a tab per card`);
    assert.match(h, /class="deck-card"[^>]*data-hint="deckCard"/, `${deck}: the card swipes on`);
    assert.match(h, /data-hint="deckBack"/);
  }
  assert.match(game({ v: past, deck: "briefing" }), /data-hint="deckTab">Your past</, "Your past, last");
  assert.equal((game({ v: withLore(v), deck: "city" }).match(/class="tab-group"/g) ?? []).length, 3, "The city's subjects head its list");
  // An empty city, on purpose: the repo's lore file holds public lore (#130), so this view sets its own, as withLore does.
  assert.match(game({ v: { ...v, sheet: { ...v.sheet!, lore: [] } }, deck: "city" }), /class="deck-card empty"/, "an empty city says so");
});

test("selection: one guest at a time, on the right, with their lines highlighted and their earlier conversations open", async () => {
  const { v } = await lateView();
  const earlier = v.segments.slice(0, -1);
  const name = v.stream.find((l) => l.item === "line" && !l.you && earlier.some((s) => appearsIn(s, l.speaker!)))!.speaker!;
  const h = game({ v, selected: { kind: "guest", name } });
  assert.deepEqual(missingWords(h), []);
  assert.ok(h.includes(`data-guest="${name.replace(/'/g, "&#x27;")}"`), "their card on the right");
  const opened = (h.match(/class="earlier-line" aria-expanded="true"/g) ?? []).length;
  assert.equal(opened, earlier.filter((s) => appearsIn(s, name)).length, "the earlier conversations they were in, open");
  for (const l of v.stream.filter((x) => x.item === "line" && x.speaker === name && h.includes(`data-line="${x.id}"`))) assert.match(h, new RegExp(`class="ln speech[^"]* hl" data-line="${l.id}"`), `${l.id} highlighted`);
  assert.equal((game({ v }).match(/class="earlier-line" aria-expanded="true"/g) ?? []).length, 0, "nothing selected: all folded");
  assert.match(game({ v }), /class="guest" aria-pressed="false"/, "names select");
});

test("lore links: a public entry's title or alias in any line links to it on the right; relationship entries never", async () => {
  const parts = loreParts("They say the Signoria met at San Frediano after 1478, not at the Signorial palace.", LORE);
  assert.deepEqual(parts.filter((p) => typeof p !== "string").map((p) => (p as { entry: LoreEntry }).entry.id), ["L3", "L1", "L2"], "whole words only");
  assert.deepEqual(loreParts("the oltrarno church", LORE).map((p) => (typeof p === "string" ? p : p.entry.id)), ["L1"], "an alias, ignoring case");
  const { at } = await playedLog();
  const v = withLore(derive(at["speak:capannello"]!));
  const h = game({ v });
  assert.equal((h.match(/class="lore-link"/g) ?? []).length, 3);
  const right = game({ v, selected: { kind: "lore", entry: LORE[0], back: null } });
  assert.match(right, /data-lore="L1"/);
  assert.match(right, /data-hint="back"/, "with a way back");
  // What the engine sends: kind lore only; private entries only the player's own, and only with lore on.
  const e = (id: string, scope: string, kind?: "lore" | "relationship") => ({ id, title: id, scope, text: id, source: "test", status: "approved", canon_checked: true, ...(kind && { kind }) }) as StoredLore;
  const loadable = [e("pub", "public"), e("rel", "public", "relationship"), e("mine", F), e("theirs", "Lupo")];
  const off = screenContent(F, "off", loadable);
  assert.deepEqual([off.lore.map((x) => x.id), off.past], [["pub"], []]);
  assert.deepEqual(screenContent(F, "on", loadable).past.map((x) => x.id), ["mine"]);
  // Each character's own lines are theirs alone: Lupo's screen carries his, never Francesco's.
  const lupo = screenContent("Lupo", "on", loadable).connections.filter((c) => c.private);
  assert.ok(lupo.length > 0 && lupo.every((c) => c.between[0] === "Lupo"), "Lupo's own lines are his");
  const francescos = new Set(screenContent(F, "on", loadable).connections.filter((c) => c.private).map((c) => c.line));
  assert.ok(lupo.every((c) => !francescos.has(c.line)), "Francesco's own lines are his alone");
});

test("the web viewer: twelve guests, fixed lines, up to two selected, and only what the player heard and saw", async () => {
  const { at, log, game: played } = await playedLog();
  const v = derive(log.filter((e) => e.type !== "result"));
  const ids = new Set(v.stream.map((l) => l.id));
  const roster = info.roster.map((r) => r.name);
  const h0 = game({ v, web: [] });
  assert.deepEqual(missingWords(h0), []);
  assert.equal((h0.match(/class="node( [^"]*)?"/g) ?? []).length, 12);
  assert.equal((h0.match(/class="edge rel-[\w-]+ yours/g) ?? []).length, v.sheet!.connections!.filter((c) => c.private).length, "Francesco's own lines, marked as his");
  assert.equal((h0.match(/class="edge-under"/g) ?? []).length, v.sheet!.connections!.filter((c) => c.private).length, "each with the mark beneath it");
  // One guest, and every pair: only lines from the player's own stream, and never a thought.
  const thoughts = played.thoughts.map((t) => t.text).filter((t) => t.length > 20);
  for (const sel of [...roster.map((r) => [r]), ...roster.flatMap((a, i) => roster.slice(i + 1).map((b) => [a, b]))]) {
    const h = game({ v, web: sel });
    for (const m of h.matchAll(/data-line="(\w+)"/g)) assert.ok(ids.has(m[1]!), `${sel}: ${m[1]} is the player's own`);
    for (const t of thoughts) assert.ok(!h.includes(t), `${sel}: a thought reached the web`);
  }
  const lupo = heardAndSaw(v, ["Lupo"], F);
  assert.ok(lupo.heard.length > 0 && lupo.heard.every((l) => l.speaker === "Lupo"));
  assert.ok(lupo.heard.every((l, i) => i === 0 || l.seq < lupo.heard[i - 1]!.seq), "newest first");
  assert.ok(lupo.saw.every((s) => s.kind === "death" || s.line.about?.includes("Lupo")));
  const pair = heardAndSaw(v, [F, "Lupo"], F);
  assert.ok(pair.heard.every((l) => [F, "Lupo"].includes(l.addressee!)));
  void at;
});

test("notes in the web viewer: on a guest, on a pair (drawn dashed), or free; all of them grouped, each can become a conclusion", async () => {
  const { at } = await playedLog();
  const base = at["speak:colloquio"]!;
  const notes: Ev[] = [
    { seq: 1e6, type: "note", id: "N1", turn: 1, guests: [], text: "Something is off tonight." },
    { seq: 1e6 + 1, type: "note", id: "N2", turn: 1, guests: ["Lupo"], text: "Lupo watches the door." },
    { seq: 1e6 + 2, type: "note", id: "N3", turn: 2, guests: ["Lupo", "Giorgia Pazzi"], text: "Those two talk too often." },
  ];
  const v = derive([...base, ...notes]);
  assert.deepEqual(v.notes.map((n) => n.id), ["N1", "N2", "N3"]);
  assert.equal((game({ v, web: [] }).match(/class="edge note-line/g) ?? []).length, 1, "the pair's dashed line");
  const mine = game({ v, web: ["Lupo"], webTab: "notes" });
  assert.match(mine, /Lupo watches the door\./);
  assert.doesNotMatch(mine, /Something is off/, "only the notes on this selection");
  const all = game({ v, web: [], webTab: "all" });
  assert.deepEqual(missingWords(all), []);
  assert.deepEqual([...all.matchAll(/class="note-text"[^>]*>([^<]+)</g)].map((m) => m[1]), ["Those two talk too often.", "Lupo watches the door.", "Something is off tonight."], "newest first");
  assert.equal((all.match(/data-hint="conclude"/g) ?? []).length, 3);
  assert.ok(v.commands.some((c) => c.action === "conclude"), "the conclusion's command, found by its action");
});

test("Il Notaio's hint: the moment's template at every wait, under the stream, styled apart from his notes", async () => {
  const { at, log } = await playedLog();
  const expect: Record<string, string> = { move: "move", seat: "seat", midnight: "midnight", "speak:colloquio": "colloquio" };
  for (const [k, l] of Object.entries(at)) {
    const v = derive(l);
    const m = hintMoment(v, F);
    const want = expect[k] ?? (k.startsWith("speak:colloquio") ? "colloquio" : null);
    if (want) assert.equal(m.key, want, k);
    else assert.ok(["mingling", "answering"].includes(m.key), `${k}: ${m.key}`);
    const h = game({ v });
    assert.match(h, new RegExp(`class="notaio-hint"[\\s\\S]*data-moment="${m.key}"`), k);
    assert.ok(h.includes(notaioHint(m.key, m.values).replace(/'/g, "&#x27;")), `${k}: the template, filled`);
    assert.ok(h.indexOf('class="notaio-hint"') > h.indexOf('class="stream"') && h.indexOf('class="notaio-hint"') < h.indexOf('class="input'), `${k}: docked under the stream`);
  }
  const refused = derive([...at.move!.filter((e) => e.type !== "request"), { seq: 1e6, type: "refusal", reason: "No.", input: "/fly" }]);
  assert.equal(hintMoment(refused, F).key, "refused");
  const dead = derive([...log.filter((e) => e.type !== "result"), { seq: 1e6, type: "death", name: F, you: true }]);
  assert.equal(hintMoment(dead, F).key, "dead");
  for (const k of ["mingling", "answering", "colloquio", "move", "seat", "midnight", "council", "ballot", "refused", "dead"]) assert.ok(!notaioHint(k, { name: "X", other: "Y" }).startsWith("hints."), k);
});

// ---- CC-20261113-01 (#88): web labels, no factions, the left column's order, steady sizes ----------------

test("the web's layout takes a missing or empty factions list (an older server's start information)", () => {
  for (const factions of [undefined, [] as string[], ["no such faction"]]) {
    const at = webLayout(info.roster, factions);
    assert.equal(at.size, info.roster.length);
    for (const p of at.values()) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
  }
  // Without factions, the roster's own order around the circle.
  assert.deepEqual([...webLayout(info.roster).keys()], info.roster.map((r) => r.name));
});

test("the web's names are drawn after every line and circle, on a halo, so no line crosses them", async () => {
  const { at } = await playedLog();
  const page = game({ v: derive(at["speak:capannello"]!), web: [F] });
  const h = page.slice(page.indexOf('class="web-diagram"'), page.indexOf("</svg>", page.indexOf('class="web-diagram"')));
  const names = [...h.matchAll(/class="node-name/g)].map((m) => m.index!);
  assert.equal(names.length, info.roster.length);
  const lastLine = Math.max(...[...h.matchAll(/<line /g)].map((m) => m.index!));
  const lastCircle = Math.max(...[...h.matchAll(/<circle /g)].map((m) => m.index!));
  assert.ok(Math.min(...names) > Math.max(lastLine, lastCircle), "every name after every line and circle");
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.node-name \{[^}]*paint-order: stroke;[^}]*stroke: var\(--surface\)/, "a halo in the panel's colour");
});

test("the left column (TD v0.45): the sheet, then the three decks, then the errand, then who's here; no button for the web", async () => {
  const { at } = await playedLog();
  const h = game({ v: derive(at["speak:capannello"]!) });
  const left = h.slice(h.indexOf('class="side left"'), h.indexOf('class="centre"'));
  const order = ['data-hint="sheet"', 'data-hint="briefing"', 'data-hint="city"', 'class="errand"', 'data-hint="here"'].map((k) => left.indexOf(k));
  assert.ok(order.every((i) => i >= 0), String(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(!left.includes('data-hint="web"'), "the Web of Secrets is at the bottom, not here");
});

test("steady sizes: the sheet, the prompt, and the example are laid out before the first state, from theme tokens", () => {
  const h = game({ v: derive([]) });
  assert.match(h, /<dl class="facts">/, "the sheet's facts before any state");
  assert.match(h, /class="prompt"/, "the prompt's line");
  assert.match(h, /class="example muted"/, "the example's line");
  const css = readFileSync("web/src/app.css", "utf8");
  for (const [sel, token] of [[".conv-head", "--head-height"], [".input", "--input-box-height"], [".hint-text", "--hint-text-height"], [".prompt", "--line-sm"], [".example", "--line-sm"]])
    assert.match(css, new RegExp(`\\${sel} \\{[^}]*min-height: var\\(${token}\\)`), sel);
});

// ---- CC-20261113-02 (#90): the Web of Secrets, the track, the right panel (TD v0.44–v0.46) -----------------

/** A hand-made log in one group: `state` events and lines, numbered in order. */
function groupLog(steps: ({ present: string[]; kind?: string; other?: string } | { speaker?: string; you?: boolean; addressee?: string | null; conv?: string })[]): Ev[] {
  return steps.map((x, i) =>
    "present" in x
      ? { seq: i + 1, type: "state", state: { phaseLabel: "p", conversation: x.kind === "colloquio" ? { kind: "colloquio", other: x.other } : x.kind === "gathering" ? { kind: "gathering" } : { kind: "capannello", others: x.present }, present: x.present, livingOthers: [], florins: 0, pensionsHeld: 0, withdrawalCount: 0 }, commands: [] }
      : { seq: i + 1, type: "line", id: `L${i}`, turn: 1, conversation: x.conv ?? "C1", speaker: x.you ? F : x.speaker, addressee: x.addressee ?? null, text: "…", you: !!x.you },
  );
}

test("the talking-with card (TD v0.46): the other guest in a Colloquio; in a group, the last address either way, until replaced or someone leaves", () => {
  const G = "Giorgia Pazzi";
  const at = (steps: Parameters<typeof groupLog>[0]) => talkingWith(derive(groupLog(steps)), F);
  const group = { present: ["Lupo", G] };
  assert.equal(at([group, { speaker: "Lupo" }, { speaker: G }]), null, "a group's last speaker isn't it: no one has his ear");
  assert.equal(at([group, { speaker: "Lupo", addressee: F }, { speaker: G }]), "Lupo", "Lupo addressed him; Giorgia's line to no one doesn't change it");
  assert.equal(at([group, { speaker: "Lupo", addressee: F }, { you: true, addressee: G }]), G, "his own address replaces it");
  assert.equal(at([group, { you: true, addressee: G }, { you: true }]), G, "his own line to no one doesn't change it");
  assert.equal(at([group, { speaker: "Lupo", addressee: G }]), null, "an address between two others isn't his");
  assert.equal(at([group, { speaker: "Lupo", addressee: F }, { present: [G] }]), null, "Lupo left the group");
  assert.equal(at([group, { speaker: "Lupo", addressee: F }, { present: [G] }, group]), null, "and coming back doesn't bring it back");
  assert.equal(at([group, { speaker: "Lupo", addressee: F }, { present: ["Lupo"] }, { conv: "C2", speaker: "Lupo" }]), null, "he left the group: a new stretch");
  assert.equal(at([{ present: ["Lupo"], kind: "colloquio", other: "Lupo" }]), "Lupo", "a Colloquio: the other guest, always");
  assert.equal(at([{ present: ["Lupo", G], kind: "gathering" }, { speaker: "Lupo", addressee: F }]), null, "midnight: no one");
});

test("the right panel: the live talking-with card, empty when no one has his ear; a selected guest's card over it, with a close", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:colloquio"]!);
  const other = (v.state!.conversation as { other: string }).other;
  const h = game({ v });
  assert.match(h, new RegExp(`class="person talk" data-guest="${other.replace(/'/g, "&#x27;")}"`), "a Colloquio: the other guest");
  assert.doesNotMatch(h, /class="person look"/);
  const looking = game({ v, selected: { kind: "guest", name: "Lupo" } });
  assert.match(looking, /class="person look" data-guest="Lupo"/);
  assert.match(looking, /data-hint="deselect"/, "a close that deselects");
  assert.match(looking, /<button class="person-head"[^>]*data-hint="backToTalk"/, "the talking card's header, one click back");
  // A group where no one has addressed him: the card stays, empty, with its label and a quiet line.
  const quiet = derive(groupLog([{ present: ["Lupo", "Giorgia Pazzi"] }, { speaker: "Lupo" }]));
  const q = game({ v: { ...quiet, sheet: v.sheet } });
  assert.match(q, /class="person talk">/);
  assert.match(q, /No one has your ear/);
  assert.equal((q.match(/class="tokens"/g) ?? []).length, 1, "the group's tokens, whether or not the card is filled");
  assert.match(q, /data-hint="resize"/, "a handle to resize it");
});

test("the evening's track: past filled, now highlighted, the rest outlined, each named on hover", async () => {
  const stages = ["A", "B", "C", "D"];
  assert.deepEqual(trackMarks(stages, "C").map((m) => m.at), ["past", "past", "now", "next"]);
  assert.deepEqual(trackMarks(stages, undefined).map((m) => m.at), ["next", "next", "next", "next"]);
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  assert.ok(v.sheet!.track!.includes(v.state!.phaseLabel));
  const h = game({ v });
  assert.equal((h.match(/class="mark (past|now|next)"/g) ?? []).length, v.sheet!.track!.length);
  assert.equal((h.match(/class="mark now"/g) ?? []).length, 1);
  assert.match(h, /data-hint="trackNow"/);
});

test("the Web of Secrets: a bar always there, a key of the six types that highlights one, faction names, and Il Notaio's box", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const shut = game({ v });
  assert.match(shut, /class="web-dock"/, "always on the page");
  assert.match(shut, /class="web-bar" aria-expanded="false"[^>]*>.*The Web of Secrets/);
  assert.match(shut, /class="web" inert=""/, "down: nothing in it takes focus");
  const h = game({ v, web: ["Lupo"] });
  assert.match(h, /class="web-dock open"/);
  assert.deepEqual([...h.matchAll(/class="key-type[^"]*"[^>]*data-type="(\w+)"/g)].map((m) => m[1]), ["romance", "kin", "service", "alliance", "rivalry", "money"]);
  const lit = game({ v, web: [], keyType: "romance" });
  const edges = [...lit.matchAll(/class="edge rel-(\w+)[^"]*?( key-on| key-off)"/g)];
  assert.ok(edges.length > 0 && edges.every((m) => (m[1] === "romance") === (m[2] === " key-on")), "the type lit, the rest dimmed");
  assert.equal(factionLabels(info.roster, info.factions, webLayout(info.roster, info.factions)).length, new Set(info.roster.map((r) => r.faction)).size);
  assert.equal((h.match(/class="faction-label"/g) ?? []).length, new Set(info.roster.map((r) => r.faction)).size, "each faction named once");
  assert.match(h, /data-reading="waiting"/, "a selection, and no reading yet: he's considering");
  // A reading for this selection and record: shown; a tally in its place when there's none.
  const withReading = (text: string | null): View => {
    const r = derive([...at["speak:capannello"]!, { seq: 1e7, type: "reading", guests: ["Lupo"], upTo: 0, text, tally: "Tally." }]);
    return { ...r, readings: r.readings.map((x) => ({ ...x, upTo: Math.max(0, ...heardAndSaw(r, ["Lupo"], F).heard.map((l) => l.seq), ...heardAndSaw(r, ["Lupo"], F).saw.map((s) => (s.kind === "line" ? s.line.seq : s.seq))) })) };
  };
  assert.ok(readingFor(withReading("He keeps the door."), ["Lupo"], F));
  assert.match(game({ v: withReading("He keeps the door."), web: ["Lupo"] }), /data-reading="reading">He keeps the door\.</);
  assert.match(game({ v: withReading(null), web: ["Lupo"] }), /data-reading="tally">Tally\.</);
  assert.deepEqual(missingWords(h), []);
});

// ---- CC-20261113-04 (#95): the room (TD v0.45) -----------------------------------------------------------

test("the room: your own group marked, by name; every other group as overlapping tokens and each private pair joined, from the state's room", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  assert.ok(v.state!.room, "the default TD (v0.45) sends the room in open play");
  const h = game({ v });
  const left = h.slice(h.indexOf('class="side left"'), h.indexOf('class="centre"'));
  assert.match(left, /class="cluster mine" data-cluster="mine"/);
  const room = v.state!.room!;
  assert.equal((left.match(/data-cluster="group"/g) ?? []).length, room.groups.length);
  assert.equal((left.match(/data-cluster="private"/g) ?? []).length, room.colloquios.length);
  assert.equal((left.match(/class="token( selected)?"/g) ?? []).length, [...room.groups, ...room.colloquios].flat().length, "a token for every other guest in the room");
  assert.equal((left.match(/class="joint"/g) ?? []).length, room.colloquios.length, "each pair joined");
  // A hand-made room: two groups and a pair.
  const made = { ...v, state: { ...v.state!, room: { groups: [["Lupo", "Fra Tommaso"], ["Sister Beatrice"]], colloquios: [["Piero de' Medici", "Clarice Orsini"]] } } };
  const m = game({ v: made, selected: { kind: "guest", name: "Lupo" } });
  assert.equal((m.match(/data-cluster="group"/g) ?? []).length, 2);
  assert.match(m, /class="token selected" aria-label="Lupo"/, "a selected guest's token is marked");
  // Midnight: no room, only who's with you.
  const mid = derive(at.midnight!);
  assert.equal(mid.state!.room, undefined);
  assert.doesNotMatch(game({ v: mid }), /data-cluster="(group|private)"/);
});

// ---- CC-20261114-04 (#102): the errand's extra act on the screen (TD v0.47) -------------------------------

const PLAYER = JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { screen: Record<string, any> };
const NOTAIO = JSON.parse(readFileSync("setting/florence-1492/notaio.json", "utf8")) as { hints: Record<string, string> };
const esc = (t: string) => t.replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
/** A view whose state has the run's flag (and the check's result), on a track whose third stage is the errand's deadline. */
function flagged(v: View, o: { plotReward: boolean; plotStatus?: string; phase?: string; deadline?: string | null }): View {
  const track = ["The arrival", "The first round", "The last council", "Midnight"];
  return {
    ...v,
    pending: null,
    sheet: { ...v.sheet!, track, errandDeadline: o.deadline === undefined ? "The last council" : o.deadline },
    state: { ...v.state!, plotReward: o.plotReward, ...(o.plotStatus && { plotStatus: o.plotStatus }), phaseLabel: o.phase ?? "The arrival", conversation: { kind: "capannello", others: [] } },
  };
}
const errandCard = (h: string) => h.slice(h.indexOf('class="errand"'), h.indexOf("</div></div>", h.indexOf('class="errand-text"')) + 200);

test("the errand card says what the errand earns: the reward with plot_reward on, none with it off, and {plot_status} after the check", async () => {
  const { at, log } = await playedLog();
  const base = derive(at["speak:capannello"]!);
  // The mini-game runs with plot_reward off, and the flag reaches the screen with every state.
  const states = log.filter((e) => e.type === "state");
  assert.ok(states.length > 0 && states.every((e) => (e.state as { plotReward?: unknown }).plotReward === false));
  assert.ok(states.every((e) => !("plotStatus" in (e.state as object))), "no check, so no {plot_status}");
  const words = PLAYER.screen.errandCard;
  const cases: { name: string; v: View; kind: string; text: string; hover: string }[] = [
    { name: "off (the mini-game)", v: base, kind: "noReward", text: words.noReward, hover: "errandNoReward" },
    { name: "on, before the check", v: flagged(base, { plotReward: true }), kind: "reward", text: words.reward, hover: "errandReward" },
    { name: "after the check", v: flagged(base, { plotReward: true, plotStatus: "You finished your errand in time: you have one extra act at midnight. No one else knows." }), kind: "status", text: "You finished your errand in time: you have one extra act at midnight. No one else knows.", hover: "errand" },
  ];
  for (const c of cases) {
    assert.equal(errandLine(c.v.state)!.kind, c.kind, c.name);
    const h = game({ v: c.v });
    assert.deepEqual(missingWords(h), [], c.name);
    const card = errandCard(h);
    assert.match(card, new RegExp(`data-hint="${c.hover}"`), `${c.name}: the card's hover`);
    assert.ok(card.includes(esc(c.text)), `${c.name}: the line, from player.json`);
    if (c.kind === "status") assert.ok(!card.includes("errand-reward"), "the check's result replaces the line");
    else assert.match(card, new RegExp(`class="errand-reward" data-reward="${c.kind}"`), c.name);
  }
  // The hovers say the same as the lines.
  assert.match(PLAYER.screen.hints.errandReward, /last council before midnight.*extra act/);
  assert.match(PLAYER.screen.hints.errandNoReward, /no extra act/);
  assert.equal(errandLine(null), null, "nothing before the first state");
});

test("the track's errand mark: on the deadline stage with plot_reward on, with its hover; nothing with it off", async () => {
  const { at } = await playedLog();
  const base = derive(at["speak:capannello"]!);
  assert.equal(base.sheet!.errandDeadline, null, "the mini-game's schedule has no council");
  assert.equal(errandDeadline(base), null);
  assert.doesNotMatch(game({ v: base }), /errand-mark/);
  assert.deepEqual(trackMarks(["A", "B", "C"], "A", "B").map((m) => m.deadline), [false, true, false]);
  const on = flagged(base, { plotReward: true });
  assert.equal(errandDeadline(on), "The last council");
  const h = game({ v: on });
  assert.equal((h.match(/class="errand-mark"/g) ?? []).length, 1);
  assert.match(h, /class="mark next deadline" aria-label="The last council"[^>]*><span class="errand-mark" role="img" aria-label="Your errand&#x27;s deadline"[^>]*data-hint="trackDeadline"/);
  assert.equal(PLAYER.screen.hints.trackDeadline, "Your errand's deadline: finish it before this for an extra act at midnight.");
  assert.doesNotMatch(game({ v: flagged(base, { plotReward: false }) }), /errand-mark/, "a deadline but the flag off");
  assert.doesNotMatch(game({ v: flagged(base, { plotReward: true, deadline: "Not a stage" }) }), /errand-mark/, "a deadline the track doesn't have");
});

test("Il Notaio's errand hint: at the start of the last round before the deadline, done or not, and only with plot_reward on", async () => {
  const { at } = await playedLog();
  const base = derive(at["speak:capannello"]!);
  const key = (o: Parameters<typeof flagged>[1]) => hintMoment(flagged(base, o), F).key;
  assert.equal(key({ plotReward: true, phase: "The first round" }), "errandDeadline", "the last round before the deadline");
  assert.equal(key({ plotReward: true, phase: "The first round", plotStatus: "You finished your errand in time: you have one extra act at midnight. No one else knows." }), "errandDeadline", "the same whether or not it's done");
  assert.equal(key({ plotReward: true, phase: "The arrival" }), "mingling", "not before");
  assert.equal(key({ plotReward: true, phase: "The last council" }), "mingling", "not at the deadline");
  assert.equal(key({ plotReward: false, phase: "The first round" }), "mingling", "not with the flag off");
  assert.equal(key({ plotReward: true, phase: "The arrival", deadline: "The arrival" }), "mingling", "no round before a first-stage deadline");
  // A wait the moment asks for still comes first.
  assert.equal(hintMoment({ ...flagged(base, { plotReward: true, phase: "The first round" }), pending: derive(at.move!).pending }, F).key, "move");
  const h = game({ v: flagged(base, { plotReward: true, phase: "The first round" }) });
  assert.match(h, /data-moment="errandDeadline"/);
  assert.ok(h.includes(esc(NOTAIO.hints.errandDeadline!)), "the template, from notaio.json");
  assert.equal(notaioHint("errandDeadline"), NOTAIO.hints.errandDeadline);
});

/** A mini-game whose player earned the extra act: only a test says so, since the mini-game runs with plot_reward off. */
class Rewarded extends MiniGame {
  protected override extraActEarned(c: CharacterName): boolean {
    return c === F;
  }
}

test("the midnight card: the extra act is its own optional row when the errand earned it, checked as block 9e's extra", async () => {
  // The mini-game: no extra act, so no row, and the answer and the record as ever.
  const plain = await playedLog();
  const req = derive(plain.at.midnight!).pending!;
  assert.equal(req.options.extra, false, "the request says it wasn't earned");
  assert.doesNotMatch(game({ v: derive(plain.at.midnight!) }), /act-extra/);
  const mine = plain.game.murderActs.find((a) => (a as { character: string }).character === F) as Record<string, unknown>;
  assert.ok(mine && !("extra" in mine), "no extra in the record");
  // Earned: the row, labelled, with the setting pack's words and an explanation.
  const tries: unknown[] = [];
  const earned = await playedLog({
    Game: Rewarded,
    midnight: (guests, n) => {
      const a = { type: "watch", target: guests[0] };
      const v = [
        { acts: [a], extra: { type: "guard", target: guests[0] } }, // the same guest
        { acts: [a], extra: { type: "guard", target: F } }, // guarding yourself
        { acts: [a], extra: { type: "kill", target: guests[1] } },
      ][n];
      tries.push(v);
      return v;
    },
  });
  const v = derive(earned.at.midnight!);
  assert.equal(v.pending!.options.extra, true);
  const h = game({ v });
  assert.deepEqual(missingWords(h), []);
  const row = h.slice(h.indexOf('class="act-extra"'));
  assert.ok(h.includes('class="act-extra"') && row.includes(esc(PLAYER.screen.midnight.extra)), "labelled from player.json");
  assert.equal(PLAYER.screen.midnight.extra, "Your extra act (for your errand)");
  assert.match(h, /class="act-extra"[^>]*data-hint="midnightExtra"/);
  assert.equal((h.match(/<select/g) ?? []).length, 4, "the act and the extra act, each a kind and a guest");
  // The game checks it as an AI guest's extra: a different guest, and no guarding yourself.
  assert.equal(tries.length, 3);
  const refusals = earned.log.filter((e) => e.type === "refusal").map((e) => e.reason);
  assert.ok(refusals.includes(PLAYER_REFUSAL("same_guest")) && refusals.includes(PLAYER_REFUSAL("self")), refusals.join(" | "));
  const act = earned.game.murderActs.find((a) => (a as { character: string }).character === F) as { acts: unknown[]; extra: { type: string; target: string } };
  assert.equal(act.acts.length, 1);
  assert.equal(act.extra.type, "kill", "kept apart from the standard act");
  const ev = earned.game.events.find((e) => e.type === "murder-act" && (e as { character?: string }).character === F) as unknown as { extra?: unknown };
  assert.deepEqual(ev.extra, act.extra);
});
const PLAYER_REFUSAL = (k: string) => (JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { refusals: { acts: Record<string, string> } }).refusals.acts[k]!;

test("the extra act's looks are theme tokens: the card's accent, in light and dark, and the mark's size", () => {
  const theme = readFileSync("web/theme.css", "utf8");
  const css = readFileSync("web/src/app.css", "utf8");
  for (const sel of [".errand-reward", ".track .errand-mark", ".act-extra"]) assert.match(css, new RegExp(`${sel.replace(/\./g, "\\.")} \\{[^}]*var\\(--errand-accent\\)`), sel);
  assert.match(css, /\.track \.errand-mark \{[^}]*var\(--errand-mark-size\)/);
  assert.equal((theme.match(/--errand-accent:/g) ?? []).length, 2, "light and dark");
  assert.match(theme, /--errand-mark-size:/);
});
