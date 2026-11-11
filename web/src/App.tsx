// The player screen (TD v0.39, The screen): start screen, the game (your character, the conversation, who
// you're talking to), decision cards, the death banner, and the end screen. Words come from the setting
// pack (words.ts); every look comes from theme.css's tokens (app.css uses only those).

import { useEffect, useMemo, useRef, useState } from "react";
import { connect, type Ev } from "./connection.ts";
import { derive, type Line, type Request, type State, type View } from "./model.ts";
import { getInfo, guest, list, names, setInfo, w, type StartInfo } from "./words.ts";

type Send = (m: unknown) => void;

export function App() {
  const [info, setLocal] = useState<StartInfo | null>(null);
  const [game, setGame] = useState<{ me: string; ws: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/start")
      .then((r) => r.json())
      .then((i: StartInfo) => {
        setInfo(i);
        setLocal(i);
        if (i.started && i.ws) setGame({ me: i.started, ws: i.ws });
      })
      .catch((e) => setError(String(e)));
  }, []);
  if (error) return <div className="notice danger">{error}</div>;
  if (!info) return null;
  if (!game) return <Start onStart={(me, ws) => setGame({ me, ws })} />;
  return <Game me={game.me} url={game.ws} />;
}

// ---- Start screen ---------------------------------------------------------------------------------

export function Start({ onStart }: { onStart: (me: string, ws: string) => void }) {
  const info = getInfo();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const start = async (name: string) => {
    setStarting(name);
    const r = await fetch("/api/start", { method: "POST", body: JSON.stringify({ character: name }) });
    const j = (await r.json()) as { ws: string | null; error: string | null };
    if (j.ws) onStart(name, j.ws);
    else {
      setError(j.error ?? String(r.status));
      setStarting(null);
    }
  };
  return (
    <div className="start">
      <h1>{w("screen.start.heading")}</h1>
      <p className="muted">{w("orientation")}</p>
      <div className="cards">
        {info.playable.map((p) => (
          <div className="start-card" key={p.name}>
            <div className="who">
              <Portrait name={p.name} large />
              <div>
                <div className="name">{p.name}</div>
                <div className="muted">{guest(p.name)?.subtitle}</div>
              </div>
            </div>
            <p className="intro">{p.intro}</p>
            <button className="primary" disabled={!!starting} onClick={() => void start(p.name)}>
              {starting === p.name ? w("screen.start.starting") : w("screen.start.play", { name: p.name })}
            </button>
          </div>
        ))}
      </div>
      {error && <div className="notice danger">{error}</div>}
    </div>
  );
}

// ---- Shared pieces ---------------------------------------------------------------------------------

/** A placeholder portrait: initials in a circle coloured by faction. Its tooltip is the public line only. */
function Portrait({ name, large }: { name: string; large?: boolean }) {
  const g = guest(name);
  return (
    <span className={`portrait${large ? " large" : ""}`} style={{ background: g?.colour }} title={g?.subtitle}>
      {g?.initials}
    </span>
  );
}

/** A guest's name, with the public subtitle as its tooltip. */
function Name({ name }: { name: string }) {
  return (
    <span className="guest" title={guest(name)?.subtitle}>
      {name}
    </span>
  );
}

function Modal({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button onClick={onClose}>{w("screen.close")}</button>
        </header>
        <div className="sheet">{text}</div>
      </div>
    </div>
  );
}

// ---- The game ----------------------------------------------------------------------------------------

function Game({ me, url }: { me: string; url: string }) {
  const [log, setLog] = useState<Ev[]>([]);
  const [status, setStatus] = useState<"open" | "closed" | "connecting">("connecting");
  const conn = useRef<{ send: Send } | null>(null);
  useEffect(() => {
    conn.current = connect(url, { event: (e) => setLog((l) => [...l, e]), reset: () => setLog([]), status: setStatus });
  }, [url]);
  const v = useMemo(() => derive(log), [log]);
  const send: Send = (m) => conn.current?.send(m);
  return <GameView me={me} v={v} send={send} status={status} />;
}

