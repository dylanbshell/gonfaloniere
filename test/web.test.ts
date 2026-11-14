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
import { glossary, screenInfo } from "../src/minigame/screen-info.ts";
import { rulesText } from "../src/prompt/assemble.ts";
import { settingPack } from "../src/setting/pack.ts";
import { GameView, Opening } from "../web/src/App.tsx";
import type { Ev } from "../web/src/connection.ts";
import { canDo, canSpeak, openMenu, trigger, withMention } from "../web/src/input.ts";
import { NO_SELECTION, appearsIn, briefingCards, chatGuest, cityCards, cityList, curve, derive, factionArcs, placeholderExample, preview, selectBack, selectInChat, selectInWeb, selectLore, earlierThisStage, errandDeadline, errandLine, factionLabels, heardAndSaw, hintMoment, lineStages, loreParts, readingFor, roomOf, rulesCards, stageRuns, stagesWith, talkingWith, trackMarks, webLayout, glossaryList, lineParts, midnightLine, notesFor, rulesSectionFor, type LoreEntry, type View } from "../web/src/model.ts";
import { notaioHint, setInfo, type StartInfo } from "../web/src/words.ts";
import { fakeCaller, fakeDocs, fakeSettings } from "./fixtures/fake-game.ts";

const F = "Francesco Pazzi";
const files = (dir: string, ext: RegExp) => readdirSync(dir).filter((f) => ext.test(f)).map((f) => join(dir, f));
const noComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/**
 * A fake game as Francesco, answered in process; the log at every request, with which kind was open.
 * `Game` plays a subclass (one that earns the extra act); `midnight` answers each midnight request in turn.
 */
