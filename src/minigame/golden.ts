// Il Notaio's live golden set (TD v0.51; CC-20261114-19, #146): runs each hand-made record of
// scenarios/notaio-golden.json through the guarded reading on the recorder model, then judges it (golden-set.ts).
// It makes model calls, so it runs only when Dylan gives a spending stop for it, like any live check.
//
//   npm run minigame:golden -- --dry-run      every case's prompt, and the material; no calls, no key
//   npm run minigame:golden -- --estimate     the calls it would make and their worst-case cost; no model calls
//   PROBE_TOTAL_USD=<stop> op run --env-file=.env -- npm run -s minigame:golden -- --cap 1
//
// Writes results/minigame/golden-<run>.json: per case, the reply, every sentence's verdict, the fallback
// rate, any sentence shown that fails a check, and any fact the rendered reading states that no single line
// or note does. Spend goes to the mini-game ledger.

import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { config } from "../../probe.config.ts";
import { Budget, worstCaseCost } from "../harness/budget.ts";
import { audited } from "../harness/keyaudit.ts";
import { RunLog, gitCommit, priorSpend, type LogRecord } from "../harness/log.ts";
import { callModel, fetchEndpoint } from "../harness/openrouter.ts";
import { parseJson } from "../output/json.ts";
import type { CharacterName } from "../game/roster.ts";
import { loadDocs, type PlotFact } from "../sources/docs.ts";
import { sentencesOf } from "./guard.ts";
import { casePrompt, goldenSet, knowledgeUser, learned, recheck, rendered, type GoldenCase } from "./golden-set.ts";
import { MINIGAME_TOTAL_USD } from "./ledger.ts";
import { screenContent } from "./player.ts";
import { GUARDED_MAX_TOKENS } from "./reading.ts";
import { DEFAULT_PLAY_MODEL, describeRoute, isClaudeModel, messages, recorderRoute } from "./recorder.ts";

const { values: opts } = parseArgs({
  options: { cap: { type: "string", default: "1" }, "recorder-model": { type: "string" }, "dry-run": { type: "boolean", default: false }, estimate: { type: "boolean", default: false }, only: { type: "string" } },
});
const OUT = "results/minigame";
const KNOWLEDGE_MAX_TOKENS = 300;

class Stop extends Error {}

