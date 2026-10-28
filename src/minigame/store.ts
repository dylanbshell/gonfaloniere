// The live store (Technical Design v0.22–v0.24, Memory Architecture › Storage and retrieval; The lore
// store): every notebook row (readings, code entries, beliefs, and the reference record) is a row in
// PostgreSQL with an embedding, and recall ranks by cosine similarity with pgvector.
//
// - Embedded once, when the row is written: a reading's full line text, a code entry's rendered text,
//   a belief's statement. Query embeddings are made per call from the last two History lines.
// - Isolation is in the query: every search filters by owner (the reference record by audience) in
//   the WHERE clause, before similarity is ranked. A code entry is stored once per character it was
//   written for, as that character's row, so the notebook query never needs to look at audiences.
// - Only the similarity measure changes: the store returns the character's rows ranked, and
//   MemoryStore applies Memory Writing › Retrieval's order, caps, and budget as before.
//
// The in-process MemoryStore stays the working copy that renders block 6 and fills the game record;
// this store holds the same rows with their embeddings and does the isolated search.

import pg from "pg";
import type { CharacterName } from "../game/roster.ts";
import type { Embedder } from "./embed.ts";
import { renderCodeEntryFor, type MemoryStore, type Ranked } from "./memory.ts";
import type { LoreEntry } from "./lore.ts";

export type RetrievalMethod = "overlap" | "pgvector";
export const RETRIEVAL_METHODS: readonly RetrievalMethod[] = ["overlap", "pgvector"];

export const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS memory_rows (
  id        bigserial PRIMARY KEY,
  game_id   text      NOT NULL,
  row_id    text      NOT NULL,              -- R… reading, M… entry, B… belief, as in the game record
  kind      text      NOT NULL CHECK (kind IN ('reading', 'code', 'belief', 'reference')),
  owner     text,                            -- whose notebook the row is in; null only for the reference record
  audience  text[]    NOT NULL,              -- who the row was written for (a reading or belief: its owner)
  turn      integer   NOT NULL,
  label     text,                            -- a reading's took, an entry's type, a belief's kind
  body      text      NOT NULL,              -- the text that was embedded
  embedding vector    NOT NULL,
  CHECK ((kind = 'reference') = (owner IS NULL)),
  UNIQUE NULLS NOT DISTINCT (game_id, row_id, owner)
);
CREATE INDEX IF NOT EXISTS memory_rows_owner ON memory_rows (game_id, owner);
CREATE INDEX IF NOT EXISTS memory_rows_audience ON memory_rows USING gin (audience);

CREATE TABLE IF NOT EXISTS lore_rows (
  id        bigserial PRIMARY KEY,
  game_id   text      NOT NULL,
  lore_id   text      NOT NULL,
  scope     text      NOT NULL,              -- 'public', or the full name of the one character it belongs to
  title     text      NOT NULL,
  body      text      NOT NULL,
  embedding vector    NOT NULL,
  UNIQUE (game_id, lore_id)
);
CREATE INDEX IF NOT EXISTS lore_rows_scope ON lore_rows (game_id, scope);
`;

/**
 * A character's rows, ranked by similarity to the query ($4), or all scoring 0 with no query. The
 * isolation filter is the WHERE clause: rows the character owns, or in \`notebook: shared\` also
 * reference entries whose audience holds them. It's applied before ranking, so another character's
 * row is never a candidate, however close its embedding. Ties go to row_id.
 */
export function notebookQuery(notebook: "perceived" | "shared", ranked: boolean): string {
  const mine = "owner = $2 AND kind = ANY($3::text[])";
  const where = notebook === "perceived" ? mine : `((${mine}) OR (kind = 'reference' AND owner IS NULL AND $2 = ANY(audience)))`;
  return `SELECT row_id, kind, owner, audience, ${ranked ? "1 - (embedding <=> $4::vector)" : "0::float8"} AS similarity
FROM memory_rows
WHERE game_id = $1 AND ${where}
ORDER BY ${ranked ? "embedding <=> $4::vector, " : ""}row_id`;
}

/** Public lore, plus the character's own private lore; nobody else's. */
export function loreQuery(ranked: boolean): string {
  return `SELECT lore_id, scope, body, ${ranked ? "1 - (embedding <=> $3::vector)" : "0::float8"} AS similarity
