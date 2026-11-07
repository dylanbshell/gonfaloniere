// The embedding replay check's harness (CC-20261107-03): a saved game played again with its recorded
// replies must reproduce every prompt and every block 6, and the judge's verdict needs both orders.

import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { gzipSync } from "node:zlib";
import { rankWith, replayGame, verdicts, type EmbeddingTable, type Judgement } from "../src/minigame/embedding-replay.ts";
import { fakeDocs, fakeSettings, playFake } from "./fixtures/fake-game.ts";

test("a recorded game replays with every prompt byte-identical and every block 6 as recorded", async () => {
  const { game } = await playFake();
  const settings = fakeSettings();
  const rec = {
    header: { game_id: "fake-minigame-g1", seed: settings.seed, cast: settings.cast, briefings: settings.briefings, docs: fakeDocs.versions, config: settings },
    calls: game.calls,
  };
  const path = join(mkdtempSync(join(tmpdir(), "replay-")), "game-fake.full.json.gz");
  writeFileSync(path, gzipSync(JSON.stringify(rec)));
  const r = await replayGame(path);
  assert.equal(r.calls, game.calls.length);
  assert.equal(r.exact, game.calls.length);
  assert.deepEqual(r.inexact, []);
  assert.ok(r.points.length > 300);
  for (const p of r.points) {
    assert.ok(p.recorded, `${p.id}: matched to a call`);
    assert.deepEqual(p.recorded, p.overlap.lines, p.id);
    assert.ok(p.overlap.items.every((x) => p.overlap.lines.includes(x.line)), p.id);
    assert.ok(p.overlap.fillSlots >= 0 && p.overlap.fillSlots <= 12, p.id);
  }
});

test("with no query, every row ranks 0, as the live store returns them", () => {
  const rank = rankWith({ get: () => new Float32Array([1, 0]) } as unknown as EmbeddingTable);
  assert.deepEqual(rank([{ id: "R1", body: "x" }, { id: "R2", body: "y" }], "  "), [{ id: "R1", similarity: 0 }, { id: "R2", similarity: 0 }]);
});

test("a verdict counts only when both orders pick the same method; a TIE or a flip is a tie", () => {
  const j = (id: string, order: Judgement["order"], picks: Judgement["picks"]) => ({ id, order, picks }) as Judgement;
  const v = verdicts([
    j("p1", "A=overlap", "embeddings"),
    j("p1", "A=embeddings", "embeddings"),
    j("p2", "A=overlap", "overlap"),
    j("p2", "A=embeddings", "embeddings"),
    j("p3", "A=overlap", "tie"),
    j("p3", "A=embeddings", "tie"),
  ]);
  assert.deepEqual(Object.fromEntries(v), { p1: "embeddings", p2: "tie", p3: "tie" });
});
