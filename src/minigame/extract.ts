// The recorder (Technical Design v0.8, End-of-Turn Extraction Pass and
// Memory Writing): at the end of each turn, a ★ pass (10a) and a claims pass
// (10d) per conversation active that turn, with the ★ pass's one sweep
// re-ask, a thought pass (10b) per character who thought, and, when readings
// are recorded (`notebook: perceived`), a perception pass (10e) per character
// who heard or spoke a line; at the end of the game, the knowledge checks (10c). Used by the engine during play and by
// replay.ts to re-run extraction on saved games. The caller makes the system
// calls (temperature 0, TD's retry once on unusable JSON).

import type { CharacterName } from "../game/roster.ts";
import type { DocSources, PlotFact } from "../sources/docs.ts";
import { ClaimsPass, KnowledgeVerdict, MemoryStore, StarPass, parseSweep, rosterText, sweepIds, whereLabel, type Belief, type GameLine, type MemoryEntry, type Thought, type TimelineItem } from "./memory.ts";

export type SystemCallKind = "star-pass" | "claims-pass" | "sweep-reask" | "thought-pass" | "perception-pass" | "knowledge-check";
/** One system call; null when it failed twice (or the cap stopped it). */
export type SystemCaller = (kind: SystemCallKind, character: CharacterName | null, system: string, user: string) => Promise<unknown | null>;
export type RecorderEvent = { turn: number; type: string; [k: string]: unknown };

export interface KnowledgeCheckResult {
  character: CharacterName;
  fact: string;
  verdict: ReturnType<typeof KnowledgeVerdict.parse> | null;
  flags: string[];
  evidenceShown: { entries: string[]; beliefs: string[] };
}

/** "The last 4 lines before this turn in the same conversation" (10a/10d's {context_lines}). */
const CONTEXT_LINES = 4;

export class Recorder {
  readonly prefixes: Record<string, string> = {};

  constructor(
    private docs: DocSources,
    private memory: MemoryStore,
    private call: SystemCaller,
    private events: RecorderEvent[],
    /** How a line reads in History (TD, History Line Formats). */
    private formatLine: (l: GameLine) => string,
    private listJoin: (xs: string[]) => string,
    /** TD v0.8 `notebook`: readings (10e) are written only in "perceived". */
    private notebook: "shared" | "perceived" = "shared",
    /** Which passes run: all by default; ["10e"] adds readings to an existing record (replay). */
    private passes: ("10a" | "10b" | "10d" | "10e")[] = ["10a", "10b", "10d", "10e"],
  ) {
    if (!docs.systemPrompts || !docs.memoryRules) throw new Error("This Technical Design has no v0.6 memory passes (blocks 10a–10d)");
    const sp = docs.systemPrompts;
    this.prefixes["system:star-pass"] = sp.starPass.system;
    this.prefixes["system:claims-pass"] = sp.claimsPass.system;
    this.prefixes["system:thought-pass"] = sp.thoughtPass.system;
    this.prefixes["system:knowledge-check"] = sp.knowledgeCheck.system;
    if (notebook === "perceived") {
      if (!sp.perceptionPass) throw new Error("notebook: perceived needs TD v0.8's perception pass (block 10e)");
      this.prefixes["system:perception-pass"] = sp.perceptionPass.system;
    }
  }

  /**
   * One turn's extraction. `lines`: every line of the game so far. `thoughts`: this turn's thoughts
   * to read, already without exact repeats (TD v0.6 shortTermHistory).
   */
  async turn(turn: number, lines: GameLine[], thoughts: Thought[]): Promise<void> {
    const turnLines = lines.filter((l) => l.turn === turn && l.kind !== "private");
    const active = [...new Set(turnLines.filter((l) => l.kind === "speech").map((l) => l.conversation))];
    const conversations = active.flatMap((id) => {
      const mine = turnLines.filter((l) => l.conversation === id);
      const context = lines.filter((l) => l.conversation === id && l.turn < turn && l.kind !== "private").slice(-CONTEXT_LINES);
      return [...(this.passes.includes("10a") ? [this.starPass(turn, id, mine, context)] : []), ...(this.passes.includes("10d") ? [this.claimsPass(turn, id, mine, context)] : [])];
    });
    const thinkers = this.passes.includes("10b") ? [...new Set(thoughts.map((t) => t.character))] : [];
    // TD v0.8: one perception pass per character who heard or spoke a line this turn, alongside 10b.
    const perceivers =
      this.notebook === "perceived" && this.passes.includes("10e") ? [...new Set(lines.filter((l) => l.turn === turn).flatMap((l) => l.heardBy))] : [];
    await Promise.all([
      ...conversations,
      ...thinkers.map((c) => this.thoughtPass(turn, c, thoughts.filter((t) => t.character === c))),
      ...perceivers.map((c) => this.perceptionPass(turn, c, lines, thoughts)),
    ]);
  }

