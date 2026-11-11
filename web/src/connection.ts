// The player's connection to the engine (TD v0.39, The connection). On (re)connect the engine replays
// the player's whole log, so the screen starts its log again; then any pending request comes again.

export type Ev = { seq: number; type: string; [k: string]: unknown };

export function connect(url: string, on: { event: (e: Ev) => void; reset: () => void; status: (s: "open" | "closed") => void }): { send: (m: unknown) => void } {
  let ws: WebSocket | null = null;
  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => {
      on.reset();
      on.status("open");
    };
    ws.onmessage = (m) => on.event(JSON.parse(String(m.data)) as Ev);
    ws.onclose = () => {
      on.status("closed");
      setTimeout(open, 1000);
    };
  };
  open();
  return { send: (m) => ws?.readyState === WebSocket.OPEN && ws.send(JSON.stringify(m)) };
}
