// A mini-game's full record (TD v0.5, Game Record & Export), built from a played game. Moved from
// run.ts (CC-20261111-09, #62) so the player command's fake games write the same record.

import type { CharacterName } from "../game/roster.ts";
import { ALIASES, ROSTER } from "../game/roster.ts";
import { gitCommit } from "../harness/log.ts";
import { tdMinor } from "../prompt/assemble.ts";
import { inWorldNames } from "../prompt/names.ts";
import { SETTING } from "../setting/pack.ts";
import type { loadDocs } from "../sources/docs.ts";
import { CAST, STANDIN_FILE, standinsFor } from "./cast.ts";
import { EMBED_PROVIDER } from "./embed.ts";
import type { MiniGame } from "./engine.ts";
import { loreHeader, type LoreEntry, type LoreFile, type LoreSetting } from "./lore.ts";
import { memoryCounts } from "./memory.ts";
import { pinsEmbeddingProvider, type VectorStore } from "./store.ts";

/** What the record says of a model route: its model and pinned endpoint, and the recorder's description (recorder.ts describeRoute). */
export interface RecordServed {
  model: { slug: string };
  endpoint: { providerName: string; quantization: string | null };
  servedId: string | null;
  recorder?: unknown;
}

export function buildRecord(
  game: MiniGame,
  x: {
    gameId: string;
    seed: number;
    docs: ReturnType<typeof loadDocs>;
    briefings: Partial<Record<CharacterName, string>>;
    served: Record<"character" | "system", RecordServed>;
    settings: object;
    ms: number;
    failure: string | null;
    tree: { tracked_changes: string[]; untracked: string[] };
    retries: number;
    lore: { file: LoreFile; loaded: LoreEntry[] };
    embeddingModel: string | null;
    store: VectorStore | null;
  },
) {
  const byKind = new Map<string, { calls: number; valid: number; retried: number; defaulted: number; repaired: number }>();
  for (const c of game.calls) {
    const k = byKind.get(c.kind) ?? { calls: 0, valid: 0, retried: 0, defaulted: 0, repaired: 0 };
    k.calls++;
    if (c.verdict === "valid") k.valid++;
    if (c.attempt === 2) k.retried++;
    if (c.verdict === "default") k.defaulted++;
    if (c.repairs.length) k.repaired++;
    byKind.set(c.kind, k);
  }
  return {
    schema_version: 1,
    variant: "full",
    complete: !game.stopped && !x.failure,
    failure: x.failure,
    header: {
      game_id: x.gameId,
      date: new Date().toISOString(),
      engine: { name: "gonfaloniere-minigame", commit: gitCommit() },
      working_tree: x.tree,
      // TD v0.8–v0.10: the notebook mode, fixed for a batch.
      notebook: (x.settings as { notebook?: string }).notebook ?? "perceived",
      // TD v0.21: whether label log probabilities were requested (labels, off, or all).
      logprobs: (x.settings as { logprobs?: string }).logprobs ?? "off",
      // TD v0.22: the similarity method that ran, the lore setting and file, and the embedding model (its ID only).
      retrieval: (x.settings as { retrieval?: string }).retrieval ?? "overlap",
      ...loreHeader(x.lore.file, (x.settings as { lore?: LoreSetting }).lore ?? "off"),
      embedding_model: x.embeddingModel,
      ...(x.embeddingModel && pinsEmbeddingProvider(x.docs.versions.technicalDesign) && { embedding_provider: EMBED_PROVIDER }),
      docs: x.docs.versions,
      config: {
        model: x.served.character.model.slug,
        provider: x.served.character.endpoint.providerName,
        quantization: x.served.character.endpoint.quantization,
        served_model: x.served.character.servedId,
        system_model: x.served.system.model.slug,
        system_provider: x.served.system.endpoint.providerName,
        system_quantization: x.served.system.endpoint.quantization,
        system_served_model: x.served.system.servedId,
        // TD v0.7: the recorder model and the temperature actually sent, for every game.
        recorder: x.served.system.recorder,
        thinking: "off",
        fallbacks: false,
        retry: "429 or timeout: up to 5 tries, exponential backoff; any other failure ends the game",
        ...x.settings,
        plot_reward: false,
      },
      seed: x.seed,
      // TD v0.38: the setting pack the game's words came from (setting/<name>/).
      setting: SETTING,
      // TD v0.39: the character a human played, or null.
      human: (x.settings as { human?: string | null }).human ?? null,
      roster: ROSTER,
      aliases: ALIASES,
      cast: CAST,
      personality: "none: stock model; the secret-keeping lines are part of TD v0.5's prompts",
      // Test-setup choices for the mini-game, not the game's rules (Dylan, Oct 24).
      minigame_settings: [
        `${inWorldNames().narrator.name}'s opening line: a smaller gathering of six; the other guests are alive but elsewhere and can't be reached`,
        ...(tdMinor(x.docs.versions.technicalDesign) < 23 ? ["Interim lone-guest rule: a guest left alone in a Capannello joins the other Capannello at once (permanent rule with Mechanics)"] : []),
        ...(x.docs.templates.move?.includes("{target}") ? ["Block 9c's {target} in the choice lines reads 'your target' (fixed in TD v0.20)"] : []),
        ...((x.settings as { speakAppend?: string }).speakAppend ? [`Variant: every character's Block 9b ends with the added line "${(x.settings as { speakAppend?: string }).speakAppend}"`] : []),
      ],
      // Characters v0.9 wrote all twelve briefings, so later games have no stand-ins (TD v0.34).
      standins: standinsFor(x.docs.versions.characters).length ? { characters: standinsFor(x.docs.versions.characters), source: `${STANDIN_FILE} (adapted from PitP_Original_Rules_Trimmed)` } : null,
      tunables: x.docs.tunables,
      briefings: x.briefings,
    },
    prefixes: game.prefixes,
    events: game.events,
    lines: game.lines,
    thoughts: game.thoughts,
    calls: game.calls,
    memory: {
      entries: game.memory.entries,
      beliefs: game.memory.beliefs,
      // TD v0.9: readings from think()'s `took`, and every label the attachment rule ignored or logged.
      readings: game.memory.readings,
      label_log: game.memory.labelLog,
      // TD v0.22: the lore entries this game loaded (lore: on), for the isolation check; empty with lore off.
      lore: x.lore.loaded,
      dropped: game.memory.dropped,
      repairs: game.memory.repairs,
      notes: game.memory.notes,
    },
    snapshots: game.snapshots,
    murder_round: game.midnight ? { resolved: true, acts: game.murderActs, deaths: game.midnight.deaths, events: game.midnight.events } : { resolved: false, acts: game.murderActs },
    knowledge_checks: game.knowledgeChecks,
    summary: {
      wall_ms: x.ms,
      calls: game.calls.length,
      cost_usd: game.calls.reduce((s, c) => s + c.costUsd, 0),
      rate_limit_retries: x.retries,
      memory: memoryCounts(game.memory, game.thoughts, game.lines),
      tokens: game.calls.reduce((s, c) => s + c.inputTokens + c.outputTokens, 0),
      by_call_kind: Object.fromEntries(byKind),
      // TD v0.22: embeddings made for the live store (writes and queries), when it ran.
      ...(x.store && { embeddings: x.store.usage }),
      turns: game.events.filter((e) => e.type === "turn-end"),
    },
  };
}
