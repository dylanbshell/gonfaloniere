// A human player in the mini-game (CC-20261111-08, #61; TD v0.39, Player Interface): a scripted player
// plays a whole game as Francesco through the WebSocket protocol, against the fake model caller, with no
// model calls. Then the isolation test reads the whole outgoing stream: nothing in it may come from a
// conversation Francesco wasn't in, or from anyone's thoughts, readings, or plan.

import assert from "node:assert/strict";
import { test } from "node:test";
import { HumanController } from "../src/core/human.ts";
import type { Outgoing } from "../src/core/protocol.ts";
import { serveWebSocket } from "../src/core/ws.ts";
import { MiniGame, type CallRequest, type Caller } from "../src/minigame/engine.ts";
import { mentions, parseCommand } from "../src/minigame/player.ts";
import { castBriefings } from "../src/minigame/cast.ts";
import { readLoreFile } from "../src/minigame/lore.ts";
import { buildRecord } from "../src/minigame/record.ts";
import { say, settingPack } from "../src/setting/pack.ts";
import { exportView } from "../src/minigame/view.ts";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { fakeCaller, fakeDocs, fakeSettings } from "./fixtures/fake-game.ts";
import { docsFor } from "../probe.config.ts";
import { loadDocs } from "../src/sources/docs.ts";

const docs51 = loadDocs(docsFor("0.51"));

const F = "Francesco Pazzi";
const SERVED = { model: { slug: "fake" }, endpoint: { providerName: "fake", quantization: null }, servedId: null };
/** In every note the scripted player writes, so the tests can look for notes anywhere. */
const NOTE_MARK = "NOTE-7f3a";

/** The fake caller, with two changes so the player meets every situation: guests address Francesco, and each AI guest's first window calls him to a Colloquio. */
function callerFor(calls: CallRequest[]): Caller {
  const base = fakeCaller(calls);
  const count = new Map<string, number>();
  return async (req) => {
    if (req.character === F && !["knowledge-check", "star-pass", "claims-pass", "sweep-reask"].includes(req.kind)) throw new Error(`a model call for the player: ${req.kind}`);
    const r = (await base(req))!;
    // Il Notaio's reading for the screen (TD v0.44) is prose, not JSON, and from TD v0.51 his sentences: passed through.
    if (req.kind === "notaio-reading" || req.kind === "notaio-summary") return r;
    const k = (count.get(`${req.character}|${req.kind}`) ?? 0) + 1;
    count.set(`${req.character}|${req.kind}`, k);
    const v = JSON.parse(r.content);
    if (req.kind === "speak" && "addressee" in v && k % 3 === 0) v.addressee = F;
    if (req.kind === "move" && k === 1) Object.assign(v, { choice: "colloquio", target: F });
    return { ...r, content: JSON.stringify(v) };
  };
}

interface Seen {
  log: Outgoing[];
  did: Set<string>;
}