  /**
   * 10e's {timeline} (TD v0.8): every line the character heard or spoke this turn, in order, with
   * IDs, their own lines marked "(you…)"; each think() thought indented after the line it followed
   * (after_line); a separator when the conversation changes. Other calls' thoughts and exact
   * repeats are left out.
   */
  timeline(turn: number, c: CharacterName, lines: GameLine[], thoughts: Thought[]): TimelineItem[] {
    const heard = lines.filter((l) => l.turn === turn && l.heardBy.includes(c));
    const mine = thoughts.filter((t) => t.character === c && t.turn === turn && t.call === "think" && !t.repeat);
    const ids = new Set(heard.map((l) => l.id));
    // A thought whose line came before this turn (e.g. a join note at the last movement window) opens the timeline.
    const items: TimelineItem[] = mine.filter((t) => !t.after_line || !ids.has(t.after_line)).map((t) => ({ kind: "thought", thought: t }));
    for (const l of heard) {
      items.push({ kind: "line", line: l });
      for (const t of mine.filter((t) => t.after_line === l.id)) items.push({ kind: "thought", thought: t });
    }
    return items;
  }

  private renderTimeline(c: CharacterName, items: TimelineItem[]): string {
    const out: string[] = [];
    let conv: string | null = null;
    for (const it of items) {
      if (it.kind === "thought") {
        out.push(`  [${it.thought.id}] thought: ${it.thought.text}`);
        continue;
      }
      const l = it.line;
      if (conv !== null && l.conversation !== conv) out.push(`— ${whereLabel(l.where, c)} —`);
      conv = l.conversation;
      const own = l.kind === "speech" && l.speaker === c;
      out.push(`[${l.id}] ${own ? `${c} (you${l.addressee ? `, to ${l.addressee}` : ""}): ${l.text}` : this.formatLine(l)}`);
    }
    return out.join("\n");
  }

  private async perceptionPass(turn: number, c: CharacterName, lines: GameLine[], thoughts: Thought[]): Promise<void> {
    const sp = this.docs.systemPrompts!.perceptionPass!;
    const items = this.timeline(turn, c, lines, thoughts);
    const user = fill(sp.user, { roster: rosterText(), character_name: c, timeline: this.renderTimeline(c, items) });
    const raw = await this.call("perception-pass", c, sp.system, user);
    if (raw === null) {
      this.events.push({ turn, type: "extraction-failed", pass: "10e", character: c });
      return;
    }
    const r = this.memory.applyPerceptionPass(raw, { turn, character: c, timeline: items });
    this.events.push({ turn, type: "perception-pass", character: c, stored: r.stored.map((x) => x.id), dropped: r.dropped.length });
  }

  /** 10a/10d's user message: roster, conversation, context lines and this turn's lines with IDs, and the IDs to sweep. */
  private passUser(turn: number, mine: GameLine[], context: GameLine[]): string {
    return fill(this.docs.systemPrompts!.starPass.user, {
      roster: rosterText(),
      conversation_label: whereLabel(mine.at(-1)!.where),
      turn: String(turn),
      participants: this.listJoin([...new Set(mine.flatMap((l) => l.heardBy))]),
      context_lines: context.length ? context.map((l) => `[${l.id}] ${this.formatLine(l)}`).join("\n") : "None.",
      turn_lines: mine.map((l) => `[${l.id}] ${this.formatLine(l)}`).join("\n"),
      // TD v0.7: this turn's spoken lines, comma-separated, in order (10d receives the same message).
      sweep_ids: sweepIds(mine).join(", "),
    });
  }

