// Play the mini-game in the browser (TD v0.39, Player Interface › How it's built; CC-20261111-09, #62).
//
//   npm run play -- --as "Francesco Pazzi" --minigame                 a real game: AI guests on the usual models
//   npm run play -- --as "Francesco Pazzi" --minigame --fake          the fake model caller: no model calls, no spend
//   npm run play -- --as "Francesco Pazzi" --minigame -- --cap 3      after `--`, more runner flags (run.ts)
//
// Builds the screen (web/), serves it on localhost with the start screen's information, and opens the
// browser. Choosing a card starts the game. A real game runs the mini-game runner as a child process
// with --human, so routing, caps, the ledger, and the record are the runner's; run it under
// `op run --env-file=.env --` with PROBE_TOTAL_USD set, as for any run. A fake game runs in this
// process. Afterwards the game's replay-viewer export is served at /replay.

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer as createNetServer } from "node:net";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { config } from "../../probe.config.ts";
import { HumanController } from "../core/human.ts";
import { serveWebSocket } from "../core/ws.ts";
import { loadDocs } from "../sources/docs.ts";
import { CAST, castBriefings } from "./cast.ts";
import { MiniGame, type CallRequest, type Caller, type GameSettings } from "./engine.ts";
import { fakeCaller } from "./fake-caller.ts";
import { playable } from "./player.ts";
import { buildRecord } from "./record.ts";
import { screenInfo } from "./screen-info.ts";
import { exportView } from "./view.ts";
import { readLoreFile } from "./lore.ts";

const { values: opts, positionals: runnerArgs } = parseArgs({
  allowPositionals: true,
  options: {
    as: { type: "string" },
    minigame: { type: "boolean", default: false },
    fake: { type: "boolean", default: false },
    port: { type: "string", default: "8770" },
    "ws-port": { type: "string", default: "8771" },
    seed: { type: "string", default: "1492" },
    turns: { type: "string", default: "8" },
    "no-open": { type: "boolean", default: false },
    /** Fake games only: how long an AI guest takes to speak, so the screen can be watched. */
    "fake-delay": { type: "string", default: "600" },
  },
});

const WEB = resolve("web");
const docs = loadDocs(config.docs);
const briefings = castBriefings(docs);

/** The guests a player may choose here: setting.json's playable characters who are in the mini-game's cast. */
const choices = playable().filter((n) => CAST.includes(n));
if (!opts.minigame) throw new Error("Only the mini-game is playable so far: add --minigame");
if (opts.as && !choices.includes(opts.as)) throw new Error(`--as must be one of ${choices.join(", ")}`);

/** Everything the start screen and the game screen need that isn't in the player's own feed: public information only. */
const startInfo = () => ({ ...screenInfo(choices.filter((n) => !opts.as || n === opts.as), briefings), started: game.started, ws: game.ws });

const game: { started: string | null; ws: string | null; replay: string | null; error: string | null } = { started: null, ws: null, replay: null, error: null };
let ctrl: HumanController | null = null;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A fake game in this process: the fake model caller, slowed so the screen can be followed. */
async function startFake(name: string): Promise<void> {
  ctrl = new HumanController(name);
  const calls: CallRequest[] = [];
  const fake = fakeCaller(calls);
  const caller: Caller = async (req) => {
    if (req.kind === "speak") await delay(Number(opts["fake-delay"]));
    return fake(req);
  };
  const settings: GameSettings = {
    cast: CAST,
    briefings,
    turns: Number(opts.turns),
    seed: Number(opts.seed),
    utterancesPerTurn: 12,
    historyWindow: 10,
    thoughtWindow: 4,
    maxCapannello: 4,
    maxTokens: { plan: 400, think: 250, speak: 200, move: 500, seat: 250, murder: 300, "star-pass": 1800, "claims-pass": 1000, "sweep-reask": 1800, "thought-pass": 600, "perception-pass": 800, "knowledge-check": 300 },
    playTemperature: 0.7,
    systemTemperature: 0,
    checks: ["F2", "F3", "F4", "F5"].flatMap((fact) => CAST.map((character) => ({ character, fact }))),
    notebook: "perceived",
    retrieval: "overlap",
    lore: "off",
    human: name,
  };
  const g = new MiniGame(docs, settings, caller, {}, null, ctrl);
  const started = Date.now();
  void g.play().then(
    () => {
      const gameId = `${new Date().toISOString().replace(/[:.]/g, "-")}-play-fake`;
      const fakeServed = { model: { slug: "fake" }, endpoint: { providerName: "fake", quantization: null }, servedId: null };
      const lore = readLoreFile();
      const record = buildRecord(g, { gameId, seed: settings.seed, docs, briefings, served: { character: fakeServed, system: { ...fakeServed, recorder: { model: "fake" } } }, settings: { ...settings, briefings: undefined }, ms: Date.now() - started, failure: null, tree: { tracked_changes: [], untracked: [] }, retries: 0, lore: { file: lore, loaded: [] }, embeddingModel: null, store: null });
      const dir = resolve("results/play-fake");
      mkdirSync(dir, { recursive: true });
      const path = join(dir, `game-${gameId}.full.json.gz`);
      writeFileSync(path, gzipSync(JSON.stringify(record)));
      game.replay = exportView(path).path;
      console.log(`Fake game over in ${((Date.now() - started) / 60000).toFixed(1)} min. Record ${path}\nReplay ${game.replay}`);
    },
    (e) => {
      game.error = String((e as Error).stack ?? e);
      console.error(game.error);
    },
  );
}

