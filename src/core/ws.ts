// A small WebSocket server (RFC 6455) on Node's http module, for the player's connection: text frames,
// fragmentation, ping and pong, close. No extensions, no binary messages. Part of the conversation
// core; the human controller attaches each connection.

import { createHash } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { Duplex } from "node:stream";
import type { Connection } from "./human.ts";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

/** A text frame from the server (unmasked). */
function frame(opcode: number, payload: Buffer): Buffer {
  const n = payload.length;
  const head = n < 126 ? Buffer.from([0x80 | opcode, n]) : n < 65536 ? Buffer.from([0x80 | opcode, 126, n >> 8, n & 255]) : Buffer.concat([Buffer.from([0x80 | opcode, 127]), (() => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; })()]);
  return Buffer.concat([head, payload]);
}

function connection(socket: Duplex): Connection {
  const onMessage: ((d: string) => void)[] = [];
  const onClose: (() => void)[] = [];
  let buf = Buffer.alloc(0);
  let parts: Buffer[] = [];
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    for (const cb of onClose) cb();
  };
  socket.on("data", (chunk: Buffer) => {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) return;
      const fin = (buf[0]! & 0x80) !== 0;
      const opcode = buf[0]! & 0x0f;
      const masked = (buf[1]! & 0x80) !== 0;
      let len = buf[1]! & 0x7f;
      let at = 2;
      if (len === 126) {
        if (buf.length < 4) return;
        len = buf.readUInt16BE(2);
        at = 4;
      } else if (len === 127) {
        if (buf.length < 10) return;
        len = Number(buf.readBigUInt64BE(2));
        at = 10;
      }
      const maskAt = at;
      if (masked) at += 4;
      if (buf.length < at + len) return;
      const payload = Buffer.from(buf.subarray(at, at + len));
      if (masked) for (let i = 0; i < len; i++) payload[i]! ^= buf[maskAt + (i % 4)]!;
      buf = buf.subarray(at + len);
      if (opcode === 0x8) {
        if (!socket.destroyed) socket.end(frame(0x8, Buffer.alloc(0)));
        close();
        return;
      }
      if (opcode === 0x9) socket.write(frame(0xa, payload));
      if (opcode === 0x1 || opcode === 0x0) {
        parts.push(payload);
        if (fin) {
          const text = Buffer.concat(parts).toString("utf8");
          parts = [];
          for (const cb of onMessage) cb(text);
        }
      }
    }
  });
  socket.on("close", close);
  socket.on("error", close);
  return {
    send: (data) => {
      if (!closed && !socket.destroyed) socket.write(frame(0x1, Buffer.from(data, "utf8")));
    },
    onMessage: (cb) => void onMessage.push(cb),
    onClose: (cb) => void onClose.push(cb),
  };
}

/**
 * Serves WebSocket connections on `port` (0 for any free port), handing each to `onConnection`. Plain
 * HTTP requests get `onRequest` if given, else 404. Resolves once listening; rejects if the port is taken.
 */
export function serveWebSocket(port: number, onConnection: (c: Connection, req: IncomingMessage) => void, onRequest?: Parameters<typeof createServer>[1]): Promise<{ server: Server; port: number; close: () => Promise<void> }> {
  const sockets = new Set<Duplex>();
  const server = createServer(onRequest ?? ((_, res) => res.writeHead(404).end()));
  server.on("upgrade", (req, socket) => {
    const key = req.headers["sec-websocket-key"];
    if (req.headers.upgrade?.toLowerCase() !== "websocket" || typeof key !== "string") {
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
      return;
    }
    const accept = createHash("sha1").update(key + GUID).digest("base64");
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    onConnection(connection(socket), req);
  });
  // A taken port rejects (EADDRINUSE), rather than throwing from an unhandled error event.
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      const addr = server.address();
      resolve({
        server,
        port: typeof addr === "object" && addr ? addr.port : port,
        close: () =>
          new Promise<void>((done) => {
            for (const s of sockets) s.destroy();
            server.close(() => done());
          }),
      });
    });
  });
}
