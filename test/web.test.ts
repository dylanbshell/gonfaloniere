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
import { GameView, Opening, phrases } from "../web/src/App.tsx";
import type { Ev } from "../web/src/connection.ts";
import { canDo, canSpeak, openMenu, trigger, withMention } from "../web/src/input.ts";
import { NO_SELECTION, appearsIn, briefingCards, chatGuest, cityCards, cityList, curve, derive, factionArcs, placeholderExample, preview, selectBack, selectInChat, selectInWeb, selectLore, earlierThisStage, errandDeadline, errandLine, factionLabels, heardAndSaw, hintMoment, lineStages, loreParts, readingFor, roomOf, summaryFor, rulesCards, playerRules, proseBlocks, roman, titleCase, titleRule, wrapName, stageRuns, stagesWith, talkingWith, trackMarks, webLayout, glossaryList, lineParts, midnightLine, noteGroups, webLines, webNames, NODE_RADIUS, rulesSectionFor, type Card, type LoreEntry, type View, factLink, rulesLink, errandTask, errandCardAt, commandMenu, commandWhy, payrollSize, refusalWhy, refusedCommand, playerBriefing } from "../web/src/model.ts";
import { notaioHint, packValue, setInfo, tc, w, type StartInfo } from "../web/src/words.ts";
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
  // TD v0.51, the tour's hold: the screen begins at once, as one whose tour has already run.
  queueMicrotask(() => (reply(JSON.stringify({ type: "command", text: "/borrow" })), reply(JSON.stringify({ type: "begin" }))));
  await game.play();
  return { log, at, game };
}

/** A full game's values, as TD v0.52's sheet would carry them (a fixture: no engine plays the full game yet). */
const FULL_VALUES = { start: 10, income: 1, payroll: 3, vote: 5, treasury: 12, linesPerTurn: 8, minglingTurns: 12, councilTurns: 3, finalCouncilTurns: 4, selectionTurns: 2, openFloorTurns: 6, colloquioCap: 10, currency: { singular: "Florin", plural: "Florins" } };

/** A view whose player has a knowledge errand (TD v0.51's flag, as the game would send it for Piero). */
const knowing = (v: View): View => ({ ...v, state: { ...v.state!, knowledgeErrand: true } });

const info = { ...screenInfo([F], castBriefings(fakeDocs), { tunables: fakeDocs.tunables, minigame: true }), started: null, ws: null } as StartInfo;
setInfo(info);
const html = (el: ReturnType<typeof createElement>) => renderToString(el);
/** The modal in focus alone, from the page's html: it comes first in the overlay, before its neighbours (the whole side modals are drawn still, from the same parts). */
const focused = (h: string) => h.slice(h.indexOf('class="modal deck'), h.indexOf('class="modal-side left'));
/** The player's own rules as the screen builds them for a view (Interface v0.17): the pack's text, filled with the sheet's values. */
const rulesOf = (v: View) => playerRules(packValue("rules"), v.sheet!.values!, { plotReward: !!v.state?.plotReward, living: (v.state?.livingOthers.length ?? 0) + 1 });
/** Words the screen shows but couldn't find in player.json come out as their keys. */
const missingWords = (h: string) => h.match(/\bscreen\.[\w.]+|\b(?:refusals|commands|hints)\.[\w.]+|undefined|\[object Object\]/g) ?? [];

