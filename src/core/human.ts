// The human controller (TD v0.39, Player Interface › How it's built; Layers: the conversation core).
// Where the game would make a character call for the player's character, it makes a pending request
// here instead and awaits the answer, with no timeout. The controller keeps the player's event log,
// replays it to a connection that (re)attaches, re-sends any pending request, and routes the player's
// messages: to the pending request if it takes them, otherwise to the game's input handler. It knows
// nothing of the game's setting or rules; what is valid is the game's to say.

import { Incoming, type Outgoing, type OutgoingBody, type RequestKind } from "./protocol.ts";

/** One connection to the player's screen (a WebSocket, or an in-process test player). */
export interface Connection {
  send(data: string): void;
  onMessage(cb: (data: string) => void): void;
  onClose(cb: () => void): void;
}

/** A request's verdict on a message: the answer, a refusal (keep waiting), or null (not for this request). */
export type Answer<T> = { value: T } | { refusal: string } | null;

interface Pending {
  event: Outgoing & { type: "request" };
  accept: (m: Incoming) => Answer<unknown>;
  resolve: (v: unknown) => void;
}

export class HumanController {
  /** Everything sent to the player, in order. */
  readonly log: Outgoing[] = [];
  /** Every message received, as parsed (or the raw text if it didn't parse). */
  readonly received: (Incoming | { type: "unparsed"; raw: string })[] = [];
  private conns = new Set<Connection>();
  private pending: Pending | null = null;
  private nextSeq = 1;
  private nextRequest = 1;
  /** Messages no request took: the game holds, queues, or refuses them. */
  onInput: (m: Incoming) => void = () => {};

  constructor(readonly character: string) {}

  /** Appends an event to the player's log and sends it to every connection. */
  send(body: OutgoingBody): Outgoing {
    const ev = { ...body, seq: this.nextSeq++ } as Outgoing;
    this.log.push(ev);
    const data = JSON.stringify(ev);
    for (const c of this.conns) c.send(data);
    return ev;
  }

  /** Waits for the player: sends a request and resolves with the first message `accept` takes. No timeout. */
  request<T>(kind: RequestKind, options: Record<string, unknown>, accept: (m: Incoming) => Answer<T>): Promise<T> {
    if (this.pending) throw new Error("the game already waits for the player");
    const event = this.send({ type: "request", id: `Q${this.nextRequest++}`, kind, options }) as Outgoing & { type: "request" };
    return new Promise<T>((resolve) => {
      this.pending = { event, accept, resolve: resolve as (v: unknown) => void };
    });
  }

  /** The request being waited on, if any. */
  get waiting(): (Outgoing & { type: "request" }) | null {
    return this.pending?.event ?? null;
  }

  /** A connection (re)attaches: it gets the whole log, then any pending request again. */
  attach(conn: Connection): void {
    this.conns.add(conn);
    for (const ev of this.log) conn.send(JSON.stringify(ev));
    if (this.pending) conn.send(JSON.stringify({ ...this.pending.event, resent: true }));
    conn.onMessage((data) => this.receive(data));
    conn.onClose(() => this.conns.delete(conn));
  }

  get connections(): number {
    return this.conns.size;
  }

  /** One message from the player. */
  receive(data: string): void {
    let m: Incoming;
    try {
      const parsed = Incoming.safeParse(JSON.parse(data));
      if (!parsed.success) throw new Error("shape");
      m = parsed.data;
    } catch {
      this.received.push({ type: "unparsed", raw: data });
      return;
    }
    this.received.push(m);
    const p = this.pending;
    if (p && !(m.type === "choice" && m.request !== p.event.id)) {
      const a = p.accept(m);
      if (a && "value" in a) {
        this.pending = null;
        this.send({ type: "request", id: p.event.id, kind: p.event.kind, options: {}, closed: true });
        p.resolve(a.value);
        return;
      }
      if (a) {
        this.send({ type: "refusal", reason: a.refusal, input: "text" in m ? m.text : null });
        return;
      }
    }
    this.onInput(m);
  }
}
