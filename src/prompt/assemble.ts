// Builds character prompts from Technical Design's blocks, in TD's order (most
// static first, so a character's calls share a cacheable prefix). Pure: the
// caller supplies templates and values, so the game engine can reuse it.

export interface PromptTemplates {
  frame: string;
  rulesPrimer: string;
  /**
   * Block 2's second block: the plot protection rule (TD v0.2–v0.3, as
   * {plot_protection_rule}) or the Plot Reward rule (TD v0.4, as {plot_reward_rule}).
   */
  plotRule: string;
  strategy: string;
  state: string;
  memory: string;
  think: string;
  speak: string;
  /** TD v0.4's Capannello {addressee_instruction}; absent in earlier versions. */
  addresseeInstruction?: string;
  /** TD v0.4 blocks 9c–9g: movement, strategy, Murder Round, ballot, run-off. Absent in earlier versions. */
  move?: string;
  plan?: string;
  murder?: string;
  ballot?: string;
  runoff?: string;
}

export interface RulesValues {
  starting_florins: number;
  income: number;
  vote_price: number;
  pension_size: number;
  /** TD v0.2–v0.3: fills {plot_protection_rule}. */
  plotProtection: boolean;
  /** TD v0.4's `plot_reward` flag: fills {plot_reward_rule}. */
  plotReward: boolean;
}

export type ConversationKind = "capannello" | "colloquio";

export type HistoryLine =
  | { kind: "speech"; speaker: string; addressee?: string; text: string }
  | { kind: "notaio"; text: string }
  /**
   * Something the system records that isn't speech, such as a payment. TD
   * doesn't fix a format yet; shown as a bracketed line.
   */
  | { kind: "event"; text: string };

export interface StateValues {
  phaseLabel: string;
  conversation:
    | { kind: "capannello"; others: string[] }
    | { kind: "colloquio"; other: string; utterance: number; cap: number }
    /** Calls outside a conversation (Murder Round, ballot, run-off): TD's "the gathering". */
    | { kind: "gathering" };
  /** Others present, not including the character. */
  present: string[];
  /** Every other living guest, wherever they are. */
  livingOthers: string[];
  dead: string[];
  florins: number;
  pensionsHeld: number;
  /** French Embassy characters only. */
  embassyLedger?: { treasury: number; pensions: string; latest?: string };
  withdrawalCount: number;
  plotStatus?: string;
  actionFeedback?: string;
}

export interface CharacterContext {
  characterName: string;
  briefing: string;
  rules: RulesValues;
  /** Null when the character has no plan yet (block 4 stub). */
  strategy: string | null;
  state: StateValues;
  longTermMemory: string[];
  shortTermThoughts: string[];
  history: HistoryLine[];
}

export interface AssembledPrompt {
  blocks: { id: string; text: string }[];
  /** All nine blocks as one text (TD v0.2's layout, or system_role off). */
  text: string;
  /** TD v0.3's layout: blocks 1–3, sent as the system message. */
  system: string;
  /** TD v0.3's layout: blocks 4–9, sent as one user message. */
  user: string;
}

/**
 * Block 9a. TD v0.3 removed the contact list and made `done` Colloquio-only,
 * through {done_instruction} and {think_schema}; TD v0.2's template has
 * neither placeholder, so those values go unused there.
 */
export function assembleThinkPrompt(
  t: PromptTemplates,
  ctx: CharacterContext,
  opts: { extraInstruction?: string; tookTarget?: TookTarget; td?: string } = {},
): AssembledPrompt {
  const colloquio = ctx.state.conversation.kind === "colloquio";
  if (opts.extraInstruction && t.think.includes(opts.extraInstruction)) {
    throw new Error("This Technical Design's think() task already has that line (TD v0.5 builds in the secret-keeping lines)");
  }
  // TD v0.9 adds step 2, `took`, so `done` becomes step 4 and the schema carries "took";
  // TD v0.11 adds step 3, `words`, so `done` becomes step 5.
  const took = thinkAsksTook(t);
  const words = thinkAsksWords(t);
  const fields = `"thought": "...", ${took ? '"took": "none", ' : ""}${words ? '"words": null, ' : ""}"importance": 0`;
  const task = fill(t.think, {
    character_name: ctx.characterName,
    took_target: tookTargetText(opts.tookTarget ?? tookTargetFromHistory(ctx.history, ctx.characterName), opts.td),
    done_instruction: colloquio
      ? `\n${3 + Number(took) + Number(words)}. done — true if you have what you came for, or nothing more is to be gained here; otherwise false.\n`
      : "",
    think_schema: colloquio ? `{${fields}, "done": false}` : `{${fields}}`,
  });
  return assemble(t, ctx, opts.extraInstruction ? afterThoughtInstruction(task, opts.extraInstruction) : task);
}