FROM lore_rows
WHERE game_id = $1 AND (scope = 'public' OR scope = $2)
ORDER BY ${ranked ? "embedding <=> $3::vector, " : ""}lore_id`;
}


/** A notebook row as the store keeps it. */
export interface StoreRow {
  rowId: string;
  kind: "reading" | "code" | "belief" | "reference";
  owner: CharacterName | null;
  audience: CharacterName[];
  turn: number;
  label: string | null;
  body: string;
}

/** Every row the memory store holds, as store rows: code entries once per character they were written for. */
export function storeRows(memory: MemoryStore): StoreRow[] {
  const rows: StoreRow[] = [];
  for (const r of memory.readings) {
    const line = memory.lineOf(r.line);
    if (!line) continue;
    rows.push({ rowId: r.id, kind: "reading", owner: r.character, audience: [r.character], turn: r.turn, label: r.took, body: line.text });
  }
  for (const e of memory.entries) {
    if (e.source === "code") {
      for (const c of e.audience) rows.push({ rowId: e.id, kind: "code", owner: c, audience: [...e.audience], turn: e.turn, label: e.type, body: renderCodeEntryFor(e, c) });
    } else rows.push({ rowId: e.id, kind: "reference", owner: null, audience: [...e.audience], turn: e.turn, label: e.type, body: `${e.summary}${e.quote ? ` ${e.quote}` : ""}` });
  }
  for (const b of memory.beliefs) rows.push({ rowId: b.id, kind: "belief", owner: b.character, audience: [b.character], turn: b.firstTurn, label: b.kind, body: b.statement });
  return rows;
}

const vec = (v: number[]) => `[${v.join(",")}]`;
const key = (r: { rowId: string; owner: string | null }) => `${r.rowId}|${r.owner ?? ""}`;

export interface StoreUsage {
  embedCalls: number;
  texts: number;
  inputTokens: number;
  /** Summed where the endpoint reports cost; `costUnreported` counts calls that reported none. */
  costUsd: number;
  costUnreported: number;
}

type Queryable = Pick<pg.Pool, "query">;

export class VectorStore {
  readonly usage: StoreUsage = { embedCalls: 0, texts: 0, inputTokens: 0, costUsd: 0, costUnreported: 0 };
  private written = new Set<string>();
  /** Same text, same vector: the query embedding is made once per distinct query in a game (in flight too). */
  private queryCache = new Map<string, Promise<number[]>>();
  /** Flushes run one at a time, so calls made in parallel never embed or insert a row twice. */
  private flushing: Promise<unknown> = Promise.resolve();

  constructor(
    private db: Queryable,
    readonly gameId: string,
    readonly embedder: Embedder,
  ) {}

  /** Creates the extension, tables, and indexes if they don't exist. */
  static async migrate(db: Queryable): Promise<void> {
    await db.query(SCHEMA);
  }

  private async embed(texts: string[]): Promise<number[][]> {
    const unique = [...new Set(texts)];
    const res = await this.embedder.embed(unique);
    this.usage.embedCalls++;
    this.usage.texts += unique.length;
    this.usage.inputTokens += res.inputTokens;
    if (res.costUsd === null) this.usage.costUnreported++;
    else this.usage.costUsd += res.costUsd;
    const by = new Map(unique.map((t, i) => [t, res.vectors[i]!]));
    return texts.map((t) => by.get(t)!);
  }

  /** Writes, with their embeddings, every row not yet stored (each row is embedded once). Returns how many. */
  flush(memory: MemoryStore): Promise<number> {
    const run = this.flushing.then(() => this.flushNow(memory));
    this.flushing = run.catch(() => undefined);
    return run;
  }

  private async flushNow(memory: MemoryStore): Promise<number> {
    const rows = storeRows(memory).filter((r) => !this.written.has(key(r)));
    if (!rows.length) return 0;
    const vectors = await this.embed(rows.map((r) => r.body));
    // One statement per batch, so a batch is written whole or not at all.
    for (let at = 0; at < rows.length; at += 500) {
      const batch = rows.slice(at, at + 500);
      const values = batch.map((_, i) => `($1, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8}, $${i * 8 + 9}::vector)`);
      const params = batch.flatMap((r, i) => [r.rowId, r.kind, r.owner, r.audience, r.turn, r.label, r.body, vec(vectors[at + i]!)]);
      await this.db.query(`INSERT INTO memory_rows (game_id, row_id, kind, owner, audience, turn, label, body, embedding) VALUES ${values.join(", ")} ON CONFLICT DO NOTHING`, [this.gameId, ...params]);
    }
    for (const r of rows) this.written.add(key(r));
    return rows.length;
  }

  private queryVector(text: string): Promise<number[]> {
    let v = this.queryCache.get(text);
    if (!v) {
      v = this.embed([text]).then(([x]) => x!);
      this.queryCache.set(text, v);
      v.catch(() => this.queryCache.delete(text));
    }
    return v;
  }

  /**
   * The character's rows, most similar first, for block 6's similarity fill. With no History yet
   * there's nothing to compare against: every row scores 0 (as word overlap would).
   */
  async rank(owner: CharacterName, notebook: "perceived" | "shared", query: string): Promise<Ranked[]> {
    const kinds = notebook === "perceived" ? ["reading", "code", "belief"] : ["code", "belief"];
    const q = query.trim() ? await this.queryVector(query) : null;
    const { rows } = await this.db.query(notebookQuery(notebook, !!q), [this.gameId, owner, kinds, ...(q ? [vec(q)] : [])]);
    for (const r of rows) {
      // A second line of defence: the WHERE clause already makes this impossible.
      if (r.owner !== owner && !(r.kind === "reference" && r.owner === null && notebook === "shared" && r.audience.includes(owner))) {
        throw new Error(`Isolation: the ${notebook} query for ${owner} returned ${r.row_id} owned by ${r.owner ?? "the reference record"}`);
      }
    }
    return rows.map((r) => ({ id: r.row_id as string, similarity: Number(r.similarity) }));
  }

  /** Loads approved, canon-checked lore for this game, embedding each entry once. */
  async loadLore(entries: LoreEntry[]): Promise<void> {
    if (!entries.length) return;
    const vectors = await this.embed(entries.map((e) => e.text));
    const values = entries.map((_, i) => `($1, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5}, $${i * 5 + 6}::vector)`);
    const params = entries.flatMap((e, i) => [e.id, e.scope, e.title, e.text, vec(vectors[i]!)]);
    await this.db.query(`INSERT INTO lore_rows (game_id, lore_id, scope, title, body, embedding) VALUES ${values.join(", ")} ON CONFLICT DO NOTHING`, [this.gameId, ...params]);
  }

  /** The character's lore (public plus their own private), most similar to the query first. */
  async rankLore(owner: CharacterName, query: string): Promise<{ id: string; scope: string; text: string; similarity: number }[]> {
    const q = query.trim() ? await this.queryVector(query) : null;
    const { rows } = await this.db.query(loreQuery(!!q), [this.gameId, owner, ...(q ? [vec(q)] : [])]);
    for (const r of rows) if (r.scope !== "public" && r.scope !== owner) throw new Error(`Isolation: the lore query for ${owner} returned ${r.lore_id} (scope ${r.scope})`);
    return rows.map((r) => ({ id: r.lore_id as string, scope: r.scope as string, text: r.body as string, similarity: Number(r.similarity) }));
  }

  /** Removes this game's rows (tests; the game record keeps everything). */
  async drop(): Promise<void> {
    await this.db.query("DELETE FROM memory_rows WHERE game_id = $1", [this.gameId]);
    await this.db.query("DELETE FROM lore_rows WHERE game_id = $1", [this.gameId]);
  }
}

/** A pool from DATABASE_URL (never logged or recorded), with the schema in place. */
export async function openStoreDb(url: string): Promise<pg.Pool> {
  const pool = new pg.Pool({ connectionString: url, max: 4 });
  await VectorStore.migrate(pool);
  return pool;
}
