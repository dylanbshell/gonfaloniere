// Browser stand-ins for the Node modules the mini-game engine imports (CC-20261116-01, #172), as an
// esbuild plugin. Only what the fake game touches: the setting pack and lore file read from a map of
// files embedded at build time; nothing is written, hashed for comparison, or read from git history.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "esbuild";

/** Every .json file under the given folders, keyed by repo-relative path. */
export function virtualFiles(dirs: string[]): Record<string, string> {
  const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : f.endsWith(".json") ? [join(dir, f)] : []));
  return Object.fromEntries(dirs.flatMap(walk).map((p) => [p.split("\\").join("/"), readFileSync(p, "utf8")]));
}

const PATH = `
const norm = (p) => {
  const out = [];
  for (const part of String(p).split("/")) {
    if (part === "" || part === ".") continue;
    if (part === ".." && out.length && out[out.length - 1] !== "..") out.pop();
    else out.push(part);
  }
  return out.join("/") || ".";
};
export const join = (...parts) => norm(parts.filter((p) => p !== "").join("/"));
// The demo's working directory is the repo root, and every path stays relative to it.
export const resolve = (...parts) => norm(parts.reduce((at, p) => (String(p).startsWith("/") ? p : at + "/" + p), "."));
export const dirname = (p) => { const n = norm(p); const i = n.lastIndexOf("/"); return i < 0 ? "." : n.slice(0, i); };
export const basename = (p, ext) => { const b = norm(p).split("/").pop(); return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b; };
export const extname = (p) => { const b = basename(p); const i = b.lastIndexOf("."); return i <= 0 ? "" : b.slice(i); };
export const sep = "/";
export default { join, resolve, dirname, basename, extname, sep };
`;

const fs = (files: Record<string, string>) => `
import { resolve } from "node:path";
const FILES = ${JSON.stringify(files)};
const missing = (p) => Object.assign(new Error("ENOENT: the demo page has no file " + p), { code: "ENOENT" });
export const existsSync = (p) => resolve(String(p)) in FILES;
export function readFileSync(p, encoding) {
  const key = resolve(String(p));
  if (!(key in FILES)) throw missing(p);
  const text = FILES[key];
  if (encoding) return text;
  // Bytes whose toString() is the text: some callers JSON.parse the result directly.
  const bytes = new TextEncoder().encode(text);
  bytes.toString = () => text;
  return bytes;
}
const never = (name) => () => { throw new Error("the demo page can't " + name); };
export const writeFileSync = never("write files");
export const mkdirSync = never("make folders");
export const readdirSync = never("list folders");
export const statSync = never("stat files");
export default { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync };
`;

// A stable hex digest (FNV-1a, widened): lore is off in the fake game, so no hash is ever compared.
const CRYPTO = `
export function createHash() {
  let text = "";
  const hash = {
    update(data) { text += typeof data === "string" ? data : new TextDecoder().decode(data); return hash; },
    digest() {
      let out = "";
      for (let seed = 0; seed < 8; seed++) {
        let h = (0x811c9dc5 ^ seed) >>> 0;
        for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
        out += h.toString(16).padStart(8, "0");
      }
      return out;
    },
  };
  return hash;
}
export const randomUUID = () => globalThis.crypto.randomUUID();
export default { createHash, randomUUID };
`;

// Git history is only read for older doc versions, which the demo never loads.
const CHILD_PROCESS = `
const never = (name) => () => { throw new Error("the demo page can't run a process (" + name + ")"); };
export const execFileSync = never("execFileSync");
export const execSync = never("execSync");
export const spawnSync = never("spawnSync");
export const spawn = never("spawn");
export default { execFileSync, execSync, spawnSync, spawn };
`;

/** A minimal `process`, since some modules read it as they load. */
export const PROCESS_BANNER = `globalThis.process ??= { env: {}, platform: "browser", argv: [], cwd: () => "." };`;

/** Resolves the four Node modules to their stand-ins, and `demo:data` to the build-time data. */
export function demoShims(files: Record<string, string>, data: unknown): Plugin {
  const modules: Record<string, string> = { fs: fs(files), path: PATH, crypto: CRYPTO, child_process: CHILD_PROCESS };
  return {
    name: "demo-shims",
    setup(build) {
      build.onResolve({ filter: /^(node:)?(fs|path|crypto|child_process)$/ }, (a) => ({ path: a.path.replace(/^node:/, ""), namespace: "demo-shim" }));
      build.onLoad({ filter: /.*/, namespace: "demo-shim" }, (a) => ({ contents: modules[a.path]!, loader: "js" }));
      build.onResolve({ filter: /^demo:data$/ }, (a) => ({ path: a.path, namespace: "demo-data" }));
      build.onLoad({ filter: /.*/, namespace: "demo-data" }, () => ({ contents: JSON.stringify(data), loader: "json" }));
    },
  };
}