/** Whether this TD's Block 9a asks for `took` (TD v0.9's step 2). */
export function thinkAsksTook(t: PromptTemplates): boolean {
  return /\n2\. took — /.test(t.think);
}

/** Whether this TD's Block 9a asks for `words` (TD v0.11's step 3). */
export function thinkAsksWords(t: PromptTemplates): boolean {
  return /\n3\. words — /.test(t.think);
}

/** Whether this TD's Block 9b asks for `meant` and `words` (TD v0.13). */
export function speakAsksMeant(t: PromptTemplates): boolean {
  return /\nmeant — /.test(t.speak);
}

/** The most words a `words` line keeps ("at most N" in the TD's own text): 12 in TD v0.11–v0.12, 20 from v0.13. */
export function wordsCap(t: PromptTemplates, call: "think" | "speak"): number {
  const m = (call === "think" ? /\n3\. words — [^\n]*?at most (\d+)/ : /\nwords — [^\n]*?at most (\d+)/).exec(call === "think" ? t.think : t.speak);
  return m ? Number(m[1]) : 12;
}

/** Whether this TD's `took` line names its target line through {took_target} (TD v0.10). */
export function thinkNamesTarget(t: PromptTemplates): boolean {
  return t.think.includes("{took_target}");
}

/**
 * The line {took_target} names (TD v0.10): someone else's (with the speaker's name as History
 * shows it), the character's own, or none when nothing has been said aloud.
 */
export type TookTarget = { type: "other"; speaker: string } | { type: "own" } | { type: "none" };

/** `td`: the Technical Design version, for the none text (TD v0.14 changed it). */
export function tookTargetText(target: TookTarget, td?: string): string {
  if (target.type === "other") return `how you take ${target.speaker}'s last line`;
  if (target.type === "own") return "what you meant by your own last line";
  return td && tdMinor(td) >= 14 ? "nothing yet, since no one else has spoken here since you arrived" : "how you take the last thing said aloud";
}

/** The minor version of a Technical Design version string ("0.14" → 14). */
export const tdMinor = (td: string) => Number(td.split(".")[1]);

/**
 * For callers without the game's line record: the last spoken line in History. The mini-game
 * passes its own target, from the rule that attaches the reading.
 */
export function tookTargetFromHistory(history: HistoryLine[], characterName: string): TookTarget {
  const last = history.findLast((l) => l.kind === "speech");
  if (!last || last.kind !== "speech") return { type: "none" };
  return last.speaker === characterName ? { type: "own" } : { type: "other", speaker: last.speaker };
}

/**
 * Inserts a line right after Block 9a's thought instruction (the line starting
 * "1. thought"), indented to sit under it, for labelled prompt variants.
 */
function afterThoughtInstruction(task: string, line: string): string {
  const lines = task.split("\n");
  const at = lines.findIndex((l) => l.startsWith("1. thought"));
  if (at < 0) throw new Error("think() task has no thought instruction to extend");
  lines.splice(at + 1, 0, `   ${line}`);
  return lines.join("\n");
}

export interface SpeakOptions {
  /** The {allowed_actions} text, from game/actions.ts. */
  allowedActions: string;
  /**
   * A Colloquio is closing: the other character ended it ("other-ended"), or
   * it hit the utterance cap ("cap"). Omitted otherwise.
   */
  closing?: { reason: "other-ended"; other: string } | { reason: "cap" };
  /**
   * An extra instruction bullet appended after Block 9b's last bullet, for
   * labelled prompt variants (e.g. the "bluff line" test). Omitted for TD's text.
   */
  extraInstruction?: string;
  /**
   * A line appended at the very end of Block 9b, after the JSON schema line, for labelled
   * variants (the mini-game boldness test, Dylan Oct 25). Omitted for TD's text.
   */
  appendLine?: string;
  /**
   * A sentence inserted into Block 9b right after another one (e.g. after "Do
   * not recite your private thoughts."), for labelled prompt variants.
   */
  insertAfter?: { after: string; text: string };
}

