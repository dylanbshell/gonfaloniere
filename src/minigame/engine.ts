// The mini-game engine (Models & Research v0.22, Mini-Game Spec), on
// Technical Design v0.9's prompts and rules and Game Mechanics v0.20's
// numbers. One evening round for six characters: an opening strategy call,
// N turns of Capannelli and Colloquii, end-of-turn extraction passes, a
// Murder Round call per character (logged, not resolved), and knowledge
// checks at the end. Model calls go through the injected caller; everything
// that happens is kept for the game record.

import type { ActionType } from "../game/actions.ts";
import { allowedActionTypes, allowedActionsText, type ActionContext } from "../game/actions.ts";
import { ROSTER, factionOf, type CharacterName } from "../game/roster.ts";
import { parseSpeak } from "../output/speak.ts";
import { parseStrategy } from "../output/strategy.ts";
import { parseThink, type Took, type WordsLog } from "../output/think.ts";
import {
  assembleMovePrompt,
  assembleMurderPrompt,
  assemblePlanPrompt,
  assembleSpeakPrompt,
  assembleThinkPrompt,
  thinkAsksTook,
  thinkNamesTarget,
  thinkAsksWords,
  speakAsksMeant,
  tdMinor,
  labelValues,
  wordsCap,
  type TookTarget,
  fill,
  speakHasAddressee,
  type AssembledPrompt,
  type CharacterContext,
  type HistoryLine,
} from "../prompt/assemble.ts";
import type { DocSources } from "../sources/docs.ts";
import { parseJson } from "../output/json.ts";
import { z } from "zod";
import { Recorder, sameThought } from "./extract.ts";
import type { LogprobsSetting, StoredLogprobs } from "./logprobs.ts";
import { MemoryStore, renderBelief, tookTargetLine, resolveName, whereLabel, type GameLine, type Thought, type Where } from "./memory.ts";

// ---- Calls -----------------------------------------------------------------------------

export type CallKind = "plan" | "think" | "speak" | "move" | "murder" | "star-pass" | "claims-pass" | "sweep-reask" | "thought-pass" | "perception-pass" | "knowledge-check";

export interface CallRequest {
  kind: CallKind;
  character: CharacterName | null;
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
}
export interface CallResponse {
  ok: boolean;
  content: string;
  error: string | null;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  provider: string | null;
  /** The model the provider reports serving the call. */
  model: string | null;
  /** TD v0.21: label log probabilities, on think() and speak() calls (null where unsupported or off); absent on other calls. */
  logprobs?: StoredLogprobs | null;
}
/** Null when the spending cap stops the call. */
export type Caller = (req: CallRequest) => Promise<CallResponse | null>;

/** One call as the game record keeps it (TD, Game Record: static prefix stored once). */
export interface CallRecord {
  n: number;
  turn: number;
  kind: CallKind;
  character: CharacterName | null;
  attempt: number;
  user: string;
  raw: string | null;
  parsed: unknown;
  verdict: "valid" | "failed" | "default";
  repairs: string[];
  error: string | null;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  provider: string | null;
  model: string | null;
  /** TD v0.21: the top 5 candidates at the `took` / `meant` label token (or every token's, with `all`); null where unsupported. Nothing in play reads it. */
  logprobs?: StoredLogprobs | null;
}

/** Runner hooks: a turn-end report, for progress lines. */
export interface GameHooks {
  turnEnd?: (e: { turn: number; calls: number; costUsd: number; ms: number }) => void;
}

// ---- Settings ----------------------------------------------------------------------------

export interface GameSettings {
  cast: CharacterName[];
  briefings: Partial<Record<CharacterName, string>>;
  turns: number;
  seed: number;
  utterancesPerTurn: number;
  historyWindow: number;
  thoughtWindow: number;
  maxCapannello: number;
  /** Max output tokens per call kind (TD, Run Configuration). */
  maxTokens: Record<CallKind, number>;
  playTemperature: number;
  systemTemperature: number;
  /** A line appended at the end of every character's Block 9b (labelled variants only). */
  speakAppend?: string;
  /** TD v0.6 `drop_repeated_thoughts` (default true): an exact repeat of a character's previous thought is logged but kept out of shortTermHistory and the thought pass. */
  dropRepeatedThoughts?: boolean;
  /**
   * TD v0.8–v0.9 `notebook`: "perceived" (default) remembers what was said through readings built
   * from think()'s `took`; "shared" retrieves the ★ and claims entries, as before v0.8.
   */
  notebook?: "perceived" | "shared";
  /** TD v0.21 `logprobs`: labels (default), off, or all; the runner requests and stores them, and play never reads them. */
  logprobs?: LogprobsSetting;
  /** Knowledge checks at the end: (character, fact id). */
  checks: { character: CharacterName; fact: string }[];
}

interface Conversation {
  id: string;
  kind: "capannello" | "colloquio";
  members: CharacterName[];
  open: boolean;
  /** Effective importance from each member's latest think(). */
  importance: Map<CharacterName, number>;
  lastSpeaker: CharacterName | null;
  consecutive: number;
  /** Capannello: the addressee who must answer next (subject to the ping-pong guard). */
  designated: CharacterName | null;
  /** Consecutive replies forced by designation (TD v0.4: at most two). */
  forcedRun: number;
  needsThink: boolean;
  /** Colloquio: utterances so far, and who signalled done. */
  utterances: number;
  closingBy: CharacterName | null;
  /** Colloquio: the Capannello each member left. */
  returnTo: Map<CharacterName, string>;
}

interface CharState {
  name: CharacterName;
  florins: number;
  pensions: number;
  plan: string | null;
  lines: GameLine[];
  thoughts: string[];
  withdrawals: number;
  feedback: string | null;
  conversation: string;
}

export interface GameEvent {
  turn: number;
  type: string;
  [k: string]: unknown;
}

// ---- The game ------------------------------------------------------------------------------