/** The scripted player: answers each request from canned inputs, and sends a few things unasked. */
function scriptedPlayer(url: string, seen: Seen, opts: { dropAfter: number }) {
  let colloquioLines = 0;
  let moves = 0;
  let turnMessages = 0;
  let midnightTried = false;
  let reconnected = false;
  return new Promise<void>((resolve, reject) => {
    const open = (first: boolean) => {
      const ws = new WebSocket(url);
      const send = (m: unknown) => ws.send(JSON.stringify(m));
      let received = 0;
      ws.onerror = (e) => reject(new Error(`socket: ${String((e as ErrorEvent).message ?? e)}`));
      ws.onmessage = (msg) => {
        try {
          handle(JSON.parse(String(msg.data)) as Outgoing);
        } catch (e) {
          reject(e);
        }
      };
      const handle = (ev: Outgoing) => {
        received++;
        if (!first && received <= seen.log.length) {
          // The replay on reconnect: the same log, in order.
          assert.deepEqual(ev, seen.log[received - 1], `replayed event ${received}`);
          return;
        }
        if (ev.type === "request" && ev.resent) {
          seen.did.add("pending request re-sent");
          assert.equal(ev.id, seen.log.findLast((e) => e.type === "request" && !e.closed)!.id);
        } else seen.log.push(ev);
        if (ev.type === "result") {
          ws.close();
          resolve();
          return;
        }
        if (first && seen.log.length === 1) {
          // TD v0.51, the tour's hold: the screen begins (a game before v0.51 doesn't wait for it).
          send({ type: "begin" });
          // Unasked, at the start: a held message, a pension, a conclusion, and a command that doesn't exist.
          send({ type: "say", text: "Good evening to you all." });
          send({ type: "command", text: "/borrow" });
          // Paying back: for a guest with no payment, refused; then his own (Interface v0.12, The Player's Words).
          send({ type: "command", text: "/repay @Lupo" });
          send({ type: "command", text: "/repay" });
          send({ type: "command", text: "/conclude Lupo killed Lucien de Valois." });
          send({ type: "command", text: "/fly" });
          // Notes (TD v0.40): a free one, one on a guest, one on a pair, and one on nobody at the party.
          send({ type: "note", text: `${NOTE_MARK} free`, guests: [] });
          send({ type: "note", text: `${NOTE_MARK} on Lupo`, guests: ["Lupo"] });
          send({ type: "note", text: `${NOTE_MARK} on a pair`, guests: ["Lupo", "Giorgia Pazzi"] });
          send({ type: "note", text: "On a stranger", guests: ["Nobody Atall"] });
          // The Web of Secrets open, with a guest and then a pair selected: Il Notaio's box asks for readings (TD v0.44).
          send({ type: "reading", guests: ["Lupo"] });
          send({ type: "reading", guests: ["Lupo", "Giorgia Pazzi"] });
          // TD v0.51: the selection itself asks, and a cleared one asks nothing.
          send({ type: "select", guests: ["Giorgia Pazzi"] });
          send({ type: "select", guests: [] });
        }
        if (ev.type === "note") seen.did.add("note kept");
        if (ev.type === "refusal") seen.did.add(`refused: ${ev.reason}`);
        if (ev.type !== "request" || ev.closed) return;
        if (first && !reconnected && seen.log.length > opts.dropAfter) {
          // Drop the connection with a request pending, and come back.
          reconnected = true;
          seen.did.add("reconnected");
          ws.close();
          setTimeout(() => open(false), 20);
          return;
        }
        const o = ev.options as Record<string, unknown>;
        const reply = (m: unknown) => send(m);
        if (ev.kind === "speak") {
          const others = o.with as string[];
          if (o.answering) {
            seen.did.add("answered an address");
            return reply({ type: "say", text: `You ask me directly, ${others[0]}? Then I'll answer.` });
          }
          if (o.conversation === "colloquio") {
            if (o.closing) {
              seen.did.add("closing line");
              return reply({ type: "pass" });
            }
            colloquioLines++;
            if (colloquioLines === 1) {
              send({ type: "command", text: `/bribe @${others[0]} 2` });
              seen.did.add("bribed");
            }
            if (colloquioLines % 3 === 0) {
              seen.did.add("ended a Colloquio");
              return reply({ type: "end" });
            }
            return reply({ type: "say", text: `Between us, ${others[0]}, I have a proposal (${colloquioLines}).` });
          }
          turnMessages++;
          if (turnMessages % 2 === 0) {
            seen.did.add("passed");
            return reply({ type: "pass" });
          }
          if (turnMessages === 1) reply({ type: "say", text: "x".repeat(501) });
          seen.did.add("spoke");
          return reply({ type: "say", text: `@${others[0]} what do you make of the Signoria?` });
        }
        if (ev.kind === "move") {
          // A note while the game waits for a choice: taken, and the choice still open.
          if (moves === 0) send({ type: "note", text: `${NOTE_MARK} while choosing`, guests: [] });
          send({ type: "select", guests: [(o.guests as string[])[0]!] });
          moves++;
          const guests = o.guests as string[];
          seen.did.add(moves === 1 ? "called a Colloquio" : "moved");
          return reply({ type: "choice", request: ev.id, value: moves === 1 ? { choice: "colloquio", target: guests[0] } : { choice: "join", target: guests[1] } });
        }
        if (ev.kind === "seat") {
          seen.did.add(`seat choice (${o.form})`);
          const groups = o.groups as { members: string[] }[];
          const value = groups.length ? { choice: "join", target: groups[0]!.members[0] } : { choice: "wait", target: null };
          return reply({ type: "choice", request: ev.id, value });
        }
        if (ev.kind === "midnight") {
          const guests = o.guests as string[];
          // Guarding yourself is refused and the request stays open; then a typed act answers it.
          if (!midnightTried) reply({ type: "choice", request: ev.id, value: { acts: [{ type: "guard", target: F }] } });
          midnightTried = true;
          seen.did.add("midnight acts");
          return reply({ type: "command", text: `/watch @${guests[0]}` });
        }
      };
    };
    open(true);
  });
}

