// The demo page's server, in the page (CC-20261116-01, #172): the fake game runs here on the fake model
// caller, and `fetch` and `WebSocket` are replaced for the calls the player screen makes, so the screen
// (web/src/main.tsx) runs unchanged. What play.ts does for `--fake`, without the server. No model calls.
//
// The page's address may carry play.ts's fake-game flags: ?turns=8&seed=1492&delay=600.

import data from "demo:data";
import { HumanController, type Connection } from "../../src/core/human.ts";
import { MiniGame, type Caller } from "../../src/minigame/engine.ts";
import { fakeCaller } from "../../src/minigame/fake-caller.ts";
import { FAKE_DEFAULTS, fakeSettings } from "../../src/minigame/fake-settings.ts";

const { docs, briefings, choices, info } = data;
const query = new URLSearchParams(location.search);
const flag = (name: string, fallback: number) => (query.get(name) !== null && Number.isFinite(Number(query.get(name))) ? Number(query.get(name)) : fallback);

const game: { started: string | null; ws: string | null; error: string | null } = { started: null, ws: null, error: null };
let ctrl: HumanController | null = null;

/** A fake game in this page: the fake model caller, slowed so the screen can be followed (as play.ts's startFake). */
function startFake(name: (typeof choices)[number]): void {
  ctrl = new HumanController(name);
  const fake = fakeCaller();
  const ms = flag("delay", FAKE_DEFAULTS.delayMs);
  const caller: Caller = async (req) => {
    if (req.kind === "speak") await new Promise((r) => setTimeout(r, ms));
    return fake(req);
  };
  const settings = fakeSettings(name, briefings, { turns: flag("turns", FAKE_DEFAULTS.turns), seed: flag("seed", FAKE_DEFAULTS.seed) });
  void new MiniGame(docs, settings, caller, {}, null, ctrl).play().catch((e: unknown) => {
    game.error = String((e as Error).stack ?? e);
    console.error(game.error);
  });
}

// ---- fetch: the screen's two calls ------------------------------------------------------------------

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const realFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href);
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (method === "GET" && url.pathname === "/api/start") return json(200, { ...info, started: game.started, ws: game.ws });
  if (method === "GET" && url.pathname === "/api/replay") return json(200, { url: null, error: game.error });
  if (method === "POST" && url.pathname === "/api/start") {
    const name = (JSON.parse(typeof init?.body === "string" ? init.body : "{}") as { character?: string }).character ?? "";
    const choice = choices.find((n) => n === name);
    if (!choice) return json(400, { error: "not a playable guest" });
    if (game.started && game.started !== name) return json(409, { error: "a game is already running" });
    if (!game.started) {
      game.started = name;
      startFake(choice);
      game.ws = "ws://demo.invalid/ws";
    }
    return json(200, { ws: game.ws, error: game.error });
  }
  return realFetch(input, init);
};

// ---- WebSocket: the player's connection, in the page --------------------------------------------------

/** Runs `fn` as its own task, in order, as a socket delivers its messages. */
const channel = new MessageChannel();
const tasks: (() => void)[] = [];
channel.port1.onmessage = () => tasks.shift()?.();
const later = (fn: () => void) => {
  tasks.push(fn);
  channel.port2.postMessage(null);
};

class DemoSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  readyState: number = DemoSocket.CONNECTING;
  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  private toEngine: ((data: string) => void)[] = [];
  private closers: (() => void)[] = [];

  constructor(readonly url: string) {
    later(() => {
      if (this.readyState !== DemoSocket.CONNECTING) return;
      this.readyState = DemoSocket.OPEN;
      this.onopen?.(new Event("open"));
      const conn: Connection = {
        send: (d) => later(() => this.readyState === DemoSocket.OPEN && this.onmessage?.(new MessageEvent("message", { data: d }))),
        onMessage: (cb) => void this.toEngine.push(cb),
        onClose: (cb) => void this.closers.push(cb),
      };
      ctrl?.attach(conn);
    });
  }

  send(d: string): void {
    if (this.readyState !== DemoSocket.OPEN) return;
    later(() => this.toEngine.forEach((cb) => cb(d)));
  }

  close(): void {
    if (this.readyState === DemoSocket.CLOSED) return;
    this.readyState = DemoSocket.CLOSED;
    this.closers.forEach((cb) => cb());
    later(() => this.onclose?.(new Event("close")));
  }
}

window.WebSocket = DemoSocket as unknown as typeof WebSocket;
