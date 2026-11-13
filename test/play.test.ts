// `npm run play` with its port already taken (CC-20261113-01, #88): an older play server still holding the
// port would serve the new screen against its own, older /api/start. So play claims the port before it
// builds anything, and when the port is taken it stops with a plain message naming the port and how to
// free it. No model calls: the fake game, which never starts.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { test } from "node:test";

test("play refuses a taken port with a plain message, and builds nothing", async () => {
  const holder = createServer();
  await new Promise<void>((ok) => holder.listen(0, "127.0.0.1", ok));
  const port = (holder.address() as { port: number }).port;
  try {
    const p = spawn("npx", ["tsx", "src/minigame/play.ts", "--minigame", "--fake", "--no-open", "--port", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d: Buffer) => (out += d));
    p.stderr.on("data", (d: Buffer) => (err += d));
    const code = await new Promise<number | null>((ok) => p.on("exit", ok));
    assert.equal(code, 1, `exit code; stderr: ${err}`);
    assert.match(err, new RegExp(`Port ${port} is already in use`), "names the port");
    assert.match(err, new RegExp(`lsof -ti tcp:${port}`), "and how to free it");
    assert.match(err, /--port/, "or how to choose another");
    assert.doesNotMatch(err, /\n\s+at /, "a message, not a stack trace");
    assert.doesNotMatch(out, /The player screen/, "it never served");
    // Its own word that it built nothing (the browser test may be building web/dist at the same time, so not the files' times).
    assert.doesNotMatch(out, /Building the screen/, "the screen wasn't built");
  } finally {
    holder.close();
  }
});