/** The game screen for a view of the player's log (also rendered by the tests). */
export function GameView({ me, v, send, status }: { me: string; v: View; send: Send; status: "open" | "closed" | "connecting" }) {
  if (v.result) return <End v={v} me={me} />;
  const dead = v.deaths.some((d) => d.you);
  return (
    <div className="layout">
      <Left me={me} v={v} />
      <Centre me={me} v={v} send={send} dead={dead} status={status} />
      <Right me={me} v={v} />
    </div>
  );
}

function Left({ me, v }: { me: string; v: View }) {
  const [open, setOpen] = useState<"briefing" | "rules" | null>(null);
  const s = v.state;
  const g = guest(me);
  return (
    <aside className="side left">
      <div className="label">{w("screen.you")}</div>
      <div className="who">
        <Portrait name={me} large />
        <div>
          <div className="name">{me}</div>
          <div className="muted">{g?.faction}</div>
        </div>
      </div>
      {s && (
        <dl className="facts">
          <dt>{w("screen.purse")}</dt>
          <dd>{w("screen.purseValue", { amount: s.florins })}</dd>
          <dt>{w("screen.pensions")}</dt>
          <dd>{s.pensionsHeld}</dd>
          <dt>{w("screen.withdrawals")}</dt>
          <dd>{s.withdrawalCount}</dd>
          {s.plotStatus && (
            <>
              <dt>{w("screen.errand")}</dt>
              <dd>{s.plotStatus}</dd>
            </>
          )}
        </dl>
      )}
      <div className="label">{w("screen.here")}</div>
      <ul className="here">
        {s && s.present.length ? (
          s.present.map((p) => (
            <li key={p}>
              <Portrait name={p} />
              <Name name={p} />
            </li>
          ))
        ) : (
          <li className="muted">{w("screen.nobody")}</li>
        )}
      </ul>
      <div className="buttons">
        <button disabled={!v.sheet} onClick={() => setOpen("briefing")}>
          {w("screen.briefing")}
        </button>
        <button disabled={!v.sheet} onClick={() => setOpen("rules")}>
          {w("screen.rules")}
        </button>
      </div>
      {open && v.sheet && <Modal title={w(`screen.${open}`)} text={v.sheet[open] ?? ""} onClose={() => setOpen(null)} />}
    </aside>
  );
}

const conversationLabel = (s: State | null) =>
  !s ? "" : s.conversation.kind === "capannello" ? (s.present.length ? w("screen.capannello", { others: names(s.present) }) : w("screen.alone")) : s.conversation.kind === "colloquio" ? w("screen.colloquio", { other: s.conversation.other }) : w("screen.alone");

const dividerLabel = (s: State | null) =>
  !s ? "" : s.conversation.kind === "capannello" ? (s.present.length ? w("screen.joined", { others: names(s.present) }) : w("screen.apart")) : s.conversation.kind === "colloquio" ? w("screen.withdrew", { other: s.conversation.other }) : w("screen.apart");

function Centre({ me, v, send, dead, status }: { me: string; v: View; send: Send; dead: boolean; status: string }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: "end" }), [v.stream.length, v.pending?.id, v.speaking]);
  const card = v.pending && v.pending.kind !== "speak" ? v.pending : null;
  return (
    <main className="centre">
      <header className="conv-head">
        <div className="phase">{v.state?.phaseLabel}</div>
        <div className="muted">{conversationLabel(v.state)}</div>
      </header>
      {status === "closed" && <div className="notice">{w("screen.reconnecting")}</div>}
      {status === "connecting" && <div className="notice">{w("screen.connecting")}</div>}
      <div className="stream">
        {v.stream.map((it, i) =>
          it.item === "divider" ? (
            <div className="divider" key={`d${i}`}>
              <span>{dividerLabel(it.state)}</span>
            </div>
          ) : (
            <StreamLine key={it.id} l={it} me={me} />
          ),
        )}
        {v.deaths.map((d) => (
          <div className={`banner${d.you ? " you" : ""}`} key={d.name}>
            {d.you ? w("screen.death.you") : w("screen.death.banner", { name: d.name })}
          </div>
        ))}
        {v.speaking && <div className="speaking">{w("screen.speaking", { name: v.speaking })}</div>}
        {card && !dead && <Card req={card} send={send} me={me} />}
        <div ref={end} />
      </div>
      {!dead && <InputBox me={me} v={v} send={send} closed={!!card} />}
    </main>
  );
}

