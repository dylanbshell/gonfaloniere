// The player screen (TD v0.39–v0.43, The screen): start screen, the game (your character, the conversation,
// who you're looking at), card decks, the web viewer with notes, Il Notaio's hint, decision cards, the
// death banner, and the end screen, with hover explanations throughout. First-hand only: everything comes
// from the player's sheet, their own log, and public content. Words come from the setting pack (words.ts); every look comes from theme.css's tokens
// (app.css uses only those).

import { Component, Fragment, createContext, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { connect, type Ev } from "./connection.ts";
import { COMMAND, MENTION, canDo, canSpeak, isCommand, matchCommands, matchGuests, openMenu, withMention, type Trigger } from "./input.ts";
import { FACTION_LINE, NO_SELECTION, paragraphPause, proseBlocks, roman, appearsIn, briefingCards, chatGuest, cityList, commandMenu, curve, derive, earlierThisStage, errandCardAt, errandDeadline, errandLine, errandTask, factLink, factionArcs, heardAndSaw, glossaryList, hintMoment, lineParts, midnightLine, noteGroups, ownPlace, payrollSize, placeHeading, playerBriefing, placeList, placeholderExample, preview, readingFor, recordUpTo, refusalWhy, roomOf, rulesLink, runFrom, summaryFor, playerRules, rulesCards, rulesSectionFor, sameGuests, selectBack, selectInChat, selectInWeb, selectLore, stageRuns, stagesWith, talkingWith, trackMarks, webLayout, webLines, webNames, NODE_RADIUS, type Card, type FactLink, type Line, type GuardedReading, type LoreEntry, type Note, type NotaioItem, type Place, type Request, type Run, type Segment, type SharedSelection, type Sheet, type State, type View } from "./model.ts";
import { allCommands, cityGuests, factionWins, getInfo, guest, guestDescription, names, narrator, notaioHint, packValue, placeDescription, placeholderExamples, setInfo, stageDescription, tc, w, wt, type GlossEntry, type StartInfo } from "./words.ts";

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
  return (
    <HintLayer>
      <NarrowNote>{!game ? <Opening onStart={(me, ws) => setGame({ me, ws })} /> : <Game me={game.me} url={game.ws} />}</NarrowNote>
    </HintLayer>
  );
}

// ---- Screen sizes (Interface v0.17) --------------------------------------------------------------------
//
// The screen is laid out for a laptop, a desktop, or a tablet held sideways. Things that fold themselves when
// there's no room (the right panel, Il Notaio's hint, the web's key) come back on their own when there is,
// unless the player has folded or opened them, which takes them over. The limits are theme tokens.

/**
 * Work done on a resize or a scroll, at most once a frame (Interface v0.19, Notes for the Build: the demo jittered
 * while resizing in Safari until it did). `run` asks for it; however often it's asked within a frame, it runs once,
 * at the next frame. Without frames (on the server), it runs at once.
 */
export function perFrame(fn: () => void): { run: () => void; cancel: () => void } {
  let id = 0;
  if (typeof requestAnimationFrame === "undefined") return { run: fn, cancel: () => {} };
  return {
    run: () => {
      if (id) return;
      id = requestAnimationFrame(() => {
        id = 0;
        fn();
      });
    },
    cancel: () => {
      if (id) cancelAnimationFrame(id);
      id = 0;
    },
  };
}

/** The window's width, kept up to date (once a frame while it's resized); null on the server. */
function useWindowWidth(): number | null {
  const [width, setWidth] = useState<number | null>(() => (typeof window === "undefined" ? null : window.innerWidth));
  useEffect(() => {
    const on = perFrame(() => setWidth(window.innerWidth));
    setWidth(window.innerWidth);
    window.addEventListener("resize", on.run);
    return () => {
      window.removeEventListener("resize", on.run);
      on.cancel();
    };
  }, []);
  return width;
}

/** An element's own width, kept up to date as its space changes (once a frame); null until it's laid out (and on the server). */
function useOwnWidth(ref: RefObject<Element | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.getBoundingClientRect().width);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const on = perFrame(measure);
    const watch = new ResizeObserver(on.run);
    watch.observe(el);
    return () => {
      watch.disconnect();
      on.cancel();
    };
  }, []);
  return width;
}

/**
 * Open or folded, for something that folds itself: it follows `room` (whether there's room for it now) until
 * the player folds or opens it themselves, which takes it over for the visit.
 */
function useSelfFold(room: boolean): { open: boolean; chosen: boolean; set: (open: boolean) => void } {
  const [chosen, setChosen] = useState<boolean | null>(null);
  return { open: chosen ?? room, chosen: chosen !== null, set: setChosen };
}

const NARROW_KEY = "player-screen.narrow-ok";

/**
 * Phones are left out for now (Interface v0.17, Screen Sizes): in a window narrower than the phone limit, a
 * note stands in for the screen, which is set aside while it shows, so the page fits the phone. Continue
 * Anyway holds for the visit.
 */
function NarrowNote({ children }: { children: ReactNode }) {
  const width = useWindowWidth();
  const [go, setGo] = useState(() => {
    try {
      return globalThis.sessionStorage?.getItem(NARROW_KEY) === "yes";
    } catch {
      return false;
    }
  });
  if (go || width === null || width >= themeMs("--break-phone", 760)) return <>{children}</>;
  const on = () => {
    setGo(true);
    try {
      sessionStorage.setItem(NARROW_KEY, "yes");
    } catch {
      // Blocked storage: the choice lasts until the page closes.
    }
  };
  return (
    <main className="narrow-note" role="alertdialog" aria-labelledby="narrow-title">
      <h1 id="narrow-title">{w("screen.narrow.title")}</h1>
      <p>{w("screen.narrow.text")}</p>
      <button className="primary narrow-go" onClick={on}>
        {w("screen.narrow.go")}
      </button>
    </main>
  );
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
  /**
   * `always`: a hover about the world rather than a control's explanation (a place's description, a glossary
   * word, Il Notaio's name): shown even with the explanations off, as a light card apart from the dark
   * explanations (Interface v0.16, Hover explanations).
   */
  show: (text: string, el: Element, always?: boolean) => void;
  hide: () => void;
}
const HintsContext = createContext<Hints>({ on: true, toggle: () => {}, show: () => {}, hide: () => {} });

