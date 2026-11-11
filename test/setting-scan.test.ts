// TD v0.38's Setting Pack rule, checked (CC-20261111-05, #64): no string literal under src/ holds a roster
// name or alias, a faction name, or the currency word. The words come from the setting pack itself, so a
// reskin's names are checked the same way. Comments and identifiers may use the game's terms.

import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { settingPack } from "../src/setting/pack.ts";

/** Deliberate, with the reason. Keyed by file, then the word found. */
const ALLOWED: Record<string, Record<string, string>> = {
  "src/sources/docs.ts": {
    Florins: "the label of Mechanics' Tunable Values row (\"Starting Florins\") that loadDocs reads; it's a key into the doc, never written to a prompt, a record, or the screen",
  },
};

const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : f.endsWith(".ts") ? [join(dir, f)] : []));

/**
 * Every string, template, and regex literal's text in a TypeScript file, with comments skipped. A small
 * lexer (TypeScript 7's package has no JavaScript compiler API): strings and templates (with nested
 * `${...}`), comments, and regex literals where an expression can start.
 */
export function literals(code: string): string[] {
  const out: string[] = [];
  const regexBefore = /[(,=:[!&|?{};+\-*%<>~^]$|(?:^|[^\w$])(?:return|typeof|case|in|of|void|delete|throw|new)$/;
  let i = 0;
  const lex = (stopAtBrace: boolean): void => {
    let depth = 0;
    let last = "";
    while (i < code.length) {
      const c = code[i]!;
      const next = code[i + 1];
      if (c === "/" && next === "/") {
        while (i < code.length && code[i] !== "\n") i++;
      } else if (c === "/" && next === "*") {
        i = code.indexOf("*/", i + 2) + 2;
        if (i < 2) i = code.length;
      } else if (c === "'" || c === '"') {
        let text = "";
        i++;
        while (i < code.length && code[i] !== c) text += code[i] === "\\" ? code[i++]! + code[i++]! : code[i++]!;
        i++;
        out.push(text);
        last = "x";
      } else if (c === "`") {
        i++;
        let text = "";
        while (i < code.length && code[i] !== "`") {
          if (code[i] === "\\") text += code[i++]! + code[i++]!;
          else if (code[i] === "$" && code[i + 1] === "{") {
            out.push(text);
            text = "";
            i += 2;
            lex(true);
          } else text += code[i++]!;
        }
        i++;
        out.push(text);
        last = "x";
      } else if (c === "/" && regexBefore.test(last.trimEnd() || "(")) {
        let text = "";
        let cls = false;
        i++;
        while (i < code.length && (code[i] !== "/" || cls) && code[i] !== "\n") {
          if (code[i] === "\\") text += code[i++]!;
          else if (code[i] === "[") cls = true;
          else if (code[i] === "]") cls = false;
          text += code[i++]!;
        }
        i++;
        while (/[a-z]/.test(code[i] ?? "")) i++;
        out.push(text);
        last = "x";
      } else {
        if (stopAtBrace && c === "{") depth++;
        if (stopAtBrace && c === "}") {
          if (depth === 0) {
            i++;
            return;
          }
          depth--;
        }
        if (!/\s/.test(c)) last = (last + c).slice(-12);
        else last += " ";
        i++;
      }
    }
  };
  lex(false);
  return out;
}

const pack = settingPack();
const words = [...new Set([...pack.roster.flatMap((r) => [r.name, ...r.aliases]), ...pack.factions.map((f) => f.name), pack.currency.singular, pack.currency.plural])];
const pattern = new RegExp(`(?<![\\p{L}])(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort((a, b) => b.length - a.length).join("|")})(?![\\p{L}])`, "u");

test("no roster name, faction name, or currency word in a string literal under src/ (TD v0.38, The Setting Pack)", () => {
  assert.ok(words.length > 40, "the setting's words loaded");
  const found: string[] = [];
  const allowedSeen = new Set<string>();
  for (const f of files("src")) {
    for (const lit of literals(readFileSync(f, "utf8"))) {
      const m = lit.match(pattern);
      if (!m) continue;
      if (ALLOWED[f]?.[m[1]!]) {
        allowedSeen.add(`${f}|${m[1]}`);
        continue;
      }
      found.push(`${f}: "${m[1]}" in ${JSON.stringify(lit.slice(0, 80))}`);
    }
  }
  assert.deepEqual(found, [], "setting text belongs in setting/, scenarios/, or docs/");
  // An allow-list entry that no longer matches anything should go.
  assert.deepEqual([...allowedSeen].sort(), Object.entries(ALLOWED).flatMap(([f, ws]) => Object.keys(ws).map((w) => `${f}|${w}`)).sort());
});

test("the scanner catches what it's for", () => {
  assert.deepEqual(literals('const a = "Lupo"; // "Pazzi"\n/* "Medici" */ const b = `x ${f("Isabella")} y`; const r = /gave .* Florins/;'), ["Lupo", "x ", "Isabella", " y", "gave .* Florins"]);
  assert.deepEqual(literals("const q = a / b / c; const s = 'it\\'s';"), ["it\\'s"]);
  const sample = ["Contessa Isabella gave Lupo 3 Florins.", "the Medici council", "Captain LeNoir"];
  for (const s of sample) assert.match(s, pattern, s);
  for (const s of ["No one here.", "a Colloquio", "florid prose"]) assert.doesNotMatch(s, pattern, s);
});
