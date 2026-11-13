// The player screen (TD v0.39–v0.43, The screen): start screen, the game (your character, the conversation,
// who you're looking at), card decks, the web viewer with notes, Il Notaio's hint, decision cards, the
// death banner, and the end screen, with hover explanations throughout. First-hand only: everything comes
// from the player's sheet, their own log, and public content. Words come from the setting pack (words.ts); every look comes from theme.css's tokens
// (app.css uses only those).

import { Component, createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { connect, type Ev } from "./connection.ts";
import { COMMAND, MENTION, canDo, canSpeak, isCommand, matchCommands, matchGuests, openMenu, withMention, type Trigger } from "./input.ts";
import { appearsIn, briefingCards, cityCards, derive, heardAndSaw, hintMoment, loreParts, rulesCards, webLayout, type Card, type Line, type LoreEntry, type Note, type Request, type Segment, type Sheet, type State, type View } from "./model.ts";
import { getInfo, guest, list, names, notaioHint, setInfo, w, type StartInfo } from "./words.ts";

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
  show: (text: string, el: Element) => void;
  hide: () => void;
}
const HintsContext = createContext<Hints>({ on: true, toggle: () => {}, show: () => {}, hide: () => {} });

function HintLayer({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(readHints);
  const [tip, setTip] = useState<{ text: string; el: Element; rect: DOMRect } | null>(null);
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
  // The explanation goes with its element: when the element is taken off the screen (the start button once
  // the game starts), hidden, or scrolled out of the window, the explanation closes; when it moves, it follows.
  useEffect(() => {
    if (!tip) return;
    const check = () => {
      const r = tip.el.isConnected && tip.el.getClientRects().length ? tip.el.getBoundingClientRect() : null;
      if (!r || r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= window.innerWidth) setTip(null);
      else if (r.top !== tip.rect.top || r.left !== tip.rect.left) setTip({ ...tip, rect: r });
    };
    const watch = new MutationObserver(check);
    watch.observe(document.body, { childList: true, subtree: true, attributes: true });
    document.addEventListener("scroll", check, true);
    window.addEventListener("resize", check);
    return () => {
      watch.disconnect();
      document.removeEventListener("scroll", check, true);
      window.removeEventListener("resize", check);
    };
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
      if (on) setTip({ text, el, rect: el.getBoundingClientRect() });
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
      onMouseEnter: (e: { currentTarget: Element }) => h.show(text, e.currentTarget),
      onMouseLeave: () => h.hide(),
      onFocus: (e: { currentTarget: Element }) => h.show(text, e.currentTarget),
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

// ---- Error boundaries (CC-20261113-01, #88) ------------------------------------------------------------
//
// Each major panel fails on its own: a panel that throws shows a short notice in its own space, and the
// rest of the screen keeps working. `?fault=<panel>` in the address makes that panel throw, for the
// screen tests.

const FAULT = typeof location === "undefined" ? null : new URLSearchParams(location.search).get("fault");

function Fault({ panel }: { panel: string }) {
  if (FAULT === panel) throw new Error(`a test fault in the ${panel} panel`);
  return null;
}

class Boundary extends Component<{ panel: string; fallback?: (notice: ReactNode) => ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(e: unknown) {
    console.error(`The ${this.props.panel} panel failed:`, e);
  }
  override render() {
    if (!this.state.failed)
      return (
        <>
          <Fault panel={this.props.panel} />
          {this.props.children}
        </>
      );
    const notice = (
      <div className="notice danger panel-error" role="alert" data-panel-error={this.props.panel}>
        {w("screen.panelError")}
      </div>
    );
    return this.props.fallback ? this.props.fallback(notice) : notice;
  }
}

/** A failed deck or web viewer: the notice in a window that still closes. */
function FailedOverlay({ notice, onClose }: { notice: ReactNode; onClose: () => void }) {
  const hint = useHint();
  useEscape(onClose);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <header>
          <span />
          <button className="secondary" onClick={onClose} {...hint("close")}>
            {w("screen.close")}
          </button>
        </header>
        <div className="sheet">{notice}</div>
      </div>
    </div>
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

// Selection in the chat view (TD v0.41): one thing at a time, a guest or a lore topic. Selecting replaces
// the last selection, selecting it again clears it, and Escape clears it. Two guests only in the web viewer.
type ChatSel = { kind: "guest"; name: string } | { kind: "lore"; entry: LoreEntry; back: ChatSel } | null;
interface Selection {
  sel: ChatSel;
  guest: (name: string) => void;
  lore: (entry: LoreEntry) => void;
  back: () => void;
}
const SelContext = createContext<Selection>({ sel: null, guest: () => {}, lore: () => {}, back: () => {} });

/** A guest's name: selects them (in the chat view); `plain` inside another control. */
function Name({ name, plain }: { name: string; plain?: boolean }) {
  const s = useContext(SelContext);
  const hint = useHint();
  if (plain)
    return (
      <span className="guest plain" title={guest(name)?.subtitle}>
        {name}
      </span>
    );
  const on = s.sel?.kind === "guest" && s.sel.name === name;
  return (
    <button className={`guest${on ? " selected" : ""}`} aria-pressed={on} onClick={() => s.guest(name)} {...hint("select")}>
      {name}
    </button>
  );
}

/** Text with the briefing's **bold** kept. */
function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/).map((part, i) => (part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part))}</>;
}

/** Closes on Escape, ahead of the chat's own Escape (which clears the selection). */
function useEscape(onEscape: () => void) {
  const latest = useRef(onEscape);
  latest.current = onEscape;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      latest.current();
    };
    document.addEventListener("keydown", esc, true);
    return () => document.removeEventListener("keydown", esc, true);
  }, []);
}