/** A real game: the runner with --human, as a child process; resolves once it's waiting for the player. */
function startReal(name: string, wsPort: number): Promise<void> {
  const args = ["tsx", "src/minigame/run.ts", "--human", name, "--port", String(wsPort), "--games", "1", "--seed", opts.seed!, "--turns", opts.turns!, ...runnerArgs];
  console.log(`Starting: npx ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}`);
  const child = spawn("npx", args, { stdio: ["ignore", "pipe", "inherit"], env: process.env });
  const started = Date.now();
  let record: string | null = null;
  return new Promise((ready, fail) => {
    let buffered = "";
    child.stdout.on("data", (chunk: Buffer) => {
      process.stdout.write(chunk);
      buffered += chunk.toString();
      for (;;) {
        const nl = buffered.indexOf("\n");
        if (nl < 0) break;
        const line = buffered.slice(0, nl);
        buffered = buffered.slice(nl + 1);
        if (line.startsWith("Waiting for the player")) ready();
        const m = line.match(/^\s+(\S+\.full\.json\.gz)$/);
        if (m) record = m[1]!;
      }
    });
    child.on("exit", (code) => {
      console.log(`The game took ${((Date.now() - started) / 60000).toFixed(1)} min (runner exit ${code}).`);
      if (record) game.replay = exportView(record).path;
      else game.error = `the runner exited (${code}) without a game record`;
      fail(new Error(game.error ?? "the runner exited"));
    });
  });
}

const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".map": "application/json" };
const FILES: Record<string, string> = { "/": join(WEB, "index.html"), "/theme.css": join(WEB, "theme.css"), "/app.js": join(WEB, "dist/app.js"), "/app.css": join(WEB, "dist/app.css"), "/app.js.map": join(WEB, "dist/app.js.map") };

function send(res: ServerResponse, status: number, body: string | Buffer, type = "application/json") {
  res.writeHead(status, { "content-type": type, "cache-control": "no-store" });
  res.end(body);
}

async function onRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  try {
    if (req.method === "GET" && FILES[url.pathname]) return send(res, 200, readFileSync(FILES[url.pathname]!), TYPES[url.pathname === "/" ? ".html" : url.pathname.slice(url.pathname.lastIndexOf("."))]);
    if (req.method === "GET" && url.pathname === "/api/start") return send(res, 200, JSON.stringify(startInfo()));
    if (req.method === "GET" && url.pathname === "/api/replay") return send(res, 200, JSON.stringify({ url: game.replay ? "/replay" : null, error: game.error }));
    if (req.method === "GET" && url.pathname === "/replay" && game.replay) return send(res, 200, readFileSync(game.replay), TYPES[".html"]);
    if (req.method === "POST" && url.pathname === "/api/start") {
      let body = "";
      for await (const chunk of req) body += chunk;
      const name = (JSON.parse(body || "{}") as { character?: string }).character ?? "";
      if (!choices.includes(name)) return send(res, 400, JSON.stringify({ error: "not a playable guest" }));
      if (game.started && game.started !== name) return send(res, 409, JSON.stringify({ error: "a game is already running" }));
      if (!game.started) {
        game.started = name;
        if (opts.fake) {
          await startFake(name);
          game.ws = `ws://127.0.0.1:${port}/ws`;
        } else {
          // The runner's WebSocket address, once it says it's waiting for the player.
          const wsPort = Number(opts["ws-port"]);
          await startReal(name, wsPort).then(
            () => void (game.ws = `ws://127.0.0.1:${wsPort}`),
            () => {},
          );
        }
      }
      return send(res, game.ws ? 200 : 500, JSON.stringify({ ws: game.ws, error: game.error }));
    }
    send(res, 404, JSON.stringify({ error: "not found" }));
  } catch (e) {
    send(res, 500, JSON.stringify({ error: String((e as Error).message) }));
  }
}

// ---- Claim the port, build the screen, serve it, open it -----------------------------------------
//
// The port first, so nothing is built while an older play server still holds it: that server would serve
// the new screen against its own, older /api/start (CC-20261113-01, #88).

/** Refuses to go on when a port is taken, naming it and how to free it. */
function portTaken(p: number, flag: string): never {
  console.error(`Port ${p} is already in use, probably by an earlier play server that's still running.\nStop that one (Ctrl-C in its terminal, or: lsof -ti tcp:${p} | xargs kill), or choose another port with ${flag}. Nothing was built.`);
  process.exit(1);
}
const inUse = (e: unknown) => (e as NodeJS.ErrnoException).code === "EADDRINUSE";

const server = await serveWebSocket(
  Number(opts.port),
  (conn) => {
    // The fake game's player connects here; a real game's connects to the runner's own port.
    if (ctrl) ctrl.attach(conn);
  },
  (req, res) => void onRequest(req, res),
).catch((e: unknown) => (inUse(e) ? portTaken(Number(opts.port), "--port") : Promise.reject(e)));
// A real game's runner opens its own WebSocket port later: check it now too, while nothing has started.
if (!opts.fake) {
  const wsPort = Number(opts["ws-port"]);
  await new Promise<void>((ok, fail) => {
    const probe = createNetServer();
    probe.once("error", (e) => (inUse(e) ? portTaken(wsPort, "--ws-port") : fail(e)));
    probe.listen(wsPort, "127.0.0.1", () => probe.close(() => ok()));
  });
}
console.log("Building the screen…");
await build({ entryPoints: [join(WEB, "src/main.tsx")], bundle: true, outfile: join(WEB, "dist/app.js"), format: "esm", jsx: "automatic", sourcemap: true, target: "es2022", logLevel: "warning" });
const port = server.port;
const url = `http://127.0.0.1:${port}/`;
console.log(`The player screen: ${url}${opts.fake ? " (fake game: no model calls)" : ""}`);
if (!opts["no-open"] && process.platform === "darwin") spawn("open", [url], { stdio: "ignore", detached: true }).unref();
