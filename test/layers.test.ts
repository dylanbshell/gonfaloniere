// TD v0.39's Layers, kept honest (CC-20261111-07, #71): src/rules/ imports nothing but its own files
// (no Node modules either, so no I/O), and src/core/ imports nothing from the rules, the games, the
// mini-game, or the setting. Like the setting scanner, it reads the source, not the module graph.

import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import { test } from "node:test";

const files = (dir: string): string[] =>
  existsSync(dir) ? readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? files(join(dir, f)) : /\.(ts|tsx|mts)$/.test(f) ? [join(dir, f)] : [])) : [];

/** Every module specifier a file names: static imports and re-exports, import(), and require(). */
export function specifiers(code: string): string[] {
  const out: string[] = [];
  const noComments = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
  for (const m of noComments.matchAll(/\b(?:import|export)\b[^;"'`]*?\bfrom\s*["']([^"']+)["']/g)) out.push(m[1]!);
  for (const m of noComments.matchAll(/\bimport\s*["']([^"']+)["']/g)) out.push(m[1]!);
  for (const m of noComments.matchAll(/\b(?:import|require)\s*\(\s*["'`]([^"'`]+)["'`]/g)) out.push(m[1]!);
  return out;
}

/** Where a relative specifier points, from the repo root; a bare one (a package or node:) as written. */
const target = (file: string, spec: string) => (spec.startsWith(".") ? relative(".", normalize(join(dirname(file), spec))) : spec);

test("src/rules/ imports only its own files: no model calls, no I/O, no setting, no docs", () => {
  const rules = files("src/rules");
  assert.ok(rules.length >= 6, "the rules module exists");
  const bad = rules.flatMap((f) => specifiers(readFileSync(f, "utf8")).filter((s) => !target(f, s).startsWith("src/rules/")).map((s) => `${f}: ${s}`));
  assert.deepEqual(bad, []);
});

test("src/core/ imports nothing from src/rules/, src/games/, src/minigame/, or setting/ (held for #61's human controller)", () => {
  const forbidden = ["src/rules/", "src/games/", "src/minigame/", "setting/"];
  const bad = files("src/core").flatMap((f) => specifiers(readFileSync(f, "utf8")).filter((s) => forbidden.some((p) => target(f, s).startsWith(p))).map((s) => `${f}: ${s}`));
  assert.deepEqual(bad, []);
});

test("the setting scanner has no allow-list entry for src/rules/ or src/core/", () => {
  // Read from the scanner's source: importing a test file would run its tests twice.
  const scan = readFileSync("test/setting-scan.test.ts", "utf8");
  const allowList = scan.slice(scan.indexOf("const ALLOWED"), scan.indexOf("\n};", scan.indexOf("const ALLOWED")));
  assert.ok(allowList.includes('"src/sources/docs.ts"'), "found the allow-list");
  assert.doesNotMatch(allowList, /"src\/(rules|core)\//);
});

test("the specifier reader finds what it's for", () => {
  const code = `import a from "./a.ts";\nimport type { B } from "../b.ts";\nexport { c } from "./c.ts";\nimport "./side.ts";\nconst d = await import("../../setting/x.json");\n// import e from "./commented.ts";\nimport {\n  f,\n} from "node:fs";`;
  assert.deepEqual(specifiers(code).sort(), ["../../setting/x.json", "../b.ts", "./a.ts", "./c.ts", "./side.ts", "node:fs"].sort());
  assert.equal(target("src/rules/x.ts", "../game/roster.ts"), "src/game/roster.ts");
});