export function assembleSpeakPrompt(t: PromptTemplates, ctx: CharacterContext, opts: SpeakOptions): AssembledPrompt {
  const closing =
    opts.closing?.reason === "other-ended"
      ? `${opts.closing.other} is ending this private conversation. This is your last line here.`
      : opts.closing?.reason === "cap"
        ? "This private conversation must end now. This is your last line here."
        : "";
  const addressee = speakHasAddressee(t, ctx.state.conversation.kind);
  // TD v0.13: "meant" and "words" follow "utterance" in both forms.
  const meant = speakAsksMeant(t) ? ', "meant": "none", "words": null' : "";
  // An empty {addressee_instruction} (TD v0.4's Colloquio) takes its line with it.
  const template = addressee ? t.speak : t.speak.replace("{addressee_instruction}\n", "");
  const task = fill(template, {
    character_name: ctx.characterName,
    closing_line_note: closing,
    allowed_actions: opts.allowedActions,
    // TD v0.4 only; earlier templates have neither placeholder.
    addressee_instruction: t.addresseeInstruction ?? "",
    speak_schema: addressee
      ? `{"addressee": "..." or null, "utterance": "..."${meant}, "action": null or {...}}`
      : `{"utterance": "..."${meant}, "action": null or {...}}`,
  })
    .replace("It is your turn to speak. \n", "It is your turn to speak.\n");
  let out = opts.extraInstruction ? addBullet(task, opts.extraInstruction) : task;
  if (opts.insertAfter) {
    const { after, text } = opts.insertAfter;
    if (out.includes(text.slice(0, 60))) {
      throw new Error("This Technical Design's speak() task already has that line (TD v0.5 builds in the secret-keeping lines)");
    }
    if (!out.includes(after)) throw new Error(`speak() task has no "${after}" to insert after`);
    out = out.replace(after, `${after} ${text}`);
  }
  if (opts.appendLine) out = `${out}\n\n${opts.appendLine}`;
  return assemble(t, ctx, out);
}

/**
 * Whether speak() asks for an addressee: always before TD v0.4; from v0.4
 * (whose template has {speak_schema}), only in a Capannello.
 */
export function speakHasAddressee(t: PromptTemplates, kind: ConversationKind | "gathering"): boolean {
  return kind !== "colloquio" || !t.speak.includes("{speak_schema}");
}

function template(t: PromptTemplates, key: "move" | "plan" | "murder" | "ballot" | "runoff"): string {
  const s = t[key];
  if (!s) throw new Error(`This Technical Design has no ${key} task (blocks 9d–9g arrived in TD v0.4)`);
  return s;
}

/**
 * Block 9c: the movement task. TD writes {target} inside the choice lines as
 * if it were filled in, but gives it no value before the model has chosen;
 * it reads "your target" here (flagged for Technical Design). {colloquio_note}
 * depends on the target too, so it is empty.
 */
export function assembleMovePrompt(t: PromptTemplates, ctx: CharacterContext): AssembledPrompt {
  return assemble(t, ctx, dropEmptyPlaceholderLines(fill(template(t, "move"), { target: "your target", colloquio_note: "" })));
}

/** Block 9d: the strategy task. `trigger` is {strategy_trigger}, e.g. "The Medici faction meeting has just ended." */
export function assemblePlanPrompt(t: PromptTemplates, ctx: CharacterContext, trigger: string): AssembledPrompt {
  return assemble(t, ctx, fill(template(t, "plan"), { strategy_trigger: trigger }));
}

/**
 * Block 9e: the Murder Round, without the Plot Reward (its placeholders empty).
 * Lupo's acts differ, per TD's table. TD v0.5 asks for a single `act` (Lupo: a
 * `kills` list) and adds {distinct_targets_note}; TD v0.4 asked for an `acts` list.
 */