  private async starPass(turn: number, conversation: string, mine: GameLine[], context: GameLine[]): Promise<void> {
    const sp = this.docs.systemPrompts!.starPass;
    const user = this.passUser(turn, mine, context);
    const x = { turn, conversation, turnLines: mine, contextLines: context, rules: this.docs.memoryRules! };
    const raw = await this.call("star-pass", null, sp.system, user);
    const reply = raw === null ? null : StarPass.safeParse(raw);
    if (!reply?.success) {
      this.events.push({ turn, type: "extraction-failed", pass: "10a", conversation, ...(reply && { reason: reply.error.issues[0]?.message }) });
      return;
    }
    const { items, missing, gaps } = this.memory.sweepCheck(reply.data.sweep, reply.data.entries, x);
    const first = this.memory.applyEntries("10a", reply.data.entries, x);
    let sweep = items;
    let reasked: { stored: MemoryEntry[]; stillMissing: string[]; left: { line: string; kind: string }[] } | null = null;
    if (missing.length || gaps.length) {
      // TD v0.7: one re-ask covers both lines left out of the sweep and lines flagged with no entry.
      const parts = [
        ...(missing.length ? [`You left out ${missing.join(", ")}`] : []),
        ...gaps.map((g) => `you flagged ${g.line} as ${article(g.kind)} ${g.kind} but wrote no entry for it`),
      ];
      const note = `${parts.join("; ").replace(/^y/, "Y")}.`;
      this.memory.notes.push({ pass: "10a", turn, scope: conversation, kind: "sweep re-ask", detail: [...missing.map((m) => `${m} left out`), ...gaps.map((g) => `${g.line} ${g.kind}`)].join(", ") });
      const again = await this.call("sweep-reask", null, sp.system, `${user}\n\n${note} Reply again with the full JSON.`);
      const r = again === null ? null : StarPass.safeParse(again);
      const reSweep = r?.success ? parseSweep(r.data.sweep) : [];
      // Keep from the re-ask only what it was asked for: the left-out lines and the flagged gaps.
      const fresh = r?.success ? r.data.entries.filter((e) => gaps.some((g) => sameEntry(e, g)) || missing.includes(lineOf(e))) : [];
      const stored = this.memory.applyEntries("10a", fresh, x).stored;
      sweep = [...items, ...reSweep.filter((i) => missing.includes(i.line))];
      const stillMissing = missing.filter((m) => !reSweep.some((i) => i.line === m));
      const left = gaps.filter((g) => !fresh.some((e) => sameEntry(e, g)));
      for (const m of stillMissing) this.memory.notes.push({ pass: "10a", turn, scope: conversation, kind: "sweep gap", detail: `${m} still left out` });
      for (const g of left) this.memory.notes.push({ pass: "10a", turn, scope: conversation, kind: "sweep gap", detail: `${g.line} ${g.kind}` });
      reasked = { stored, stillMissing, left };
    }
    const stored = [...first.stored, ...(reasked?.stored ?? [])];
    this.memory.countSelfNoAdmission(sweep, stored, { turn, conversation });
    this.events.push({
      turn,
      type: "star-pass",
      conversation,
      stored: stored.map((e) => e.id),
      dropped: first.dropped.length,
      sweepMissing: missing,
      sweepGaps: gaps.map((g) => `${g.line} ${g.kind}`),
      self: sweep.filter((i) => i.self === true).map((i) => i.line),
      ...(reasked && { reaskStored: reasked.stored.map((e) => e.id), stillMissing: [...reasked.stillMissing.map((m) => `${m} left out`), ...reasked.left.map((g) => `${g.line} ${g.kind}`)] }),
    });
  }

  private async claimsPass(turn: number, conversation: string, mine: GameLine[], context: GameLine[]): Promise<void> {
    const raw = await this.call("claims-pass", null, this.docs.systemPrompts!.claimsPass.system, this.passUser(turn, mine, context));
    const reply = raw === null ? null : ClaimsPass.safeParse(raw);
    if (!reply?.success) {
      this.events.push({ turn, type: "extraction-failed", pass: "10d", conversation });
      return;
    }
    const r = this.memory.applyEntries("10d", reply.data.entries, { turn, conversation, turnLines: mine, contextLines: context, rules: this.docs.memoryRules! });
    this.events.push({ turn, type: "claims-pass", conversation, stored: r.stored.map((e) => e.id), dropped: r.dropped.length });
  }

  private async thoughtPass(turn: number, c: CharacterName, ts: Thought[]): Promise<void> {
    const sp = this.docs.systemPrompts!.thoughtPass;
    const prior = this.memory.beliefsOf(c);
    const user = fill(sp.user, {
      roster: rosterText(),
      character_name: c,
      prior_beliefs: prior.length ? prior.map((b) => `[${b.id}] ${b.kind} — ${b.statement}`).join("\n") : "None.",
      thoughts: ts.map((t) => `[${t.id}] ${t.text}`).join("\n"),
    });
    const raw = await this.call("thought-pass", c, sp.system, user);
    if (raw === null) {
      this.events.push({ turn, type: "extraction-failed", pass: "10b", character: c });
      return;
    }
    const r = this.memory.applyThoughtPass(raw, turn, c, ts, this.docs.memoryRules!);
    this.events.push({ turn, type: "thought-pass", character: c, changed: r.changed.map((b) => b.id), dropped: r.dropped.length });
  }

