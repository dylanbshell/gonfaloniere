// Memory for the mini-game (Technical Design v0.5, Memory Architecture and
// Memory Writing): the game's lines and thoughts with IDs, longTermHistory
// entries and beliefs, the checks every extraction entry must pass before it
// is stored, retrieval for block 6, and rendering for prompts and checks.
// Pure: the engine makes the model calls.

import { z } from "zod";
import { ROSTER, resolveAlias, type CharacterName } from "../game/roster.ts";
import { nearMiss } from "../output/think.ts";

/** One line of the evening, with a game-wide ID (L…). */
export interface GameLine {
  id: string;
  turn: number;
  conversation: string;
  /** Where it was said: the conversation's kind and everyone in it at the time. */
  where: Where;
  kind: "speech" | "notaio" | "event" | "private";
  speaker: CharacterName | null;
  addressee: CharacterName | null;
  text: string;
  /** Who heard it: everyone present, or for a private action the actor only. */
  heardBy: CharacterName[];
}

export interface Where {
  kind: "capannello" | "colloquio" | "gathering";
  members: CharacterName[];
}

/** "Capannello with A, B" or "Colloquio with A", from one character's point of view (or everyone's). */
export function whereLabel(w: Where, forChar?: CharacterName): string {
  if (w.kind === "gathering") return "The gathering";
  const others = w.members.filter((m) => m !== forChar);
  return `${w.kind === "colloquio" ? "Colloquio" : "Capannello"} with ${others.join(", ")}`;
}

/** One private thought from any character call (T…). */
export interface Thought {
  id: string;
  turn: number;
  character: CharacterName;
  call: string;
  text: string;
}

export const ENTRY_TYPES = ["promise", "deal", "threat", "admission", "claim", "denial"] as const;
export type EntryType = (typeof ENTRY_TYPES)[number] | "payment" | "pension" | "event";
const SALIENT: EntryType[] = ["promise", "deal", "threat", "admission", "payment", "pension"];

/** A longTermHistory entry (M…), as TD's Memory Writing table stores it. */
export interface MemoryEntry {
  id: string;
  turn: number;
  conversation: string;
  where: Where;
  type: EntryType;
  speaker: CharacterName | null;
  parties?: CharacterName[];
  toward: string | null;
  about: string[];
  summary: string;
  quote: string | null;
  lines: string[];
  audience: CharacterName[];
  salient: boolean;
  source: "10a" | "code";
}

/** A belief (B…) from the thought pass. Nothing is deleted; "dropped" sets the status. */
export interface Belief {
  id: string;
  character: CharacterName;
  kind: "conclusion" | "suspicion";
  status: "held" | "dropped";
  statement: string;
  firstTurn: number;
  lastTurn: number;
  thought: string;
  quote: string;
}

/** An extraction entry that failed a check, kept for the gate 8 report. */
export interface DroppedEntry {
  pass: "10a" | "10b";
  turn: number;
  scope: string;
  reason: string;
  entry: unknown;
}

export class MemoryStore {
  entries: MemoryEntry[] = [];
  beliefs: Belief[] = [];
  dropped: DroppedEntry[] = [];
  private nextM = 1;
  private nextB = 1;

  addEntry(e: Omit<MemoryEntry, "id" | "salient">): MemoryEntry {
    const entry = { ...e, id: `M${this.nextM++}`, salient: SALIENT.includes(e.type) };
    this.entries.push(entry);
    return entry;
  }

  entriesFor(c: CharacterName): MemoryEntry[] {
    return this.entries.filter((e) => e.audience.includes(c));
  }

  beliefsOf(c: CharacterName, held = true): Belief[] {
    return this.beliefs.filter((b) => b.character === c && (!held || b.status === "held"));
  }

  // ---- 10a: conversation pass -------------------------------------------------------