async function playAsFrancesco(seed: number, docs = fakeDocs) {
  const calls: CallRequest[] = [];
  const ctrl = new HumanController(F);
  const server = await serveWebSocket(0, (conn) => ctrl.attach(conn));
  const game = new MiniGame(docs, fakeSettings({ briefings: castBriefings(docs), seed, turns: 12, human: F }), callerFor(calls), {}, null, ctrl);
  const seen: Seen = { log: [], did: new Set() };
  const played = game.play();
  await scriptedPlayer(`ws://127.0.0.1:${server.port}`, seen, { dropAfter: 40 });
  await played;
  await server.close();
  return { game, calls, ctrl, seen };
}

test("a scripted player plays a whole mini-game as Francesco through the protocol, with no model calls for him", async () => {
  const { game, calls, ctrl, seen } = await playAsFrancesco(2000);
  assert.equal(game.stopped, false);
  // Every input of the script happened.
  for (const d of ["spoke", "passed", "answered an address", "bribed", "called a Colloquio", "moved", "midnight acts", "reconnected", "pending request re-sent"]) assert.ok(seen.did.has(d), `${d}: ${[...seen.did].join("; ")}`);
  assert.ok([...seen.did].some((d) => d.startsWith("seat choice")), "a seat choice");
  // The protocol's log is what the controller kept.
  assert.deepEqual(seen.log, ctrl.log);
  // No call for Francesco went to a model; his inputs are call records with source "human".
  assert.ok(calls.every((c) => c.character !== F));
  const mine = game.calls.filter((c) => c.character === F);
  assert.ok(mine.length > 0 && mine.every((c) => c.source === "human" && c.costUsd === 0 && c.provider === null && c.user === ""));
  assert.deepEqual([...new Set(mine.map((c) => c.kind))].sort(), ["command", "move", "murder", "seat", "speak"]);
  assert.ok(mine.some((c) => c.verdict === "refused" && /501 characters/.test(c.error!)), "a message over 500 characters is refused");
  assert.ok(mine.some((c) => c.verdict === "refused" && c.raw === "/fly"), "an unknown command is refused");
  assert.ok(mine.some((c) => c.kind === "murder" && c.verdict === "refused"), "guarding yourself is refused");
  // What the player did, in the game's own records.
  const ev = (type: string, f: (e: Record<string, unknown>) => boolean = () => true) => game.events.filter((e) => e.type === type && f(e));
  assert.equal(ev("borrow", (e) => e.character === F).length, 1);
  assert.equal(ev("repay", (e) => e.character === F && e.holder === F).length, 1);
  assert.equal(ev("bribe", (e) => e.from === F).length, 1);
  assert.ok(ev("speech", (e) => e.speaker === F && e.source === "human").length > 3);
  assert.ok(ev("move", (e) => e.character === F && e.choice === "colloquio").length === 1 && ev("move", (e) => e.character === F && e.choice === "join").length === 1);
  assert.ok(ev("murder-act", (e) => e.character === F && e.source === "human").length === 1);
  assert.ok(ev("midnight").length === 1 && game.midnight !== null);
  // /conclude is Francesco's own belief, in his words, with no thought.
  const b = game.memory.beliefs.filter((x) => x.character === F);
  assert.deepEqual(b.map((x) => [x.kind, x.status, x.quote, x.concluded]), [["conclusion", "held", "Lupo killed Lucien de Valois.", true]]);
  // No think(), plan, readings, or perception pass for the player.
  assert.equal(game.thoughts.filter((t) => t.character === F).length, 0);
  assert.equal(game.memory.readings.filter((r) => r.character === F).length, 0);
  // An @-mention made the addressee, and the stored line has no @.
  const addressed = game.lines.filter((l) => l.speaker === F && l.addressee);
  assert.ok(addressed.length > 0 && addressed.every((l) => !l.text.includes("@")));
  // The answer to an address is an extra line: it follows a line addressed to Francesco.
  assert.ok(game.lines.some((l, i) => l.speaker === F && game.lines.slice(0, i).findLast((x) => x.conversation === l.conversation && x.kind === "speech")?.addressee === F));
});