export function assembleMurderPrompt(t: PromptTemplates, ctx: CharacterContext): AssembledPrompt {
  const lupo = ctx.characterName === "Lupo";
  const murder = template(t, "murder");
  const allowed = lupo
    ? "KILL up to two living guests. Your kills cannot be stopped by guards or investigations. You may not GUARD or INVESTIGATE with them."
    : "KILL, GUARD, or INVESTIGATE any living guest. You cannot GUARD yourself.";
  const values: Record<string, string> = murder.includes("{acts_instruction}")
    ? {
        allowed_murder_acts: allowed,
        reward_instruction: "",
        acts_instruction: lupo ? "2. kills — the one or two guests you will kill." : "2. act — your one act: a single choice, not a list.",
        extra_instruction: "",
        // Without the Plot Reward, only Lupo has more than one act.
        distinct_targets_note: lupo ? "Each of your acts must name a different guest. " : "",
        murder_schema: lupo
          ? '{"thought": "...", "kills": ["...", "..."]}'
          : '{"thought": "...", "act": {"type": "kill" or "guard" or "investigate", "target": "..."}}',
      }
    : {
        allowed_murder_acts: allowed,
        reward_instruction: "",
        acts_count_instruction: lupo ? "one or two kills." : "exactly one act.",
        extra_instruction: "",
        murder_schema: '{"thought": "...", "acts": [{"type": "kill" or "guard" or "investigate", "target": "..."}]}',
      };
  return assemble(t, ctx, dropEmptyPlaceholderLines(fill(murder, values)));
}

export interface BallotValues {
  /** e.g. "Piero de' Medici (Medici), Francesco Pazzi (Pazzi)". */
  candidates: string;
  /** One "Before the city, {name} repented of {tagline}." line per /repent broadcast. */
  repentance: string[];
  votePrice: number;
}

/** Block 9f: the ballot. {max_buy} is computed from the purse, as TD says. */
export function assembleBallotPrompt(t: PromptTemplates, ctx: CharacterContext, v: BallotValues): AssembledPrompt {
  const task = fill(template(t, "ballot"), {
    candidates: v.candidates,
    repentance_note: v.repentance.join(" "),
    florins: String(ctx.state.florins),
    vote_price: String(v.votePrice),
    max_buy: String(Math.floor(ctx.state.florins / v.votePrice)),
  });
  return assemble(t, ctx, dropEmptyPlaceholderLines(task));
}

/** Block 9g: the run-off between the tied guests. */
export function assembleRunoffPrompt(t: PromptTemplates, ctx: CharacterContext, tied: string[], repentance: string[]): AssembledPrompt {
  const task = fill(template(t, "runoff"), { tied_guests: listJoin(tied), repentance_note: repentance.join(" ") });
  return assemble(t, ctx, dropEmptyPlaceholderLines(task));
}

/**
 * An empty placeholder on a line of its own ({reward_instruction}, an empty
 * {repentance_note}) leaves a blank line; drop doubled blanks so the task
 * reads as TD intends.
 */
function dropEmptyPlaceholderLines(task: string): string {
  return task.replace(/\n{3,}/g, "\n\n");
}

/** Inserts a bullet after the last line of the task's first bullet list. */
function addBullet(task: string, bullet: string): string {
  const lines = task.split("\n");
  const first = lines.findIndex((l) => l.startsWith("- "));
  if (first < 0) throw new Error("speak() task has no instruction bullets to extend");
  let last = first;
  while (lines[last + 1]?.startsWith("- ")) last++;
  lines.splice(last + 1, 0, `- ${bullet}`);
  return lines.join("\n");
}

function assemble(t: PromptTemplates, ctx: CharacterContext, task: string): AssembledPrompt {
  const blocks = [
    { id: "1-frame", text: fill(t.frame, { character_name: ctx.characterName }) },
    { id: "2-rules", text: rulesBlock(t, ctx.rules) },
    { id: "3-briefing", text: `YOUR BRIEFING\n${ctx.briefing}` },
    { id: "4-strategy", text: fill(t.strategy, { strategy_section: ctx.strategy ?? "No plan yet." }) },
    { id: "5-state", text: stateBlock(t, ctx.state) },
    { id: "6-8-memory", text: memoryBlock(t, ctx) },
    { id: "9-task", text: task },
  ];
  const join = (bs: typeof blocks) => bs.map((b) => b.text).join("\n\n");
  return { blocks, text: join(blocks), system: join(blocks.slice(0, 3)), user: join(blocks.slice(3)) };
}