  /**
   * Checks a conversation pass reply and stores what passes. Speaker, turn, and
   * audience come from the cited lines; every quote must appear word for word
   * in a cited line; names resolve through the alias table.
   */
  applyConversationPass(raw: unknown, turn: number, conversation: string, turnLines: GameLine[]): { stored: MemoryEntry[]; dropped: DroppedEntry[] } {
    const stored: MemoryEntry[] = [];
    const dropped: DroppedEntry[] = [];
    const drop = (reason: string, entry: unknown) => {
      const d: DroppedEntry = { pass: "10a", turn, scope: conversation, reason, entry };
      dropped.push(d);
      this.dropped.push(d);
    };
    const parsed = ConversationPass.safeParse(raw);
    if (!parsed.success) {
      drop(`reply shape: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`, raw);
      return { stored, dropped };
    }
    const byId = new Map(turnLines.map((l) => [l.id, l]));
    for (const e of parsed.data.entries) {
      if (!(ENTRY_TYPES as readonly string[]).includes(e.type)) {
        drop(`unknown type "${e.type}"`, e);
        continue;
      }
      const cited = e.lines.map((id) => byId.get(id.replace(/[[\]]/g, "")));
      if (!cited.length || cited.some((l) => !l)) {
        drop(`cites a line not in this turn (${e.lines.join(", ")})`, e);
        continue;
      }
      const lines = cited as GameLine[];
      if (lines.some((l) => l.kind !== "speech")) {
        drop("cites an Il Notaio or bracketed line", e);
        continue;
      }
      if (!e.quote || !lines.some((l) => quoteIn(e.quote!, l.text))) {
        drop(`quote not found word for word in a cited line: "${e.quote}"`, e);
        continue;
      }
      const speakers = [...new Set(lines.map((l) => l.speaker!))];
      const audience = lines.reduce<CharacterName[]>((acc, l) => acc.filter((c) => l.heardBy.includes(c)), [...lines[0]!.heardBy]);
      stored.push(
        this.addEntry({
          turn,
          conversation,
          where: lines[0]!.where,
          type: e.type as EntryType,
          // A deal names every party; whoever spoke the last cited line accepted it.
          speaker: lines.at(-1)!.speaker,
          ...(e.type === "deal" && { parties: speakers }),
          toward: e.toward ? (resolveName(e.toward) ?? e.toward) : null,
          about: e.about.map((a) => resolveName(a) ?? a),
          summary: e.summary,
          quote: e.quote,
          lines: lines.map((l) => l.id),
          audience,
          source: "10a",
        }),
      );
    }
    return { stored, dropped };
  }

  // ---- 10b: thought pass ------------------------------------------------------------

  /** Checks a thought pass reply against the character's thoughts this turn and records beliefs. */
  applyThoughtPass(raw: unknown, turn: number, character: CharacterName, thoughts: Thought[]): { changed: Belief[]; dropped: DroppedEntry[] } {
    const changed: Belief[] = [];
    const dropped: DroppedEntry[] = [];
    const drop = (reason: string, entry: unknown) => {
      const d: DroppedEntry = { pass: "10b", turn, scope: character, reason, entry };
      dropped.push(d);
      this.dropped.push(d);
    };
    const parsed = ThoughtPass.safeParse(raw);
    if (!parsed.success) {
      drop(`reply shape: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`, raw);
      return { changed, dropped };
    }
    const byId = new Map(thoughts.map((t) => [t.id, t]));
    for (const b of parsed.data.beliefs) {
      const t = byId.get(b.thought.replace(/[[\]]/g, ""));
      if (!t) {
        drop(`cites a thought not in this turn (${b.thought})`, b);
        continue;
      }
      if (!quoteIn(b.quote, t.text)) {
        drop(`quote not found word for word in ${t.id}: "${b.quote}"`, b);
        continue;
      }
      if (b.change === "new") {
        const belief: Belief = {
          id: `B${this.nextB++}`,
          character,
          kind: b.kind,
          status: "held",
          statement: b.statement,
          firstTurn: turn,
          lastTurn: turn,
          thought: t.id,
          quote: b.quote,
        };
        this.beliefs.push(belief);
        changed.push(belief);
        continue;
      }
      const prior = this.beliefs.find((x) => x.id === b.belief && x.character === character);
      if (!prior) {
        drop(`"${b.change}" names no recorded belief of ${character} (${b.belief})`, b);
        continue;
      }
      if (b.change === "firmer") prior.kind = "conclusion";
      else prior.status = "dropped";
      prior.lastTurn = turn;
      changed.push(prior);
    }
    return { changed, dropped };
  }

  // ---- Retrieval (TD v0.5, Memory Writing → Retrieval) --------------------------------