export class MiniGame {
  readonly memory = new MemoryStore();
  private recorder: Recorder;
  readonly lines: GameLine[] = [];
  readonly thoughts: Thought[] = [];
  readonly events: GameEvent[] = [];
  readonly calls: CallRecord[] = [];
  readonly snapshots: unknown[] = [];
  readonly murderActs: unknown[] = [];
  readonly knowledgeChecks: unknown[] = [];
  /** Static prompt prefixes (blocks 1–3 per character; system messages per pass), stored once. */
  readonly prefixes: Record<string, string> = {};
  stopped = false;

  private chars = new Map<CharacterName, CharState>();
  private convs = new Map<string, Conversation>();
  private turn = 0;
  private nextLine = 1;
  private nextThought = 1;
  private nextConv = 1;
  private nextCall = 1;
  private rng: () => number;
  private treasury: number;
  private ledger = new Map<CharacterName, number>();
  private ledgerLatest: string | null = null;
  private rotation: CharacterName[] = [];
  private pendingColloquio: { mover: CharacterName; target: CharacterName } | null = null;

  constructor(
    private docs: DocSources,
    private s: GameSettings,
    private call: Caller,
    private hooks: GameHooks = {},
  ) {
    this.rng = mulberry32(s.seed);
    this.memory.quoteDropsPunct = tdMinor(docs.versions.technicalDesign) >= 15;
    this.memory.fillCap = fillCapFor(docs.versions.technicalDesign);
    this.recorder = new Recorder(docs, this.memory, (kind, c, system, user) => this.systemCall(kind, c, system, user), this.events, formatLine, listJoin);
    Object.assign(this.prefixes, this.recorder.prefixes);
    this.treasury = docs.tunables.embassy_treasury;
    for (const c of s.cast) {
      this.chars.set(c, {
        name: c,
        // One evening round: starting Florins plus one round's income.
        florins: docs.tunables.starting_florins + docs.tunables.income,
        pensions: 0,
        plan: null,
        lines: [],
        thoughts: [],
        withdrawals: 0,
        feedback: null,
        conversation: "",
      });
    }
  }

  // ---- Running ------------------------------------------------------------------------

  async play(): Promise<void> {
    this.openCapannelli();
    await this.opening();
    for (this.turn = 1; this.turn <= this.s.turns && !this.stopped; this.turn++) {
      const started = Date.now();
      const callsBefore = this.calls.length;
      await this.playTurn();
      if (this.stopped) break;
      await this.endOfTurn();
      this.snapshot(`end of turn ${this.turn}`);
      const turnCalls = this.calls.slice(callsBefore);
      this.events.push({
        turn: this.turn,
        type: "turn-end",
        ms: Date.now() - started,
        calls: turnCalls.length,
        costUsd: turnCalls.reduce((s, c) => s + c.costUsd, 0),
        tokens: turnCalls.reduce((s, c) => s + c.inputTokens + c.outputTokens, 0),
      });
      this.hooks.turnEnd?.({ turn: this.turn, calls: this.calls.length, costUsd: this.calls.reduce((s, c) => s + c.costUsd, 0), ms: Date.now() - started });
    }
    this.turn = Math.min(this.turn, this.s.turns);
    if (!this.stopped) await this.murderRound();
    if (!this.stopped) await this.knowledge();
  }

  /** Mechanics: all living characters split at random into groups of 3; movement order randomized. */
  private openCapannelli(): void {
    const order = shuffle([...this.s.cast], this.rng);
    this.rotation = shuffle([...this.s.cast], this.rng);
    // Mini-game setting (Dylan, Oct 24): six of the twelve attend. Without this, characters read the
    // absent guests' missing names under "All living guests" as deaths.
    const absent = ROSTER.map((r) => r.name).filter((n) => !this.s.cast.includes(n));
    const smaller = `Tonight is a smaller gathering than most: only ${listJoin(this.s.cast)} attend. ${listJoin(absent)} are alive, but elsewhere tonight, and can't be reached.`;
    for (let i = 0; i < order.length; i += 3) {
      const conv = this.newConversation("capannello", order.slice(i, i + 3));
      this.notaio(conv, smaller);
      this.notaio(conv, `The guests drifted into company: ${listJoin(conv.members)}.`);
    }
    this.events.push({ turn: 0, type: "capannelli", groups: [...this.convs.values()].map((c) => c.members), rotation: this.rotation });
  }

  /** No faction meeting in the mini-game: one strategy call (9d) per character to open. */
  private async opening(): Promise<void> {
    await Promise.all(
      this.s.cast.map(async (c) => {
        const ctx = this.context(c);
        const p = assemblePlanPrompt(this.docs.templates, ctx, "The evening has begun, and the guests are gathering.");
        const r = await this.characterCall("plan", c, p, (raw) => {
          const parsed = parseStrategy("plan", raw, { character: c, livingOthers: this.living(c) });
          return { ok: parsed.verdict === "valid", value: parsed.value, repairs: parsed.truncated ? ["planTruncated"] : [], error: parsed.errors[0] ?? null };
        });
        if (!r) return;
        const v = r as { thought: string; plan: string };
        this.char(c).plan = v.plan;
        this.addThought(c, "plan", v.thought);
        this.events.push({ turn: 0, type: "plan", character: c, thought: v.thought, plan: v.plan });
      }),
    );
  }

  private async playTurn(): Promise<void> {
    if (this.pendingColloquio) {
      const { mover, target } = this.pendingColloquio;
      this.pendingColloquio = null;
      if (this.conv(target).kind === "capannello" && this.conv(mover).kind === "capannello") this.openColloquio(mover, target);
    }
    let utterances = 0;
    while (utterances < this.s.utterancesPerTurn && !this.stopped) {
      let progressed = false;
      for (const conv of [...this.convs.values()]) {
        if (utterances >= this.s.utterancesPerTurn || this.stopped) break;
        if (!conv.open || conv.members.length < 2) continue;
        if (conv.needsThink) await this.thinkAll(conv);
        if (await this.step(conv)) {
          utterances++;
          progressed = true;
        }
      }
      if (!progressed) {
        this.events.push({ turn: this.turn, type: "stall", note: "no conversation could produce a line" });
        break;
      }
    }
  }