test("/borrow and /repay in the player's words (Interface v0.12, The Player's Words): France's payroll in the menu and the refusal; Il Notaio's confirmations, which an AI guest's History also holds, stay Technical Design's", async () => {
  const { game, seen } = await playAsFrancesco(2000);
  const menu = seen.log.find((e) => e.type === "state" && e.commands.some((c) => c.action === "borrow"));
  assert.ok(menu && menu.type === "state");
  const hint = (action: string) => menu.commands.find((c) => c.action === action)?.hint;
  assert.equal(hint("borrow"), "Go on France's payroll: take one payment of 3 Florins from the Embassy.");
  const repayMenu = seen.log.find((e) => e.type === "state" && e.commands.some((c) => c.action === "repay"));
  assert.ok(repayMenu && repayMenu.type === "state");
  assert.equal(repayMenu.commands.find((c) => c.action === "repay")?.hint, "Pay back one payroll payment, your own or a relative's, for 3 Florins.");
  assert.ok(
    seen.log.some((e) => e.type === "refusal" && e.reason === "You have no payroll payment you could pay back for Lupo, or can't afford it." && e.input === "/repay @Lupo"),
    "a /repay for a guest with no payment is refused in the new words",
  );
  // The private confirmations are notaio.json's, which reach an AI guest's History when it borrows or repays,
  // so they keep their words here (#143 changes them, gated on the TD version); the player sees each one.
  const mine = game.lines.filter((l) => l.kind === "private" && l.speaker === F);
  const purse = Number(mine[0]?.text.match(/(\d+) Florins\.$/)?.[1]);
  assert.deepEqual(
    mine.map((l) => l.text),
    [say("notaio", "lines.pension_taken", { amount: 3, purse }), say("notaio", "lines.pension_renounced", { holder: F, amount: 3 })],
  );
  for (const l of mine) assert.ok(seen.log.some((e) => e.type === "action" && e.private && e.text === l.text), `the player saw: ${l.text}`);
  // Nothing of the player's words reaches a prompt.
  const prompts = game.calls.map((c) => c.user).join("\n");
  for (const words of ["France's payroll: take one payment", "Pay back one payroll payment, your own", "You have no payroll payment"]) assert.ok(!prompts.includes(words), words);
});