function StreamLine({ l, me }: { l: Line; me: string }) {
  if (l.item === "notaio")
    return (
      <div className="ln notaio">
        <span className="sp">{w("screen.notaio")}</span>
        <span className="tx">{l.text}</span>
      </div>
    );
  if (l.item === "action")
    return (
      <div className={`ln action${l.private ? " private" : ""}`}>
        {l.private && <span className="sp">{w("screen.private")}</span>}
        <span className="tx">{l.text}</span>
      </div>
    );
  const toYou = l.addressee === me;
  return (
    <div className={`ln speech${l.you ? " mine" : ""}${toYou ? " to-you" : ""}`}>
      <span className="sp">{l.you ? w("screen.you") : <Name name={l.speaker!} />}</span>
      {l.addressee && <span className="to">{toYou ? w("screen.toYou") : w("screen.to", { name: l.addressee })}</span>}
      <span className="tx">{l.text}</span>
    </div>
  );
}

function Right({ me, v }: { me: string; v: View }) {
  const s = v.state;
  // In a Colloquio, the other guest; in a group, the last speaker who isn't you.
  const last = [...v.stream].reverse().find((x): x is Line => x.item === "line" && !x.you && s !== null && s.present.includes(x.speaker!));
  const who = s?.conversation.kind === "colloquio" ? s.conversation.other : (last?.speaker ?? null);
  return (
    <aside className="side right">
      <div className="label">{w("screen.talkingTo")}</div>
      {who && who !== me && (
        <div className="who column">
          <Portrait name={who} large />
          <div className="name">{who}</div>
          <div className="muted">{guest(who)?.subtitle}</div>
        </div>
      )}
    </aside>
  );
}

// ---- The input box -------------------------------------------------------------------------------------