// ---- Card decks (TD v0.40): one topic per card, over the whole screen ------------------------------------

type DeckName = "briefing" | "rules" | "city";

function deckCards(deck: DeckName, sheet: Sheet): Card[] {
  if (deck === "rules") return rulesCards(sheet.rules);
  if (deck === "city") return cityCards(sheet.lore ?? []);
  const past = sheet.past ?? [];
  return [...briefingCards(sheet.briefing), ...(past.length ? [{ title: w("screen.decks.past"), text: past.map((p) => `**${p.title}**\n${p.text}`).join("\n\n") }] : [])];
}

/**
 * A deck: tabs along the top show where you are and jump; clicking anywhere on the card swipes to the
 * next; a separate back control and the arrow keys go back and forth. No auto-advance. The place is the
 * caller's, so each deck remembers it.
 */
function DeckModal({ deck, cards, place, onPlace, onClose }: { deck: DeckName; cards: Card[]; place: number; onPlace: (n: number) => void; onClose: () => void }) {
  const hint = useHint();
  const at = Math.min(place, Math.max(0, cards.length - 1));
  const card = cards[at];
  const go = (n: number) => onPlace(Math.max(0, Math.min(cards.length - 1, n)));
  useEscape(onClose);
  // Registered once, reading the latest place through a ref, so no key falls between two renders' listeners.
  const keys = useRef((_: KeyboardEvent) => {});
  keys.current = (e) => {
    if (e.key === "ArrowRight") go(at + 1);
    else if (e.key === "ArrowLeft") go(at - 1);
  };
  useEffect(() => {
    const on = (e: KeyboardEvent) => keys.current(e);
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, []);
  const title = w(`screen.${deck}`);
  return (
    <div className="overlay" onClick={onClose}>
      <div className={`modal deck deck-${deck}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button className="secondary" onClick={onClose} {...hint("close")}>
            {w("screen.close")}
          </button>
        </header>
        {cards.length > 0 && (
          <nav className="tabs">
            {cards.map((c, i) => (
              <span key={i} className="tab-wrap">
                {c.group !== undefined && c.group !== cards[i - 1]?.group && <span className="tab-group">{c.group ?? w("screen.decks.other")}</span>}
                <button className={`tab${i === at ? " on" : ""}`} aria-current={i === at} onClick={() => go(i)} {...hint("deckTab")}>
                  {c.title}
                </button>
              </span>
            ))}
          </nav>
        )}
        {card ? (
          <div className="deck-card" key={`${deck}-${at}`} onClick={() => go(at + 1)} {...hint("deckCard", { focusable: true })}>
            <h3>{card.title}</h3>
            <div className="deck-text">
              <Rich text={card.text} />
            </div>
          </div>
        ) : (
          <div className="deck-card empty">{w("screen.decks.empty")}</div>
        )}
        <footer className="deck-foot">
          <button className="secondary" disabled={at === 0} onClick={() => go(at - 1)} {...hint("deckBack")}>
            {w("screen.decks.back")}
          </button>
          {cards.length > 0 && <span className="muted">{w("screen.decks.counter", { n: at + 1, total: cards.length })}</span>}
        </footer>
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

/**
 * The game screen for a view of the player's log. The tests render it with a deck, a selection, or the
 * web viewer open from the start.
 */
export function GameView({
  me,
  v,
  send,
  status,
  deck: initialDeck = null,
  selected = null,
  web: initialWeb = null,
  webTab,
}: {
  me: string;
  v: View;
  send: Send;
  status: "open" | "closed" | "connecting";
  deck?: DeckName | null;
  selected?: ChatSel;
  web?: string[] | null;
  webTab?: WebTab;
}) {
  const [deck, setDeck] = useState<DeckName | null>(initialDeck);
  const [places, setPlaces] = useState<Record<DeckName, number>>({ briefing: 0, rules: 0, city: 0 });
  const [sel, setSel] = useState<ChatSel>(selected);
  const [web, setWeb] = useState<string[] | null>(initialWeb);
  const selection: Selection = {
    sel,
    guest: (name) => setSel(sel?.kind === "guest" && sel.name === name ? null : { kind: "guest", name }),
    lore: (entry) => setSel(sel?.kind === "lore" && sel.entry.id === entry.id ? sel.back : { kind: "lore", entry, back: sel?.kind === "lore" ? sel.back : sel }),
    back: () => setSel(sel?.kind === "lore" ? sel.back : null),
  };
  // Escape clears the selection, after any open menu, deck, or the web viewer has taken it.
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) setSel(null);
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);
  if (v.result) return <End v={v} me={me} />;
  const dead = v.deaths.some((d) => d.you);
  const openWeb = (guests: string[]) => setWeb(guests);
  return (
    <SelContext.Provider value={selection}>
      <div className="layout">
        <Boundary panel="left" fallback={(n) => <aside className="side left">{n}</aside>}>
          <Left me={me} v={v} onDeck={setDeck} onWeb={() => openWeb(sel?.kind === "guest" ? [sel.name] : [])} />
        </Boundary>
        <Centre me={me} v={v} send={send} dead={dead} status={status} />
        <Boundary panel="right" fallback={(n) => <aside className="side right">{n}</aside>}>
          <Right me={me} v={v} onWeb={openWeb} />
        </Boundary>
        {/* After the columns, and above them all in theme.css's order, so nothing covers them. */}
        {deck && v.sheet && (
          <Boundary panel="deck" fallback={(n) => <FailedOverlay notice={n} onClose={() => setDeck(null)} />}>
            <DeckModal deck={deck} cards={deckCards(deck, v.sheet)} place={places[deck]} onPlace={(n) => setPlaces({ ...places, [deck]: n })} onClose={() => setDeck(null)} />
          </Boundary>
        )}
        {web && (
          <Boundary panel="web" fallback={(n) => <FailedOverlay notice={n} onClose={() => setWeb(null)} />}>
            <WebViewer me={me} v={v} initial={web} initialTab={webTab} send={send} dead={dead} onClose={() => setWeb(null)} />
          </Boundary>
        )}
      </div>
    </SelContext.Provider>
  );
}

/**
 * A side column that may not fit the window: while there's more below, a hint stays at the column's foot,
 * and clicking it scrolls on (CC-20261113-01, #88: every control reachable at laptop heights).
 */
function useMoreBelow() {
  const ref = useRef<HTMLElement>(null);
  const [more, setMore] = useState(false);
  const check = () => {
    const el = ref.current;
    if (el) setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };
  // After every render (new content), on scrolling, and on resizing the window.
  useLayoutEffect(check);
  useEffect(() => {
    const el = ref.current;
    el?.addEventListener("scroll", check);
    window.addEventListener("resize", check);
    return () => {
      el?.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  return { ref, more, on: () => ref.current?.scrollBy({ top: ref.current.clientHeight * 0.8, behavior: "smooth" }) };
}

function MoreBelow({ m }: { m: ReturnType<typeof useMoreBelow> }) {
  const hint = useHint();
  if (!m.more) return null;
  return (
    <button className="more-below" onClick={m.on} {...hint("more")}>
      {w("screen.more")}
    </button>
  );
}

function Left({ me, v, onDeck, onWeb }: { me: string; v: View; onDeck: (d: DeckName) => void; onWeb: () => void }) {
  const s = v.state;
  const g = guest(me);
  const hint = useHint();
  const m = useMoreBelow();
  return (
    <aside className="side left" ref={m.ref}>
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
        {/* Laid out before the first state arrives, so nothing below moves when it does. */}
        <dl className="facts">
          <dt>{w("screen.purse")}</dt>
          <dd>{s ? w("screen.purseValue", { amount: s.florins }) : ""}</dd>
          <dt>{w("screen.pensions")}</dt>
          <dd>{s?.pensionsHeld ?? ""}</dd>
          <dt>{w("screen.withdrawals")}</dt>
          <dd>{s?.withdrawalCount ?? ""}</dd>
        </dl>
      </div>
      {/* The decks right under the sheet, two by two, so they're in sight on a short window. */}
      <div className="buttons decks">
        {(["briefing", "rules", "city"] as const).map((d) => (
          <button key={d} className="secondary" disabled={!v.sheet} onClick={() => onDeck(d)} {...hint(d)}>
            {w(`screen.${d}`)}
          </button>
        ))}
        <button className="secondary" onClick={onWeb} {...hint("web")}>
          {w("screen.web.title")}
        </button>
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
      <MoreBelow m={m} />
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
  const { sel } = useContext(SelContext);
  /** Earlier conversations the player opened or closed by hand; the rest follow the selected guest. */
  const [manual, setManual] = useState<Map<number, boolean>>(() => new Map());
  // A block body: scrollIntoView returns a promise in newer browsers, and an effect may return only its clean-up.
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [v.stream.length, v.pending?.id, v.speaking]);
  const card = v.pending && v.pending.kind !== "speak" ? v.pending : null;
  const o = (v.pending?.kind === "speak" ? v.pending.options : {}) as { canEnd?: boolean; closing?: string | null };
  // End conversation acts on the conversation, so it sits with the conversation's header (TD v0.40).
  const canEnd = !dead && !card && (v.state?.conversation.kind === "colloquio" || !!o.canEnd) && !o.closing;
  // Only the current conversation is open; earlier ones fold into "Earlier tonight", each opening in place.
  // Selecting a guest opens the ones they appeared in, and deselecting folds them again (TD v0.41).
  const earlier = v.segments.slice(0, -1);
  const current = v.segments.at(-1);
  const isOpen = (i: number) => manual.get(i) ?? (sel?.kind === "guest" && appearsIn(earlier[i]!, sel.name));
  const toggle = (i: number) => setManual(new Map(manual).set(i, !isOpen(i)));
  return (
    <main className="centre">
      <header className="conv-head">
        <div {...hint("header", { focusable: true })}>
          <div className="phase">{v.state?.phaseLabel}</div>
          <div className="muted">{conversationLabel(v.state)}</div>
        </div>
        {/* The connection's state in the header, so the stream doesn't move when it changes. */}
        {status !== "open" && <div className="notice status">{w(status === "closed" ? "screen.reconnecting" : "screen.connecting")}</div>}
        {canEnd && (
          <button className="secondary" onClick={() => send({ type: "end" })} {...hint("end")}>
            {w("screen.input.end")}
          </button>
        )}
      </header>
      <div className="stream">
        <Boundary panel="stream">
        {earlier.length > 0 && (
          <section className="earlier">
            <div className="label" {...hint("earlier", { focusable: true })}>
              {w("screen.earlier.title")}
            </div>
            {earlier.map((seg, i) => (
              <div className={`earlier-item${isOpen(i) ? " open" : ""}`} key={i}>
                <button className="earlier-line" aria-expanded={isOpen(i)} onClick={() => toggle(i)} {...hint("earlierLine")}>
                  <span>{earlierLabel(seg)}</span>
                  <span className="muted">{w(isOpen(i) ? "screen.earlier.open" : "screen.earlier.closed")}</span>
                </button>
                {isOpen(i) && (
                  <div className="earlier-lines">
                    {seg.lines.map((l) => (
                      <StreamLine key={l.id} l={l} me={me} lore={v.sheet?.lore ?? []} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}
        {current?.lines.map((l) => <StreamLine key={l.id} l={l} me={me} lore={v.sheet?.lore ?? []} />)}
        {v.deaths.map((d) => (
          <div className={`banner${d.you ? " you" : ""}`} key={d.name}>
            {d.you ? w("screen.death.you") : w("screen.death.banner", { name: d.name })}
          </div>
        ))}
        {v.speaking && <div className="speaking">{w("screen.speaking", { name: v.speaking })}</div>}
        {card && !dead && <Card req={card} send={send} me={me} />}
        </Boundary>
        <div ref={end} />
      </div>
      <Boundary panel="hint">
        <NotaioHint me={me} v={v} />
      </Boundary>
      {!dead && (
        <Boundary panel="input" fallback={(n) => <div className="input">{n}</div>}>
          <InputBox me={me} v={v} send={send} closed={!!card} />
        </Boundary>
      )}
    </main>
  );
}

/** A line's text, with public lore entries' names as links that open the entry on the right. */
function Linked({ text, lore }: { text: string; lore: LoreEntry[] }) {
  const s = useContext(SelContext);
  const hint = useHint();
  return (
    <>
      {loreParts(text, lore).map((p, i) =>
        typeof p === "string" ? (
          p
        ) : (
          <button key={i} className={`lore-link${s.sel?.kind === "lore" && s.sel.entry.id === p.entry.id ? " selected" : ""}`} onClick={() => s.lore(p.entry)} {...hint("loreLink")}>
            {p.text}
          </button>
        ),
      )}
    </>
  );
}

function StreamLine({ l, me, lore }: { l: Line; me: string; lore: LoreEntry[] }) {
  const { sel } = useContext(SelContext);
  if (l.item === "notaio")
    return (
      <div className="ln notaio" data-line={l.id}>
        <span className="sp">{w("screen.notaio")}</span>
        <span className="tx">
          <Linked text={l.text} lore={lore} />
        </span>
      </div>
    );
  if (l.item === "action")
    return (
      <div className={`ln action${l.private ? " private" : ""}`} data-line={l.id}>
        {l.private && <span className="sp">{w("screen.private")}</span>}
        <span className="tx">
          <Linked text={l.text} lore={lore} />
        </span>
      </div>
    );
  const toYou = l.addressee === me;
  const speaker = l.you ? me : l.speaker!;
  const hl = sel?.kind === "guest" && sel.name === speaker;
  return (
    <div className={`ln speech${l.you ? " mine" : ""}${toYou ? " to-you" : ""}${hl ? " hl" : ""}`} data-line={l.id}>
      <span className="sp">{l.you ? w("screen.you") : <Name name={l.speaker!} />}</span>
      {l.addressee && <span className="to">{toYou ? w("screen.toYou") : w("screen.to", { name: l.addressee })}</span>}
      <span className="tx">
        <Linked text={l.text} lore={lore} />
      </span>
    </div>
  );
}

/** Il Notaio's hint (TD v0.40): a line or two for the moment, docked under the stream, and collapsible. */
function NotaioHint({ me, v }: { me: string; v: View }) {
  const hint = useHint();
  const [open, setOpen] = useState(true);
  const m = hintMoment(v, me);
  return (
    <aside className={`notaio-hint${open ? "" : " collapsed"}`}>
      <button className="hint-head" aria-expanded={open} onClick={() => setOpen(!open)} {...hint("notaioHint")}>
        <span>{w("screen.notaioHint.title")}</span>
        <span className="muted">{w(open ? "screen.notaioHint.hide" : "screen.notaioHint.show")}</span>
      </button>
      {open && (
        <p className="hint-text" data-moment={m.key}>
          {notaioHint(m.key, m.values)}
        </p>
      )}
    </aside>
  );
}

/** Right: whoever you're looking at. A selected guest, a lore entry, or by default whoever you're talking to. */
function Right({ me, v, onWeb }: { me: string; v: View; onWeb: (guests: string[]) => void }) {
  const s = v.state;
  const hint = useHint();
  const { sel, back } = useContext(SelContext);
  const m = useMoreBelow();
  if (sel?.kind === "lore")
    return (
      <aside className="side right">
        <div className="side-head">
          <div className="label">{w("screen.right.lore")}</div>
          <button className="secondary" onClick={back} {...hint("back")}>
            {w("screen.right.back")}
          </button>
        </div>
        <div className="lore-entry" data-lore={sel.entry.id}>
          <h3>{sel.entry.title}</h3>
          <p>{sel.entry.text}</p>
        </div>
      </aside>
    );
  // In a Colloquio, the other guest; in a group, the last speaker who isn't you.
  const last = [...v.stream].reverse().find((x) => x.item === "line" && !x.you && s !== null && s.present.includes(x.speaker!));
  const who = sel?.kind === "guest" ? sel.name : s?.conversation.kind === "colloquio" ? s.conversation.other : (last?.speaker ?? null);
  const g = who ? guest(who) : undefined;
  const known = who ? (v.sheet?.connections ?? []).filter((c) => !c.private && c.between.includes(who)) : [];
  return (
    <aside className="side right" ref={m.ref}>
      <div className="label" {...hint(sel ? "selected" : "talkingTo", { focusable: true })}>
        {w(sel ? "screen.right.selected" : "screen.talkingTo")}
      </div>
      {who && who !== me && (
        <div className="who column" data-guest={who}>
          <Portrait name={who} large />
          <div className="name">{who}</div>
          <div className="muted">{g?.faction}</div>
          <div className="muted">{g?.subtitle}</div>
        </div>
      )}
      {known.length > 0 && (
        <>
          <div className="label">{w("screen.right.known")}</div>
          <ul className="known">
            {known.map((c, i) => (
              <li key={i}>
                <span className="muted">{w("screen.right.with", { name: c.between.find((x) => x !== who) ?? who! })}</span> {c.line}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="buttons">
        <button className="secondary" onClick={() => onWeb(sel?.kind === "guest" ? [sel.name] : [])} {...hint("openWeb")}>
          {w("screen.right.openWeb")}
        </button>
      </div>
      <MoreBelow m={m} />
    </aside>
  );
}

// ---- The web viewer (TD v0.40–v0.41): the web of relationships, what you heard and saw, and notes ----------

type WebTab = "record" | "notes" | "all";

function WebViewer({ me, v, initial, initialTab = "record", send, dead, onClose }: { me: string; v: View; initial: string[]; initialTab?: WebTab; send: Send; dead: boolean; onClose: () => void }) {
  const info = getInfo();
  const hint = useHint();
  const [picked, setPicked] = useState<string[]>(initial);
  const [tab, setTab] = useState<WebTab>(initialTab);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  useEscape(onClose);
  // Up to two: a first, then a second; a third replaces the older; selecting a selected guest clears it.
  const pick = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < 2 ? [...p, n] : [p[1]!, n]));
  const at = webLayout(info.roster, info.factions ?? []);
  const connections = v.sheet?.connections ?? [];
  const lit = (c: { between?: string[]; guests?: string[] }) => picked.length > 0 && picked.every((p) => (c.between ?? c.guests ?? []).includes(p));
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const conclude = v.commands.find((c) => c.action === "conclude");
  const who = picked.length === 2 ? w("screen.web.between", { a: picked[0]!, b: picked[1]! }) : (picked[0] ?? "");
  const record = heardAndSaw(v, picked, me);
  const noteKey = (n: Note) => [...n.guests].sort().join(" · ");
  const shown = [...v.notes].reverse().filter((n) => !filter || n.guests.includes(filter));
  const groups = [...new Set(shown.map(noteKey))];
  const NoteItem = ({ n }: { n: Note }) => (
    <li className="note" key={n.id}>
      <button className="note-text" onClick={() => (setPicked(n.guests), setTab("record"))} {...hint("noteItem")}>
        {n.text}
      </button>
      <button className="secondary small" disabled={!conclude || dead} onClick={() => send({ type: "command", text: `${conclude!.name} ${n.text}` })} {...hint("conclude")}>
        {w("screen.web.conclude")}
      </button>
    </li>
  );
  return (
    <div className="web-backdrop" onClick={onClose}>
      <section className="web" role="dialog" aria-modal="true" aria-label={w("screen.web.title")} onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{w("screen.web.title")}</h2>
          <button className="secondary" onClick={onClose} {...hint("close")}>
            {w("screen.close")}
          </button>
        </header>
        <div className="web-body">
          <svg className="web-diagram" viewBox="0 0 100 100" role="group" aria-label={w("screen.web.title")}>
            {connections.map((c, i) => {
              const [a, b] = c.between.map((n) => at.get(n));
              return a && b ? <line key={`c${i}`} className={`edge${c.private ? " yours" : ""}${lit(c) ? " on" : ""}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> : null;
            })}
            {v.notes
              .filter((n) => n.guests.length === 2)
              .map((n) => {
                const [a, b] = n.guests.map((g) => at.get(g));
                return a && b ? <line key={n.id} className={`edge note-line${lit(n) ? " on" : ""}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> : null;
              })}
            {info.roster.map((r) => {
              const p = at.get(r.name)!;
              return (
                <g key={r.name} className={`node${picked.includes(r.name) ? " picked" : ""}${r.name === me ? " me" : ""}`} transform={`translate(${p.x} ${p.y})`} onClick={() => pick(r.name)} role="button" aria-pressed={picked.includes(r.name)} {...hint("webNode", { focusable: true })}>
                  <circle r={4.2} style={{ fill: r.colour }} />
                  <text className="node-initials" dy={1.2}>
                    {r.initials}
                  </text>
                </g>
              );
            })}
            {/* The names last, so no line or circle crosses them, each on a halo of the panel's colour. */}
            <g className="labels">
              {info.roster.map((r) => {
                const p = at.get(r.name)!;
                return (
                  <text key={r.name} className={`node-name${r.name === me ? " me" : ""}`} x={p.x} y={p.y} dy={7.6}>
                    {r.name}
                  </text>
                );
              })}
            </g>
          </svg>
          <div className="web-side">
            <nav className="tabs">
              {(["record", "notes", "all"] as const).map((t) => (
                <button key={t} className={`tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)} {...hint(`${t}Tab`)}>
                  {w(`screen.web.${t}`)}
                </button>
              ))}
            </nav>
            {tab === "record" &&
              (picked.length === 0 ? (
                <p className="muted">{w("screen.web.pick")}</p>
              ) : (
                <div className="record">
                  <h3>{who}</h3>
                  {connections.filter(lit).map((c, i) => (
                    <p key={i} className={`connection${c.private ? " yours" : ""}`}>
                      <span className="muted">{c.type}</span> {c.line} {c.private && <span className="muted">{w("screen.web.yours")}</span>}
                    </p>
                  ))}
                  <div className="label">{w("screen.web.heard")}</div>
                  {record.heard.length ? (
                    <ul className="heard">
                      {record.heard.map((l) => (
                        <li key={l.id} data-line={l.id}>
                          <span className="sp">{l.you ? w("screen.you") : l.speaker}</span>
                          {l.addressee && <span className="muted"> {l.addressee === me ? w("screen.toYou") : w("screen.to", { name: l.addressee })}</span>} {l.text}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="muted">{w("screen.web.nothing")}</p>
                  )}
                  <div className="label">{w("screen.web.saw")}</div>
                  {record.saw.length ? (
                    <ul className="saw">
                      {record.saw.map((s) => (s.kind === "line" ? <li key={s.line.id} data-line={s.line.id}>{s.line.text}</li> : <li key={`d${s.name}`}>{w("screen.web.died", { name: s.name })}</li>))}
                    </ul>
                  ) : (
                    <p className="muted">{w("screen.web.nothing")}</p>
                  )}
                </div>
              ))}
            {tab === "notes" && (
              <div className="notes">
                <div className="label">{picked.length ? w("screen.web.writeOn", { who }) : w("screen.web.writeFree")}</div>
                <textarea value={draft} placeholder={w("screen.web.placeholder")} onChange={(e) => setDraft(e.target.value)} {...hint("noteText")} />
                <button
                  className="primary"
                  disabled={!draft.trim()}
                  onClick={() => {
                    send({ type: "note", text: draft, guests: picked });
                    setDraft("");
                  }}
                  {...hint("noteSave")}
                >
                  {w("screen.web.save")}
                </button>
                <ul className="note-list">
                  {[...v.notes]
                    .reverse()
                    .filter((n) => same(n.guests, picked))
                    .map((n) => (
                      <NoteItem n={n} key={n.id} />
                    ))}
                </ul>
              </div>
            )}
            {tab === "all" && (
              <div className="notes">
                <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label={w("screen.web.filter")}>
                  <option value="">{w("screen.web.everyone")}</option>
                  {[...new Set(v.notes.flatMap((n) => n.guests))].sort().map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                {groups.length === 0 && <p className="muted">{w("screen.web.none")}</p>}
                {groups.map((k) => (
                  <div key={k || "free"} className="note-group">
                    <div className="label">{k || w("screen.web.free")}</div>
                    <ul className="note-list">
                      {shown
                        .filter((n) => noteKey(n) === k)
                        .map((n) => (
                          <NoteItem n={n} key={n.id} />
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
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
      {/* The prompt's and the example's lines are always laid out, so the box keeps its height as they come and go. */}
      <div className={`prompt${req ? " waiting" : ""}`}>{prompt}</div>
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
                <Name name={p} plain />
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
      <div className="example muted">{example ? w("screen.input.example", { line: example }) : ""}</div>
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