function HintLayer({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(readHints);
  const [tip, setTip] = useState<{ text: string; el: Element; rect: DOMRect; world: boolean } | null>(null);
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
    const moved = perFrame(check);
    document.addEventListener("scroll", moved.run, true);
    window.addEventListener("resize", moved.run);
    return () => {
      watch.disconnect();
      document.removeEventListener("scroll", moved.run, true);
      window.removeEventListener("resize", moved.run);
      moved.cancel();
    };
  }, [tip]);
  // Interface v0.17: on a touchscreen, which has no hover, a long press shows a thing's explanation without
  // pressing it; a tap still acts at once. The explanation stays until the next touch.
  const onRef = useRef(on);
  onRef.current = on;
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let shown = false;
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const start = (e: TouchEvent) => {
      cancel();
      if (shown) setTip(null);
      shown = false;
      const el = (e.target as Element | null)?.closest?.("[data-hint], [data-gloss], [data-narrator]");
      const text = el?.getAttribute("aria-description");
      if (!el || !text) return;
      const world = !el.hasAttribute("data-hint");
      if (!world && !onRef.current) return;
      timer = setTimeout(() => {
        timer = null;
        shown = true;
        setTip({ text, el, rect: el.getBoundingClientRect(), world });
      }, themeMs("--long-press", 500));
    };
    // The press that showed an explanation doesn't press the thing: its click, and the menu a long press can call up, are dropped.
    const swallow = (e: Event) => {
      if (!shown) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "click") shown = false;
    };
    document.addEventListener("touchstart", start, { passive: true });
    for (const x of ["touchmove", "touchcancel"]) document.addEventListener(x, cancel, { passive: true });
    document.addEventListener("touchend", cancel);
    document.addEventListener("click", swallow, true);
    document.addEventListener("contextmenu", swallow, true);
    return () => {
      cancel();
      document.removeEventListener("touchstart", start);
      for (const x of ["touchmove", "touchcancel"]) document.removeEventListener(x, cancel);
      document.removeEventListener("touchend", cancel);
      document.removeEventListener("click", swallow, true);
      document.removeEventListener("contextmenu", swallow, true);
    };
  }, []);
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
    show: (text, el, always) => {
      if (on || always) setTip({ text, el, rect: el.getBoundingClientRect(), world: !!always });
    },
    hide: () => setTip(null),
  };
  return (
    <HintsContext.Provider value={hints}>
      {children}
      {tip && (
        <div ref={ref} className={`tip${tip.world ? " world" : ""}${pos ? "" : " measuring"}`} role="tooltip" style={pos ? { top: pos.top, left: pos.left } : undefined}>
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

class Boundary extends Component<{ panel: string; fallback?: (notice: ReactNode) => ReactNode; children: ReactNode }, { failed: boolean; error: string }> {
  override state = { failed: false, error: "" };
  static getDerivedStateFromError(e: unknown) {
    return { failed: true, error: e instanceof Error ? e.message : String(e) };
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
    // Interface v0.19, Notes for the Build: a failed panel says what failed, small, under the notice, with Try Again,
    // which starts the panel again.
    const notice = (
      <div className="notice danger panel-error" role="alert" data-panel-error={this.props.panel}>
        <div>{w("screen.panelError")}</div>
        <div className="panel-error-detail">{this.state.error}</div>
        <PanelRetry onRetry={() => this.setState({ failed: false, error: "" })} />
      </div>
    );
    return this.props.fallback ? this.props.fallback(notice) : notice;
  }
}

/** A failed panel's Try Again: starts it again. */
function PanelRetry({ onRetry }: { onRetry: () => void }) {
  const hint = useHint();
  return (
    <button className="secondary small panel-retry" onClick={onRetry} {...hint("panelRetry")}>
      {w("screen.panelRetry")}
    </button>
  );
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

const round2 = (x: number) => Math.round(x * 100) / 100;

/** A timing from theme.css, in milliseconds; or any other plain number or pixel length there (a limit, a share, a count). */
function themeMs(token: string, fallback: number): number {
  if (typeof document === "undefined") return fallback;
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(token));
  return Number.isFinite(v) ? v : fallback;
}

/** Whether the player's system asks for reduced motion, kept up to date. */
function useReducedMotion(): boolean {
  const query = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [reduced, setReduced] = useState(query);
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const m = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

// ---- The opening (Interface v0.7, The Opening; v0.16; v0.19) ---------------------------------------------
//
// It replaces the start screen. Il Notaio's name heads the page, glossed, before he writes; then he writes the
// story a paragraph at a time, each fading in whole and waiting about what one of its sentences would take to
// read before the next. The page doesn't follow him: a paragraph that wouldn't fit on the screen waits until the
// reader scrolls down to make room, and after the first screen they come as soon as there's room. The first
// click brings the next paragraph at once; the second shows the whole story, with More in Continue's place until
// the page reaches its end; once it's all shown, a click or More glides to the end, where Continue sits. Only
// Continue moves on: the page glides on until his story is off the top and the choice sits in the middle of the
// screen, fading in once it's there. Docked, the choice shrinks as the reader scrolls back up to reread, and the
// page rests at one of two stops, the choice or the story's end, with a wheel meeting resistance between them.
// With reduced motion, paragraphs appear whole and the glides jump. Every timing and size is a theme token.

/** A pixel length from theme.css (a plain number in px). */
const themePx = themeMs;

/** Ease in and out: slow to start and to stop. */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Ease out: it starts at speed and slows to a stop. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** How long a glide takes for a distance: from `least` for nothing to `most` for two screens or more. */
const glideMs = (distance: number, least: number, most: number) => least + (most - least) * Math.min(1, Math.abs(distance) / (2 * Math.max(1, window.innerHeight)));

/** The page's end: how far the window can scroll. */
const pageEnd = () => Math.max(0, (document.scrollingElement ?? document.documentElement).scrollHeight - window.innerHeight);

/**
 * One glide of the page (Interface v0.19): an eased scroll to `to()`, re-read each frame (the page's height can
 * change as it goes), over `ms`. A wheel, a touch, a key, or a press stops it at once, unless `keep` says the
 * caller handles the wheel itself. With reduced motion it jumps. Returns a stop.
 */
function glidePage(to: () => number, ms: number, ease: (t: number) => number, reduced: boolean, onDone: (stopped: boolean) => void, keep = false): () => void {
  if (reduced || typeof requestAnimationFrame === "undefined") {
    window.scrollTo(0, to());
    onDone(false);
    return () => {};
  }
  const from = window.scrollY;
  const start = performance.now();
  let frame = 0;
  let over = false;
  const end = (stopped: boolean) => {
    if (over) return;
    over = true;
    cancelAnimationFrame(frame);
    for (const e of keep ? ["touchstart", "keydown", "pointerdown"] : ["wheel", "touchstart", "keydown", "pointerdown"]) window.removeEventListener(e, interrupt, true);
    onDone(stopped);
  };
  const interrupt = () => end(true);
  for (const e of keep ? ["touchstart", "keydown", "pointerdown"] : ["wheel", "touchstart", "keydown", "pointerdown"]) window.addEventListener(e, interrupt, { capture: true, passive: true });
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / Math.max(1, ms));
    window.scrollTo(0, from + (to() - from) * ease(t));
    if (t >= 1) end(false);
    else frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => end(true);
}

/** Whether a click landed on a control (a button, a card), which the story's own click leaves alone. */
const onControl = (t: EventTarget | null) => t instanceof Element && !!t.closest("button, a, .start-card");

export function Opening({ onStart, written = false, atChoice = false }: { onStart: (me: string, ws: string) => void; /** The story already written out (as after Skip), for the tests. */ written?: boolean; /** Moved on to the choice from the start, for the tests. */ atChoice?: boolean }) {
  const info = getInfo();
  const paragraphs = narrator.paragraphs();
  const total = paragraphs.length;
  const reduced = useReducedMotion();
  /** How many paragraphs are on the page; before the first, his name alone, for a moment. */
  const [shown, setShown] = useState(written ? total : 0);
  const [begun, setBegun] = useState(written);
  /** The next paragraph's reading time is over: it comes as soon as it fits. */
  const [due, setDue] = useState(false);
  /** After the first screen (a paragraph has had to wait, or the reader scrolled down): no more reading times. */
  const [quick, setQuick] = useState(false);
  /** The next paragraph would fit on the screen where it goes, and how much room it needs below the story. */
  const [fit, setFit] = useState<{ fits: boolean; room: number }>({ fits: true, room: 0 });
  /** Clicks on the story: the first brings the next paragraph, the second everything. */
  const [clicks, setClicks] = useState(0);
  /** The second click showed everything: Continue waits, hidden, until the page reaches its end. */
  const [held, setHeld] = useState(false);
  /** The last paragraph's reading time is over. */
  const [lastDue, setLastDue] = useState(written);
  /** The reader has reached the page's end (by scrolling, More, or a click). */
  const [atEnd, setAtEnd] = useState(false);
  /** Continue has come (it stays). */
  const [continued, setContinued] = useState(written);
  /** Moving on: the choice rising with the page, unseen, then arrived in the middle of the screen. */
  const [phase, setPhase] = useState<"story" | "rising" | "arrived">(atChoice ? "arrived" : "story");
  /** The room kept above Continue for a reader scrolled into the story's room as it finished. */
  const [keep, setKeep] = useState(0);
  /** The room above and below the choice, so it can sit in the middle of the screen with the story off the top. */
  const [around, setAround] = useState<{ above: number; below: number } | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const finished = shown >= total;
  const page = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLElement>(null);
  const story = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLParagraphElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const roomAbove = useRef<HTMLDivElement>(null);
  const choice = useRef<HTMLElement>(null);
  /** The choice's full height, measured unshrunk. */
  const full = useRef(0);
  const lastY = useRef(0);
  const stopGlide = useRef<(() => void) | null>(null);
  const glide = (to: () => number, ms: number, ease: (t: number) => number, onDone: (stopped: boolean) => void = () => {}, keepWheel = false) => {
    stopGlide.current?.();
    stopGlide.current = glidePage(to, ms, ease, reduced, (stopped) => {
      stopGlide.current = null;
      onDone(stopped);
    }, keepWheel);
  };
  useEffect(() => () => stopGlide.current?.(), []);

  // His name alone for a moment; then the first paragraph is due.
  useEffect(() => {
    if (begun) return;
    const t = setTimeout(() => (setBegun(true), setDue(true)), themeMs("--opening-pause", 700));
    return () => clearTimeout(t);
  }, [begun]);
  // Each paragraph waits about what one of its sentences would take to read before the next is due (none after the first screen).
  useEffect(() => {
    if (!begun || finished || due || shown === 0) return;
    if (quick || reduced) return setDue(true);
    const t = setTimeout(() => setDue(true), paragraphPause(paragraphs[shown - 1] ?? "", themeMs("--opening-char", 45), themeMs("--opening-least", 1200)));
    return () => clearTimeout(t);
  }, [begun, shown, due, quick, reduced, finished]);
  // After the last paragraph, its reading time (2.5s at least), then Continue.
  useEffect(() => {
    if (!finished || lastDue) return;
    const t = setTimeout(() => setLastDue(true), Math.max(themeMs("--opening-last", 2500), paragraphPause(paragraphs[total - 1] ?? "", themeMs("--opening-char", 45), themeMs("--opening-least", 1200))));
    return () => clearTimeout(t);
  }, [finished, lastDue]);
  /** Where the next paragraph would go: whether it ends far enough above the screen's bottom (or, taller than the screen, starts in its top quarter), and the room it needs below the story. */
  const measure = () => {
    const g = ghost.current;
    if (!g) return setFit((f) => (f.fits && f.room === 0 ? f : { fits: true, room: 0 }));
    const r = g.getBoundingClientRect();
    const H = window.innerHeight;
    const clear = themePx("--opening-fit", 16);
    const fits = r.bottom <= H - clear || (r.height > H - clear && r.top <= H / 4);
    const room = Math.ceil(r.height + themePx("--opening-room-extra", 32));
    setFit((f) => (f.fits === fits && f.room === room ? f : { fits, room }));
  };
  useLayoutEffect(measure, [shown, total]);
  // The next paragraph comes when it's due and fits; one that's due but doesn't fit waits, and the page is past its first screen.
  useEffect(() => {
    if (!due || finished || phase !== "story") return;
    if (fit.fits) {
      setShown((n) => Math.min(total, n + 1));
      setDue(false);
    } else setQuick(true);
  }, [due, fit, finished, phase]);
  // Scrolling and resizing, once a frame: the next paragraph may fit now; a scroll down ends the first screen; the page's end; the title's fade.
  useEffect(() => {
    if (phase !== "story") return;
    const on = perFrame(() => {
      const y = window.scrollY;
      if (y > lastY.current + 1 && !finished) setQuick(true);
      lastY.current = y;
      head.current?.style.setProperty("--head-fade", String(Math.max(0, Math.min(1, y / themePx("--opening-head-fade", 24)))));
      const end = pageEnd();
      if (finished && (end > 1 ? y >= end - 2 : held)) setAtEnd(true);
      measure();
    });
    window.addEventListener("scroll", on.run, { passive: true });
    window.addEventListener("resize", on.run);
    on.run();
    return () => {
      window.removeEventListener("scroll", on.run);
      window.removeEventListener("resize", on.run);
      on.cancel();
    };
  }, [phase, finished, held, shown]);
  // Continue comes after the last paragraph's reading time, or as soon as the reader reaches the page's end; held by a second click until the end.
  useEffect(() => {
    if (finished && !continued && (atEnd || (lastDue && !held))) setContinued(true);
  }, [finished, atEnd, lastDue, held, continued]);
  // It takes the focus when it comes, so Enter or Space presses it.
  useEffect(() => {
    if (continued && phase === "story") continueButton.current?.focus({ preventScroll: true });
  }, [continued]);
  // As the story finishes, the room below it is no longer the next paragraph's: what a reader scrolled into is kept, above Continue, so the page doesn't shrink under them.
  useLayoutEffect(() => {
    if (!finished || written) return;
    const s = story.current;
    const b = bar.current;
    if (!s || !b) return;
    const y = lastY.current;
    const storyEnd = s.getBoundingClientRect().bottom + window.scrollY;
    setKeep(Math.max(themePx("--opening-keep-least", 16), Math.round(y + window.innerHeight - storyEnd - b.offsetHeight)));
    window.scrollTo(0, y);
  }, [finished]);
  // And it shrinks as they scroll back up, so Continue stays at the screen's foot rather than under the story's end.
  useEffect(() => {
    if (!finished || phase !== "story") return;
    const on = perFrame(() => {
      const s = story.current;
      const b = bar.current;
      if (!s || !b) return;
      const storyEnd = s.getBoundingClientRect().bottom + window.scrollY;
      setKeep((k) => Math.max(themePx("--opening-keep-least", 16), Math.min(k, Math.round(window.scrollY + window.innerHeight - storyEnd - b.offsetHeight))));
    });
    window.addEventListener("scroll", on.run, { passive: true });
    return () => {
      window.removeEventListener("scroll", on.run);
      on.cancel();
    };
  }, [finished, phase]);

  /** To the page's end, Continue not moving: a short glide. */
  const toEnd = () => glide(pageEnd, glideMs(pageEnd() - window.scrollY, themeMs("--opening-end-least", 400), themeMs("--opening-end-most", 750)), easeInOut, () => setAtEnd(true));
  /** A click on the story: the next paragraph; then everything; once it's all shown, the page's end. */
  const click = (e: { target: EventTarget | null }) => {
    if (phase !== "story" || onControl(e.target)) return;
    if (finished) return toEnd();
    const n = clicks + 1;
    setClicks(n);
    setDue(false);
    if (n === 1) setShown((s) => Math.min(total, s + 1));
    else {
      setShown(total);
      setHeld(true);
    }
  };
  /** More: the rest of the story at once, and down to its end, where Continue comes. Not a click on the story. */
  const more = () => {
    setShown(total);
    setHeld(true);
    requestAnimationFrame(toEnd);
  };
  /** Skip: everything at once, with Continue. */
  const skip = () => {
    setShown(total);
    setLastDue(true);
    setHeld(false);
  };
  /** Continue: the choice comes, and the page glides on until the story is off the top and the choice is in the middle of the screen. */
  const onward = () => {
    stopGlide.current?.();
    setPhase("rising");
  };
  // The choice is laid out unseen: its height measured unshrunk sizes the room above and below it, then the page glides there.
  useLayoutEffect(() => {
    if (phase !== "rising") return;
    const c = choice.current;
    if (!c) return;
    c.style.setProperty("--fold", "0");
    full.current = c.getBoundingClientRect().height;
    const room = Math.max(0, Math.round((window.innerHeight - full.current) / 2));
    setAround({ above: room, below: room });
  }, [phase]);
  useEffect(() => {
    if (phase !== "rising" || !around) return;
    const target = () => {
      const c = choice.current;
      return c ? Math.min(pageEnd(), c.getBoundingClientRect().top + window.scrollY - around.above) : pageEnd();
    };
    glide(target, glideMs(target() - window.scrollY, themeMs("--opening-glide-least", 1800), themeMs("--opening-glide-most", 3200)), easeInOut, () => setPhase("arrived"));
  }, [phase, around]);
  // Docked, the choice shrinks as the reader scrolls back up toward the story, measured from where it would sit unstuck at its full height.
  const stops = () => {
    const a = roomAbove.current;
    const H = window.innerHeight;
    const naturalBottom = a ? a.getBoundingClientRect().bottom + window.scrollY + full.current : 0;
    const dock = naturalBottom - H;
    return { choice: pageEnd(), story: Math.max(0, dock - H * themeMs("--choice-shrink-share", 0.5)), dock };
  };
  useEffect(() => {
    if (phase !== "arrived") return;
    const c = choice.current;
    const fold = () => {
      if (!c) return;
      const s = stops();
      const p = Math.max(0, Math.min(1, (s.dock - window.scrollY) / Math.max(1, s.dock - s.story)));
      const v = String(Math.round(p * 1000) / 1000);
      if (c.style.getPropertyValue("--fold") !== v) c.style.setProperty("--fold", v);
    };
    // On a resize its full height is measured again, unshrunk.
    const remeasure = () => {
      if (!c) return;
      const was = c.style.getPropertyValue("--fold");
      c.style.setProperty("--fold", "0");
      full.current = c.getBoundingClientRect().height;
      c.style.setProperty("--fold", was);
      fold();
    };
    const onScroll = perFrame(fold);
    const onResize = perFrame(remeasure);
    window.addEventListener("scroll", onScroll.run, { passive: true });
    window.addEventListener("resize", onResize.run);
    fold();
    return () => {
      window.removeEventListener("scroll", onScroll.run);
      window.removeEventListener("resize", onResize.run);
      onScroll.cancel();
      onResize.cancel();
    };
  }, [phase]);
  // Two stops once the choice has come up: the choice, and the end of his story. A wheel or trackpad moving away from
  // either meets resistance that builds toward a decisive point; short of it the page settles back, past it the page
  // breaks free and carries on to the other stop. The page never rests between them.
  useEffect(() => {
    if (phase !== "arrived") return;
    let carrying: number | null = null;
    let settle: ReturnType<typeof setTimeout> | null = null;
    let pressed = false;
    const point = () => Math.max(themePx("--opening-point-least", 80), Math.min(themePx("--opening-point-most", 120), window.innerHeight * themeMs("--opening-point-share", 0.12)));
    const give = (d: number) => themeMs("--opening-give-stop", 0.85) - (themeMs("--opening-give-stop", 0.85) - themeMs("--opening-give-point", 0.35)) * Math.min(1, d / point());
    const carry = (dir: 1 | -1) => {
      carrying = dir;
      const to = () => (dir > 0 ? stops().choice : stops().story);
      glide(to, glideMs(to() - window.scrollY, themeMs("--opening-carry-least", 1000), themeMs("--opening-carry-most", 1800)), easeOut, () => (carrying = null), true);
    };
    const back = (to: number) => glide(() => to, glideMs(to - window.scrollY, themeMs("--opening-settle-least", 550), themeMs("--opening-settle-most", 1100)), easeInOut);
    /** Left between or short of a point (a scrollbar, a key, a wheel that stopped): the page goes to the stop it belongs to. */
    const rest = () => {
      if (pressed || carrying !== null || stopGlide.current) return;
      const s = stops();
      const y = window.scrollY;
      if (y < s.story - 1) return;
      const near = Math.abs(y - s.choice) <= Math.abs(y - s.story) ? s.choice : s.story;
      if (Math.abs(y - near) > 1) back(near);
    };
    const quiet = () => {
      if (settle) clearTimeout(settle);
      settle = setTimeout(rest, themeMs("--opening-quiet", 150));
    };
    const wheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      quiet();
      if (carrying !== null) {
        // While a carry runs, more the same way (or a stray nudge the other way) is absorbed; a real scroll back stops it.
        if (Math.sign(dy) === carrying || Math.abs(dy) < themePx("--opening-nudge", 8)) return e.preventDefault();
        stopGlide.current?.();
        carrying = null;
      }
      const s = stops();
      const y = window.scrollY;
      // Reading the story above its end: free, but a step that would pass its end stops there.
      if (y < s.story - 1) {
        if (y + dy > s.story) {
          e.preventDefault();
          window.scrollTo(0, s.story);
        }
        return;
      }
      e.preventDefault();
      stopGlide.current?.();
      const p = point();
      if (dy < 0) {
        if (y > s.choice - p) {
          // Up, away from the choice: resistance building toward the point; past it, the page carries on to the story's end.
          const next = y + dy * give(s.choice - y);
          if (s.choice - next >= p) carry(-1);
          else window.scrollTo(0, next);
        } else if (y > s.story + p) carry(-1);
        // Toward the story's end and on up into the story: freely.
        else window.scrollTo(0, y + dy);
      } else if (dy > 0) {
        if (y < s.story + p) {
          // Down, away from the story's end: the same resistance; past the point, on to the choice.
          const next = y + dy * give(y - s.story);
          if (next - s.story >= p) carry(1);
          else window.scrollTo(0, next);
        } else if (y < s.choice - p) carry(1);
        else window.scrollTo(0, Math.min(s.choice, y + dy));
      }
    };
    const down = () => (pressed = true);
    const up = () => {
      pressed = false;
      quiet();
    };
    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("scroll", quiet, { passive: true });
    for (const x of ["pointerdown", "touchstart"]) window.addEventListener(x, down, { passive: true });
    for (const x of ["pointerup", "pointercancel", "touchend", "touchcancel"]) window.addEventListener(x, up, { passive: true });
    return () => {
      if (settle) clearTimeout(settle);
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("scroll", quiet);
      for (const x of ["pointerdown", "touchstart"]) window.removeEventListener(x, down);
      for (const x of ["pointerup", "pointercancel", "touchend", "touchcancel"]) window.removeEventListener(x, up);
    };
  }, [phase]);

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
  const showMore = phase === "story" && !continued && ((held && !atEnd) || (shown > 0 && !finished && !fit.fits));
  const card = (name: string, locked: boolean) => {
    const g = guest(name);
    const description = guestDescription(name);
    return (
      <div className={`start-card${locked ? " locked" : ""}`} key={name} data-guest={name} aria-disabled={locked || undefined}>
        <div className="who column">
          <Portrait name={name} large />
          <div className="name">{name}</div>
          {/* Interface v0.16: no separate faction line; the subtitle opens with the faction. */}
          <div className="muted subtitle">{g?.subtitle}</div>
        </div>
        {/* Interface v0.19: a short description of the character, from the setting pack; left out where it has none. */}
        {description && <p className="choice-desc">{description}</p>}
        {locked ? (
          <div className="locked-label">{w("screen.opening.fullGameOnly")}</div>
        ) : (
          <button className="primary" disabled={!!starting} onClick={() => void start(name)}>
            {starting === name ? w("screen.opening.starting") : w("screen.opening.play", { name })}
          </button>
        )}
      </div>
    );
  };
  const classes = ["opening", finished && "written", phase !== "story" && "onward"].filter(Boolean).join(" ");
  // Interface v0.19: no hover explanations on the opening, so nothing here carries one.
  return (
    <div ref={page} className={classes} onClick={click}>
      {/* Interface v0.11: his name heads the page, glossed, and stays at the top while he writes, the story sliding under it with a fade. */}
      <header ref={head} className="opening-head">
        <h1 className="opening-name">
          <NarratorName plain />
        </h1>
        <div className="opening-gloss">{narrator.gloss()}</div>
      </header>
      <div ref={story} className="opening-story" aria-live="polite">
        {paragraphs.slice(0, shown).map((p, i) => (
          <p key={i} className={`opening-para${i === shown - 1 && !written ? " fresh" : ""}`} data-state="done">
            {p}
          </p>
        ))}
        {/* The next paragraph, unseen, where it would go: whether it fits, and the room it needs. */}
        {begun && !finished && (
          <p ref={ghost} className="opening-ghost" aria-hidden="true">
            {paragraphs[shown]}
          </p>
        )}
      </div>
      {/* While he writes, just the room the next paragraph needs below the story, so the reader can scroll down to make room for it. */}
      {!finished && <div className="opening-room" style={{ height: fit.room }} />}
      {finished && phase === "story" && (
        <div ref={bar} className={`opening-continue-bar${continued ? " shown" : ""}`} style={{ marginTop: keep }}>
          <button ref={continueButton} className="primary opening-continue" tabIndex={continued ? 0 : -1} onClick={onward}>
            {w("screen.opening.continue")}
          </button>
        </div>
      )}
      {showMore && (
        <button className="opening-more" onClick={(e) => (e.stopPropagation(), more())}>
          {w("screen.opening.more")}
        </button>
      )}
      {!finished && (
        <button className="opening-skip" onClick={(e) => (e.stopPropagation(), skip())}>
          {w("screen.opening.skip")}
        </button>
      )}
      {phase !== "story" && (
        <>
          <div ref={roomAbove} className="opening-choice-above" style={{ height: around?.above ?? 0 }} />
          <section ref={choice} className={`opening-choice${phase === "arrived" ? " arrived docked" : " rising"}`} aria-label={w("screen.opening.choose")}>
            <h2 className="choice-title">{w("screen.opening.choose")}</h2>
            <div className="cards choice-cards">
              {info.playable.map((p) => card(p.name, false))}
              {/* Interface v0.16: the playable characters not in this game show greyed out after the playable ones, so the player knows there's more. */}
              {(info.fullGameOnly ?? []).map((p) => card(p.name, true))}
            </div>
            {error && <div className="notice danger">{error}</div>}
          </section>
          <div className="opening-choice-below" style={{ height: around?.below ?? 0 }} />
        </>
      )}
    </div>
  );
}

/**
 * Il Notaio's name wherever it shows (Interface v0.11): his notes in the stream, his hint, his reading, the
 * opening, and the tour's cards. Its hover glosses it, even with the hover explanations off, since it
 * explains a name rather than a control. On the opening (`plain`, Interface v0.19) it has no hover and no
 * underline: its gloss is written just under it.
 */
function NarratorName({ plain = false }: { plain?: boolean }) {
  const h = useContext(HintsContext);
  const hover = narrator.hover();
  if (plain) return <span className="narrator-name plain">{w("screen.notaio")}</span>;
  return (
    <span className="narrator-name" tabIndex={0} data-narrator="" aria-description={hover} onMouseEnter={(e) => h.show(hover, e.currentTarget, true)} onMouseLeave={h.hide} onFocus={(e) => h.show(hover, e.currentTarget, true)} onBlur={h.hide}>
      {w("screen.notaio")}
    </span>
  );
}

/** A template from player.json with `{notaio}` in it: his name there, with its hover. */
function Narrated({ template }: { template: string }) {
  return (
    <>
      {template.split("{notaio}").map((part, i) => (
        <Fragment key={i}>
          {i > 0 && <NarratorName />}
          {part}
        </Fragment>
      ))}
    </>
  );
}

// ---- Shared pieces ---------------------------------------------------------------------------------

/** A placeholder portrait: initials in a circle coloured by faction. Its tooltip is the public line only. */
function Portrait({ name, large, small }: { name: string; large?: boolean; small?: boolean }) {
  const g = guest(name);
  return (
    <span className={`portrait${large ? " large" : ""}${small ? " small" : ""}`} style={{ background: g?.colour }} title={g?.subtitle}>
      {g?.initials}
    </span>
  );
}

/**
 * A portrait that selects its guest, like their name (Interface v0.7): in the list of who's with you, the room,
 * and the "talking with" card and its tokens. The player's own portrait opens their briefing instead (Left).
 */
function PortraitButton({ name, large, hintKey = "portrait" }: { name: string; large?: boolean; hintKey?: string }) {
  const s = useContext(SelContext);
  const hint = useHint();
  const on = s.sel?.kind === "guest" && s.sel.name === name;
  return (
    <button className={`token${large ? " large" : ""}${on ? " selected" : ""}`} aria-label={name} aria-pressed={on} data-guest={name} onClick={() => s.guest(name)} {...hint(hintKey, { values: { name } })}>
      <Portrait name={name} large={large} />
    </button>
  );
}

/**
 * Clicking empty background deselects (Interface v0.7, Right): in the stream or the right panel (the card over
 * the "talking with" card fills most of it, so its blank space counts), anywhere but a name, a link, a button,
 * the message box, a decision card, or what `keep` names; not when text was being selected.
 */
const INTERACTIVE = "button, a, input, textarea, select, [role='button'], [tabindex], .card";
function deselectOnBackground(clear: () => void, keep?: string) {
  return (e: { target: EventTarget }) => {
    const t = e.target as Element;
    if (!(t instanceof Element) || t.closest(INTERACTIVE) || (keep && t.closest(keep))) return;
    if (globalThis.getSelection && !getSelection()?.isCollapsed) return;
    clear();
  };
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

/**
 * A modal's reading text (Interface v0.17): running text as written, and real lists where its lines spell one
 * out ("- …" bullets with a small dot in the accent, "1. …" a numbered list with quiet numerals), each with a
 * hanging indent.
 */
function Prose({ text }: { text: string }) {
  return (
    <>
      {proseBlocks(text).map((b, i) =>
        b.kind === "text" ? (
          <p key={i} className="prose-text">
            <Rich text={b.text} />
          </p>
        ) : b.kind === "bullets" ? (
          <ul key={i} className="prose-list bullets">
            {b.items.map((x, n) => (
              <li key={n}>
                <Rich text={x} />
              </li>
            ))}
          </ul>
        ) : (
          <ol key={i} className="prose-list numbers">
            {b.items.map((x, n) => (
              <li key={n}>
                <Rich text={x} />
              </li>
            ))}
          </ol>
        ),
      )}
    </>
  );
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

type DeckName = "briefing" | "rules" | "city" | "glossary";

/** The four modals in a row (Interface v0.7), in this order: nothing before the briefing, nothing after the glossary. */
const DECKS: DeckName[] = ["briefing", "rules", "city", "glossary"];

/** Where each modal was left: the briefing's card, the open rules section (by its place), the open city entry (by id), the glossary's search. */
type DeckPlaces = { briefing: number; rules: number | null; city: string | null; glossary: string };
const NO_PLACES: DeckPlaces = { briefing: 0, rules: null, city: null, glossary: "" };
/** Opens a modal, where it was left or at the place given. */
type OpenDeck = (d: DeckName, at?: Partial<DeckPlaces>) => void;

/**
 * Your briefing as the player reads it (Interface v0.16): five cards, then Your past where there is one. The
 * setting pack names the cards left out and the ones merged (screen.decks.playerSkips, playerMerges).
 */
function briefingDeck(sheet: Sheet): Card[] {
  const past = sheet.past ?? [];
  const cards = playerBriefing(briefingCards(sheet.briefing), packValue("screen.decks.playerSkips"), packValue("screen.decks.playerMerges"));
  return [...cards, ...(past.length ? [{ title: w("screen.decks.past"), text: past.map((p) => `**${p.title}**\n${p.text}`).join("\n\n") }] : [])];
}

/**
 * The rules as the player reads them (Interface v0.17): the player's own text from the setting pack, filled
 * with the game's values from the sheet (TD v0.52) and nothing else. The errand's ending goes by the run's
 * plot_reward flag, and the moving paragraph by the living guests. From a server that sends no values, the
 * primer, as before.
 */
function rulesDeck(sheet: Sheet, s: State | null): Card[] {
  if (!sheet.values) return rulesCards(sheet.rules);
  return playerRules(packValue("rules"), sheet.values, { plotReward: !!s?.plotReward, living: s ? s.livingOthers.length + 1 : (getInfo()?.roster.length ?? 0) });
}

/** Which way the player is going through the modals (Interface v0.16): the highlights point that way, and cards slide in from that side. */
type Way = "forward" | "back";

/** One of a modal's two footer buttons: its words, what it does, and whether it leads to another modal ("On to …", "Back to …"). */
type Step = { label: string; go: () => void; chain?: boolean } | null;

/**
 * The footer every modal has (Interface v0.16): Previous at the left and Next at the right, worded for what
 * the modal holds. Going forward, the way on to the next modal breathes; going back, the back button carries
 * the breathing outline, and fills where it leads to the modal before. A click on its blank space turns on.
 */
function DeckFoot({ prev, next, way, counter, more, prevBreathes = false }: { prev: Step; next: Step; way: Way; counter?: string; /** The reading area above, where it scrolls: More Below sits in line with the page counter (Interface v0.17). */ more?: ReturnType<typeof useMoreBelow>; /** The way back breathes although the player isn't going back: the Glossary opened straight from the chat. */ prevBreathes?: boolean }) {
  const hint = useHint();
  return (
    <footer className="deck-foot" onClick={(e) => e.target === e.currentTarget && next && !next.chain && next.go()}>
      {prev ? (
        <button className={`${way === "back" && prev.chain ? "primary" : "secondary"} deck-prev${way === "back" || prevBreathes ? " breathe" : ""}`} onClick={prev.go} {...hint(prev.chain ? "modalPrevious" : "deckBack")}>
          {prev.label}
        </button>
      ) : (
        <span />
      )}
      <span className="deck-mid">
        {counter && <span className="muted deck-counter">{counter}</span>}
        {more && <MoreBelow m={more} />}
      </span>
      {next ? (
        <button className={`secondary deck-next${way === "forward" && next.chain ? " breathe" : ""}`} onClick={next.go} {...hint(next.chain ? "modalNext" : "deckCard")}>
          {next.label}
        </button>
      ) : (
        <span />
      )}
    </footer>
  );
}

/**
 * The four modals in a row (Interface v0.7; v0.16): the open one over the screen, its title centred and a
 * close at the right, and to its left and right its neighbours, solid, each with a one-line summary of what
 * it is. Clicking one moves to it, at its beginning. The footers chain the four: on a modal's last item Next
 * becomes "On to …" and opens the next modal at its beginning; on its first item Previous becomes "Back to
 * …" and opens the one before at its last. Escape closes.
 */
function ModalRow({ deck, sheet, state, places, onPlaces, onDeck, onClose }: { deck: DeckName; sheet: Sheet; state: State | null; places: DeckPlaces; onPlaces: (p: DeckPlaces) => void; onDeck: (d: DeckName) => void; onClose: () => void }) {
  const hint = useHint();
  const at = DECKS.indexOf(deck);
  const before = DECKS[at - 1];
  const after = DECKS[at + 1];
  // Which way the row slid, so the modal comes in from the side it was on.
  const [from, setFrom] = useState<"left" | "right" | null>(null);
  const [way, setWay] = useState<Way>("forward");
  /** The player has moved along the row. Until then, a modal is where it was opened from the chat (Interface v0.17). */
  const [walked, setWalked] = useState(false);
  /** The side whose paddle was just clicked: it flashes for a moment. */
  const [flash, setFlash] = useState<"left" | "right" | null>(null);
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), themeMs("--motion-paddle-flash", 660));
    return () => clearTimeout(t);
  }, [flash]);
  // In a window narrower than the modal and both paddles, the overlay scrolls sideways: it opens centred on the modal in focus.
  const overlay = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = overlay.current;
    if (el && el.scrollWidth > el.clientWidth) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [deck]);
  const cards = useMemo(() => briefingDeck(sheet), [sheet]);
  const rules = useMemo(() => rulesDeck(sheet, state), [sheet, state?.plotReward, state?.livingOthers.length]);
  const lore = sheet.lore ?? [];
  const topics = useMemo(() => cityList(lore).flatMap((g) => g.entries), [sheet]);
  /** A modal's beginning, and its last item. */
  const start = (d: DeckName): Partial<DeckPlaces> => (d === "briefing" ? { briefing: 0 } : d === "rules" ? { rules: null } : d === "city" ? { city: null } : { glossary: "" });
  const end = (d: DeckName): Partial<DeckPlaces> => (d === "briefing" ? { briefing: Math.max(0, cards.length - 1) } : d === "rules" ? { rules: rules.length ? rules.length - 1 : null } : d === "city" ? { city: topics.at(-1)?.id ?? null } : { glossary: "" });
  /** To another modal: at its beginning, however it's reached, except by "Back to …", which opens it at its last. */
  const move = (d: DeckName, to: Way, place: Partial<DeckPlaces> = start(d)) => {
    setWalked(true);
    setWay(to);
    setFrom(to === "forward" ? "right" : "left");
    onPlaces({ ...places, ...place });
    onDeck(d);
  };
  /** Within the modal. */
  const turn = (place: Partial<DeckPlaces>, to: Way) => {
    setWay(to);
    onPlaces({ ...places, ...place });
  };
  const title = (d: DeckName) => w(`screen.${d}`);
  const onTo = (d: DeckName | undefined): Step => (d ? { label: wt("screen.modalRow.next", { title: title(d) }), go: () => move(d, "forward"), chain: true } : null);
  const backTo = (d: DeckName | undefined): Step => (d ? { label: wt("screen.modalRow.previous", { title: title(d) }), go: () => move(d, "back", end(d)), chain: true } : null);
  const card = Math.min(places.briefing, Math.max(0, cards.length - 1));
  const rule = places.rules !== null && rules[places.rules] ? places.rules : null;
  const topic = places.city === null ? -1 : topics.findIndex((e) => e.id === places.city);
  // Escape closes the modal; with a rules section open over its buttons, it goes back to the buttons first.
  useEscape(() => (deck === "rules" && rule !== null ? turn({ rules: null }, "back") : onClose()));
  const steps: { prev: Step; next: Step } =
    deck === "briefing"
      ? {
          prev: card > 0 ? { label: w("screen.decks.previousBriefing"), go: () => turn({ briefing: card - 1 }, "back") } : backTo(before),
          next: card < cards.length - 1 ? { label: w("screen.decks.nextBriefing"), go: () => turn({ briefing: card + 1 }, "forward") } : onTo(after),
        }
      : deck === "rules"
        ? rule === null
          ? { prev: backTo(before), next: rules.length ? { label: w("screen.rulesModal.first"), go: () => turn({ rules: 0 }, "forward") } : onTo(after) }
          : {
              prev: rule === 0 ? { label: w("screen.rulesModal.overview"), go: () => turn({ rules: null }, "back") } : { label: w("screen.rulesModal.previous"), go: () => turn({ rules: rule - 1 }, "back") },
              next: rule < rules.length - 1 ? { label: w("screen.rulesModal.next"), go: () => turn({ rules: rule + 1 }, "forward") } : onTo(after),
            }
        : deck === "city"
          ? topic < 0
            ? { prev: backTo(before), next: topics.length ? { label: w("screen.cityList.first"), go: () => turn({ city: topics[0]!.id }, "forward") } : onTo(after) }
            : {
                // On the first topic, the way back to the list above is the way back.
                prev: topic === 0 ? null : { label: w("screen.cityList.previous"), go: () => turn({ city: topics[topic - 1]!.id }, "back") },
                next: topic < topics.length - 1 ? { label: w("screen.cityList.next"), go: () => turn({ city: topics[topic + 1]!.id }, "forward") } : onTo(after),
              }
          : { prev: backTo(before), next: null };
  // The highlights point the way the player is going: the next modal's peek lights up on the last item going
  // forward, the one before on the first item going back; at either end of the chain, Close fills in.
  const litNext = way === "forward" && !!steps.next?.chain;
  const litPrev = way === "back" && !!steps.prev?.chain;
  const closeFills = (way === "forward" && !steps.next) || (way === "back" && !steps.prev && deck === DECKS[0]);
  const noSteps = { prev: null, next: null };
  /** A modal's contents: the one in focus at its place, or a neighbour drawn still at its start. */
  const body = (d: DeckName, still: boolean) =>
    d === "briefing" ? (
      <BriefingDeck cards={cards} place={still ? 0 : card} onPlace={(n) => turn({ briefing: n }, n < card ? "back" : "forward")} steps={still ? noSteps : steps} way={still ? "forward" : way} still={still} />
    ) : d === "rules" ? (
      <RulesSections cards={rules} open={still ? null : rule} onOpen={(n) => turn({ rules: n }, n === null || (rule !== null && n < rule) ? "back" : "forward")} steps={still ? noSteps : steps} way={still ? "forward" : way} still={still} />
    ) : d === "city" ? (
      <CityList lore={lore} open={still || topic < 0 ? null : places.city} onOpen={(id) => turn({ city: id }, id === null ? "back" : "forward")} steps={still ? noSteps : steps} way={still ? "forward" : way} still={still} />
    ) : (
      <Glossary search={still ? "" : places.glossary} onSearch={(q) => onPlaces({ ...places, glossary: q })} rules={rules} onRules={(n) => move("rules", "back", { rules: n })} steps={still ? noSteps : steps} way={still ? "forward" : way} still={still} prevBreathes={!still && !walked} />
    );
  /**
   * A side modal (Interface v0.17), in two sizes by the room the row has beside the modal in focus (a container
   * query picks one): the whole neighbour, drawn as itself at its start, still, scaled to fit and evenly
   * blurred, its title flat in its header toward the middle at full size; or a paddle, the title on end with
   * an arrow below. Clicking either moves to that modal; the one the player is heading for is ringed.
   */
  const side = (d: DeckName | undefined, at: "left" | "right") => {
    if (!d) return <div className={`modal-side ${at} empty`} aria-hidden="true" />;
    const go = () => {
      setFlash(at);
      move(d, at === "left" ? "back" : "forward");
    };
    return (
      <div
        className={`modal-side ${at}${(at === "left" ? litPrev : litNext) ? " lit" : ""}${flash === at ? " flash" : ""}`}
        data-deck={d}
        role="button"
        tabIndex={0}
        aria-label={wt(at === "left" ? "screen.modalRow.previous" : "screen.modalRow.next", { title: title(d) })}
        onClick={(e) => (e.stopPropagation(), go())}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go();
          }
        }}
        {...hint(at === "left" ? "modalPrevious" : "modalNext")}
      >
        <div className="side-whole" inert aria-hidden="true">
          <div className="side-scaled">
            <div className="still-modal deck" data-deck={d}>
              <header>
                <span />
                <h2>{title(d)}</h2>
                <span />
              </header>
              {body(d, true)}
            </div>
          </div>
          <div className="side-title">{title(d)}</div>
        </div>
        <div className="paddle" aria-hidden="true">
          <span className="paddle-title">{title(d)}</span>
          <span className="paddle-arrow">{w(`screen.modalRow.paddle.${at}`)}</span>
        </div>
      </div>
    );
  };
  return (
    <div className="overlay modal-overlay" ref={overlay} onClick={onClose}>
      {/* The modal in focus comes first in the page, so it's what a reader or a search finds first; its neighbours are placed on either side of it. */}
      <div className="modal-row">
        <div key={deck} className={`modal deck deck-${deck}${from ? ` from-${from}` : ""}`} data-deck={deck} data-way={way} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={title(deck)}>
          <header>
            <span />
            <h2>{title(deck)}</h2>
            <button className={`${closeFills ? "primary" : "secondary"} deck-close`} onClick={onClose} {...hint("close")}>
              {w("screen.close")}
            </button>
          </header>
          {body(deck, false)}
        </div>
        {side(before, "left")}
        {side(after, "right")}
      </div>
    </div>
  );
}

