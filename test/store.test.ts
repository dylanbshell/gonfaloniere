// TD v0.22–v0.24: the live store (PostgreSQL with pgvector) and the lore store. Database tests run
// against TEST_DATABASE_URL, a real local PostgreSQL with pgvector, with a deterministic fake
// embedder; they're skipped, saying so, when it isn't set. Nothing here mocks the database.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";
import pg from "pg";
import type { CharacterName } from "../src/game/roster.ts";
import { embedderFromEnv, hashEmbedder, openAiCompatibleEmbedder, type Embedder } from "../src/minigame/embed.ts";
import type { CallRequest, MiniGame } from "../src/minigame/engine.ts";
import { isolationCheck, type IsolationRecord } from "../src/minigame/isolation.ts";
import { LORE_BUDGET, loreHeader, loreLines, readLoreFile, type LoreEntry } from "../src/minigame/lore.ts";
import { MemoryStore, overlapScore, renderReading, type Belief, type GameLine, type Thought } from "../src/minigame/memory.ts";
import { VectorStore, notebookQuery, openStoreDb, storeRows } from "../src/minigame/store.ts";
import { fakeDocs, playFake } from "./fixtures/fake-game.ts";

const L = "Lupo" as CharacterName;
const I = "Contessa Isabella" as CharacterName;
const R = "Raffaello de' Medici" as CharacterName;
const A = "Captain Armand LeNoir" as CharacterName;

/** Every prompt of a call list, hashed. */
function promptHash(calls: CallRequest[]): string {
  const h = createHash("sha256");
  for (const c of calls) h.update(`${c.kind}\u0000${c.character}\u0000${c.system}\u0000${c.user}\u0000${c.maxTokens}\u0001`);
  return h.digest("hex");
}

/**
 * The fake game's prompts at commit f812ab4 (part A of CC-20261028-07, before the live store and the
 * lore store existed): 448 calls on TD v0.24, seat calls included. With `lore: off` and word-overlap
 * retrieval, every prompt must stay byte-identical. Update only for a deliberate prompt change.
 */
const PROMPTS_BEFORE_STORE = "517f372fd98c75344369f1e9e203384886bd3f3f632bebf1b6ff4841e3b4f494";

/** A game record's fields the isolation check reads. */
function recordOf(game: MiniGame, lore: LoreEntry[] = []): IsolationRecord {
  return {
    header: { docs: { technicalDesign: fakeDocs.versions.technicalDesign }, notebook: "perceived" },
    calls: game.calls,
    lines: game.lines,
    memory: { entries: game.memory.entries, beliefs: game.memory.beliefs, readings: game.memory.readings, lore },
  };
}

const lorePrompts = (calls: CallRequest[]) => calls.filter((c) => c.user.includes("WHAT YOU KNOW OF FLORENCE"));
const loreSection = (user: string) => {
  const lines = user.split("\n");
  const at = lines.indexOf("WHAT YOU KNOW OF FLORENCE");
  const out: string[] = [];
  for (const l of lines.slice(at + 1)) {
    if (!l.startsWith("- ")) break;
    out.push(l.slice(2));
  }
  return { lines: out, next: lines[at + 1 + out.length], after: lines[at + 2 + out.length] };
};

// ---- No database ---------------------------------------------------------------------------------------

test("lore off, word-overlap retrieval: every prompt is byte-identical to before the store (golden from f812ab4)", async () => {
  const { calls } = await playFake();
  assert.equal(calls.length, 448);
  assert.ok(calls.some((c) => c.kind === "seat"));
  assert.equal(lorePrompts(calls).length, 0);
  assert.equal(promptHash(calls), PROMPTS_BEFORE_STORE);
});