  /**
   * Block 6 for one character call: ★ entries naming anyone present (most
   * recent first, up to 6), held beliefs about anyone present (up to 3), then
   * the entries and beliefs most similar to the last two History lines.
   * Similarity is word overlap, a stand-in for embeddings until the engine has
   * them. `murder`: the Murder Round query (★ threats, deals, promises first).
   */
  retrieve(c: CharacterName, present: CharacterName[], recentLines: string[], opts: { murder?: boolean; limit?: number } = {}): string[] {
    const limit = opts.limit ?? 12;
    const mine = this.entriesFor(c);
    const beliefs = this.beliefsOf(c);
    const names = (e: MemoryEntry) => [e.speaker, e.toward, ...e.about, ...(e.parties ?? [])].filter(Boolean) as string[];
    const picked: (MemoryEntry | Belief)[] = [];
    const take = (xs: (MemoryEntry | Belief)[], n: number) => {
      for (const x of xs) {
        if (n <= 0) break;
        if (!picked.includes(x)) {
          picked.push(x);
          n--;
        }
      }
    };
    const recent = [...mine].reverse();
    if (opts.murder) take(recent.filter((e) => ["threat", "deal", "promise"].includes(e.type)), 6);
    take(recent.filter((e) => e.salient && names(e).some((n) => present.includes(n as CharacterName))), 6);
    take(beliefs.filter((b) => present.some((p) => b.statement.includes(p))), 3);
    const query = words(recentLines.join(" "));
    const scored = [...mine, ...beliefs]
      .filter((x) => !picked.includes(x))
      .map((x) => ({ x, s: overlap(query, words("summary" in x ? `${x.summary} ${x.quote ?? ""}` : x.statement)) }))
      .sort((a, b) => b.s - a.s);
    take(scored.map((s) => s.x), limit - picked.length);
    // Oldest first within the selection, as TD renders it.
    return picked.sort((a, b) => turnOf(a) - turnOf(b)).map((x) => ("summary" in x ? renderEntry(x, c) : renderBelief(x)));
  }
}

const ConversationPass = z.object({
  entries: z.array(
    z.object({
      type: z.string(),
      lines: z.array(z.string()),
      toward: z.string().nullable(),
      about: z.array(z.string()),
      summary: z.string(),
      quote: z.string().nullable(),
    }),
  ),
});
const ThoughtPass = z.object({
  beliefs: z.array(
    z.object({
      kind: z.enum(["conclusion", "suspicion"]),
      change: z.enum(["new", "firmer", "dropped"]),
      belief: z.string().nullable(),
      statement: z.string(),
      thought: z.string(),
      quote: z.string(),
    }),
  ),
});
export const KnowledgeVerdict = z.object({
  reasoning: z.string(),
  verdict: z.enum(["told", "conclusion", "suspicion", "none"]),
  evidence: z.array(z.string()),
  told_by: z.array(z.string()),
});

const turnOf = (x: MemoryEntry | Belief) => ("summary" in x ? x.turn : x.firstTurn);

/** TD's block 6 line: `T4 · Colloquio with Lupo · ★ deal: … ("quote")`. */
export function renderEntry(e: MemoryEntry, forChar?: CharacterName): string {
  return `T${e.turn} · ${whereLabel(e.where, forChar)} · ${e.salient ? "★ " : ""}${e.type}: ${e.summary}${e.quote ? ` ("${e.quote}")` : ""}`;
}

export function renderBelief(b: Belief): string {
  return `T${b.firstTurn} · your belief (${b.kind}): ${b.statement}`;
}

/** The roster as 10a–10b show it: `Full Name — Faction`, the dead marked. */
export function rosterText(dead: CharacterName[] = []): string {
  return ROSTER.map((r) => `${r.name} — ${r.faction}${dead.includes(r.name) ? " (dead)" : ""}`).join("\n");
}

/** A name as written, a known alias, or a near miss (TD's Names rule); null if none matches. */
export function resolveName(name: string): CharacterName | null {
  const all = ROSTER.map((r) => r.name) as CharacterName[];
  if ((all as string[]).includes(name)) return name as CharacterName;
  return resolveAlias(name) ?? (nearMiss(name, all) as CharacterName | null);
}

/** Word-for-word after normalizing spaces, quote marks, and case (TD, Extraction entries). */
export function quoteIn(quote: string, text: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[’‘`]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/^["'\s]+|["'\s]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const q = norm(quote);
  return q.length > 0 && norm(text).includes(q);
}

const STOP = new Set("the a an and or of to in on at for is was be he she it his her they them i you that this with as by not no from but have has had are were will would".split(" "));
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)));
const overlap = (a: Set<string>, b: Set<string>) => {
  let n = 0;
  for (const w of b) if (a.has(w)) n++;
  return b.size ? n / Math.sqrt(b.size * Math.max(1, a.size)) : 0;
};