async function playedLog(opts: { Game?: typeof MiniGame; midnight?: (guests: string[], n: number) => unknown; tap?: (ev: Ev, game: MiniGame) => void } = {}): Promise<{ log: Ev[]; at: Record<string, Ev[]>; game: MiniGame }> {
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
      opts.tap?.(ev, game);
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

const info = { ...screenInfo([F], castBriefings(fakeDocs), { tunables: fakeDocs.tunables, minigame: true }), started: null, ws: null } as StartInfo;
setInfo(info);
const html = (el: ReturnType<typeof createElement>) => renderToString(el);
/** Words the screen shows but couldn't find in player.json come out as their keys. */
const missingWords = (h: string) => h.match(/\bscreen\.[\w.]+|\b(?:refusals|commands|hints)\.[\w.]+|undefined|\[object Object\]/g) ?? [];

test("the opening's choice (Interface v0.7): one card, for Francesco, with his portrait, name, faction, and public subtitle", () => {
  const h = html(createElement(Opening, { onStart: () => {}, written: true }));
  assert.deepEqual(missingWords(h), []);
  assert.equal(info.playable.length, 1);
  const card = h.slice(h.indexOf('class="start-card"'));
  const g = info.roster.find((r) => r.name === F)!;
  assert.match(card, /class="portrait large"/);
  assert.ok(card.includes(`<div class="name">${F}</div><div class="muted">${g.faction}</div><div class="muted subtitle">${esc(g.subtitle)}</div>`), "name, faction, subtitle");
  assert.match(card, /data-hint="play"/);
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
  return { v, at, log };
}

/** The log at the latest request where this stage already has an earlier conversation, folded under Earlier this stage. */
async function earlierView() {
  const { log } = await playedLog();
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!;
    if (e.type !== "request" || e.closed || e.kind !== "speak") continue;
    const v = derive(log.slice(0, i + 1));
    if (earlierThisStage(v).length > 0) return v;
  }
  throw new Error("no request with an earlier conversation in its stage");
}

test("only the current conversation is open: this stage's earlier ones are one line each under Earlier this stage, and earlier stages aren't there", async () => {
  const v = await earlierView();
  const earlier = earlierThisStage(v);
  const now = v.state!.phaseLabel;
  assert.ok(earlier.every((r) => r.stage === now), "only this stage's");
  const h = html(createElement(GameView, { me: F, v, send: () => {}, status: "open" }));
  assert.deepEqual(missingWords(h), []);
  assert.match(h, /class="earlier"/);
  assert.ok(h.includes(`>${PLAYER.screen.earlier.title}<`), "Earlier this stage");
  assert.equal((h.match(/class="earlier-line"/g) ?? []).length, earlier.length, "one line per earlier conversation in this stage");
  assert.ok(h.includes('aria-expanded="false"'), "collapsed until clicked");
  const id = (l: { id: string }) => `data-line="${l.id}"`;
  const current = new Set(v.segments.at(-1)!.lines.map((l) => l.id));
  for (const l of v.stream.filter((x) => !current.has(x.id))) assert.ok(!h.includes(id(l)), `an earlier line is folded away or in its stage: ${l.id}`);
  for (const l of v.segments.at(-1)!.lines) assert.ok(h.includes(id(l)), `a current line is shown: ${l.id}`);
  // An earlier stage's conversations aren't folded here: they're in the bar.
  const before = v.runs.filter((r) => r.stage !== now && !current.has(r.lines[0]!.id));
  assert.ok(before.length > 0, "the player was in conversations in earlier stages");
  assert.equal(earlier.filter((r) => before.includes(r)).length, 0);
});

test("the errand card: pinned under the sheet, with the briefing's errand section", async () => {
  const errand = errandText(castBriefings(fakeDocs)[F]!);
  assert.ok(errand.length > 40 && !errand.includes("**" + "\n"), errand);
  const { v } = await lateView();
  assert.equal(v.sheet!.errand, errand);
  const h = html(createElement(GameView, { me: F, v, send: () => {}, status: "open" }));
  const card = h.indexOf('class="errand"');
  assert.ok(card > h.indexOf('class="facts"') && card < h.indexOf('class="room'), "between the sheet and the places");
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
  const terms = [...pack.roster.flatMap((r) => [r.name, ...r.aliases]), ...pack.factions.map((x) => x.name), ...(pack.places ?? []), pack.currency.singular, pack.currency.plural, "Capannello", "Colloquio", "Notaio"];
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
  // Your briefing stays a deck: tabs along the top, one per card; the first card open; a back control; Your past when lore is on.
  const past = { ...v, sheet: { ...v.sheet!, past: [{ id: "P1", title: "The garden wall", text: "You climbed it once." }] } };
  const modal = (h: string) => h.slice(h.indexOf('class="overlay"'));
  const b = game({ v: past, deck: "briefing" });
  assert.deepEqual(missingWords(b), []);
  // The deck's own tabs (the Web of Secrets, always on the page, has tabs of its own).
  assert.equal((modal(b).match(/class="tab( on)?"/g) ?? []).length, cards.length + 1, "a tab per card");
  assert.match(b, /class="deck-card"[^>]*data-hint="deckCard"/, "the card swipes on");
  assert.match(b, /data-hint="deckBack"/);
  assert.match(b, /data-hint="deckTab">Your past</, "Your past, last");
  // Interface v0.5: the rules are one button per section, and an open section fills the modal with its ×.
  const r = modal(game({ v, deck: "rules" }));
  assert.deepEqual(missingWords(r), []);
  assert.deepEqual([...r.matchAll(/<button class="rules-section" data-section="\d+"[^>]*data-hint="rulesSection">([^<]*)</g)].map((m) => m[1]), rules.map((c) => c.title.replace(/'/g, "&#x27;")), "a button per section, in order");
  assert.doesNotMatch(r, /class="tab|deck-card/, "no deck");
  // The city is a list: a row per public entry, with its title and a one-line preview, under subject headers.
  const c = modal(game({ v: withLore(v), deck: "city" }));
  assert.deepEqual(missingWords(c), []);
  assert.deepEqual([...c.matchAll(/class="city-subject">([^<]*)</g)].map((m) => m[1]), ["History", "Places", "Other"], "The city's subjects head its list");
  assert.deepEqual([...c.matchAll(/class="city-row" data-lore="(\w+)"[^>]*data-hint="cityRow"><span class="city-title">([^<]*)<\/span><span class="city-preview muted">([^<]*)</g)].map((m) => [m[1], m[2], m[3]]), [["L2", "1478", "The year the Pazzi rose."], ["L1", "San Frediano", "A church across the river."], ["L3", "The Signoria", "The city&#x27;s government."]]);
  assert.deepEqual(cityList(LORE).map((g) => [g.subject, g.entries.map((e) => e.id)]), [["History", ["L2"]], ["Places", ["L1"]], [null, ["L3"]]]);
  assert.equal(preview({ ...LORE[0]!, text: "\nFirst line.\nSecond line." }), "First line.");
  // An empty city, on purpose: the repo's lore file holds public lore (#130), so this view sets its own, as withLore does.
  assert.match(game({ v: { ...v, sheet: { ...v.sheet!, lore: [] } }, deck: "city" }), /class="deck-card empty"/, "an empty city says so");
});

test("selection: one guest at a time, on the right, with their lines highlighted and their earlier conversations open", async () => {
  const v = await earlierView();
  const earlier = earlierThisStage(v);
  const name = v.stream.find((l) => l.item === "line" && !l.you && earlier.some((s) => appearsIn(s, l.speaker!)))!.speaker!;
  const h = game({ v, selected: { kind: "guest", name } });
  assert.deepEqual(missingWords(h), []);
  assert.ok(h.includes(`data-guest="${name.replace(/'/g, "&#x27;")}"`), "their card on the right");
  const opened = (h.match(/class="earlier-line" aria-expanded="true"/g) ?? []).length;
  assert.equal(opened, earlier.filter((s) => appearsIn(s, name)).length, "the earlier conversations they were in, open");
  // In the chat (the web's column below holds the same lines, now that the selection is shared).
  const chat = h.slice(0, h.indexOf('class="web-dock'));
  for (const l of v.stream.filter((x) => x.item === "line" && x.speaker === name && chat.includes(`data-line="${x.id}"`))) assert.match(chat, new RegExp(`class="ln speech[^"]* hl" data-line="${l.id}"`), `${l.id} highlighted`);
  // Interface v0.6: one selection, shared: the web's bar and its ring show the guest too.
  const esc = (x: string) => x.replace(/'/g, "&#x27;");
  assert.match(h, new RegExp(`class="web-bar-sel">${esc(name)}<`), "on the web's bar");
  assert.match(h, new RegExp(`data-guest="${esc(name)}" class="node picked`), "selected in the web");
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

test("notes in the web viewer: on a guest, on a pair (drawn dashed), or free; all of them grouped; a guest's or a pair's can become a conclusion", async () => {
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
  // Interface v0.7: one Notes tab. The writing box on top, then one list, newest first, filtered by the selection.
  const texts = (h: string) => [...h.matchAll(/class="note-text"[^>]*>([^<]+)</g)].map((m) => m[1]);
  const headings = (h: string) => [...h.matchAll(/class="label note-heading"><(?:button|span) class="note-about"[^>]*>([^<]+)</g)].map((m) => m[1]);
  const mine = game({ v, web: ["Lupo"], webTab: "notes" });
  assert.deepEqual(texts(mine), ["Those two talk too often.", "Lupo watches the door."], "one guest: theirs and any pair's with them, newest first");
  assert.doesNotMatch(mine, /Something is off/, "not the free note");
  assert.deepEqual(headings(mine), [], "one list, no headings");
  assert.match(mine, /<button class="note-about"[^>]*data-hint="noteItem">Lupo and Giorgia Pazzi</, "the pair's note names its pair, which selects them");
  const pairNotes = game({ v, web: ["Giorgia Pazzi", "Lupo"], webTab: "notes" });
  assert.deepEqual(headings(pairNotes), ["Giorgia Pazzi and Lupo", "Lupo"], "a pair: the pair's notes first, then each of the two's, under small headings");
  assert.deepEqual(texts(pairNotes), ["Those two talk too often.", "Lupo watches the door."]);
  const all = game({ v, web: [], webTab: "notes" });
  assert.deepEqual(missingWords(all), []);
  assert.deepEqual(texts(all), ["Those two talk too often.", "Lupo watches the door.", "Something is off tonight."], "no one selected: every note, newest first");
  assert.deepEqual(headings(all), ["Lupo and Giorgia Pazzi", "Lupo", PLAYER.screen.web.free], "grouped by guest and pair, free notes too");
  assert.ok(!all.includes("<select"), "no filter");
  assert.equal((all.match(/class="tab( on)?"/g) ?? []).length, 2, "two tabs: What you heard and saw, and Notes");
  assert.ok(!("all" in PLAYER.screen.web) && !("filter" in PLAYER.screen.web) && !("allTab" in PLAYER.screen.hints), "no All your notes, nor its filter");
  assert.deepEqual(notesFor(v.notes, []).map((x) => x.about), [["Lupo", "Giorgia Pazzi"], ["Lupo"], []]);
  assert.deepEqual(notesFor(v.notes, ["Giorgia Pazzi"]).map((x) => x.notes.map((n) => n.id)), [["N3"]]);
  assert.deepEqual(notesFor(v.notes, ["Lupo", "Contessa Isabella"]).map((x) => x.about), [["Lupo"]], "empty sections are left out");
  // Interface v0.3: only notes on a guest or a pair get "This is my conclusion"; the free note has none.
  const buttons = [...all.matchAll(/<li class="note">(.*?)<\/li>/g)].map((m) => [m[1]!.match(/class="note-text"[^>]*>([^<]+)</)![1], /data-hint="conclude"/.test(m[1]!)]);
  assert.deepEqual(buttons, [["Those two talk too often.", true], ["Lupo watches the door.", true], ["Something is off tonight.", false]]);
  assert.ok(v.commands.some((c) => c.action === "conclude"), "the conclusion's command, found by its action");
});

test("the conclusion button (Interface v0.4): disabled while a decision card waits, with a hover saying why; disabled for a dead player", async () => {
  const { at } = await playedLog();
  const note: Ev = { seq: 1e6, type: "note", id: "N1", turn: 1, guests: ["Lupo"], text: "Lupo watches the door." };
  const button = (h: string) => h.match(/<button class="secondary small conclude"[^>]*>/)?.[0] ?? "";
  // Speaking: the box is open, so the button is live, with its usual hover.
  const speaking = button(game({ v: derive([...at["speak:colloquio"]!, note]), web: ["Lupo"], webTab: "notes" }));
  assert.match(speaking, /data-hint="conclude"/);
  assert.doesNotMatch(speaking, /disabled/);
  // A decision card waiting: disabled, and the hover says to finish the choice first.
  for (const k of ["move", "seat", "midnight"]) {
    const h = game({ v: derive([...at[k]!, note]), web: ["Lupo"], webTab: "notes" });
    assert.deepEqual(missingWords(h), [], k);
    assert.match(button(h), /disabled=""/, `${k}: disabled`);
    assert.match(button(h), /data-hint="concludeWaiting"/, `${k}: the hover says why`);
  }
  const words = (info.words as { screen: { hints: Record<string, string> } }).screen.hints;
  assert.ok(words.concludeWaiting!.length > 10, "its words are in player.json");
  // A dead player: disabled, as before.
  const dead = derive([...at["speak:colloquio"]!, note]);
  dead.deaths.push({ name: F, you: true, seq: 1e6 + 1 });
  assert.match(button(game({ v: dead, web: ["Lupo"], webTab: "notes" })), /disabled=""/);
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
  const lastLine = Math.max(...[...h.matchAll(/class="edge/g)].map((m) => m.index!));
  assert.ok(lastLine > 0, "the web has lines");
  const lastCircle = Math.max(...[...h.matchAll(/<circle /g)].map((m) => m.index!));
  assert.ok(Math.min(...names) > Math.max(lastLine, lastCircle), "every name after every line and circle");
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.node-name \{[^}]*paint-order: stroke;[^}]*stroke: var\(--surface\)/, "a halo in the panel's colour");
});

test("the left column (TD v0.45): the sheet, then the three decks, then the errand, then the places; no button for the web", async () => {
  const { at } = await playedLog();
  const h = game({ v: derive(at["speak:capannello"]!) });
  const left = h.slice(h.indexOf('class="side left"'), h.indexOf('class="centre"'));
  const order = ['data-hint="sheet"', 'data-hint="briefing"', 'data-hint="city"', 'class="errand"', 'data-hint="places"'].map((k) => left.indexOf(k));
  assert.ok(order.every((i) => i >= 0), String(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(!left.includes('data-hint="web"'), "the Web of Secrets is at the bottom, not here");
});

test("steady sizes: the sheet and the prompt are laid out before the first state, from theme tokens; the example is in the placeholder", () => {
  const h = game({ v: derive([]) });
  assert.match(h, /<dl class="facts">/, "the sheet's facts before any state");
  assert.match(h, /class="prompt"/, "the prompt's line");
  assert.doesNotMatch(h, /class="example/, "no example line under the box (Interface v0.5)");
  const css = readFileSync("web/src/app.css", "utf8");
  for (const [sel, token] of [[".conv-head", "--head-height"], [".input", "--input-box-height"], [".hint-text", "--hint-text-height"], [".prompt", "--line-sm"]])
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
  assert.equal((h.match(/class="mark (past|now|next)[ "]/g) ?? []).length, v.sheet!.track!.length);
  assert.equal((h.match(/class="mark now[ "]/g) ?? []).length, 1);
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

test("the room (TD v0.45–v0.48, a game without places): your own group marked, by name; every other group as overlapping tokens and each private pair joined", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  assert.ok(v.state!.places && !v.state!.room && v.named, "the default TD (v0.49) sends the places in open play, in place of the room");
  // roomOf reads either shape: from places, the other occupied places.
  const place = (name: string, guests: string[], o: { private?: boolean; own?: boolean } = {}) => ({ name, guests, private: !!o.private, own: !!o.own });
  const places = [place("the great hall", ["Lupo", "Friar Tommaso"]), place("the window bay", []), place("the anteroom", ["Francesco Pazzi", "Giorgia Pazzi"], { own: true }), place("the loggia", ["Piero de' Medici", "Clarice Orsini"], { private: true }), place("the study", ["Sister Beatrice"]), place("the dining room", [])];
  const roomShape = { groups: [["Lupo", "Friar Tommaso"], ["Sister Beatrice"]], colloquios: [["Piero de' Medici", "Clarice Orsini"]] };
  assert.deepEqual(roomOf({ ...v.state!, places }), roomShape);
  // An older game: no state ever carried places, so the room view as built.
  const { places: _, ...withoutPlaces } = v.state!;
  const old: View = { ...v, named: false, state: { ...withoutPlaces, room: roomShape } };
  const m = game({ v: old, selected: { kind: "guest", name: "Lupo" } });
  const left = m.slice(m.indexOf('class="side left"'), m.indexOf('class="centre"'));
  assert.match(left, /class="cluster mine" data-cluster="mine"/);
  assert.match(left, /data-hint="here"/);
  assert.doesNotMatch(left, /class="places"/, "no place list without places");
  assert.equal((left.match(/data-cluster="group"/g) ?? []).length, 2);
  assert.equal((left.match(/data-cluster="private"/g) ?? []).length, 1);
  const clusters = left.slice(left.indexOf('class="clusters"'));
  assert.equal((clusters.match(/class="token( selected)?"/g) ?? []).length, [...roomShape.groups, ...roomShape.colloquios].flat().length, "a token for every other guest in the room");
  assert.equal((left.match(/class="joint"/g) ?? []).length, 1, "each pair joined");
  assert.match(m, /class="token selected" aria-label="Lupo"/, "a selected guest's token is marked");
  for (const p of v.state!.present) assert.match(left, new RegExp(`<li><button class="token( selected)?" aria-label="${esc(p)}" aria-pressed="(true|false)" data-guest="${esc(p)}"[^>]*data-hint="portrait"`), `${p}'s portrait selects`);
  // Its conversation line is today's label, with no place.
  const members = (h: string) => h.slice(h.indexOf('class="members"'), h.indexOf("</div>", h.indexOf('class="members"')));
  assert.ok(members(m).includes(`>${esc(PLAYER.screen.capannello.replace("{others}", v.state!.present.join(" and ")))}`), `today's label: ${members(m)}`);
  assert.doesNotMatch(members(m), /\bIn the /);
  // Midnight in an older game: only who's with you.
  const mid = derive(at.midnight!);
  assert.equal(mid.state!.places, undefined);
  assert.equal(roomOf(mid.state), null);
  assert.doesNotMatch(game({ v: { ...mid, named: false } }), /data-cluster="(group|private)"/);
});

// ---- CC-20261114-12 (#132): the place list and the conversation line (Interface v0.9) ----------------------

test("the place list: every place in the pack's order, empty ones faded, yours marked, a private one behind a closed door; portraits select, your own opens your briefing", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const pack = settingPack().places!;
  const h = game({ v });
  const left = h.slice(h.indexOf('class="side left"'), h.indexOf('class="centre"'));
  assert.match(left, /data-hint="places"/);
  assert.ok(left.includes(`>${PLAYER.screen.places.title}<`));
  assert.doesNotMatch(left, /data-cluster=/, "the place list replaces the room's clusters");
  const rows = [...left.matchAll(/<li class="place([^"]*)" data-place="([^"]*)">/g)].map((r) => ({ cls: r[1]!, name: r[2]! }));
  assert.deepEqual(rows.map((r) => r.name), pack, "every place, in the pack's order");
  const sp = v.state!.places!;
  assert.deepEqual(rows.map((r) => r.cls.includes("empty")), sp.map((p) => p.guests.length === 0), "empty places stay, faded");
  assert.ok(sp.some((p) => !p.guests.length));
  assert.deepEqual(rows.map((r) => r.cls.includes(" own")), sp.map((p) => p.own), "your own place is marked");
  assert.equal(sp.filter((p) => p.own).length, 1);
  // Headings: the first letter capitalized; the hover is Lore's description, the same as the issue gives it.
  for (const name of pack) {
    const d = PLAYER.screen.places.descriptions[name] as string;
    assert.ok(d && d.length > 20, name);
    assert.ok(left.includes(`<span class="place-name" tabindex="0" aria-description="${esc(d)}">${name[0]!.toUpperCase()}${name.slice(1)}</span>`), `${name}: heading and description`);
  }
  assert.deepEqual(Object.keys(PLAYER.screen.places.descriptions).filter((k) => !k.startsWith("_")), pack, "a description for every place, keyed by its name");
  // Every guest in a place has a portrait; other guests' select, the player's own opens the briefing.
  for (const p of sp)
    for (const g of p.guests)
      if (g === F) assert.match(left, new RegExp(`<button class="token me" aria-label="${esc(F)}"[^>]*data-hint="myBriefing"`));
      else assert.match(left, new RegExp(`<button class="token" aria-label="${esc(g)}" aria-pressed="false" data-guest="${esc(g)}"[^>]*data-hint="room(Token|Pair)"`), `${g}'s portrait selects`);
  assert.doesNotMatch(left, new RegExp(`data-guest="${esc(F)}"`), "the player's own portrait doesn't select");
  // A private place: the closed-door mark, and its guests' portraits say so.
  const col = derive(at["speak:colloquio"]!);
  const priv = col.state!.places!.filter((p) => p.private);
  assert.ok(priv.length > 0);
  const ch = game({ v: col });
  const cl = ch.slice(ch.indexOf('class="side left"'), ch.indexOf('class="centre"'));
  assert.equal((cl.match(/class="door" role="img"/g) ?? []).length, priv.length, "a closed door on each private place");
  for (const p of priv) assert.match(cl, new RegExp(`<li class="place[^"]* private" data-place="${esc(p.name)}">`));
  // No place is a control: only its portraits are buttons.
  assert.doesNotMatch(left, /<button[^>]*data-place=/);
});

test("the place list in a council (a fixture: the mini-game has none) shows only your own place, with your faction; outside a conversation, a quiet line", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const own = v.state!.places!.find((p) => p.own)!;
  const council = (faction?: string): View => ({ ...v, state: { ...v.state!, conversation: { kind: "council", ...(faction && { faction }) } } });
  const mine = info.roster.find((r) => r.name === F)!.faction;
  for (const [cv, faction] of [[council(), mine], [council("Medici"), "Medici"]] as const) {
    const h = game({ v: cv });
    const left = h.slice(h.indexOf('class="side left"'), h.indexOf('class="centre"'));
    const rows = [...left.matchAll(/<li class="place[^"]*" data-place="([^"]*)">/g)].map((r) => r[1]);
    assert.deepEqual(rows, [own.name], "only your own place");
    const label = `The ${faction} council, in ${own.name}`;
    assert.ok(left.includes(`>${esc(label)}</span>`), `the row: ${label}`);
    assert.ok(h.slice(h.indexOf('class="members"')).includes(`>${esc(label)}<`), "the conversation line too");
  }
  // Midnight: the list gives way to one quiet line.
  const mid = derive(at.midnight!);
  assert.ok(mid.named && !mid.state!.places);
  const mh = game({ v: mid });
  assert.match(mh, new RegExp(`class="places-quiet muted">${esc(PLAYER.screen.places.quiet)}<`));
  assert.doesNotMatch(mh, /class="places"|data-cluster=/);
});

test("the conversation line names the place: a group, a group of one, a Colloquio; earlier conversations' lines too", async () => {
  const { at, log } = await playedLog();
  const members = (h: string) => h.slice(h.indexOf('class="members"'), h.indexOf("</span>", h.indexOf('class="members"')));
  const v = derive(at["speak:capannello"]!);
  const own = v.state!.places!.find((p) => p.own)!;
  const listed = (xs: string[]) => (xs.length <= 2 ? xs.join(" and ") : `${xs.slice(0, -1).join(", ")}, and ${xs.at(-1)}`);
  assert.ok(members(game({ v })).endsWith(`>${esc(`In ${own.name} with ${listed(v.state!.present)}`)}`), members(game({ v })));
  const alone: View = { ...v, state: { ...v.state!, present: [] } };
  assert.ok(members(game({ v: alone })).endsWith(`>${esc(`In ${own.name}, on your own`)}`));
  const col = derive(at["speak:colloquio"]!);
  const cOwn = col.state!.places!.find((p) => p.own)!;
  const other = (col.state!.conversation as { other: string }).other;
  assert.ok(members(game({ v: col })).endsWith(`>${esc(`In ${cOwn.name}, aside with ${other}`)}`), members(game({ v: col })));
  // Between seats (a Colloquio has ended, no place is yours yet): the conversation as before.
  const between: View = { ...col, state: { ...col.state!, places: col.state!.places!.map((p) => ({ ...p, own: false })) } };
  assert.doesNotMatch(members(game({ v: between })), /\bIn the /);
  // Earlier conversations in this stage are named by their places too.
  const e = await earlierView();
  const eh = game({ v: e });
  const items = [...eh.matchAll(/class="earlier-line"[^>]*>(?:<[^>]+>)*([^<]*)</g)].map((m) => m[1]!);
  assert.ok(items.length > 0 && items.every((t) => /In the /.test(t)), items.join(" | "));
  assert.ok(log.length > 0);
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

// ---- CC-20261114-06 (#113): the stage bar and read-only past stages (Interface v0.5) ----------------------

test("each line's stage is the phase it was spoken in, from what the screen already receives; runs split by conversation and stage", async () => {
  const truth = new Map<number, string>();
  const g = (x: MiniGame) => x as unknown as { turn: number; gathering: boolean; phaseLabelAt(at: number, gathering: boolean): string };
  // The engine's own phase label at the moment each line goes out: what the screen's stage must match.
  const tap = (ev: Ev, game: MiniGame) => {
    if (ev.type === "line" || ev.type === "notaio" || ev.type === "action") truth.set(ev.seq, g(game).phaseLabelAt(g(game).turn, g(game).gathering));
  };
  const { log, game: played } = await playedLog({ tap });
  const v = derive(log);
  assert.ok(v.stream.length > 50);
  for (const l of v.stream) assert.equal(l.stage, truth.get(l.seq), `${l.id} (seq ${l.seq})`);
  const track = played.stages();
  assert.ok(new Set(v.stream.map((l) => l.stage)).size >= 4, "lines in several stages");
  for (const l of v.stream) assert.ok(track.includes(l.stage!), `${l.stage} is on the track`);
  // Runs: every line once, in order; one conversation and one stage each; a new run at each change of either.
  assert.deepEqual(v.runs.flatMap((r) => r.lines.map((l) => l.id)), v.stream.map((l) => l.id));
  for (const r of v.runs) assert.ok(r.lines.every((l) => l.conversation === r.conversation && l.stage === r.stage));
  for (let i = 1; i < v.runs.length; i++) assert.ok(v.runs[i]!.conversation !== v.runs[i - 1]!.conversation || v.runs[i]!.stage !== v.runs[i - 1]!.stage);
  for (const stage of track) assert.deepEqual(stageRuns(v, stage).flatMap((r) => r.lines.map((l) => l.id)), v.stream.filter((l) => l.stage === stage).map((l) => l.id), stage);

  // The two orders the engine can send: a turn's state ahead of a line from the turn before (the line keeps
  // its stage), and a line opening a new turn ahead of its state (it takes the state that follows it at once).
  const st = (seq: number, phaseLabel: string) => ({ type: "state", seq, state: { phaseLabel }, commands: [] }) as unknown as Ev;
  const ln = (seq: number, turn: number) => ({ type: "notaio", seq, id: `L${seq}`, turn, conversation: "C1", text: "" }) as unknown as Ev;
  const stages = lineStages([ln(1, 0), st(2, "A"), ln(3, 0), st(4, "B"), ln(5, 1), st(6, "C"), ln(7, 1), ln(8, 1)]);
  assert.deepEqual([...stages], [[1, "A"], [3, "A"], [5, "C"], [7, "C"], [8, "C"]]);
});

test("the stage bar: a circle per stage with its numeral, past ones buttons, future ones not, the current one an oval with its name; words and looks from the pack and the theme", async () => {
  const v = await earlierView();
  const track = v.sheet!.track!;
  const now = track.indexOf(v.state!.phaseLabel);
  assert.ok(now > 0, "a past stage by then");
  const h = game({ v });
  assert.deepEqual(missingWords(h), []);
  const bar = h.slice(h.indexOf('class="track stage-bar"'), h.indexOf("</ol>"));
  const marks = [...bar.matchAll(/<li class="([^"]*)"[^>]*>(.*?)<\/li>/g)];
  assert.equal(marks.length, track.length);
  marks.forEach(([, cls, inner], i) => {
    const at = i < now ? "past" : i === now ? "now" : "next";
    assert.ok(cls!.startsWith(`mark ${at}`), `${i}: ${cls}`);
    assert.match(inner!, new RegExp(`<span class="num">${i + 1}</span>`), "its numeral");
    if (at === "next") assert.match(inner!, /^<span class="stage" tabindex="0" aria-disabled="true"[^>]*data-hint="trackNext"/, "a future stage isn't a button");
    else assert.match(inner!, /^<button class="stage"/, "past and current are buttons");
    assert.equal(inner!.includes('class="stage-name"'), at === "now", "only the current one shows its name");
  });
  assert.ok(marks[now]![1]!.includes("expanded"));
  // Every stage of the mini-game has its one-line description in the pack; the hovers say what a click does.
  for (const stage of track) assert.ok(typeof PLAYER.screen.stageBar.descriptions[stage] === "string", stage);
  for (const k of ["trackPast", "trackNow", "trackNext", "return", "pastStage"]) assert.ok(PLAYER.screen.hints[k].length > 10, k);
  const css = readFileSync("web/src/app.css", "utf8");
  for (const sel of [".stage-bar", ".stage", ".stage-dot", ".members"]) assert.match(css, new RegExp(`${sel.replace(/\./g, "\\.")} \\{`), sel);
  assert.match(css, /\.stage-bar \{[^}]*overflow-x: auto/, "it scrolls sideways on a narrow window");
});

test("Earlier this stage, and a selected guest's dots on the past stages they appear in", async () => {
  const v = await earlierView();
  const now = v.state!.phaseLabel;
  const name = v.stream.find((l) => l.item === "line" && !l.you && l.stage !== now)!.speaker!;
  const dots = stagesWith(v, name);
  assert.ok(dots.size > 0 && !dots.has(now));
  for (const stage of dots) assert.ok(stageRuns(v, stage).some((r) => appearsIn(r, name)));
  const h = game({ v, selected: { kind: "guest", name } });
  assert.equal((h.match(/class="stage-dot"/g) ?? []).length, dots.size, "a dot on each");
  for (const m of h.matchAll(/<li class="mark (\w+)[^"]*" aria-label="([^"]*)"[^>]*>(.*?)<\/li>/g)) assert.equal(m[3]!.includes("stage-dot"), dots.has(m[2]!.replace(/&#x27;/g, "'")), m[2]);
  assert.doesNotMatch(game({ v }), /stage-dot/, "nothing selected: no dots");
});

test("a past stage opens read-only: its conversations in order, Return in place of Speak and Pass, the summary's place empty until #146", async () => {
  const v = await earlierView();
  const stage = v.sheet!.track![1]!;
  const runs = stageRuns(v, stage);
  assert.ok(runs.length > 0);
  const h = game({ v, pastStage: stage });
  assert.deepEqual(missingWords(h), []);
  const view = h.slice(h.indexOf('class="past-stage"'), h.indexOf('class="notaio-hint'));
  assert.ok(view.includes(esc(w2("pastStage.heading", { stage }))), "headed with the stage");
  assert.equal((view.match(/class="past-conv"/g) ?? []).length, runs.length, "each conversation under its line");
  const ids = [...view.matchAll(/data-line="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, runs.flatMap((r) => r.lines.map((l) => l.id)), "every line of the stage, in order, and nothing else");
  assert.doesNotMatch(view, /class="earlier"|class="card"|class="speaking"/, "nothing of the current stage");
  // The bar marks the open stage; the input box keeps its draft field, with Return alone in Speak's place.
  assert.match(h, new RegExp(`<li class="mark past expanded shown open" aria-label="${esc(stage)}"`));
  const input = h.slice(h.indexOf('class="input past"'));
  assert.ok(input.length > 0 && input.includes("<textarea"));
  assert.match(input, /<button class="primary return( beckon)?"[^>]*data-hint="return"[^>]*>Return to current stage</);
  assert.doesNotMatch(input, /data-hint="(speak|do|pass)"/, "no Speak, Do, or Pass");
  assert.doesNotMatch(h.slice(h.indexOf('class="conv-head"'), h.indexOf("</header>")), /data-hint="end"/, "no End conversation from a past stage");
  // While the game waits for the player, Return and the current stage beckon, and the placeholder says so.
  assert.ok(v.pending);
  assert.match(input, /class="primary return beckon"/);
  assert.ok(input.includes(`placeholder="${esc(PLAYER.screen.input.pastWaiting)}"`));
  assert.match(h, /<li class="mark now beckon"/);
  const calm = game({ v: { ...v, pending: null }, pastStage: stage });
  assert.ok(calm.includes(`placeholder="${esc(PLAYER.screen.input.pastPlaceholder)}"`));
  assert.doesNotMatch(calm, /beckon/);
  // A decision card waiting doesn't close the box while a past stage is open.
  const { at } = await playedLog();
  const moving = derive(at.move!);
  const past = moving.sheet!.track!.find((t) => trackMarks(moving.sheet!.track!, moving.state!.phaseLabel).find((m) => m.stage === t)!.at === "past")!;
  assert.match(game({ v: moving, pastStage: past }), /class="primary return beckon"/);
});

/** A word from player.json's screen section, filled. */
function w2(key: string, values: Record<string, string>): string {
  const t = key.split(".").reduce((o: any, k) => o[k], PLAYER.screen) as string;
  return t.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}

// ---- CC-20261114-07 (#114): the web's ring, Il Notaio's box in its column, the hideable right panel, the rules'
// buttons, the city's list, the placeholder, and one selection shared with the web (Interface v0.5–v0.7) -------

test("one selection, shared with the Web of Secrets: chat to web, web to chat, a pair, clearing, and a lore topic", () => {
  const [A, B, C] = ["Lupo", "Giorgia Pazzi", "Friar Tommaso"];
  const topic = LORE[0]!;
  // A guest selected in the chat is the web's selection; again, it clears both.
  let s = selectInChat(NO_SELECTION, A);
  assert.deepEqual([s.guests, chatGuest(s)], [[A], A]);
  assert.deepEqual(selectInChat(s, A), NO_SELECTION, "selecting the chat's guest again clears both");
  // The web holds a pair; the chat holds the one picked last; a third replaces the older.
  s = selectInWeb(s, B);
  assert.deepEqual([s.guests, chatGuest(s)], [[A, B], B], "a pair in the web; the chat holds the one picked last");
  assert.deepEqual(selectInWeb(s, C).guests, [B, C], "a third replaces the older");
  // The web drops one of a pair: the chat holds the other.
  assert.deepEqual([selectInWeb(s, B).guests, chatGuest(selectInWeb(s, B))], [[A], A]);
  assert.deepEqual([selectInWeb(s, A).guests, chatGuest(selectInWeb(s, A))], [[B], B]);
  assert.equal(chatGuest(selectInWeb(selectInWeb(s, A), B)), null, "dropping both clears the chat too");
  // A new selection in the chat replaces the pair; selecting the chat's guest (the last picked) clears both.
  assert.deepEqual(selectInChat(s, C).guests, [C]);
  assert.deepEqual(selectInChat(s, A).guests, [A], "the pair's other guest: the chat now holds just them");
  assert.deepEqual(selectInChat(s, B), NO_SELECTION);
  // A lore topic clears the guests in both places; back returns to the guest it replaced; the topic again goes back.
  const l = selectLore(s, topic);
  assert.deepEqual([l.guests, chatGuest(l), l.lore?.entry.id, l.lore?.back], [[], null, topic.id, B]);
  assert.deepEqual(selectBack(l), { guests: [B], lore: null });
  assert.deepEqual(selectLore(l, topic), { guests: [B], lore: null });
  assert.deepEqual(selectBack(selectLore(NO_SELECTION, topic)), NO_SELECTION);
});

test("the shared selection on the screen: the chat's guest on the web's bar and ring; a web pair on the bar, its last guest on the right; a topic clears the web", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const esc = (x: string) => x.replace(/'/g, "&#x27;");
  const bar = (h: string) => h.match(/class="web-bar-sel">([^<]*)</)?.[1] ?? null;
  const nodes = (h: string) => [...h.matchAll(/data-guest="([^"]+)" class="node picked/g)].map((m) => m[1]);
  // From the chat: the web's bar and ring show them while it's down.
  const chat = game({ v, selected: { kind: "guest", name: "Lupo" } });
  assert.equal(bar(chat), "Lupo");
  assert.deepEqual(nodes(chat), ["Lupo"]);
  assert.match(chat, /class="person look" data-guest="Lupo"/);
  // From the web: a pair on the bar and in the ring; the chat shows the one picked last.
  const pair = game({ v, web: ["Lupo", "Giorgia Pazzi"] });
  assert.equal(bar(pair), esc(w2("web.between", { a: "Lupo", b: "Giorgia Pazzi" })));
  assert.deepEqual(nodes(pair).sort(), ["Giorgia Pazzi", "Lupo"]);
  assert.match(pair, /class="person look" data-guest="Giorgia Pazzi"/, "the chat holds the one picked last");
  // A lore topic: the guests clear in both places.
  const topic = game({ v: withLore(v), selected: { kind: "lore", entry: LORE[0]!, back: null } });
  assert.equal(bar(topic), null, "the bar shows no one (Interface v0.7: no \"No one selected\")");
  assert.deepEqual(nodes(topic), []);
});

test("the web's ring: factions together, an arc in each faction's colour with its name at the corner, and curved lines", async () => {
  const arcs = factionArcs(info.roster, info.factions);
  const factions = [...new Set(info.roster.map((r) => r.faction))];
  assert.deepEqual(arcs.map((a) => a.faction), info.factions.filter((f) => factions.includes(f)), "an arc per faction, in the setting's order");
  for (const a of arcs) {
    assert.equal(a.colour, info.roster.find((r) => r.faction === a.faction)!.colour, `${a.faction}: in its colour`);
    assert.match(a.d, /^M [\d.-]+ [\d.-]+ A 48 48 0 0 1 [\d.-]+ [\d.-]+/, `${a.faction}: an arc around the ring`);
    // The name sits at the arc's first corner: the corner's direction from the centre, further out.
    const [x0, y0] = a.d.split(" ").slice(1, 3).map(Number);
    const dir = (x: number, y: number) => Math.atan2(y - 50, x - 50);
    assert.ok(Math.abs(dir(a.x, a.y) - dir(x0!, y0!)) < 1e-3, `${a.faction}: its name at the corner`);
    assert.ok(Math.hypot(a.x - 50, a.y - 50) > 48, `${a.faction}: outside the arc`);
  }
  // One faction alone takes the whole ring, as two half-arcs.
  assert.equal(factionArcs(info.roster.map((r) => ({ ...r, faction: "One" }))).length, 1);
  assert.equal(factionArcs([]).length, 0);
  // Each faction's guests sit together, between its arc's ends.
  const ring = webLayout(info.roster, info.factions);
  const order = [...ring.keys()].map((n) => info.roster.find((r) => r.name === n)!.faction);
  assert.equal(order.filter((f, i) => i === 0 || f !== order[i - 1]).length, factions.length, "each faction together");
  // A line curves toward the middle: its control point is nearer the centre than the line's midpoint.
  const [a, b] = [ring.get(info.roster[0]!.name)!, ring.get(info.roster[1]!.name)!];
  const q = curve(a, b).match(/Q ([\d.-]+) ([\d.-]+)/)!.slice(1).map(Number);
  assert.ok(Math.hypot(q[0]! - 50, q[1]! - 50) < Math.hypot((a.x + b.x) / 2 - 50, (a.y + b.y) / 2 - 50), "bowed toward the centre");
  // On the screen: the arcs under the lines, the lines as curves (no straight ones), names over all.
  const page = game({ v: derive((await playedLog()).at["speak:capannello"]!), web: [] });
  const h = page.slice(page.indexOf('class="web-diagram"'), page.indexOf("</svg>", page.indexOf('class="web-diagram"')));
  assert.equal((h.match(/class="faction-arc"/g) ?? []).length, factions.length);
  assert.ok(h.indexOf('class="faction-arc"') < h.indexOf('class="edge'), "the arcs under the lines");
  assert.doesNotMatch(h, /<line /, "no straight lines");
  assert.ok([...h.matchAll(/<path class="edge[^"]*" d="([^"]+)"/g)].every((m) => / Q /.test(m[1]!)), "every line a curve");
  // Each faction's name, once, anchored to read away from its arc.
  assert.equal((h.match(/class="faction-label"/g) ?? []).length, factions.length);
  assert.match(h, /text-anchor="(start|end|middle)"/);
});

test("Il Notaio's box in the What you heard and saw column: over the dialogue, expanded; nothing selected, one line and no reading", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const h = game({ v, web: ["Lupo"] });
  const side = h.slice(h.indexOf('class="web-side"'));
  // In the column, after the dialogue (so it lies over it), expanded, with its label; the column keeps its events.
  assert.match(side, /class="record-pane covered"><div class="record-scroll"><div class="record">/);
  assert.match(side, /<aside class="reading" data-state="expanded" role="button" aria-expanded="true"[^>]*data-hint="reading"/);
  assert.ok(side.indexOf('class="reading"') > side.indexOf('class="record"'), "the box over the dialogue");
  assert.ok(side.includes(`>${esc2(PLAYER.screen.web.heard)}<`) && side.includes(`>${esc2(PLAYER.screen.web.saw)}<`), "the column keeps what it showed");
  assert.equal(h.slice(0, h.indexOf('class="web-side"')).includes('class="reading"'), false, "not on the map any more");
  // Nothing selected: one line asking for a guest, and no reading.
  const none = game({ v, web: [] });
  const empty = none.slice(none.indexOf('class="web-side"'));
  assert.match(empty, new RegExp(`class="muted record-pick">${esc2(PLAYER.screen.web.pick)}<`));
  assert.doesNotMatch(none, /class="reading"/);
  // Its looks are theme tokens: the peeking strip and the minimized height.
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.reading \{[^}]*top: var\(--reading-peek\)/);
  assert.match(css, /\.reading\[data-state="minimized"\] \{[^}]*max-height: var\(--reading-min-height\)/);
});

test("the right panel hides to a strip with a handle; the handle shows the selected guest's small portrait", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const shown = game({ v, rightHidden: false });
  assert.match(shown, /<div class="layout">/);
  assert.match(shown, /<button class="right-hide"[^>]*data-hint="hideRight"/, "a control on its edge hides it");
  const hidden = game({ v, rightHidden: true, selected: { kind: "guest", name: "Lupo" } });
  assert.match(hidden, /<div class="layout right-hidden">/, "the chat widens");
  assert.match(hidden, /<aside class="side right hidden"><button class="right-handle"[^>]*data-hint="showRight"/);
  assert.match(hidden, /class="right-handle-guest" data-guest="Lupo"><span class="portrait"/, "the selected guest's portrait on the handle");
  assert.doesNotMatch(hidden, /class="person /, "no cards while hidden");
  assert.doesNotMatch(game({ v, rightHidden: true }), /right-handle-guest/, "no one selected: no portrait");
  assert.deepEqual(missingWords(hidden), []);
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.layout\.right-hidden \{ grid-template-columns: var\(--side-width\) 1fr var\(--right-strip-width\); \}/);
});

test("the placeholder carries the example: an @ and a /, rotated, using only the commands allowed now", async () => {
  const examples = PLAYER.screen.input.examples as { action: string; text: string }[];
  assert.ok(examples.length >= 3 && examples.every((e) => e.text.includes("@{guest}") && e.text.includes("{command}")), "each with an @ and a /");
  const cmd = (action: string) => ({ action, name: `/${action}`, usage: "", hint: "" });
  // Only examples whose command is allowed now, filled; rotated by the turn.
  const one = placeholderExample(examples, [cmd("borrow")], "Lupo", 0)!;
  assert.ok(one.includes("@Lupo") && one.includes("/borrow"), one);
  const two = [0, 1, 2, 3].map((t) => placeholderExample(examples, [cmd("borrow"), cmd("bribe")], "Lupo", t));
  assert.equal(new Set(two).size, 2, "rotated between the allowed ones");
  assert.ok(two.every((x) => /\/(borrow|bribe)/.test(x!)));
  assert.equal(placeholderExample(examples, [cmd("kill")], "Lupo", 0), null, "no example for a command not listed: the plain placeholder");
  assert.equal(placeholderExample(examples, [cmd("borrow")], null, 0), null, "no one to address: the plain placeholder");
  // On the screen: the box's placeholder, and no example line under it; the counter stays.
  const { at } = await playedLog();
  for (const k of ["speak:capannello", "speak:colloquio"]) {
    const v = derive(at[k]!);
    const h = game({ v });
    const ph = h.match(/<textarea[^>]*placeholder="([^"]*)"/)![1]!;
    assert.ok(ph.includes("@") && ph.includes("/"), `${k}: ${ph}`);
    const allowed = v.commands.map((c) => c.name);
    assert.ok(allowed.some((n) => ph.includes(`${n}`)), `${k}: a command allowed now`);
    assert.doesNotMatch(h, /class="example/);
    assert.match(h, /class="count"/, "the counter stays");
  }
});

test("the new controls' explanations are in player.json", () => {
  for (const k of ["hideRight", "showRight", "rulesSection", "rulesShrink", "cityRow", "cityBack", "reading"]) assert.ok(typeof PLAYER.screen.hints[k] === "string" && PLAYER.screen.hints[k].length > 10, k);
  for (const k of ["rulesModal.mark", "rulesModal.shrink", "cityList.back", "right.hide", "right.hideLabel", "right.show", "right.showLabel"]) assert.ok(w2(k, {}).length > 0 && !w2(k, {}).includes("undefined"), k);
});

const esc2 = (x: string) => x.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// ---- CC-20261114-08 (#117, part 1 of 3): the midnight line, the web's bar, portraits that select, the player's
// own name, the right panel's cards, and "Open in the Web of Secrets" (Interface v0.7–v0.8) ----------------------

test("the midnight line in the sheet: one act; with plot_reward on, +1 in the errand card's terms, then +1 earned or nothing once the check has run", async () => {
  const { at } = await playedLog();
  const base = derive(at["speak:capannello"]!);
  const words = PLAYER.screen.midnightLine;
  const sheet = (v: View) => {
    const h = game({ v });
    return h.slice(h.indexOf('class="panel sheet-panel"'), h.indexOf('class="buttons decks"'));
  };
  const cases: { name: string; v: View; extra: string | null }[] = [
    { name: "off (the mini-game)", v: base, extra: null },
    { name: "on, before the check", v: flagged(base, { plotReward: true }), extra: "reward" },
    { name: "on, after the check, earned", v: { ...flagged(base, { plotReward: true, plotStatus: "You finished your errand in time." }), state: { ...flagged(base, { plotReward: true, plotStatus: "You finished your errand in time." }).state!, plotEarned: true } }, extra: "earned" },
    { name: "on, after the check, not earned", v: { ...flagged(base, { plotReward: true, plotStatus: "You did not finish your errand in time." }), state: { ...flagged(base, { plotReward: true, plotStatus: "You did not finish your errand in time." }).state!, plotEarned: false } }, extra: null },
    { name: "on, after the check, with no flag beside it", v: flagged(base, { plotReward: true, plotStatus: "You finished your errand in time." }), extra: null },
  ];
  for (const c of cases) {
    assert.equal(midnightLine(c.v.state).extra, c.extra, c.name);
    const h = sheet(c.v);
    assert.ok(h.includes(`<div class="midnight-line"><div>${esc(words.acts)}</div>`), `${c.name}: one act`);
    if (c.extra) assert.ok(h.includes(`data-extra="${c.extra}">${esc(words[c.extra])}<`), `${c.name}: ${words[c.extra]}`);
    else assert.doesNotMatch(h, /midnight-extra/, `${c.name}: no second line`);
  }
  // Before the check it never gives a result away: the reward line holds, whatever the errand's state.
  assert.equal(midnightLine(flagged(base, { plotReward: true }).state).extra, "reward");
  assert.equal(midnightLine(null).extra, null);
  assert.equal(words.acts, "Midnight: 1 act (kill, guard, or watch)");
  assert.equal(words.reward, "+1 if you finish your errand before the last council");
  assert.equal(words.earned, "+1 earned");
});

test("the web's bar: one centered group, the arrow and the title, and only with someone selected, a dot and their small portraits and names", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const bar = (h: string) => h.slice(h.indexOf('<button class="web-bar"'), h.indexOf("</button>", h.indexOf('<button class="web-bar"')));
  const none = bar(game({ v }));
  assert.match(none, /<span class="web-bar-group"><span class="web-bar-arrow" aria-hidden="true">▲<\/span><span class="web-bar-title">The Web of Secrets<\/span><\/span>$/, "just the arrow and the title");
  const one = bar(game({ v, selected: { kind: "guest", name: "Lupo" } }));
  assert.match(one, /class="web-bar-dot"[^>]*>·<\/span><span class="web-bar-portraits"><span class="portrait small"[^>]*>L<\/span><\/span><span class="web-bar-sel">Lupo<\/span>/);
  const pair = bar(game({ v, web: ["Lupo", "Giorgia Pazzi"] }));
  assert.match(pair, /class="web-bar-arrow" aria-hidden="true">▼</, "▼ when open");
  assert.equal((pair.match(/class="portrait small"/g) ?? []).length, 2);
  assert.ok(pair.includes(`class="web-bar-sel">Lupo and Giorgia Pazzi<`));
  assert.ok(!("barNone" in PLAYER.screen.web), "no \"No one selected\"");
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.web-bar \{[^}]*justify-content: center;/, "centered");
});

test("portraits select their guest wherever they appear; the player's own name or portrait opens their briefing", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const h = game({ v });
  const left = h.slice(h.indexOf('class="side left"'), h.indexOf('class="centre"'));
  // Who's with you, in your own place: a portrait button each, selecting.
  for (const p of v.state!.present) assert.match(left, new RegExp(`<button class="token" aria-label="${esc(p)}" aria-pressed="false" data-guest="${esc(p)}"[^>]*data-hint="roomToken"`), `${p}'s portrait selects`);
  // The tokens under the "talking with" card select too.
  const right = h.slice(h.indexOf('class="side right'), h.indexOf('class="web-dock'));
  const others = v.state!.present.filter((p) => p !== talkingWith(v, F));
  assert.equal((right.slice(right.indexOf('class="tokens"')).match(/<button class="token"/g) ?? []).length, others.length, "a button per token");
  // The player's own: opens the briefing, with the hover "Your briefing", never selects.
  assert.match(left, /<button class="who me-briefing"[^>]*aria-description="Your briefing" data-hint="myBriefing"><span class="portrait large"/);
  assert.equal(PLAYER.screen.hints.myBriefing, "Your briefing");
  assert.doesNotMatch(left, new RegExp(`data-guest="${F}"`), "the player's own portrait doesn't select");
  assert.match(PLAYER.screen.hints.portrait, /\{name\}/);
});

test("the right panel's cards: Open in the Web of Secrets only on a filled talking-with card and a selected guest's; the cards sit in a frame they slide down out of", async () => {
  const { at } = await playedLog();
  const empty = derive(at["speak:capannello"]!);
  const right = (h: string) => h.slice(h.indexOf('class="side right'), h.indexOf('class="web-dock'));
  const talk = (h: string) => right(h).slice(0, right(h).indexOf("</section>"));
  if (!talkingWith(empty, F)) {
    assert.match(talk(game({ v: empty })), /no-ear/);
    assert.doesNotMatch(talk(game({ v: empty })), /data-hint="openWeb"/, "the empty card has no button");
  }
  const colloquio = derive(at["speak:colloquio"]!);
  assert.ok(talkingWith(colloquio, F));
  assert.match(talk(game({ v: colloquio })), /data-hint="openWeb"/, "a filled card keeps it");
  assert.match(talk(game({ v: colloquio })), /class="who column"><button class="token large"/, "the talking-with card's portrait selects");
  const looking = right(game({ v: empty, selected: { kind: "guest", name: "Lupo" } }));
  assert.match(looking, /<div class="covers"><section class="person look" data-guest="Lupo">/);
  assert.match(looking.slice(looking.indexOf('class="covers"')), /data-hint="openWeb"/, "a selected guest's card keeps it");
  // Looks and timings are theme tokens, with a fade for reduced motion.
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.person\.look\.leaving \{[^}]*animation: slide-down var\(--motion-card\)/);
  assert.match(css, /\.person\.look\.follows \{ animation-delay: var\(--card-follow\);/);
  assert.match(css, /prefers-reduced-motion: reduce\)[^@]*\.person\.look\.leaving \{ animation: fade-out/);
  const theme = readFileSync("web/theme.css", "utf8");
  for (const t of ["--motion-card", "--card-follow", "--bar-portrait-size"]) assert.match(theme, new RegExp(`${t}:`));
});

// ---- CC-20261114-09 (#117, part 2 of 3): four modals in a row, and the glossary (Interface v0.7) -------------

const PACK_GLOSSARY = (JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { glossary: { entries: { term: string; text: string; fullGame?: boolean; rules?: string[]; match: string[] }[] } }).glossary.entries;

test("the glossary's entries: from the setting pack, amounts filled from the game's tuning values, the full game's terms left out of the mini-game", () => {
  const g = info.glossary!;
  const t = fakeDocs.tunables;
  assert.ok(PACK_GLOSSARY.length >= 25, "the draft's entries");
  assert.deepEqual(g.map((e) => e.term), PACK_GLOSSARY.filter((e) => !e.fullGame).map((e) => e.term), "the mini-game leaves out the terms marked †");
  for (const term of ["Ballot", "Candidate", "Gonfaloniere", "/repent", "Run-off", "Speeches"]) assert.ok(PACK_GLOSSARY.find((e) => e.term === term)?.fullGame, `${term} is marked †`);
  assert.ok(g.every((e) => !/\{\w+\}/.test(e.text)), "every amount filled");
  // Amounts are written as placeholders in the pack, never typed in.
  for (const e of PACK_GLOSSARY) assert.doesNotMatch(e.text, /\b\d+\s+Florins\b|\bat \d+\b/, `${e.term}: an amount typed in`);
  const text = (term: string) => g.find((e) => e.term === term)!.text;
  assert.ok(text("Florins").includes(`starts with ${t.starting_florins} and receives ${t.income}`), text("Florins"));
  assert.ok(text("/borrow").includes(`${t.pension_size} Florins`), text("/borrow"));
  // A different tuning changes the entry, not the pack.
  const retuned = glossary(PACK_GLOSSARY, { ...t, pension_size: 4 }, "Ducats", false);
  assert.ok(retuned.find((e) => e.term === "/repay")!.text.includes("4 Ducats"));
  assert.ok(retuned.some((e) => e.term === "Ballot"), "the full game keeps them");
  assert.throws(() => glossary([{ term: "X", text: "{nonsense}" }], t, "Florins", true), /doesn't have/);
  // Il Notaio's entry starts with the gloss (Interface v0.11).
  assert.match(text("Il Notaio"), /^Italian for “the notary”/);
  // The glossary's own words aren't the screen's: they arrive filled, apart from player.json's words.
  assert.equal((info.words as Record<string, unknown>).glossary, undefined);
});

test("the glossary's list, search, and rules sections; a line's glossary words, with a lore link winning", () => {
  const g = info.glossary!;
  const list = glossaryList(g).map((e) => e.term);
  const key = (x: string) => x.replace(/^\//, "").toLowerCase();
  assert.deepEqual(list, [...list].sort((a, b) => key(a).localeCompare(key(b))), "alphabetical, a command by its name");
  assert.ok(list.indexOf("/borrow") < list.indexOf("Colloquio") && list.indexOf("/bribe") > list.indexOf("/borrow"));
  assert.deepEqual(glossaryList(g, "payroll").map((e) => e.term).sort(), g.filter((e) => /payroll/i.test(e.term + e.text)).map((e) => e.term).sort(), "the search narrows by term or definition");
  assert.deepEqual(glossaryList(g, "zzzz"), []);
  const cards = rulesCards(rulesText(fakeDocs.templates, { ...fakeDocs.tunables, plotProtection: false, plotReward: false }));
  const money = g.find((e) => e.term === "Florins")!;
  assert.equal(cards[rulesSectionFor(money, cards)!]!.title, "Money");
  assert.equal(rulesSectionFor(g.find((e) => e.term === "Errand")!, cards), null, "no section behind it, no link");
  assert.ok(g.filter((e) => e.rules.length).every((e) => rulesSectionFor(e, cards) !== null), "every named section is one the rules have");
  // In a line: a glossary word is a term; a word that's a lore title too is the lore link.
  const lore: LoreEntry[] = [{ id: "L9", title: "The council", aliases: [], subject: null, text: "" }];
  const parts = lineParts("The council met; a Colloquio followed, and Florins changed hands at midnight.", lore, g);
  assert.deepEqual(
    parts.map((p) => (typeof p === "string" ? p : "gloss" in p ? `[${p.gloss.term}:${p.text}]` : `<${p.text}>`)),
    ["<The council>", " met; a ", "[Colloquio:Colloquio]", " followed, and ", "[Florins:Florins]", " changed hands at ", "[Midnight:midnight]", "."],
  );
  assert.deepEqual(lineParts("Watch the door.", [], g), ["Watch the door."], "everyday words aren't underlined");
});

test("the four modals in a row: the open one between its neighbours, nothing before the briefing and nothing after the glossary", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const peeks = (h: string) => [...h.matchAll(/<div class="modal-peek (left|right)( empty)?"[^>]*>/g)].map((m) => `${m[1]}:${m[0].match(/data-deck="(\w+)"/)?.[1] ?? "none"}`);
  assert.deepEqual(peeks(game({ v, deck: "briefing" })), ["left:none", "right:rules"]);
  assert.deepEqual(peeks(game({ v, deck: "rules" })), ["left:briefing", "right:city"]);
  assert.deepEqual(peeks(game({ v, deck: "city" })), ["left:rules", "right:glossary"]);
  assert.deepEqual(peeks(game({ v, deck: "glossary" })), ["left:city", "right:none"]);
  const h = game({ v, deck: "glossary" });
  assert.deepEqual(missingWords(h), []);
  assert.match(h, /class="modal deck deck-glossary"/);
  assert.match(h, /<input class="glossary-search" type="search"[^>]*data-hint="glossarySearch"/);
  assert.equal((h.match(/class="glossary-entry"/g) ?? []).length, info.glossary!.length);
  assert.ok((h.match(/data-hint="glossaryRules"/g) ?? []).length > 5, "More in the rules, where there's a section");
  // The neighbours are inert and listen for nothing: no buttons in them.
  const peek = h.slice(h.indexOf('class="modal-peek left'), h.indexOf('class="modal deck'));
  assert.doesNotMatch(peek, /<button/);
  // The four buttons, in the row's order.
  const left = h.slice(h.indexOf('class="buttons decks"'), h.indexOf('class="errand"'));
  assert.deepEqual([...left.matchAll(/data-hint="(\w+)"/g)].map((m) => m[1]), ["briefing", "rules", "city", "glossary"]);
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.modal-peek\.left \{[^}]*mask-image: var\(--peek-fade-left\)/, "the left one's left side faded");
  assert.match(css, /\.modal-peek\.right \{[^}]*mask-image: var\(--peek-fade-right\)/);
  assert.match(css, /\.gloss \{ text-decoration: underline dotted var\(--gloss-underline\)/);
});

// ---- CC-20261114-10 (#117, part 3 of 3): the opening, the tour, and Il Notaio's name glossed (Interface v0.7–v0.11) ----

const NOTAIO_PACK = JSON.parse(readFileSync("setting/florence-1492/notaio.json", "utf8")) as { name: { gloss: string; hover: string }; opening: { paragraphs: string[] }; tour: { steps: Record<string, string> } };

test("the opening: his name glossed at the top before he writes, Skip, and the story a list of paragraphs in notaio.json, ending on the orientation line", () => {
  const h = html(createElement(Opening, { onStart: () => {} }));
  assert.deepEqual(missingWords(h), []);
  assert.match(h, /<header class="opening-head"><h1 class="opening-name"><span class="narrator-name"[^>]*>Il Notaio<\/span><\/h1><div class="opening-gloss">Italian for “the notary”<\/div><\/header>/);
  assert.doesNotMatch(h, /class="opening-para"/, "before he writes, only his name");
  assert.match(h, /class="secondary small opening-skip"[^>]*data-hint="openingSkip"/);
  assert.doesNotMatch(h, /start-card/, "the choice comes at the end");
  assert.ok(Array.isArray(NOTAIO_PACK.opening.paragraphs) && NOTAIO_PACK.opening.paragraphs.length === 6, "#148: Lore's six placeholder paragraphs");
  assert.ok(NOTAIO_PACK.opening.paragraphs.at(-1)!.endsWith(" Speak as your character would, plainly."), "Interface v0.14: the last paragraph ends on the orientation line");
  assert.equal(NOTAIO_PACK.opening.paragraphs.join(" ").split("Speak as your character would, plainly.").length, 2, "#148: the orientation line once, not appended again");
  assert.deepEqual(info.notaio.opening!.paragraphs, NOTAIO_PACK.opening.paragraphs, "served to the screen as written");
  const written = html(createElement(Opening, { onStart: () => {}, written: true }));
  assert.equal((written.match(/class="opening-para" data-state="done"/g) ?? []).length, NOTAIO_PACK.opening.paragraphs.length, "Skip: every paragraph, whole");
  assert.doesNotMatch(written, /opening-skip/);
  const theme = readFileSync("web/theme.css", "utf8");
  for (const t of ["--opening-char", "--opening-pause", "--tour-dim", "--motion-tour", "--z-tour"]) assert.match(theme, new RegExp(`${t}:`), t);
  assert.match(readFileSync("web/src/app.css", "utf8"), /prefers-reduced-motion: reduce\)[^@]*\.tour-spot \{ transition: none; \}/, "the spotlight jumps with reduced motion");
});

test("the tour: a card per step in Il Notaio's voice, in the doc's order, ending on Your briefing; Back, Skip tour, and Show me around; not on the server's first render", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  assert.doesNotMatch(game({ v }), /class="tour"/, "it starts in the browser, after the choice");
  assert.deepEqual(Object.keys(NOTAIO_PACK.tour.steps), ["sheet", "decks", "errand", "room", "stageBar", "conversation", "right", "web", "briefing"], "the doc's eight, then Your briefing");
  assert.equal(NOTAIO_PACK.tour.steps.briefing, "Start with your briefing.");
  Object.keys(NOTAIO_PACK.tour.steps).forEach((key, i) => {
    const h = game({ v, tourStep: i });
    assert.deepEqual(missingWords(h), [], key);
    const tour = h.slice(h.indexOf('<div class="tour"'));
    assert.match(tour, new RegExp(`^<div class="tour" data-step="${key}"`), key);
    assert.ok(tour.includes(`<p class="tour-text">${esc(NOTAIO_PACK.tour.steps[key]!)}</p>`), `${key}: its card, from notaio.json`);
    assert.match(tour, /<div class="tour-head"><span class="narrator-name"/, `${key}: in his name`);
    assert.ok(tour.includes(`${i + 1} of 9`));
    assert.match(tour, new RegExp(`<button class="secondary small"${i === 0 ? ' disabled=""' : ""}[^>]*data-hint="tourBack"`), `${key}: Back`);
    assert.match(tour, /data-hint="tourSkip">Skip tour</, `${key}: Skip tour`);
  });
  assert.match(game({ v }), /<button class="switch tour-again"[^>]*data-hint="tourAgain">Show me around<\/button><button class="switch"/, "Show me around, beside the explanations' switch");
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.tour-card \{[^}]*background: var\(--hint-bg\)/, "styled like his hint");
});

test("Il Notaio's name, glossed wherever it shows: his notes, his hint, his reading; the words from notaio.json, his glossary entry starting the same", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const hover = `aria-description="${esc(NOTAIO_PACK.name.hover)}"`;
  const h = game({ v, web: ["Lupo"] });
  assert.match(h, new RegExp(`<div class="ln notaio" data-line="\\w+"><span class="sp"><span class="narrator-name" tabindex="0" data-narrator="" ${hover.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "his notes in the stream");
  assert.match(h, /<button class="hint-head"[^>]*><span><span class="narrator-name"[^>]*>Il Notaio<\/span>, to you<\/span>/, "his hint");
  assert.match(h, /<div class="reading-head"><span class="narrator-name"[^>]*>Il Notaio<\/span>&#x27;s reading\. He may be wrong\.<\/div>/, "his reading");
  assert.equal(NOTAIO_PACK.name.hover, "Il Notaio: Italian for “the notary”. He records the evening and belongs to no faction.");
  assert.ok(info.glossary!.find((e) => e.term === "Il Notaio")!.text.startsWith(NOTAIO_PACK.name.gloss), "his glossary entry starts with the same gloss");
  assert.ok(NOTAIO_PACK.name.gloss.startsWith("Italian for"));
  assert.ok(!("orientation" in (info.words as object)) && !("start" in (info.words as { screen: object }).screen), "the start screen's words went with it");
});