  // ---- 10c: knowledge checks ------------------------------------------------------------------

  async knowledge(checks: { character: CharacterName; fact: string }[], cast: CharacterName[], deadline = "the end of the game"): Promise<KnowledgeCheckResult[]> {
    const sp = this.docs.systemPrompts!.knowledgeCheck;
    return Promise.all(
      checks.map(async ({ character, fact }) => {
        const f = this.docs.plotFacts.find((x) => x.id === fact)!;
        const { entries, beliefs } = this.evidence(character, f, cast);
        const user = fill(sp.user, {
          character_name: character,
          deadline_label: deadline,
          fact: f.fact,
          must_include: f.mustInclude,
          does_not_count: f.doesNotCount,
          memory_entries: entries.length ? entries.map((e) => `[${e.id}] T${e.turn} · ${whereLabel(e.where, character)} · ${e.type} · ${e.summary}${e.quote ? ` ("${e.quote}")` : ""}`).join("\n") : "None.",
          // TD v0.6: beliefs with turn, status, and quote, so the check can re-read a conclusion's quote.
          beliefs: beliefs.length ? beliefs.map((b) => `[${b.id}] T${b.firstTurn} · ${b.kind} (${b.status}) · ${b.statement} ("${b.quote}")`).join("\n") : "None.",
        });
        const raw = await this.call("knowledge-check", character, sp.system, user);
        const parsed = raw === null ? null : KnowledgeVerdict.safeParse(raw);
        let verdict = parsed?.success ? parsed.data : null;
        const flags: string[] = [];
        if (!verdict) flags.push("call failed or reply unusable; verdict none");
        if (verdict) {
          // TD: cited IDs must be in the evidence; told cites someone else's entry; a conclusion cites the character's own.
          const ids = new Set([...entries.map((e) => e.id), ...beliefs.map((b) => b.id)]);
          const bad = verdict.evidence.filter((id) => !ids.has(id));
          const toldOk = verdict.verdict !== "told" || verdict.evidence.some((id) => entries.find((e) => e.id === id && e.speaker && e.speaker !== character));
          const conclOk =
            verdict.verdict !== "conclusion" ||
            verdict.evidence.some((id) => beliefs.find((b) => b.id === id) || entries.find((e) => e.id === id && e.speaker === character));
          if (bad.length) flags.push(`cites IDs not in the evidence: ${bad.join(", ")}`);
          if (!toldOk) flags.push("'told' without an entry spoken by someone else");
          if (!conclOk) flags.push("'conclusion' without the character's own belief or claim");
          if (flags.length) verdict = { ...verdict, verdict: "none" };
        }
        return { character, fact, verdict, flags, evidenceShown: { entries: entries.map((e) => e.id), beliefs: beliefs.map((b) => b.id) } };
      }),
    );
  }