test("lore file: only approved, canon-checked entries load; scopes are public or a full name; the hash is of the file's bytes", () => {
  const dir = mkdtempSync(join(tmpdir(), "lore-"));
  const path = join(dir, "lore.json");
  const entries = [
    { id: "P1", title: "The Signoria", scope: "public", text: "The Signoria meets in the Palazzo.", source: "Lore doc", status: "approved", canon_checked: true },
    { id: "P2", title: "Draft", scope: "public", text: "A draft.", source: "Lore doc", status: "draft", canon_checked: true },
    { id: "P3", title: "Unchecked", scope: "public", text: "Unchecked.", source: "Lore doc", status: "approved", canon_checked: false },
    { id: "X1", title: "Lupo's past", scope: L, text: "Lupo learned his trade in Naples.", source: "Characters doc, Shared Canon", status: "approved", canon_checked: true },
  ];
  writeFileSync(path, JSON.stringify(entries));
  const f = readLoreFile(path);
  assert.deepEqual(f.loadable.map((e) => e.id), ["P1", "X1"]);
  assert.equal(f.hash, createHash("sha256").update(JSON.stringify(entries)).digest("hex"));
  assert.deepEqual(loreHeader(f, "on"), { lore: "on", lore_file: { path, hash: f.hash, entries_in_file: 4, entries_loaded: 2 } });
  assert.deepEqual(loreHeader(f, "off").lore_file.entries_loaded, 0);
  writeFileSync(path, JSON.stringify([{ ...entries[0], scope: "Lupo the Elder" }]));
  assert.throws(() => readLoreFile(path), /neither public nor a character's full name/);
  // The repo's file starts empty: no lore content is written by code.
  assert.deepEqual(readLoreFile().all, []);
});

test("lore lines: up to 3, about 150 tokens at most; one that would pass the cap is skipped and a shorter one can fit", () => {
  const long = { text: "x".repeat(400) }; // ~115 tokens
  const short = (n: number) => ({ text: `Short fact ${n}.` });
  assert.deepEqual(loreLines([long, long, short(1), short(2), short(3)]), [long.text, short(1).text, short(2).text]);
  assert.deepEqual(loreLines([short(1), short(2), short(3), short(4)]).length, 3);
  assert.ok(loreLines([long, long]).join("").length / 3.5 <= LORE_BUDGET);
});

test("embedders: the OpenAI-compatible one keeps input order and reported cost; the env one needs all three variables", async () => {
  const client = {
    embeddings: {
      create: async (req: { model: string; input: string[] }) => ({
        data: [
          { index: 1, embedding: [0, 1], object: "embedding" },
          { index: 0, embedding: [1, 0], object: "embedding" },
        ],
        model: req.model,
        object: "list",
        usage: { prompt_tokens: 7, total_tokens: 7, cost: 0.00001 },
      }),
    },
  };
  const e = openAiCompatibleEmbedder(client as never, "some/embedding-model");
  assert.deepEqual(await e.embed(["a", "b"]), { vectors: [[1, 0], [0, 1]], inputTokens: 7, costUsd: 0.00001 });
  assert.equal(embedderFromEnv({ EMBEDDING_MODEL_BASE_URL: "http://x", EMBEDDING_MODEL_ID: "m" }), null);
  assert.equal(embedderFromEnv({ EMBEDDING_MODEL_BASE_URL: "http://x", EMBEDDING_MODEL_API_KEY: "k", EMBEDDING_MODEL_ID: "m" })!.model, "m");
});

test("the isolation filter is in the WHERE clause, by owner (the reference record only by audience, in shared mode)", () => {
  const perceived = notebookQuery("perceived", true);
  assert.match(perceived, /WHERE game_id = \$1 AND owner = \$2 AND kind = ANY\(\$3::text\[\]\)\nORDER BY embedding <=> \$4::vector, row_id/);
  assert.ok(!perceived.includes("audience)"), "no audience branch in the default mode");
  assert.match(notebookQuery("shared", true), /OR \(kind = 'reference' AND owner IS NULL AND \$2 = ANY\(audience\)\)/);
});

test("the isolation check over a record catches another character's notebook line or private lore", () => {
  const where = { kind: "capannello" as const, members: [L, I] };
  const line: GameLine = { id: "L1", turn: 1, conversation: "C1", where, kind: "speech", speaker: R, addressee: null, text: "The seal is in the chapel.", heardBy: [L, I] } as GameLine;
  const reading = { id: "R1", character: I, turn: 1, conversation: "C1", line: "L1", speaker: R, took: "claim", thought: "T1", about: [R], own: false, salient: false, words: null } as const;
  const theirs = renderReading(reading as never, line);
  const lore: LoreEntry[] = [{ id: "X1", title: "t", scope: I, text: "Isabella's mother was a Strozzi.", source: "s", status: "approved", canon_checked: true }];
  const prompt = (bullets: string[], extra = "") => `NOW\n${extra}\nWHAT YOU REMEMBER FROM EARLIER TONIGHT\n${bullets.map((b) => `- ${b}`).join("\n")}\n(★ marks …)`;
  const rec = (user: string, character: CharacterName): IsolationRecord => ({
    header: { docs: { technicalDesign: "0.24" } },
    calls: [{ n: 1, kind: "think", character, user }],
    lines: [line],
    memory: { entries: [], beliefs: [], readings: [reading as never], lore },
  });
  assert.equal(isolationCheck(rec(prompt([theirs]), I)).violations.length, 0);
  const leak = isolationCheck(rec(prompt([theirs]), L));
  assert.deepEqual(leak.violations.map((v) => [v.section, v.belongsTo]), [["memory", [I]]]);
  assert.equal(isolationCheck(rec(prompt([], `WHAT YOU KNOW OF FLORENCE\n- ${lore[0]!.text}\n`), L)).violations.length, 2, "in the lore section, and anywhere in the prompt");
});

// ---- With the database -----------------------------------------------------------------------------------

const DB = process.env.TEST_DATABASE_URL;

describe("live store (PostgreSQL + pgvector)", { skip: DB ? false : "TEST_DATABASE_URL isn't set: no local PostgreSQL with pgvector" }, () => {
  let pool: pg.Pool;
  const games: VectorStore[] = [];
  let n = 0;
  const store = (embedder: Embedder = hashEmbedder()) => {
    const s = new VectorStore(pool, `test-${process.pid}-${Date.now()}-${++n}`, embedder);
    games.push(s);
    return s;
  };

  before(async () => {
    pool = await openStoreDb(DB!);
  });
  after(async () => {
    for (const s of games) await s.drop();
    await pool.end();
  });

  // Lupo's and Isabella's notebooks: near-identical lines, each heard by only one of them.
  function twoNotebooks() {
    const m = new MemoryStore();
    m.fillCap = { labels: ["claim", "denial", "insult", "pressure"], max: 3 };
    const lines: GameLine[] = [];
    const thoughts: Thought[] = [];
    const add = (n: number, who: CharacterName, speaker: CharacterName, text: string, took: Thought["took"]) => {
      const l = { id: `L${n}`, turn: 1 + Math.floor(n / 20), conversation: `C${who === L ? 1 : 2}`, where: { kind: "capannello", members: [who, speaker] }, kind: "speech", speaker, addressee: null, text, heardBy: [who, speaker] } as GameLine;
      lines.push(l);
      thoughts.push({ id: `T${n}`, turn: l.turn, character: who, call: "think", text: "…", after_line: l.id, conversation: l.conversation, took, target_line: l.id, words: null } as Thought);
    };
    add(1, L, R, "The boar seal lies under the chapel altar, Lupo.", "claim");
    add(2, I, A, "The boar seal lies under the chapel altar, Contessa.", "claim");
    add(3, L, R, "We dine at the Medici palace tomorrow.", "claim");
    for (const t of [1]) m.writeReadings(t, thoughts, lines, { ownFromSpeak: true, sinceArrival: true });
    return m;
  }

  test("isolation: another character's near-identical row is never returned, however similar", async () => {
    const m = twoNotebooks();
    const s = store();
    await s.flush(m);
    const query = "The boar seal lies under the chapel altar, Contessa.";
    const lupo = await s.rank(L, "perceived", query);
    const isabella = await s.rank(I, "perceived", query);
    const owner = (id: string) => m.readings.find((r) => r.id === id)!.character;
    assert.deepEqual([...new Set(lupo.map((r) => owner(r.id)))], [L]);
    assert.equal(lupo.length, 2);
    assert.equal(owner(isabella[0]!.id), I);
    assert.ok(isabella[0]!.similarity > 0.99, "Isabella's row is the closest match to the query");
    const block6 = m.retrieveNotebook(L, [], [query], { ranked: lupo });
    assert.ok(block6.every((b) => !b.includes("Contessa.")));
    // The rows hold the full line text for readings.
    const { rows } = await pool.query("SELECT body FROM memory_rows WHERE game_id = $1 AND owner = $2 ORDER BY row_id", [s.gameId, I]);
    assert.deepEqual(rows.map((r) => r.body), ["The boar seal lies under the chapel altar, Contessa."]);
  });

  test("shared mode: reference entries come only through their audience", async () => {
    const m = new MemoryStore();
    const where = { kind: "colloquio" as const, members: [L, I] };
    m.addEntry({ turn: 1, conversation: "C3", where, type: "promise", speaker: I, toward: L, about: [L], summary: "Contessa Isabella promised Lupo silence.", quote: "silence", lines: ["L9"], audience: [L, I], source: "10a" });
    m.addEntry({ turn: 1, conversation: "C4", where: { kind: "colloquio", members: [R, A] }, type: "deal", speaker: R, toward: A, about: [A], summary: "Raffaello de' Medici agreed to back LeNoir.", quote: "back", lines: ["L10"], audience: [R, A], source: "10a" });
    const s = store();
    await s.flush(m);
    assert.deepEqual((await s.rank(L, "shared", "silence")).map((r) => r.id), ["M1"]);
    assert.deepEqual((await s.rank(L, "perceived", "silence")).map((r) => r.id), [], "never in the default mode");
    assert.deepEqual((await s.rank(A, "shared", "silence")).map((r) => r.id), ["M2"]);
  });

  test("each row is embedded once, parallel flushes included; query embeddings are made per distinct query", async () => {
    const seen: string[] = [];
    const base = hashEmbedder();
    const counting: Embedder = { model: base.model, embed: async (t) => (seen.push(...t), base.embed(t)) };
    const m = twoNotebooks();
    const s = store(counting);
    await Promise.all([s.flush(m), s.flush(m), s.flush(m)]);
    assert.equal(seen.length, storeRows(m).length);
    assert.equal(await s.flush(m), 0);
    await Promise.all([s.rank(L, "perceived", "q one"), s.rank(I, "perceived", "q one"), s.rank(L, "perceived", "q two")]);
    assert.equal(seen.length, storeRows(m).length + 2);
    const { rows } = await pool.query("SELECT count(*)::int AS n FROM memory_rows WHERE game_id = $1", [s.gameId]);
    assert.equal(rows[0].n, storeRows(m).length);
  });

  /** Lupo's notebook for the order test: ★ readings and a payment naming Raffaello, beliefs, and many claims and pressure readings. */
  function rich() {
    const m = new MemoryStore();
    m.fillCap = { labels: ["claim", "denial", "insult", "pressure"], max: 3 };
    const lines: GameLine[] = [];
    const thoughts: Thought[] = [];
    const where = { kind: "capannello" as const, members: [L, R, A] };
    const add = (n: number, speaker: CharacterName, text: string, took: Thought["took"]) => {
      const l = { id: `L${n}`, turn: 1 + Math.floor(n / 8), conversation: "C1", where, kind: "speech", speaker, addressee: null, text, heardBy: [L, R, A] } as GameLine;
      lines.push(l);
      thoughts.push({ id: `T${n}`, turn: l.turn, character: L, call: "think", text: "…", after_line: l.id, conversation: "C1", took, target_line: l.id, words: null } as Thought);
    };
    const topics = ["the seal", "the gate", "the river", "the chapel", "the market", "the bridge", "the loggia", "the vote"];
    for (let i = 0; i < 8; i++) add(i, R, `Answer me, Lupo, about ${topics[i]} and the night watch.`, "pressure");
    for (let i = 8; i < 16; i++) add(i, A, `I saw ${topics[i - 8]} open on the night of the killing.`, "claim");
    for (let i = 16; i < 20; i++) add(i, R, `Raffaello swears to pay for ${topics[i - 16]} by morning.`, i % 2 ? "deal" : "promise");
    for (const t of [...new Set(lines.map((l) => l.turn))]) m.writeReadings(t, thoughts, lines, { ownFromSpeak: true, sinceArrival: true });
    m.addEntry({ turn: 2, conversation: "C2", where: { kind: "colloquio", members: [L, R] }, type: "payment", speaker: R, toward: L, about: [R, L], summary: "Raffaello de' Medici gave Lupo 3 Florins.", quote: null, lines: ["L90"], audience: [L, R], source: "code" });
    const belief = (id: string, statement: string): Belief => ({ id, character: L, kind: "conclusion", status: "held", statement, firstTurn: 2, lastTurn: 2, thought: "T1", quote: "q" });
    m.beliefs.push(belief("B1", "Raffaello de' Medici fears the vote."), belief("B2", "Raffaello de' Medici owes the Contessa."), belief("B3", "Raffaello de' Medici watches the gate."), belief("B4", "Raffaello de' Medici lies about the seal."), belief("B5", "The chapel hides the seal."));
    return m;
  }
  const query = ["Captain Armand LeNoir: I saw the gate open, and the seal with it.", "Raffaello de' Medici: Answer me about the seal."];
  const tokens = (b: string[]) => b.reduce((s, x) => s + Math.ceil(x.length / 3.5), 0);

  test("order, caps, and budget are unchanged: overlap's own scores as a ranking give the overlap output byte for byte", () => {
    const m = rich();
    const text = (id: string) => {
      const r = m.readings.find((x) => x.id === id);
      if (r) return m.lineOf(r.line)!.text;
      const e = m.entries.find((x) => x.id === id);
      if (e) return e.summary;
      return m.beliefs.find((x) => x.id === id)!.statement;
    };
    const ids = [...m.readings.map((r) => r.id), ...m.entries.map((e) => e.id), ...m.beliefs.map((b) => b.id)];
    const ranked = ids.map((id) => ({ id, similarity: overlapScore(query, text(id)) }));
    assert.deepEqual(m.retrieveNotebook(L, [R], query, { ranked }), m.retrieveNotebook(L, [R], query));
  });

  test("under pgvector: ★ first (up to 6), held beliefs (up to 3), then the most similar, ≤3 per capped label, ≤12 lines, ≤450 tokens", async () => {
    const m = rich();
    const s = store();
    await s.flush(m);
    const ranked = await s.rank(L, "perceived", query.join("\n"));
    const pgv = m.retrieveNotebook(L, [R], query, { ranked });
    const word = m.retrieveNotebook(L, [R], query);
    const star = (b: string[]) => b.filter((x) => x.includes("★"));
    assert.deepEqual(star(pgv), star(word), "step 1 doesn't depend on similarity");
    assert.equal(star(pgv).length, 5, "four ★ readings and the payment name Raffaello");
    // Step 2: the first three held beliefs about Raffaello, under either measure (the fill may add more by similarity).
    for (const b of ["fears the vote", "owes the Contessa", "watches the gate"]) assert.ok(pgv.some((x) => x.includes(b)) && word.some((x) => x.includes(b)));
    for (const label of ["(you took it as a claim)", "(you took it as pressure)"]) assert.ok(pgv.filter((x) => x.endsWith(label)).length <= 3);
    assert.ok(pgv.length <= 12 && tokens(pgv) <= 450);
    // The fill's first line is the most similar row not taken in steps 1–2.
    const fill = pgv.filter((x) => !x.includes("★") && !x.includes("your belief"));
    const top = ranked.map((r) => m.readings.find((x) => x.id === r.id)).find((r) => r && !r.salient)!;
    assert.ok(fill.some((x) => x.includes(m.lineOf(top.line)!.text.slice(0, 30))));
  });

  test("a pgvector game: rows written each turn, every prompt passes the isolation check; a planted leak is caught", async () => {
    const s = store();
    const { game, calls } = await playFake({ retrieval: "pgvector", turns: 4 }, {}, s);
    const { rows } = await pool.query("SELECT owner, count(*)::int AS n FROM memory_rows WHERE game_id = $1 GROUP BY owner", [s.gameId]);
    assert.ok(rows.length >= 6, "rows for every character");
    assert.equal(rows.reduce((t, r) => t + r.n, 0), storeRows(game.memory).length);
    const iso = isolationCheck(recordOf(game));
    assert.equal(iso.violations.length, 0, JSON.stringify(iso.violations.slice(0, 3)));
    assert.ok(iso.memoryLines > 50, `block 6 lines checked: ${iso.memoryLines}`);
    // Plant one of Isabella's readings in Lupo's last think().
    const foreign = game.memory.readings.find((r) => r.character === I && !game.memory.readings.some((x) => x.character === L && x.line === r.line))!;
    const lupo = [...game.calls].reverse().find((c) => c.character === L && c.user.includes("WHAT YOU REMEMBER FROM EARLIER TONIGHT\n- "))!;
    const planted = renderReading(foreign, game.lines.find((l) => l.id === foreign.line)!, undefined, true);
    const tampered = { ...recordOf(game), calls: game.calls.map((c) => (c === lupo ? { ...c, user: c.user.replace("WHAT YOU REMEMBER FROM EARLIER TONIGHT\n", `WHAT YOU REMEMBER FROM EARLIER TONIGHT\n- ${planted}\n`) } : c)) };
    assert.deepEqual(isolationCheck(tampered).violations.map((v) => [v.character, v.belongsTo]), [[L, [I]]]);
    assert.ok(calls.length > 100);
  });

  test("lore off with the store present: prompts still byte-identical to before", async () => {
    const { calls } = await playFake({ lore: "off" }, {}, store());
    assert.equal(promptHash(calls), PROMPTS_BEFORE_STORE);
  });

  test("lore on: placed just before block 6's heading, ≤3 lines and ~150 tokens, drafts and unchecked excluded, no one else's private lore", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lore-"));
    const path = join(dir, "lore.json");
    const entry = (id: string, scope: string, text: string, status = "approved", canon_checked = true) => ({ id, title: id, scope, text, source: "test", status, canon_checked });
    const file = [
      entry("P1", "public", "The bridge over the Arno is where the city trades its news."),
      entry("P2", "public", "The chapel of the Signoria is kept by the Dominicans."),
      entry("P3", "public", "The market opens at dawn, and every rumour starts there."),
      entry("P4", "public", "The loggia is where the guilds once swore their oaths before the city, in the years when the wool trade made Florence rich, and the old families still meet there."),
      entry("P5", "public", "The river rose last spring and the bridge nearly fell."),
      entry("LUPO", L, "Lupo grew up by the river, among the dyers' vats at the bridge."),
      entry("ISA", I, "Isabella keeps her late husband's chapel ring by the market."),
      entry("DRAFT", "public", "DRAFT the bridge and the river and the chapel and the market.", "draft"),
      entry("UNCHECKED", "public", "UNCHECKED the bridge and the river and the chapel.", "approved", false),
    ];
    writeFileSync(path, JSON.stringify(file));
    const lore = readLoreFile(path);
    const s = store();
    await s.loadLore(lore.loadable);
    const { game, calls } = await playFake({ lore: "on", turns: 3 }, {}, s);
    const withLore = lorePrompts(calls);
    assert.ok(withLore.length > 100, `${withLore.length} prompts with lore`);
    for (const c of withLore) {
      const sec = loreSection(c.user);
      assert.ok(sec.lines.length >= 1 && sec.lines.length <= 3);
      assert.ok(tokens(sec.lines) <= 150);
      assert.equal(sec.next, "", "a blank line, then block 6");
      assert.equal(sec.after, "WHAT YOU REMEMBER FROM EARLIER TONIGHT");
      assert.ok(!c.user.includes("DRAFT") && !c.user.includes("UNCHECKED"));
      if (c.character !== L) assert.ok(!c.user.includes(file[5]!.text));
      if (c.character !== I) assert.ok(!c.user.includes(file[6]!.text));
    }
    assert.ok(withLore.some((c) => c.character === L && c.user.includes(file[5]!.text)), "Lupo's own lore reaches him");
    assert.ok(calls.filter((c) => c.kind === "star-pass").every((c) => !c.user.includes("WHAT YOU KNOW OF FLORENCE")), "system calls carry no lore");
    assert.equal(isolationCheck(recordOf(game, lore.loadable)).violations.length, 0);
    assert.equal(loreHeader(lore, "on").lore_file.hash, createHash("sha256").update(JSON.stringify(file)).digest("hex"));
  });
});

// ---- One live call, when an embeddings endpoint is configured ----------------------------------------------

test("live smoke test of the configured embeddings endpoint (one call, two short texts)", { skip: embedderFromEnv() && process.env.EMBEDDING_SMOKE === "1" ? false : "EMBEDDING_MODEL_* and EMBEDDING_SMOKE=1 not set" }, async () => {
  const e = embedderFromEnv()!;
  const r = await e.embed(["The boar seal lies under the chapel.", "Florence at night."]);
  assert.equal(r.vectors.length, 2);
  assert.ok(r.vectors[0]!.length > 0 && r.vectors[0]!.length === r.vectors[1]!.length);
  console.log(`embedding smoke: ${e.model}, dim ${r.vectors[0]!.length}, ${r.inputTokens} tokens, cost ${r.costUsd ?? "not reported"}`);
});
