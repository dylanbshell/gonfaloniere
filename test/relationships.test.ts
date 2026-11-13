// relationships.json against Characters v0.12 (CC-20261113-03, #93): the file is a transcription of the
// Characters doc's Shared Canon: Relationships (the Web of Secrets), so it is checked against the doc as
// loaded: the public table's pairs, each character's row of their own connections, and every private line
// word for word in that character's briefing.

import assert from "node:assert/strict";
import { test } from "node:test";
import { charactersPath, docsFor } from "../probe.config.ts";
import { relationshipTypes, relationships, settingPack } from "../src/setting/pack.ts";
import { loadDocs, readDoc } from "../src/sources/docs.ts";

const CHARACTERS = "0.12";
const doc = readDoc(charactersPath(CHARACTERS));
const briefings = loadDocs(docsFor("0.46", CHARACTERS)).briefings as Record<string, string>;
const rel = relationships();
const roster = settingPack().roster.map((r) => r.name);
const six = relationshipTypes();

/** The rows of the markdown table under `heading`, up to the next heading, as cells. */
function table(heading: string): string[][] {
  const start = doc.indexOf(heading);
  assert.ok(start >= 0, heading);
  const end = doc.slice(start + heading.length).search(/\n#{2,3} /);
  return doc
    .slice(start, end < 0 ? undefined : start + heading.length + end)
    .split("\n")
    .filter((l) => /^\| /.test(l) && !/^\|---/.test(l))
    .slice(1)
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
}
const pair = (a: string, b: string) => [a, b].sort().join(" + ");

test("every name is a roster name, and every type is one of the six", () => {
  assert.deepEqual(six, ["romance", "kin", "service", "alliance", "rivalry", "money"]);
  for (const c of rel.public) {
    assert.ok(c.between.every((n) => roster.includes(n)), JSON.stringify(c));
    assert.ok(six.includes(c.type), JSON.stringify(c));
  }
  assert.deepEqual(Object.keys(rel.private).sort(), [...roster].sort(), "an entry for each of the twelve");
  for (const [who, list] of Object.entries(rel.private))
    for (const c of list) {
      assert.ok(roster.includes(c.with) && c.with !== who, `${who}: ${c.with}`);
      assert.ok(six.includes(c.type), `${who}: ${c.with} ${c.type}`);
    }
});

test("public: the 14 pairs of Characters v0.12's table, with its types and lines, and no others", () => {
  const rows = table("### Public connections");
  assert.equal(rows.length, 14);
  assert.deepEqual(
    rel.public.map((c) => [pair(c.between[0], c.between[1]), c.type, c.line]),
    rows.map(([a, b, type, line]) => [pair(a!, b!), type, line]),
  );
});

test("private: each character's list names exactly the guests in their row, with their types", () => {
  const rows = table("### Each character's own connections");
  assert.equal(rows.length, 12);
  for (const [who, cell] of rows) {
    const expected = cell!.split(" · ").map((x) => x.match(/^(.+?) `(\w+)`$/)!.slice(1, 3));
    assert.deepEqual(
      rel.private[who!]!.map((c) => [c.with, c.type]),
      expected,
      who,
    );
  }
});

test("private: every line is word for word in that character's briefing, as its bullet for the guest, first letter capitalised", () => {
  for (const [who, list] of Object.entries(rel.private)) {
    const b = briefings[who]!;
    assert.ok(b, who);
    const section = b.slice(b.indexOf("**Relationships**"));
    for (const c of list) {
      const asWritten = c.line.charAt(0).toLowerCase() + c.line.slice(1);
      assert.ok(section.includes(`:** ${asWritten}`) || section.includes(`:** ${c.line}`), `${who} on ${c.with}: "${c.line}"`);
    }
  }
});