test("the opening's choice (Interface v0.7): one card, for Francesco, with his portrait, name, and public subtitle (no separate faction line, Interface v0.16)", () => {
  const h = html(createElement(Opening, { onStart: () => {}, written: true }));
  assert.deepEqual(missingWords(h), []);
  assert.equal(info.playable.length, 1);
  const card = h.slice(h.indexOf('class="start-card"'));
  const g = info.roster.find((r) => r.name === F)!;
  assert.match(card, /class="portrait large"/);
  assert.ok(card.includes(`<div class="name">${F}</div><div class="muted subtitle">${esc(g.subtitle)}</div>`), "name, then subtitle");
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

test("buttons by job: Speak is the one filled button, disabled with nothing to say; Pass is outlined; End sits in the header and under Speak and Pass, solid red", async () => {
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
  assert.match(head, /<button class="end"[^>]*data-hint="end"/, "End conversation is in the Colloquio's header");
  const input = h.slice(h.indexOf('class="input"'));
  // Interface v0.16: and under Speak and Pass, the width of the two; both solid red with white words, their own tokens.
  assert.match(input, /<div class="actions"><div class="actions-row"><button class="primary"[^>]*>Speak<\/button><button class="secondary"[^>]*>Pass<\/button><\/div><button class="end"[^>]*data-hint="end"[^>]*>End Conversation<\/button><\/div>/);
  const group = html(createElement(GameView, { me: F, v: derive(at["speak:capannello"]!), send: () => {}, status: "open" }));
  assert.doesNotMatch(group, /data-hint="end"/, "only when it's on offer");
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /button\.end \{[^}]*background: var\(--end-bg\)[^}]*color: var\(--end-text\)/);
  const theme = readFileSync("web/theme.css", "utf8");
  for (const t of ["--end-bg", "--end-text", "--end-hover"]) assert.equal((theme.match(new RegExp(`${t}: `, "g")) ?? []).length, 2, `${t}: light and dark`);
  // The prompt's line: the prompt at the left, the character count at the right.
  assert.match(input, /<div class="prompt-line"><div class="prompt[^"]*">[^<]*<\/div><span class="count">0\/\d+<\/span><\/div>/);
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
  assert.ok(h.lastIndexOf('class="overlay') > h.lastIndexOf('class="input"'), "the deck comes after the input box");
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
    // (The message box's hidden twin, which only measures the placeholder, isn't a control.)
    const bare = controls.filter((c) => !c.includes("data-hint") && !/earlier-line/.test(c) && !c.startsWith("<select") && !c.includes('aria-hidden="true"'));
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
  // Interface v0.17, Notes for the Build: a layout answers to its own space by a container query, whose condition can't
  // read a token. So each width a condition names must be a `--break-*` token's value in theme.css, and only those may be written there.
  const breaks = new Set([...theme.matchAll(/--break-[\w-]+:\s*(\d+px);/g)].map((m) => m[1]!));
  assert.ok(breaks.size >= 4, "the theme's breakpoints");
  for (const f of files("web/src", /\.css$/)) {
    const whole = noComments(readFileSync(f, "utf8"));
    for (const m of whole.matchAll(/@(container|media)([^{]*)\{/g)) for (const px of m[2]!.match(/\b\d*\.?\d+(px|em|rem|vh|vw)\b/g) ?? []) assert.ok(m[1] === "container" && breaks.has(px), `${f}: @${m[1]}${m[2]}: ${px} isn't one of theme.css's --break-* widths`);
    const css = whole.replace(/@container[^{]*\{/g, "@container {");
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
  // Interface v0.17: the rules modal shows the player's own rules; the primer (block 2) still parses, for a server that sends no values.
  const primer = rulesCards(v.sheet!.rules);
  assert.ok(primer.length >= 6 && primer.every((c) => c.title && c.text), primer.map((c) => c.title).join(", "));
  const rules = rulesOf(v);
  assert.equal(rules.length, 10);
  assert.deepEqual(cityCards(LORE).map((c) => [c.group, c.title]), [["History", "1478"], ["Places", "San Frediano"], [null, "The Signoria"]]);
  // Your briefing stays a deck: tabs along the top, one per card; the first card open; a back control; Your past when lore is on.
  const past = { ...v, sheet: { ...v.sheet!, past: [{ id: "P1", title: "The garden wall", text: "You climbed it once." }] } };
  const modal = focused;
  const b = game({ v: past, deck: "briefing" });
  assert.deepEqual(missingWords(b), []);
  // The deck's own tabs (the Web of Secrets, always on the page, has tabs of its own).
  // Interface v0.16: five cards for the player, then Your past.
  assert.equal((modal(b).match(/class="tab( on)?"/g) ?? []).length, 5 + 1, "a tab per card");
  assert.match(b, /class="deck-card fades"[^>]*data-hint="deckCard"/, "the card swipes on");
  assert.match(game({ v: past, deck: "briefing" }), /<button class="secondary deck-next"[^>]*data-hint="deckCard">Next Briefing →<\/button>/);
  assert.match(b, /data-hint="deckTab">Your Past</, "Your past, last");
  // Interface v0.5: the rules are one button per section, and an open section fills the modal with its ×.
  const r = modal(game({ v, deck: "rules" }));
  assert.deepEqual(missingWords(r), []);
  assert.deepEqual([...r.matchAll(/<button class="rules-section" data-section="\d+"[^>]*data-hint="rulesSection"><span class="numeral" aria-hidden="true">[IVX]+<\/span><span class="rules-name">([^<]*)</g)].map((m) => m[1]), rules.map((c) => c.title.replace(/'/g, "&#x27;")), "a button per section, in order");
  assert.doesNotMatch(r, /class="tab|deck-card/, "no deck");
  assert.equal(primer[0]!.title, "The evening", "the primer's capitalized opening heading shows in sentence case (Interface v0.16)");
  const older = modal(game({ v: { ...v, sheet: { ...v.sheet!, values: undefined } }, deck: "rules" }));
  assert.deepEqual([...older.matchAll(/<span class="rules-name">([^<]*)</g)].map((m) => m[1]), primer.map((c) => tc(c.title).replace(/'/g, "&#x27;")), "from a server that sends no values, the primer, its titles in title case");
  // The city is a list: a row per public entry, with its title and a one-line preview, under subject headers.
  const c = modal(game({ v: withLore(v), deck: "city" }));
  assert.deepEqual(missingWords(c), []);
  assert.deepEqual([...c.matchAll(/class="city-subject">([^<]*)</g)].map((m) => m[1]), ["History", "Places", "Other"], "The city's subjects head its list");
  assert.deepEqual([...c.matchAll(/class="city-row" data-lore="(\w+)"[^>]*data-hint="cityRow"><span class="city-title">([^<]*)<\/span><span class="city-preview muted">([^<]*)</g)].map((m) => [m[1], m[2], m[3]]), [["L2", "1478", "The year the Pazzi rose."], ["L1", "San Frediano", "A church across the river."], ["L3", "The Signoria", "The city&#x27;s government."]]);
  // Interface v0.17: a topic's title from Lore is title-cased on the screen, not in its source.
  const lower = modal(game({ v: { ...v, sheet: { ...v.sheet!, lore: [{ id: "L7", title: "The feast of the baptist", aliases: [], subject: null, text: "A feast." }] } }, deck: "city" }));
  assert.match(lower, /<span class="city-title">The Feast of the Baptist<\/span>/);
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
  // Interface v0.16: one line per pair and type, and the halo only on Francesco's secret ties (his own, with no public tie to match).
  const drawn = webLines(v.sheet!.connections!);
  const pairType = (c: { between: string[]; type: string }) => `${[...c.between].sort().join("|")}|${c.type}`;
  assert.equal(drawn.length, new Set(v.sheet!.connections!.map(pairType)).size, "one line per pair and type");
  assert.ok(drawn.length < v.sheet!.connections!.length, "his own take on a tie everyone knows isn't drawn twice");
  const secret = drawn.filter((l) => l.secret);
  assert.deepEqual(secret.map((l) => `${l.between.find((g) => g !== F)}: ${l.type}`).sort(), ["Clarice Orsini: romance", "Friar Tommaso: alliance", "Raffaello de' Medici: rivalry"], "his secret ties");
  for (const l of secret) assert.ok(!v.sheet!.connections!.some((c) => !c.private && pairType(c) === pairType(l)));
  assert.equal((h0.match(/<path class="edge rel-/g) ?? []).length, drawn.length);
  assert.equal((h0.match(/class="edge rel-[\w-]+ yours/g) ?? []).length, secret.length, "Francesco's secret lines, marked");
  assert.equal((h0.match(/<path class="edge-under"/g) ?? []).length, secret.length, "each with the halo beneath it");
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
  const v = knowing(derive([...base, ...notes]));
  assert.deepEqual(v.notes.map((n) => n.id), ["N1", "N2", "N3"]);
  assert.equal((game({ v, web: [] }).match(/class="edge note-line/g) ?? []).length, 1, "the pair's dashed line");
  // Interface v0.16: the Notes tab always lists every note, grouped: each guest, then each pair, then free notes. Selecting no longer narrows the list.
  const texts = (h: string) => [...h.matchAll(/class="note-text"[^>]*>([^<]+)</g)].map((m) => m[1]);
  const headings = (h: string) => [...h.matchAll(/class="label note-heading"><button class="icon note-fold"[^>]*>[^<]*<\/button><(?:button|span) class="note-about"[^>]*>([^<]+)</g)].map((m) => m[1]);
  const all = game({ v, web: [], webTab: "notes" });
  assert.deepEqual(missingWords(all), []);
  assert.deepEqual(headings(all), ["Lupo", "Lupo and Giorgia Pazzi", PLAYER.screen.web.free], "each guest, then each pair, then free notes");
  assert.deepEqual(texts(all), ["Lupo watches the door.", "Those two talk too often.", "Something is off tonight."]);
  for (const sel of [["Lupo"], ["Giorgia Pazzi", "Lupo"], ["Contessa Isabella"]]) {
    const h = game({ v, web: sel, webTab: "notes" });
    assert.deepEqual(texts(h), texts(all), `${sel}: every note still listed`);
    assert.deepEqual(headings(h), headings(all), `${sel}: the same groups`);
  }
  // The selected guest's or pair's group is lit; a heading and a note both select (a free note selects no one).
  const groupsOf = (h: string) => [...h.matchAll(/<div class="note-group([^"]*)" data-group="([^"]*)"/g)].map((m) => `${m[2]}${m[1]}`);
  assert.deepEqual(groupsOf(game({ v, web: ["Lupo"], webTab: "notes" })), ["Lupo lit", "Giorgia Pazzi|Lupo", "free"]);
  assert.deepEqual(groupsOf(game({ v, web: ["Giorgia Pazzi", "Lupo"], webTab: "notes" })), ["Lupo", "Giorgia Pazzi|Lupo lit", "free"]);
  assert.match(all, /<button class="note-about"[^>]*data-hint="noteItem">Lupo and Giorgia Pazzi</, "a pair's heading selects them");
  assert.match(all, /<li class="note" data-note="N2" aria-description="Select who this note is about\." data-hint="noteItem">/, "a note selects its guest");
  assert.match(all, /<li class="note" data-note="N1"><span/, "a free note selects no one");
  // Each group folds under its heading, with a fold button named from the pack.
  assert.equal((all.match(/<button class="icon note-fold" aria-expanded="true" aria-label="Fold these notes"/g) ?? []).length, 3);
  assert.equal(PLAYER.screen.web.unfold, "Show these notes");
  assert.ok(!all.includes("<select"), "no filter");
  assert.equal((all.match(/class="tab( on)?"/g) ?? []).length, 2, "two tabs: What you heard and saw, and Notes");
  assert.ok(!("all" in PLAYER.screen.web) && !("filter" in PLAYER.screen.web) && !("allTab" in PLAYER.screen.hints), "no All your notes, nor its filter");
  // Newest first within a group, and within a kind the group with the newest note first.
  const more = [...v.notes, { id: "N4", seq: 2e6, turn: 3, guests: ["Giorgia Pazzi"], text: "x" }, { id: "N5", seq: 2e6 + 1, turn: 3, guests: ["Lupo"], text: "y" }];
  assert.deepEqual(noteGroups(more).map((g) => [g.about, g.notes.map((n) => n.id)]), [[["Lupo"], ["N5", "N2"]], [["Giorgia Pazzi"], ["N4"]], [["Lupo", "Giorgia Pazzi"], ["N3"]], [[], ["N1"]]]);
  assert.deepEqual(noteGroups([]), []);
  const css0 = readFileSync("web/src/app.css", "utf8");
  assert.match(css0, /\.note-group\.lit \.note-heading \{ color: var\(--accent\); \}/);
  assert.match(css0, /\.note \{[^}]*border-left: var\(--border-width\) solid var\(--edge-note\)/, "the same straight line down every note's left");
  assert.match(css0, /\.note-text \{[^}]*overflow-wrap: anywhere/, "long notes wrap inside the column");
  // Interface v0.3: only notes on a guest or a pair get "This is my conclusion"; the free note has none.
  const buttons = [...all.matchAll(/<li class="note"[^>]*>(.*?)<\/li>/g)].map((m) => [m[1]!.match(/class="note-text"[^>]*>([^<]+)</)![1], /data-hint="conclude"/.test(m[1]!)]);
  assert.deepEqual(buttons, [["Lupo watches the door.", true], ["Those two talk too often.", true], ["Something is off tonight.", false]]);
  assert.ok(v.commands.some((c) => c.action === "conclude"), "the conclusion's command, found by its action");
  // TD v0.51's flag: only a character whose errand a conclusion can finish sees the button. Francesco's is a
  // payment, so the game sends false, and no note has one; a state without the flag (an older game) has none either.
  const francesco = derive([...base, ...notes]);
  assert.equal(francesco.state!.knowledgeErrand, false, "the game's flag for Francesco");
  assert.doesNotMatch(game({ v: francesco, web: [], webTab: "notes" }), /class="secondary small conclude"/);
  const { knowledgeErrand: _k, ...unflagged } = francesco.state!;
  assert.doesNotMatch(game({ v: { ...francesco, state: unflagged as typeof francesco.state }, web: [], webTab: "notes" }), /class="secondary small conclude"/);
});

test("the conclusion button (Interface v0.4): disabled while a decision card waits, with a hover saying why; disabled for a dead player", async () => {
  const { at } = await playedLog();
  const note: Ev = { seq: 1e6, type: "note", id: "N1", turn: 1, guests: ["Lupo"], text: "Lupo watches the door." };
  const button = (h: string) => h.match(/<button class="secondary small conclude"[^>]*>/)?.[0] ?? "";
  // Speaking: the box is open, so the button is live, with its usual hover.
  const speaking = button(game({ v: knowing(derive([...at["speak:colloquio"]!, note])), web: ["Lupo"], webTab: "notes" }));
  assert.match(speaking, /data-hint="conclude"/);
  assert.doesNotMatch(speaking, /disabled/);
  // A decision card waiting: disabled, and the hover says to finish the choice first.
  for (const k of ["move", "seat", "midnight"]) {
    const h = game({ v: knowing(derive([...at[k]!, note])), web: ["Lupo"], webTab: "notes" });
    assert.deepEqual(missingWords(h), [], k);
    assert.match(button(h), /disabled=""/, `${k}: disabled`);
    assert.match(button(h), /data-hint="concludeWaiting"/, `${k}: the hover says why`);
  }
  const words = (info.words as { screen: { hints: Record<string, string> } }).screen.hints;
  assert.ok(words.concludeWaiting!.length > 10, "its words are in player.json");
  // A dead player: disabled, as before.
  const dead = knowing(derive([...at["speak:colloquio"]!, note]));
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
  assert.match(h, /<div class="facts"><div class="fact" data-fact="purse">/, "the sheet's facts before any state");
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
  assert.doesNotMatch(q, /class="tokens"/, "no row of the other guests' tokens (Interface v0.16): the places list shows who's with you");
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
  assert.match(shut, /class="web-bar" aria-expanded="false"[^>]*>.*Web of Confidences/);
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

test("the place list: every place in the pack's order, empty ones faded, yours marked, a private one behind a closed door; every portrait selects, your own included", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const pack = settingPack().places!;
  const h = game({ v });
  const left = h.slice(h.indexOf('class="side left"'), h.indexOf('class="centre"'));
  assert.match(left, /data-hint="places"/);
  assert.ok(left.includes(`>${PLAYER.screen.places.title}<`));
  assert.doesNotMatch(left, /data-cluster=/, "the place list replaces the room's clusters");
  // Interface v0.19: the occupied places (and the player's own, and a secret conversation's) keep a row each, in the pack's
  // order; the empty ones fold into one faded line after them, "Empty: …", in the pack's order.
  const sp = v.state!.places!;
  const busy = (p: (typeof sp)[number]) => p.guests.length > 0 || p.own || p.private;
  const rows = [...left.matchAll(/<li class="place([^"]*)" data-place="([^"]*)">/g)].map((r) => ({ cls: r[1]!, name: r[2]! }));
  assert.deepEqual(rows.map((r) => r.name), sp.filter(busy).map((p) => p.name), "the occupied places, in the pack's order");
  const empty = [...left.matchAll(/<span class="place empty" data-place="([^"]*)">/g)].map((r) => r[1]!);
  assert.deepEqual(empty, sp.filter((p) => !busy(p)).map((p) => p.name), "the empty ones, on one line");
  assert.deepEqual(pack.filter((p) => rows.some((r) => r.name === p) || empty.includes(p)), pack, "every place, in the pack's order");
  assert.ok(empty.length > 0);
  assert.match(left, /<li class="places-empty"><span class="places-empty-label">Empty:<\/span> <span class="place empty"/);
  assert.deepEqual(rows.map((r) => r.cls.includes(" own")), sp.filter(busy).map((p) => p.own), "your own place is marked");
  assert.equal(sp.filter((p) => p.own).length, 1);
  // Headings: the first letter capitalized on a row, the pack's words on the empty line; the hover is Lore's description.
  for (const name of pack) {
    const d = PLAYER.screen.places.descriptions[name] as string;
    assert.ok(d && d.length > 20, name);
    const shown = empty.includes(name) ? name : `${name[0]!.toUpperCase()}${name.slice(1)}`;
    assert.ok(left.includes(`<span class="place-name" tabindex="0" aria-description="${esc(d)}">${shown}</span>`), `${name}: heading and description`);
  }
  assert.deepEqual(Object.keys(PLAYER.screen.places.descriptions).filter((k) => !k.startsWith("_")), pack, "a description for every place, keyed by its name");
  // Every guest in a place has a portrait that selects them, the player's own included (Interface v0.16).
  assert.ok(sp.some((p) => p.guests.includes(F)));
  for (const p of sp) for (const g of p.guests) assert.match(left, new RegExp(`<button class="token" aria-label="${esc(g)}" aria-pressed="false" data-guest="${esc(g)}"[^>]*data-hint="room(Token|Pair)"`), `${g}'s portrait selects`);
  // "You are here" on its own line under the place's name: after the name (and any door), taking the row's whole width.
  assert.match(left, /<li class="place own" data-place="[^"]*"><span class="place-head"><span class="place-name"[^>]*>[^<]*<\/span><span class="place-own">You are here<\/span><\/span>/);
  assert.match(readFileSync("web/src/app.css", "utf8"), /\.place-own \{[^}]*flex-basis: 100%/);
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
  assert.ok(members(game({ v: col })).endsWith(`>${esc(`In ${cOwn.name}, in secret with ${other}`)}`), members(game({ v: col })));
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
    else assert.match(card, new RegExp(`class="errand-reward link" data-reward="${c.kind}"`), c.name);
    // Interface v0.16: the line opens the rules (a button, with its own explanation).
    assert.match(card, /<button class="errand-(reward|result) link"[^>]*data-hint="factLink"/, `${c.name}: the line opens the rules`);
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
  assert.match(h, /class="mark next deadline" data-stage="The last council" aria-label="The Last Council"[^>]*><span class="errand-mark" role="img" aria-label="Your Errand&#x27;s Deadline"[^>]*data-hint="trackDeadline"/);
  assert.equal(PLAYER.screen.hints.trackDeadline, "Your errand's deadline. Finish before this stage for an extra act at midnight.");
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
  assert.equal(PLAYER.screen.midnight.extra, "Your Extra Act (for Your Errand)");
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

test("the stage bar: a standard step bar (Interface v0.16): a circle per stage with its numeral, past ones buttons, future ones not, the current one an oval with its name and no number; words and looks from the pack and the theme", async () => {
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
    assert.equal(inner!.includes(`<span class="num">${i + 1}</span>`), at !== "now", "its numeral, except in the current oval");
    if (at === "next") assert.match(inner!, /^<span class="stage" tabindex="0" aria-disabled="true"[^>]*data-hint="trackNext"/, "a future stage isn't a button");
    else assert.match(inner!, /^<button class="stage"/, "past and current are buttons");
    assert.equal(inner!.includes('class="stage-name"'), at === "now", "only the current one shows its name");
  });
  assert.doesNotMatch(bar, /expanded|stage-desc/, "nothing in the row changes on hover: the description is in the tooltip under it");
  assert.doesNotMatch(h, /class="stage-tip/, "no tooltip until a stage is hovered or focused");
  // Every stage of the mini-game has its one-line description in the pack; the hovers say what a click does.
  for (const stage of track) assert.ok(typeof PLAYER.screen.stageBar.descriptions[stage] === "string", stage);
  for (const k of ["trackPast", "trackNow", "trackNext", "return", "pastStage"]) assert.ok(PLAYER.screen.hints[k].length > 10, k);
  const css = readFileSync("web/src/app.css", "utf8");
  for (const sel of [".stage-bar", ".stage", ".stage-dot", ".members"]) assert.match(css, new RegExp(`${sel.replace(/\./g, "\\.")} \\{`), sel);
  assert.doesNotMatch(css, /\.stage-bar \{[^}]*overflow/, "it never scrolls: it stretches with the window");
  assert.match(css, /\.stage-bar \.mark \+ \.mark::before \{[^}]*flex: 1 0 var\(--stage-stroke-min\)/, "the lines share out the room, never shorter than the minimum");
  assert.doesNotMatch(css.slice(css.indexOf("/* The stage bar"), css.indexOf("/* A selected guest's dot")), /transition|animation/, "no motion");
  assert.match(css, /\.stage-tip \{[^}]*background: var\(--world-bg\)/, "the tooltip is a light card");
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

test("a past stage opens read-only: its conversations in order, Return in place of Speak and Pass, Il Notaio's summary over them", async () => {
  const v = await earlierView();
  const stage = v.sheet!.track![1]!;
  const runs = stageRuns(v, stage);
  assert.ok(runs.length > 0);
  const h = game({ v, pastStage: stage });
  assert.deepEqual(missingWords(h), []);
  assert.doesNotMatch(h, /class="notaio-hint/, "Il Notaio's hint steps aside while an earlier stage is open (Interface v0.16)");
  const view = h.slice(h.indexOf('class="past-stage"'), h.indexOf('class="input'));
  assert.ok(view.includes(esc(tc(w2("pastStage.heading", { stage })))), "headed with the stage, in title case (Interface v0.17)");
  assert.equal((view.match(/class="past-conv"/g) ?? []).length, runs.length, "each conversation under its line");
  const ids = [...view.matchAll(/data-line="(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, runs.flatMap((r) => r.lines.map((l) => l.id)), "every line of the stage, in order, and nothing else");
  assert.doesNotMatch(view, /class="earlier"|class="card"|class="speaking"/, "nothing of the current stage");
  // The bar marks the open stage; the input box keeps its draft field, with Return alone in Speak's place.
  assert.match(h, new RegExp(`<li class="mark past open" data-stage="${esc(stage)}" aria-label="${esc(tc(stage))}"`));
  const input = h.slice(h.indexOf('class="input past"'));
  assert.ok(input.length > 0 && input.includes("<textarea"));
  assert.match(input, /<button class="primary return( beckon)?"[^>]*data-hint="return"[^>]*>Return to Current Stage</);
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
  // With a decision waiting in the current stage (Interface v0.16), there's nothing to draft: the bottom card is one wide Return button.
  const { at } = await playedLog();
  const moving = derive(at.move!);
  const past = moving.sheet!.track!.find((t) => trackMarks(moving.sheet!.track!, moving.state!.phaseLabel).find((m) => m.stage === t)!.at === "past")!;
  const waiting = game({ v: moving, pastStage: past });
  assert.match(waiting, /<div class="input past decision"><button class="primary return wide beckon"[^>]*data-hint="return"[^>]*>Return to Current Stage<\/button><\/div>/);
  assert.doesNotMatch(waiting, /class="card"|<textarea/, "no card and no box while reading the earlier stage");
  // Back in the current stage, the decision card sits in the message box's place, not in the conversation.
  const back = game({ v: moving });
  assert.match(back, /<div class="input decision"><div class="card">/);
  assert.doesNotMatch(back.slice(back.indexOf('class="stream'), back.indexOf('class="notaio-hint')), /class="card"/);
  assert.doesNotMatch(back, /<textarea/);
});

test("Il Notaio's summary of a past stage (TD v0.51; Interface v0.13): over the window, expanded, bullets under each conversation's line; none until the game has written it", async () => {
  const v = await earlierView();
  const stage = v.sheet!.track![1]!;
  const summary = summaryFor(v, stage);
  assert.ok(summary, `the game wrote it when the stage ended: ${JSON.stringify(v.summaries.map((x) => x.stage))} ${stage}`);
  assert.ok(summary.groups.length > 0, "with its groups");
  const h = game({ v, pastStage: stage });
  assert.deepEqual(missingWords(h), []);
  const box = h.slice(h.indexOf('<aside class="reading past-summary"'), h.indexOf("</aside>", h.indexOf('<aside class="reading past-summary"')));
  assert.match(box, /^<aside class="reading past-summary" data-state="expanded" role="button" aria-expanded="true"[^>]*data-hint="pastSummary"/);
  assert.ok(box.includes(esc(PLAYER.screen.pastStage.summaryTitle.split("{notaio}")[1])), "labelled as his");
  // Each group under its conversation's line, the one the stage's dialogue shows for it.
  const wheres = [...box.matchAll(/class="summary-where">([^<]*)</g)].map((m) => m[1]);
  const lines = [...h.matchAll(/class="past-where muted">([^<]*)</g)].map((m) => m[1]);
  assert.equal(wheres.length, summary.groups.length);
  for (const x of wheres) assert.ok(lines.includes(x), `${x} in ${JSON.stringify(lines)}`);
  // Bullets: his sentences, events as their own record lines, notes set apart with a link.
  const items = summary.groups.flatMap((g) => g.items);
  assert.equal((box.match(/<li class="summary-item /g) ?? []).length, items.length);
  for (const i of items.filter((x) => x.kind === "sentence")) assert.ok(box.includes(esc(i.text)), i.text);
  assert.equal((box.match(/class="reading-note"/g) ?? []).length, items.filter((i) => i.kind === "note").length);
  // The box sits over the stream, outside its scroll, so the dialogue scrolls under it once minimized.
  assert.ok(h.indexOf('class="reading past-summary"') > h.indexOf('class="past-stage"') && h.indexOf('class="stream-area"') < h.indexOf('class="stream behind"'));
  // Interface v0.16: it opens a fifth of the way down; while it's open the dialogue behind it fades (the content, not a tint), and it casts an upward shadow.
  assert.match(h, /<div class="stream behind">/);
  // A stage the game hasn't summarized (or a game before TD v0.51): its dialogue alone.
  const none = game({ v: { ...v, summaries: [] }, pastStage: stage });
  assert.doesNotMatch(none, /past-summary/);
  assert.doesNotMatch(none, /class="stream behind"/, "nothing fades without his box");
  // The current stage has no box.
  assert.doesNotMatch(game({ v }), /past-summary/);
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.stream-area \{[^}]*position: relative/);
  assert.match(css, /\.reading\.past-summary \{[^}]*top: var\(--summary-top\)[^}]*box-shadow: var\(--shadow-up\)/);
  assert.match(css, /\.stream\.behind > \* \{[^}]*opacity: var\(--behind-opacity\)/);
  assert.match(readFileSync("web/theme.css", "utf8"), /--summary-top: 20%/);
});

test("Il Notaio's guarded reading in his box (TD v0.51): the background, then a paragraph per stage, his lines and the events in order, notes apart, the tally last", async () => {
  const { at } = await playedLog();
  const base = derive(at["speak:capannello"]!);
  const lupo = heardAndSaw(base, ["Lupo"], F);
  const upTo = Math.max(0, ...lupo.heard.map((l) => l.seq), ...lupo.saw.map((s) => (s.kind === "line" ? s.line.seq : s.seq)));
  const stage = base.sheet!.track![1]!;
  const guarded = {
    background: { connections: [{ between: ["Lupo", F], type: "service", line: "He keeps you alive" }, { between: [F, "Lupo"], type: "service", line: "Your bodyguard", private: true }], lore: [{ entry: "pub-palazzo", title: "Tonight's host", text: "A great house." }] },
    stages: [{ stage, heading: `In ${stage.toLowerCase()}:`, items: [{ kind: "sentence", seq: 5, text: 'Lupo told you: "The door is mine."' }, { kind: "note", entry: "pub-palazzo", title: "Tonight's host", text: "A great house." }, { kind: "event", seq: 6, item: "notaio", text: "Lupo drew Giorgia Pazzi aside." }] }],
    empty: null,
  };
  const v = derive([...at["speak:capannello"]!, { seq: 1e7, type: "reading", guests: ["Lupo"], upTo, text: null, tally: "You've heard Lupo speak 3 times.", guarded }]);
  const h = game({ v, web: ["Lupo"] });
  assert.deepEqual(missingWords(h), []);
  const box = h.slice(h.indexOf('<aside class="reading"'));
  assert.match(box, /data-reading="guarded"/);
  const order = ["reading-background", "reading-stage", "reading-tally"].map((c) => box.indexOf(`class="${c}`));
  assert.ok(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1]!)), "background, tonight, then the tally");
  assert.ok(box.includes(esc(w2("reading.connection", { between: "Lupo and Francesco Pazzi", line: "He keeps you alive" }))), "a public connection line, verbatim");
  assert.ok(box.includes(esc(w2("reading.connection", { between: "Lupo", line: "Your bodyguard" }))) && box.includes(esc(PLAYER.screen.web.yours)), "your own, marked as yours");
  assert.ok(box.includes(esc(`In ${stage.toLowerCase()}:`)) && box.includes(esc('Lupo told you: "The door is mine."')));
  assert.ok(box.indexOf("The door is mine") < box.indexOf('class="reading-note"', box.indexOf('class="reading-stage')) && box.indexOf('class="reading-note"', box.indexOf('class="reading-stage')) < box.indexOf("drew Giorgia"), "in their order");
  assert.equal((box.match(/<button class="lore-link"[^>]*data-hint="readingNote">Tonight&#x27;s host</g) ?? []).length, 2, "each lore title a link, in the background and after the line");
  assert.ok(box.includes("You&#x27;ve heard Lupo speak 3 times."));
  // Nothing heard or seen: his line saying so.
  const empty = derive([...at["speak:capannello"]!, { seq: 1e7, type: "reading", guests: ["Lupo"], upTo, text: null, tally: "T.", guarded: { background: { connections: [], lore: [] }, stages: [], empty: "Nothing yet." } }]);
  assert.match(game({ v: empty, web: ["Lupo"] }), /class="reading-empty">Nothing yet\.</);
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.reading-note \{[^}]*font-size: var\(--text-notaio-note-open\)/, "a note in a smaller style, a token");
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

test("the web's ring: factions together, a fixed ring read like a clock, an arc in each faction's colour with its name outside its middle, and curved lines", async () => {
  const arcs = factionArcs(info.roster, info.factions);
  const factions = [...new Set(info.roster.map((r) => r.faction))];
  assert.deepEqual(arcs.map((a) => a.faction), info.factions.filter((f) => factions.includes(f)), "an arc per faction, in the setting's order");
  for (const a of arcs) {
    assert.equal(a.colour, info.roster.find((r) => r.faction === a.faction)!.colour, `${a.faction}: in its colour`);
    assert.match(a.d, /^M [\d.-]+ [\d.-]+ A 48 48 0 0 1 [\d.-]+ [\d.-]+/, `${a.faction}: an arc around the ring`);
    assert.ok(Math.hypot(a.x - 50, a.y - 50) > 48, `${a.faction}: outside the arc`);
  }
  // Interface v0.16: a fixed ring, read like a clock. With twelve guests, the first in the roster sits at half past
  // nine and the rest follow clockwise, an hour apart.
  const clock = (p: { x: number; y: number }) => ((Math.atan2(p.y - 50, p.x - 50) * 6) / Math.PI + 3 + 12) % 12;
  const seats = webLayout(info.roster, info.factions);
  const order0 = [...seats.keys()];
  assert.equal(order0.length, 12);
  order0.forEach((n, i) => assert.ok(Math.abs(clock(seats.get(n)!) - ((9.5 + i) % 12)) < 1e-6, `${n} at ${(9.5 + i) % 12} o'clock`));
  assert.equal(order0[0], info.roster[0]!.name, "by roster order");
  // Interface v0.17: each faction's name sits outside its arc at a set hour, by roster order: 11:00, 1:00, 5:00, 7:00.
  assert.deepEqual(arcs.map((a) => Math.round(clock(a) * 100) / 100), [11, 1, 5, 7]);
  assert.deepEqual(arcs.map((a) => a.anchor), ["end", "start", "start", "end"]);
  // A long name (two words or more, over a dozen letters) wraps onto two lines; the rest stay on one.
  assert.deepEqual(arcs.map((a) => a.lines), [["Medici"], ["Pazzi"], ["Dominicans"], ["French", "Embassy"]]);
  assert.deepEqual([wrapName("The House of the Friars"), wrapName("Extraordinarily"), wrapName("Two Words")], [["The House of", "the Friars"], ["Extraordinarily"], ["Two Words"]]);
  // With any other number of factions the rule doesn't apply: each name sits outside the middle of its arc.
  const three = factionArcs(info.roster.filter((r) => r.faction !== info.factions[3]), info.factions);
  assert.equal(three.length, 3);
  assert.ok(three.every((a) => Math.hypot(a.x - 50, a.y - 50) > 48));
  assert.notDeepEqual(three.map((a) => Math.round(clock(a) * 100) / 100), [11, 1, 5]);
  // Names sit under their circles; where two guests sit side by side at the top or bottom of the ring, each name
  // moves outward, as far as it can without reaching the next guest's circle.
  const names = webNames(info.roster, info.factions);
  const moved = order0.filter((n) => names.get(n)!.x !== Math.round(seats.get(n)!.x * 100) / 100);
  const crowded = [order0[2]!, order0[3]!, order0[8]!, order0[9]!];
  assert.ok(moved.length >= 2 && moved.every((n) => crowded.includes(n)), `only the two pairs at the top and the bottom move (${moved})`);
  for (const n of order0) assert.ok(Math.abs(names.get(n)!.y - seats.get(n)!.y - 7.6) < 0.01, `${n}: under their circle`);
  for (const [l, r] of [[order0[2]!, order0[3]!], [order0[9]!, order0[8]!]]) {
    assert.ok(names.get(l)!.x <= seats.get(l)!.x && names.get(r)!.x >= seats.get(r)!.x && names.get(r)!.x - names.get(l)!.x > seats.get(r)!.x - seats.get(l)!.x, `${l} and ${r} move apart`);
    // Their estimated ends no longer meet in the middle.
    assert.ok(names.get(l)!.x + (l.length * 1.2) / 2 <= names.get(r)!.x - (r.length * 1.2) / 2 + 0.01, `${l} and ${r} clear each other`);
  }
  // The next guest's circle stops a long name: its far end stays clear of it.
  // (At the top the names' line runs through the next circles' height; at the bottom it's below them.)
  for (const [n, outer, dir] of [[order0[2]!, order0[1]!, -1], [order0[3]!, order0[4]!, 1]] as const) {
    const end = names.get(n)!.x + (dir * n.length * 1.2) / 2;
    const edge = seats.get(outer)!.x - dir * NODE_RADIUS;
    assert.ok(dir < 0 ? end >= edge : end <= edge, `${n} stops short of ${outer}'s circle`);
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
  assert.match(h, /<text class="faction-label" data-faction="French Embassy"[^>]*><tspan x="[\d.-]+" dy="0">French<\/tspan><tspan x="[\d.-]+" dy="3\.2">Embassy<\/tspan><\/text>/, "the long name on two lines");
  assert.match(readFileSync("web/src/app.css", "utf8"), /\.faction-label:focus, \.faction-label:focus-visible \{ outline: none; \}\n\.faction-label:focus-visible \{ text-decoration: underline; \}/, "no focus box on a click; underlined by keyboard");
});

test("Il Notaio's box in the What you heard and saw column: over the dialogue, expanded; nothing selected, one line and no reading", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const h = game({ v, web: ["Lupo"] });
  const side = h.slice(h.indexOf('class="web-side"'));
  // In the column, after the dialogue (so it lies over it), expanded, with its label. The column is dialogue only
  // (Interface v0.5; TD v0.51): no connections, no events, which are Il Notaio's to tell.
  assert.match(side, /class="record-pane covered"><div class="record-scroll"><div class="record">/);
  assert.match(side, /<aside class="reading" data-state="expanded" role="button" aria-expanded="true"[^>]*data-hint="reading"/);
  assert.ok(side.indexOf('class="reading"') > side.indexOf('class="record"'), "the box over the dialogue");
  const column = side.slice(side.indexOf('class="record"'), side.indexOf('class="reading"'));
  assert.ok(!column.includes(`>${esc2(PLAYER.screen.web.saw)}<`) && !column.includes('class="connection') && !column.includes('class="saw"'), "dialogue only");
  const lupo = heardAndSaw(v, ["Lupo"], F).heard;
  assert.deepEqual([...column.matchAll(/<li data-line="(L\d+)"/g)].map((m) => m[1]), lupo.map((l) => l.id), "his lines in your presence, newest first, and nothing else");
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
  assert.match(css, /\.layout\.right-hidden \{ grid-template-columns: var\(--side-width\) minmax\(var\(--centre-min-folded\), 1fr\) var\(--right-strip-width\); \}/);
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
    assert.match(h, new RegExp(`<div class="midnight-line"><button class="fact link" data-fact="midnight"[^>]*><span class="fact-label">${esc(words.acts).replace(/[()]/g, "\\$&")}</span></button>`), `${c.name}: one act`);
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
  assert.match(none, /<span class="web-bar-group"><span class="web-bar-arrow" aria-hidden="true">▲<\/span><span class="web-bar-title">Web of Confidences<\/span><\/span>$/, "just the arrow and the title");
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

test("portraits select their guest wherever they appear, the player's own in the places too; their name and large portrait open their briefing", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const h = game({ v });
  const left = h.slice(h.indexOf('class="side left"'), h.indexOf('class="centre"'));
  // Who's with you, in your own place: a portrait button each, selecting.
  for (const p of v.state!.present) assert.match(left, new RegExp(`<button class="token" aria-label="${esc(p)}" aria-pressed="false" data-guest="${esc(p)}"[^>]*data-hint="roomToken"`), `${p}'s portrait selects`);
  // The player's own name and large portrait at the top: open the briefing, with the hover "Your briefing".
  // Interface v0.16: "You are …" over the role line (the public subtitle, until Characters writes a role), centred, with no "You" label.
  // Interface v0.19: the portrait beside the name and role; the name kept whole on its line.
  assert.match(left, new RegExp(`<button class="me-briefing"[^>]*aria-description="Your briefing" data-hint="myBriefing"><span class="portrait large"[^>]*>[^<]*</span><span class="name">You are <span class="me-name">${esc(F)}</span></span><span class="muted role">${esc(info.roster.find((r) => r.name === F)!.subtitle)}</span></button>`));
  assert.equal(PLAYER.screen.hints.myBriefing, "Your briefing");
  assert.doesNotMatch(left, /<div class="label">You<\/div>/, "no You label");
  // Their own portrait in the places selects them, like anyone's (Interface v0.16).
  assert.match(left, new RegExp(`<button class="token" aria-label="${esc(F)}" aria-pressed="false" data-guest="${esc(F)}"`), "the player's own portrait selects them");
  assert.match(game({ v, selected: { kind: "guest", name: F } }), new RegExp(`<section class="person look[^"]*" data-guest="${esc(F)}"`), "and the right panel shows their own card");
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
  assert.equal(rulesSectionFor(g.find((e) => e.term === "Errand")!, cards), null, "the primer has no section behind it: no link");
  assert.ok(g.filter((e) => e.term !== "Errand" && e.rules.length).every((e) => rulesSectionFor(e, cards) !== null), "every named section is one the primer has");
  // Interface v0.17: the pointers follow the player's rules' section names first, matched ignoring case.
  const own = playerRules(packValue("rules"), FULL_VALUES, { plotReward: true, living: 12 });
  const all = glossary(PACK_GLOSSARY as never, fakeDocs.tunables, "Florins", false);
  const opens = (term: string) => own[rulesSectionFor(all.find((e) => e.term === term)!, own)!]?.title;
  for (const t of ["Ballot", "Candidate", "Run-off", "Speeches", "/repent"]) assert.equal(opens(t), "Candidates and the Vote", t);
  for (const t of ["Move", "Round of mingling", "Council"]) assert.equal(opens(t), "Stages and Turns", t);
  assert.deepEqual(["Gonfaloniere", "Errand", "Florins", "/bribe", "France's payroll", "Midnight", "Colloquio", "Medici"].map(opens), ["The Evening", "Your Errand", "Money and Bribes", "Money and Bribes", "France's Payroll", "Midnight", "Conversations", "How to Win"]);
  assert.ok(all.filter((e) => e.rules.length).every((e) => rulesSectionFor(e, own) !== null), "every named section is one the player's rules have");
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
  const sides = (h: string) => [...h.matchAll(/<div class="modal-side (left|right)( empty)?"[^>]*>/g)].map((m) => `${m[1]}:${m[0].match(/data-deck="(\w+)"/)?.[1] ?? "none"}`);
  assert.deepEqual(sides(game({ v, deck: "briefing" })), ["left:none", "right:rules"]);
  assert.deepEqual(sides(game({ v, deck: "rules" })), ["left:briefing", "right:city"]);
  assert.deepEqual(sides(game({ v, deck: "city" })), ["left:rules", "right:glossary"]);
  assert.deepEqual(sides(game({ v, deck: "glossary" })), ["left:city", "right:none"]);
  const h = game({ v, deck: "glossary" });
  assert.deepEqual(missingWords(h), []);
  assert.match(h, /class="modal deck deck-glossary"/);
  assert.match(focused(h), /<input class="glossary-search" type="search"[^>]*data-hint="glossarySearch"/);
  assert.equal((focused(h).match(/class="glossary-entry"/g) ?? []).length, info.glossary!.length);
  assert.ok((focused(h).match(/data-hint="glossaryRules"/g) ?? []).length > 5, "More in the rules, where there's a section");
  // The modal in focus comes first in the page, then its neighbours.
  assert.ok(h.indexOf('class="modal deck deck-glossary"') < h.indexOf('class="modal-side left"') && h.indexOf('class="modal-side left"') < h.indexOf('class="modal-side right empty"'));
  // Interface v0.17: a side modal in two sizes, the same button either way. The whole neighbour is drawn as itself at its
  // start (the city's list), still: inert, hidden from a reader, under its own title; the paddle has the title and an arrow.
  const side = h.slice(h.indexOf('class="modal-side left"'), h.indexOf('class="modal-side right'));
  assert.match(side, /^class="modal-side left" data-deck="city" role="button" tabindex="0" aria-label="Back to the City" aria-description="Go back to the one before\." data-hint="modalPrevious"><div class="side-whole" inert="" aria-hidden="true"><div class="side-scaled"><div class="still-modal deck" data-deck="city"><header><span><\/span><h2>The City<\/h2><span><\/span><\/header>/);
  assert.match(side, /<div class="side-title">The City<\/div><\/div><div class="paddle" aria-hidden="true"><span class="paddle-title">The City<\/span><span class="paddle-arrow">‹<\/span><\/div><\/div>/);
  assert.doesNotMatch(side, /deck-close|class="modal /, "a still modal has no Close and isn't a dialog of its own");
  const still = (d: string, deck: string) => {
    const page = game({ v: withLore(v), deck, places: { briefing: 2, rules: 3, city: "L1", glossary: "payroll" } });
    return page.slice(page.indexOf(`class="still-modal deck" data-deck="${d}"`), page.indexOf('class="side-title"', page.indexOf(`class="still-modal deck" data-deck="${d}"`)));
  };
  // Each at its start, wherever it was left: the briefing's first card, the rules' buttons, the city's list, an empty glossary search.
  assert.match(still("briefing", "rules"), /<button class="tab on" aria-current="true"[^>]*>Who You Are<\/button>/);
  assert.doesNotMatch(still("rules", "city"), /<section class="rules-section open/);
  assert.equal((still("rules", "city").match(/<button class="rules-section"/g) ?? []).length, 10);
  assert.match(still("city", "rules"), /class="city-list fades"/);
  assert.doesNotMatch(still("city", "rules"), /class="city-entry/);
  assert.match(still("glossary", "city"), /<input class="glossary-search" type="search" readOnly="" placeholder="Search the glossary"[^>]*value=""/);
  for (const [d, deck] of [["briefing", "rules"], ["rules", "city"], ["city", "rules"], ["glossary", "city"]] as const) assert.doesNotMatch(still(d, deck), /more-below|class="[^"]*breathe/, `${d}: no More Below, nothing breathing`);
  // The four buttons, in the row's order.
  const left = h.slice(h.indexOf('class="buttons decks"'), h.indexOf('class="errand"'));
  assert.deepEqual([...left.matchAll(/data-hint="(\w+)"/g)].map((m) => m[1]), ["briefing", "rules", "city", "glossary"]);
  const css = readFileSync("web/src/app.css", "utf8");
  const theme = readFileSync("web/theme.css", "utf8");
  // The two sizes are a container query on the overlay's own width; the whole one is scaled to its room, never more than 80% of the modal in focus, and evenly blurred.
  assert.match(css, /\.modal-overlay \{ container-type: inline-size; container-name: modals;/);
  assert.match(css, /@container modals \(min-width: 1408px\) \{\s*\.modal-side \{ width: calc\(var\(--modal-width\) \* var\(--side-modal-scale\)\); height: calc\(var\(--deck-height\) \* var\(--side-modal-scale\)\);/);
  assert.match(css, /\.side-scaled \{[^}]*transform: scale\(var\(--side-modal-scale\)\);[^}]*filter: blur\(var\(--blur-side\)\); \}/);
  for (const t of ["--break-side-modals: 1408px", "--side-modal-most: 0.8", "--blur-side: 3.5px", "--blur-behind: 5px", "--paddle-width: 40px", "--paddle-height: calc(var(--deck-height) * 0.55)", "--radius-modal: 30px", "--modal-edge: clamp(24px, 3cqw, 64px)", "--motion-paddle-flash: 660ms", "--modal-row-min: calc(var(--modal-width) + (var(--paddle-width) + var(--modal-row-gap)) * 2)"]) assert.ok(theme.includes(`${t};`), t);
  assert.match(css, /\.modal-side\.flash \.paddle \{ background: var\(--accent\); color: var\(--accent-text\);/);
  // The hover's ring and accent title show only where there is hover, so a tap can't leave one stuck.
  assert.match(css, /@media \(hover: hover\) \{\s*\.modal-side:not\(\.empty\):not\(\.lit\):hover \{ box-shadow: 0 0 0 var\(--side-ring\) var\(--accent\); \}/);
  assert.match(css, /\.modal-overlay \{[^}]*backdrop-filter: blur\(var\(--blur-behind\)\); \}/, "the screen behind is softly blurred");
  assert.ok(!("summary" in PLAYER.screen.modalRow), "the one-line summaries went with v0.16's solid cards");
  // The focused modal's title is centred in its header, with Close at the right.
  assert.match(h, /<header><span><\/span><h2>Glossary<\/h2><button class="primary deck-close"[^>]*data-hint="close">Close<\/button><\/header>/);
  assert.match(css, /\.modal\.deck > header, \.still-modal > header \{[^}]*grid-template-columns: 1fr auto 1fr/);
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
  for (const t of ["--opening-comma", "--opening-sentence", "--opening-fade", "--opening-pause", "--tour-dim", "--motion-tour", "--z-tour"]) assert.match(theme, new RegExp(`${t}:`), t);
  // Interface v0.16: he writes a phrase at a time, split at commas and sentence ends, with a longer pause after a sentence.
  for (const p of NOTAIO_PACK.opening.paragraphs) assert.equal(phrases(p).join(""), p, "the phrases are the paragraph, whole");
  assert.deepEqual(phrases("I keep its record, as notaries do. He is called \"the Unfortunate\". Choose."), ["I keep its record, ", "as notaries do. ", "He is called \"the Unfortunate\". ", "Choose."]);
  assert.deepEqual(phrases(""), []);
  const t = (k: string) => parseFloat(theme.match(new RegExp(`${k}: (\\d+)ms`))![1]!);
  assert.ok(t("--opening-sentence") > t("--opening-comma"), "a longer pause after a sentence than after a comma");
  assert.match(readFileSync("web/src/app.css", "utf8"), /\.opening-phrase \{ animation: fade-in var\(--opening-fade\)/, "each phrase fades in");
  assert.match(readFileSync("web/src/app.css", "utf8"), /prefers-reduced-motion: reduce\)[^@]*\.opening-phrase \{ animation: none; \}/);
  assert.match(readFileSync("web/src/app.css", "utf8"), /prefers-reduced-motion: reduce\)[^@]*\.tour-spot \{ transition: none; \}/, "the spotlight jumps with reduced motion");
});

test("the tour: a card per step in Il Notaio's voice, in the doc's order, ending on Your briefing; Back, Skip tour, and Show me around; not on the server's first render", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  assert.doesNotMatch(game({ v }), /class="tour"/, "it starts in the browser, after the choice");
  assert.deepEqual(Object.keys(NOTAIO_PACK.tour.steps), ["sheet", "decks", "errand", "room", "stageBar", "conversation", "right", "web", "briefing"], "the doc's eight, then Your briefing");
  assert.equal(NOTAIO_PACK.tour.steps.briefing, "Start with your briefing.");
  assert.ok(NOTAIO_PACK.tour.steps.conversation!.endsWith(" The other guests think it's 1492, so modern talk will confuse them."), "Interface v0.16, The Tour, step 6: the message box's card keeps the warning (v0.14), shorter");
  Object.keys(NOTAIO_PACK.tour.steps).forEach((key, i) => {
    const h = game({ v, tourStep: i });
    assert.deepEqual(missingWords(h), [], key);
    const tour = h.slice(h.indexOf('<div class="tour"'));
    assert.match(tour, new RegExp(`^<div class="tour" data-step="${key}"`), key);
    assert.ok(tour.includes(`<p class="tour-text">${esc(NOTAIO_PACK.tour.steps[key]!)}</p>`), `${key}: its card, from notaio.json`);
    assert.match(tour, /<div class="tour-head"><span class="narrator-name"/, `${key}: in his name`);
    assert.ok(tour.includes(`${i + 1} of 9`));
    assert.match(tour, new RegExp(`<button class="secondary small"${i === 0 ? ' disabled=""' : ""}[^>]*data-hint="tourBack"`), `${key}: Back`);
    assert.match(tour, /data-hint="tourSkip">Skip Tour</, `${key}: Skip tour`);
  });
  assert.match(game({ v }), /<button class="switch tour-again"[^>]*data-hint="tourAgain">Show Me Around<\/button><button class="switch"/, "Show me around, beside the explanations' switch");
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.tour-card \{[^}]*background: var\(--hint-bg\)/, "styled like his hint");
});

test("Il Notaio's name, glossed wherever it shows: his notes, his hint, his reading; the words from notaio.json, his glossary entry starting the same", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const hover = `aria-description="${esc(NOTAIO_PACK.name.hover)}"`;
  const h = game({ v, web: ["Lupo"] });
  assert.match(h, new RegExp(`<div class="ln notaio" data-line="\\w+"><span class="sp"><span class="narrator-name" tabindex="0" data-narrator="" ${hover.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), "his notes in the stream");
  assert.match(h, /<button class="hint-head"[^>]*><span class="notaio-title"><span class="narrator-name"[^>]*>Il Notaio<\/span>, to You<\/span>/, "his hint");
  assert.match(h, /<div class="reading-head"><span class="notaio-title"><span class="narrator-name"[^>]*>Il Notaio<\/span>&#x27;s Reading<\/span><span class="notaio-toggle">Hide<\/span><\/div>/, "his reading");
  assert.equal(NOTAIO_PACK.name.hover, "Il Notaio: Italian for “the notary”. He records the evening and belongs to no faction.");
  assert.ok(info.glossary!.find((e) => e.term === "Il Notaio")!.text.startsWith(NOTAIO_PACK.name.gloss), "his glossary entry starts with the same gloss");
  assert.ok(NOTAIO_PACK.name.gloss.startsWith("Italian for"));
  assert.ok(!("orientation" in (info.words as object)) && !("start" in (info.words as { screen: object }).screen), "the start screen's words went with it");
});

// ---- CC-20261116-03 (#177): Interface v0.16's words, the left panel, and the world card ---------------------

/** Every word in a pack file a player can see: its values, without the `_comment` keys. */
const packWords = (file: string): string => JSON.stringify(JSON.parse(readFileSync(`setting/florence-1492/${file}`, "utf8"), (k, v) => (k.startsWith("_") ? undefined : v)));

test("Interface v0.16's words: secret conversations, payments from France, the Web of Confidences, plain directions, and Il Notaio's plain hints", () => {
  const s = PLAYER.screen;
  const rows: [unknown, string][] = [
    [s.withdrawals, "Secret Conversations"],
    [s.pensions, "Payments from France"],
    [s.private, "Secret"],
    [s.colloquio, "Secret conversation with {other}"],
    [s.withYouPrivately, "In a Secret Conversation with You"],
    [s.placeLine.colloquio, "In {place}, in secret with {other}"],
    [s.places.private, "Secret conversation: behind a closed door"],
    [s.move.colloquio, "Start a Secret Conversation…"],
    [s.seat.colloquio, "Start a Secret Conversation…"],
    [s.midnight.intro, "Choose your act for midnight."],
    [s.midnight.introTwo, "Choose one or two acts for midnight."],
    [s.errandCard.noReward, "Errands earn no extra act at midnight."],
    [s.pastStage.summaryTitle, "{notaio}'s Summary of This Stage"],
    [s.reading.title, "{notaio}'s Reading"],
    [s.input.waiting, "Your turn: speak or pass."],
    [s.input.answering, "{name} spoke to you. Answer or pass."],
    [s.input.closing, "{name} ended the conversation. Say a last word or pass."],
    [s.input.used, "You've already spoken this turn."],
    [s.input.held, "Your words will be said at the next pause."],
    [s.input.closed, "Make your choice above."],
    [s.youAre, "You are {name}"],
    [s.seat.allFull, "Every group is full."],
    [s.right.lookingAtSelf, "This Is You"],
    [s.right.youTag, "You"],
    [s.web.title, "Web of Confidences"],
    [s.right.openWeb, "Open in the Web of Confidences"],
    [s.opening.choose, "Choose Your Family"],
    [s.opening.fullGameOnly, "In the Full Game"],
    [(JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { refusals: Record<string, string> }).refusals.end_mistimed, "There's no secret conversation for you to end."],
  ];
  for (const [have, want] of rows) assert.equal(have, want);
  // The examples: two lines, a comma before "or".
  assert.equal(s.input.examples.length, 4);
  for (const e of s.input.examples as { text: string }[]) assert.match(e.text, /^Speak as your character would…\n“@\{guest\} [^”]+”, or “\{command\}[^”]*”$/, e.text);
  assert.ok((s.input.examples as { text: string }[]).some((e) => e.text.includes("My family never forgets, and rarely forgives")));
  // No "Web of Secrets" a player can see, in either file; the glossary's term is renamed, and Colloquio stays the game's word.
  for (const f of ["player.json", "notaio.json"]) assert.doesNotMatch(packWords(f), /Web of Secrets/, f);
  assert.ok(PACK_GLOSSARY.some((g) => g.term === "Web of Confidences" && g.match.includes("Web of Confidences")));
  assert.match(PACK_GLOSSARY.find((g) => g.term === "Colloquio")!.text, /^A secret conversation between two guests\./);
  assert.match(PACK_GLOSSARY.find((g) => g.term === "/bribe")!.text, /the guest you're in a secret conversation with/);
  assert.match(PACK_GLOSSARY.find((g) => g.term === "Move")!.text, /or start a secret conversation\.$/);
  assert.match(PACK_GLOSSARY.find((g) => g.term === "Round of mingling")!.text, /start secret conversations\.$/);
  // "Call aside", "withdrawn", and "a private word" are gone from what the player is told (his notes to the room keep their register).
  assert.doesNotMatch(JSON.stringify(JSON.parse(packWords("player.json")).screen), /call(ed)? aside|withdrawn|private word|private talk|He may be wrong/i);
  // Il Notaio's hints, plain.
  assert.equal(NOTAIO.hints.mingling, "You're with other guests. Speak when it's your turn, or pass. Hover over anything to see what it does.");
  assert.equal(NOTAIO.hints.seat, "Your secret conversation is over. Choose where to go next.");
  assert.equal(NOTAIO.hints.colloquio, "You're in a secret conversation with {other}. No one else can hear you, but everyone saw you leave.");
  assert.doesNotMatch(JSON.stringify(NOTAIO.hints), /private word|withdrawn|draw someone aside/);
  // The explanations: the doc's table; `nextMove` and `generate` wait with their features (#177, items 4 and 4b).
  const hints = Object.keys(s.hints).filter((k) => !k.startsWith("_"));
  // Interface v0.19 adds panelRetry (a failed panel's Try Again).
  assert.equal(hints.length, 93);
  assert.equal(s.hints.webSide, "What you heard and saw, and your notes. Click to open or close.", "new in Interface v0.17");
  for (const k of ["factLink", "lookingAtSelf"]) assert.ok(hints.includes(k), k);
  for (const k of ["nextMove", "generate"]) assert.ok(!hints.includes(k), k);
  assert.equal(s.hints.end, "End this secret conversation. The other guest gets a last word.");
  assert.equal(s.hints.resize, "Drag to resize. Drag all the way in to hide.");
});

test("each line of the sheet opens the rules where it's explained (Interface v0.16): by its glossary word, from the pack; the glossary if no section explains it", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const rules = rulesOf(v);
  const links = PLAYER.screen.factLinks as Record<string, string>;
  assert.deepEqual(Object.keys(links).filter((k) => !k.startsWith("_")), ["purse", "pensions", "withdrawals", "midnight", "errand"]);
  for (const k of ["purse", "pensions", "withdrawals", "midnight"]) {
    const l = factLink(links[k], info.glossary!, rules);
    assert.equal(l?.deck, "rules", k);
    const entry = info.glossary!.find((g) => g.term === links[k])!;
    assert.ok(l?.deck === "rules" && entry.rules.map((t) => t.toLowerCase()).includes(rules[l.section]!.title.toLowerCase()), `${k}: the section behind ${links[k]}`);
  }
  // A word with no section behind it opens in the glossary; an unknown word leads nowhere.
  const primer = rulesCards(v.sheet!.rules);
  assert.deepEqual(factLink("Errand", info.glossary!, primer), { deck: "glossary", search: "Errand" });
  assert.equal(factLink("no such word", info.glossary!, rules), null);
  assert.equal(rulesLink("Errand", info.glossary!, primer), null, "the primer has no section on errands");
  assert.equal(primer[rulesLink("Midnight", info.glossary!, primer)!]!.title, "Midnight", "so there the reward line opens Midnight");
  // Interface v0.17: the player's rules have Your Errand, so the errand's reward line opens it.
  assert.equal(rules[rulesLink("Errand", info.glossary!, rules)!]!.title, "Your Errand");
  // On the screen: the labels, each a button with the explanation; before the sheet arrives, plain lines.
  const h = game({ v });
  for (const [k, label] of [["purse", "Purse"], ["pensions", "Payments from France"], ["withdrawals", "Secret Conversations"]]) assert.match(h, new RegExp(`<button class="fact link" data-fact="${k}" aria-description="Click for the rules on this\\." data-hint="factLink"><span class="fact-label">${label}</span><span class="fact-value">`), k);
  assert.doesNotMatch(game({ v: derive([]) }), /class="fact link"/);
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /button\.fact:hover \.fact-label[^{]*\{[^}]*text-decoration: underline/, "they underline on hover");
});

test("the errand card shows just the task (Interface v0.16): cut after its bold part; its card in the briefing is found by its own words", () => {
  const briefings = castBriefings(fakeDocs);
  const f = errandText(briefings[F]!);
  assert.equal(errandTask(f), "This comes first: it is what you came for. Before the last council before midnight, **give Friar Tommaso at least 3 Florins in total**, in one gift or several.");
  for (const [name, b] of Object.entries(briefings)) {
    const errand = errandText(b!);
    const task = errandTask(errand);
    assert.ok(errand.startsWith(task.slice(0, -1)) && task.length <= errand.length, name);
    assert.match(task, /\*\*[^*]+\*\*/, `${name}: the task keeps its bold part`);
    assert.match(task, /[.!?](\*\*)?$/, `${name}: it ends on a full stop`);
    // The errand's card in the briefing, by the errand's own words.
    const cards = briefingCards(b!);
    assert.equal(cards[errandCardAt(cards, errand)]!.title, "Your errand tonight", name);
  }
  assert.equal(errandTask("Find the letter."), "Find the letter.", "no bold part: the whole errand");
  assert.equal(errandCardAt([], "x"), 0);
});

test("hovers about the world are a light card, apart from the dark explanations; its looks are theme tokens, light and dark", () => {
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.tip\.world \{[^}]*background: var\(--world-bg\)[^}]*color: var\(--world-text\)[^}]*var\(--world-border\)[^}]*box-shadow: var\(--shadow-world\)/);
  const theme = readFileSync("web/theme.css", "utf8");
  const dark = theme.slice(theme.indexOf("prefers-color-scheme: dark"));
  for (const t of ["--world-bg", "--world-text", "--world-border", "--shadow-world"]) {
    assert.match(theme.slice(0, theme.indexOf("prefers-color-scheme: dark")), new RegExp(`${t}: `), `${t}, light`);
    assert.match(dark, new RegExp(`${t}: `), `${t}, dark`);
  }
  // The explanations' switch governs only the explanations: nothing in the styles or the code stills motion by it.
  assert.doesNotMatch(css, /hints-off|explanations-off/);
});

// ---- CC-20261116-04 (#177): Interface v0.16's centre, decision cards, commands, and right panel -------------

const COMMANDS = Object.entries((JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { commands: Record<string, { name: string; usage: string; hint: string }> }).commands)
  .filter(([k]) => !k.startsWith("_"))
  .map(([action, c]) => ({ action, ...c }));

test("the command menu lists every command the character can ever use (Interface v0.16): what's open first, the rest with their reasons, worked out from the player's own state", async () => {
  const { at } = await playedLog();
  const group = derive(at["speak:capannello"]!);
  const aside = derive(at["speak:colloquio"]!);
  assert.equal(COMMANDS.length, 7);
  // In a group, with a full purse: /bribe waits for a secret conversation, the midnight acts for midnight, and a
  // conclusion is for an errand that asks the player to find something out (Francesco's doesn't).
  assert.equal(group.state!.knowledgeErrand, false);
  const g = commandMenu(COMMANDS, group.commands, group.state, null);
  assert.deepEqual(g.open.map((c) => c.action), group.commands.filter((c) => c.action !== "conclude").map((c) => c.action), "what the engine allows now, in its order");
  const why = (m: ReturnType<typeof commandMenu>) => Object.fromEntries(m.closed.map((c) => [c.command.action, c.why]));
  assert.deepEqual(why(g), { bribe: "colloquio", kill: "midnight", guard: "midnight", investigate: "midnight", conclude: "conclude" });
  assert.equal(g.open.length + g.closed.length, COMMANDS.length, "every command, once");
  // In a secret conversation /bribe is open; with an empty purse it isn't, and the reason says so.
  assert.ok(commandMenu(COMMANDS, aside.commands, aside.state, null).open.some((c) => c.action === "bribe"));
  const broke = { ...aside.state!, florins: 0 };
  const b = commandMenu(COMMANDS, aside.commands.filter((c) => c.action === "conclude"), broke, 3);
  assert.deepEqual(why(b), { bribe: "noFlorins", borrow: "notNow", repay: "repay", kill: "midnight", guard: "midnight", investigate: "midnight", conclude: "conclude" });
  // Without the game's values (a server before TD v0.52's sheet.values), /repay's reason can't name its amount.
  assert.equal(commandWhy("repay", broke, null), "notNow");
  assert.equal(payrollSize({ ...group, sheet: { ...group.sheet!, values: undefined } }), null);
  // With them (TD v0.52), it does: one payroll payment's size, the engine's own tunable.
  assert.equal(payrollSize(group), fakeDocs.tunables.pension_size);
  assert.equal(payrollSize({ ...group, sheet: { ...group.sheet!, values: { payroll: 3 } } }), 3);
  const brokeView = { ...aside, state: broke, commands: aside.commands.filter((c) => c.action === "conclude") };
  assert.equal(commandMenu(COMMANDS, brokeView.commands, broke, payrollSize(brokeView)).closed.find((c) => c.command.action === "repay")!.why, "repay");
  assert.equal(game({ v: brokeView }) && w("screen.commandWhy.repay", { amount: payrollSize(group)! }), `You need ${fakeDocs.tunables.pension_size} Florins to pay one back.`, "the reason reads right with the engine's value");
  // An errand a conclusion can finish keeps /conclude open; an engine that doesn't send the flag does too.
  assert.ok(commandMenu(COMMANDS, group.commands, knowing(group).state, null).open.some((c) => c.action === "conclude"));
  const { knowledgeErrand: _, ...older } = group.state!;
  assert.ok(commandMenu(COMMANDS, group.commands, older as View["state"], null).open.some((c) => c.action === "conclude"));
  // The engine's own reasons, once it sends them (Technical Design's handoff), are used as they are.
  const sent = [...group.commands, { action: "bribe", name: "/bribe", usage: "/bribe @Name n", hint: "", available: false, reason: "The engine's reason." }];
  assert.equal(commandMenu(COMMANDS, sent, group.state, null).closed.find((c) => c.command.action === "bribe")!.reason, "The engine's reason.");
  // Every reason has its words, and the section's heading counts them.
  const words = PLAYER.screen.commandWhy as Record<string, string>;
  for (const k of ["colloquio", "noFlorins", "repay", "midnight", "conclude", "notNow"]) assert.ok(words[k]!.length > 10, k);
  assert.equal(words.more, "Not available now ({n})");
  // The placeholder's example uses only what's open now.
  assert.doesNotMatch(game({ v: group }), /placeholder="[^"]*\/conclude/);
});

test("a refused command is explained by Il Notaio in his hint (Interface v0.16): its specific reason, in place of the notice above the box; anything else, the game's own reason", async () => {
  const { at } = await playedLog();
  const group = derive(at["speak:capannello"]!);
  const refused = (input: string | null, reason: string): View => ({ ...group, refusal: { seq: group.activity + 1, reason, input } });
  const words = PLAYER.screen.notaioRefusal as Record<string, string>;
  // The refusal's input reaches the view from the player's own log.
  const log = [...at["speak:capannello"]!, { type: "refusal", seq: 9999, reason: "/bribe can't be used now.", input: "/bribe @Lupo 2" } as unknown as Ev];
  assert.deepEqual(derive(log).refusal, { seq: 9999, reason: "/bribe can't be used now.", input: "/bribe @Lupo 2" });
  assert.equal(refusedCommand("/BRIBE @Lupo 2", COMMANDS)!.action, "bribe");
  assert.equal(refusedCommand("Good evening", COMMANDS), null);
  assert.equal(refusedCommand(null, COMMANDS), null);
  // /bribe in a group: money only changes hands in a secret conversation.
  const bribe = refused("/bribe @Lupo 2", "/bribe can't be used now.");
  assert.equal(refusalWhy(bribe, COMMANDS)!.why, "colloquio");
  const h = game({ v: bribe });
  const hint = h.slice(h.indexOf('class="notaio-hint'), h.indexOf("</aside>", h.indexOf('class="notaio-hint')));
  assert.ok(hint.includes(`data-moment="refusal">${esc(words.colloquio!.replace("{command}", "/bribe"))}</p>`), hint);
  assert.doesNotMatch(h.slice(h.indexOf('class="input"')), /class="notice"/, "no notice above the box");
  // A midnight act typed early; an open command with something else wrong (the game's reason, then where to look).
  assert.equal(refusalWhy(refused("/kill @Lupo", "x"), COMMANDS)!.why, "midnight");
  const other = refused("/borrow now", "There's no guest here called now.");
  assert.equal(refusalWhy(other, COMMANDS)!.why, "other");
  assert.ok(game({ v: other }).includes(`data-moment="refusal">${esc("There's no guest here called now. Type / to see what you can do now.")}</p>`));
  // Something that wasn't a command (a line too long): the game's reason alone.
  assert.equal(refusalWhy(refused("a very long line", "That's 600 characters; keep it to 500."), COMMANDS), null);
  assert.ok(game({ v: refused("a very long line", "That's 600 characters; keep it to 500.") }).includes(`data-moment="refusal">${esc("That's 600 characters; keep it to 500.")}</p>`));
  for (const k of ["colloquio", "noFlorins", "repay", "midnight", "conclude", "other"]) assert.ok(words[k]!.length > 10, k);
  // His box flashes and the new words fade in: theme tokens, and still with reduced motion.
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.hint-glow \{[^}]*animation: hint-flash var\(--motion-flash\)/);
  assert.match(css, /\.hint-text\.fresh \{[^}]*animation: fade-in/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.hint-glow, \.hint-text\.fresh \{ animation: none; \}/);
  assert.doesNotMatch(game({ v: group }), /hint-glow|hint-text fresh/, "nothing flashes on the first render");
});

test("decision cards take the message box's place (Interface v0.16): in the bottom card, not the conversation; the seat card says when every group is full", async () => {
  const { at } = await playedLog();
  for (const k of ["move", "seat", "midnight"]) {
    if (!at[k]) continue;
    const h = game({ v: derive(at[k]!) });
    assert.deepEqual(missingWords(h), [], k);
    assert.match(h, /<div class="input decision"><div class="card">/, `${k}: the card is in the box's place`);
    assert.equal((h.match(/class="card"/g) ?? []).length, 1, k);
    if (k !== "seat") assert.match(h, /<button class="primary confirm"/, `${k}: the confirm button`);
  }
  // The seat card: with no group to join, "Every group is full." under its question.
  const base = derive(at.move!);
  const seat = (groups: { members: string[]; room: number }[]): View => ({ ...base, pending: { id: "r1", kind: "seat", options: { form: "invitee", initiator: "Lupo", groups, colloquio: ["Giorgia Pazzi"], wait: true } } });
  const full = game({ v: seat([]) });
  assert.match(full, /<h3[^>]*>[^<]*<\/h3><p class="muted card-note">Every group is full\.<\/p>/);
  assert.doesNotMatch(game({ v: seat([{ members: ["Giorgia Pazzi"], room: 2 }]) }), /Every group is full/);
  // The controls, tidied: the theme's field height and arrow, the act narrow, the confirm at the right.
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\nselect \{[^}]*appearance: none[^}]*height: var\(--field-height\)[^}]*font-size: var\(--text-sm\)/);
  assert.match(css, /\.card button\.confirm \{[^}]*align-self: flex-end/);
  assert.match(css, /\.act \.act-kind \{[^}]*width: var\(--act-kind-width\)/);
  assert.match(css, /\.card h3, \.card \.card-note \{ margin: 0; \}/);
  assert.match(css, /\.input\.decision \{[^}]*max-height: var\(--decision-max-height\)[^}]*overflow-y: auto/, "a tall card scrolls within that space");
});

test("the floating cards and the right panel (Interface v0.16): layer shadows, the conversation's fade, your own card, and the looks as theme tokens", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const css = readFileSync("web/src/app.css", "utf8");
  const theme = readFileSync("web/theme.css", "utf8");
  assert.match(css, /\.conv-head \{[^}]*border-radius: var\(--radius-float\)[^}]*box-shadow: var\(--shadow-float-down\)/);
  assert.match(css, /\n\.input \{[^}]*border-radius: var\(--radius-float\)[^}]*box-shadow: var\(--shadow-up\)/);
  assert.match(css, /\.notaio-hint \{[^}]*box-shadow: var\(--shadow-up\)/);
  assert.match(css, /\.stream \{[^}]*mask-image: var\(--stream-mask\)/, "the conversation fades at its top and bottom edges");
  assert.match(css, /\.field textarea\.empty \{ overflow: hidden; \}/, "no scrollbar on the empty box");
  assert.match(game({ v }), /<textarea class="empty"/);
  for (const t of ["--shadow-float-down", "--shadow-up"]) assert.equal((theme.match(new RegExp(`${t}: `, "g")) ?? []).length, 2, `${t}: light and dark`);
  for (const t of ["--float-gap", "--radius-float", "--stream-fade", "--stream-mask", "--return-width", "--right-top-gap", "--right-hide-past", "--right-hiding-opacity", "--self-edge"]) assert.match(theme, new RegExp(`${t}: `), t);
  // The right panel stops short of the top, with rounded top corners; a drag past its narrowest fades it.
  assert.match(css, /\.side\.right \{[^}]*margin-top: var\(--right-top-gap\)[^}]*border-radius: var\(--radius-panel\) var\(--radius-panel\) 0 0/);
  assert.match(css, /\.side\.right\.hiding \{ opacity: var\(--right-hiding-opacity\); \}/);
  // Your own card: "This is you", a "You" tag under your name, an accent edge, and its own explanation.
  const own = game({ v, selected: { kind: "guest", name: F } });
  const card = own.slice(own.indexOf('<section class="person look self"'));
  assert.match(card, /^<section class="person look self" data-guest="Francesco Pazzi"><header class="person-head"><span class="label" aria-description="Your own card: what everyone knows about you\." data-hint="lookingAtSelf" tabindex="0">This Is You<\/span>/);
  // Interface v0.19: the portrait, name, and You tag stay put together; the subtitle follows them.
  assert.match(card, /<div class="name">Francesco Pazzi<\/div><div class="you-tag">You<\/div><\/div><div class="muted card-subtitle">/);
  // Its accent edge round the sides and top, not along the bottom (Interface v0.19).
  assert.match(css, /\.person\.look\.self \{ border: var\(--self-edge\) solid var\(--accent\); border-bottom: none; \}/);
  // No card repeats the faction above the subtitle: the name, then the subtitle.
  const other = game({ v, selected: { kind: "guest", name: "Lupo" } });
  const lupo = info.roster.find((r) => r.name === "Lupo")!;
  assert.ok(other.includes(`<div class="name">Lupo</div></div><div class="muted card-subtitle">${esc(lupo.subtitle)}</div>`));
  assert.doesNotMatch(other, /class="person look self"|you-tag/);
});

// ---- CC-20261116-05 (#177): Interface v0.16's modals ------------------------------------------------------

test("the briefing is five cards for the player (Interface v0.16): the AI guests' cards left out, the short ones merged, from the setting pack; the briefing text unchanged", async () => {
  const skips = PLAYER.screen.decks.playerSkips;
  const merges = PLAYER.screen.decks.playerMerges;
  assert.deepEqual(skips, ["How you speak", "Resources", "Social awareness"]);
  assert.deepEqual(merges, [
    { title: "What You Want", cards: ["Your faction", "Other goals (your own reasons)"], subheadings: ["Your Own Reasons"] },
    { title: "What You Know", cards: ["What you know", "Your secrets (private)"], subheadings: ["Keep to Yourself"] },
  ]);
  for (const [name, b] of Object.entries(castBriefings(fakeDocs))) {
    const all = briefingCards(b!);
    const cards = playerBriefing(all, skips, merges);
    assert.deepEqual(cards.map((c) => c.title), ["Who you are", "Your errand tonight", "What You Want", "What You Know", "Relationships"], name);
    const text = (t: string) => all.find((c) => c.title === t)!.text;
    assert.equal(cards[2]!.text, `${text("Your faction")}\n\n**Your Own Reasons**\n${text("Other goals (your own reasons)")}`, `${name}: the faction's aims, then Your own reasons`);
    assert.equal(cards[3]!.text, `${text("What you know")}\n\n**Keep to Yourself**\n${text("Your secrets (private)")}`, `${name}: what you know, then Keep to yourself`);
    for (const t of (skips as string[]).filter((x) => all.some((c) => c.title === x))) assert.ok(!cards.some((c) => c.text.includes(text(t))), `${name}: ${t} is left out`);
    assert.equal(cards[errandCardAt(cards, errandText(b!))]!.title, "Your errand tonight", `${name}: the errand card opens the briefing at the errand`);
  }
  // No pack lists (another setting, or a malformed one): the briefing's own cards.
  const all = briefingCards(castBriefings(fakeDocs)[F]!);
  assert.deepEqual(playerBriefing(all, undefined, undefined), all);
  assert.deepEqual(playerBriefing(all, "x", [{ title: 3 }, null]), all);
  // On the screen: five tabs, the merged card with its subheading in bold; no setting term in the screen's code decides it.
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const h = game({ v, deck: "briefing" });
  const modal = focused(h);
  // Interface v0.17: the tabs are in title case on the screen; the briefing's own headings are unchanged.
  assert.deepEqual([...modal.matchAll(/data-hint="deckTab">([^<]*)</g)].map((m) => m[1]), ["Who You Are", "Your Errand Tonight", "What You Want", "What You Know", "Relationships"]);
  assert.match(modal, /1 of 5/);
  assert.equal(v.sheet!.briefing, castBriefings(fakeDocs)[F], "the briefing text itself is unchanged");
  assert.doesNotMatch(noComments(readFileSync("web/src/App.tsx", "utf8")) + noComments(readFileSync("web/src/model.ts", "utf8")), /How you speak|Social awareness|Your own reasons|Keep to yourself/i);
});

test("the modals' chained footers (Interface v0.16): Previous and Next worded for what each holds, On to and Back to at the ends, Close filled at the chain's end, and the motion's tokens", async () => {
  const { at } = await playedLog();
  const v = withLore(derive(at["speak:capannello"]!));
  const foot = (h: string) => {
    const m = focused(h);
    const f = m.slice(m.indexOf('<footer class="deck-foot"'), m.indexOf("</footer>"));
    return [...f.matchAll(/<button class="([^"]*)"[^>]*data-hint="(\w+)">([^<]*)</g)].map((x) => `${x[1]}|${x[2]}|${x[3]}`);
  };
  // The briefing's first card: nothing before it (the start of the chain); Next briefing.
  assert.deepEqual(foot(game({ v, deck: "briefing" })), ["secondary deck-next|deckCard|Next Briefing →"]);
  // The rules open on their buttons: Back to Your briefing, and First rule.
  assert.deepEqual(foot(game({ v, deck: "rules" })), ["secondary deck-prev|modalPrevious|Back to Your Briefing", "secondary deck-next|deckCard|First Rule →"]);
  // The city's list: Back to The rules, and First topic.
  assert.deepEqual(foot(game({ v, deck: "city" })), ["secondary deck-prev|modalPrevious|Back to the Rules", "secondary deck-next|deckCard|First Topic →"]);
  // The glossary, the end of the chain: only the way back to The city, and Close fills in.
  const g = game({ v, deck: "glossary" });
  // Interface v0.17: opened straight from the chat, not walked to from The City, it has nowhere further to go, so its way back breathes.
  assert.deepEqual(foot(g), ["secondary deck-prev breathe|modalPrevious|Back to the City"]);
  assert.match(g, /<button class="primary deck-close"/);
  assert.match(game({ v, deck: "rules" }), /<button class="secondary deck-close"/);
  // The words, from the pack.
  const s = PLAYER.screen;
  assert.deepEqual([s.decks.previousBriefing, s.decks.nextBriefing], ["← Previous Briefing", "Next Briefing →"]);
  assert.deepEqual([s.rulesModal.previous, s.rulesModal.next, s.rulesModal.first, s.rulesModal.overview], ["← Previous Rule", "Next Rule →", "First Rule →", "← The Rules"]);
  assert.deepEqual([s.cityList.first, s.cityList.previous, s.cityList.next], ["First Topic →", "← Previous Topic", "Next Topic →"]);
  assert.deepEqual([s.modalRow.previous, s.modalRow.next], ["Back to {title}", "On to {title}"]);
  // Motion is subtle: 24 and 48 pixels, 97%, 300 ms; nothing slides with reduced motion; the breathing outline is a token.
  const theme = readFileSync("web/theme.css", "utf8");
  for (const t of ["--swipe-distance: 24px", "--modal-slide: 48px", "--grow-from: 0.97", "--motion-modal: 300ms"]) assert.ok(theme.includes(t), t);
  for (const t of ["--breathe-colour", "--rules-backdrop"]) assert.equal((theme.match(new RegExp(`${t}: `, "g")) ?? []).length, 2, `${t}: light and dark`);
  const css = readFileSync("web/src/app.css", "utf8");
  assert.match(css, /\.deck-card \{[^}]*animation: swipe-in var\(--motion-modal\)/);
  assert.match(css, /\.deck-card\.from-left, \.city-entry\.from-left, section\.rules-section\.from-left \{ animation-name: swipe-in-left; \}/, "going back, cards slide in from the left");
  assert.match(css, /\.modal\.from-left \{ animation: row-from-left var\(--motion-modal\)/);
  assert.match(css, /\.breathe \{ animation: breathe var\(--motion-breathe\)/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.deck-card \{ animation: none; \}\s*\.breathe \{ animation: none;/);
  // The rules: the buttons stay in view, and a section opens as a card over them.
  assert.match(css, /\.rules-over \{[^}]*position: absolute[^}]*inset: 0/);
});

// ---- CC-20261116-06 (#177): Interface v0.16's Web of Confidences, opening, and tour -------------------------

test("the Web of Confidences' looks and the opening's choice (Interface v0.16): the dock's shadows and slide, the Secret row, the scaling key and side column, and the full game's other character greyed out", async () => {
  const css = readFileSync("web/src/app.css", "utf8");
  const theme = readFileSync("web/theme.css", "utf8");
  // The dock: the top layer, a deep shadow that grows when open, sliding over 600 ms; with reduced motion it doesn't slide.
  assert.match(css, /\.web-dock \{[^}]*z-index: var\(--z-dock\)[^}]*box-shadow: var\(--shadow-dock\)[^}]*transition: height var\(--motion-dock\)/);
  assert.match(css, /\.web-dock\.open \{[^}]*box-shadow: var\(--shadow-dock-open\)/);
  assert.match(css, /prefers-reduced-motion: reduce\) \{\s*\.web-dock \{ transition: none; \}/);
  assert.match(theme, /--motion-dock: 600ms/);
  for (const t of ["--shadow-dock", "--shadow-dock-open"]) assert.equal((theme.match(new RegExp(`${t}: `, "g")) ?? []).length, 2, `${t}: light and dark`);
  const z = (k: string) => Number(theme.match(new RegExp(`${k}: (\\d+)`))![1]);
  assert.ok(z("--z-dock") > z("--z-float") && z("--z-dock") > z("--z-menu"), "over the floating cards");
  // The side column is about 28% of the window; the key scales from 0.8 to 1.45 times its size at 1440 pixels.
  // Interface v0.17: the side column from 280 to 480px, about 28% of the web's own width; the key no larger than at a 1440-pixel window.
  assert.match(theme, /--web-side-width: clamp\(280px, 28cqw, 480px\)/);
  assert.match(theme, /--key-text: clamp\(0\.65rem, 0\.903vw, 0\.8125rem\)/);
  assert.match(css, /\.web-key \{[^}]*position: absolute[^}]*font-size: var\(--key-text\)/, "over the drawing's top-left corner, scaling as one");
  // The selected ring, twice the plain line's width; a thin dashed ring for keyboard focus, no focus box.
  const num = (k: string) => Number(theme.match(new RegExp(`${k}: ([\\d.]+)`))![1]);
  assert.ok(num("--node-ring-on") >= num("--edge-width-on") * 2);
  assert.match(css, /\.node:focus, \.node:focus-visible \{ outline: none; \}/);
  assert.match(css, /\.node:focus-visible circle \{[^}]*stroke-dasharray: var\(--node-focus-dash\)/);
  assert.match(css, /\.edge\.sel-off, \.edge-under\.sel-off \{ stroke-opacity: var\(--edge-dim\); \}/);
  // On the screen: the key's seven rows, the last "Secret" with its description; a selection fades the lines that don't touch it.
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const h = game({ v, web: ["Lupo"] });
  const keyRows = [...h.matchAll(/<button class="key-type[^"]*" aria-pressed="(true|false)" data-type="([^"]+)"/g)].map((m) => m[2]);
  assert.deepEqual(keyRows, [...info.relationshipTypes!.map((t) => t.type), "*secret"]);
  assert.match(h, /<span class="key-secret-words"><span>Secret<\/span><span class="key-covers">A tie no other guest knows of\. Ties everyone knows are drawn plain\.<\/span><\/span>/);
  const ties = [...h.matchAll(/<g class="tie" data-type="[^"]*" data-between="([^"]*)"[^>]*>(.*?)<\/g>/g)];
  assert.ok(ties.length > 10);
  for (const [, between, inner] of ties) assert.equal(/sel-off/.test(inner!), !between!.split("|").includes("Lupo"), between);
  const lit = game({ v, web: [], keyType: "*secret" });
  assert.equal((lit.match(/class="edge rel-[\w-]+ yours key-on"/g) ?? []).length, 3, "the Secret row lights the secret ties");
  // An empty pair says why.
  assert.ok(game({ v, web: ["Lupo", "Contessa Isabella"] }).includes(esc("You haven't yet heard Lupo or Contessa Isabella speak to the other. Only what one says to the other shows here.")));
  // His reading opens a seventh of the way down, the column behind it faded.
  assert.match(theme, /--reading-top: 14\.3%/);
  assert.match(css, /\.record-pane > \.reading \{[^}]*top: var\(--reading-top\)[^}]*box-shadow: var\(--shadow-up\)/);
  assert.match(css, /\.record-pane\.covered \.record-scroll > \* \{ opacity: var\(--behind-opacity\); \}/);
  // The opening's choice: the setting's playable characters not in this game, greyed out after the playable one, with no button.
  assert.deepEqual(info.fullGameOnly, [{ name: "Piero de' Medici" }], "from the pack's playable list, not a name in the code");
  assert.deepEqual(screenInfo(settingPack().playable as CharacterName[], castBriefings(fakeDocs), { tunables: fakeDocs.tunables, minigame: true }).fullGameOnly, [], "none when every playable character is in the game");
  const opening = html(createElement(Opening, { onStart: () => {}, written: true }));
  assert.match(opening, /<h2>Choose Your Family<\/h2>/);
  const locked = opening.slice(opening.indexOf('class="start-card locked"'));
  assert.ok(opening.indexOf('class="start-card locked"') > opening.indexOf('data-hint="play"'), "after the playable one");
  assert.match(locked, /^class="start-card locked" data-guest="Piero de&#x27; Medici" aria-disabled="true">/);
  assert.match(locked, /<div class="locked-label">In the Full Game<\/div>/);
  assert.doesNotMatch(locked, /<button/);
  // After a skipped tour, Your Briefing breathes, filled in with the accent (Interface v0.17; an outline in v0.16).
  assert.match(readFileSync("web/src/App.tsx", "utf8"), /nudge && d === DECKS\[0\] \? "primary breathe" : "secondary"/);
});

// ---- CC-20261116-07 (#179, part 1): Interface v0.17–v0.18's title case and the player's own rules; TD v0.52's values ----

test("title case (Interface v0.17–v0.18): every word but the pack's small ones, which open, close, or follow a colon in capitals; arrows aren't words; the rule and its words are the pack's", () => {
  const rule = titleRule(packValue("titleCase"));
  assert.equal(rule.on, true);
  assert.deepEqual(rule.small, ["a", "an", "the", "and", "but", "or", "nor", "for", "of", "on", "in", "to", "at", "by", "with", "as", "from", "into", "per", "vs", "de'", "di", "d'", "da", "del", "della"]);
  const rows: [string, string][] = [
    ["Your briefing", "Your Briefing"],
    ["The first round of mingling", "The First Round of Mingling"],
    ["The first round of mingling, early", "The First Round of Mingling, Early"],
    ["Back to The rules", "Back to the Rules"],
    ["On to The city", "On to the City"],
    ["Talking with", "Talking With"],
    ["Payments from France", "Payments from France"],
    ["Explanations: on", "Explanations: On"],
    // v0.18: only words with letters count as first or last, so an arrow isn't one.
    ["← The rules", "← The Rules"],
    ["← the rules", "← The Rules"],
    ["Next rule →", "Next Rule →"],
    ["The last Pazzi council", "The Last Pazzi Council"],
    // A name's own particles stay lower case inside it; words already carrying capitals keep them, as does what's in capitals.
    ["Lorenzo de' Medici", "Lorenzo de' Medici"],
    ["the house of d'Este", "The House of d'Este"],
    ["LeNoir and the FBI", "LeNoir and the FBI"],
    ["{notaio}, to you", "{notaio}, to You"],
    ["Your extra act (for your errand)", "Your Extra Act (for Your Errand)"],
    ["1478", "1478"],
    ["", ""],
  ];
  for (const [from, to] of rows) assert.equal(titleCase(from, rule), to, from);
  // A pack in another language turns the rule off, or empties its list.
  assert.equal(titleCase("Back to The rules", { on: false, small: rule.small }), "Back to The rules");
  assert.equal(titleCase("back to the rules", { on: true, small: [] }), "Back To The Rules");
  assert.deepEqual(titleRule(undefined), { on: false, small: [] });
  // The pack's own labels are simply written in title case: its names, headings, and buttons.
  const s = PLAYER.screen;
  const labels: string[] = [
    s.briefing, s.rules, s.city, s.glossary, s.talkingTo, s.pensions, s.withdrawals, s.purse, s.input.end, s.input.return, s.move.title, s.move.join, s.move.colloquio, s.seat.wait, s.midnight.extra, s.end.title, s.end.died, s.end.replay,
    s.errandCard.title, s.errandDeadline, s.pastStage.summaryTitle, s.earlier.title, s.hintsSwitch.on, s.hintsSwitch.off, s.rulesModal.shrink, s.rulesModal.previous, s.rulesModal.next, s.rulesModal.first, s.rulesModal.overview,
    s.cityList.back, s.cityList.first, s.cityList.previous, s.cityList.next, s.decks.past, s.decks.previousBriefing, s.decks.nextBriefing, s.right.lore, s.right.known, s.right.lookingAt, s.right.lookingAtSelf, s.right.openWeb, s.notaioHint.title,
    s.web.title, s.web.record, s.web.notes, s.web.heard, s.web.saw, s.web.writeOn, s.web.writeFree, s.web.save, s.web.conclude, s.web.free, s.web.sideShow, s.more, s.reading.title, s.room, s.withYou, s.withYouPrivately, s.places.title,
    s.glossaryModal.more, s.opening.choose, s.opening.fullGameOnly, s.tour.skip, s.tour.again, s.narrow.title, s.narrow.go,
    ...(s.decks.playerMerges as { title: string; subheadings: string[] }[]).flatMap((m) => [m.title, ...m.subheadings]),
    ...((PLAYER as unknown as { rules: { sections: { title: string }[] } }).rules.sections.map((x) => x.title)),
  ];
  for (const l of labels) assert.equal(l, titleCase(l, rule), l);
  for (const [have, want] of [[s.briefing, "Your Briefing"], [s.talkingTo, "Talking With"], [s.places.title, "The Places"], [s.withdrawals, "Secret Conversations"], [s.tour.again, "Show Me Around"], [s.input.end, "End Conversation"], [s.decks.nextBriefing, "Next Briefing →"], [s.more, "More Below"], [s.hintsSwitch.on, "Explanations: On"], [s.notaioHint.title, "{notaio}, to You"]]) assert.equal(have, want);
  // Sentences, prompts, and status lines stay as they are; so do the places, as Lore writes them.
  assert.equal(s.right.noEar, "No one has your ear");
  assert.equal(s.input.waiting, "Your turn: speak or pass.");
  assert.equal(s.places.yours, "You are here");
  assert.ok("the great hall" in s.places.descriptions);
  // The new words (Interface v0.17, The Player's Words).
  assert.deepEqual([s.modalRow.paddle.left, s.modalRow.paddle.right], ["‹", "›"]);
  assert.deepEqual([s.web.sideShow, s.web.sideShowLabel, s.web.sideHideLabel], ["What You Heard and Saw · Notes", "Show what you heard and saw, and your notes", "Hide what you heard and saw, and your notes"]);
  assert.equal(s.narrow.text, "Gonfaloniere is laid out for a laptop, a desktop, or a tablet held sideways. On a screen this narrow it won't fit well yet. Turn your device sideways, or open the game on a bigger screen.");
});

test("title case on the screen (Interface v0.17): the stage names, the modals' ways on and back, and the briefing's tabs are title-cased for display, and their sources are unchanged", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const stage = v.state!.phaseLabel;
  assert.notEqual(stage, tc(stage), "block 5 names the stage in its own case");
  const h = game({ v });
  assert.ok(h.includes(`<span class="stage-name">${esc(tc(stage))}</span>`), "the current stage's name");
  assert.ok(h.includes(`data-stage="${esc(stage)}"`), "the stage itself is still found by its own name");
  assert.deepEqual(v.sheet!.track, v.sheet!.track!.map((x) => x), "the track is as the engine sent it");
  assert.match(game({ v, deck: "rules" }), /data-hint="modalPrevious">Back to Your Briefing<\/button>/);
  assert.match(game({ v, deck: "city" }), /data-hint="modalPrevious">Back to the Rules<\/button>/, "the modal's name keeps its title case; its The goes lower case after to");
  assert.match(game({ v, deck: "glossary" }), /aria-label="Back to the City"/);
  assert.equal(PLAYER.screen.modalRow.previous, "Back to {title}");
  // The stage's description is still found by the stage's own name.
  assert.ok(Object.keys(PLAYER.screen.stageBar.descriptions).includes(stage));
});

test("the player's own rules (Interface v0.17–v0.18): ten sections in the order a player learns the evening, filled with the game's values and nothing else; a missing phase's clause left out; the errand and moving by the run", async () => {
  const pack = packValue("rules");
  const mini = { ...FULL_VALUES, linesPerTurn: 6, minglingTurns: 12, councilTurns: null, finalCouncilTurns: null, selectionTurns: null, openFloorTurns: null };
  const full = playerRules(pack, FULL_VALUES, { plotReward: true, living: 12 });
  assert.deepEqual(full.map((c) => c.title), ["The Evening", "How to Win", "Your Errand", "The Order of the Evening", "Stages and Turns", "Conversations", "Money and Bribes", "France's Payroll", "Midnight", "Candidates and the Vote"]);
  const text = (cards: Card[], title: string) => cards.find((c) => c.title === title)!.text;
  const all = (cards: Card[]) => cards.map((c) => `${c.title}\n${c.text}`).join("\n");
  // Every placeholder is filled: none is left standing, in the full game or the mini-game, with the reward on or off.
  for (const [values, plotReward] of [[FULL_VALUES, true], [FULL_VALUES, false], [mini, false], [mini, true]] as const) assert.doesNotMatch(all(playerRules(pack, values, { plotReward, living: 6 })), /[{}]|undefined|null/);
  // The turns, from the run's own schedule: every phase in the full game, joined with commas and a last "and".
  assert.ok(text(full, "Stages and Turns").includes("A turn is 8 lines spoken across the whole house, shared among every conversation at once. A round of mingling lasts 12 turns, a council 3, the last council 4, choosing candidates 2, and the open floor after the speeches 6."));
  // The mini-game has no councils, candidates, or open floor: their clauses are left out.
  const small = playerRules(pack, mini, { plotReward: false, living: 6 });
  assert.ok(text(small, "Stages and Turns").includes("A turn is 6 lines spoken across the whole house, shared among every conversation at once. A round of mingling lasts 12 turns.\n\n"));
  assert.ok(text(playerRules(pack, { ...mini, councilTurns: 3 }, { plotReward: false, living: 6 }), "Stages and Turns").includes("A round of mingling lasts 12 turns and a council 3."));
  // Moving: "one chance each round" is said only when a round has as many turns as there are living guests.
  const each = "So you get at least one chance each round.";
  const fewer = "A round has fewer turns than there are guests, so not everyone gets a chance every round.";
  assert.ok(text(full, "Stages and Turns").includes(each) && !text(full, "Stages and Turns").includes(fewer));
  const crowded = text(playerRules(pack, FULL_VALUES, { plotReward: true, living: 13 }), "Stages and Turns");
  assert.ok(crowded.includes(fewer) && !crowded.includes(each));
  assert.ok(text(full, "Stages and Turns").includes("It lasts 10 lines at most"));
  // The errand's two endings, by the run's plot_reward flag.
  assert.ok(text(full, "Your Errand").endsWith("No one else is told."));
  assert.equal(text(small, "Your Errand"), "Your briefing gives you one task of your own tonight, and it comes first. In this game, finishing it earns no extra act at midnight.");
  // The money, from the game's values; v0.18's corrections from Mechanics' check.
  assert.ok(text(full, "Money and Bribes").startsWith("Everyone begins with 10 Florins and receives 1 more at the start of each round of mingling."));
  assert.ok(text(full, "France's Payroll").includes("a payroll payment of 3 Florins") && text(full, "France's Payroll").includes("The treasury starts with 12 Florins; while it's empty, there's no payment to take until one is paid back."));
  assert.ok(text(full, "Candidates and the Vote").includes("at 5 Florins each (/buy)"));
  assert.ok(text(full, "How to Win").endsWith("A candidate who repents changes sides: from then on, they win only if the Dominicans do."));
  assert.ok(text(full, "Conversations").endsWith("or to the smallest group if that one is full or has broken up."));
  assert.ok(text(full, "Stages and Turns").startsWith("The evening moves in stages, shown in the bar at the top of the screen. The rounds of mingling, the councils, the choosing of candidates, and the open floor after the speeches are made of turns;"));
  assert.match(text(full, "How to Win"), /in this order\.\n1\. The Dominicans win[^\n]*\n2\. Otherwise[^\n]*\n3\. Otherwise[^\n]*\nA faction needs/, "the order is a numbered list");
  // A value the sheet doesn't carry at all is an error the tests catch: its placeholder is left standing, never a blank.
  const { vote: _, ...short } = FULL_VALUES;
  assert.match(all(playerRules(pack, short, { plotReward: true, living: 12 })), /at \{vote\} Florins each/);
  // No number is typed into the pack's text, and it names only the game's values.
  const raw = JSON.stringify(pack);
  assert.doesNotMatch(raw.replace(/\\n\d\. /g, ""), /\d/, "every number is a placeholder (the list's own numerals apart)");
  assert.deepEqual([...new Set([...raw.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!))].sort(), Object.keys(FULL_VALUES).sort());
  // A malformed pack shows nothing rather than failing.
  assert.deepEqual(playerRules(undefined, FULL_VALUES, { plotReward: true, living: 12 }), []);
  assert.deepEqual(playerRules({ sections: [null, { title: 3 }, { title: "A", text: ["x", 4, [{ when: "nothing", text: "y" }]] }] }, FULL_VALUES, { plotReward: true, living: 12 }), [{ title: "A", text: "x" }]);
});

test("the rules modal shows the player's rules, filled from the sheet's values (TD v0.52), in place of the AI guests' primer; block 2 itself is unchanged", async () => {
  const { at, game: played } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  // The sheet's values: the engine's own tunables and this run's schedule; the mini-game has no councils, candidates, or open floor.
  const t = fakeDocs.tunables;
  assert.deepEqual(v.sheet!.values, { start: t.starting_florins, income: t.income, payroll: t.pension_size, vote: t.vote_price, treasury: t.embassy_treasury, linesPerTurn: played.s.utterancesPerTurn, minglingTurns: 12, councilTurns: null, finalCouncilTurns: null, selectionTurns: null, openFloorTurns: null, colloquioCap: t.colloquio_cap, currency: settingPack().currency });
  const rules = rulesOf(v);
  const h = game({ v, deck: "rules" });
  const modal = focused(h);
  assert.deepEqual([...modal.matchAll(/<span class="rules-name">([^<]*)</g)].map((m) => m[1]), rules.map((c) => esc(c.title)));
  assert.doesNotMatch(modal, /[{}]/, "nothing unfilled on the screen");
  // An open section: its text, filled with this run's numbers.
  const open = (title: string) => {
    const page = html(createElement(GameView, { me: F, send: () => {}, status: "open", v, deck: "rules", places: { rules: rules.findIndex((c) => c.title === title) } } as never));
    return page.slice(page.indexOf('<section class="rules-section open'));
  };
  assert.ok(open("Money and Bribes").includes(esc(`Everyone begins with ${t.starting_florins} Florins and receives ${t.income} more`)));
  assert.ok(open("Stages and Turns").includes(`A turn is ${played.s.utterancesPerTurn} lines spoken across the whole house, shared among every conversation at once. A round of mingling lasts 12 turns.`));
  assert.ok(open("Your Errand").includes("In this game, finishing it earns no extra act at midnight."), "the mini-game runs with plot_reward off");
  // Block 2, the AI guests' primer, is what it was: the sheet still carries it, and the modal doesn't show it.
  assert.equal(v.sheet!.rules, rulesText(fakeDocs.templates, { ...fakeDocs.tunables, plotProtection: false, plotReward: false }));
  assert.ok(!modal.includes(esc(rulesCards(v.sheet!.rules)[1]!.text.slice(0, 60))));
  // None of the player's rules text is in the screen's code.
  assert.doesNotMatch(noComments(readFileSync("web/src/App.tsx", "utf8")) + noComments(readFileSync("web/src/model.ts", "utf8")), /Stages and Turns|How to Win|chance each round/i);
});

// ---- CC-20261116-08 (#179, part 2): Interface v0.17's typefaces, relative sizes, Il Notaio's boxes, and selection ----

test("three typefaces as theme tokens (Interface v0.17, The Look): each face served from web/fonts/ with its licence and a size-adjust; text sizes in rem; Il Notaio's sizes, the corners, and the identity's sizes are tokens", async () => {
  const theme = readFileSync("web/theme.css", "utf8");
  const css = readFileSync("web/src/app.css", "utf8");
  // Two faces, each one file in web/fonts/, under the SIL Open Font License, its text beside it.
  const faces = [...theme.matchAll(/@font-face \{([^}]*)\}/g)].map((m) => ({ family: m[1]!.match(/font-family: "([^"]+)"/)![1]!, file: m[1]!.match(/src: url\("\/fonts\/([\w.-]+\.woff2)"\) format\("woff2"\)/)![1]!, adjust: m[1]!.match(/size-adjust: (\d+)%/)![1]! }));
  assert.deepEqual(faces, [{ family: "Source Serif 4", file: "SourceSerif4-Regular.woff2", adjust: "108" }, { family: "EB Garamond", file: "EBGaramond-Regular.woff2", adjust: "127" }]);
  for (const f of faces) assert.equal(readFileSync(join("web/fonts", f.file)).subarray(0, 4).toString("latin1"), "wOF2", `${f.file} is a WOFF2 file`);
  assert.deepEqual(readdirSync("web/fonts").sort(), ["EBGaramond-Regular.woff2", "OFL-EBGaramond.txt", "OFL-SourceSerif4.txt", "SourceSerif4-Regular.woff2"]);
  for (const l of ["OFL-EBGaramond.txt", "OFL-SourceSerif4.txt"]) assert.match(readFileSync(join("web/fonts", l), "utf8"), /SIL OPEN FONT LICENSE Version 1\.1/, l);
  // Nothing is fetched from elsewhere: no @import, and every url() is the page's own.
  assert.doesNotMatch(theme + css, /@import|url\((?!"\/fonts\/)/);
  assert.match(theme, /--font-guest: "Source Serif 4", /);
  assert.match(theme, /--font-notaio: "EB Garamond", /);
  assert.match(css, /\.ln\.speech \.tx, \.heard, \.field textarea \{ font-family: var\(--font-guest\); \}/);
  assert.match(css, /\.ln\.notaio \.tx, \.hint-text, \.reading-text, \.summary-items, \.tour-text, \.opening-story \{ font-family: var\(--font-notaio\); \}/);
  assert.doesNotMatch(css, /\.ln\.notaio \{[^}]*italic/, "his lines in the chat are upright");
  // Text sizes are relative (Notes for the Build): no text token is in pixels.
  const text = [...theme.matchAll(/(--text-[\w-]+): ([^;]+);/g)].map((m) => [m[1]!, m[2]!]).filter(([k]) => k !== "--text-muted");
  assert.ok(text.length >= 10);
  for (const [k, v] of text) assert.match(v, /^\d*\.?\d+rem$/, k);
  const rem = (k: string) => Number(theme.match(new RegExp(`${k}: (\\d*\\.?\\d+)rem`))![1]) * 16;
  assert.deepEqual(["--text-xs", "--text-sm", "--text-md", "--text-lg", "--text-xl"].map(rem), [11, 13, 15, 18, 24], "the sizes they were, at the usual 16px");
  // Il Notaio's sizes: 16px open, 13px minimized, his notes in step, his title about 87% of his open words, More Below at 10px.
  assert.deepEqual(["--text-notaio-open", "--text-notaio-min", "--text-notaio-note-open", "--text-notaio-note-min", "--text-notaio-title", "--text-more"].map(rem), [16, 13, 13, 11, 14, 10]);
  assert.match(css, /\.reading\[data-state="minimized"\] \{[^}]*font-size: var\(--text-notaio-min\)/);
  assert.match(css, /\.notaio-title \{ font-size: var\(--text-notaio-title\)/);
  assert.match(css, /\.notaio-toggle \{[^}]*font-size: var\(--text-xs\)/);
  assert.match(css, /\.more-below \{[^}]*font-size: var\(--text-more\)/);
  // The smallest labels, a pixel larger from 1800px wide.
  assert.match(theme, /@media \(min-width: 1800px\) \{\s*:root \{\s*--text-xs: 0\.75rem;\s*--text-more: 0\.6875rem;/);
  // Corners and the identity: the right panel's top and its cards' 22px; your portrait 84px.
  assert.match(theme, /--radius-panel: 28px;/, "28px since Interface v0.19");
  assert.match(theme, /--portrait-size-me: 84px;/);
  assert.match(css, /\.person\.look \{[^}]*border-radius: var\(--radius-panel\) var\(--radius-panel\) 0 0/);
  // Selection: nothing but what's worth copying.
  assert.match(css, /body \{[^}]*user-select: none; \}/);
  assert.match(css, /\.ln, \.heard, \.saw, \.note-text, textarea, input, \.opening-story, \.end \{ -webkit-user-select: text; user-select: text; \}/);
});

test("Il Notaio's boxes say Show or Hide (Interface v0.17): his hint, his reading, and his summary, in the hint's own words; a line's parts are a space apart", async () => {
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const h = game({ v, web: ["Lupo"] });
  assert.match(h, /<button class="hint-head" aria-expanded="true"[^>]*><span class="notaio-title">.*?<\/span><span class="notaio-toggle">Hide<\/span><\/button>/);
  assert.match(h, /<div class="reading-head"><span class="notaio-title">.*?<\/span><span class="notaio-toggle">Hide<\/span><\/div>/);
  const past = await earlierView();
  const stage = past.sheet!.track![1]!;
  const summarized: View = { ...past, summaries: [...past.summaries, { seq: 1, stage, groups: [], empty: "Nothing reached you." }] };
  const p = game({ v: summarized, pastStage: stage });
  assert.match(p, /class="reading past-summary" data-state="expanded"[^>]*><div class="reading-head"><span class="notaio-title">.*?Summary of This Stage<\/span><span class="notaio-toggle">Hide<\/span>/);
  assert.match(readFileSync("web/src/App.tsx", "utf8"), /<span className="notaio-toggle">\{w\(expanded \? "screen\.notaioHint\.hide" : "screen\.notaioHint\.show"\)\}<\/span>/g);
  // A copied line keeps the spaces between the speaker's name, "(to …)", and the words.
  assert.match(h, /<span class="sp">.*?<\/span> (?:<!-- -->)?<span class="(?:to|tx)">/);
});

// ---- CC-20261116-09 (#179, part 3): Interface v0.17's Screen Sizes ------------------------------------------

test("Screen Sizes (Interface v0.17): every limit is a theme token; the reading column, the stage bar, and the web's margins use them; the web answers to its own width; the handle, the note, and the long press have their words and tokens", async () => {
  const theme = readFileSync("web/theme.css", "utf8");
  const css = readFileSync("web/src/app.css", "utf8");
  // The doc's table, as tokens.
  for (const [token, value] of [
    ["--side-width", "clamp(284px, 25vw, 332px)"],
    ["--right-width", "clamp(280px, 24vw, 480px)"],
    ["--right-min", "220px"],
    ["--right-max", "480px"],
    ["--centre-least", "540px"],
    ["--reading-width", "820px"],
    ["--stage-bar-max", "1280px"],
    ["--stream-min-height", "200px"],
    ["--input-lines-max", "9"],
    ["--input-lines-min", "3"],
    ["--input-short-share", "0.2"],
    ["--web-draw-max", "820px"],
    ["--web-margin-left", "clamp(56px, 5cqw, 120px)"],
    ["--web-margin-side", "clamp(32px, 3.5cqw, 80px)"],
    ["--web-side-width", "clamp(280px, 28cqw, 480px)"],
    ["--break-right-fold", "1044px"],
    ["--break-web-key", "864px"],
    ["--break-web-side", "1100px"],
    ["--break-phone", "760px"],
    ["--long-press", "500ms"],
  ] as const)
    assert.ok(theme.includes(`${token}: ${value};`), `${token}: ${value}`);
  // The right panel starts folded under the left panel's least, the conversation's least, and its own least together.
  assert.equal(284 + 540 + 220, 1044);
  // One reading column: the lines, Il Notaio's hint, the message box, and his summary of a past stage share its edges.
  const column = "max\\(var\\(--float-gap\\), calc\\(\\(100% - var\\(--reading-width\\)\\) \\/ 2\\)\\)";
  assert.match(css, new RegExp(`\\.stream \\{[^}]*padding: var\\(--stream-fade\\) ${column};`));
  assert.match(css, new RegExp(`\\n\\.input \\{[^}]*margin: 0 ${column} var\\(--float-gap\\);`));
  assert.match(css, new RegExp(`\\.notaio-hint \\{[^}]*margin: 0 ${column} var\\(--space-2\\);`));
  assert.match(css, new RegExp(`\\.reading\\.past-summary \\{[^}]*left: ${column}; right: ${column};`), "his summary, as wide as the message box below it");
  assert.match(css, /\.stage-bar-wrap \{[^}]*max-width: var\(--stage-bar-max\); margin: 0 auto;/);
  assert.match(css, /\.layout \{[^}]*grid-template-columns: var\(--side-width\) minmax\(var\(--centre-min\), 1fr\) minmax\(var\(--right-min\), var\(--right-width\)\);/);
  // The web's own width decides what's inside it (a container query), not the window's.
  assert.match(css, /\.web \{[^}]*container-type: inline-size; container-name: web; \}/);
  assert.match(css, /@container web \(max-width: 1100px\) \{\s*\.web-body \{ grid-template-columns: 1fr var\(--web-strip-width\); \}/);
  assert.doesNotMatch(noComments(css), /@media[^{]*(min|max)-(width|height)/, "no window media query in the components' styles");
  assert.match(css, /\.web-map \{[^}]*padding: 0 var\(--web-margin-left\); \}/);
  assert.match(css, /\.web-diagram \{[^}]*max-width: var\(--web-draw-max\)/);
  // On the screen: the side column's handle with its words and explanation; the message box's hidden twin; his hint folding by itself.
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const h = game({ v, web: [] });
  assert.match(h, /<button class="web-side-handle" aria-expanded="false" aria-label="Show what you heard and saw, and your notes" aria-description="What you heard and saw, and your notes\. Click to open or close\." data-hint="webSide">What You Heard and Saw · Notes<\/button><div class="web-side">/);
  assert.match(h, /<textarea class="measure" readOnly="" tabindex="-1" aria-hidden="true">[^<]+<\/textarea>/);
  assert.match(h, /<aside class="notaio-hint" data-fold="auto">/);
  assert.deepEqual(missingWords(h), []);
  // The screen's code reads the limits from the theme, and names no width of its own.
  const code = noComments(readFileSync("web/src/App.tsx", "utf8"));
  for (const t of ["--break-phone", "--break-right-fold", "--break-web-key", "--stream-min-height", "--input-lines-max", "--input-short-share", "--long-press"]) assert.ok(code.includes(`themeMs("${t}"`), t);
});

// ---- CC-20261116-10 (#179, part 4): Interface v0.17–v0.18's modals ----------------------------------------------

test("inside the modals (Interface v0.17–v0.18): numerals, real lists, and every look a token: the margins from one number, the body text, the scroll fades, the rules' backdrop and its fade, the corners, and the short-window margins", async () => {
  // The rules' numerals.
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 14, 19, 40, 0].map(roman), ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XIV", "XIX", "XL", ""]);
  assert.equal(PLAYER.screen.rulesModal.numbered, "{numeral}. {title}");
  // Lists in the text: lines that start "- " are bullets, lines that start "1." a numbered list; the rest is running text, as written.
  assert.deepEqual(proseBlocks("The order.\n1. First.\n2. Then.\n3. Last.\nA faction needs one."), [{ kind: "text", text: "The order." }, { kind: "numbers", items: ["First.", "Then.", "Last."] }, { kind: "text", text: "A faction needs one." }]);
  assert.deepEqual(proseBlocks("**Your Own Reasons**\n- See him humbled.\n- Keep her safe.\n\nAfter."), [{ kind: "text", text: "**Your Own Reasons**" }, { kind: "bullets", items: ["See him humbled.", "Keep her safe."] }, { kind: "text", text: "After." }]);
  assert.deepEqual(proseBlocks("One paragraph.\n\nAnother - with a dash, and 3. not a list."), [{ kind: "text", text: "One paragraph.\n\nAnother - with a dash, and 3. not a list." }]);
  assert.deepEqual(proseBlocks(""), []);
  // On the screen: an open rules section's title carries its numeral in plain text; How to Win's order is a list.
  const { at } = await playedLog();
  const v = derive(at["speak:capannello"]!);
  const open = focused(game({ v, deck: "rules", places: { rules: 1 } }));
  assert.match(open, /<div class="rules-backdrop" aria-hidden="true"><\/div><div class="rules-over">/);
  assert.match(open, /<div class="rules-section-head"><h3>II\. How to Win<\/h3>/);
  assert.match(open, /<ol class="prose-list numbers"><li>The Dominicans win[^<]*<\/li><li>Otherwise[^<]*<\/li><li>Otherwise[^<]*<\/li><\/ol><p class="prose-text">A faction needs/);
  // The briefing's card doesn't repeat its title; the tab is the title.
  const b = focused(game({ v, deck: "briefing" }));
  assert.doesNotMatch(b, /<h3>/);
  assert.match(b, /<div class="deck-card fades" data-fade="none" aria-label="Who You Are"/);
  assert.match(b, /<span class="deck-mid"><span class="muted deck-counter">1 of 5<\/span><\/span>/);
  // Every look is a token.
  const theme = readFileSync("web/theme.css", "utf8");
  const css = readFileSync("web/src/app.css", "utf8");
  for (const t of ["--text-modal: 0.9375rem", "--line-height-modal: 1.6", "--text-tab: 1rem", "--text-term: 0.875rem", "--modal-pad: 28px", "--scroll-fade: 36px", "--blur-rules: 2.5px", "--rules-backdrop-fade: 22px", "--list-dot: 5px", "--modal-margin-y: 24px", "--modal-full-height: 640px"]) assert.ok(theme.includes(`${t};`), t);
  // One number scales the margins round the header, the content, and the footer.
  for (const t of ["--modal-pad-header", "--modal-pad-foot", "--modal-pad-text"]) assert.match(theme, new RegExp(`${t}: calc\\(var\\(--modal-pad\\) \\* [\\d.]+\\);`), t);
  // The rules' backdrop: dimmed 26% (40% in dark mode), blurred, fading in at its top and bottom.
  assert.deepEqual([...theme.matchAll(/--rules-backdrop: (rgba\([^)]*\));/g)].map((m) => m[1]), ["rgba(20, 20, 18, 0.26)", "rgba(0, 0, 0, 0.4)"]);
  assert.match(theme, /--mask-rules-backdrop: linear-gradient\(to bottom, transparent, #000 var\(--rules-backdrop-fade\), #000 calc\(100% - var\(--rules-backdrop-fade\)\), transparent\);/);
  assert.match(css, /\.rules-backdrop \{[^}]*background: var\(--rules-backdrop\);[^}]*backdrop-filter: blur\(var\(--blur-rules\)\);[^}]*mask-image: var\(--mask-rules-backdrop\);/);
  assert.doesNotMatch(css, /section\.rules-section \{[^}]*mask-image/, "the open card isn't faded");
  // No rule lines under the header or the tabs, or over the footer.
  assert.doesNotMatch(css, /\.modal header, \.still-modal header \{[^}]*border/);
  assert.match(css, /\.deck > \.tabs \{[^}]*border-bottom: none; \}/);
  assert.doesNotMatch(css, /\.deck-foot \{[^}]*border/);
  // A card's bottom margin gives way before it scrolls; its edges fade where there's more.
  assert.match(css, /\.deck-card::after, \.rules-section-text::after, \.city-entry::after \{ content: ""; flex: 0 1 var\(--modal-pad\); \}/);
  for (const side of ["below", "above", "both"]) assert.match(css, new RegExp(`\\.fades\\[data-fade="${side}"\\] \\{[^}]*mask-image: var\\(--mask-more-${side}\\); \\}`), side);
  // Short screens: under 760px tall the modals' margins come in; they keep clear of the Web of Confidences' bar.
  assert.match(theme, /@media \(max-height: 759px\) \{\s*:root \{\s*--modal-margin-y: 8px;/);
  assert.match(theme, /--deck-height: min\(var\(--modal-full-height\), calc\(var\(--screen-height\) - var\(--web-bar-height\) - var\(--modal-margin-y\) \* 2\)\);/);
});

// ---- CC-20261117-01 (#191, part 1): Interface v0.19's build notes and the centre ----------------------------------

test("Interface v0.19's build notes and centre, as tokens and code: resize work once a frame, More Below that can't loop, a failed panel's error and Try Again, the stage bar sized from its own width, 17px lines", () => {
  const theme = readFileSync("web/theme.css", "utf8");
  const css = noComments(readFileSync("web/src/app.css", "utf8"));
  const code = noComments(readFileSync("web/src/App.tsx", "utf8"));
  for (const t of ["--stage-bar-max: 1280px;", "--stage-card-share: 0.15;", "--text-line: 1.0625rem;", "--line-height-line: 1.55;", "--more-below-on: 16px;", "--more-below-off: 2px;"]) assert.ok(theme.includes(t), t);
  // The circles and the open stage's name go by the bar's own width (cqw, in its own container), not the window's.
  assert.match(theme, /--stage-size: clamp\([^;]*cqw[^;]*\);/);
  assert.match(theme, /--stage-name-size: clamp\([^;]*cqw[^;]*\);/);
  assert.doesNotMatch(theme.match(/--stage-[\w-]+: [^;]*;/g)!.join(" "), /vw/, "nothing in the bar goes by the window's width");
  assert.match(css, /\.stage-bar-wrap \{[^}]*container-type: inline-size; container-name: stagebar; \}/);
  assert.match(css, /\.conv-head \{[^}]*margin: var\(--float-gap\) max\(var\(--float-gap\), calc\(\(100% - var\(--reading-width\)\) \* var\(--stage-card-share\)\)\) 0;/);
  assert.match(css, /\.ln \{[^}]*font-size: var\(--text-line\); line-height: var\(--line-height-line\); \}/);
  // Resize and scroll work goes through perFrame; nothing listens to a resize directly.
  assert.doesNotMatch(code, /addEventListener\("resize", (?!\w+\.run)/, "every resize handler runs once a frame");
  assert.doesNotMatch(code, /new ResizeObserver\((?!\w+\.run|\(\) =>)/, "every resize observer runs once a frame");
  for (const t of ["--more-below-on", "--more-below-off"]) assert.ok(code.includes(`themeMs("${t}"`), t);
  // A failed panel: the notice, the error under it, and Try Again, in the pack's words.
  assert.equal(PLAYER.screen.panelRetry, "Try Again");
  assert.ok(PLAYER.screen.hints.panelRetry.length > 10);
});

// ---- CC-20261117-02 (#191, part 2): Interface v0.19's right panel ------------------------------------------------

test("the right panel's guest cards (Interface v0.19): a description, Their faction wins if, Known to all, and In the city from the setting pack, every one public; a row whose words are missing is left out; a city entry ends with the guests it concerns", async () => {
  const { at } = await playedLog();
  const v = withLore(derive(at["speak:capannello"]!));
  const right = (h: string) => h.slice(h.indexOf('class="side right'), h.indexOf('class="web-dock'));
  const card = right(game({ v, selected: { kind: "guest", name: "Giorgia Pazzi" } }));
  const pack = JSON.parse(readFileSync("setting/florence-1492/player.json", "utf8")) as { guests: Record<string, { description: string }>; factionWins: Record<string, string>; cityGuests: Record<string, string[]> };
  assert.ok(card.includes(`<p class="card-description">${esc(pack.guests["Giorgia Pazzi"]!.description)}</p>`));
  assert.ok(card.includes(`<div class="label">Their Faction Wins If</div><p class="card-wins">${esc(pack.factionWins.Pazzi!)}</p>`));
  assert.match(card, /<div class="label">Known to All<\/div>/);
  assert.deepEqual(missingWords(card), []);
  // Every guest has a description, every faction a line, in the pack; the entries named exist and are public, and none is San Frediano.
  const roster = settingPack().roster.map((r) => r.name);
  for (const n of roster) assert.ok(pack.guests[n]?.description, n);
  for (const f of settingPack().factions) assert.ok(pack.factionWins[f.name], f.name);
  const lore = JSON.parse(readFileSync("lore/lore.json", "utf8")) as { id: string; kind: string }[];
  for (const [id, guests] of Object.entries(pack.cityGuests).filter(([k]) => !k.startsWith("_"))) {
    assert.equal(lore.find((e) => e.id === id)?.kind, "lore", `${id}: a public entry`);
    for (const g of guests) assert.ok(roster.includes(g), `${id}: ${g}`);
  }
  assert.ok(!("pub-san-frediano" in pack.cityGuests), "no one is linked to San Frediano");
  // Missing words: the row is left out, not shown empty or as a key.
  try {
    setInfo({ ...info, words: { ...info.words, guests: {}, factionWins: {}, cityGuests: {} } });
    const bare = right(game({ v, selected: { kind: "guest", name: "Giorgia Pazzi" } }));
    assert.doesNotMatch(bare, /card-description|card-wins|card-city|Their Faction Wins If|In the City/);
    assert.deepEqual(missingWords(bare), []);
  } finally {
    setInfo(info);
  }
  // A city entry: its title, its words, then the guests it concerns, each a chip that selects them.
  const entry: LoreEntry = { id: "pub-pazzi", title: "The Pazzi now", aliases: [], subject: "Families", text: "What remains of the family." };
  const h = right(game({ v, selected: { kind: "lore", entry, back: null } }));
  assert.match(h, /<h3>The Pazzi Now<\/h3><p>What remains of the family\.<\/p><div class="label">Guests It Concerns<\/div><ul class="lore-guests">/);
  for (const g of pack.cityGuests[entry.id]!) assert.ok(h.includes(`<button class="guest-chip" data-guest="${esc(g)}"`), g);
  assert.doesNotMatch(right(game({ v, selected: { kind: "lore", entry: LORE[0]!, back: null } })), /Guests It Concerns/, "an entry that concerns no one has no such row");
  // The looks are tokens: the panel's place and corners, its text a step up, the margins, the fade, and where the card stops.
  const theme = readFileSync("web/theme.css", "utf8");
  for (const t of ["--right-top-gap: 48px;", "--radius-panel: 28px;", "--right-text-xs: 0.75rem;", "--right-text-sm: 0.9375rem;", "--right-text-md: 1.0625rem;", "--right-text-lg: 1.3125rem;", "--right-card-side: clamp(24px, calc(24px + (100cqw - 280px) * 0.08), 40px);", "--right-card-top: 28px;", "--right-fade: 20px;", "--right-stop-empty: 14px;", "--right-stop-share: 40%;", "--break-right-stop: 380px;"]) assert.ok(theme.includes(t), t);
  const css = noComments(readFileSync("web/src/app.css", "utf8"));
  assert.match(css, /\.side\.right \{[^}]*container-type: inline-size; container-name: right;/);
  assert.match(css, /@container right \(min-width: 380px\) \{\s*\.side\.right\.ear \.covers \{ top: calc\(var\(--right-stop-share\) - var\(--cover-shadow-room\)\); \}/);
  assert.match(css, /\.person-head \{ position: sticky; top: 0;/);
  assert.match(css, /\.person \.who\.column \{ position: sticky; top: var\(--right-head-height\);/);
  assert.match(css, /\.lore-entry h3 \{ position: sticky; top: var\(--right-head-height\);[^}]*text-align: center; \}/);
});

// ---- CC-20261117-03 (#191, part 3): Interface v0.19's left panel and the Web of Confidences -------------------------

test("the left panel and the Web of Confidences (Interface v0.19), as tokens: the panel's units, the top that stays put and closes up, the tighter rhythm under 1240px tall, the empty places' line; the web's 1600px and its side column folding under 1100px", () => {
  const theme = readFileSync("web/theme.css", "utf8");
  const css = noComments(readFileSync("web/src/app.css", "utf8"));
  for (const t of ["--lu: calc(var(--side-width) / 300);", "--left-pad: calc(24 * var(--lu));", "--left-portrait: calc(64 * var(--lu));", "--left-portrait-gap: calc(16 * var(--lu));", "--left-empty-gap: calc(28 * var(--lu));", "--vroom: max(0px, min(300px, 100vh - 700px));", "--left-pin: sticky;", "--web-max: 1600px;", "--break-web-side: 1100px;"]) assert.ok(theme.includes(t), t);
  // Text in units, but never below the screen's own size in rem, so a reader's font-size setting still counts.
  assert.match(theme, /--left-text-sm: max\(var\(--text-sm\), calc\(14 \* var\(--lu\)\)\);/);
  // Each gap of the pinned top: a third of its full size, plus --vroom times a number.
  for (const g of ["above-me", "below-me", "facts", "buttons", "under"]) assert.match(theme, new RegExp(`--left-gap-${g}: calc\\(\\d+ \\* var\\(--lu\\) \\/ 3 \\+ var\\(--vroom\\) \\* 0\\.\\d+\\);`), g);
  assert.match(theme, /@media \(max-height: 1239px\) \{\s*:root \{[^}]*--left-token: calc\(28 \* var\(--lu\)\);/);
  assert.match(theme, /@media \(max-height: 519px\) \{\s*:root \{\s*--left-pin: static;/);
  assert.match(css, /\.left-top \{ position: var\(--left-pin\); top: 0;/);
  assert.match(css, /\.side\.left \{[^}]*scrollbar-width: thin;/);
  assert.match(css, /button\.me-briefing \{ display: grid; grid-template-columns: var\(--left-portrait\) 1fr;/);
  assert.match(css, /\.me-briefing \.name \{[^}]*text-wrap: balance; \}/);
  assert.match(css, /\.web-body \{[^}]*max-width: var\(--web-max\); margin: 0 auto; \}/);
  assert.equal(PLAYER.screen.places.empty, "Empty:");
});
