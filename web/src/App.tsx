// The player screen (TD v0.39–v0.43, The screen): start screen, the game (your character, the conversation,
// who you're looking at), card decks, the web viewer with notes, Il Notaio's hint, decision cards, the
// death banner, and the end screen, with hover explanations throughout. First-hand only: everything comes
// from the player's sheet, their own log, and public content. Words come from the setting pack (words.ts); every look comes from theme.css's tokens
// (app.css uses only those).

import { Component, createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { connect, type Ev } from "./connection.ts";
import { COMMAND, MENTION, canDo, canSpeak, isCommand, matchCommands, matchGuests, openMenu, withMention, type Trigger } from "./input.ts";
import { NO_SELECTION, appearsIn, briefingCards, chatGuest, cityList, curve, derive, earlierThisStage, errandDeadline, errandLine, factionArcs, heardAndSaw, hintMoment, loreParts, placeholderExample, preview, readingFor, recordUpTo, rulesCards, selectBack, selectInChat, selectInWeb, selectLore, stageRuns, stagesWith, talkingWith, trackMarks, webLayout, type Card, type Line, type LoreEntry, type Note, type Request, type Run, type Segment, type SharedSelection, type Sheet, type State, type View } from "./model.ts";
import { getInfo, guest, names, notaioHint, placeholderExamples, setInfo, stageDescription, w, type StartInfo } from "./words.ts";

type Send = (m: unknown) => void;

/**
 * Text handed to the input box from elsewhere on the screen: today only a note's "This is my conclusion"
 * (Interface v0.4, The Web of Secrets, Notes). `seq` tells one hand-off from the next, so the same text
 * handed twice fills the box twice.
 */
export type BoxFill = { text: string; seq: number };

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

// Selection (TD v0.41; Interface v0.6, One selection, shared with the Web of Secrets). The chat shows one
// thing at a time, a guest or a lore topic; the web holds up to two guests. There's one selection of guests,
// not two: the chat shows the one picked last (model.ts's SharedSelection), so a guest selected anywhere is
// selected in the web too, and what the web selects is what the chat shows.
type ChatSel = { kind: "guest"; name: string } | { kind: "lore"; entry: LoreEntry; back: ChatSel } | null;

/** The chat's view of the shared selection. */
function chatSel(s: SharedSelection): ChatSel {
  if (s.lore) return { kind: "lore", entry: s.lore.entry, back: s.lore.back ? { kind: "guest", name: s.lore.back } : null };
  const g = chatGuest(s);
  return g ? { kind: "guest", name: g } : null;
}

/** A starting selection for the tests: the chat's, or the web's guests (which win). */
function initialSelection(selected: ChatSel, web: string[] | null): SharedSelection {
  if (web?.length) return { guests: web.slice(-2), lore: null };
  if (selected?.kind === "guest") return { guests: [selected.name], lore: null };
  if (selected?.kind === "lore") return { guests: [], lore: { entry: selected.entry, back: selected.back?.kind === "guest" ? selected.back.name : null } };
  return NO_SELECTION;
}

interface Selection {
  /** What the chat shows. */
  sel: ChatSel;
  /** The guests selected, up to two, oldest first: what the web shows, and its bar. */
  picked: string[];
  /** Select a guest from the chat: replaces the last selection (or a pair); the same guest again clears both. */
  guest: (name: string) => void;
  /** Select a guest in the web: up to two. */
  pick: (name: string) => void;
  /** Select exactly these guests (a note's guest or pair); none clears. */
  set: (guests: string[]) => void;
  lore: (entry: LoreEntry) => void;
  back: () => void;
  clear: () => void;
}
const SelContext = createContext<Selection>({ sel: null, picked: [], guest: () => {}, pick: () => {}, set: () => {}, lore: () => {}, back: () => {}, clear: () => {} });

/** The one shared selection (Interface v0.6), and what the chat and the web each do with it. */
function useSharedSelection(initial: SharedSelection): Selection {
  const [s, setS] = useState<SharedSelection>(initial);
  return {
    sel: chatSel(s),
    picked: s.guests,
    guest: (name) => setS((x) => selectInChat(x, name)),
    pick: (name) => setS((x) => selectInWeb(x, name)),
    set: (guests) => setS({ guests: guests.slice(-2), lore: null }),
    lore: (entry) => setS((x) => selectLore(x, entry)),
    back: () => setS(selectBack),
    clear: () => setS(NO_SELECTION),
  };
}

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

/** Closes on Escape, ahead of the chat's own Escape (which clears the selection); only while `active`. */
function useEscape(onEscape: () => void, active = true) {
  const latest = useRef(onEscape);
  latest.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      e.preventDefault();
      latest.current();
    };
    document.addEventListener("keydown", esc, true);
    return () => document.removeEventListener("keydown", esc, true);
  }, [active]);
}

// ---- Your briefing, the rules, and the city (TD v0.40; Interface v0.5): each a modal over the whole screen ----

type DeckName = "briefing" | "rules" | "city";

/** Where each modal was left: the briefing's card, the open rules section (by its place), the open city entry (by id). */
type DeckPlaces = { briefing: number; rules: number | null; city: string | null };
const NO_PLACES: DeckPlaces = { briefing: 0, rules: null, city: null };

function briefingDeck(sheet: Sheet): Card[] {
  const past = sheet.past ?? [];
  return [...briefingCards(sheet.briefing), ...(past.length ? [{ title: w("screen.decks.past"), text: past.map((p) => `**${p.title}**\n${p.text}`).join("\n\n") }] : [])];
}

/** The modal's frame: over the screen, its title and a close, Escape closes it. */
function ModalFrame({ deck, onClose, children }: { deck: DeckName; onClose: () => void; children: ReactNode }) {
  const hint = useHint();
  useEscape(onClose);
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
        {children}
      </div>
    </div>
  );
}

/** The modal for one of the three: the briefing's deck, the rules' buttons, or the city's list. */
function DeckModal({ deck, sheet, places, onPlaces, onClose }: { deck: DeckName; sheet: Sheet; places: DeckPlaces; onPlaces: (p: DeckPlaces) => void; onClose: () => void }) {
  return (
    <ModalFrame deck={deck} onClose={onClose}>
      {deck === "briefing" ? (
        <BriefingDeck cards={briefingDeck(sheet)} place={places.briefing} onPlace={(n) => onPlaces({ ...places, briefing: n })} />
      ) : deck === "rules" ? (
        <RulesSections cards={rulesCards(sheet.rules)} open={places.rules} onOpen={(n) => onPlaces({ ...places, rules: n })} />
      ) : (
        <CityList lore={sheet.lore ?? []} open={places.city} onOpen={(id) => onPlaces({ ...places, city: id })} />
      )}
    </ModalFrame>
  );
}

/**
 * Your briefing, a card deck: tabs along the top show where you are and jump; clicking anywhere on the card
 * swipes to the next; a separate back control and the arrow keys go back and forth. No auto-advance. The
 * place is the caller's, so the deck remembers it.
 */