for (const [td, docs] of [[" (TD v0.50)", loadDocs(docsFor("0.50"))], [" (TD v0.51: with Il Notaio's guarded readings and stage summaries in it)", docs51]] as const)
test(`isolation: the player's whole event stream is their own History and State, nothing else${td}`, async () => {
  const { game, ctrl } = await playAsFrancesco(7, docs);
  const heard = new Map(game.lines.filter((l) => l.heardBy.includes(F)).map((l) => [l.id, l]));
  const theirConversations = new Set([...heard.values()].map((l) => l.conversation));
  const stream = ctrl.log;
  assert.ok(stream.length > 50);
  for (const e of stream) {
    if (e.type === "line" || e.type === "notaio" || e.type === "action") {
      const l = heard.get(e.id);
      assert.ok(l, `${e.id} is in Francesco's History`);
      assert.equal(e.text, l.text);
      assert.ok(theirConversations.has(e.conversation));
    }
  }
  // Every line Francesco heard reached him, once, in order.
  assert.deepEqual(stream.filter((e) => e.type === "line" || e.type === "notaio" || e.type === "action").map((e) => (e as { id: string }).id), [...heard.keys()]);
  const all = JSON.stringify(stream);
  // No thought, plan, reading, or other line: nothing from a conversation he wasn't in.
  for (const t of game.thoughts) assert.ok(!all.includes(t.text), `thought ${t.id} leaked`);
  // Readings are labels on lines (took), stored by ID: neither an ID nor a label may reach the stream.
  assert.ok(game.memory.readings.length > 0);
  for (const r of game.memory.readings) assert.ok(!all.includes(`"${r.id}"`), `reading ${r.id} leaked`);
  assert.doesNotMatch(all, /"took"|"meant"|"importance"/);
  assert.ok(!all.includes("Goals: be heard."), "a plan leaked");
  // No one else's belief (TD v0.43: the screen never shows a model's reading or belief).
  for (const b of game.memory.beliefs.filter((x) => x.character !== F)) assert.ok(!all.includes(JSON.stringify(b.statement).slice(1, -1)), `belief ${b.id} leaked`);
  // The new panels' content (CC-20261112-03): the web's lines are the public ones and Francesco's own, and
  // the notes are his, as he wrote them.
  const sheet = stream.find((e) => e.type === "state" && e.sheet)! as Extract<Outgoing, { type: "state" }>;
  const conns = sheet.sheet!.connections as { between: string[]; private?: boolean }[];
  assert.ok(conns.length > 0 && conns.filter((c) => c.private).every((c) => c.between[0] === F));
  assert.deepEqual(stream.filter((e) => e.type === "note").map((e) => (e as { text: string }).text), game.playerNotes.map((n) => n.text));
  for (const l of game.lines.filter((x) => !x.heardBy.includes(F))) assert.ok(!stream.some((e) => "id" in e && e.id === l.id), `${l.id} leaked`);
  // With the Web of Secrets open and Il Notaio's box answering (CC-20261113-02): his readings are of the
  // player's own record, so they hold only names and counts from it, and never another's line.
  const readings = stream.filter((e) => e.type === "reading") as Extract<Outgoing, { type: "reading" }>[];
  assert.ok(readings.length >= 3, "readings were shown");
  for (const r of readings) assert.ok(r.upTo <= r.seq && (r.text === null || game.calls.some((c) => c.raw === r.text)), JSON.stringify(r));
  // TD v0.51: every item of a guarded reading or a stage summary is of the player's own record. A sentence
  // quotes a line he heard (the model's, or code's plain version); an event is one of his own lines; a note
  // is a public lore entry's; the background is his sheet's connections.
  const summaries = stream.filter((e) => e.type === "stage-summary") as Extract<Outgoing, { type: "stage-summary" }>[];
  assert.equal(summaries.length > 0, docs === docs51, "stage summaries from TD v0.51 only");
  assert.equal(readings.every((r) => r.guarded), docs === docs51);
  const publicLore = new Set(readLoreFile().loadable.filter((e) => e.scope === "public" && (e.kind ?? "lore") === "lore").map((e) => e.id));
  const items = [...readings.flatMap((r) => r.guarded?.stages.flatMap((s) => s.items) ?? []), ...summaries.flatMap((s) => s.groups.flatMap((g) => g.items))];
  for (const i of items) {
    if (i.kind === "note") assert.ok(publicLore.has(i.entry), i.entry);
    else if (i.kind === "event") assert.ok(i.item === "death" ? game.midnight?.deaths.includes(i.text as never) : [...heard.values()].some((l) => l.text === i.text), i.text);
    else {
      const l = stream.find((e) => e.seq === i.seq) as { id?: string; text?: string };
      assert.ok(l?.id && heard.has(l.id) && i.text.includes(l.text!.split(/[.!?]/)[0]!), `${i.text} quotes ${l?.id}, which he heard`);
    }
  }
  for (const r of readings) for (const c of r.guarded?.background.connections ?? []) assert.ok(conns.some((x) => x.between.join() === c.between.join() && (x as { line?: string }).line === c.line));
  const states = stream.filter((e) => e.type === "state");
  // The places (TD v0.49, from the room of v0.45) are public: every place in the setting's order, who stands
  // in each among the living guests, whether it holds a Colloquio, and which is Francesco's own; nothing more
  // than names. They replace block 5's room and own place in the player's state.
  const PLACES = settingPack().places!;
  const withPlaces = states.filter((e) => (e as Extract<Outgoing, { type: "state" }>).state.places);
  assert.ok(withPlaces.length > 0, "the places reach the player in open play");
  assert.ok(states.every((e) => !("room" in e.state) && !("place" in e.state)), "no room line and no own place beside them");
  let ownless = 0;
  for (const e of withPlaces) {
    const st = (e as Extract<Outgoing, { type: "state" }>).state as { places: { name: string; guests: string[]; private: boolean; own: boolean }[]; present: string[]; conversation: { kind: string } };
    assert.deepEqual(st.places.map((p) => p.name), PLACES, "every place, occupied or empty, in the pack's order");
    for (const p of st.places) assert.deepEqual(Object.keys(p).sort(), ["guests", "name", "own", "private"]);
    const own = st.places.filter((p) => p.own);
    // Their own place: Francesco and who's with him. None only in the moment a Colloquio has ended and its
    // place is free, before he's seated again.
    if (!own.length) {
      ownless++;
      assert.equal(st.conversation.kind, "colloquio", JSON.stringify(st));
      assert.ok(st.places.every((p) => !p.guests.includes(F)), JSON.stringify(st.places));
      continue;
    }
    assert.equal(own.length, 1, JSON.stringify(st.places));
    assert.deepEqual([...own[0]!.guests].sort(), [F, ...st.present].sort(), "their own place: Francesco and who's with him");
    assert.equal(own[0]!.private, st.conversation.kind === "colloquio");
    const named = st.places.flatMap((p) => p.guests);
    assert.equal(new Set(named).size, named.length, "each guest in one place");
  }
  assert.ok(ownless < withPlaces.length / 10, `${ownless} of ${withPlaces.length} states between a Colloquio's end and a seat`);
  // Outside a conversation (midnight, between seats) there's no place to show, as there was no room.
  assert.ok(states.filter((e) => (e.state as { conversation: { kind: string } }).conversation.kind === "gathering").every((e) => !("places" in e.state)));
  // Block 5 for the player: their own purse, and no ledger (Francesco doesn't keep the treasury).
  assert.ok(states.every((e) => !("embassyLedger" in e.state)));
  // The request options name living guests and groups, as 9c and 9h show them; never a location or an inner state.
  for (const r of stream.filter((e) => e.type === "request")) assert.doesNotMatch(JSON.stringify(r), /importance|thought|plan|reading/);
});

