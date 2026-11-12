// The player screen (TD v0.39–v0.43, The screen): start screen, the game (your character, the conversation,
// who you're talking to), decision cards, the death banner, and the end screen, with hover explanations
// throughout. Words come from the setting pack (words.ts); every look comes from theme.css's tokens
// (app.css uses only those).

import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { connect, type Ev } from "./connection.ts";
import { COMMAND, MENTION, canDo, canSpeak, isCommand, matchCommands, matchGuests, openMenu, withMention, type Trigger } from "./input.ts";
import { derive, type Line, type Request, type Segment, type State, type View } from "./model.ts";
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
  return <HintLayer>{!game ? <Start onStart={(me, ws) => setGame({ me, ws })} /> : <Game me={game.me} url={game.ws} />}</HintLayer>;
}

// ---- Hover explanations (TD v0.40) ---------------------------------------------------------------------
//
// Every control and panel explains itself on hover and on keyboard focus, in player.json's words
// (screen.hints). One tooltip for the whole screen, placed by the element it explains, so a scrolling
// panel never clips it. A switch turns them off; the browser remembers that, and they're on by default.

const HINTS_KEY = "player-screen.hints";
const readHints = () => {
  try {
    return globalThis.localStorage?.getItem(HINTS_KEY) !== "off";
  } catch {
    return true;
  }
};

interface Hints {
  on: boolean;
  toggle: () => void;
  show: (text: string, el: HTMLElement) => void;
  hide: () => void;
}
const HintsContext = createContext<Hints>({ on: true, toggle: () => {}, show: () => {}, hide: () => {} });

function HintLayer({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(readHints);
  const [tip, setTip] = useState<{ text: string; rect: DOMRect } | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!tip || !ref.current) return setPos(null);
    const { offsetWidth: tw, offsetHeight: th } = ref.current;
    const gap = 6;
    const below = tip.rect.bottom + gap + th <= window.innerHeight;
    setPos({ left: Math.max(gap, Math.min(tip.rect.left, window.innerWidth - tw - gap)), top: below ? tip.rect.bottom + gap : Math.max(gap, tip.rect.top - th - gap) });
  }, [tip]);
  // Typing puts the explanation away, so it never sits over a menu the key just opened.
  useEffect(() => {
    if (!tip) return;
    const away = () => setTip(null);
    for (const e of ["keydown", "input"]) document.addEventListener(e, away);
    return () => ["keydown", "input"].forEach((e) => document.removeEventListener(e, away));
  }, [tip]);
  const hints: Hints = {
    on,
    toggle: () => {
      const next = !on;
      setOn(next);
      setTip(null);
      try {
        localStorage.setItem(HINTS_KEY, next ? "on" : "off");
      } catch {
        // A private window or blocked storage: the choice lasts until the page closes.
      }
    },
    show: (text, el) => {
      if (on) setTip({ text, rect: el.getBoundingClientRect() });
    },
    hide: () => setTip(null),
  };
  return (
    <HintsContext.Provider value={hints}>
      {children}
      {tip && (
        <div ref={ref} className={`tip${pos ? "" : " measuring"}`} role="tooltip" style={pos ? { top: pos.top, left: pos.left } : undefined}>
          {tip.text}
        </div>
      )}
    </HintsContext.Provider>
  );
}

/** Props that give an element its hover explanation: `{...hint("speak")}`. Panels pass `focusable`. */
function useHint() {
  const h = useContext(HintsContext);
  return (key: string, opts: { values?: Record<string, string | number>; focusable?: boolean } = {}) => {
    const text = w(`screen.hints.${key}`, opts.values);
    return {
      "aria-description": text,
      "data-hint": key,
      ...(opts.focusable && { tabIndex: 0 }),
      onMouseEnter: (e: { currentTarget: HTMLElement }) => h.show(text, e.currentTarget),
      onMouseLeave: () => h.hide(),
      onFocus: (e: { currentTarget: HTMLElement }) => h.show(text, e.currentTarget),
      onBlur: () => h.hide(),
    };
  };
}