/**
 * The glossary (Interface v0.7): for looking up one word. Alphabetical, the term in bold and a short plain
 * definition; a search box on top narrows it as you type; "More in the rules" under an entry with a rules
 * section behind it opens that section in the rules modal. The search is the caller's, so it's kept. It's the
 * end of the chain (Interface v0.16): its footer holds only the way back to the modal before.
 */
function Glossary({ search, onSearch, rules, onRules, steps, way, still = false, prevBreathes = false }: { search: string; onSearch: (q: string) => void; rules: Card[]; onRules: (n: number) => void; steps: { prev: Step; next: Step }; way: Way; /** Drawn still, as a side modal: no keys, nothing to press. */ still?: boolean; /** Opened straight from the chat (Interface v0.17): its way back to the modal before breathes. */ prevBreathes?: boolean }) {
  const hint = useHint();
  const list = glossaryList(getInfo()?.glossary ?? [], search);
  const m = useMoreBelow();
  return (
    <>
      <div className="glossary">
        <input className="glossary-search" type="search" value={search} readOnly={still} placeholder={w("screen.glossaryModal.search")} aria-label={w("screen.glossaryModal.searchLabel")} onChange={(e) => onSearch(e.target.value)} {...hint("glossarySearch")} />
        {/* Its edges fade where there's more to scroll; a list to look a word up in has no More Below. */}
        <dl className="glossary-list fades" ref={m.ref} data-fade={m.fade}>
          {list.map((g) => {
            const section = rulesSectionFor(g, rules);
            return (
              <div className="glossary-entry" key={g.term} data-term={g.term}>
                <dt>{g.term}</dt>
                <dd>
                  {g.text}
                  {section !== null && (
                    <button className="secondary small glossary-rules" onClick={() => onRules(section)} {...hint("glossaryRules")}>
                      {w("screen.glossaryModal.more")}
                    </button>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
        {list.length === 0 && <p className="muted glossary-none">{w("screen.glossaryModal.none")}</p>}
      </div>
      <DeckFoot prev={steps.prev} next={steps.next} way={way} prevBreathes={prevBreathes} />
    </>
  );
}

/**
 * Your briefing, a card deck: tabs along the top show where you are and jump; clicking anywhere on the card,
 * or on the footer's blank space, turns to the next; Previous and Next at its foot and the arrow keys go
 * back and forth. Going back, the card slides in from the left. No auto-advance. The place is the caller's.
 */
function BriefingDeck({ cards, place, onPlace, steps, way, still = false }: { cards: Card[]; place: number; onPlace: (n: number) => void; steps: { prev: Step; next: Step }; way: Way; /** Drawn still, as a side modal: no keys, nothing to press. */ still?: boolean }) {
  const hint = useHint();
  const at = Math.min(place, Math.max(0, cards.length - 1));
  const card = cards[at];
  const m = useMoreBelow();
  /** Within the deck: the card, its footer's blank space, and the arrow keys stop at its ends; only the footer's buttons lead on to another modal. */
  const within = (s: Step) => s && !s.chain && s.go();
  // Registered once, reading the latest place through a ref, so no key falls between two renders' listeners.
  const keys = useRef((_: KeyboardEvent) => {});
  keys.current = (e) => {
    if (e.key === "ArrowRight") within(steps.next);
    else if (e.key === "ArrowLeft") within(steps.prev);
  };
  useEffect(() => {
    if (still) return;
    const on = (e: KeyboardEvent) => keys.current(e);
    document.addEventListener("keydown", on);
    return () => document.removeEventListener("keydown", on);
  }, [still]);
  return (
    <>
      {/* Interface v0.17: the tabs are the cards' titles, fixed under the modal's title, so they never move from card to card. */}
      {cards.length > 0 && (
        <nav className="tabs">
          {cards.map((c, i) => (
            <button key={i} className={`tab${i === at ? " on" : ""}`} aria-current={i === at} onClick={() => onPlace(i)} {...hint("deckTab")}>
              {tc(c.title)}
            </button>
          ))}
        </nav>
      )}
      {card ? (
        // The card doesn't repeat its title: its text starts a short way below the tabs, centred top to bottom when it's short.
        <div className={`deck-card fades${way === "back" ? " from-left" : ""}`} key={at} ref={m.ref} data-fade={m.fade} aria-label={tc(card.title)} onClick={() => within(steps.next)} {...hint("deckCard", { focusable: true })}>
          <div className="deck-text">
            <Prose text={card.text} />
          </div>
        </div>
      ) : (
        <div className="deck-card empty">{w("screen.decks.empty")}</div>
      )}
      <DeckFoot prev={steps.prev} next={steps.next} way={way} counter={cards.length > 0 ? w("screen.decks.counter", { n: at + 1, total: cards.length }) : undefined} more={still ? undefined : m} />
    </>
  );
}

/**
 * The rules (Interface v0.5; v0.16): one button per section of the rules primer, which stay in view; a
 * section opens as a card over them. A click on the card turns to the next section; its ×, Escape, or a click
 * outside the card goes back to the buttons; a click on the empty space around the buttons opens the first.
 */
function RulesSections({ cards, open, onOpen, steps, way, still = false }: { cards: Card[]; open: number | null; onOpen: (n: number | null) => void; steps: { prev: Step; next: Step }; way: Way; /** Drawn still, as a side modal. */ still?: boolean }) {
  const hint = useHint();
  const card = open === null ? undefined : cards[open];
  const m = useMoreBelow();
  // A section opened from the buttons grows; turning from one to the next, it slides, from the left going back.
  const was = useRef<number | null>(null);
  const grows = was.current === null;
  useEffect(() => {
    was.current = open;
  }, [open]);
  if (!cards.length) return <div className="deck-card empty">{w("screen.decks.empty")}</div>;
  return (
    <>
      <div className="rules-body">
        <div className="rules-buttons" inert={!!card} onClick={(e) => e.target === e.currentTarget && onOpen(0)}>
          {cards.map((c, i) => (
            // Interface v0.17: its Roman numeral in a small round badge at its left, its name centred.
            <button key={i} className="rules-section" data-section={i} onClick={() => onOpen(i)} {...hint("rulesSection")}>
              <span className="numeral" aria-hidden="true">
                {roman(i + 1)}
              </span>
              <span className="rules-name">{tc(c.title)}</span>
            </button>
          ))}
        </div>
        {/* Behind an open section the buttons are dimmed lightly and slightly blurred; the backdrop fades in at its top and bottom (Interface v0.18). The card above it isn't faded. */}
        {card && <div className="rules-backdrop" aria-hidden="true" />}
        {card && (
          <div className="rules-over" onClick={() => onOpen(null)}>
            <section key={open} className={`rules-section open${grows ? " grows" : way === "back" ? " from-left" : " from-right"}`} data-section={open!} aria-label={tc(card.title)} onClick={(e) => (e.stopPropagation(), steps.next && !steps.next.chain && steps.next.go())}>
              <div className="rules-section-head">
                <h3>{w("screen.rulesModal.numbered", { numeral: roman(open! + 1), title: tc(card.title) })}</h3>
                <button className="icon close" aria-label={w("screen.rulesModal.shrink")} onClick={(e) => (e.stopPropagation(), onOpen(null))} {...hint("rulesShrink")}>
                  {w("screen.rulesModal.mark")}
                </button>
              </div>
              <div className="rules-section-text fades" ref={m.ref} data-fade={m.fade}>
                <div className="deck-text">
                  <Prose text={card.text} />
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
      <DeckFoot prev={steps.prev} next={steps.next} way={way} more={still || !card ? undefined : m} />
    </>
  );
}

/**
 * The city (Interface v0.5; v0.16): a list scrolled like an inbox, one row per public lore entry with its
 * title and a one-line preview, under subject headers. Clicking a row opens the entry here, with a way back
 * to the list that stays put while only the topic slides; Previous and Next topic at its foot, and a click
 * anywhere on the entry turns to the next. Lore links in the chat open on the right, never here.
 */
function CityList({ lore, open, onOpen, steps, way, still = false }: { lore: LoreEntry[]; open: string | null; onOpen: (id: string | null) => void; steps: { prev: Step; next: Step }; way: Way; /** Drawn still, as a side modal. */ still?: boolean }) {
  const hint = useHint();
  const entry = open === null ? undefined : lore.find((e) => e.id === open);
  const list = useRef<HTMLDivElement | null>(null);
  const m = useMoreBelow();
  // Back at the list, at the place it was left.
  const scroll = useRef(0);
  useLayoutEffect(() => {
    if (!entry && list.current) list.current.scrollTop = scroll.current;
  }, [!!entry]);
  if (!lore.length) return <div className="deck-card empty">{w("screen.decks.empty")}</div>;
  if (entry)
    return (
      <>
        <div className="city-open">
          <button className="secondary city-back" onClick={() => onOpen(null)} {...hint("cityBack")}>
            {w("screen.cityList.back")}
          </button>
          <section key={entry.id} className={`city-entry fades${way === "back" ? " from-left" : ""}`} data-lore={entry.id} ref={m.ref} data-fade={m.fade} onClick={() => steps.next && !steps.next.chain && steps.next.go()}>
            <h3>{tc(entry.title)}</h3>
            <div className="deck-text">
              <Prose text={entry.text} />
            </div>
          </section>
        </div>
        <DeckFoot prev={steps.prev} next={steps.next} way={way} more={still ? undefined : m} />
      </>
    );
  return (
    <>
      {/* Interface v0.17: its edges fade where there's more to scroll, and its subject headings stick at its top. A list has no More Below. */}
      <div
        className="city-list fades"
        ref={(el) => {
          list.current = el;
          m.ref(el);
        }}
        data-fade={m.fade === "both" || m.fade === "below" ? "below" : "none"}
      >
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
                    <span className="city-title">{tc(e.title)}</span>
                    <span className="city-preview muted">{preview(e)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <DeckFoot prev={steps.prev} next={steps.next} way={way} />
    </>
  );
}

// ---- The game ----------------------------------------------------------------------------------------

function Game({ me, url }: { me: string; url: string }) {
  const [log, setLog] = useState<Ev[]>([]);
  const [status, setStatus] = useState<"open" | "closed" | "connecting">("connecting");
  const conn = useRef<{ send: Send } | null>(null);
  /** The tour has ended (or ran before), so the game may begin: sent now, and again on every (re)connection. */
  const begun = useRef(false);
  useEffect(() => {
    conn.current = connect(url, {
      event: (e) => setLog((l) => [...l, e]),
      reset: () => setLog([]),
      status: (st) => {
        setStatus(st);
        if (st === "open" && begun.current) conn.current?.send({ type: "begin" });
      },
    });
  }, [url]);
  const v = useMemo(() => derive(log), [log]);
  const send: Send = (m) => conn.current?.send(m);
  /**
   * The tour has ended for this game (Interface v0.8): finished on Your briefing, skipped, or already run in
   * this browser. Technical Design v0.51's hold: the game waits for `begin` before its first line, so it's sent
   * here (and, if the connection isn't open yet, as soon as it is). Only the game's first counts. A tour run
   * again from Show me around doesn't call it.
   */
  const tourEnded = (_how: TourEnd) => {
    begun.current = true;
    conn.current?.send({ type: "begin" });
  };
  return <GameView me={me} v={v} send={send} status={status} onTourEnd={tourEnded} />;
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
  places: initialPlaces,
  selected = null,
  web: initialWeb = null,
  webTab,
  keyType,
  pastStage = null,
  rightHidden: initialRightHidden,
  tourStep,
  onTourEnd = () => {},
}: {
  me: string;
  v: View;
  send: Send;
  status: "open" | "closed" | "connecting";
  deck?: DeckName | null;
  /** Where the modals stand from the start (an open rules section, a briefing card), for the tests. */
  places?: Partial<DeckPlaces>;
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
  /** The tour open at this step from the start, for the tests; otherwise it runs once per browser, after the choice. */
  tourStep?: number;
  /** The tour has ended: finished, skipped, or already run (Game's `tourEnded`). */
  onTourEnd?: (how: TourEnd) => void;
}) {
  const [deck, setDeck] = useState<DeckName | null>(initialDeck);
  const [places, setPlaces] = useState<DeckPlaces>({ ...NO_PLACES, ...initialPlaces });
  // One selection of guests, shared by the chat and the Web of Secrets (Interface v0.6).
  const selection = useSharedSelection(initialSelection(selected, initialWeb));
  // The Web of Secrets is always there (TD v0.44); open or down, it shows the shared selection.
  const [webOpen, setWebOpen] = useState(initialWeb !== null);
  // A note's conclusion goes to the input box, not straight to the game (Interface v0.4).
  const [boxFill, setBoxFill] = useState<BoxFill | null>(null);
  const right = useRightHidden(initialRightHidden);
  // Interface v0.8: the tour, once per browser, right after the choice; ending on Your briefing opens it.
  const tour = useTour(onTourEnd, tourStep, () => setDeck("briefing"));
  // Interface v0.16: after a skipped tour, Your briefing breathes until the player clicks it or anywhere else.
  const [nudge, setNudge] = useState(false);
  useEffect(() => {
    if (!nudge) return;
    const stop = () => setNudge(false);
    // After the click that skipped the tour has finished its way up the page.
    const t = setTimeout(() => document.addEventListener("click", stop, { once: true }), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", stop);
    };
  }, [nudge]);
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
  /** A lore note in Il Notaio's box (TD v0.51): opens its entry in The city, over everything, keeping the selection. */
  const openEntry = (id: string) => {
    setPlaces((p) => ({ ...p, city: id }));
    setDeck("city");
  };
  /** Opens a modal, at a place in it if one is given (Interface v0.16: a sheet line's rules, the errand's card). */
  const openDeck: OpenDeck = (d, at) => {
    if (at) setPlaces((p) => ({ ...p, ...at }));
    setDeck(d);
  };
  return (
    <SelContext.Provider value={selection}>
      <div className={`layout${right.hidden ? " right-hidden" : ""}`} ref={layout}>
        <Boundary panel="left" fallback={(n) => <aside className="side left">{n}</aside>}>
          <Left me={me} v={v} onDeck={openDeck} onTour={tour.again} nudge={nudge && tour.step === null} />
        </Boundary>
        <Centre me={me} v={v} send={send} dead={dead} status={status} boxFill={boxFill} initialPast={pastStage} onEntry={openEntry} />
        <Boundary panel="right" fallback={(n) => <aside className="side right">{n}</aside>}>
          {right.hidden ? <RightHandle onShow={() => right.set(false)} /> : <Right me={me} v={v} onWeb={openWeb} onHide={() => right.set(true)} layout={layout} reopened={right.reopened} />}
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
        <WebDock me={me} v={v} open={webOpen} setOpen={setWebOpen} initialTab={webTab} initialKey={keyType ?? null} send={send} dead={dead} boxClosed={cardWaiting} onConclude={concludeInBox} onEntry={openEntry} />
      </Boundary>
      {/* After everything, and above it all in theme.css's order, so nothing covers it. */}
      {deck && v.sheet && (
        <Boundary panel="deck" fallback={(n) => <FailedOverlay notice={n} onClose={() => setDeck(null)} />}>
          <ModalRow deck={deck} sheet={v.sheet} state={v.state} places={places} onPlaces={setPlaces} onDeck={setDeck} onClose={() => setDeck(null)} />
        </Boundary>
      )}
      {tour.step !== null && (
        <Boundary panel="tour" fallback={() => null}>
          <Tour step={tour.step} onStep={tour.go} onSkip={() => (tour.skip(), setNudge(true))} onFinish={tour.finish} />
        </Boundary>
      )}
    </SelContext.Provider>
  );
}

// ---- The tour (Interface v0.8, The Tour) ------------------------------------------------------------------
//
// Right after the choice of character: one part of the screen at a time spotlit, the rest dimmed, with a small
// card beside it in Il Notaio's voice, styled like his hint. A click anywhere moves on; Back goes back; every
// step has Skip tour; Escape skips too. It ends on the Your briefing button, and moving on from there opens the
// briefing. It runs once, remembered in the browser; Show me around runs it again. With reduced motion set,
// the spotlight jumps rather than glides (theme.css).

const TOUR_KEY = "player-screen.tour";
/** How the tour ended: on Your briefing, skipped, or already run in this browser (so it didn't show). */
export type TourEnd = "finished" | "skipped" | "seen";

/** The steps, in the doc's order: each its card's key in notaio.json's tour, and what it spotlights (their union). */
const TOUR: { key: string; at: string[] }[] = [
  { key: "sheet", at: [".side.left .sheet-panel"] },
  { key: "decks", at: [".side.left .buttons.decks"] },
  { key: "errand", at: [".side.left .errand"] },
  // The places (Interface v0.9), or the room view in a game without them.
  { key: "room", at: ['.side.left [data-hint="here"]', '.side.left [data-hint="places"]', ".side.left .room"] },
  { key: "stageBar", at: [".centre .conv-where"] },
  { key: "conversation", at: [".centre .stream", ".centre .input"] },
  { key: "right", at: [".side.right"] },
  { key: "web", at: [".web-bar"] },
  { key: "briefing", at: ['.side.left [data-hint="briefing"]'] },
];

function useTour(onEnd: (how: TourEnd) => void, initial: number | undefined, openBriefing: () => void) {
  const [step, setStep] = useState<number | null>(initial ?? null);
  /** A run from Show me around, which doesn't end anything for the game. */
  const again = useRef(false);
  const latest = useRef(onEnd);
  latest.current = onEnd;
  // After the first render in the browser, so the screen it points at is there (and never on the server).
  useEffect(() => {
    if (initial !== undefined) return;
    let seen = false;
    try {
      seen = localStorage.getItem(TOUR_KEY) === "done";
    } catch {
      // Blocked storage: the tour runs, and runs again next time.
    }
    if (seen) latest.current("seen");
    else setStep(0);
  }, []);
  const end = (how: TourEnd) => {
    setStep(null);
    try {
      localStorage.setItem(TOUR_KEY, "done");
    } catch {
      // The tour shows again next time.
    }
    if (!again.current) latest.current(how);
    again.current = false;
  };
  return {
    step,
    go: (n: number) => setStep(Math.max(0, Math.min(TOUR.length - 1, n))),
    skip: () => end("skipped"),
    finish: () => {
      end("finished");
      openBriefing();
    },
    again: () => {
      again.current = true;
      setStep(0);
    },
  };
}

/** The union of the elements a step spotlights, in the window; null when none is on the screen. */
function tourRect(at: string[]): { top: number; left: number; width: number; height: number } | null {
  const rects = at.flatMap((sel) => [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect())).filter((r) => r.width > 0 && r.height > 0);
  if (!rects.length) return null;
  const top = Math.min(...rects.map((r) => r.top));
  const left = Math.min(...rects.map((r) => r.left));
  return { top, left, width: Math.max(...rects.map((r) => r.right)) - left, height: Math.max(...rects.map((r) => r.bottom)) - top };
}

function Tour({ step, onStep, onSkip, onFinish }: { step: number; onStep: (n: number) => void; onSkip: () => void; onFinish: () => void }) {
  const hint = useHint();
  const s = TOUR[step]!;
  const last = step === TOUR.length - 1;
  const [spot, setSpot] = useState<ReturnType<typeof tourRect>>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(null);
  const card = useRef<HTMLDivElement>(null);
  useEscape(onSkip);
  // Bring the step's part into view (a short window scrolls the left column), then follow it as the screen moves.
  useLayoutEffect(() => {
    document.querySelector(s.at[0]!)?.scrollIntoView({ block: "nearest" });
    let frame = 0;
    let was = "";
    const follow = () => {
      const r = tourRect(s.at);
      const key = JSON.stringify(r);
      if (key !== was) {
        was = key;
        setSpot(r);
      }
      frame = requestAnimationFrame(follow);
    };
    follow();
    return () => cancelAnimationFrame(frame);
  }, [step]);
  // The card beside the spot: to its right if there's room, else below, else above, else to its left; kept in the window.
  useLayoutEffect(() => {
    const c = card.current;
    if (!c) return;
    const gap = themeMs("--tour-gap", 12);
    const { offsetWidth: cw, offsetHeight: ch } = c;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const clampX = (x: number) => Math.max(gap, Math.min(x, W - cw - gap));
    const clampY = (y: number) => Math.max(gap, Math.min(y, H - ch - gap));
    if (!spot) return setPlace({ top: clampY((H - ch) / 2), left: clampX((W - cw) / 2) });
    const right = spot.left + spot.width + gap;
    const below = spot.top + spot.height + gap;
    if (right + cw <= W - gap) setPlace({ top: clampY(spot.top), left: right });
    else if (below + ch <= H - gap) setPlace({ top: below, left: clampX(spot.left) });
    else if (spot.top - gap - ch >= gap) setPlace({ top: spot.top - gap - ch, left: clampX(spot.left) });
    else setPlace({ top: clampY(spot.top), left: clampX(spot.left - gap - cw) });
  }, [spot, step]);
  const next = () => (last ? onFinish() : onStep(step + 1));
  return (
    <div className="tour" data-step={s.key} onClick={next} role="dialog" aria-modal="true" aria-label={w("screen.tour.again")}>
      <div className={`tour-spot${spot ? "" : " none"}`} style={spot ? { top: spot.top, left: spot.left, width: spot.width, height: spot.height } : undefined} aria-hidden="true" />
      <div ref={card} className={`tour-card${place ? "" : " measuring"}`} style={place ? { top: place.top, left: place.left } : undefined} data-step={s.key}>
        <div className="tour-head">
          <NarratorName />
          <span className="muted tour-count">{w("screen.tour.counter", { n: step + 1, total: TOUR.length })}</span>
        </div>
        <p className="tour-text">{narrator.tourStep(s.key)}</p>
        <div className="tour-controls">
          <button className="secondary small" disabled={step === 0} onClick={(e) => (e.stopPropagation(), onStep(step - 1))} {...hint("tourBack")}>
            {w("screen.tour.back")}
          </button>
          <button className="secondary small tour-skip" onClick={(e) => (e.stopPropagation(), onSkip())} {...hint("tourSkip")}>
            {w("screen.tour.skip")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A side column that may not fit the window: while there's more below, a hint stays at the column's foot,
 * and clicking it scrolls on (CC-20261113-01, #88: every control reachable at laptop heights).
 */
function useMoreBelow() {
  // The element is kept in state, so a reading area that comes and goes (an open rules section) is watched whenever it's there.
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [more, setMore] = useState(false);
  const [above, setAbove] = useState(false);
  /**
   * Interface v0.19, Notes for the Build: it can't loop. Showing More Below changes what's left to scroll, so a check
   * that flipped at one line could turn it on and off without end. It comes on only with clearly more than its own
   * room left (--more-below-on) and goes off once no more than --more-below-off is left past it; and the check runs a
   * frame after the render, at most once a frame.
   */
  const check = useRef(() => {});
  /** The element the last check was for: a new one (an open entry in place of the list) starts from nothing shown. */
  const checked = useRef<HTMLElement | null>(null);
  check.current = () => {
    if (!el) return;
    const fresh = checked.current !== el;
    checked.current = el;
    // Not counting the hint's own room at the end: once only that is left below, there's nothing more to see.
    const hint = el.querySelector<HTMLElement>(":scope > .more-below");
    const own = hint ? hint.offsetHeight + parseFloat(getComputedStyle(hint).marginTop) : 0;
    const left = el.scrollHeight - own - (el.scrollTop + el.clientHeight);
    setMore((was) => (was && !fresh ? left > themeMs("--more-below-off", 2) : left > themeMs("--more-below-on", 16)));
    setAbove(el.scrollTop > themeMs("--more-below-off", 2));
  };
  const later = useMemo(() => perFrame(() => check.current()), []);
  useEffect(() => later.cancel, []);
  // A frame after every render (new content), on scrolling, and whenever its space changes.
  useLayoutEffect(() => later.run());
  // A new element is checked at once, before it's drawn, so it never shows the last one's More Below.
  useLayoutEffect(() => check.current(), [el]);
  useEffect(() => {
    if (!el) return;
    el.addEventListener("scroll", later.run);
    window.addEventListener("resize", later.run);
    const watch = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(later.run);
    watch?.observe(el);
    return () => {
      el.removeEventListener("scroll", later.run);
      window.removeEventListener("resize", later.run);
      watch?.disconnect();
    };
  }, [el]);
  /** Which of its edges fade (Interface v0.17): where there's more to scroll to, above or below. */
  const fade = more && above ? "both" : more ? "below" : above ? "above" : "none";
  return { ref: setEl as (el: HTMLElement | null) => void, more, fade, on: () => el?.scrollBy({ top: el.clientHeight * 0.8, behavior: "smooth" }) };
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

/** Where a sheet line leads, as the modal to open and the place in it. */
const factPlace = (l: FactLink): [DeckName, Partial<DeckPlaces>] => (l.deck === "rules" ? ["rules", { rules: l.section }] : ["glossary", { glossary: l.search }]);

/**
 * One line of the sheet (Interface v0.16, Left): it opens where it's explained, the rules section behind its
 * glossary word (the setting pack's screen.factLinks names the word), or the word in the glossary. It
 * underlines on hover. Without anywhere to lead (before the sheet arrives), it's a plain line.
 */
function Fact({ fact, label, value, link, onDeck }: { fact: string; label: string; value?: ReactNode; link: FactLink | null; onDeck: OpenDeck }) {
  const hint = useHint();
  const inner = (
    <>
      <span className="fact-label">{label}</span>
      {value !== undefined && <span className="fact-value">{value}</span>}
    </>
  );
  if (!link)
    return (
      <div className="fact" data-fact={fact}>
        {inner}
      </div>
    );
  return (
    <button className="fact link" data-fact={fact} onClick={() => onDeck(...factPlace(link))} {...hint("factLink")}>
      {inner}
    </button>
  );
}

function Left({ me, v, onDeck, onTour, nudge = false }: { me: string; v: View; onDeck: OpenDeck; onTour: () => void; /** The tour was skipped: Your briefing breathes until a click (Interface v0.16). */ nudge?: boolean }) {
  const s = v.state;
  const line = errandLine(s);
  const midnight = midnightLine(s);
  const g = guest(me);
  const hint = useHint();
  const m = useMoreBelow();
  // Interface v0.16: each line of the sheet opens the rules where it's explained, by its glossary word.
  const rules = useMemo(() => (v.sheet ? rulesDeck(v.sheet, s) : []), [v.sheet, s?.plotReward, s?.livingOthers.length]);
  const glossary = getInfo()?.glossary ?? [];
  const word = (k: string) => packValue(`screen.factLinks.${k}`) as string | undefined;
  const link = (k: string) => (v.sheet ? factLink(word(k), glossary, rules) : null);
  // The errand's reward line opens the rules on errands where the primer has a section, otherwise midnight's, where the acts are.
  const rewardAt = v.sheet ? (rulesLink(word("errand"), glossary, rules) ?? rulesLink(word("midnight"), glossary, rules)) : null;
  const openReward = rewardAt === null ? undefined : (e: { stopPropagation: () => void }) => (e.stopPropagation(), onDeck("rules", { rules: rewardAt }));
  /** The errand card opens the briefing at the errand's card, found by the errand's own words. */
  const openErrand = () => v.sheet && onDeck("briefing", { briefing: errandCardAt(briefingDeck(v.sheet), v.sheet.errand ?? "") });
  // Interface v0.19: "You are {name}", the name kept whole on its own line.
  const [youBefore, youAfter = ""] = w("screen.youAre").split("{name}");
  return (
    <aside className="side left" ref={m.ref}>
      {/* Interface v0.19: the top (you, your sheet, the four buttons) stays put when the panel scrolls; the errand and the
          places slide under the buttons with a fade. In a very short window the whole panel scrolls (theme.css). */}
      <div className="left-top">
      {/* Interface v0.16: Show me around and the explanations' switch, centred at the top on their own line. */}
      <div className="side-head">
        <button className="switch tour-again" onClick={onTour} {...hint("tourAgain")}>
          {w("screen.tour.again")}
        </button>
        <HintSwitch />
      </div>
      <div className="panel sheet-panel" {...hint("sheet", { focusable: true })}>
        {/* Interface v0.16: the portrait, "You are …", and the role in plain words, centred, with no label or ring. The
            public subtitle stands in for the role until Characters writes one per guest. Interface v0.7: the name or
            portrait opens the briefing, at the place it was left. */}
        {/* Interface v0.19: the portrait beside the name and role, not above them. */}
        <button className="me-briefing" disabled={!v.sheet} onClick={() => onDeck("briefing")} {...hint("myBriefing")}>
          <Portrait name={me} large />
          <span className="name">
            {youBefore}
            <span className="me-name">{me}</span>
            {youAfter && <wbr />}
            {youAfter}
          </span>
          <span className="muted role">{g?.subtitle}</span>
        </button>
        {/* Laid out before the first state arrives, so nothing below moves when it does. */}
        <div className="facts">
          <Fact fact="purse" label={w("screen.purse")} value={s ? w("screen.purseValue", { amount: s.florins }) : ""} link={link("purse")} onDeck={onDeck} />
          <Fact fact="pensions" label={w("screen.pensions")} value={s?.pensionsHeld ?? ""} link={link("pensions")} onDeck={onDeck} />
          <Fact fact="withdrawals" label={w("screen.withdrawals")} value={s?.withdrawalCount ?? ""} link={link("withdrawals")} onDeck={onDeck} />
        </div>
        {/* Interface v0.8: the midnight line, and with plot_reward on the extra act the errand can earn. */}
        <div className="midnight-line">
          <Fact fact="midnight" label={w("screen.midnightLine.acts")} link={link("midnight")} onDeck={onDeck} />
          {midnight.extra && (
            <div className="midnight-extra" data-extra={midnight.extra}>
              {w(`screen.midnightLine.${midnight.extra}`)}
            </div>
          )}
        </div>
      </div>
      {/* The four modals' buttons right under the sheet (TD v0.45; Interface v0.7), so they're in sight on a short window. The Web of
          Confidences has no button here: it's always at the bottom (TD v0.44). */}
      <div className="buttons decks">
        {DECKS.map((d) => (
          <button key={d} className={nudge && d === DECKS[0] ? "primary breathe" : "secondary"} disabled={!v.sheet} onClick={() => onDeck(d)} {...hint(d)}>
            {w(`screen.${d}`)}
          </button>
        ))}
      </div>
      </div>
      {v.sheet?.errand && (
        // Interface v0.16: just the task; clicking the card opens the briefing at the errand's card.
        <div className="errand" role="button" onClick={openErrand} onKeyDown={(e) => e.target === e.currentTarget && toggleKeys(openErrand)(e)} {...hint(line?.kind === "reward" ? "errandReward" : line?.kind === "noReward" ? "errandNoReward" : "errand", { focusable: true })}>
          <div className="label">{w("screen.errandCard.title")}</div>
          <div className="errand-text">
            <Rich text={errandTask(v.sheet.errand)} />
          </div>
          {/* TD v0.47: what the errand earns, in the card's accent; after the check, {plot_status} replaces it.
              Interface v0.16: the line opens the rules on errands, or on midnight's acts. */}
          {line &&
            (openReward ? (
              <button className={line.kind === "status" ? "errand-result link" : "errand-reward link"} data-reward={line.kind} onClick={openReward} {...hint("factLink")}>
                {line.kind === "status" ? line.text : w(`screen.errandCard.${line.kind}`)}
              </button>
            ) : (
              <div className={line.kind === "status" ? "errand-result" : "errand-reward"} data-reward={line.kind}>
                {line.kind === "status" ? line.text : w(`screen.errandCard.${line.kind}`)}
              </div>
            ))}
        </div>
      )}
      <RoomView me={me} v={v} />
      <MoreBelow m={m} />
    </aside>
  );
}

/** One cluster in the room: a group's overlapping tokens, or a private pair's two joined ones. (Top level, so a re-render keeps its elements, and with them hover and focus.) */
function RoomStack({ names, pair }: { names: string[]; pair?: boolean }) {
  return (
    <li className={`cluster${pair ? " pair" : ""}`} data-cluster={pair ? "private" : "group"}>
      <span className="stack">
        {names.map((n, i) => (
          <span key={n} className="stack-item">
            {pair && i > 0 && <span className="joint" aria-hidden="true" />}
            <PortraitButton name={n} hintKey={pair ? "roomPair" : "roomToken"} />
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
 * state's `places` (TD v0.49: the other occupied places; the place list itself is Interface's, #132), or its
 * `room` before v0.49, the same data as the AI guests' room line; during midnight and between seats there's
 * no room, so only who's with the player.
 */
function RoomView({ me, v }: { me: string; v: View }) {
  const s = v.state;
  const room = roomOf(s);
  const hint = useHint();
  const list = placeList(v);
  if (list) return <PlaceList me={me} v={v} list={list} />;
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
                  <PortraitButton name={p} />
                  <Name name={p} />
                </li>
              ))
            ) : (
              <li className="muted">{w("screen.nobody")}</li>
            )}
          </ul>
        </div>
        {room && (room.groups.length > 0 || room.colloquios.length > 0) && (
          <ul className="clusters">
            {room.groups.map((g) => (
              <RoomStack key={g.join("|")} names={g} />
            ))}
            {room.colloquios.map((p) => (
              <RoomStack key={p.join("|")} names={p} pair />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/**
 * One place in the list (Interface v0.9): its name, which shows Lore's one-line description on hover (public,
 * so even with the explanations off), the marks for the player's own place and a private one, and the
 * portraits of whoever is there, overlapping until hovered. The place itself isn't a control: guests move
 * toward a person, never to a place. Every portrait selects its guest, the player's own included (Interface
 * v0.16): theirs selects them, and the right panel shows their own card. "You are here" sits on its own line.
 */
function PlaceRow({ place, heading, council }: { place: Place; heading: string; council: boolean }) {
  const h = useContext(HintsContext);
  const hint = useHint();
  const desc = placeDescription(place.name);
  const show = (e: { currentTarget: Element }) => desc && h.show(desc, e.currentTarget, true);
  return (
    <li className={`place${place.guests.length ? "" : " empty"}${place.own ? " own" : ""}${place.private ? " private" : ""}${council ? " council" : ""}`} data-place={place.name}>
      <span className="place-head">
        <span className="place-name" tabIndex={0} aria-description={desc || undefined} onMouseEnter={show} onMouseLeave={h.hide} onFocus={show} onBlur={h.hide}>
          {heading}
        </span>
        {place.private && <span className="door" role="img" aria-label={w("screen.places.private")} {...hint("placePrivate", { focusable: true })} />}
        {place.own && <span className="place-own">{w("screen.places.yours")}</span>}
      </span>
      {place.guests.length > 0 && (
        <span className="stack">
          {place.guests.map((n) => (
            <span key={n} className="stack-item">
              <PortraitButton name={n} hintKey={place.private ? "roomPair" : "roomToken"} />
            </span>
          ))}
        </span>
      )}
    </li>
  );
}

/** A place that keeps a row of its own (Interface v0.19): someone is there, or it's the player's own, or a secret conversation's. */
const occupied = (p: Place) => p.guests.length > 0 || p.own || p.private;

/** An empty place on the folded line (Interface v0.19): its name as the pack gives it, its description on hover. */
function EmptyPlace({ place }: { place: Place }) {
  const h = useContext(HintsContext);
  const desc = placeDescription(place.name);
  const show = (e: { currentTarget: Element }) => desc && h.show(desc, e.currentTarget, true);
  return (
    <span className="place empty" data-place={place.name}>
      <span className="place-name" tabIndex={0} aria-description={desc || undefined} onMouseEnter={show} onMouseLeave={h.hide} onFocus={show} onBlur={h.hide}>
        {place.name}
      </span>
    </span>
  );
}

/**
 * The place list (Interface v0.9, Left: The places; TD v0.49), in place of the room's clusters: every place in
 * the pack's order, always shown, empty ones faded, so the list never shifts. In a council only the player's
 * own place shows, headed with their faction. Outside a conversation the list gives way to a quiet line. The
 * dead aren't in the state's places.
 */
function PlaceList({ me, v, list }: { me: string; v: View; list: Place[] }) {
  const hint = useHint();
  const c = v.state?.conversation;
  const heading = (p: Place) => (c?.kind === "council" ? w("screen.placeLine.council", { faction: c.faction ?? guest(me)?.faction ?? "", place: p.name }) : placeHeading(p.name));
  return (
    <>
      <div className="label" {...hint("places", { focusable: true })}>
        {w("screen.places.title")}
      </div>
      <div className="room places-view">
        {list.length ? (
          <ul className="places">
            {list.filter(occupied).map((p) => (
              <PlaceRow key={p.name} place={p} heading={heading(p)} council={c?.kind === "council"} />
            ))}
            {/* Interface v0.19: the empty places fold into one faded line after them, in the pack's order, each name keeping its description on hover. */}
            {list.some((p) => !occupied(p)) && (
              <li className="places-empty">
                <span className="places-empty-label">{w("screen.places.empty")}</span>{" "}
                {list
                  .filter((p) => !occupied(p))
                  .map((p, i, all) => (
                    <Fragment key={p.name}>
                      <EmptyPlace place={p} />
                      {i < all.length - 1 && w("screen.places.emptySep")}
                    </Fragment>
                  ))}
              </li>
            )}
          </ul>
        ) : (
          <div className="places-quiet muted">{w("screen.places.quiet")}</div>
        )}
      </div>
    </>
  );
}

/**
 * The conversation line (Interface v0.9): with named places (TD v0.49), it names the player's own place
 * ("In the loggia with …", "In the study, aside with …", "The Medici council, in the study"); without one
 * (an older game, or between seats), the conversation as before.
 */
const conversationLabel = (s: State | null, me: string) => {
  const own = ownPlace(s);
  const c = s?.conversation;
  if (s && own && c && c.kind !== "gathering") {
    if (c.kind === "council") return w("screen.placeLine.council", { faction: c.faction ?? guest(me)?.faction ?? "", place: own.name });
    if (c.kind === "colloquio") return w("screen.placeLine.colloquio", { place: own.name, other: c.other });
    return s.present.length ? w("screen.placeLine.group", { place: own.name, others: names(s.present) }) : w("screen.placeLine.alone", { place: own.name });
  }
  return roomLabel(s);
};
const roomLabel = (s: State | null) =>
  !s ? "" : s.conversation.kind === "capannello" ? (s.present.length ? w("screen.capannello", { others: names(s.present) }) : w("screen.alone")) : s.conversation.kind === "colloquio" ? w("screen.colloquio", { other: s.conversation.other }) : w("screen.alone");

/** One line for an earlier conversation in this stage: where. */
const earlierLabel = (seg: Segment, me: string) => w("screen.earlier.item", { where: conversationLabel(seg.state, me) });

function Centre({ me, v, send, dead, status, boxFill, initialPast = null, onEntry = () => {} }: { me: string; v: View; send: Send; dead: boolean; status: string; boxFill: BoxFill | null; initialPast?: string | null; onEntry?: (id: string) => void }) {
  const end = useRef<HTMLDivElement>(null);
  const stream = useRef<HTMLDivElement>(null);
  const hint = useHint();
  const { sel, clear } = useContext(SelContext);
  /** The conversation's own space, between the stage bar and Il Notaio's hint: his hint folds itself to keep it tall enough. */
  const area = useRef<HTMLDivElement>(null);
  /** The past stage open in the chat window (Interface v0.5, Past stages), read-only; null for the current stage. */
  const [past, setPast] = useState<string | null>(initialPast);
  // Il Notaio's summary over a past stage (Interface v0.13): expanded when a stage opens; a click in the
  // window folds it to the foot, and a click on it brings it back.
  const [covered, setCovered] = useState(true);
  useEffect(() => setCovered(true), [past]);
  // Interface v0.16: a refusal is explained by Il Notaio, in his hint, until the player types again.
  const [typedAt, setTypedAt] = useState(0);
  const refused = v.refusal && v.refusal.seq > typedAt ? refusalLine(v) : null;
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
              {conversationLabel(v.state, me)}
            </span>
            {canEnd && (
              <button className="end" onClick={() => send({ type: "end" })} {...hint("end")}>
                {w("screen.input.end")}
              </button>
            )}
          </div>
        </div>
        {/* The connection's state in the header, so the stream doesn't move when it changes. */}
        {status !== "open" && <div className="notice status">{w(status === "closed" ? "screen.reconnecting" : "screen.connecting")}</div>}
      </header>
      <div className="stream-area" ref={area}>
      <div className={`stream${past && covered && summaryFor(v, past) ? " behind" : ""}`} ref={stream} onClick={sel ? deselectOnBackground(clear) : undefined} onClickCapture={past && covered ? (e) => (e.stopPropagation(), e.preventDefault(), setCovered(false)) : undefined}>
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
                        <span>{earlierLabel(r, me)}</span>
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
            </>
          )}
        </Boundary>
        <div ref={end} />
      </div>
      {past && (
        <Boundary panel="summary" fallback={() => null}>
          <PastSummary key={past} stage={past} v={v} me={me} expanded={covered} onToggle={() => setCovered(!covered)} onEntry={onEntry} />
        </Boundary>
      )}
      </div>
      {/* Interface v0.16: his hint steps aside while an earlier stage is open; his summary is already there. */}
      {!past && (
        <Boundary panel="hint">
          <NotaioHint me={me} v={v} refused={refused} room={area} />
        </Boundary>
      )}
      {!dead && (
        <Boundary panel="input" fallback={(n) => <div className="input">{n}</div>}>
          {/* Interface v0.16: a decision card takes the message box's place, in the same floating card. */}
          <InputBox me={me} v={v} send={send} card={card ? <Card req={card} send={send} me={me} /> : null} fill={boxFill} past={!!past} onReturn={() => setPast(null)} canEnd={canEnd} onEnd={() => send({ type: "end" })} onType={() => setTypedAt(v.refusal?.seq ?? 0)} />
        </Boundary>
      )}
    </main>
  );
}

/**
 * Il Notaio's plain line for a refusal (Interface v0.16, Commands): a refused command's specific reason, in
 * the setting pack's words (screen.notaioRefusal), worked out as the command menu works out its reasons; or
 * the game's own reason, then where to look. Anything else refused (a line too long) is the game's reason alone.
 */
function refusalLine(v: View): string {
  const r = v.refusal!;
  const why = refusalWhy(v, allCommands());
  if (!why) return r.reason;
  return w(`screen.notaioRefusal.${why.why}`, { command: why.command.name, amount: payrollSize(v) ?? "", reason: r.reason });
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
    <section className="past-stage" data-stage={stage} aria-label={tc(stage)}>
      <div className="label" {...hint("pastStage", { focusable: true })}>
        {wt("screen.pastStage.heading", { stage })}
      </div>
      {runs.length ? (
        runs.map((r) => (
          <div className="past-conv" key={r.lines[0]!.id}>
            <div className="past-where muted">{conversationLabel(r.state, me)}</div>
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
 * Il Notaio's summary of a past stage (Interface v0.13, Past stages; Technical Design v0.51, Past-stage
 * summaries): over the chat window, from a strip of dialogue under the bar down to the input box. Bullets
 * grouped by conversation, each group under its conversation line: lines in his register, events as their
 * own record lines, and public notes. Clicking in the window minimizes it to the foot, still showing its
 * first lines; clicking it expands it again. Until the game has written it (or on a TD before v0.51), the
 * stage opens on its dialogue alone.
 */
function PastSummary({ stage, v, me, expanded, onToggle, onEntry }: { stage: string; v: View; me: string; expanded: boolean; onToggle: () => void; onEntry: (id: string) => void }) {
  const hint = useHint();
  const summary = summaryFor(v, stage);
  if (!summary) return null;
  return (
    <aside className="reading past-summary" data-state={expanded ? "expanded" : "minimized"} role="button" aria-expanded={expanded} onClick={onToggle} onKeyDown={toggleKeys(onToggle)} {...hint("pastSummary", { focusable: true })}>
      <div className="reading-head">
        <span className="notaio-title">
          <Narrated template={w("screen.pastStage.summaryTitle")} />
        </span>
        <span className="notaio-toggle">{w(expanded ? "screen.notaioHint.hide" : "screen.notaioHint.show")}</span>
      </div>
      {summary.empty && <p className="reading-text tally">{summary.empty}</p>}
      {summary.groups.map((g) => {
        const run = runFrom(v, g.from);
        return (
          <section className="summary-group" key={g.from} data-conversation={g.conversation}>
            <div className="summary-where">{conversationLabel(run?.state ?? null, me)}</div>
            <ul className="summary-items">
              {g.items.map((item, i) => (
                <li key={i} className={`summary-item ${item.kind}`}>
                  <ReadingItem item={item} onEntry={onEntry} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </aside>
  );
}

/** Enter and Space on a box that toggles. */
const toggleKeys = (toggle: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    toggle();
  }
};

/**
 * One item of his reading or summary (TD v0.51): his sentence; an event as its own record line (a death in the
 * screen's words); or code's public note, set apart in a smaller style, its title opening the entry.
 */
function ReadingItem({ item, onEntry }: { item: NotaioItem; onEntry: (id: string) => void }) {
  const hint = useHint();
  if (item.kind === "sentence") return <span className="reading-sentence">{item.text}</span>;
  if (item.kind === "event") return <span className={`reading-event ${item.item}`}>{item.item === "death" ? w("screen.web.died", { name: item.text }) : item.text}</span>;
  return (
    <span className="reading-note">
      <button className="lore-link" onClick={(e) => (e.stopPropagation(), onEntry(item.entry))} {...hint("readingNote")}>
        {item.title}
      </button>
      {w("screen.reading.noteSep")}
      {item.text}
    </span>
  );
}

/**
 * The stage bar (Interface v0.5; reworked v0.16): a standard step bar. A circle per stage, joined by lines
 * that share out the room, done ones filled, future ones outlined, the current one an oval holding its name
 * with no number. Hovering changes nothing in the row: a tooltip under it shows the hovered stage's name, its
 * description, and, with the explanations on, its explanation. It waits a moment before the first tooltip,
 * then switches at once between neighbours while one is showing; focus shows it at once. No motion. Past
 * stages open read-only when clicked, the current one returns, and future ones can't be opened. With a guest
 * selected, a dot marks each past stage they appear in; from a past stage while the game waits for the
 * player, the current stage beckons. The errand's deadline mark stays on its stage (TD v0.47).
 */
function StageBar({ stages, now, deadline, open, beckon, dots, onOpen }: { stages: string[]; now: string | undefined; deadline: string | null; open: string | null; beckon: boolean; dots: Set<string> | null; onOpen: (stage: string | null) => void }) {
  const hint = useHint();
  const hints = useContext(HintsContext);
  /** The stage whose tooltip shows, and where its middle is along the bar. */
  const [tip, setTip] = useState<{ stage: string; at: number } | null>(null);
  const [left, setLeft] = useState<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const wait = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showing = useRef(false);
  showing.current = !!tip;
  const still = () => {
    if (wait.current) clearTimeout(wait.current);
    wait.current = null;
  };
  useEffect(() => still, []);
  const show = (stage: string, el: Element, atOnce: boolean) => {
    const set = () => {
      const b = wrap.current?.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      if (b) setTip({ stage, at: r.left + r.width / 2 - b.left });
    };
    still();
    if (atOnce || showing.current) set();
    else wait.current = setTimeout(set, themeMs("--stage-tip-delay", 350));
  };
  const away = () => {
    still();
    setTip(null);
  };
  // Under the hovered stage, kept inside the bar's own width.
  useLayoutEffect(() => {
    const c = card.current;
    const b = wrap.current;
    if (!tip || !c || !b) return setLeft(null);
    const half = c.offsetWidth / 2;
    setLeft(Math.max(half, Math.min(tip.at, b.clientWidth - half)));
  }, [tip]);
  if (!stages.length)
    return (
      <div className="phase" {...hint("track", { focusable: true })}>
        {now}
      </div>
    );
  const marks = trackMarks(stages, now, deadline);
  const tipped = tip ? marks.find((m) => m.stage === tip.stage) : undefined;
  const explain = (m: { stage: string; at: "past" | "now" | "next" }) => ({ key: m.at === "past" ? "trackPast" : m.at === "now" ? "trackNow" : "trackNext", text: w(`screen.hints.${m.at === "past" ? "trackPast" : m.at === "now" ? "trackNow" : "trackNext"}`, { stage: m.stage }) });
  return (
    <div className="stage-bar-wrap" ref={wrap} onMouseLeave={away}>
      <ol className="track stage-bar" aria-label={w("screen.hints.track")}>
        {marks.map((m, i) => {
          const x = explain(m);
          // The tooltip under the row carries the explanation, so the stage has no hover explanation of its own.
          const on = {
            "aria-description": x.text,
            "data-hint": x.key,
            onMouseEnter: (e: { currentTarget: Element }) => show(m.stage, e.currentTarget, false),
            onFocus: (e: { currentTarget: Element }) => show(m.stage, e.currentTarget, true),
            onBlur: away,
          };
          const inner = m.at === "now" ? <span className="stage-name">{tc(m.stage)}</span> : <span className="num">{i + 1}</span>;
          const classes = ["mark", m.at, m.deadline && "deadline", m.stage === open && "open", m.at === "now" && beckon && "beckon"].filter(Boolean).join(" ");
          return (
            <li key={m.stage} className={classes} data-stage={m.stage} aria-label={tc(m.stage)} aria-current={m.at === "now" ? "step" : undefined}>
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
      {tipped && (
        <div ref={card} className={`stage-tip${left === null ? " measuring" : ""}`} role="tooltip" data-stage={tipped.stage} style={left === null ? undefined : { left }}>
          <div className="stage-tip-name">{tc(tipped.stage)}</div>
          {stageDescription(tipped.stage) && <div className="stage-tip-desc">{stageDescription(tipped.stage)}</div>}
          {hints.on && <div className="stage-tip-hint">{explain(tipped).text}</div>}
        </div>
      )}
    </div>
  );
}

/**
 * A line's text, with public lore entries' names as links that open the entry on the right, and glossary words
 * with a faint dotted underline that shows their definition on hover (Interface v0.7): not a link, and a lore
 * link wins where a word is both.
 */
function Linked({ text, lore }: { text: string; lore: LoreEntry[] }) {
  const s = useContext(SelContext);
  const hint = useHint();
  return (
    <>
      {lineParts(text, lore, getInfo()?.glossary ?? []).map((p, i) =>
        typeof p === "string" ? (
          p
        ) : "gloss" in p ? (
          <Gloss key={i} entry={p.gloss} text={p.text} />
        ) : (
          <button key={i} className={`lore-link${s.sel?.kind === "lore" && s.sel.entry.id === p.entry.id ? " selected" : ""}`} onClick={() => s.lore(p.entry)} {...hint("loreLink")}>
            {p.text}
          </button>
        ),
      )}
    </>
  );
}

/** A glossary word in a line: underlined, its definition on hover or focus, even with the explanations off. */
function Gloss({ entry, text }: { entry: GlossEntry; text: string }) {
  const h = useContext(HintsContext);
  const def = `${entry.term}: ${entry.text}`;
  return (
    <span className="gloss" tabIndex={0} data-gloss={entry.term} aria-description={def} onMouseEnter={(e) => h.show(def, e.currentTarget, true)} onMouseLeave={h.hide} onFocus={(e) => h.show(def, e.currentTarget, true)} onBlur={h.hide}>
      {text}
    </span>
  );
}

function StreamLine({ l, me, lore }: { l: Line; me: string; lore: LoreEntry[] }) {
  const { sel } = useContext(SelContext);
  if (l.item === "notaio")
    return (
      <div className="ln notaio" data-line={l.id}>
        <span className="sp">
          <NarratorName />
        </span>{" "}
        <span className="tx">
          <Linked text={l.text} lore={lore} />
        </span>
      </div>
    );
  if (l.item === "action")
    return (
      <div className={`ln action${l.private ? " private" : ""}`} data-line={l.id}>
        {l.private && <span className="sp">{w("screen.private")} </span>}
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
      <span className="sp">{l.you ? w("screen.you") : <Name name={l.speaker!} />}</span>{" "}
      {l.addressee && <span className="to">{toYou ? w("screen.toYou") : w("screen.to", { name: l.addressee })} </span>}
      <span className="tx">
        <Linked text={l.text} lore={lore} />
      </span>
    </div>
  );
}

/**
 * Il Notaio's hint (TD v0.40): a line or two for the moment, docked under the stream, and collapsible.
 * Interface v0.16: whenever he says something new, his box flashes (a brief glow in the accent) and the new
 * words fade in. A refused command gets its reason here (`refused`), in place of his usual line, and his box
 * opens if it was folded; his usual line comes back once the player types again, without a flash.
 */
function NotaioHint({ me, v, refused = null, room }: { me: string; v: View; refused?: string | null; /** The conversation above it (Interface v0.17): in a short window his hint folds itself to keep it at least --stream-min-height tall. */ room?: RefObject<HTMLElement | null> }) {
  const hint = useHint();
  // Whether there's room for his words: folded by itself when the conversation would have less than its least
  // height, and open again by itself once it would keep that with his words back, unless the player has folded
  // or opened it in the meantime.
  const [fits, setFits] = useState(true);
  const words = useRef<HTMLParagraphElement>(null);
  /** How much height his words took when last open. */
  const took = useRef(0);
  const fold = useSelfFold(fits);
  const open = fold.open;
  const setOpen = fold.set;
  useLayoutEffect(() => {
    const el = room?.current;
    if (!el) return;
    const check = () => {
      const least = themeMs("--stream-min-height", 200);
      const have = el.getBoundingClientRect().height;
      const mine = words.current?.getBoundingClientRect().height;
      if (mine) took.current = mine;
      setFits((was) => (words.current ? have >= least : was ? true : have - took.current >= least));
    };
    check();
    if (typeof ResizeObserver === "undefined") return;
    const on = perFrame(check);
    const watch = new ResizeObserver(on.run);
    watch.observe(el);
    return () => {
      watch.disconnect();
      on.cancel();
    };
  }, [open]);
  // His usual line is the moment's; a refusal is his to explain here, so it isn't a moment of its own.
  const m = hintMoment(v.refusal ? { ...v, refusal: null } : v, me);
  const usual = notaioHint(m.key, m.values);
  const text = refused ?? usual;
  /** How many times he has said something new since the screen opened: restarts the flash and the fade. */
  const [fresh, setFresh] = useState(0);
  const said = useRef({ text, usual });
  useEffect(() => {
    const was = said.current;
    said.current = { text, usual };
    if (text === was.text) return;
    if (refused && !open) setOpen(true);
    // Back to the line he gave before a refusal: nothing new, so no flash.
    else if (text === was.usual) return;
    setFresh((n) => n + 1);
  }, [text]);
  return (
    <aside className={`notaio-hint${open ? "" : " collapsed"}`} data-fold={fold.chosen ? "chosen" : "auto"}>
      {fresh > 0 && <span key={fresh} className="hint-glow" aria-hidden="true" />}
      <button className="hint-head" aria-expanded={open} onClick={() => setOpen(!open)} {...hint("notaioHint")}>
        <span className="notaio-title">
          <Narrated template={w("screen.notaioHint.title")} />
        </span>
        <span className="notaio-toggle">{w(open ? "screen.notaioHint.hide" : "screen.notaioHint.show")}</span>
      </button>
      {open && (
        <p key={fresh} ref={words} className={`hint-text${fresh > 0 ? " fresh" : ""}`} data-moment={refused ? "refusal" : m.key}>
          {text}
        </p>
      )}
    </aside>
  );
}

/** The right panel's width (TD v0.44): dragged by its handle, within theme.css's limits, remembered in the browser. */
const WIDTH_KEY = "player-screen.right-width";

function useRightWidth(layout: RefObject<HTMLDivElement | null>, onHide: () => void) {
  const css = () => getComputedStyle(document.documentElement);
  const px = (t: string, d: number) => parseFloat(css().getPropertyValue(t)) || d;
  const limits = () => ({ min: px("--right-min", 220), max: px("--right-max", 560) });
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
  /**
   * Interface v0.16: dragging well past the narrowest hides the panel, as its hide control does; while the
   * drag is past that point the panel fades, to show what letting go will do. The handle keeps the pointer
   * for the whole drag, so letting go anywhere, even off the window, finishes it.
   */
  return (e: { clientX: number; pointerId: number; currentTarget: HTMLElement; preventDefault: () => void }) => {
    e.preventDefault();
    const handle = e.currentTarget;
    const panel = layout.current?.querySelector(".side.right");
    const start = { x: e.clientX, width: panel?.getBoundingClientRect().width ?? 0 };
    const hideAt = limits().min - px("--right-hide-past", 60);
    let width = start.width;
    let hiding = false;
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {
      // No capture (an older browser): the drag still ends on a release over the page.
    }
    const move = (m: PointerEvent) => {
      const raw = start.width + start.x - m.clientX;
      hiding = raw < hideAt;
      panel?.classList.toggle("hiding", hiding);
      width = apply(raw);
    };
    const ends = ["pointerup", "pointercancel", "lostpointercapture"];
    const done = () => {
      handle.removeEventListener("pointermove", move);
      for (const x of ends) handle.removeEventListener(x, done);
      panel?.classList.remove("hiding");
      if (hiding) {
        // Hidden: the width it had before the drag is the one it comes back at.
        apply(start.width);
        onHide();
        return;
      }
      try {
        localStorage.setItem(WIDTH_KEY, String(width));
      } catch {
        // The width lasts until the page closes.
      }
    };
    handle.addEventListener("pointermove", move);
    for (const x of ends) handle.addEventListener(x, done);
  };
}

/**
 * Whether the right panel is hidden (Interface v0.5): the player's own choice, remembered in the browser.
 * Interface v0.17: until they've made one, it starts folded to its strip in a window narrower than the fold
 * limit, so the conversation keeps room for the stage bar, and comes back when there's room; it can still be
 * opened. `reopened`: it has been brought back from its strip, so the card that was showing is simply there.
 */
const RIGHT_HIDDEN_KEY = "player-screen.right-hidden";

function useRightHidden(initial?: boolean) {
  const [chosen, setHidden] = useState<boolean | null>(() => {
    if (initial !== undefined) return initial;
    try {
      const saved = globalThis.localStorage?.getItem(RIGHT_HIDDEN_KEY);
      return saved === "hidden" ? true : saved === "shown" ? false : null;
    } catch {
      return null;
    }
  });
  const width = useWindowWidth();
  const hidden = chosen ?? (width !== null && width < themeMs("--break-right-fold", 1044));
  const was = useRef(hidden);
  const [reopened, setReopened] = useState(false);
  useEffect(() => {
    if (was.current && !hidden) setReopened(true);
    was.current = hidden;
  }, [hidden]);
  return {
    hidden,
    reopened,
    set: (h: boolean) => {
      if (!h) setReopened(true);
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

/**
 * A guest's public card: portrait, name, subtitle, and the public lines everyone knows. No faction line above
 * the subtitle (Interface v0.16): the subtitle already opens with the faction. On the "talking with" card the
 * portrait selects them (`selects`), as portraits do everywhere. The player's own card (`self`) carries a
 * small "You" tag under the name.
 *
 * Interface v0.19: fuller, all public, from the setting pack: a short description, "Their faction wins if" in the
 * rules' words, "Known to all" as before, and "In the city", links to the public entries that concern them, each
 * opening here with Back returning to the guest. A row whose words the pack lacks is left out. The portrait,
 * name, and You tag stay put while the card scrolls; the subtitle and everything after slide under them.
 */
function PublicCard({ who, v, selects, self }: { who: string; v: View; selects?: boolean; self?: boolean }) {
  const g = guest(who);
  const s = useContext(SelContext);
  const hint = useHint();
  const known = (v.sheet?.connections ?? []).filter((c) => !c.private && c.between.includes(who));
  const description = guestDescription(who);
  const wins = g ? factionWins(g.faction) : "";
  const city = (v.sheet?.lore ?? []).filter((e) => cityGuests(e.id).includes(who));
  return (
    <>
      <div className="who column">
        {selects ? <PortraitButton name={who} large /> : <Portrait name={who} large />}
        <div className="name">{who}</div>
        {self && <div className="you-tag">{w("screen.right.youTag")}</div>}
      </div>
      <div className="muted card-subtitle">{g?.subtitle}</div>
      {description && <p className="card-description">{description}</p>}
      {wins && (
        <>
          <div className="label">{w("screen.right.factionWins")}</div>
          <p className="card-wins">{wins}</p>
        </>
      )}
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
      {city.length > 0 && (
        <>
          <div className="label">{w("screen.right.inCity")}</div>
          <ul className="card-city">
            {city.map((e) => (
              <li key={e.id}>
                <button className="lore-link" data-lore={e.id} onClick={() => s.lore(e)} {...hint("loreLink")}>
                  {tc(e.title)}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/** What covers the "talking with" card: a selected guest, or a lore entry. */
type Over = string | LoreEntry;
const overKey = (o: Over) => (typeof o === "string" ? `guest:${o}` : `lore:${o.id}`);

/**
 * The cards over the "talking with" card (Interface v0.7): the one shown now, and any sliding back down.
 * Deselecting slides the card down, however it's done; switching slides the current one down and the new
 * one up right behind it. A card that's gone is kept until its slide (or, with reduced motion, its fade) ends.
 */
function useCoverCards(over: Over | null) {
  const key = over ? overKey(over) : null;
  const [st, setSt] = useState<{ key: string | null; cur: Over | null; leaving: Over[] }>({ key, cur: over, leaving: [] });
  // Worked out as the selection changes, before anything is drawn, so a new card knows it comes up behind another.
  if (st.key !== key) {
    const leaving = st.leaving.filter((x) => overKey(x) !== key && (!st.cur || overKey(x) !== overKey(st.cur)));
    if (st.cur) leaving.push(st.cur);
    setSt({ key, cur: over, leaving });
  }
  return { leaving: st.leaving, gone: (o: Over) => setSt((x) => ({ ...x, leaving: x.leaving.filter((y) => overKey(y) !== overKey(o)) })) };
}

/** One card over the "talking with" card: a selected guest's plain raised card, or a lore entry. */
function CoverCard({ over, v, me, leaving, follows, still, onGone, onWeb }: { over: Over; v: View; me: string; leaving?: boolean; follows?: boolean; /** Already showing when the panel came back: no slide. */ still?: boolean; onGone?: () => void; onWeb: (guest: string | null) => void }) {
  const hint = useHint();
  const { back, clear, guest: select } = useContext(SelContext);
  // Interface v0.19: each card scrolls on its own, with More Below when it runs past the bottom.
  const m = useMoreBelow();
  // Whether it came up behind another sliding down, fixed when it first shows, so its slide never restarts.
  const [behind] = useState(!!follows);
  const isGuest = typeof over === "string";
  // Interface v0.16: the player's own card says "This is you", with a "You" tag and an accent edge all the way round.
  const self = isGuest && over === me;
  return (
    <section
      ref={m.ref}
      className={`person look${self ? " self" : ""}${leaving ? " leaving" : ""}${behind && !leaving ? " follows" : ""}${still && !leaving ? " still" : ""}`}
      data-guest={isGuest ? over : undefined}
      aria-hidden={leaving || undefined}
      inert={leaving || undefined}
      onAnimationEnd={leaving ? (e) => e.target === e.currentTarget && onGone?.() : undefined}
    >
      <header className="person-head">
        <span className="label" {...hint(self ? "lookingAtSelf" : isGuest ? "lookingAt" : "loreEntry", { focusable: true })}>
          {w(self ? "screen.right.lookingAtSelf" : isGuest ? "screen.right.lookingAt" : "screen.right.lore")}
        </span>
        {isGuest ? (
          <button className="icon close" aria-label={w("screen.close")} onClick={clear} {...hint("deselect")}>
            {w("screen.right.deselect")}
          </button>
        ) : (
          <button className="secondary" onClick={back} {...hint("back")}>
            {w("screen.right.back")}
          </button>
        )}
      </header>
      {isGuest ? (
        <>
          <PublicCard who={over} v={v} self={self} />
          <div className="buttons">
            <button className="secondary" onClick={() => onWeb(over)} {...hint("openWeb")}>
              {w("screen.right.openWeb")}
            </button>
          </div>
        </>
      ) : (
        // Interface v0.19: its title centred, staying put while the words slide under it; at its end, the guests it concerns, each selecting them.
        <div className="lore-entry" data-lore={over.id}>
          <h3>{tc(over.title)}</h3>
          <p>{over.text}</p>
          {cityGuests(over.id).length > 0 && (
            <>
              <div className="label">{w("screen.right.concerns")}</div>
              <ul className="lore-guests">
                {cityGuests(over.id).map((n) => (
                  <li key={n}>
                    <button className="guest-chip" data-guest={n} onClick={() => select(n)} {...hint("select")}>
                      <Portrait name={n} small />
                      <span className="name">{n}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <MoreBelow m={m} />
    </section>
  );
}

/**
 * Interface v0.20: the hide control is centred over a covering card's close button. The card lays its close button out
 * at its own side margin, inside its right border and any scrollbar the system shows; this hands the panel that inset
 * (`--cover-inset`) for the top card (the covering one, or the "talking with" card when nothing covers it), measured
 * after each render and as the card resizes, at most once a frame, and written only when it changes.
 */
function useCoverInset(aside: RefObject<HTMLElement | null>) {
  const frame = useRef<ReturnType<typeof perFrame> | null>(null);
  const seen = useRef<Element | null>(null);
  const resize = useRef<ResizeObserver | null>(null);
  useEffect(() => {
    const measure = () => {
      const el = aside.current;
      if (!el) return;
      const card = el.querySelector(".person.look:not(.leaving)") ?? el.querySelector(".person.talk");
      if (!(card instanceof HTMLElement)) return;
      if (seen.current !== card) {
        resize.current?.disconnect();
        if (typeof ResizeObserver !== "undefined") {
          resize.current = new ResizeObserver(() => frame.current?.run());
          resize.current.observe(card);
        }
        seen.current = card;
      }
      const inset = `${Math.max(0, card.offsetWidth - card.clientWidth - parseFloat(getComputedStyle(card).borderLeftWidth || "0"))}px`;
      if (el.style.getPropertyValue("--cover-inset") !== inset) el.style.setProperty("--cover-inset", inset);
    };
    frame.current = perFrame(measure);
    return () => {
      frame.current?.cancel();
      resize.current?.disconnect();
      seen.current = null;
    };
  }, []);
  useEffect(() => frame.current?.run());
}

/**
 * Right: whoever you're looking at (TD v0.44–v0.45). Two kinds of card, never confused: the live "Talking
 * with" card, in the conversation's tint, with a dot while that guest speaks and the group's other tokens;
 * and over it, a selected guest's plain raised "Looking at" card (or a lore entry), which slides up and
 * leaves the talking card's header in view, one click from going back. The panel's left edge resizes it.
 * Clicking the panel's empty background deselects (Interface v0.7).
 */
function Right({ me, v, onWeb, onHide, layout, reopened = false }: { me: string; v: View; onWeb: (guest: string | null) => void; onHide: () => void; layout: RefObject<HTMLDivElement | null>; /** The panel was brought back from its strip (Interface v0.17): the card that was showing doesn't slide up again. */ reopened?: boolean }) {
  const s = v.state;
  const hint = useHint();
  const { sel, clear } = useContext(SelContext);
  const drag = useRightWidth(layout, onHide);
  // TD v0.46: whoever has the player's ear (the other guest in a Colloquio; in a group, the last address
  // either way), or no one; never just the group's last speaker.
  const talk = talkingWith(v, me);
  const over: Over | null = sel?.kind === "guest" ? sel.name : sel?.kind === "lore" ? sel.entry : null;
  const cards = useCoverCards(over);
  const filled = !!talk && talk !== me;
  // The card showing as the panel comes back is simply there; one selected after that slides up as always.
  const [there] = useState(() => (reopened && over ? overKey(over) : null));
  // Interface v0.19: the "talking with" card scrolls on its own, with More Below.
  const m = useMoreBelow();
  const aside = useRef<HTMLElement>(null);
  useCoverInset(aside);
  // Interface v0.20: the card that slides up stops in one place, whether or not someone has the player's ear (app.css).
  return (
    <aside ref={aside} className={`side right${over ? " covered" : ""}`} onClick={over ? deselectOnBackground(clear) : undefined}>
      <div className="resize" role="separator" aria-orientation="vertical" onPointerDown={drag} {...hint("resize", { focusable: true })} />
      {/* Interface v0.5: hides the panel to a thin strip with a handle, and the chat widens. */}
      <button className="right-hide" aria-label={w("screen.right.hideLabel")} onClick={onHide} {...hint("hideRight")}>
        {w("screen.right.hide")}
      </button>
      <section className="person talk" data-guest={talk ?? undefined} ref={m.ref}>
        {/* Covered, the header stays in view and goes back to the conversation; uncovered, it's a label. Interface v0.20:
            the name of whoever has the player's ear shows beside "Talking with" either way. */}
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
            {talk && <span className="person-head-name">{talk}</span>}
          </div>
        )}
        {filled ? <PublicCard who={talk} v={v} selects /> : <p className="muted no-ear">{w("screen.right.noEar")}</p>}
        {/* Interface v0.16: no row of the other guests' tokens here; the places list shows who's with you. */}
        {/* Interface v0.7: only a filled card opens the web; the empty one has no button. */}
        {filled && (
          <div className="buttons">
            <button className="secondary" onClick={() => onWeb(talk)} {...hint("openWeb")}>
              {w("screen.right.openWeb")}
            </button>
          </div>
        )}
        <MoreBelow m={m} />
      </section>
      {(over || cards.leaving.length > 0) && (
        <div className="covers">
          {over && <CoverCard key={overKey(over)} over={over} v={v} me={me} follows={cards.leaving.length > 0} still={overKey(over) === there} onWeb={onWeb} />}
          {cards.leaving.map((o) => (
            <CoverCard key={`leaving:${overKey(o)}`} over={o} v={v} me={me} leaving onGone={() => cards.gone(o)} onWeb={onWeb} />
          ))}
        </div>
      )}
    </aside>
  );
}

// ---- The Web of Secrets (TD v0.40–v0.44): the web of relationships, what you heard and saw, notes, and Il Notaio's reading

type WebTab = "record" | "notes";

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
  onEntry = () => {},
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
  /** Opens a lore entry in The city (a note in Il Notaio's box, TD v0.51). */
  onEntry?: (id: string) => void;
}) {
  const info = getInfo();
  const hint = useHint();
  const [tab, setTab] = useState<WebTab>(initialTab);
  const [draft, setDraft] = useState("");
  // Interface v0.17: the key folds itself away when the drawing's space is too narrow for both, and comes back when
  // there's room, unless the player has folded or opened it themselves.
  const map = useRef<HTMLDivElement>(null);
  const mapWidth = useOwnWidth(map);
  const keyFold = useSelfFold(mapWidth === null || mapWidth >= themeMs("--break-web-key", 864));
  const keyOpen = keyFold.open;
  const setKeyOpen = keyFold.set;
  /** The side column opened over the web by its handle, in a web too narrow to hold both side by side. */
  const [sideOpen, setSideOpen] = useState(false);
  /** The key's row that's lit: a relationship type, or the "Secret" row (SECRET); it lights its lines and fades the rest. */
  const [keyType, setKeyType] = useState<string | null>(initialKey);
  /** The note groups folded under their headings, by their guests. */
  const [folded, setFolded] = useState<Set<string>>(() => new Set());
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
  const nameAt = webNames(info.roster, info.factions ?? []);
  const arcs = factionArcs(info.roster, info.factions ?? []);
  useReadingRequest(me, v, picked, open, send);
  const types = info.relationshipTypes ?? [];
  // Interface v0.16: one line per pair and type; the halo marks only the player's secret ties.
  const lines = useMemo(() => webLines(v.sheet?.connections ?? []), [v.sheet]);
  /** A line touches the selection when it joins a selected guest. With someone selected, every other line fades. */
  const touches = (guests: string[]) => picked.some((p) => guests.includes(p));
  const lit = (guests: string[]) => picked.length > 0 && picked.every((p) => guests.includes(p));
  const selOff = (guests: string[]) => (picked.length > 0 && !touches(guests) ? " sel-off" : "");
  const keyed = (l: { type: string; secret: boolean }) => (keyType === null ? "" : (keyType === SECRET ? l.secret : l.type === keyType) ? " key-on" : " key-off");
  const conclude = v.commands.find((c) => c.action === "conclude");
  const who = picked.length === 2 ? w("screen.web.between", { a: picked[0]!, b: picked[1]! }) : (picked[0] ?? "");
  const record = heardAndSaw(v, picked, me);
  const groups = noteGroups(v.notes);
  const groupKey = (g: string[]) => [...g].sort().join("|") || "free";
  const aboutLabel = (g: string[]) => (g.length === 2 ? w("screen.web.between", { a: g[0]!, b: g[1]! }) : (g[0] ?? w("screen.web.free")));
  // The selected guest's or pair's group, lit, comes into view.
  const notesBox = useRef<HTMLDivElement>(null);
  const pickedKey = groupKey(picked);
  useEffect(() => {
    if (tab === "notes" && picked.length) notesBox.current?.querySelector(".note-group.lit")?.scrollIntoView({ block: "nearest" });
  }, [pickedKey, tab]);
  // The drawing's frame is fitted to what's drawn, so the web draws as large as its space allows, centred;
  // Interface v0.19: with the key open, the drawing centres in the room between the key and the side column (its left
  // margin reaches past the key); folded, across the whole width.
  const svg = useRef<SVGSVGElement>(null);
  const drawn = useRef<SVGGElement>(null);
  const keyBox = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<string | null>(null);
  /** The drawing's left margin with the key open: from the map's left edge to just past the key. Null with the key folded. */
  const [keyRoom, setKeyRoom] = useState<number | null>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const g = drawn.current;
      const el = svg.current;
      const m = map.current;
      if (!g || !el || !m || typeof g.getBBox !== "function") return;
      const b = g.getBBox();
      if (!b.width || !b.height) return;
      const pad = 2;
      const next = [b.x - pad, b.y - pad, b.width + pad * 2, b.height + pad * 2].map((n) => Math.round(n * 10) / 10).join(" ");
      // Only a real change: the names' boxes shift by a hair as the drawing's scale changes, which mustn't refit it again
      // and again (a loop).
      const was = frame?.split(" ").map(Number);
      if (!was || next.split(" ").some((n, i) => Math.abs(Number(n) - was[i]!) > 0.5)) {
        if (next !== frame) return setFrame(next);
      }
      const k = keyOpen ? keyBox.current?.getBoundingClientRect() : null;
      const room = k ? Math.round(k.right - m.getBoundingClientRect().left + themeMs("--web-key-clear", 8)) : null;
      if (room !== keyRoom) setKeyRoom(room);
    };
    fit();
    if (typeof ResizeObserver === "undefined" || !map.current) return;
    const on = perFrame(fit);
    const watch = new ResizeObserver(on.run);
    watch.observe(map.current);
    if (keyBox.current) watch.observe(keyBox.current);
    return () => {
      watch.disconnect();
      on.cancel();
    };
  }, [frame, keyRoom, open, keyOpen, info.roster.length]);
  /** One note: clicking it selects its guest or pair (Interface v0.16); a free note selects no one. */
  const NoteItem = ({ n }: { n: Note }) => (
    <li className="note" key={n.id} data-note={n.id} onClick={n.guests.length ? () => selection.set(n.guests) : undefined} {...(n.guests.length ? hint("noteItem") : {})}>
      <span className="note-text">{n.text}</span>
      {/* Only a note on a guest or a pair can be a conclusion; a free note has no button (Interface v0.3). And only
          when the player's errand can be finished by one (TD v0.51's flag in their state; Interface v0.13). */}
      {n.guests.length > 0 && v.state?.knowledgeErrand === true && (
        <button className="secondary small conclude" disabled={!conclude || dead || boxClosed} onClick={(e) => (e.stopPropagation(), onConclude(`${conclude!.name} ${n.text}`))} {...hint(boxClosed && !dead ? "concludeWaiting" : "conclude")}>
          {w("screen.web.conclude")}
        </button>
      )}
    </li>
  );
  return (
    <>
      {open && <div className="web-backdrop" onClick={() => setOpen(false)} />}
      <section ref={dock} className={`web-dock${open ? " open" : ""}`} aria-label={w("screen.web.title")}>
        {/* Interface v0.7: one centered group, the arrow and the title, and only with someone selected, a dot and their small portraits and names. */}
        <button className="web-bar" aria-expanded={open} onClick={() => setOpen(!open)} {...hint("web")}>
          <span className="web-bar-group">
            <span className="web-bar-arrow" aria-hidden="true">
              {w(open ? "screen.web.shut" : "screen.web.open")}
            </span>
            <span className="web-bar-title">{w("screen.web.title")}</span>
            {picked.length > 0 && (
              <>
                <span className="web-bar-dot" aria-hidden="true">
                  {w("screen.web.barDot")}
                </span>
                <span className="web-bar-portraits">
                  {picked.map((p) => (
                    <Portrait key={p} name={p} small />
                  ))}
                </span>
                <span className="web-bar-sel">{who}</span>
              </>
            )}
          </span>
        </button>
        <div className="web" inert={!open}>
          <div className={`web-body${sideOpen ? " side-open" : ""}`}>
            <div className="web-map" ref={map} style={keyRoom === null ? undefined : { paddingLeft: keyRoom }}>
              <svg ref={svg} className="web-diagram" viewBox={frame ?? "-34 -8 168 116"} role="group" aria-label={w("screen.web.title")}>
                <g ref={drawn}>
                  {/* Interface v0.5: an arc in each faction's colour around its part of the ring. */}
                  <g className="faction-arcs">
                    {arcs.map((f) => (
                      <path key={f.faction} className="faction-arc" d={f.d} style={{ stroke: f.colour }} />
                    ))}
                  </g>
                  {lines.map((c, i) => {
                    const [a, b] = c.between.map((n) => at.get(n));
                    if (!a || !b) return null;
                    return (
                      <g key={`c${i}`} className="tie" data-type={c.type} data-between={[...c.between].sort().join("|")} data-secret={c.secret || undefined}>
                        {/* The halo marks a secret: one of the player's own ties that no public tie matches, under the type's line. */}
                        {c.secret && <path className={`edge-under${keyed(c)}${selOff(c.between)}`} d={curve(a, b)} />}
                        <path className={`edge rel-${c.type}${c.secret ? " yours" : ""}${lit(c.between) ? " on" : ""}${keyed(c)}${selOff(c.between)}`} d={curve(a, b)} />
                      </g>
                    );
                  })}
                  {v.notes
                    .filter((n) => n.guests.length === 2)
                    .map((n) => {
                      const [a, b] = n.guests.map((g) => at.get(g));
                      return a && b ? <path key={n.id} className={`edge note-line${lit(n.guests) ? " on" : ""}${keyType ? " key-off" : ""}${selOff(n.guests)}`} d={curve(a, b)} /> : null;
                    })}
                  {info.roster.map((r) => {
                    const p = at.get(r.name)!;
                    return (
                      <g key={r.name} data-guest={r.name} className={`node${picked.includes(r.name) ? " picked" : ""}${r.name === me ? " me" : ""}`} transform={`translate(${p.x} ${p.y})`} onClick={() => pick(r.name)} role="button" aria-pressed={picked.includes(r.name)} {...hint("webNode", { focusable: true })}>
                        <circle r={NODE_RADIUS} style={{ fill: r.colour }} />
                        <text className="node-initials" dy={1.2}>
                          {r.initials}
                        </text>
                      </g>
                    );
                  })}
                  {/* The names last, so no line or circle crosses them, each on a halo of the panel's colour: under
                      their circles, moved outward where two neighbours crowd (Interface v0.16). */}
                  <g className="labels">
                    {info.roster.map((r) => {
                      const p = nameAt.get(r.name)!;
                      return (
                        <text key={r.name} className={`node-name${r.name === me ? " me" : ""}`} x={p.x} y={p.y}>
                          {r.name}
                        </text>
                      );
                    })}
                  </g>
                  {/* Each faction's name in its colour, outside the middle of its arc: apart from the key, which is about lines. */}
                  <g className="factions">
                    {arcs.map((f) => (
                      // Interface v0.17: at its set hour; a long name on two lines, centred on that point.
                      <text key={f.faction} className="faction-label" data-faction={f.faction} x={f.x} y={round2(f.y - ((f.lines.length - 1) * FACTION_LINE) / 2)} textAnchor={f.anchor} style={{ fill: f.colour }} {...hint("faction", { focusable: true })}>
                        {f.lines.length === 1
                          ? f.faction
                          : f.lines.map((l, i) => (
                              <tspan key={i} x={f.x} dy={i ? FACTION_LINE : 0}>
                                {l}
                              </tspan>
                            ))}
                      </text>
                    ))}
                  </g>
                </g>
              </svg>
              {types.length > 0 && (
                <div ref={keyBox} className={`web-key${keyOpen ? " open" : ""}`}>
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
                      {/* Interface v0.16: the "Secret" row, with its halo swatch and a short line under it; selectable like the rest. */}
                      <li>
                        <button className={`key-type key-secret${keyType === SECRET ? " on" : ""}`} aria-pressed={keyType === SECRET} data-type={SECRET} onClick={() => setKeyType(keyType === SECRET ? null : SECRET)} {...hint("keyType")}>
                          <svg className="swatch" viewBox="0 0 12 4" aria-hidden="true">
                            <line className="edge-under" x1={0.8} y1={2} x2={11.2} y2={2} />
                            <line className="edge" x1={0.5} y1={2} x2={11.5} y2={2} />
                          </svg>
                          <span className="key-secret-words">
                            <span>{w("screen.web.keyYours")}</span>
                            <span className="key-covers">{w("screen.web.keyYoursCovers")}</span>
                          </span>
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              )}
            </div>
            {/* Interface v0.17: the side column's handle, along the web's right edge; shown only in a web too narrow for both. */}
            <button className="web-side-handle" aria-expanded={sideOpen} aria-label={w(sideOpen ? "screen.web.sideHideLabel" : "screen.web.sideShowLabel")} onClick={() => setSideOpen(!sideOpen)} {...hint("webSide")}>
              {w("screen.web.sideShow")}
            </button>
            <div className="web-side">
              <nav className="tabs">
                {(["record", "notes"] as const).map((t) => (
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
                  <RecordPane key={[...picked].sort().join("|")} box={<ReadingText me={me} v={v} picked={picked} onEntry={onEntry} />}>
                    {/* Interface v0.5: dialogue only, newest first: one guest's lines in your presence, or what a pair said to each other. */}
                    <div className="record">
                      <h3>{who}</h3>
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
                        // Interface v0.16: an empty pair says why.
                        <p className="muted record-none">{picked.length === 2 ? w("screen.web.nothingBetween", { a: picked[0]!, b: picked[1]! }) : w("screen.web.nothing")}</p>
                      )}
                    </div>
                  </RecordPane>
                ))}
              {tab === "notes" && (
                <div className="notes" ref={notesBox}>
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
                  {/* Interface v0.16: every note, always, grouped: each guest, then each pair, then free notes. A group
                      folds under its heading; its heading, or one of its notes, selects that guest or pair; the
                      selected one's group is lit and brought into view. */}
                  {groups.length === 0 && <p className="muted">{w("screen.web.none")}</p>}
                  {groups.map((g) => {
                    const key = groupKey(g.about);
                    const shut = folded.has(key);
                    const on = g.about.length > 0 && sameGuests(g.about, picked);
                    const toggle = () => {
                      const next = new Set(folded);
                      if (shut) next.delete(key);
                      else next.add(key);
                      setFolded(next);
                    };
                    return (
                      <div key={key} className={`note-group${on ? " lit" : ""}${shut ? " folded" : ""}`} data-group={key}>
                        <div className="label note-heading">
                          <button className="icon note-fold" aria-expanded={!shut} aria-label={w(shut ? "screen.web.unfold" : "screen.web.fold")} title={w(shut ? "screen.web.unfold" : "screen.web.fold")} onClick={toggle}>
                            {w(shut ? "screen.web.open" : "screen.web.shut")}
                          </button>
                          {g.about.length ? (
                            <button className="note-about" onClick={() => selection.set(g.about)} {...hint("noteItem")}>
                              {aboutLabel(g.about)}
                            </button>
                          ) : (
                            <span className="note-about">{aboutLabel(g.about)}</span>
                          )}
                          {shut && <span className="note-count">{g.notes.length}</span>}
                        </div>
                        {!shut && (
                          <ul className="note-list">
                            {g.notes.map((n) => (
                              <NoteItem n={n} key={n.id} />
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/** The key's "Secret" row (Interface v0.16), beside the relationship types: not a type's name, so it can't be mistaken for one. */
const SECRET = "*secret";

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
      send({ type: "select", guests: picked });
    }, 400);
    return () => clearTimeout(t);
  }, [open, key, !!have]);
}

/**
 * The reading's words. From TD v0.51 his guarded reading: the background, then tonight a paragraph per stage,
 * then the tally. Before it, the reading as it was, or the tally; or that he's considering.
 */
function ReadingText({ me, v, picked, onEntry = () => {} }: { me: string; v: View; picked: string[]; onEntry?: (id: string) => void }) {
  const have = readingFor(v, picked, me);
  if (have?.guarded) return <Guarded r={have.guarded} tally={have.tally} me={me} onEntry={onEntry} />;
  return (
    <p className={`reading-text${have?.text ? "" : " tally"}`} data-reading={have ? (have.text ? "reading" : "tally") : "waiting"}>
      {have ? (have.text ?? have.tally) : w("screen.reading.waiting")}
    </p>
  );
}

/** TD v0.51's reading, in the box (Interface v0.13): background, tonight stage by stage, then the tally. */
function Guarded({ r, tally, me, onEntry }: { r: GuardedReading; tally: string; me: string; onEntry: (id: string) => void }) {
  const hint = useHint();
  const between = (g: string[]) => (g.length === 2 ? w("screen.web.between", { a: g[0]!, b: g[1]! }) : (g[0] ?? ""));
  const bg = r.background;
  return (
    <div className="reading-text guarded" data-reading="guarded">
      {(bg.connections.length > 0 || bg.lore.length > 0) && (
        <p className="reading-background">
          {bg.connections.map((c, i) => (
            <span key={i} className={`reading-conn${c.private ? " yours" : ""}`}>
              {w("screen.reading.connection", { between: c.private ? (c.between.find((g) => g !== me) ?? between(c.between)) : between(c.between), line: c.line })}
              {c.private && <span className="muted"> {w("screen.web.yours")}</span>}{" "}
            </span>
          ))}
          {bg.lore.map((l) => (
            <span key={l.entry} className="reading-note">
              <button className="lore-link" onClick={(e) => (e.stopPropagation(), onEntry(l.entry))} {...hint("readingNote")}>
                {l.title}
              </button>
              {w("screen.reading.noteSep")}
              {l.text}{" "}
            </span>
          ))}
        </p>
      )}
      {r.stages.map((st) => (
        <p key={st.stage} className="reading-stage" data-stage={st.stage}>
          <span className="reading-stage-head">{st.heading}</span>{" "}
          {st.items.map((item, i) => (
            <Fragment key={i}>
              <ReadingItem item={item} onEntry={onEntry} />{" "}
            </Fragment>
          ))}
        </p>
      ))}
      {r.empty && <p className="reading-empty">{r.empty}</p>}
      <p className="reading-tally tally">{tally}</p>
    </div>
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
        <div className="reading-head">
          <span className="notaio-title">
            <Narrated template={w("screen.reading.title")} />
          </span>
          <span className="notaio-toggle">{w(expanded ? "screen.notaioHint.hide" : "screen.notaioHint.show")}</span>
        </div>
        {box}
      </aside>
    </div>
  );
}

/**
 * The message box grows with what's typed (Interface v0.17): a line at a time, up to nine lines, then it
 * scrolls. In a short window it stops at about a fifth of the window's height, three lines at least, so it
 * can't crowd out the conversation. It's never shorter than its placeholder, which `measure` (a hidden box
 * with the placeholder as its text) gives. Only the height is set, so editing in the middle of the text
 * leaves the cursor where it is. The limits are theme tokens.
 */
function useGrowingBox(area: RefObject<HTMLTextAreaElement | null>, measure: RefObject<HTMLTextAreaElement | null>, text: string, placeholder: string, shown: boolean) {
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const fit = () => {
      const cs = getComputedStyle(el);
      const line = parseFloat(cs.lineHeight);
      if (!Number.isFinite(line) || line <= 0) return;
      const edges = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      const around = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + edges;
      const fewest = themeMs("--input-lines-min", 3);
      const short = Math.floor((window.innerHeight * themeMs("--input-short-share", 0.2)) / line);
      const lines = Math.min(themeMs("--input-lines-max", 9), Math.max(fewest, short));
      // Interface v0.19: three lines at least, whatever the example's length, with the example at the top.
      const least = Math.max((measure.current?.scrollHeight ?? 0) + edges, line * fewest + around);
      // The text's own height: the box is shrunk first, so a deleted line gives its room back.
      const top = el.scrollTop;
      const was = el.style.height;
      el.style.height = "0px";
      const need = el.scrollHeight + edges;
      const height = `${Math.ceil(Math.max(least, Math.min(need, line * lines + around)))}px`;
      // Interface v0.19, Notes for the Build: the style is written only when it changes.
      el.style.height = height === was ? was : height;
      el.scrollTop = top;
      const shown = String(Math.round((parseFloat(height) - around) / line));
      if (el.dataset.lines !== shown) el.dataset.lines = shown;
    };
    fit();
    // On a resize, once a frame. The column's width changes how the words wrap (the right panel folding, a drag): fit again.
    const later = perFrame(fit);
    window.addEventListener("resize", later.run);
    let width = el.getBoundingClientRect().width;
    const watch =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            const now = el.getBoundingClientRect().width;
            if (Math.abs(now - width) < 1) return;
            width = now;
            later.run();
          });
    watch?.observe(el);
    return () => {
      window.removeEventListener("resize", later.run);
      watch?.disconnect();
      later.cancel();
    };
  }, [text, placeholder, shown]);
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
function InputBox({
  me,
  v,
  send,
  card = null,
  fill,
  past = false,
  onReturn = () => {},
  canEnd = false,
  onEnd = () => {},
  onType = () => {},
}: {
  me: string;
  v: View;
  send: Send;
  /** A decision card waiting (Interface v0.16): it takes the box's place, and the draft waits behind it. */
  card?: ReactNode;
  fill: BoxFill | null;
  past?: boolean;
  onReturn?: () => void;
  /** End conversation is on offer: it sits under Speak and Pass too (Interface v0.16). */
  canEnd?: boolean;
  onEnd?: () => void;
  /** The player typed: Il Notaio's line for a refusal gives way to his usual one. */
  onType?: () => void;
}) {
  const info = getInfo();
  const hint = useHint();
  const [text, setText] = useState("");
  const [dismissed, setDismissed] = useState<Trigger | null>(null);
  /** The command menu opened from its button while the box holds words: choosing a command replaces them. */
  const [forced, setForced] = useState(false);
  const [held, setHeld] = useState<string | null>(null);
  /** The folded "Not available now" section of the command menu, opened by hand. */
  const [showClosed, setShowClosed] = useState(false);
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
  // Interface v0.16: every command the character can ever use; what's open now first, the rest folded below with their reasons.
  const commands = commandMenu(allCommands(), v.commands, v.state, payrollSize(v));
  const commandList = t?.kind === "commands" ? matchCommands(commands.open, t.query) : [];
  const closedList = t?.kind === "commands" ? matchCommands(commands.closed.map((c) => ({ ...c, name: c.command.name })), t.query) : [];
  const menuOpen = guestList.length > 0 || commandList.length > 0 || closedList.length > 0;
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
    if (next !== text) onType();
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
  const act = (m: unknown) => send(m);
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
  /** The game waits for the player (a request is open): from a past stage, Return beckons and the placeholder says so. */
  const beckon = past && !!v.pending;
  // Interface v0.5: the placeholder carries the example, with an @ and a /, using only commands allowed now.
  const example = placeholderExample(placeholderExamples(), commands.open, talkingWith(v, me) ?? present[0] ?? null, v.spoken);
  const placeholder = past ? w(beckon ? "screen.input.pastWaiting" : "screen.input.pastPlaceholder") : (example ?? w("screen.input.placeholder"));
  const measure = useRef<HTMLTextAreaElement>(null);
  useGrowingBox(area, measure, text, placeholder, !card);
  // Interface v0.16: a decision card takes the message box's place, in the same floating card; if it runs
  // tall, it scrolls there. Reading an earlier stage while one waits, there's nothing to draft, so the card
  // holds one Return button filling it; returning brings the decision card back as it was.
  if (card)
    return past ? (
      <div className="input past decision">
        <button className={`primary return wide${beckon ? " beckon" : ""}`} onClick={onReturn} {...hint("return")}>
          {w("screen.input.return")}
        </button>
      </div>
    ) : (
      <div className="input decision">{card}</div>
    );
  const folded = !showClosed && commandList.length > 0;
  return (
    <div className={`input${past ? " past" : ""}`} ref={box}>
      {/* The prompt's line is always laid out, so the box keeps its height as it comes and goes. Interface
          v0.16: the prompt at the left, the character count at the right, over the buttons. */}
      <div className="prompt-line">
        <div className={`prompt${req ? " waiting" : ""}`}>{prompt}</div>
        <span className={`count${!command && text.length > info.max ? " over" : ""}`}>{command ? "" : w("screen.input.count", { count: text.length, max: info.max })}</span>
      </div>
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
      {(commandList.length > 0 || closedList.length > 0) && (
        <ul className="dropdown menu" data-menu="commands">
          {commandList.map((c) => (
            <li key={c.name}>
              <button
                data-command={c.action}
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
          {/* The rest wait in a folded section, greyed, each with its reason in place of its hint. With nothing
              open now, the section opens by itself. Clicking one does nothing. */}
          {closedList.length > 0 && (
            <li className="menu-closed">
              <button className="menu-more" aria-expanded={!folded} onClick={() => (setShowClosed(folded), focus())}>
                {w("screen.commandWhy.more", { n: closedList.length })}
              </button>
              {!folded && (
                <ul>
                  {closedList.map((c) => (
                    <li key={c.name} className="cmd-closed" data-command={c.command.action} data-why={c.why} aria-disabled="true">
                      <span className="cmd">{c.command.usage}</span>
                      <span className="why">{c.reason ?? w(`screen.commandWhy.${c.why}`, { amount: payrollSize(v) ?? "" })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}
        </ul>
      )}
      <div className="row">
        <div className="field">
          <textarea
            ref={area}
            className={text ? undefined : "empty"}
            value={text}
            placeholder={placeholder}
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
          {/* The placeholder as text, never seen: how tall the box must be to show it whole. */}
          <textarea ref={measure} className="measure" value={placeholder} readOnly tabIndex={-1} aria-hidden="true" />
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
          {past ? (
            <button className={`primary return${beckon ? " beckon" : ""}`} onClick={onReturn} {...hint("return")}>
              {w("screen.input.return")}
            </button>
          ) : (
            <>
              <div className="actions-row">
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
              </div>
              {/* Interface v0.16: End conversation under Speak and Pass too, the width of the two, solid red. */}
              {canEnd && (
                <button className="end" onClick={onEnd} {...hint("end")}>
                  {w("screen.input.end")}
                </button>
              )}
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
      <button className="primary confirm" disabled={!ok} onClick={() => send({ type: "choice", request: req.id, value: { choice, target: choice === "stay" ? null : target } })} {...hint("confirm")}>
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
      {/* Interface v0.16: when no group has room, the card says so, so the missing join choices don't look like a fault. */}
      {o.groups.length === 0 && <p className="muted card-note">{w("screen.seat.allFull")}</p>}
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
          <button className="primary confirm" disabled={!target} onClick={() => choose({ choice: "colloquio", target })} {...hint("confirm")}>
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
      <select className="act-kind" value={a.type} onChange={(e) => onChange({ type: e.target.value })}>
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
      <p className="muted card-note">{most > 1 ? w("screen.midnight.introTwo") : w("screen.midnight.intro")}</p>
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
      <button className="primary confirm" disabled={!ok} onClick={() => send({ type: "choice", request: req.id, value })} {...hint("confirm")}>
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