test("notes: kept with the game and in the full record, replayed on reconnect, never in a prompt or a public replay", async () => {
  const { game, ctrl, seen } = await playAsFrancesco(2000);
  assert.ok(seen.did.has("note kept"));
  assert.deepEqual(game.playerNotes.map((n) => [n.text, n.guests]), [
    [`${NOTE_MARK} free`, []],
    [`${NOTE_MARK} on Lupo`, ["Lupo"]],
    [`${NOTE_MARK} on a pair`, ["Lupo", "Giorgia Pazzi"]],
    [`${NOTE_MARK} while choosing`, []],
  ]);
  assert.ok(seen.did.has("refused: A note can be about guests at this party only."));
  // In the player's log, so a reconnect (or a refresh) gets them back; the scripted player reconnected mid-game.
  assert.equal(ctrl.log.filter((e) => e.type === "note").length, 4);
  // Never in a prompt: nowhere in the game but the notes themselves and the player's own connection (its
  // event log and what it received): not in any call, prefix, thought, line, event, or memory entry.
  const { playerNotes, ctrl: _c, player: _p, ...rest } = game as unknown as Record<string, unknown>;
  assert.ok(playerNotes);
  const where = Object.entries(rest)
    .filter(([, x]) => (typeof x === "function" ? false : JSON.stringify(x ?? null).includes(NOTE_MARK)))
    .map(([k]) => k);
  assert.deepEqual(where, [], "a note reached the game's other state");
  // In the full record, and not in its replay export.
  const dir = mkdtempSync(join(tmpdir(), "notes-"));
  try {
    const path = join(dir, "game-notes.full.json.gz");
    const record = buildRecord(game, { gameId: "notes", seed: 2000, docs: fakeDocs, briefings: castBriefings(fakeDocs), served: { character: SERVED, system: { ...SERVED, recorder: { model: "fake" } } }, settings: { ...fakeSettings({ turns: 12, human: F }), briefings: undefined }, ms: 0, failure: null, tree: { tracked_changes: [], untracked: [] }, retries: 0, lore: { file: readLoreFile(), loaded: [] }, embeddingModel: null, store: null });
    assert.equal((record as { player_notes?: unknown[] }).player_notes?.length, 4);
    writeFileSync(path, gzipSync(JSON.stringify(record)));
    const html = readFileSync(exportView(path).path, "utf8");
    assert.ok(html.length > 1000 && !html.includes(NOTE_MARK), "a note reached the replay export");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("TD v0.51, the tour's hold: the sheet, errand, briefing, and room are sent, then nothing until the screen's first begin; a later begin changes nothing", async () => {
  const ctrl = new HumanController(F);
  const game = new MiniGame(docs51, fakeSettings({ briefings: castBriefings(docs51), seed: 2000, turns: 6, human: F }), fakeCaller(), {}, null, ctrl);
  const log: Outgoing[] = [];
  let reply: (d: string) => void = () => {};
  ctrl.attach({
    send: (d) => {
      const ev = JSON.parse(d) as Outgoing;
      log.push(ev);
      if (ev.type !== "request" || ev.closed) return;
      const o = ev.options as Record<string, unknown>;
      queueMicrotask(() => {
        // A reconnect's second begin, mid-game: nothing holds again.
        reply(JSON.stringify({ type: "begin" }));
        if (ev.kind === "speak") reply(JSON.stringify({ type: "pass" }));
        else if (ev.kind === "move") reply(JSON.stringify({ type: "choice", request: ev.id, value: { choice: "stay" } }));
        else if (ev.kind === "seat") {
          const g = o.groups as { members: string[] }[];
          reply(JSON.stringify({ type: "choice", request: ev.id, value: g.length ? { choice: "join", target: g[0]!.members[0] } : { choice: "wait", target: null } }));
        } else reply(JSON.stringify({ type: "choice", request: ev.id, value: { acts: [{ type: "watch", target: (o.guests as string[])[0] }] } }));
      });
    },
    onMessage: (cb) => void (reply = cb),
    onClose: () => {},
  });
  const played = game.play();
  await new Promise((r) => setTimeout(r, 50));
  // Held: the player's sheet and state (the room's places, his errand and briefing), and not one line; no call made.
  assert.equal(log.length, 1);
  const first = log[0] as Extract<Outgoing, { type: "state" }>;
  assert.equal(first.type, "state");
  assert.ok(first.sheet && (first.sheet as { errand: string }).errand && (first.sheet as { briefing: string }).briefing);
  assert.ok((first.state as { places?: unknown[] }).places?.length, "the room, place by place");
  assert.equal(game.calls.length, 0);
  assert.equal(game.lines.length, 0, "no line yet, in the game or the player's log");
  // TD v0.51's flag: Francesco's errand is a payment, so it can't be finished by /conclude.
  assert.equal((first.state as { knowledgeErrand?: boolean }).knowledgeErrand, false);
  reply(JSON.stringify({ type: "begin" }));
  await played;
  assert.ok(log.some((e) => e.type === "notaio") && log.some((e) => e.type === "result"), "begun, the evening played to its end");
  assert.ok(log.filter((e) => e.type === "state").every((e) => (e as Extract<Outgoing, { type: "state" }>).state.knowledgeErrand === false));
  assert.ok(ctrl.received.filter((m) => m.type === "begin").length > 1);
  // The hold isn't a game event: the game's record is the one an unheld game writes.
  const unheld = new HumanController(F);
  const again = new MiniGame(docs51, fakeSettings({ briefings: castBriefings(docs51), seed: 2000, turns: 6, human: F }), fakeCaller(), {}, null, unheld);
  unheld.receive(JSON.stringify({ type: "begin" }));
  let r2: (d: string) => void = () => {};
  unheld.attach({
    send: (d) => {
      const ev = JSON.parse(d) as Outgoing;
      if (ev.type !== "request" || ev.closed) return;
      const o = ev.options as Record<string, unknown>;
      queueMicrotask(() => {
        if (ev.kind === "speak") r2(JSON.stringify({ type: "pass" }));
        else if (ev.kind === "move") r2(JSON.stringify({ type: "choice", request: ev.id, value: { choice: "stay" } }));
        else if (ev.kind === "seat") {
          const g = o.groups as { members: string[] }[];
          r2(JSON.stringify({ type: "choice", request: ev.id, value: g.length ? { choice: "join", target: g[0]!.members[0] } : { choice: "wait", target: null } }));
        } else r2(JSON.stringify({ type: "choice", request: ev.id, value: { acts: [{ type: "watch", target: (o.guests as string[])[0] }] } }));
      });
    },
    onMessage: (cb) => void (r2 = cb),
    onClose: () => {},
  });
  await again.play();
  const timeless = (es: unknown[]) => es.map((e) => ({ ...(e as object), ms: undefined }));
  assert.deepEqual(timeless(again.events), timeless(game.events), "the same events, wall-clock times aside");
  assert.deepEqual(again.lines, game.lines);
});

test("TD v0.51: a game with no human never waits; the flag is true only for a character whose errand a conclusion can finish", async () => {
  const docs = docs51;
  const solo = new MiniGame(docs, fakeSettings({ briefings: castBriefings(docs), seed: 3, turns: 2 }), fakeCaller());
  await solo.play();
  assert.ok(solo.lines.length > 0);
  // Plot Point Checks' "Passes when": a conclusion settles Piero's, Beatrice's, and LeNoir's (the parse is TD's table).
  for (const c of ["Piero de' Medici", "Sister Beatrice", "Captain Armand LeNoir"]) assert.ok(docs.conclusionErrands.includes(c as never), c);
  for (const c of [F, "Lupo", "Contessa Isabella", "Raffaello de' Medici"]) assert.ok(!docs.conclusionErrands.includes(c as never), c);
});

test("all-AI games don't change: no human, no controller, and a controller without the setting is refused", async () => {
  const ctrl = new HumanController(F);
  assert.throws(() => new MiniGame(fakeDocs, fakeSettings(), fakeCaller(), {}, null, ctrl), /needs both/);
  assert.throws(() => new MiniGame(fakeDocs, fakeSettings({ human: F }), fakeCaller()), /needs both/);
  const lupo = new HumanController("Lupo");
  assert.throws(() => new MiniGame(fakeDocs, fakeSettings({ human: "Lupo" }), fakeCaller(), {}, null, lupo), /isn't a playable character/);
});

test("@-mentions and commands parse by the setting pack's names and the roster's aliases", () => {
  const present = ["Lupo", "Contessa Isabella", "Raffaello de' Medici"];
  assert.deepEqual(mentions("@Isabella, a word. And @Lupo too.", present), { text: "Isabella, a word. And Lupo too.", addressee: "Contessa Isabella" });
  assert.deepEqual(mentions("Write to me @ home, @Lupone.", present), { text: "Write to me @ home, @Lupone.", addressee: null });
  assert.deepEqual(mentions("@Raffaello de' Medici?", present).addressee, "Raffaello de' Medici");
  assert.deepEqual(parseCommand("/bribe @Lupo 3", present), { action: "bribe", target: "Lupo", amount: 3 });
  assert.deepEqual(parseCommand("/BRIBE @the Contessa 2", present), { action: "bribe", target: "Contessa Isabella", amount: 2 });
  assert.deepEqual(parseCommand("/repay @Nobody", present), { action: "repay", target: "Nobody" });
  assert.deepEqual(parseCommand("/repay", present), { action: "repay", target: null });
  assert.deepEqual(parseCommand("/watch @Lupo", present), { action: "investigate", target: "Lupo" });
  assert.deepEqual(parseCommand("/conclude  It was Lupo. ", present), { action: "conclude", statement: "It was Lupo." });
  assert.deepEqual(parseCommand("/investigate @Lupo", present), { action: null, name: "/investigate" });
});