/** The explanations' switch, at the top of the left panel. */
function HintSwitch() {
  const h = useContext(HintsContext);
  const hint = useHint();
  return (
    <button className="switch" aria-pressed={h.on} onClick={h.toggle} {...hint("switch")}>
      {w(h.on ? "screen.hintsSwitch.on" : "screen.hintsSwitch.off")}
    </button>
  );
}

// ---- Start screen ---------------------------------------------------------------------------------

export function Start({ onStart }: { onStart: (me: string, ws: string) => void }) {
  const info = getInfo();
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hint = useHint();
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
            <button className="primary" disabled={!!starting} onClick={() => void start(p.name)} {...hint("play")}>
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

/** Text with the briefing's **bold** kept. */
function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part))}</>;
}

/** A deck over the whole screen (TD v0.40: it opens over the screen, never under it). */
function Modal({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const hint = useHint();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button className="secondary" onClick={onClose} {...hint("close")}>
            {w("screen.close")}
          </button>
        </header>
        <div className="sheet">
          <Rich text={text} />
        </div>
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

type Deck = "briefing" | "rules";

/** The game screen for a view of the player's log (also rendered by the tests, with a deck open if given). */
export function GameView({ me, v, send, status, deck: initialDeck = null }: { me: string; v: View; send: Send; status: "open" | "closed" | "connecting"; deck?: Deck | null }) {
  const [deck, setDeck] = useState<Deck | null>(initialDeck);
  if (v.result) return <End v={v} me={me} />;
  const dead = v.deaths.some((d) => d.you);
  return (
    <div className="layout">
      <Left me={me} v={v} onDeck={setDeck} />
      <Centre me={me} v={v} send={send} dead={dead} status={status} />
      <Right me={me} v={v} />
      {/* After the columns, and above them all in theme.css's order, so nothing covers it. */}
      {deck && v.sheet && <Modal title={w(`screen.${deck}`)} text={v.sheet[deck] ?? ""} onClose={() => setDeck(null)} />}
    </div>
  );
}

function Left({ me, v, onDeck }: { me: string; v: View; onDeck: (d: Deck) => void }) {
  const s = v.state;
  const g = guest(me);
  const hint = useHint();
  return (
    <aside className="side left">
      <div className="side-head">
        <div className="label">{w("screen.you")}</div>
        <HintSwitch />
      </div>
      <div className="panel" {...hint("sheet", { focusable: true })}>
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
          </dl>
        )}
      </div>
      {v.sheet?.errand && (
        <div className="errand" {...hint("errand", { focusable: true })}>
          <div className="label">{w("screen.errandCard.title")}</div>
          <div className="errand-text">
            <Rich text={v.sheet.errand} />
          </div>
          {s?.plotStatus && <div className="errand-result">{s.plotStatus}</div>}
        </div>
      )}
      <div className="label" {...hint("here", { focusable: true })}>
        {w("screen.here")}
      </div>
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
        <button className="secondary" disabled={!v.sheet} onClick={() => onDeck("briefing")} {...hint("briefing")}>
          {w("screen.briefing")}
        </button>
        <button className="secondary" disabled={!v.sheet} onClick={() => onDeck("rules")} {...hint("rules")}>
          {w("screen.rules")}
        </button>
      </div>
    </aside>
  );
}

const conversationLabel = (s: State | null) =>
  !s ? "" : s.conversation.kind === "capannello" ? (s.present.length ? w("screen.capannello", { others: names(s.present) }) : w("screen.alone")) : s.conversation.kind === "colloquio" ? w("screen.colloquio", { other: s.conversation.other }) : w("screen.alone");

/** One line for an earlier conversation: where, and when. */
const earlierLabel = (seg: Segment) => w("screen.earlier.item", { where: conversationLabel(seg.state), when: seg.state?.phaseLabel ?? "" });

