// The recorder (Technical Design v0.6, End-of-Turn Extraction Pass and
// Memory Writing): at the end of each turn, a ★ pass (10a) and a claims pass
// (10d) per conversation active that turn, with the ★ pass's one sweep
// re-ask, and a thought pass (10b) per character who thought; at the end of
// the game, the knowledge checks (10c). Used by the engine during play and by
// replay.ts to re-run extraction on saved games. The caller makes the system
// calls (temperature 0, TD's retry once on unusable JSON).

import type { CharacterName } from "../game/roster.ts";
import type { DocSources, PlotFact } from "../sources/docs.ts";
import { KnowledgeVerdict, MemoryStore, StarPass, ClaimsPass, rosterText, whereLabel, type Belief, type GameLine, type MemoryEntry, type Thought } from "./memory.ts";

export type SystemCallKind = "star-pass" | "claims-pass" | "sweep-reask" | "thought-pass" | "knowledge-check";
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
  ) {
    if (!docs.systemPrompts || !docs.memoryRules) throw new Error("This Technical Design has no v0.6 memory passes (blocks 10a–10d)");
    const sp = docs.systemPrompts;
    this.prefixes["system:star-pass"] = sp.starPass.system;
    this.prefixes["system:claims-pass"] = sp.claimsPass.system;
    this.prefixes["system:thought-pass"] = sp.thoughtPass.system;
    this.prefixes["system:knowledge-check"] = sp.knowledgeCheck.system;
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
      return [this.starPass(turn, id, mine, context), this.claimsPass(turn, id, mine, context)];
    });
    const thinkers = [...new Set(thoughts.map((t) => t.character))];
    await Promise.all([...conversations, ...thinkers.map((c) => this.thoughtPass(turn, c, thoughts.filter((t) => t.character === c)))]);
  }

  /** 10a/10d's user message: roster, conversation, context lines with IDs, this turn's lines with IDs. */
  private passUser(turn: number, mine: GameLine[], context: GameLine[]): string {
    return fill(this.docs.systemPrompts!.starPass.user, {
      roster: rosterText(),
      conversation_label: whereLabel(mine.at(-1)!.where),
      turn: String(turn),
      participants: this.listJoin([...new Set(mine.flatMap((l) => l.heardBy))]),
      context_lines: context.length ? context.map((l) => `[${l.id}] ${this.formatLine(l)}`).join("\n") : "None.",
      turn_lines: mine.map((l) => `[${l.id}] ${this.formatLine(l)}`).join("\n"),
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
    const { gaps } = this.memory.sweepCheck(reply.data.sweep, reply.data.entries, x);
    const first = this.memory.applyEntries("10a", reply.data.entries, x);
    let reasked: { stored: MemoryEntry[]; left: { line: string; kind: string }[] } | null = null;
    if (gaps.length) {
      // TD: one re-ask naming the lines flagged with a kind but left without an entry.
      const note = gaps.map((g) => `You flagged ${g.line} as ${article(g.kind)} ${g.kind} but wrote no entry for it.`).join(" ");
      this.memory.notes.push({ pass: "10a", turn, scope: conversation, kind: "sweep re-ask", detail: gaps.map((g) => `${g.line} ${g.kind}`).join(", ") });
      const again = await this.call("sweep-reask", null, sp.system, `${user}\n\n${note} Reply again with the full JSON.`);
      const r = again === null ? null : StarPass.safeParse(again);
      const fresh = r?.success ? r.data.entries.filter((e) => gaps.some((g) => sameEntry(e, g))) : [];
      const stored = this.memory.applyEntries("10a", fresh, x).stored;
      const left = gaps.filter((g) => !fresh.some((e) => sameEntry(e, g)));
      for (const g of left) this.memory.notes.push({ pass: "10a", turn, scope: conversation, kind: "sweep gap", detail: `${g.line} ${g.kind}` });
      reasked = { stored, left };
    }
    this.events.push({
      turn,
      type: "star-pass",
      conversation,
      stored: [...first.stored, ...(reasked?.stored ?? [])].map((e) => e.id),
      dropped: first.dropped.length,
      sweepGaps: gaps.map((g) => `${g.line} ${g.kind}`),
      ...(reasked && { reaskStored: reasked.stored.map((e) => e.id), stillMissing: reasked.left.map((g) => `${g.line} ${g.kind}`) }),
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

function sameEntry(e: unknown, g: { line: string; kind: string }): boolean {
  const x = e as { line?: unknown; type?: unknown };
  return typeof x.line === "string" && x.line.replace(/[[\]\s]/g, "") === g.line && x.type === g.kind;
}

const article = (kind: string) => (/^[aeiou]/.test(kind) ? "an" : "a");

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => values[k] ?? m);
}