function rulesBlock(t: PromptTemplates, r: RulesValues): string {
  return fill(t.rulesPrimer, {
    starting_florins: String(r.starting_florins),
    income: String(r.income),
    vote_price: String(r.vote_price),
    pension_size: String(r.pension_size),
    plot_protection_rule: r.plotProtection ? t.plotRule : "",
    plot_reward_rule: r.plotReward ? t.plotRule : "",
  }).trimEnd();
}

function stateBlock(t: PromptTemplates, s: StateValues): string {
  const filled = fill(t.state, {
    phase_label: s.phaseLabel,
    conversation_label: conversationLabel(s.conversation),
    // TD v0.5: outside a conversation (Murder Round, ballot, run-off) no one is present.
    present_characters: s.conversation.kind === "gathering" && !s.present.length ? "no one; you decide alone" : s.present.join(", "),
    living_others: s.livingOthers.join(", "),
    dead_list: s.dead.length ? s.dead.join(", ") : "none",
    florins: String(s.florins),
    pensions_held: s.pensionsHeld ? String(s.pensionsHeld) : "none",
    embassy_ledger: s.embassyLedger
      ? `Embassy treasury: ${s.embassyLedger.treasury} Florins. Pensions held: ${s.embassyLedger.pensions}.` +
        // TD v0.4 adds the most recent change; nothing has changed at a probe's start.
        (s.embassyLedger.latest ? ` Latest: ${s.embassyLedger.latest}.` : "")
      : "",
    withdrawal_count: String(s.withdrawalCount),
    plot_status: s.plotStatus ?? "",
    action_feedback: s.actionFeedback ?? "",
  });
  // Optional lines that came out empty are dropped rather than left blank.
  return filled
    .split("\n")
    .filter((l) => l.trim() !== "")
    .join("\n");
}

function conversationLabel(c: StateValues["conversation"]): string {
  if (c.kind === "gathering") return "the gathering";
  if (c.kind === "colloquio") {
    return `a private Colloquio with ${c.other} (utterance ${c.utterance} of ${c.cap})`;
  }
  return `a Capannello with ${listJoin(c.others)}`;
}

function memoryBlock(t: PromptTemplates, ctx: CharacterContext): string {
  const block = fill(t.memory, {
    longterm_bullets: ctx.longTermMemory.length
      ? ctx.longTermMemory.map((b) => `- ${b}`).join("\n")
      : "Nothing yet.",
    short_term_thoughts: ctx.shortTermThoughts.length ? ctx.shortTermThoughts.join("\n") : "Nothing yet.",
    history: ctx.history.map(formatHistoryLine).join("\n"),
  });
  // TD: outside a conversation, block 8 holds the end of the last conversation and any broadcasts since.
  return ctx.state.conversation.kind === "gathering"
    ? block.replace("THE CONVERSATION SO FAR (most recent last)", "WHAT YOU LAST HEARD")
    : block;
}

export function formatHistoryLine(line: HistoryLine): string {
  if (line.kind === "notaio") return `[Il Notaio] ${line.text}`;
  if (line.kind === "event") return `[${line.text}]`;
  return line.addressee
    ? `${line.speaker} (to ${line.addressee}): ${line.text}`
    : `${line.speaker}: ${line.text}`;
}

function listJoin(items: string[]): string {
  if (items.length <= 2) return items.join(" and ");
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

/**
 * Replaces {snake_case} placeholders. Throws on any placeholder without a
 * value, so a template change in the docs can't silently leave one unfilled.
 * JSON in the templates is untouched: `{"thought"` doesn't match.
 */
export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-z_]+)\}/g, (_, key: string) => {
    const v = values[key];
    if (v === undefined) throw new Error(`No value for placeholder {${key}}`);
    return v;
  });
}