  /** One utterance in one conversation. False if no line could be produced. */
  private async step(conv: Conversation): Promise<boolean> {
    const speaker = this.pickSpeaker(conv);
    const cap = this.docs.tunables.colloquio_cap;
    const closing =
      conv.kind === "colloquio" && conv.closingBy && conv.closingBy !== speaker
        ? ({ reason: "other-ended", other: conv.closingBy } as const)
        : conv.kind === "colloquio" && conv.utterances >= cap - 1
          ? ({ reason: "cap" } as const)
          : undefined;
    const ctx = this.context(speaker);
    const actions = this.actionContext(speaker);
    const p = assembleSpeakPrompt(this.docs.templates, ctx, { allowedActions: allowedActionsText(actions), ...(closing && { closing }), ...(this.s.speakAppend && { appendLine: this.s.speakAppend }) });
    const expect = {
      present: ctx.state.present,
      allowedActions: allowedActionTypes(actions),
      florins: actions.florins,
      addressee: speakHasAddressee(this.docs.templates, conv.kind),
      ...(speakAsksMeant(this.docs.templates) && { meant: { cap: wordsCap(this.docs.templates, "speak"), values: labelValues(this.docs.templates, "speak") } }),
    };
    const out = await this.characterCall("speak", speaker, p, (raw) => {
      const r = parseSpeak(raw, expect);
      return {
        ok: r.verdict === "valid",
        value: r,
        repairs: [...(r.fenced ? ["fenceStripped"] : []), ...(r.addresseeIssue === "alias" ? ["addresseeAlias"] : []), ...(r.meantFilled ? ["meantFilled"] : [])],
        error: r.errors[0] ?? null,
      };
    });
    this.char(speaker).feedback = null;
    if (!out) {
      // TD default: skip this speaker; the next-highest importance speaks next time.
      conv.importance.set(speaker, 0);
      return false;
    }
    const r = out as ReturnType<typeof parseSpeak>;
    const addressee = conv.kind === "capannello" ? (r.addressee as CharacterName | null) : null;
    const line = this.addLine(conv, "speech", speaker, r.value!.utterance, addressee);
    // TD v0.13: what the speaker meant, kept on the line and the speech record; it becomes an own reading at the turn's end.
    const meant = r.meant ? { meant: r.meant, words: r.meantWords, ...(r.meantLog && { words_log: r.meantLog }) } : {};
    Object.assign(line, meant);
    this.events.push({ turn: this.turn, type: "speech", line: line.id, conversation: conv.id, speaker, addressee, text: line.text, ...meant });
    if (r.actionRejected) this.char(speaker).feedback = `Your last action was rejected: ${r.actionRejected}.`;
    if (r.action) this.applyAction(conv, speaker, r.action);

    // Speaking order bookkeeping: decay for repeat speakers, designation with the ping-pong guard.
    conv.consecutive = conv.lastSpeaker === speaker ? conv.consecutive + 1 : 1;
    conv.forcedRun = conv.designated === speaker ? conv.forcedRun + 1 : 0;
    conv.lastSpeaker = speaker;
    conv.designated = null;
    if (addressee && addressee !== speaker && conv.members.includes(addressee)) {
      if (conv.forcedRun < 2) conv.designated = addressee;
      else this.events.push({ turn: this.turn, type: "ping-pong-guard", conversation: conv.id, addressee });
    }
    conv.utterances++;

    if (conv.kind === "colloquio" && (closing || conv.utterances >= cap)) {
      // TD v0.9 closing think: both guests react to the last line before the Colloquio closes.
      await this.thinkAll(conv, { closing: true });
      this.closeColloquio(conv, closing?.reason === "other-ended" ? "ended" : "cap");
      return true;
    }
    await this.thinkAll(conv);
    if (conv.kind === "colloquio" && !conv.closingBy) {
      const done = conv.members.find((m) => this.lastDone.get(m));
      if (done) {
        conv.closingBy = done;
        this.events.push({ turn: this.turn, type: "colloquio-done", conversation: conv.id, by: done });
      }
    }
    return true;
  }

  private lastDone = new Map<CharacterName, boolean>();