function InputBox({ me, v, send, closed }: { me: string; v: View; send: Send; closed: boolean }) {
  const info = getInfo();
  const [text, setText] = useState("");
  const [menu, setMenu] = useState(false);
  const [held, setHeld] = useState<string | null>(null);
  const [actedAt, setActedAt] = useState(0);
  const lastSeq = useRef(0);
  const req = v.pending?.kind === "speak" ? v.pending : null;
  const o = (req?.options ?? {}) as { answering?: boolean; closing?: string | null; conversation?: string; last?: boolean; canEnd?: boolean; with?: string[] };
  const inColloquio = v.state?.conversation.kind === "colloquio";
  // A held message is spoken at the next pause: it's cleared when your line appears, or it's refused.
  useEffect(() => {
    if (held && (v.spoken > 0 || v.refusal)) setHeld(null);
  }, [v.spoken, v.refusal?.seq]);
  useEffect(() => {
    lastSeq.current = v.refusal?.seq ?? 0;
  });
  const examples = list("examples");
  const example = examples.length ? examples[v.spoken % examples.length] : null;
  const present = v.state?.present ?? [];
  const mention = text.match(/@([^@]*)$/);
  const mentionList = mention ? present.filter((p) => p.toLowerCase().startsWith(mention[1]!.toLowerCase())) : [];
  const isCommand = text.trimStart().startsWith("/");
  const prompt = req
    ? o.answering
      ? w("screen.input.answering", { name: lastAddresser(v, me) ?? "" })
      : o.closing
        ? w("screen.input.closing", { name: o.with?.[0] ?? "" })
        : o.conversation === "colloquio"
          ? w("screen.input.yourTurn")
          : w("screen.input.waiting")
    : held
      ? w("screen.input.held")
      : null;
  const act = (m: unknown) => {
    send(m);
    setActedAt(v.refusal?.seq ?? 0);
  };
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    if (isCommand) act({ type: "command", text: t });
    else {
      act({ type: "say", text });
      if (!req) setHeld(text);
    }
    setText("");
    setMenu(false);
  };
  if (closed)
    return (
      <div className="input closed">
        <span className="muted">{w("screen.input.closed")}</span>
      </div>
    );
  const refusal = v.refusal && v.refusal.seq > actedAt ? v.refusal.reason : null;
  return (
    <div className="input">
      {prompt && <div className={`prompt${req ? " waiting" : ""}`}>{prompt}</div>}
      {refusal && <div className="notice">{refusal}</div>}
      {mentionList.length > 0 && (
        <ul className="dropdown">
          {mentionList.map((p) => (
            <li key={p}>
              <button onClick={() => setText(text.replace(/@([^@]*)$/, `@${p} `))}>
                <Portrait name={p} />
                <Name name={p} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {menu && (
        <ul className="dropdown menu">
          {v.commands.map((c) => (
            <li key={c.name}>
              <button
                onClick={() => {
                  setText(`${c.name} `);
                  setMenu(false);
                }}
              >
                <span className="cmd">{c.usage}</span>
                <span className="muted">{c.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <textarea
          value={text}
          placeholder={w("screen.input.placeholder")}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value === "/") setMenu(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="actions">
          <span className={`count${!isCommand && text.length > info.max ? " over" : ""}`}>{isCommand ? "" : w("screen.input.count", { count: text.length, max: info.max })}</span>
          <button className="primary" onClick={submit} disabled={!text.trim()}>
            {w("screen.input.speak")}
          </button>
          <button onClick={() => act({ type: "pass" })}>{w("screen.input.pass")}</button>
          {(inColloquio || o.canEnd) && !o.closing && <button onClick={() => act({ type: "end" })}>{w("screen.input.end")}</button>}
          <button onClick={() => setMenu(!menu)}>{w("screen.input.commands")}</button>
        </div>
      </div>
      {example && <div className="example muted">{w("screen.input.example", { line: example })}</div>}
    </div>
  );
}

/** Who addressed the player last, for the answer prompt. */
function lastAddresser(v: View, me: string): string | null {
  const l = [...v.stream].reverse().find((x): x is Line => x.item === "line" && x.addressee === me);
  return l?.speaker ?? null;
}

// ---- Decision cards --------------------------------------------------------------------------------------

function Card({ req, send, me }: { req: Request; send: Send; me: string }) {
  if (req.kind === "move") return <MoveCard req={req} send={send} />;
  if (req.kind === "seat") return <SeatCard req={req} send={send} />;
  return <MidnightCard req={req} send={send} me={me} />;
}

function GuestPicker({ guests, value, onChange, label }: { guests: string[]; value: string; onChange: (g: string) => void; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{label}</option>
      {guests.map((g) => (
        <option key={g} value={g} title={guest(g)?.subtitle}>
          {g}
        </option>
      ))}
    </select>
  );
}

function MoveCard({ req, send }: { req: Request; send: Send }) {
  const guests = req.options.guests as string[];
  const [choice, setChoice] = useState<"stay" | "join" | "colloquio" | null>(null);
  const [target, setTarget] = useState("");
  const ok = choice === "stay" || (choice && target);
  return (
    <div className="card">
      <h3>{w("screen.move.title")}</h3>
      <div className="tiles">
        {(["stay", "join", "colloquio"] as const).map((c) => (
          <button key={c} className={`tile${choice === c ? " chosen" : ""}`} onClick={() => setChoice(c)}>
            {w(`screen.move.${c}`)}
          </button>
        ))}
      </div>
      {choice && choice !== "stay" && <GuestPicker guests={guests} value={target} onChange={setTarget} label={w("screen.move.pick")} />}
      <button className="primary" disabled={!ok} onClick={() => send({ type: "choice", request: req.id, value: { choice, target: choice === "stay" ? null : target } })}>
        {w("screen.move.confirm")}
      </button>
    </div>
  );
}

function SeatCard({ req, send }: { req: Request; send: Send }) {
  const o = req.options as { form: "invitee" | "lone"; initiator?: string; groups: { members: string[]; room: number }[]; colloquio: string[]; wait: boolean };
  const [calling, setCalling] = useState(false);
  const [target, setTarget] = useState("");
  const choose = (value: { choice: string; target: string | null }) => send({ type: "choice", request: req.id, value });
  return (
    <div className="card">
      <h3>{o.form === "invitee" ? w("screen.seat.inviteeTitle", { initiator: o.initiator ?? "" }) : w("screen.seat.loneTitle")}</h3>
      <div className="tiles column">
        {o.groups.map((g) => (
          <button key={g.members.join("|")} className="tile" onClick={() => choose({ choice: "join", target: g.members[0]! })}>
            {w("screen.seat.joinGroup", { members: names(g.members) })}
          </button>
        ))}
        {o.form === "invitee" && o.colloquio.length > 0 && (
          <button className={`tile${calling ? " chosen" : ""}`} onClick={() => setCalling(true)}>
            {w("screen.seat.colloquio")}
          </button>
        )}
        {o.wait && (
          <button className="tile" onClick={() => choose({ choice: "wait", target: null })}>
            {w("screen.seat.wait")}
          </button>
        )}
      </div>
      {calling && (
        <>
          <GuestPicker guests={o.colloquio} value={target} onChange={setTarget} label={w("screen.seat.pick")} />
          <button className="primary" disabled={!target} onClick={() => choose({ choice: "colloquio", target })}>
            {w("screen.seat.confirm")}
          </button>
        </>
      )}
    </div>
  );
}

function MidnightCard({ req, send, me }: { req: Request; send: Send; me: string }) {
  const o = req.options as { guests: string[]; acts: Record<string, string>; count: number[] };
  const most = Math.max(...o.count);
  const words = Object.keys(o.acts);
  const [acts, setActs] = useState<{ type: string; target: string }[]>(() => Array.from({ length: most }, () => ({ type: words[0]!, target: "" })));
  const chosen = acts.filter((a) => a.target);
  const ok = o.count.includes(chosen.length);
  const set = (i: number, a: Partial<{ type: string; target: string }>) => setActs(acts.map((x, j) => (j === i ? { ...x, ...a } : x)));
  return (
    <div className="card">
      <h3>{w("screen.midnight.title")}</h3>
      <p className="muted">{most > 1 ? w("screen.midnight.introTwo") : w("screen.midnight.intro")}</p>
      {acts.map((a, i) => (
        <div className="act" key={i}>
          <select value={a.type} onChange={(e) => set(i, { type: e.target.value })}>
            {words.map((x) => (
              <option key={x} value={x}>
                {w(`screen.midnight.acts.${x}`)}
              </option>
            ))}
          </select>
          <GuestPicker guests={o.guests.filter((g) => g !== me)} value={a.target} onChange={(t) => set(i, { target: t })} label={w("screen.midnight.pick")} />
        </div>
      ))}
      <button className="primary" disabled={!ok} onClick={() => send({ type: "choice", request: req.id, value: { acts: chosen } })}>
        {w("screen.midnight.submit")}
      </button>
    </div>
  );
}

// ---- End screen -------------------------------------------------------------------------------------------

function End({ v, me }: { v: View; me: string }) {
  const r = v.result!;
  const [replay, setReplay] = useState<string | null>(null);
  useEffect(() => {
    let stop = false;
    const poll = async () => {
      const j = (await (await fetch("/api/replay")).json()) as { url: string | null };
      if (j.url) setReplay(j.url);
      else if (!stop) setTimeout(() => void poll(), 2000);
    };
    void poll();
    return () => {
      stop = true;
    };
  }, []);
  return (
    <div className="end">
      <h1>{w("screen.end.title")}</h1>
      <div className="who">
        <Portrait name={me} large />
        <div className="name">{r.alive ? w("screen.end.survived") : w("screen.end.dead")}</div>
      </div>
      <h2>{w("screen.end.died")}</h2>
      {r.deaths.length ? (
        <ul>
          {r.deaths.map((d) => (
            <li key={d}>
              <Name name={d} />
            </li>
          ))}
        </ul>
      ) : (
        <p>{w("screen.end.noDeaths")}</p>
      )}
      {r.foiled > 0 && <p className="muted">{w("screen.end.foiled", { count: r.foiled })}</p>}
      <h2>{w("screen.end.errands")}</h2>
      <ul className="checks">
        {r.checks.map((c, i) => (
          <li key={i}>{w("screen.end.check", { character: c.character, fact: c.fact, verdict: w(`screen.end.verdicts.${c.verdict}`) })}</li>
        ))}
      </ul>
      {replay ? (
        <a className="button primary" href={replay} target="_blank" rel="noreferrer">
          {w("screen.end.replay")}
        </a>
      ) : (
        <p className="muted">{w("screen.end.replayPending")}</p>
      )}
    </div>
  );
}
