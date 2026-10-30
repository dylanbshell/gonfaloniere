// The blind-read scorer (src/minigame/blindread.ts) and the took-readings write-up (src/minigame/labels.ts),
// CC-20261029-01.

import assert from "node:assert/strict";
import { test } from "node:test";
import { readKey, readMarks, score } from "../src/minigame/blindread.ts";
import { labelsMd, readingsOf } from "../src/minigame/labels.ts";

test("a marked read scores per side and per box against its key", () => {
  const read = [
    "# A blind read", "", "## Spoken lines", "",
    "**1.** One.", "", "- [x] hard to follow", "- [ ] has real character", "",
    "**2.** Two.", "", "- [ ] hard to follow", "- [X] has real character", "",
    "**3.** Three.", "", "- [x] hard to follow", "- [x] has real character", "",
  ].join("\n");
  const key = ["# Key", "", "## Spoken lines (2 new, 1 baseline)", "", "| # | Side | Game | Line | Speaker |", "|---|---|---|---|---|", "| 1 | **new (TD v0.29)** | g1 | L1 | A |", "| 2 | baseline (TD v0.27) | g1 | L2 | B |", "| 3 | **new (TD v0.29)** | g2 | L3 | C |"].join("\n");
  const s = score(readMarks(read), readKey(key));
  assert.deepEqual(s, [{ section: "Spoken lines", sides: [
    { side: "new (TD v0.29)", items: 2, marked: { "hard to follow": [1, 3], "has real character": [3] } },
    { side: "baseline (TD v0.27)", items: 1, marked: { "has real character": [2] } },
  ] }]);
  assert.throws(() => score(readMarks(read.replace("**3.**", "**4.**")), readKey(key)), /no item 3/);
});

test("each labelled thought says whether the attachment rule stored it, and the counts follow the register check", () => {
  const rec = {
    header: { game_id: "g1", seed: 2000, docs: { technicalDesign: "0.29" } },
    lines: [{ id: "L1", turn: 1, conversation: "C1", kind: "speech", speaker: "Lupo", text: "I saw nothing at the church, and I said so." }],
    thoughts: [
      { id: "T1", turn: 1, character: "Contessa Isabella", call: "think", text: "He admits he was there.", took: "admission", took_target: "other", target_line: "L1", after_line: "L1", words: "I saw nothing at the church" },
      { id: "T2", turn: 1, character: "Giorgia Pazzi", call: "think", text: "He was there.", took: "admission", took_target: "other", target_line: "L1", after_line: "L1", words: "at the cathedral" },
      { id: "T3", turn: 1, character: "Francesco Pazzi", call: "think", text: "Nothing to it.", took: "none", took_target: "none", target_line: null },
      { id: "T4", turn: 1, character: "Lupo", call: "plan", text: "A plan." },
    ],
    memory: { readings: [{ id: "R1", thought: "T1" }], label_log: [{ thought: "T2", reason: "wrong-line words" }] },
  };
  const rs = readingsOf(rec);
  assert.deepEqual(rs.map((r) => [r.thought.id, r.stored]), [["T1", "stored as reading R1"], ["T2", "not stored: wrong-line words"]]);
  const md = labelsMd([rec], { labels: ["admission"], samples: [], seed: 1, title: "T" });
  assert.match(md, /\| v0\.29 \| 2 \| 100\.0% \| 1 \|/);
  assert.match(md, /“at the cathedral” \(not found in this line\)/);
  assert.ok(!md.includes("A plan."));
});