  /**
   * think() for everyone present (TD: after every utterance), in parallel. `closing` (TD v0.9): the
   * closing think after a Colloquio's last line, whose thought and `took` are kept while importance
   * and done are ignored.
   */
  private async thinkAll(conv: Conversation, opts: { closing?: boolean } = {}): Promise<void> {
    conv.needsThink = false;
    const asksTook = thinkAsksTook(this.docs.templates);
    const namesTarget = thinkNamesTarget(this.docs.templates);
    const asksWords = thinkAsksWords(this.docs.templates);
    // TD v0.13: own lines are labelled in speak(), so think() names the last line by someone else.
    const ownFromSpeak = speakAsksMeant(this.docs.templates);
    const cap = wordsCap(this.docs.templates, "think");
    // TD v0.15: "this conversation" starts at the character's latest arrival.
    const sinceArrival = tdMinor(this.docs.versions.technicalDesign) >= 15;
    const tookValues = labelValues(this.docs.templates, "think");
    await Promise.all(
      conv.members.map(async (c) => {
        const ctx = this.context(c);
        // TD v0.10: {took_target} names the line the reading will attach to, by the same rule (labelLine).
        const { line, type, answering } = tookTargetLine(c, conv.id, this.char(c).lines.at(-1)?.id ?? null, this.lines, ownFromSpeak, sinceArrival);
        // TD v0.13 wrong-line rule: the other spoken lines the character heard, to place words not in the named line.
        // TD v0.14: with each line's speaker, so an earlier line by the named line's speaker counts as the same remark.
        const sameSpeaker = tdMinor(this.docs.versions.technicalDesign) >= 14;
        const others = ownFromSpeak
          ? this.char(c).lines.filter((l) => l.kind === "speech" && l.id !== line?.id).map((l) => ({ id: l.id, text: l.text, ...(sameSpeaker && { speaker: l.speaker }) }))
          : undefined;
        const target: TookTarget = type === "other" ? { type, speaker: line!.speaker!, answering } : { type };
        const named = namesTarget ? { took_target: type, target_line: line?.id ?? null, ...(answering && { target_answering: true }) } : {};
        const p = assembleThinkPrompt(this.docs.templates, ctx, { tookTarget: target, td: this.docs.versions.technicalDesign });
        const out = await this.characterCall("think", c, p, (raw) => {
          const r = parseThink(raw, { conversation: conv.kind, livingOthers: ctx.state.livingOthers, format: "td0.3", took: asksTook, ...(tookValues && { tookValues }), ...(asksWords && { words: { line: line?.text ?? null, cap, ...(others && { others }), ...(sameSpeaker && { speaker: line?.speaker ?? null }) } }) });
          const repairs = Object.entries(r.repairs ?? {})
            .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : Boolean(v)))
            .map(([k]) => k);
          return { ok: r.repaired.verdict === "valid", value: r.repaired.value, repairs, error: r.repaired.errors[0] ?? null };
        });
        if (!out) {
          // TD default: importance 0, done false, took none; thought omitted.
          if (!opts.closing) {
            conv.importance.set(c, 0);
            this.lastDone.set(c, false);
          }
          this.events.push({ turn: this.turn, type: "think-default", character: c, conversation: conv.id, took: asksTook ? "none" : undefined, ...named, ...(asksWords && { words: null }), ...(opts.closing && { closing: true }) });
          return;
        }
        const v = out as { thought: string; importance: number; done?: boolean | null; took?: Took; words?: string | null; wordsLog?: WordsLog };
        if (!opts.closing) {
          conv.importance.set(c, v.importance);
          this.lastDone.set(c, conv.kind === "colloquio" && Boolean(v.done));
        }
        this.addThought(
          c,
          "think",
          v.thought,
          { importance: v.importance, done: v.done ?? null, conversation: conv.id },
          { conversation: conv.id, ...(v.took && { took: v.took }), ...named, ...(asksWords && { words: v.words ?? null, ...(v.wordsLog && { words_log: v.wordsLog }) }), ...(opts.closing && { closing: true }) },
        );
      }),
    );
  }

  /** TD: designation first (ping-pong guard applied when set); then importance with 20% decay per repeat; ties at random. */
  private pickSpeaker(conv: Conversation): CharacterName {
    if (conv.kind === "colloquio" && conv.closingBy) return conv.members.find((m) => m !== conv.closingBy)!;
    if (conv.designated && conv.members.includes(conv.designated)) return conv.designated;
    const scored = conv.members.map((m) => {
      const base = conv.importance.get(m) ?? 0;
      const eff = m === conv.lastSpeaker ? base * 0.8 ** conv.consecutive : base;
      return { m, eff, tie: this.rng() };
    });
    scored.sort((a, b) => b.eff - a.eff || b.tie - a.tie);
    return scored[0]!.m;
  }

  // ---- Actions (Stage Manager) --------------------------------------------------------------

  private applyAction(conv: Conversation, actor: CharacterName, a: { type: ActionType; amount?: number; for?: string }): void {
    const me = this.char(actor);
    const size = this.docs.tunables.pension_size;
    if (a.type === "bribe" && conv.kind === "colloquio") {
      const to = conv.members.find((m) => m !== actor)!;
      const amount = a.amount!;
      me.florins -= amount;
      this.char(to).florins += amount;
      const line = this.addLine(conv, "event", null, `${actor} gave ${to} ${amount} Florins.`);
      this.memory.addEntry({ turn: this.turn, conversation: conv.id, where: this.where(conv), type: "payment", speaker: actor, toward: to, about: [actor, to], summary: `${actor} gave ${to} ${amount} Florins.`, quote: null, lines: [line.id], audience: [...conv.members], source: "code" });
      this.events.push({ turn: this.turn, type: "bribe", from: actor, to, amount, line: line.id });
    } else if (a.type === "borrow") {
      me.florins += size;
      me.pensions += 1;
      this.treasury -= size;
      this.ledger.set(actor, (this.ledger.get(actor) ?? 0) + 1);
      this.ledgerLatest = `${actor} accepted a pension`;
      this.privateLine(conv, actor, `You accepted a French pension of ${size} Florins. Your purse: ${me.florins} Florins.`, "pension");
      this.events.push({ turn: this.turn, type: "borrow", character: actor });
    } else if (a.type === "repay") {
      const holder = (resolveName(a.for ?? "") ?? actor) as CharacterName;
      const ok = (this.ledger.get(holder) ?? 0) > 0 && (holder === actor || factionOf(holder) === factionOf(actor)) && me.florins >= size;
      if (!ok) {
        me.feedback = `Your attempt to renounce a pension for ${a.for ?? "yourself"} failed: no such pension that you can repay.`;
        return;
      }
      me.florins -= size;
      this.treasury += size;
      this.ledger.set(holder, this.ledger.get(holder)! - 1);
      if (this.chars.has(holder)) this.char(holder).pensions -= 1;
      this.ledgerLatest = `the pension held by ${holder} was renounced`;
      this.privateLine(conv, actor, `You renounced the French pension held by ${holder}: ${size} Florins returned to the Embassy.`, "pension");
      this.events.push({ turn: this.turn, type: "repay", character: actor, holder });
    }
  }

  // ---- End of turn: movement, extraction -------------------------------------------------------

  private async endOfTurn(): Promise<void> {
    await this.movement();
    await this.extraction();
  }

  private async movement(): Promise<void> {
    const mover = this.rotation[(this.turn - 1) % this.rotation.length]!;
    const here = this.conv(mover);
    if (here.kind === "colloquio") {
      this.events.push({ turn: this.turn, type: "move", character: mover, choice: "stay", note: "in a Colloquio when the window arrived" });
      return;
    }
    const ctx = this.context(mover);
    const p = assembleMovePrompt(this.docs.templates, ctx);
    const living = this.living(mover);
    const out = await this.characterCall("move", mover, p, (raw) => parseMove(raw, living));
    const v = (out as MoveOutput | null) ?? { thought: null, contacts: [], choice: "stay", target: null, repairs: [] };
    if (v.thought) this.addThought(mover, "move", v.thought);
    let choice = v.choice;
    // parseMove resolved the target to a living cast member, or null.
    let target = v.target as CharacterName | null;
    if (choice !== "stay" && !target) {
      // TD: invalid target with join or Colloquio → the highest-urgency valid contact, else stay.
      target = ([...v.contacts].sort((a, b) => b.urgency - a.urgency)[0]?.name as CharacterName | undefined) ?? null;
      if (!target) choice = "stay";
    }
    // TD v0.20 (Output Validation & Repair, Movement): a join toward someone already in the mover's own
    // group becomes stay, logged as "join to own group"; the window is used, and it isn't a repair.
    let note: string | undefined;
    if (choice === "join" && target && tdMinor(this.docs.versions.technicalDesign) >= 20 && this.joinsOwnGroup(mover, target)) {
      choice = "stay";
      note = "join to own group";
    }
    this.events.push({ turn: this.turn, type: "move", character: mover, choice, target, contacts: v.contacts, ...(note && { note, asked: "join" }) });
    if (choice === "join" && target) this.join(mover, target);
    if (choice === "colloquio" && target) {
      if (this.conv(target).kind === "colloquio") {
        // TD: a Colloquio with someone already in one waits until they're free.
        this.pendingColloquio = { mover, target };
        this.events.push({ turn: this.turn, type: "colloquio-waits", mover, target });
      } else this.openColloquio(mover, target);
    }
  }

  /** Whether a join toward this target lands in the mover's own group (a target in a Colloquio counts by the group they return to). */
  private joinsOwnGroup(mover: CharacterName, target: CharacterName): boolean {
    const t = this.conv(target);
    const to = t.kind === "colloquio" ? this.convs.get(t.returnTo.get(target)!)! : t;
    return to.id === this.conv(mover).id;
  }

  private join(mover: CharacterName, target: CharacterName): void {
    const from = this.conv(mover);
    const t = this.conv(target);
    const to = t.kind === "colloquio" ? this.convs.get(t.returnTo.get(target)!)! : t;
    if (to.id === from.id) {
      this.events.push({ turn: this.turn, type: "move-noop", character: mover, note: "target already in the same group" });
      return;
    }
    this.leave(from, mover, `${mover} took leave of the company.`);
    if (to.members.length >= this.s.maxCapannello) {
      // TD collision: the open seat first; both full, the lower-importance member moves.
      const bumped = [...to.members].sort((a, b) => (to.importance.get(a) ?? 0) - (to.importance.get(b) ?? 0))[0]!;
      this.leave(to, bumped, `${bumped} took leave of the company.`);
      this.enter(from, bumped);
    }
    this.enter(to, mover);
    this.fixLoneGuests();
  }

  /**
   * Interim mini-game rule (Dylan, Oct 24; the permanent rule is with Mechanics): a guest left
   * alone in a Capannello joins the other Capannello at once, with Il Notaio's join note.
   */
  private fixLoneGuests(): void {
    for (const conv of this.convs.values()) {
      if (!conv.open || conv.kind !== "capannello" || conv.members.length !== 1) continue;
      const other = [...this.convs.values()]
        .filter((x) => x.open && x.kind === "capannello" && x.id !== conv.id && x.members.length >= 1 && x.members.length < this.s.maxCapannello)
        .sort((a, b) => b.members.length - a.members.length)[0];
      if (!other) continue;
      const lone = conv.members[0]!;
      conv.members = [];
      conv.importance.clear();
      conv.lastSpeaker = null;
      conv.designated = null;
      this.enter(other, lone);
      this.events.push({ turn: this.turn, type: "lone-guest-join", character: lone, from: conv.id, to: other.id });
    }
  }

  private leave(conv: Conversation, c: CharacterName, note: string): void {
    this.notaio(conv, note);
    conv.members = conv.members.filter((m) => m !== c);
    conv.importance.delete(c);
    if (conv.lastSpeaker === c) conv.lastSpeaker = null;
    if (conv.designated === c) conv.designated = null;
    conv.needsThink = true;
  }

  private enter(conv: Conversation, c: CharacterName): void {
    const others = [...conv.members];
    conv.members.push(c);
    this.char(c).conversation = conv.id;
    // Joiners hear only what is said after they arrive: the join note is their first line here.
    this.notaio(conv, others.length ? `${c} joined ${listJoin(others)}.` : `${c} took a place in company.`);
    conv.needsThink = true;
  }

  private openColloquio(mover: CharacterName, target: CharacterName): void {
    const a = this.conv(mover);
    const b = this.conv(target);
    for (const c of [mover, target]) this.char(c).withdrawals++;
    const n = this.char(mover).withdrawals;
    const note =
      n <= 1
        ? `${mover} drew ${target} aside from company — a private word, where none could hear.`
        : `${mover} was once again seen drawing another aside — this time ${target}. Some note it is not the first private word sought this evening.`;
    // Witnesses: everyone in the Capannelli the two leave.
    for (const conv of a.id === b.id ? [a] : [a, b]) this.notaio(conv, note);
    const colloquio = this.newConversation("colloquio", [mover, target]);
    colloquio.returnTo.set(mover, a.id);
    colloquio.returnTo.set(target, b.id);
    for (const [conv, c] of [
      [a, mover],
      [b, target],
    ] as const) {
      conv.members = conv.members.filter((m) => m !== c);
      conv.importance.delete(c);
      conv.needsThink = true;
    }
    // The pair already heard the note in the Capannello they left; the Colloquio starts from it.
    this.events.push({ turn: this.turn, type: "colloquio-open", conversation: colloquio.id, mover, target });
    this.fixLoneGuests();
  }

  private closeColloquio(conv: Conversation, why: "ended" | "cap"): void {
    conv.open = false;
    this.events.push({ turn: this.turn, type: "colloquio-close", conversation: conv.id, why, utterances: conv.utterances });
    for (const c of conv.members) {
      const back = this.convs.get(conv.returnTo.get(c)!);
      // Mechanics: back to the Capannello they left, or the smallest open one if it's full.
      const dest =
        back && back.open && back.members.length < this.s.maxCapannello
          ? back
          : [...this.convs.values()].filter((x) => x.open && x.kind === "capannello" && x.members.length < this.s.maxCapannello).sort((x, y) => x.members.length - y.members.length)[0]!;
      const others = [...dest.members];
      dest.members.push(c);
      this.char(c).conversation = dest.id;
      this.notaio(dest, others.length ? `${c} returned to company and rejoined ${listJoin(others)}.` : `${c} returned to company.`);
      dest.needsThink = true;
    }
    this.fixLoneGuests();
  }

  /** TD v0.6 Memory Writing: ★ pass and claims pass per conversation active this turn, thought pass per character. */
  private async extraction(): Promise<void> {
    const thoughts = this.thoughts.filter((t) => t.turn === this.turn && !t.repeat);
    // TD v0.9: readings come from think()'s `took`, written by code for each character (perceived only).
    if ((this.s.notebook ?? "perceived") === "perceived") {
      const r = this.memory.writeReadings(this.turn, this.thoughts, this.lines, { ownFromSpeak: speakAsksMeant(this.docs.templates), sinceArrival: tdMinor(this.docs.versions.technicalDesign) >= 15 });
      this.events.push({ turn: this.turn, type: "readings", stored: r.stored.map((x) => x.id), logged: r.logged.map((x) => `${x.character} ${x.thought}: ${x.reason}`) });
    }
    await this.recorder.turn(this.turn, this.lines, thoughts);
  }

  // ---- End of game: Murder Round calls, knowledge checks ------------------------------------------

  private async murderRound(): Promise<void> {
    await Promise.all(
      this.s.cast.map(async (c) => {
        const ctx = this.context(c, { gathering: true });
        const p = assembleMurderPrompt(this.docs.templates, ctx);
        const out = await this.characterCall("murder", c, p, (raw) => {
          const r = parseStrategy("murder", raw, { character: c, livingOthers: this.living(c) });
          // TD: an illegal act triggers the retry, like a parse failure.
          return { ok: r.verdict === "valid" && !r.illegal.length, value: r, repairs: [], error: r.errors[0] ?? r.illegal[0] ?? null };
        });
        const r = out as ReturnType<typeof parseStrategy> | null;
        if (r?.value?.thought) this.addThought(c, "murder", r.value.thought as string);
        this.murderActs.push({ character: c, acts: r?.value?.acts ?? null, thought: r?.value?.thought ?? null, failed: !r });
        this.events.push({ turn: this.turn, type: "murder-act", character: c, acts: r?.value?.acts ?? null, resolved: false });
      }),
    );
  }

  private async knowledge(): Promise<void> {
    this.knowledgeChecks.push(...(await this.recorder.knowledge(this.s.checks, this.s.cast)));
  }

  // ---- Prompts ---------------------------------------------------------------------------------

  /** A character's context for one call, per TD's blocks (State, memory retrieval, History). */
  private context(c: CharacterName, opts: { gathering?: boolean } = {}): CharacterContext {
    const me = this.char(c);
    const conv = this.conv(c);
    const others = conv.members.filter((m) => m !== c);
    const french = factionOf(c) === "French Embassy";
    const ledgerText = [...this.ledger].filter(([, n]) => n > 0).map(([n, k]) => (k > 1 ? `${n} (${k})` : n)).join(", ") || "none";
    const history = me.lines.slice(-this.s.historyWindow);
    const present = opts.gathering ? [] : others;
    return {
      characterName: c,
      briefing: this.s.briefings[c]!,
      rules: { ...this.docs.tunables, plotProtection: false, plotReward: false },
      strategy: me.plan,
      state: {
        phaseLabel: opts.gathering ? "The Murder Round" : `Capannello round 1, turn ${Math.max(1, this.turn)}`,
        conversation: opts.gathering
          ? { kind: "gathering" }
          : conv.kind === "colloquio"
            ? { kind: "colloquio", other: others[0]!, utterance: Math.max(1, conv.utterances), cap: this.docs.tunables.colloquio_cap }
            : { kind: "capannello", others },
        present,
        livingOthers: this.living(c),
        dead: [],
        florins: me.florins,
        pensionsHeld: me.pensions,
        ...(french && { embassyLedger: { treasury: this.treasury, pensions: ledgerText, ...(this.ledgerLatest && { latest: this.ledgerLatest }) } }),
        withdrawalCount: me.withdrawals,
        ...(me.feedback && { actionFeedback: me.feedback }),
      },
      // TD v0.9: in "perceived", block 6 is the notebook (readings and code entries); the reference record is never shown.
      longTermMemory:
        (this.s.notebook ?? "perceived") === "perceived"
          ? this.memory.retrieveNotebook(c, present.length ? present : others, history.slice(-2).map((l) => l.text), { murder: opts.gathering })
          : this.memory.retrieve(c, present.length ? present : others, history.slice(-2).map((l) => l.text), { murder: opts.gathering }),
      shortTermThoughts: me.thoughts.slice(-this.s.thoughtWindow),
      history: history.map(toHistoryLine),
    };
  }

  private actionContext(c: CharacterName): ActionContext {
    const conv = this.conv(c);
    return {
      faction: factionOf(c),
      florins: this.char(c).florins,
      pensionSize: this.docs.tunables.pension_size,
      treasury: this.treasury,
      colloquioWith: conv.kind === "colloquio" ? conv.members.find((m) => m !== c)! : null,
    };
  }

  // ---- Calls ---------------------------------------------------------------------------------

  /**
   * A character call (temperature 0.7), with TD's one retry on a parse failure
   * or illegal act (a one-line error note appended). Returns the parsed value,
   * or null after a second failure (the caller applies TD's default).
   */
  private async characterCall(
    kind: CallKind,
    c: CharacterName,
    p: AssembledPrompt,
    parse: (raw: string) => { ok: boolean; value: unknown; repairs: string[]; error: string | null },
  ): Promise<unknown | null> {
    this.prefixes[`character:${c}`] = p.system;
    let user = p.user;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await this.call({ kind, character: c, system: p.system, user, maxTokens: this.s.maxTokens[kind], temperature: this.s.playTemperature });
      if (!res) {
        this.stopped = true;
        return null;
      }
      const parsed = res.ok ? parse(res.content) : { ok: false, value: null, repairs: [], error: res.error };
      this.record(kind, c, attempt, user, res, parsed.ok ? "valid" : attempt === 2 ? "default" : "failed", parsed.value, parsed.repairs, parsed.error);
      if (parsed.ok) return parsed.value;
      user = `${p.user}\n\nYour last reply could not be used (${parsed.error ?? "invalid"}). Reply again with only the JSON asked for.`;
    }
    return null;
  }

  /** A system call (temperature 0): JSON in, one retry on unusable JSON. Null if it fails twice. */
  private async systemCall(kind: CallKind, c: CharacterName | null, system: string, user: string): Promise<unknown | null> {
    let u = user;
    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await this.call({ kind, character: c, system, user: u, maxTokens: this.s.maxTokens[kind], temperature: this.s.systemTemperature });
      if (!res) {
        this.stopped = true;
        return null;
      }
      const j = res.ok ? parseJson(res.content) : { json: null, fenced: false, error: res.error };
      const ok = res.ok && !j.error;
      this.record(kind, c, attempt, u, res, ok ? "valid" : attempt === 2 ? "default" : "failed", ok ? j.json : null, j.fenced ? ["fenceStripped"] : [], ok ? null : (j.error ?? null));
      if (ok) return j.json;
      u = `${user}\n\nYour last reply could not be used (${j.error}). Reply again with only the JSON asked for.`;
    }
    return null;
  }

  private record(kind: CallKind, c: CharacterName | null, attempt: number, user: string, res: CallResponse, verdict: CallRecord["verdict"], parsed: unknown, repairs: string[], error: string | null): void {
    this.calls.push({
      n: this.nextCall++,
      turn: this.turn,
      kind,
      character: c,
      attempt,
      user,
      raw: res.ok ? res.content : null,
      parsed: parsed ?? null,
      verdict,
      repairs,
      error,
      costUsd: res.costUsd,
      inputTokens: res.inputTokens,
      outputTokens: res.outputTokens,
      latencyMs: res.latencyMs,
      provider: res.provider,
      model: res.model,
      ...(res.logprobs !== undefined && { logprobs: res.logprobs }),
    });
  }

  // ---- Bookkeeping ---------------------------------------------------------------------------

  private newConversation(kind: Conversation["kind"], members: CharacterName[]): Conversation {
    const conv: Conversation = {
      id: `C${this.nextConv++}`,
      kind,
      members: [...members],
      open: true,
      importance: new Map(),
      lastSpeaker: null,
      consecutive: 0,
      designated: null,
      forcedRun: 0,
      needsThink: true,
      utterances: 0,
      closingBy: null,
      returnTo: new Map(),
    };
    this.convs.set(conv.id, conv);
    for (const m of members) this.char(m).conversation = conv.id;
    return conv;
  }

  private where(conv: Conversation): Where {
    return { kind: conv.kind, members: [...conv.members] };
  }

  private addLine(conv: Conversation, kind: GameLine["kind"], speaker: CharacterName | null, text: string, addressee: CharacterName | null = null): GameLine {
    const line: GameLine = { id: `L${this.nextLine++}`, turn: this.turn, conversation: conv.id, where: this.where(conv), kind, speaker, addressee, text, heardBy: [...conv.members] };
    this.lines.push(line);
    for (const m of conv.members) this.char(m).lines.push(line);
    return line;
  }

  private notaio(conv: Conversation, text: string): void {
    const line = this.addLine(conv, "notaio", null, text);
    // Code writes Il Notaio's events to the memory of everyone who heard them.
    this.memory.addEntry({ turn: this.turn, conversation: conv.id, where: line.where, type: "event", speaker: null, toward: null, about: [], summary: text, quote: null, lines: [line.id], audience: line.heardBy, source: "code" });
    this.events.push({ turn: this.turn, type: "notaio", line: line.id, conversation: conv.id, text });
  }

  private privateLine(conv: Conversation, actor: CharacterName, text: string, type: "pension"): void {
    const line: GameLine = { id: `L${this.nextLine++}`, turn: this.turn, conversation: conv.id, where: this.where(conv), kind: "private", speaker: actor, addressee: null, text, heardBy: [actor] };
    this.lines.push(line);
    this.char(actor).lines.push(line);
    this.memory.addEntry({ turn: this.turn, conversation: conv.id, where: line.where, type, speaker: actor, toward: null, about: [actor], summary: text, quote: null, lines: [line.id], audience: [actor], source: "code" });
  }

  private addThought(c: CharacterName, call: string, text: string, extra: Record<string, unknown> = {}, fields: Pick<Thought, "took" | "conversation" | "closing" | "took_target" | "target_line" | "target_answering" | "words" | "words_log"> = {}): void {
    // TD v0.6 shortTermHistory: an exact repeat of the previous thought is logged and counted, not shown again.
    const previous = this.thoughts.findLast((t) => t.character === c);
    const repeat = (this.s.dropRepeatedThoughts ?? true) && !!previous && sameThought(previous.text, text);
    // TD v0.8: every thought keeps the line the character had last heard; for think(), the line it reacts to.
    const after_line = this.char(c).lines.at(-1)?.id ?? null;
    const t: Thought = { id: `T${this.nextThought++}`, turn: this.turn, character: c, call, text, after_line, ...fields, ...(repeat && { repeat: true }) };
    this.thoughts.push(t);
    if (!repeat) this.char(c).thoughts.push(text);
    this.events.push({ turn: this.turn, type: "thought", thought: t.id, character: c, call, text, after_line, ...fields, ...(repeat && { repeat: true }), ...extra });
  }

  private snapshot(label: string): void {
    this.snapshots.push({
      label,
      turn: this.turn,
      conversations: [...this.convs.values()].filter((c) => c.open).map((c) => ({ id: c.id, kind: c.kind, members: c.members })),
      characters: [...this.chars.values()].map((c) => ({ name: c.name, florins: c.florins, pensions: c.pensions, withdrawals: c.withdrawals, conversation: c.conversation })),
      treasury: this.treasury,
      ledger: Object.fromEntries(this.ledger),
    });
  }

  private char(c: CharacterName): CharState {
    return this.chars.get(c)!;
  }
  private conv(c: CharacterName): Conversation {
    return this.convs.get(this.char(c).conversation)!;
  }
  private living(c: CharacterName): CharacterName[] {
    return this.s.cast.filter((x) => x !== c);
  }
}