  /** TD block 10c: entries naming the fact's key people plus the 10 most similar, capped at 60 (★ first); all beliefs. */
  private evidence(c: CharacterName, f: PlotFact, cast: CharacterName[]): { entries: MemoryEntry[]; beliefs: Belief[] } {
    const mine = this.memory.entriesFor(c);
    const key = cast.filter((n) => f.fact.includes(n) || f.fact.includes(n.split(" ").at(-1)!) || (n === "Contessa Isabella" && f.fact.includes("Isabella")));
    const names = (e: MemoryEntry) => [e.speaker, e.toward, ...e.about, ...(e.parties ?? [])];
    const named = mine.filter((e) => names(e).some((n) => key.includes(n as CharacterName)));
    const factWords = new Set(f.fact.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
    const similar = mine
      .filter((e) => !named.includes(e))
      .map((e) => ({ e, s: e.summary.toLowerCase().split(/\W+/).filter((w) => factWords.has(w)).length }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 10)
      .map((x) => x.e);
    let entries = [...named, ...similar];
    if (entries.length > 60) entries = [...entries.filter((e) => e.salient), ...entries.filter((e) => !e.salient)].slice(0, 60);
    entries.sort((a, b) => a.turn - b.turn);
    return { entries, beliefs: this.memory.beliefsOf(c, false) };
  }
}

/** TD v0.6 shortTermHistory: identical after trimming and collapsing whitespace. */
export function sameThought(a: string, b: string): boolean {
  const norm = (s: string) => s.trim().replace(/\s+/g, " ");
  return norm(a) === norm(b);
}

function lineOf(e: unknown): string {
  const x = e as { line?: unknown };
  return typeof x.line === "string" ? x.line.replace(/[[\]\s]/g, "") : "";
}

function sameEntry(e: unknown, g: { line: string; kind: string }): boolean {
  const x = e as { line?: unknown; type?: unknown };
  return typeof x.line === "string" && x.line.replace(/[[\]\s]/g, "") === g.line && x.type === g.kind;
}

const article = (kind: string) => (/^[aeiou]/.test(kind) ? "an" : "a");

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}

export type AfterLineStatus = "clean-speech" | "clean-notaio" | "ambiguous" | "none";

/**
 * Rebuilds each thought's `after_line` from a saved game's event order (TD v0.8; Models &
 * Research v0.29 check a): the last line the character heard before the thought. For a think()
 * thought, the lines heard since the character's previous think() say how clean the pairing is:
 * one speech line (with at most its own action line after it) is clean; only Il Notaio or action
 * lines is clean too (a join, a departure, a new group); a speech line followed by an Il Notaio
 * line is ambiguous (the thought may react to either); no new line is none.
 */
export function rebuildAfterLine(rec: { lines: GameLine[]; events: { type: string; line?: unknown; thought?: unknown }[]; thoughts: Thought[] }): Map<string, { after_line: string | null; status: AfterLineStatus | null; reason: string }> {
  const byId = new Map(rec.lines.map((l) => [l.id, l]));
  const seq: { kind: "L" | "T"; id: string }[] = [];
  const seen = new Set<string>();
  for (const e of rec.events) {
    if (typeof e.line === "string" && byId.has(e.line) && !seen.has(e.line)) {
      seq.push({ kind: "L", id: e.line });
      seen.add(e.line);
    }
    if (e.type === "thought" && typeof e.thought === "string") seq.push({ kind: "T", id: e.thought });
  }
  // Lines without an event of their own (private action lines) go straight after the line created before them.
  for (const l of rec.lines.filter((l) => !seen.has(l.id))) {
    const prev = `L${Number(l.id.slice(1)) - 1}`;
    const at = seq.findIndex((x) => x.kind === "L" && x.id === prev);
    seq.splice(at < 0 ? seq.length : at + 1, 0, { kind: "L", id: l.id });
  }
  const thoughts = new Map(rec.thoughts.map((t) => [t.id, t]));
  const lastHeard = new Map<string, string>();
  const sinceThink = new Map<string, GameLine[]>();
  const out = new Map<string, { after_line: string | null; status: AfterLineStatus | null; reason: string }>();
  for (const x of seq) {
    if (x.kind === "L") {
      const l = byId.get(x.id)!;
      for (const c of l.heardBy) {
        lastHeard.set(c, l.id);
        sinceThink.set(c, [...(sinceThink.get(c) ?? []), l]);
      }
      continue;
    }
    const t = thoughts.get(x.id);
    if (!t) continue;
    const after = lastHeard.get(t.character) ?? null;
    if (t.call !== "think") {
      out.set(t.id, { after_line: after, status: null, reason: `${t.call} thought (not paired)` });
      continue;
    }
    const fresh = sinceThink.get(t.character) ?? [];
    sinceThink.set(t.character, []);
    const speech = fresh.filter((l) => l.kind === "speech");
    let status: AfterLineStatus;
    let reason: string;
    if (!fresh.length) [status, reason] = ["none", "no new line heard since the previous think()"];
    else if (!speech.length) [status, reason] = ["clean-notaio", `only Il Notaio or action lines (${fresh.length})`];
    else if (speech.length > 1) [status, reason] = ["ambiguous", `${speech.length} speech lines since the previous think()`];
    else {
      const sp = speech[0]!;
      const after = fresh.slice(fresh.indexOf(sp) + 1);
      // A speech line's own action line (a bribe) comes straight after it and is part of what was said.
      const ownAction = after.length === 1 && after[0]!.kind === "event" && Number(after[0]!.id.slice(1)) === Number(sp.id.slice(1)) + 1;
      if (!after.length) [status, reason] = ["clean-speech", fresh.length > 1 ? "one speech line, after Il Notaio lines" : "one speech line"];
      else if (ownAction) [status, reason] = ["clean-speech", "one speech line and its action line"];
      else [status, reason] = ["ambiguous", `a speech line, then ${after.map((l) => l.kind).join(", ")}`];
    }
    // For a clean speech pairing, the thought reacts to the speech line, not to an action line after it.
    const pick = status === "clean-speech" ? speech[0]!.id : after;
    out.set(t.id, { after_line: pick, status, reason });
  }
  return out;
}