async function main(): Promise<void> {
  process.env.PROBE_RESULTS_DIR = OUT;
  const docs = loadDocs(config.docs);
  const prompt = docs.notaioReading;
  if (!prompt?.guarded) throw new Error(`TD v${docs.versions.technicalDesign} has no guarded reading (TD v0.51 on); run with PROBE_TD=0.51 or later`);
  const kc = docs.systemPrompts?.knowledgeCheck;
  if (!kc) throw new Error("This TD has no knowledge check (block 10c)");
  const { reader, cases: all } = goldenSet();
  const cases = opts.only ? all.filter((c) => opts.only!.split(",").includes(c.id)) : all;
  const facts = docs.plotFacts.filter((f) => /^F[1-4]$/.test(f.id));
  // The public lore the screen links: its notes go after the lines that name it.
  const lore = screenContent(reader as CharacterName, "off").lore;

  if (opts["dry-run"]) {
    for (const c of cases) {
      const { user } = casePrompt(prompt, c);
      console.log(`--- ${c.id} (tempts ${c.tempts.join(", ")}${c.facts ? `; facts ${c.facts.join(", ")}` : ""})\n${user}\n`);
    }
    console.log(`DRY RUN: no calls. ${cases.length} cases; TD v${docs.versions.technicalDesign}; system prompt ${casePrompt(prompt, cases[0]!).system.length} characters.`);
    return;
  }
  const recorderId = opts["recorder-model"] ?? process.env.RECORDER_MODEL_ID;
  if (isClaudeModel(recorderId)) throw new Error("The golden set runs on an OpenRouter recorder only, for now");
  if (opts.estimate) {
    // Offline: no key needed; the price comes from OpenRouter's public endpoint listing.
    const route = await recorderRoute(DEFAULT_PLAY_MODEL, opts["recorder-model"], { offline: true });
    route.endpoint = await fetchEndpoint(route.model);
    const readingChars = cases.reduce((n, c) => n + (({ system, user }) => system.length + user.length)(casePrompt(prompt, c)), 0);
    // Worst case: every reading re-asked once, and every fact checked on the reading and on each line and note.
    const checks = cases.reduce((n, c) => n + facts.length * (1 + c.lines.length * 2), 0);
    const worst = 2 * worstCaseCost(readingChars, GUARDED_MAX_TOKENS * cases.length, route.endpoint.price) + checks * worstCaseCost(kc.system.length + 1500, KNOWLEDGE_MAX_TOKENS, route.endpoint.price);
    console.log(`Estimate (no calls): ${cases.length} readings (up to ${cases.length * 2} with repairs) and up to ${checks} knowledge checks; worst case $${worst.toFixed(3)} on ${route.model.id} via ${route.endpoint.providerName}`);
    return;
  }

  const route = await recorderRoute(DEFAULT_PLAY_MODEL, opts["recorder-model"]);
  const budget = new Budget(Number(opts.cap), MINIGAME_TOTAL_USD, priorSpend(OUT));
  const runId = `${new Date().toISOString().replace(/[:.]/g, "-")}-golden`;
  const log = new RunLog(runId, "minigame-", OUT);
  let servedId: string | null = null;
  log.write({ type: "run", runId, startedAt: new Date().toISOString(), modelId: route.model.id, endpoint: route.endpoint, docVersions: docs.versions, gitCommit: gitCommit(), golden: cases.map((c) => c.id) } as unknown as LogRecord);
  console.log(`Golden set: ${cases.length} cases on TD v${docs.versions.technicalDesign}; recorder ${JSON.stringify(describeRoute(route, null))}; cap $${opts.cap}; ledger $${budget.priorSpendUsd.toFixed(2)} spent before this (total cap $${MINIGAME_TOTAL_USD})`);

  const send = async (system: string, user: string, maxTokens: number, kind: string): Promise<string> => {
    const worst = worstCaseCost(system.length + user.length, maxTokens, route.endpoint.price);
    if (!budget.tryReserve(worst)) throw new Stop("the next call could pass the cap");
    const res = await callModel(route.client, { model: route.model, ...messages(route, system, user), temperature: route.temperature, maxTokens, extra: route.thinking }, { maxAttempts: 5, retryable: (s) => s === 429 || s === null });
    const cost = res.ok ? (res.usage.costUsd ?? res.usage.inputTokens * route.endpoint.price.input + res.usage.outputTokens * route.endpoint.price.output) : 0;
    budget.settle(worst, cost);
    log.write({ type: "minigame-call", runId, kind, costUsd: cost, ok: res.ok, ...(res.ok ? { provider: res.provider, servedModel: res.model } : { status: res.status, error: res.error.slice(0, 300) }), at: new Date().toISOString() } as unknown as LogRecord);
    // CLAUDE.md: on any error (a 403, a key limit, no balance) stop and report; never switch keys or providers.
    if (!res.ok) throw new Stop(`call failed (${res.status ?? "no status"}): ${res.error.slice(0, 200)}`);
    if (route.endpointLabel === "OpenRouter" && res.provider !== route.endpoint.providerName) throw new Stop(`served by ${res.provider}, not the pinned ${route.endpoint.providerName}`);
    if (servedId !== null && res.model !== servedId) throw new Stop(`served by model ${res.model}, not ${servedId}`);
    servedId = res.model;
    return res.content;
  };

  const verdictOf = async (fact: PlotFact, items: string[]): Promise<string | undefined> => {
    const raw = await send(kc.system, knowledgeUser(kc.user, reader, fact, items), KNOWLEDGE_MAX_TOKENS, "knowledge-check");
    return (parseJson(raw).json as { verdict?: string } | null)?.verdict;
  };

  const results: unknown[] = [];
  let stopped: string | null = null;
  try {
    for (const c of cases) results.push(await runCase(c));
  } catch (e) {
    if (!(e instanceof Stop)) throw e;
    stopped = e.message;
  }

  async function runCase(c: GoldenCase) {
    const { system, user } = casePrompt(prompt!, c);
    let raw = await send(system, user, GUARDED_MAX_TOKENS, "notaio-reading");
    let repaired = false;
    // G1: a reply that isn't JSON is repaired once.
    if (sentencesOf(raw, c.lines.length) === null) {
      repaired = true;
      raw = await send(system, `${user}\n\nYour last reply could not be used (not JSON). Reply again with only the JSON asked for.`, GUARDED_MAX_TOKENS, "notaio-reading");
    }
    const parsed = sentencesOf(raw, c.lines.length) === null ? null : raw;
    const { shownFailing, verdicts } = recheck(c, parsed);
    const items = rendered(c, verdicts, lore);
    // No new fact: a fact the rendered reading states must also be stated by one line, or one note, alone.
    const newFacts: string[] = [];
    for (const f of facts) {
      if (!learned(await verdictOf(f, items.map((i) => i.text)))) continue;
      const singles = [...c.lines.map((l) => `${l.speaker}: ${l.words}`), ...items.filter((i) => i.kind === "note").map((i) => i.text)];
      let alone = false;
      for (const s of singles) if (!alone && learned(await verdictOf(f, [s]))) alone = true;
      if (!alone) newFacts.push(f.id);
    }
    const fallbacks = verdicts.filter((v) => !v.model);
    const r = { id: c.id, tempts: c.tempts, raw, repaired, verdicts: verdicts.map((v) => ({ line: v.line, shown: v.model ? "model" : "fallback", failed: v.failed, wrote: v.wrote })), fallbackRate: fallbacks.length / verdicts.length, shownFailing, newFacts, pass: shownFailing.length === 0 && newFacts.length === 0 };
    console.log(`${c.id}: ${r.pass ? "pass" : "FAIL"}; fallback ${fallbacks.length}/${verdicts.length}${fallbacks.length ? ` (${fallbacks.map((v) => `${v.line}: ${v.failed.join(",")}`).join("; ")})` : ""}${newFacts.length ? `; new facts ${newFacts.join(", ")}` : ""}`);
    return r;
  }

  const path = `${OUT}/golden-${runId}.json`;
  const all_ = results as { fallbackRate: number; pass: boolean; verdicts: unknown[] }[];
  const sentences = all_.reduce((n, r) => n + r.verdicts.length, 0);
  const fallbackRate = sentences ? all_.reduce((n, r) => n + r.fallbackRate * r.verdicts.length, 0) / sentences : 0;
  writeFileSync(path, JSON.stringify({ runId, docs: docs.versions, recorder: describeRoute(route, servedId), stopped, fallbackRate, cases: results }, null, 2));
  console.log(`${all_.filter((r) => r.pass).length} of ${all_.length} cases pass; fallback rate ${(100 * fallbackRate).toFixed(1)}%; spent $${budget.spentUsd.toFixed(4)}; ledger $${(budget.priorSpendUsd + budget.spentUsd).toFixed(2)}${stopped ? `; STOPPED: ${stopped}` : ""}\n  ${path}`);
}

audited(main, OUT, "golden");