// ---- Movement output (Block 9c) ------------------------------------------------------------------

interface MoveOutput {
  thought: string | null;
  contacts: { name: string; urgency: number; purpose: string | null }[];
  choice: "stay" | "join" | "colloquio";
  target: string | null;
  repairs: string[];
}

const MoveShape = z.object({
  thought: z.string().min(1),
  contacts: z.array(z.object({ name: z.string(), urgency: z.number(), purpose: z.string().nullable().optional() })),
  choice: z.enum(["stay", "join", "colloquio"]),
  target: z.string().nullable(),
});

/** TD's repairs for 9c: names matched, urgencies clamped, missing contacts filled at 0, purposes kept for the top three. */
function parseMove(raw: string, living: CharacterName[]): { ok: boolean; value: unknown; repairs: string[]; error: string | null } {
  const { json, fenced, error } = parseJson(raw);
  if (error) return { ok: false, value: null, repairs: [], error };
  const shape = MoveShape.safeParse(json);
  if (!shape.success) return { ok: false, value: null, repairs: [], error: shape.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const repairs: string[] = fenced ? ["fenceStripped"] : [];
  const contacts = new Map<string, { name: string; urgency: number; purpose: string | null }>();
  for (const c of shape.data.contacts) {
    const name = resolveName(c.name);
    if (!name || !living.includes(name)) {
      repairs.push("contactDropped");
      continue;
    }
    if (name !== c.name) repairs.push("nameMatched");
    const urgency = Math.max(0, Math.min(100, Math.round(c.urgency)));
    if (urgency !== c.urgency) repairs.push("urgencyClamped");
    const prev = contacts.get(name);
    if (!prev || prev.urgency < urgency) contacts.set(name, { name, urgency, purpose: c.purpose ?? null });
  }
  for (const n of living) {
    if (!contacts.has(n)) {
      contacts.set(n, { name: n, urgency: 0, purpose: null });
      repairs.push("contactFilled");
    }
  }
  const sorted = [...contacts.values()].sort((a, b) => b.urgency - a.urgency);
  sorted.forEach((c, i) => {
    if (i >= 3 && c.purpose) {
      c.purpose = null;
      repairs.push("purposeDropped");
    }
  });
  let target: string | null = shape.data.target;
  if (target) {
    const t = resolveName(target);
    if (t !== target) repairs.push("targetMatched");
    target = t && living.includes(t) ? t : null;
  }
  return { ok: true, value: { thought: shape.data.thought, contacts: sorted, choice: shape.data.choice, target, repairs: [...new Set(repairs)] }, repairs: [...new Set(repairs)], error: null };
}

// ---- Helpers ---------------------------------------------------------------------------------

function toHistoryLine(l: GameLine): HistoryLine {
  if (l.kind === "notaio") return { kind: "notaio", text: l.text };
  if (l.kind === "event" || l.kind === "private") return { kind: "event", text: l.text };
  return { kind: "speech", speaker: l.speaker!, ...(l.addressee && { addressee: l.addressee }), text: l.text };
}

export function formatLine(l: GameLine): string {
  if (l.kind === "notaio") return `[Il Notaio] ${l.text}`;
  if (l.kind === "event" || l.kind === "private") return `[${l.text}]`;
  return l.addressee ? `${l.speaker} (to ${l.addressee}): ${l.text}` : `${l.speaker}: ${l.text}`;
}

function listJoin(items: string[]): string {
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], rng: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
}

export { renderBelief };

/** Block 6's per-label fill cap for a TD version: none before v0.17, pressure ≤2 in v0.17–v0.18, each non-★ label ≤3 from v0.19. */
export function fillCapFor(td: string): { labels: string[]; max: number } | null {
  const minor = tdMinor(td);
  if (minor >= 19) return { labels: ["claim", "denial", "insult", "pressure"], max: 3 };
  if (minor >= 17) return { labels: ["pressure"], max: 2 };
  return null;
}