function Centre({ me, v, send, dead, status }: { me: string; v: View; send: Send; dead: boolean; status: string }) {
  const end = useRef<HTMLDivElement>(null);
  const hint = useHint();
  const [opened, setOpened] = useState<Set<number>>(() => new Set());
  // A block body: scrollIntoView returns a promise in newer browsers, and an effect may return only its clean-up.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [v.stream.length, v.pending?.id, v.speaking]);
  const card = v.pending && v.pending.kind !== "speak" ? v.pending : null;
  const o = (v.pending?.kind === "speak" ? v.pending.options : {}) as { canEnd?: boolean; closing?: string | null };
  // End conversation acts on the conversation, so it sits with the conversation's header (TD v0.40).
  const canEnd = !dead && !card && (v.state?.conversation.kind === "colloquio" || !!o.canEnd) && !o.closing;
  // Only the current conversation is open; earlier ones fold into "Earlier tonight", each opening in place.
  const earlier = v.segments.slice(0, -1);
  const current = v.segments.at(-1);
  const toggle = (i: number) => setOpened((s) => (s.has(i) ? new Set([...s].filter((x) => x !== i)) : new Set([...s, i])));
  return (
    <main className="centre">
      <header className="conv-head">
        <div {...hint("header", { focusable: true })}>
          <div className="phase">{v.state?.phaseLabel}</div>
          <div className="muted">{conversationLabel(v.state)}</div>
        </div>
        {canEnd && (
          <button className="secondary" onClick={() => send({ type: "end" })} {...hint("end")}>
            {w("screen.input.end")}
          </button>
        )}
      </header>
      {status === "closed" && <div className="notice">{w("screen.reconnecting")}</div>}
      {status === "connecting" && <div className="notice">{w("screen.connecting")}</div>}
      <div className="stream">
        {earlier.length > 0 && (
          <section className="earlier">
            <div className="label" {...hint("earlier", { focusable: true })}>
              {w("screen.earlier.title")}
            </div>
            {earlier.map((seg, i) => (
              <div className={`earlier-item${opened.has(i) ? " open" : ""}`} key={i}>
                <button className="earlier-line" aria-expanded={opened.has(i)} onClick={() => toggle(i)}>
                  <span>{earlierLabel(seg)}</span>
                  <span className="muted">{w(opened.has(i) ? "screen.earlier.open" : "screen.earlier.closed")}</span>
                </button>
                {opened.has(i) && (
                  <div className="earlier-lines">
                    {seg.lines.map((l) => (
                      <StreamLine key={l.id} l={l} me={me} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
        {current?.lines.map((l) => <StreamLine key={l.id} l={l} me={me} />)}
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
      <div className="ln notaio" data-line={l.id}>
        <span className="sp">{w("screen.notaio")}</span>
        <span className="tx">{l.text}</span>
      </div>
    );
  if (l.item === "action")
    return (
      <div className={`ln action${l.private ? " private" : ""}`} data-line={l.id}>
        {l.private && <span className="sp">{w("screen.private")}</span>}
        <span className="tx">{l.text}</span>
      </div>
    );
  const toYou = l.addressee === me;
  return (
    <div className={`ln speech${l.you ? " mine" : ""}${toYou ? " to-you" : ""}`} data-line={l.id}>
      <span className="sp">{l.you ? w("screen.you") : <Name name={l.speaker!} />}</span>
      {l.addressee && <span className="to">{toYou ? w("screen.toYou") : w("screen.to", { name: l.addressee })}</span>}
      <span className="tx">{l.text}</span>
    </div>
  );
}

function Right({ me, v }: { me: string; v: View }) {
  const s = v.state;
  const hint = useHint();
  // In a Colloquio, the other guest; in a group, the last speaker who isn't you.
  const last = [...v.stream].reverse().find((x) => x.item === "line" && !x.you && s !== null && s.present.includes(x.speaker!));
  const who = s?.conversation.kind === "colloquio" ? s.conversation.other : (last?.speaker ?? null);
  return (
    <aside className="side right">
      <div className="label" {...hint("talkingTo", { focusable: true })}>
        {w("screen.talkingTo")}
      </div>
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
//
// Buttons by job (TD v0.40): Speak is the one filled button, active only with something to say; Do takes
// its place for a command; Pass is outlined; @ and / are small icons inside the box. The menus open and
// close with their character (input.ts).

function InputBox({ me, v, send, closed }: { me: string; v: View; send: Send; closed: boolean }) {
  const info = getInfo();
  const hint = useHint();
  const [text, setText] = useState("");
  const [dismissed, setDismissed] = useState<Trigger | null>(null);
  /** The command menu opened from its button while the box holds words: choosing a command replaces them. */
  const [forced, setForced] = useState(false);
  const [held, setHeld] = useState<string | null>(null);
  const [actedAt, setActedAt] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const req = v.pending?.kind === "speak" ? v.pending : null;
  const o = (req?.options ?? {}) as { answering?: boolean; closing?: string | null; conversation?: string; with?: string[] };
  // A held message is spoken at the next pause: it's cleared when your line appears, or it's refused.
  useEffect(() => {
    if (held && (v.spoken > 0 || v.refusal)) setHeld(null);
  }, [v.spoken, v.refusal?.seq]);
  const t = forced ? { kind: "commands" as const, query: "", at: -1 } : openMenu(text, dismissed);
  const present = v.state?.present ?? [];
  const guestList = t?.kind === "guests" ? matchGuests(present, t.query) : [];
  const commandList = t?.kind === "commands" ? matchCommands(v.commands, t.query) : [];
  const menuOpen = guestList.length > 0 || commandList.length > 0;
  // Clicking away closes either menu, until its character is typed again.
  useEffect(() => {
    if (!menuOpen) return;
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) dismiss();
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  });
  const dismiss = () => {
    setForced(false);
    setDismissed(openMenu(text, null));
  };
  const change = (next: string) => {
    setText(next);
    setForced(false);
    // Deleting a menu's character forgets that it was dismissed, so typing it again opens it.
    if (dismissed && !openMenu(next, null)) setDismissed(null);
  };
  const command = isCommand(text);
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
    if (command) act({ type: "command", text: text.trim() });
    else if (canSpeak(text)) {
      act({ type: "say", text });
      if (!req) setHeld(text);
    } else return;
    change("");
  };
  const focus = () => area.current?.focus();
  if (closed)
    return (
      <div className="input closed">
        <span className="muted">{w("screen.input.closed")}</span>
      </div>
    );
  const refusal = v.refusal && v.refusal.seq > actedAt ? v.refusal.reason : null;
  const examples = list("examples");
  const example = examples.length ? examples[v.spoken % examples.length] : null;
  return (
    <div className="input" ref={box}>
      {prompt && <div className={`prompt${req ? " waiting" : ""}`}>{prompt}</div>}
      {refusal && <div className="notice">{refusal}</div>}
      {guestList.length > 0 && (
        <ul className="dropdown" data-menu="guests">
          {guestList.map((p) => (
            <li key={p}>
              <button
                onClick={() => {
                  change(text.replace(/@([^@\n]*)$/, `${MENTION}${p} `));
                  focus();
                }}
              >
                <Portrait name={p} />
                <Name name={p} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {commandList.length > 0 && (
        <ul className="dropdown menu" data-menu="commands">
          {commandList.map((c) => (
            <li key={c.name}>
              <button
                onClick={() => {
                  change(`${c.name} `);
                  focus();
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
        <div className="field">
          <textarea
            ref={area}
            value={text}
            placeholder={w("screen.input.placeholder")}
            onChange={(e) => change(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && menuOpen) {
                e.preventDefault();
                dismiss();
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            {...hint("input", { values: { max: info.max } })}
          />
          <div className="field-icons">
            <button
              className="icon"
              onClick={() => {
                change(withMention(text));
                focus();
              }}
              {...hint("mention")}
            >
              {MENTION}
            </button>
            <button
              className="icon"
              onClick={() => {
                if (text.trim()) setForced(!forced);
                else change(COMMAND);
                focus();
              }}
              {...hint("commands")}
            >
              {COMMAND}
            </button>
          </div>
        </div>
        <div className="actions">
          <span className={`count${!command && text.length > info.max ? " over" : ""}`}>{command ? "" : w("screen.input.count", { count: text.length, max: info.max })}</span>
          {command ? (
            <button className="do" onClick={submit} disabled={!canDo(text)} {...hint("do")}>
              {w("screen.input.do")}
            </button>
          ) : (
            <button className="primary" onClick={submit} disabled={!canSpeak(text)} {...hint("speak")}>
              {w("screen.input.speak")}
            </button>
          )}
          <button className="secondary" onClick={() => act({ type: "pass" })} {...hint("pass")}>
            {w("screen.input.pass")}
          </button>
        </div>
      </div>
      {example && <div className="example muted">{w("screen.input.example", { line: example })}</div>}
    </div>
  );
}

/** Who addressed the player last, for the answer prompt. */
function lastAddresser(v: View, me: string): string | null {
  const l = [...v.stream].reverse().find((x) => x.item === "line" && x.addressee === me);
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
  const hint = useHint();
  const [choice, setChoice] = useState<"stay" | "join" | "colloquio" | null>(null);
  const [target, setTarget] = useState("");
  const ok = choice === "stay" || (choice && target);
  return (
    <div className="card">
      <h3 {...hint("move", { focusable: true })}>{w("screen.move.title")}</h3>
      <div className="tiles">
        {(["stay", "join", "colloquio"] as const).map((c) => (
          <button key={c} className={`tile${choice === c ? " chosen" : ""}`} onClick={() => setChoice(c)} {...hint(c)}>
            {w(`screen.move.${c}`)}
          </button>
        ))}
      </div>
      {choice && choice !== "stay" && <GuestPicker guests={guests} value={target} onChange={setTarget} label={w("screen.move.pick")} />}
      <button className="primary" disabled={!ok} onClick={() => send({ type: "choice", request: req.id, value: { choice, target: choice === "stay" ? null : target } })} {...hint("confirm")}>
        {w("screen.move.confirm")}
      </button>
    </div>
  );
}

function SeatCard({ req, send }: { req: Request; send: Send }) {
  const o = req.options as { form: "invitee" | "lone"; initiator?: string; groups: { members: string[]; room: number }[]; colloquio: string[]; wait: boolean };
  const hint = useHint();
  const [calling, setCalling] = useState(false);
  const [target, setTarget] = useState("");
  const choose = (value: { choice: string; target: string | null }) => send({ type: "choice", request: req.id, value });
  return (
    <div className="card">
      <h3 {...hint("seat", { focusable: true })}>{o.form === "invitee" ? w("screen.seat.inviteeTitle", { initiator: o.initiator ?? "" }) : w("screen.seat.loneTitle")}</h3>
      <div className="tiles column">
        {o.groups.map((g) => (
          <button key={g.members.join("|")} className="tile" onClick={() => choose({ choice: "join", target: g.members[0]! })} {...hint("join")}>
            {w("screen.seat.joinGroup", { members: names(g.members) })}
          </button>
        ))}
        {o.form === "invitee" && o.colloquio.length > 0 && (
          <button className={`tile${calling ? " chosen" : ""}`} onClick={() => setCalling(true)} {...hint("colloquio")}>
            {w("screen.seat.colloquio")}
          </button>
        )}
        {o.wait && (
          <button className="tile" onClick={() => choose({ choice: "wait", target: null })} {...hint("wait")}>
            {w("screen.seat.wait")}
          </button>
        )}
      </div>
      {calling && (
        <>
          <GuestPicker guests={o.colloquio} value={target} onChange={setTarget} label={w("screen.seat.pick")} />
          <button className="primary" disabled={!target} onClick={() => choose({ choice: "colloquio", target })} {...hint("confirm")}>
            {w("screen.seat.confirm")}
          </button>
        </>
      )}
    </div>
  );
}

function MidnightCard({ req, send, me }: { req: Request; send: Send; me: string }) {
  const o = req.options as { guests: string[]; acts: Record<string, string>; count: number[] };
  const hint = useHint();
  const most = Math.max(...o.count);
  const words = Object.keys(o.acts);
  const [acts, setActs] = useState<{ type: string; target: string }[]>(() => Array.from({ length: most }, () => ({ type: words[0]!, target: "" })));
  const chosen = acts.filter((a) => a.target);
  const ok = o.count.includes(chosen.length);
  const set = (i: number, a: Partial<{ type: string; target: string }>) => setActs(acts.map((x, j) => (j === i ? { ...x, ...a } : x)));
  return (
    <div className="card">
      <h3 {...hint("midnight", { focusable: true })}>{w("screen.midnight.title")}</h3>
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
      <button className="primary" disabled={!ok} onClick={() => send({ type: "choice", request: req.id, value: { acts: chosen } })} {...hint("confirm")}>
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