function BriefingDeck({ cards, place, onPlace }: { cards: Card[]; place: number; onPlace: (n: number) => void }) {
  const hint = useHint();
  const at = Math.min(place, Math.max(0, cards.length - 1));
  const card = cards[at];
  const go = (n: number) => onPlace(Math.max(0, Math.min(cards.length - 1, n)));
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
  return (
    <>
      {cards.length > 0 && (
        <nav className="tabs">
          {cards.map((c, i) => (
            <button key={i} className={`tab${i === at ? " on" : ""}`} aria-current={i === at} onClick={() => go(i)} {...hint("deckTab")}>
              {c.title}
            </button>
          ))}
        </nav>
      )}
      {card ? (
        <div className="deck-card" key={at} onClick={() => go(at + 1)} {...hint("deckCard", { focusable: true })}>
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
    </>
  );
}

/**
 * The rules (Interface v0.5): one button per section of the rules primer, filling the modal. Clicking one
 * grows it to fill the modal with that section; its × shrinks it back to the buttons.
 */
function RulesSections({ cards, open, onOpen }: { cards: Card[]; open: number | null; onOpen: (n: number | null) => void }) {
  const hint = useHint();
  const card = open === null ? undefined : cards[open];
  if (!cards.length) return <div className="deck-card empty">{w("screen.decks.empty")}</div>;
  return (
    <div className="rules-body">
      {card ? (
        <section className="rules-section open" data-section={open!} aria-label={card.title}>
          <div className="rules-section-head">
            <h3>{card.title}</h3>
            <button className="icon close" aria-label={w("screen.rulesModal.shrink")} onClick={() => onOpen(null)} {...hint("rulesShrink")}>
              {w("screen.rulesModal.mark")}
            </button>
          </div>
          <div className="deck-text">
            <Rich text={card.text} />
          </div>
        </section>
      ) : (
        <div className="rules-buttons">
          {cards.map((c, i) => (
            <button key={i} className="rules-section" data-section={i} onClick={() => onOpen(i)} {...hint("rulesSection")}>
              {c.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The city (Interface v0.5): a list scrolled like an inbox, one row per public lore entry with its title
 * and a one-line preview, under subject headers. Clicking a row opens the entry here, with a back arrow to
 * the list. Lore links in the chat open on the right, never here.
 */
function CityList({ lore, open, onOpen }: { lore: LoreEntry[]; open: string | null; onOpen: (id: string | null) => void }) {
  const hint = useHint();
  const entry = open === null ? undefined : lore.find((e) => e.id === open);
  const list = useRef<HTMLDivElement>(null);
  // Back at the list, at the place it was left.
  const scroll = useRef(0);
  useLayoutEffect(() => {
    if (!entry && list.current) list.current.scrollTop = scroll.current;
  }, [!!entry]);
  if (!lore.length) return <div className="deck-card empty">{w("screen.decks.empty")}</div>;
  if (entry)
    return (
      <section className="city-entry" data-lore={entry.id}>
        <button className="secondary city-back" onClick={() => onOpen(null)} {...hint("cityBack")}>
          {w("screen.cityList.back")}
        </button>
        <h3>{entry.title}</h3>
        <div className="deck-text">{entry.text}</div>
      </section>
    );
  return (
    <div className="city-list" ref={list}>
      {cityList(lore).map((g) => (
        <section key={g.subject ?? ""} className="city-group">
          <div className="city-subject">{g.subject ?? w("screen.decks.other")}</div>
          <ul>
            {g.entries.map((e) => (
              <li key={e.id}>
                <button
                  className="city-row"
                  data-lore={e.id}
                  onClick={() => {
                    scroll.current = list.current?.scrollTop ?? 0;
                    onOpen(e.id);
                  }}
                  {...hint("cityRow")}
                >
                  <span className="city-title">{e.title}</span>
                  <span className="city-preview muted">{preview(e)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
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
 * The game screen for a view of the player's log. The tests render it with a deck, a selection, the
 * Web of Secrets, or a past stage open from the start.
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
  keyType,
  pastStage = null,
  rightHidden: initialRightHidden,
}: {
  me: string;
  v: View;
  send: Send;
  status: "open" | "closed" | "connecting";
  deck?: DeckName | null;
  selected?: ChatSel;
  /** The Web of Secrets open from the start, with these guests selected in it. */
  web?: string[] | null;
  webTab?: WebTab;
  /** A relationship type highlighted from the start, in the Web of Secrets' key. */
  keyType?: string | null;
  /** A past stage open from the start (Interface v0.5). */
  pastStage?: string | null;
  /** The right panel hidden from the start (Interface v0.5); otherwise the browser's remembered choice. */
  rightHidden?: boolean;
}) {
  const [deck, setDeck] = useState<DeckName | null>(initialDeck);
  const [places, setPlaces] = useState<DeckPlaces>(NO_PLACES);
  // One selection of guests, shared by the chat and the Web of Secrets (Interface v0.6).
  const selection = useSharedSelection(initialSelection(selected, initialWeb));
  // The Web of Secrets is always there (TD v0.44); open or down, it shows the shared selection.
  const [webOpen, setWebOpen] = useState(initialWeb !== null);
  // A note's conclusion goes to the input box, not straight to the game (Interface v0.4).
  const [boxFill, setBoxFill] = useState<BoxFill | null>(null);
  const right = useRightHidden(initialRightHidden);
  // Escape clears the selection, in both places, after any open menu, deck, or the Web of Secrets has taken it.
  const clear = useRef(selection.clear);
  clear.current = selection.clear;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) clear.current();
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, []);
  const layout = useRef<HTMLDivElement>(null);
  if (v.result) return <End v={v} me={me} />;
  const dead = v.deaths.some((d) => d.you);
  /** A decision card is waiting, so the message box is closed. */
  const cardWaiting = !!v.pending && v.pending.kind !== "speak";
  /** "This is my conclusion": the web slides down (keeping its selection) and the box fills, sending nothing. */
  const concludeInBox = (text: string) => {
    setWebOpen(false);
    setBoxFill((f) => ({ text, seq: (f?.seq ?? 0) + 1 }));
  };
  /**
   * "Open in the Web of Secrets" (Interface v0.6–v0.7): the selection is already the web's, so it just opens
   * the web; from the "talking with" card, it also makes that guest the selection.
   */
  const openWeb = (guest: string | null) => {
    if (guest && !selection.picked.includes(guest)) selection.set([guest]);
    setWebOpen(true);
  };
  return (
    <SelContext.Provider value={selection}>
      <div className={`layout${right.hidden ? " right-hidden" : ""}`} ref={layout}>
        <Boundary panel="left" fallback={(n) => <aside className="side left">{n}</aside>}>
          <Left me={me} v={v} onDeck={setDeck} />
        </Boundary>
        <Centre me={me} v={v} send={send} dead={dead} status={status} boxFill={boxFill} initialPast={pastStage} />
        <Boundary panel="right" fallback={(n) => <aside className="side right">{n}</aside>}>
          {right.hidden ? <RightHandle onShow={() => right.set(false)} /> : <Right me={me} v={v} onWeb={openWeb} onHide={() => right.set(true)} layout={layout} />}
        </Boundary>
      </div>
      <Boundary
        panel="web"
        fallback={(n) => (
          <div className="web-dock">
            <div className="web-bar">{n}</div>
          </div>
        )}
      >
        <WebDock me={me} v={v} open={webOpen} setOpen={setWebOpen} initialTab={webTab} initialKey={keyType ?? null} send={send} dead={dead} boxClosed={cardWaiting} onConclude={concludeInBox} />
      </Boundary>
      {/* After everything, and above it all in theme.css's order, so nothing covers it. */}
      {deck && v.sheet && (
        <Boundary panel="deck" fallback={(n) => <FailedOverlay notice={n} onClose={() => setDeck(null)} />}>
          <DeckModal deck={deck} sheet={v.sheet} places={places} onPlaces={setPlaces} onClose={() => setDeck(null)} />
        </Boundary>
      )}
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
    if (!el) return;
    // Not counting the hint's own room at the end: once only that is left below, there's nothing more to see.
    const hint = el.querySelector<HTMLElement>(":scope > .more-below");
    const own = hint ? hint.offsetHeight + parseFloat(getComputedStyle(hint).marginTop) : 0;
    setMore(el.scrollTop + el.clientHeight < el.scrollHeight - own - 2);
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

function Left({ me, v, onDeck }: { me: string; v: View; onDeck: (d: DeckName) => void }) {
  const s = v.state;
  const line = errandLine(s);
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
      {/* The three decks right under the sheet (TD v0.45), so they're in sight on a short window. The Web of
          Secrets has no button here: it's always at the bottom (TD v0.44). */}
      <div className="buttons decks">
        {(["briefing", "rules", "city"] as const).map((d) => (
          <button key={d} className="secondary" disabled={!v.sheet} onClick={() => onDeck(d)} {...hint(d)}>
            {w(`screen.${d}`)}
          </button>
        ))}
      </div>
      {v.sheet?.errand && (
        <div className="errand" {...hint(line?.kind === "reward" ? "errandReward" : line?.kind === "noReward" ? "errandNoReward" : "errand", { focusable: true })}>
          <div className="label">{w("screen.errandCard.title")}</div>
          <div className="errand-text">
            <Rich text={v.sheet.errand} />
          </div>
          {/* TD v0.47: what the errand earns, in the card's accent; after the check, {plot_status} replaces it. */}
          {line?.kind === "status" && <div className="errand-result">{line.text}</div>}
          {line && line.kind !== "status" && (
            <div className="errand-reward" data-reward={line.kind}>
              {w(`screen.errandCard.${line.kind}`)}
            </div>
          )}
        </div>
      )}
      <RoomView v={v} />
      <MoreBelow m={m} />
    </aside>
  );
}

/** One cluster in the room: a group's overlapping tokens, or a private pair's two joined ones. (Top level, so a re-render keeps its elements, and with them hover and focus.) */
function RoomStack({ names, pair }: { names: string[]; pair?: boolean }) {
  const hint = useHint();
  const sel = useContext(SelContext);
  const on = (n: string) => sel.sel?.kind === "guest" && sel.sel.name === n;
  return (
    <li className={`cluster${pair ? " pair" : ""}`} data-cluster={pair ? "private" : "group"}>
      <span className="stack">
        {names.map((n, i) => (
          <span key={n} className="stack-item">
            {pair && i > 0 && <span className="joint" aria-hidden="true" />}
            <button className={`token${on(n) ? " selected" : ""}`} aria-label={n} aria-pressed={on(n)} onClick={() => sel.guest(n)} {...hint(pair ? "roomPair" : "roomToken", { values: { name: n } })}>
              <Portrait name={n} />
            </button>
          </span>
        ))}
      </span>
    </li>
  );
}

/**
 * The room (TD v0.45; Mechanics, Everyone Sees the Room), under the errand card: the player's own group,
 * marked, with its guests by name, then every other group as a cluster of overlapping tokens that spread
 * out on hover, and each private pair as two joined tokens. Clicking a token selects that guest. From the
 * state's `room`, the same data as the AI guests' room line; during midnight and between seats there's no
 * room, so only who's with the player.
 */
function RoomView({ v }: { v: View }) {
  const s = v.state;
  const hint = useHint();
  return (
    <>
      <div className="label" {...hint("here", { focusable: true })}>
        {w("screen.room")}
      </div>
      <div className="room">
        <div className="cluster mine" data-cluster="mine">
          <div className="cluster-label">{w(s?.conversation.kind === "colloquio" ? "screen.withYouPrivately" : "screen.withYou")}</div>
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
        </div>
        {s?.room && (s.room.groups.length > 0 || s.room.colloquios.length > 0) && (
          <ul className="clusters">
            {s.room.groups.map((g) => (
              <RoomStack key={g.join("|")} names={g} />
            ))}
            {s.room.colloquios.map((p) => (
              <RoomStack key={p.join("|")} names={p} pair />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

const conversationLabel = (s: State | null) =>
  !s ? "" : s.conversation.kind === "capannello" ? (s.present.length ? w("screen.capannello", { others: names(s.present) }) : w("screen.alone")) : s.conversation.kind === "colloquio" ? w("screen.colloquio", { other: s.conversation.other }) : w("screen.alone");

/** One line for an earlier conversation in this stage: where. */
const earlierLabel = (seg: Segment) => w("screen.earlier.item", { where: conversationLabel(seg.state) });

function Centre({ me, v, send, dead, status, boxFill, initialPast = null }: { me: string; v: View; send: Send; dead: boolean; status: string; boxFill: BoxFill | null; initialPast?: string | null }) {
  const end = useRef<HTMLDivElement>(null);
  const stream = useRef<HTMLDivElement>(null);
  const hint = useHint();
  const { sel } = useContext(SelContext);
  /** The past stage open in the chat window (Interface v0.5, Past stages), read-only; null for the current stage. */
  const [past, setPast] = useState<string | null>(initialPast);
  /** Earlier conversations the player opened or closed by hand, by their first line; the rest follow the selected guest. */
  const [manual, setManual] = useState<Map<string, boolean>>(() => new Map());
  // The current stage keeps its newest line in view; a past stage holds still while the player reads, and
  // coming back goes to the newest line. (A block body: scrollIntoView returns a promise in newer browsers.)
  useEffect(() => {
    if (!past) end.current?.scrollIntoView({ block: "end" });
  }, [v.stream.length, v.pending?.id, v.speaking, past]);
  useLayoutEffect(() => {
    if (past && stream.current) stream.current.scrollTop = 0;
  }, [past]);
  const card = v.pending && v.pending.kind !== "speak" ? v.pending : null;
  const o = (v.pending?.kind === "speak" ? v.pending.options : {}) as { canEnd?: boolean; closing?: string | null };
  // End conversation acts on the conversation, so it sits on the members line (Interface v0.5); never from a past stage.
  const canEnd = !past && !dead && !card && (v.state?.conversation.kind === "colloquio" || !!o.canEnd) && !o.closing;
  // Only the current conversation is open; this stage's earlier ones fold into "Earlier this stage", each
  // opening in place, and earlier stages live in the bar. Selecting a guest opens the ones they appeared in,
  // and deselecting folds them again (TD v0.41; Interface v0.5).
  const earlier = earlierThisStage(v);
  const current = v.segments.at(-1);
  const keyOf = (r: Run) => r.lines[0]!.id;
  const isOpen = (r: Run) => manual.get(keyOf(r)) ?? (sel?.kind === "guest" && appearsIn(r, sel.name));
  const toggle = (r: Run) => setManual(new Map(manual).set(keyOf(r), !isOpen(r)));
  const lore = v.sheet?.lore ?? [];
  /** The game is waiting for the player: from a past stage, the Return button and the current stage beckon. */
  const waiting = !dead && !!v.pending;
  return (
    <main className={`centre${past ? " reading-past" : ""}`}>
      <header className="conv-head">
        <div className="conv-where">
          <StageBar stages={v.sheet?.track ?? []} now={v.state?.phaseLabel} deadline={errandDeadline(v)} open={past} beckon={!!past && waiting} dots={sel?.kind === "guest" ? stagesWith(v, sel.name) : null} onOpen={setPast} />
          {/* The members line (Interface v0.5), with End conversation in a Colloquio. */}
          <div className="members">
            <span className="muted" {...hint("header", { focusable: true })}>
              {conversationLabel(v.state)}
            </span>
            {canEnd && (
              <button className="secondary" onClick={() => send({ type: "end" })} {...hint("end")}>
                {w("screen.input.end")}
              </button>
            )}
          </div>
        </div>
        {/* The connection's state in the header, so the stream doesn't move when it changes. */}
        {status !== "open" && <div className="notice status">{w(status === "closed" ? "screen.reconnecting" : "screen.connecting")}</div>}
      </header>
      <div className="stream" ref={stream}>
        <Boundary panel="stream">
          {past ? (
            <PastStage stage={past} v={v} me={me} />
          ) : (
            <>
              {earlier.length > 0 && (
                <section className="earlier">
                  <div className="label" {...hint("earlier", { focusable: true })}>
                    {w("screen.earlier.title")}
                  </div>
                  {earlier.map((r) => (
                    <div className={`earlier-item${isOpen(r) ? " open" : ""}`} key={keyOf(r)}>
                      <button className="earlier-line" aria-expanded={isOpen(r)} onClick={() => toggle(r)} {...hint("earlierLine")}>
                        <span>{earlierLabel(r)}</span>
                        <span className="muted">{w(isOpen(r) ? "screen.earlier.open" : "screen.earlier.closed")}</span>
                      </button>
                      {isOpen(r) && (
                        <div className="earlier-lines">
                          {r.lines.map((l) => (
                            <StreamLine key={l.id} l={l} me={me} lore={lore} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              )}
              {current?.lines.map((l) => <StreamLine key={l.id} l={l} me={me} lore={lore} />)}
              {v.deaths.map((d) => (
                <div className={`banner${d.you ? " you" : ""}`} key={d.name}>
                  {d.you ? w("screen.death.you") : w("screen.death.banner", { name: d.name })}
                </div>
              ))}
              {v.speaking && <div className="speaking">{w("screen.speaking", { name: v.speaking })}</div>}
              {card && !dead && <Card req={card} send={send} me={me} />}
            </>
          )}
        </Boundary>
        <div ref={end} />
      </div>
      <Boundary panel="hint">
        <NotaioHint me={me} v={v} />
      </Boundary>
      {!dead && (
        <Boundary panel="input" fallback={(n) => <div className="input">{n}</div>}>
          <InputBox me={me} v={v} send={send} closed={!!card} fill={boxFill} past={!!past} onReturn={() => setPast(null)} />
        </Boundary>
      )}
    </main>
  );
}

/**
 * A past stage, opened from the bar (Interface v0.5, Past stages): every conversation the player was in
 * during it, in order, read-only, with lore links and highlighting as in the current stage.
 */
function PastStage({ stage, v, me }: { stage: string; v: View; me: string }) {
  const hint = useHint();
  const runs = stageRuns(v, stage);
  const lore = v.sheet?.lore ?? [];
  return (
    <section className="past-stage" data-stage={stage} aria-label={stage}>
      <PastSummary stage={stage} v={v} />
      <div className="label" {...hint("pastStage", { focusable: true })}>
        {w("screen.pastStage.heading", { stage })}
      </div>
      {runs.length ? (
        runs.map((r) => (
          <div className="past-conv" key={r.lines[0]!.id}>
            <div className="past-where muted">{conversationLabel(r.state)}</div>
            <div className="past-lines">
              {r.lines.map((l) => (
                <StreamLine key={l.id} l={l} me={me} lore={lore} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="muted">{w("screen.pastStage.empty")}</p>
      )}
    </section>
  );
}

/**
 * The place for Il Notaio's summary of a past stage (Interface v0.13, Past stages; Technical Design v0.51,
 * Past-stage summaries): his box goes here, first in the past stage's window, covering the dialogue from
 * just under the bar down to the input box. It's a model call, built in #146; until then a past stage opens
 * on its dialogue alone, so this renders nothing.
 */
function PastSummary(_props: { stage: string; v: View }) {
  return null;
}

/**
 * The stage bar (Interface v0.5): a circle per stage, joined by a stroke, each with its numeral; past ones
 * filled, future ones outlined, the current one stretched into an oval with its name. Hovering (or focusing)
 * another stage expands that one instead, with its name and description, and the current one shrinks back
 * meanwhile. Past stages open read-only when clicked, the current one returns, and future ones can't be
 * opened. With a guest selected, a dot marks each past stage they appear in; from a past stage while the
 * game waits for the player, the current stage beckons. The errand's deadline mark stays on its stage
 * (TD v0.47). On a narrow window the bar scrolls sideways, keeping the current (or open) stage in view.
 */
function StageBar({ stages, now, deadline, open, beckon, dots, onOpen }: { stages: string[]; now: string | undefined; deadline: string | null; open: string | null; beckon: boolean; dots: Set<string> | null; onOpen: (stage: string | null) => void }) {
  const hint = useHint();
  const [hover, setHover] = useState<string | null>(null);
  const bar = useRef<HTMLOListElement>(null);
  const shown = open ?? now;
  // Keep the shown stage in view: when it changes, and when the window is resized (not on hover, so
  // nothing moves under the pointer).
  useLayoutEffect(() => {
    const keep = () => {
      const ol = bar.current;
      const el = ol?.querySelector<HTMLElement>(".mark.shown");
      if (!ol || !el) return;
      const left = el.offsetLeft - ol.offsetLeft;
      // Wider than the bar, it shows from its start (its numeral and the start of its name).
      if (left < ol.scrollLeft || el.offsetWidth > ol.clientWidth) ol.scrollLeft = left;
      else if (left + el.offsetWidth > ol.scrollLeft + ol.clientWidth) ol.scrollLeft = left + el.offsetWidth - ol.clientWidth;
    };
    keep();
    window.addEventListener("resize", keep);
    return () => window.removeEventListener("resize", keep);
  }, [shown, stages.length]);
  if (!stages.length)
    return (
      <div className="phase" {...hint("track", { focusable: true })}>
        {now}
      </div>
    );
  // Hover is cleared only on leaving the bar, so a neighbour shifting as the oval moves never flickers it.
  const expanded = hover ?? shown;
  return (
    <ol className="track stage-bar" ref={bar} aria-label={w("screen.hints.track")} onMouseLeave={() => setHover(null)}>
      {trackMarks(stages, now, deadline).map((m, i) => {
        const h = hint(m.at === "past" ? "trackPast" : m.at === "now" ? "trackNow" : "trackNext", { values: { stage: m.stage } });
        const on = {
          ...h,
          onMouseEnter: (e: { currentTarget: Element }) => {
            h.onMouseEnter(e);
            setHover(m.stage);
          },
          onFocus: (e: { currentTarget: Element }) => {
            h.onFocus(e);
            setHover(m.stage);
          },
          onBlur: () => {
            h.onBlur();
            setHover(null);
          },
        };
        const description = m.stage === hover ? stageDescription(m.stage) : "";
        const inner = (
          <>
            <span className="num">{i + 1}</span>
            {m.stage === expanded && <span className="stage-name">{m.stage}</span>}
            {description && <span className="stage-desc">{description}</span>}
          </>
        );
        const classes = ["mark", m.at, m.deadline && "deadline", m.stage === expanded && "expanded", m.stage === shown && "shown", m.stage === open && "open", m.at === "now" && beckon && "beckon"].filter(Boolean).join(" ");
        return (
          <li key={m.stage} className={classes} aria-label={m.stage} aria-current={m.at === "now" ? "step" : undefined}>
            {/* TD v0.47: with `plot_reward` on, the errand's deadline carries a small errand mark with its own explanation. */}
            {m.deadline && <span className="errand-mark" role="img" aria-label={w("screen.errandDeadline")} {...hint("trackDeadline", { focusable: true })} />}
            {m.at === "next" ? (
              <span className="stage" tabIndex={0} aria-disabled="true" {...on}>
                {inner}
              </span>
            ) : (
              <button className="stage" aria-pressed={m.at === "past" ? m.stage === open : undefined} onClick={() => onOpen(m.at === "past" ? m.stage : null)} {...on}>
                {inner}
              </button>
            )}
            {m.at === "past" && dots?.has(m.stage) && <span className="stage-dot" aria-hidden="true" />}
          </li>
        );
      })}
    </ol>
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

/** The right panel's width (TD v0.44): dragged by its handle, within theme.css's limits, remembered in the browser. */
const WIDTH_KEY = "player-screen.right-width";

function useRightWidth(layout: RefObject<HTMLDivElement | null>) {
  const limits = () => {
    const css = getComputedStyle(document.documentElement);
    const px = (t: string, d: number) => parseFloat(css.getPropertyValue(t)) || d;
    return { min: px("--right-min", 220), max: px("--right-max", 560) };
  };
  const apply = (width: number) => {
    const { min, max } = limits();
    const w = Math.round(Math.max(min, Math.min(max, width)));
    layout.current?.style.setProperty("--right-width", `${w}px`);
    return w;
  };
  // The remembered width, once the page is laid out.
  useLayoutEffect(() => {
    try {
      const saved = Number(localStorage.getItem(WIDTH_KEY));
      if (saved > 0) apply(saved);
    } catch {
      // Blocked storage: the theme's width.
    }
  }, []);
  return (e: { clientX: number; preventDefault: () => void }) => {
    e.preventDefault();
    const panel = layout.current?.querySelector(".side.right");
    const start = { x: e.clientX, width: panel?.getBoundingClientRect().width ?? 0 };
    let width = start.width;
    const move = (m: PointerEvent) => void (width = apply(start.width + start.x - m.clientX));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      try {
        localStorage.setItem(WIDTH_KEY, String(width));
      } catch {
        // The width lasts until the page closes.
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
}

/** Whether the right panel is hidden (Interface v0.5): remembered in the browser, shown by default. */
const RIGHT_HIDDEN_KEY = "player-screen.right-hidden";

function useRightHidden(initial?: boolean) {
  const [hidden, setHidden] = useState<boolean>(() => {
    if (initial !== undefined) return initial;
    try {
      return globalThis.localStorage?.getItem(RIGHT_HIDDEN_KEY) === "hidden";
    } catch {
      return false;
    }
  });
  return {
    hidden,
    set: (h: boolean) => {
      setHidden(h);
      try {
        localStorage.setItem(RIGHT_HIDDEN_KEY, h ? "hidden" : "shown");
      } catch {
        // Blocked storage: the choice lasts until the page closes.
      }
    },
  };
}

/**
 * The right panel hidden (Interface v0.5): a thin strip with a handle that brings it back. Selecting a
 * guest doesn't reopen it; the handle shows the selected guest's small portrait, so the player knows
 * someone is selected.
 */
function RightHandle({ onShow }: { onShow: () => void }) {
  const hint = useHint();
  const { sel } = useContext(SelContext);
  return (
    <aside className="side right hidden">
      <button className="right-handle" aria-label={w("screen.right.showLabel")} onClick={onShow} {...hint("showRight")}>
        <span className="right-handle-mark">{w("screen.right.show")}</span>
        {sel?.kind === "guest" && (
          <span className="right-handle-guest" data-guest={sel.name}>
            <Portrait name={sel.name} />
          </span>
        )}
      </button>
    </aside>
  );
}

/** A guest's public card: portrait, name, faction, subtitle, and the public lines everyone knows. */
function PublicCard({ who, v }: { who: string; v: View }) {
  const g = guest(who);
  const known = (v.sheet?.connections ?? []).filter((c) => !c.private && c.between.includes(who));
  return (
    <>
      <div className="who column">
        <Portrait name={who} large />
        <div className="name">{who}</div>
        <div className="muted">{g?.faction}</div>
        <div className="muted">{g?.subtitle}</div>
      </div>
      {known.length > 0 && (
        <>
          <div className="label">{w("screen.right.known")}</div>
          <ul className="known">
            {known.map((c, i) => (
              <li key={i}>
                <span className="muted">{w("screen.right.with", { name: c.between.find((x) => x !== who) ?? who })}</span> {c.line}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/**
 * Right: whoever you're looking at (TD v0.44–v0.45). Two kinds of card, never confused: the live "Talking
 * with" card, in the conversation's tint, with a dot while that guest speaks and the group's other tokens;
 * and over it, a selected guest's plain raised "Looking at" card (or a lore entry), which slides up and
 * leaves the talking card's header in view, one click from going back. The panel's left edge resizes it.
 */
function Right({ me, v, onWeb, onHide, layout }: { me: string; v: View; onWeb: (guest: string | null) => void; onHide: () => void; layout: RefObject<HTMLDivElement | null> }) {
  const s = v.state;
  const hint = useHint();
  const { sel, back, clear } = useContext(SelContext);
  const drag = useRightWidth(layout);
  // TD v0.46: whoever has the player's ear (the other guest in a Colloquio; in a group, the last address
  // either way), or no one; never just the group's last speaker.
  const talk = talkingWith(v, me);
  const others = (s?.present ?? []).filter((p) => p !== talk);
  const over = sel?.kind === "guest" ? sel.name : sel?.kind === "lore" ? sel.entry : null;
  return (
    <aside className={`side right${over ? " covered" : ""}`}>
      <div className="resize" role="separator" aria-orientation="vertical" onPointerDown={drag} {...hint("resize", { focusable: true })} />
      {/* Interface v0.5: hides the panel to a thin strip with a handle, and the chat widens. */}
      <button className="right-hide" aria-label={w("screen.right.hideLabel")} onClick={onHide} {...hint("hideRight")}>
        {w("screen.right.hide")}
      </button>
      <section className="person talk" data-guest={talk ?? undefined}>
        {/* Covered, the header stays in view and goes back to the conversation; uncovered, it's a label. */}
        {over ? (
          <button className="person-head" onClick={clear} {...hint("backToTalk")}>
            <span className="label">{w("screen.talkingTo")}</span>
            {talk && v.speaking === talk && <span className="speaking-dot" aria-label={w("screen.right.speakingNow")} />}
            {talk && <span className="person-head-name">{talk}</span>}
          </button>
        ) : (
          <div className="person-head" {...hint("talkingTo", { focusable: true })}>
            <span className="label">{w("screen.talkingTo")}</span>
            {talk && v.speaking === talk && <span className="speaking-dot" aria-label={w("screen.right.speakingNow")} />}
          </div>
        )}
        {talk && talk !== me ? <PublicCard who={talk} v={v} /> : <p className="muted no-ear">{w("screen.right.noEar")}</p>}
        {others.length > 0 && (
          <div className="tokens">
            {others.map((p) => (
              <Portrait key={p} name={p} />
            ))}
          </div>
        )}
        <div className="buttons">
          <button className="secondary" onClick={() => onWeb(talk)} {...hint("openWeb")}>
            {w("screen.right.openWeb")}
          </button>
        </div>
      </section>
      {over && (
        <section className="person look" data-guest={typeof over === "string" ? over : undefined} key={typeof over === "string" ? over : over.id}>
          <header className="person-head">
            <span className="label" {...hint(typeof over === "string" ? "lookingAt" : "loreEntry", { focusable: true })}>
              {w(typeof over === "string" ? "screen.right.lookingAt" : "screen.right.lore")}
            </span>
            {typeof over === "string" ? (
              <button className="icon close" aria-label={w("screen.close")} onClick={clear} {...hint("deselect")}>
                {w("screen.right.deselect")}
              </button>
            ) : (
              <button className="secondary" onClick={back} {...hint("back")}>
                {w("screen.right.back")}
              </button>
            )}
          </header>
          {typeof over === "string" ? (
            <>
              <PublicCard who={over} v={v} />
              <div className="buttons">
                <button className="secondary" onClick={() => onWeb(over)} {...hint("openWeb")}>
                  {w("screen.right.openWeb")}
                </button>
              </div>
            </>
          ) : (
            <div className="lore-entry" data-lore={over.id}>
              <h3>{over.title}</h3>
              <p>{over.text}</p>
            </div>
          )}
        </section>
      )}
    </aside>
  );
}

// ---- The Web of Secrets (TD v0.40–v0.44): the web of relationships, what you heard and saw, notes, and Il Notaio's reading

type WebTab = "record" | "notes" | "all";

/**
 * Always there (TD v0.44): a raised bar along the bottom with the title and the current selection. Clicking
 * the bar slides the panel up to about nine-tenths of the window; clicking it again, or Escape, slides it
 * down. Inside: the web, with its key and faction labels, the record and notes, and Il Notaio's reading.
 */
function WebDock({
  me,
  v,
  open,
  setOpen,
  initialTab = "record",
  initialKey,
  send,
  dead,
  boxClosed,
  onConclude,
}: {
  me: string;
  v: View;
  open: boolean;
  setOpen: (o: boolean) => void;
  initialTab?: WebTab;
  initialKey: string | null;
  send: Send;
  dead: boolean;
  /** The message box is closed (a decision card is waiting), so a conclusion can't go to it. */
  boxClosed: boolean;
  /** Hands a note's conclusion to the input box (Interface v0.4). */
  onConclude: (text: string) => void;
}) {
  const info = getInfo();
  const hint = useHint();
  const [tab, setTab] = useState<WebTab>(initialTab);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  const [keyOpen, setKeyOpen] = useState(true);
  const [keyType, setKeyType] = useState<string | null>(initialKey);
  useEscape(() => setOpen(false), open);
  // Focusing the notes box can scroll the dock's clipped contents; down, the dock shows its bar again.
  const dock = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open && dock.current) dock.current.scrollTop = 0;
  }, [open]);
  // The selection is the chat's too (Interface v0.6). In here, up to two: a first, then a second; a third
  // replaces the older; selecting a selected guest drops them.
  const selection = useContext(SelContext);
  const { picked, pick } = selection;
  const at = webLayout(info.roster, info.factions ?? []);
  const arcs = factionArcs(info.roster, info.factions ?? []);
  useReadingRequest(me, v, picked, open, send);
  const types = info.relationshipTypes ?? [];
  const connections = v.sheet?.connections ?? [];
  const lit = (c: { between?: string[]; guests?: string[] }) => picked.length > 0 && picked.every((p) => (c.between ?? c.guests ?? []).includes(p));
  const keyed = (t: string) => (keyType === null ? "" : t === keyType ? " key-on" : " key-off");
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const conclude = v.commands.find((c) => c.action === "conclude");
  const who = picked.length === 2 ? w("screen.web.between", { a: picked[0]!, b: picked[1]! }) : (picked[0] ?? "");
  const record = heardAndSaw(v, picked, me);
  const noteKey = (n: Note) => [...n.guests].sort().join(" · ");
  const shown = [...v.notes].reverse().filter((n) => !filter || n.guests.includes(filter));
  const groups = [...new Set(shown.map(noteKey))];
  const typeLabel = (t: string) => types.find((x) => x.type === t)?.label ?? w("screen.web.otherType");
  const NoteItem = ({ n }: { n: Note }) => (
    <li className="note" key={n.id}>
      <button className="note-text" onClick={() => (selection.set(n.guests), setTab("record"))} {...hint("noteItem")}>
        {n.text}
      </button>
      {/* Only a note on a guest or a pair can be a conclusion; a free note has no button (Interface v0.3). */}
      {n.guests.length > 0 && (
        <button className="secondary small conclude" disabled={!conclude || dead || boxClosed} onClick={() => onConclude(`${conclude!.name} ${n.text}`)} {...hint(boxClosed && !dead ? "concludeWaiting" : "conclude")}>
          {w("screen.web.conclude")}
        </button>
      )}
    </li>
  );
  return (
    <>
      {open && <div className="web-backdrop" onClick={() => setOpen(false)} />}
      <section ref={dock} className={`web-dock${open ? " open" : ""}`} aria-label={w("screen.web.title")}>
        <button className="web-bar" aria-expanded={open} onClick={() => setOpen(!open)} {...hint("web")}>
          <span className="web-bar-title">{w("screen.web.title")}</span>
          <span className="muted web-bar-sel">{picked.length ? who : w("screen.web.barNone")}</span>
          <span className="muted">{w(open ? "screen.web.shut" : "screen.web.open")}</span>
        </button>
        <div className="web" inert={!open}>
          <div className="web-body">
            <div className="web-map">
              <svg className="web-diagram" viewBox="-34 -8 168 116" role="group" aria-label={w("screen.web.title")}>
                {/* Interface v0.5: an arc in each faction's colour around its part of the ring. */}
                <g className="faction-arcs">
                  {arcs.map((f) => (
                    <path key={f.faction} className="faction-arc" d={f.d} style={{ stroke: f.colour }} />
                  ))}
                </g>
                {connections.map((c, i) => {
                  const [a, b] = c.between.map((n) => at.get(n));
                  if (!a || !b) return null;
                  return (
                    <g key={`c${i}`} data-type={c.type}>
                      {/* The player's own connections, from their briefing: marked as theirs under the type's line. */}
                      {c.private && <path className={`edge-under${keyed(c.type)}`} d={curve(a, b)} />}
                      <path className={`edge rel-${c.type}${c.private ? " yours" : ""}${lit(c) ? " on" : ""}${keyed(c.type)}`} d={curve(a, b)} />
                    </g>
                  );
                })}
                {v.notes
                  .filter((n) => n.guests.length === 2)
                  .map((n) => {
                    const [a, b] = n.guests.map((g) => at.get(g));
                    return a && b ? <path key={n.id} className={`edge note-line${lit(n) ? " on" : ""}${keyType ? " key-off" : ""}`} d={curve(a, b)} /> : null;
                  })}
                {info.roster.map((r) => {
                  const p = at.get(r.name)!;
                  return (
                    <g key={r.name} data-guest={r.name} className={`node${picked.includes(r.name) ? " picked" : ""}${r.name === me ? " me" : ""}`} transform={`translate(${p.x} ${p.y})`} onClick={() => pick(r.name)} role="button" aria-pressed={picked.includes(r.name)} {...hint("webNode", { focusable: true })}>
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
                {/* Each faction's name in its colour, at its arc's corner: apart from the key, which is about lines. */}
                <g className="factions">
                  {arcs.map((f) => (
                    <text key={f.faction} className="faction-label" x={f.x} y={f.y} textAnchor={f.anchor} style={{ fill: f.colour }} {...hint("faction", { focusable: true })}>
                      {f.faction}
                    </text>
                  ))}
                </g>
              </svg>
              {types.length > 0 && (
                <div className={`web-key${keyOpen ? " open" : ""}`}>
                  <button className="key-head" aria-expanded={keyOpen} onClick={() => setKeyOpen(!keyOpen)} {...hint("key")}>
                    {w("screen.web.key")}
                    <span className="muted">{w(keyOpen ? "screen.web.keyHide" : "screen.web.keyShow")}</span>
                  </button>
                  {keyOpen && (
                    <ul>
                      {types.map((t) => (
                        <li key={t.type}>
                          <button className={`key-type${keyType === t.type ? " on" : ""}`} aria-pressed={keyType === t.type} data-type={t.type} title={t.covers} onClick={() => setKeyType(keyType === t.type ? null : t.type)} {...hint("keyType")}>
                            <svg className="swatch" viewBox="0 0 12 4" aria-hidden="true">
                              <line className={`edge rel-${t.type}`} x1={0.5} y1={2} x2={11.5} y2={2} />
                            </svg>
                            {t.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="web-side">
              <nav className="tabs">
                {(["record", "notes", "all"] as const).map((t) => (
                  <button key={t} className={`tab${tab === t ? " on" : ""}`} onClick={() => setTab(t)} {...hint(`${t}Tab`)}>
                    {w(`screen.web.${t}`)}
                  </button>
                ))}
              </nav>
              {/* What you heard and saw (Interface v0.5): with nothing selected, one line asking for a guest and no
                  reading; with a selection, Il Notaio's box over the column, the dialogue behind it. */}
              {tab === "record" &&
                (picked.length === 0 ? (
                  <p className="muted record-pick">{w("screen.web.pick")}</p>
                ) : (
                  <RecordPane key={[...picked].sort().join("|")} box={<ReadingText me={me} v={v} picked={picked} />}>
                    <div className="record">
                      <h3>{who}</h3>
                      {connections.filter(lit).map((c, i) => (
                        <p key={i} className={`connection${c.private ? " yours" : ""}`}>
                          <span className={`type-chip rel-${c.type}`}>{typeLabel(c.type)}</span> {c.line} {c.private && <span className="muted">{w("screen.web.yours")}</span>}
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
                  </RecordPane>
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
        </div>
      </section>
    </>
  );
}

/**
 * Il Notaio's reading (TD v0.44): asked for once the Web of Secrets is open with a guest or two selected
 * (after a moment, so a quick second pick asks once), whichever tab is showing; the game answers with a
 * reading, or with the plain tally when there's none. It stands until the record for the selection grows.
 */
function useReadingRequest(me: string, v: View, picked: string[], open: boolean, send: Send) {
  const asked = useRef(new Set<string>());
  const have = picked.length ? readingFor(v, picked, me) : null;
  const key = `${[...picked].sort().join("|")}@${recordUpTo(v, picked, me)}`;
  useEffect(() => {
    if (!open || !picked.length || have || asked.current.has(key)) return;
    const t = setTimeout(() => {
      asked.current.add(key);
      send({ type: "reading", guests: picked });
    }, 400);
    return () => clearTimeout(t);
  }, [open, key, !!have]);
}

/** The reading's words: today's reading (#146 replaces it), or the tally, or that he's considering. */
function ReadingText({ me, v, picked }: { me: string; v: View; picked: string[] }) {
  const have = readingFor(v, picked, me);
  return (
    <p className={`reading-text${have?.text ? "" : " tally"}`} data-reading={have ? (have.text ? "reading" : "tally") : "waiting"}>
      {have ? (have.text ?? have.tally) : w("screen.reading.waiting")}
    </p>
  );
}

/**
 * The What you heard and saw column with Il Notaio's box in it (Interface v0.5). Expanded by default, the
 * box covers almost all the dialogue, with a strip of it peeking out at the top. Clicking the box, or the
 * dialogue behind it, minimizes it to the column's foot, still showing its first lines; clicking the
 * minimized box expands it again. A new selection starts it expanded (the caller keys it by selection).
 */
function RecordPane({ box, children }: { box: ReactNode; children: ReactNode }) {
  const hint = useHint();
  const [expanded, setExpanded] = useState(true);
  return (
    <div className={`record-pane${expanded ? " covered" : ""}`}>
      {/* While the box covers it, a click on the dialogue (its peeking strip) minimizes the box. */}
      <div className="record-scroll" onClickCapture={expanded ? (e) => (e.stopPropagation(), e.preventDefault(), setExpanded(false)) : undefined}>
        {children}
      </div>
      <aside
        className="reading"
        data-state={expanded ? "expanded" : "minimized"}
        role="button"
        aria-expanded={expanded}
        aria-live="polite"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
        {...hint("reading", { focusable: true })}
      >
        <div className="reading-head">{w("screen.reading.title")}</div>
        {box}
      </aside>
    </div>
  );
}

// ---- The input box -------------------------------------------------------------------------------------
//
// Buttons by job (TD v0.40): Speak is the one filled button, active only with something to say; Do takes
// its place for a command; Pass is outlined; @ and / are small icons inside the box. The menus open and
// close with their character (input.ts).

/**
 * The input box. While a past stage is open (`past`, Interface v0.5), Speak/Do and Pass give way to one
 * Return to current stage button in the same spot, and Enter does the same: the draft, a handed conclusion,
 * and Do's highlight all stay as they were, and nothing is sent until Speak or Do back in the current stage.
 */
function InputBox({ me, v, send, closed, fill, past = false, onReturn = () => {} }: { me: string; v: View; send: Send; closed: boolean; fill: BoxFill | null; past?: boolean; onReturn?: () => void }) {
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
  /**
   * While the box holds a note's conclusion (Interface v0.4): the unsent message it set aside, if any. It
   * comes back once the box is sent or cleared. A second conclusion replaces the first and keeps the message.
   */
  const [handed, setHanded] = useState<{ setAside: string | null } | null>(null);
  /** Do highlighted for a handed conclusion, until Do runs it or the box stops being a command. */
  const [doLit, setDoLit] = useState(false);
  /** The last hand-off taken, so a remount doesn't take it again. */
  const filled = useRef(fill?.seq ?? 0);
  const caretToEnd = useRef(false);
  useEffect(() => {
    if (!fill || fill.seq === filled.current) return;
    filled.current = fill.seq;
    setHanded(handed ?? { setAside: text.trim() ? text : null });
    setText(fill.text);
    setForced(false);
    setDismissed(null);
    setDoLit(true);
    caretToEnd.current = true;
  }, [fill?.seq]);
  // Focus the box with the cursor at the end, once the handed text is in it, so the player can edit it.
  useEffect(() => {
    if (!caretToEnd.current || !area.current) return;
    caretToEnd.current = false;
    const end = area.current.value.length;
    area.current.focus();
    area.current.setSelectionRange(end, end);
  });
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
    // Clearing a handed conclusion without running it brings the set-aside message back.
    if (handed && !next.trim()) {
      next = handed.setAside ?? "";
      setHanded(null);
    }
    if (!isCommand(next)) setDoLit(false);
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
    if (command) {
      act({ type: "command", text: text.trim() });
      setDoLit(false);
    } else if (canSpeak(text)) {
      act({ type: "say", text });
      if (!req) setHeld(text);
    } else return;
    change("");
  };
  const focus = () => area.current?.focus();
  // From a past stage the box stays open, with the draft, even while a decision card waits in the current one.
  if (closed && !past)
    return (
      <div className="input closed">
        <span className="muted">{w("screen.input.closed")}</span>
      </div>
    );
  const refusal = v.refusal && v.refusal.seq > actedAt ? v.refusal.reason : null;
  /** The game waits for the player (a request is open): from a past stage, Return beckons and the placeholder says so. */
  const beckon = past && !!v.pending;
  // Interface v0.5: the placeholder carries the example, with an @ and a /, using only commands allowed now.
  const example = placeholderExample(placeholderExamples(), v.commands, talkingWith(v, me) ?? present[0] ?? null, v.spoken);
  return (
    <div className={`input${past ? " past" : ""}`} ref={box}>
      {/* The prompt's line is always laid out, so the box keeps its height as it comes and goes. */}
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
            placeholder={past ? w(beckon ? "screen.input.pastWaiting" : "screen.input.pastPlaceholder") : (example ?? w("screen.input.placeholder"))}
            onChange={(e) => change(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape" && menuOpen) {
                e.preventDefault();
                dismiss();
              } else if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (past) onReturn();
                else submit();
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
          {past ? (
            <button className={`primary return${beckon ? " beckon" : ""}`} onClick={onReturn} {...hint("return")}>
              {w("screen.input.return")}
            </button>
          ) : (
            <>
              {command ? (
                <button className={`do${doLit ? " lit" : ""}`} onClick={submit} disabled={!canDo(text)} {...hint("do")}>
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
            </>
          )}
        </div>
      </div>
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

/** One act's row on the midnight card: its kind, and a living guest other than the player. */
function ActRow({ a, words, guests, onChange }: { a: { type: string; target: string }; words: string[]; guests: string[]; onChange: (a: Partial<{ type: string; target: string }>) => void }) {
  return (
    <>
      <select value={a.type} onChange={(e) => onChange({ type: e.target.value })}>
        {words.map((x) => (
          <option key={x} value={x}>
            {w(`screen.midnight.acts.${x}`)}
          </option>
        ))}
      </select>
      <GuestPicker guests={guests} value={a.target} onChange={(t) => onChange({ target: t })} label={w("screen.midnight.pick")} />
    </>
  );
}

function MidnightCard({ req, send, me }: { req: Request; send: Send; me: string }) {
  const o = req.options as { guests: string[]; acts: Record<string, string>; count: number[]; extra?: boolean };
  const hint = useHint();
  const most = Math.max(...o.count);
  const words = Object.keys(o.acts);
  const guests = o.guests.filter((g) => g !== me);
  const [acts, setActs] = useState<{ type: string; target: string }[]>(() => Array.from({ length: most }, () => ({ type: words[0]!, target: "" })));
  // TD v0.47: the extra act the errand earned, its own optional row. Block 9e's checks: a different guest
  // from every other act, and never the player (so no guarding yourself); the game checks them again.
  const [extra, setExtra] = useState<{ type: string; target: string }>(() => ({ type: words[0]!, target: "" }));
  const chosen = acts.filter((a) => a.target);
  const extraOk = !o.extra || !extra.target || !chosen.some((a) => a.target === extra.target);
  const ok = o.count.includes(chosen.length) && extraOk;
  const set = (i: number, a: Partial<{ type: string; target: string }>) => setActs(acts.map((x, j) => (j === i ? { ...x, ...a } : x)));
  const value = o.extra ? { acts: chosen, extra: extra.target ? extra : null } : { acts: chosen };
  return (
    <div className="card">
      <h3 {...hint("midnight", { focusable: true })}>{w("screen.midnight.title")}</h3>
      <p className="muted">{most > 1 ? w("screen.midnight.introTwo") : w("screen.midnight.intro")}</p>
      {acts.map((a, i) => (
        <div className="act" key={i}>
          <ActRow a={a} words={words} guests={guests} onChange={(x) => set(i, x)} />
        </div>
      ))}
      {o.extra && (
        <div className="act-extra" {...hint("midnightExtra", { focusable: true })}>
          <div className="label">{w("screen.midnight.extra")}</div>
          <div className="act">
            <ActRow a={extra} words={words} guests={guests} onChange={(x) => setExtra({ ...extra, ...x })} />
          </div>
          <p className={extraOk ? "muted" : "notice"}>{w(extraOk ? "screen.midnight.extraNote" : "screen.midnight.extraSame")}</p>
        </div>
      )}
      <button className="primary" disabled={!ok} onClick={() => send({ type: "choice", request: req.id, value })} {...hint("confirm")}>
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
