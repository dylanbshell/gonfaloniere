// Builds character prompts from Technical Design's blocks, in TD's order (most
// static first, so a character's calls share a cacheable prefix). Pure: the
// caller supplies templates and values, so the game engine can reuse it.

export interface PromptTemplates {
  frame: string;
  rulesPrimer: string;
  /** Inserted as {plot_protection_rule} when plot protection is on. */
  plotProtectionRule: string;
  strategy: string;
  state: string;
  memory: string;
  think: string;
  speak: string;
}

export interface RulesValues {
  starting_florins: number;
  income: number;
  vote_price: number;
  pension_size: number;
  plotProtection: boolean;
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
    | { kind: "colloquio"; other: string; utterance: number; cap: number };
  /** Others present, not including the character. */
  present: string[];
  /** Every other living guest, wherever they are. */
  livingOthers: string[];
  dead: string[];
  florins: number;
  pensionsHeld: number;
  /** French Embassy characters only. */
  embassyLedger?: { treasury: number; pensions: string };
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
export function assembleThinkPrompt(t: PromptTemplates, ctx: CharacterContext): AssembledPrompt {
  const colloquio = ctx.state.conversation.kind === "colloquio";
  return assemble(
    t,
    ctx,
    fill(t.think, {
      character_name: ctx.characterName,
      done_instruction: colloquio
        ? "\n3. done — true if you have what you came for, or nothing more is to be gained here; otherwise false.\n"
        : "",
      think_schema: colloquio ? '{"thought": "...", "importance": 0, "done": false}' : '{"thought": "...", "importance": 0}',
    }),
  );
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
}

export function assembleSpeakPrompt(t: PromptTemplates, ctx: CharacterContext, opts: SpeakOptions): AssembledPrompt {
  const closing =
    opts.closing?.reason === "other-ended"
      ? `${opts.closing.other} is ending this private conversation. This is your last line here.`
      : opts.closing?.reason === "cap"
        ? "This private conversation must end now. This is your last line here."
        : "";
  const task = fill(t.speak, {
    character_name: ctx.characterName,
    closing_line_note: closing,
    allowed_actions: opts.allowedActions,
  }).replace("It is your turn to speak. \n", "It is your turn to speak.\n");
  return assemble(t, ctx, opts.extraInstruction ? addBullet(task, opts.extraInstruction) : task);
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
    plot_protection_rule: r.plotProtection ? t.plotProtectionRule : "",
  }).trimEnd();
}

function stateBlock(t: PromptTemplates, s: StateValues): string {
  const filled = fill(t.state, {
    phase_label: s.phaseLabel,
    conversation_label: conversationLabel(s.conversation),
    present_characters: s.present.join(", "),
    living_others: s.livingOthers.join(", "),
    dead_list: s.dead.length ? s.dead.join(", ") : "none",
    florins: String(s.florins),
    pensions_held: s.pensionsHeld ? String(s.pensionsHeld) : "none",
    embassy_ledger: s.embassyLedger
      ? `Embassy treasury: ${s.embassyLedger.treasury} Florins. Pensions held: ${s.embassyLedger.pensions}.`
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
  if (c.kind === "colloquio") {
    return `a private Colloquio with ${c.other} (utterance ${c.utterance} of ${c.cap})`;
  }
  return `a Capannello with ${listJoin(c.others)}`;
}

function memoryBlock(t: PromptTemplates, ctx: CharacterContext): string {
  return fill(t.memory, {
    longterm_bullets: ctx.longTermMemory.length
      ? ctx.longTermMemory.map((b) => `- ${b}`).join("\n")
      : "Nothing yet.",
    short_term_thoughts: ctx.shortTermThoughts.length ? ctx.shortTermThoughts.join("\n") : "Nothing yet.",
    history: ctx.history.map(formatHistoryLine).join("\n"),
  });
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
