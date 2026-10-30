// The isolation check over a game record (Technical Design v0.22, Storage and retrieval; The lore
// store, Checks once built): no character's prompt holds another character's notebook row or private
// lore. Every block 6 line of a character call must render one of that character's own rows, and every
// lore line must be public lore or the character's own; no other character's private lore may appear
// anywhere in the prompt. Exact and code-only, so it runs on every game record.

import type { CharacterName } from "../game/roster.ts";
import { tdMinor } from "../prompt/assemble.ts";
import type { LoreEntry } from "./lore.ts";
import { renderBelief, renderCodeEntryFor, renderEntry, renderReading, type Belief, type GameLine, type MemoryEntry, type Reading } from "./memory.ts";

export interface IsolationRecord {
  header: { docs: { technicalDesign: string }; notebook?: string };
  calls: { n: number; kind: string; character: string | null; user: string }[];
  lines: GameLine[];
  memory: { entries: MemoryEntry[]; beliefs: Belief[]; readings: Reading[]; lore?: LoreEntry[] };
}

export interface IsolationViolation {
  call: number;
  character: string;
  section: "memory" | "lore";
  text: string;
  /** Whose row or lore it matches, when it's someone else's. */
  belongsTo: string[];
}

const MEMORY_HEADING = "WHAT YOU REMEMBER FROM EARLIER TONIGHT";
const LORE_HEADING = "WHAT YOU KNOW OF FLORENCE";

/** The `- ` lines under a heading, up to the first line that isn't one. */
function bulletsUnder(prompt: string, heading: string): string[] | null {
  const lines = prompt.split("\n");
  const at = lines.indexOf(heading);
  if (at < 0) return null;
  const out: string[] = [];
  for (const l of lines.slice(at + 1)) {
    if (!l.startsWith("- ")) break;
    out.push(l.slice(2));
  }
  return out;
}

export function isolationCheck(rec: IsolationRecord): { calls: number; memoryLines: number; loreLines: number; violations: IsolationViolation[] } {
  const lines = new Map(rec.lines.map((l) => [l.id, l]));
  const dropPunct = tdMinor(rec.header.docs.technicalDesign) >= 15;
  const shared = (rec.header.notebook ?? "perceived") === "shared";
  // Every render a row can have in a prompt, with whose row it is. A belief's kind can change after it
  // was shown ("firmer"), so both kinds' renders count as the owner's.
  const owners = new Map<string, Set<string>>();
  const own = (text: string, c: string) => (owners.get(text) ?? owners.set(text, new Set()).get(text)!).add(c);
  if (!shared) {
    for (const r of rec.memory.readings) {
      const line = lines.get(r.line);
      if (line) own(renderReading(r, line, r.words_line ? lines.get(r.words_line) : undefined, dropPunct), r.character);
    }
  }
  for (const e of rec.memory.entries) {
    if (e.source === "code") for (const c of e.audience) own(shared ? renderEntry(e, c) : renderCodeEntryFor(e, c), c);
    else if (shared) for (const c of e.audience) own(renderEntry(e, c), c);
  }
  for (const b of rec.memory.beliefs) for (const kind of ["suspicion", "conclusion"] as const) own(renderBelief({ ...b, kind }), b.character);
  const lore = rec.memory.lore ?? [];
  const loreScope = new Map(lore.map((e) => [e.text, e.scope]));

  const violations: IsolationViolation[] = [];
  let calls = 0;
  let memoryLines = 0;
  let loreLines = 0;
  for (const call of rec.calls) {
    const c = call.character;
    const memory = c ? bulletsUnder(call.user, MEMORY_HEADING) : null;
    if (!c || !memory) continue;
    calls++;
    for (const text of memory) {
      memoryLines++;
      const who = owners.get(text);
      if (!who?.has(c)) violations.push({ call: call.n, character: c, section: "memory", text, belongsTo: [...(who ?? [])] });
    }
    for (const text of bulletsUnder(call.user, LORE_HEADING) ?? []) {
      loreLines++;
      const scope = loreScope.get(text);
      if (scope !== "public" && scope !== c) violations.push({ call: call.n, character: c, section: "lore", text, belongsTo: scope ? [scope] : [] });
    }
    // Anywhere in the prompt, not only in the lore section.
    for (const e of lore) {
      if (e.scope !== "public" && e.scope !== (c as CharacterName) && call.user.includes(e.text)) violations.push({ call: call.n, character: c, section: "lore", text: e.text, belongsTo: [e.scope] });
    }
  }
  return { calls, memoryLines, loreLines, violations };
}
