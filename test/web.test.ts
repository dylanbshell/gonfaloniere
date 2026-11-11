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
import { screenInfo } from "../src/minigame/screen-info.ts";
import { settingPack } from "../src/setting/pack.ts";
import { GameView, Start } from "../web/src/App.tsx";
import type { Ev } from "../web/src/connection.ts";
import { derive } from "../web/src/model.ts";
import { setInfo, type StartInfo } from "../web/src/words.ts";
import { fakeCaller, fakeDocs, fakeSettings } from "./fixtures/fake-game.ts";

const F = "Francesco Pazzi";
const files = (dir: string, ext: RegExp) => readdirSync(dir).filter((f) => ext.test(f)).map((f) => join(dir, f));
const noComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

/** A fake game as Francesco, answered in process; the log at every request, with which kind was open. */
async function playedLog(): Promise<{ log: Ev[]; at: Record<string, Ev[]> }> {
  const ctrl = new HumanController(F);
  const game = new MiniGame(fakeDocs, fakeSettings({ briefings: castBriefings(fakeDocs), seed: 2000, turns: 12, human: F }), fakeCaller(), {}, null, ctrl);
  const log: Ev[] = [];
  const at: Record<string, Ev[]> = {};
  let reply: (d: string) => void = () => {};
  let moves = 0;
  const conn: Connection = {
    send: (d) => {
      const ev = JSON.parse(d) as Ev;
      log.push(ev);
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
        } else reply(JSON.stringify({ type: "choice", request: ev.id, value: { acts: [{ type: "watch", target: (o.guests as string[])[0] }] } }));
      });
    },
    onMessage: (cb) => void (reply = cb),
    onClose: () => {},
  };
  ctrl.attach(conn);
  queueMicrotask(() => reply(JSON.stringify({ type: "command", text: "/borrow" })));
  await game.play();
  return { log, at };
}

const info = { ...screenInfo([F], castBriefings(fakeDocs)), started: null, ws: null } as StartInfo;
setInfo(info);
const html = (el: ReturnType<typeof createElement>) => renderToString(el);
/** Words the screen shows but couldn't find in player.json come out as their keys. */
const missingWords = (h: string) => h.match(/\bscreen\.[\w.]+|\b(?:refusals|commands)\.[\w.]+|undefined|\[object Object\]/g) ?? [];

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
  // The sheet (blocks 2 and 3) arrived with the first state; the stream has dividers where the conversation changed.
  assert.ok(end.sheet?.briefing && end.sheet.rules);
  assert.ok(end.stream.some((x) => x.item === "divider"));
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
