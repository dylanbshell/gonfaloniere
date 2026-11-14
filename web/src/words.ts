// Every word the screen shows comes from the setting pack (TD v0.38, The Setting Pack): the engine sends
// player.json's words with the start information, and this fills their {named} placeholders. The app's
// code writes no words of its own.

/** A glossary entry (Interface v0.7): its term, its plain definition, the rules sections behind it, and the words a line underlines. */
export interface GlossEntry {
  term: string;
  text: string;
  rules: string[];
  match: string[];
}

export interface StartInfo {
  setting: string;
  currency: { singular: string; plural: string };
  words: Record<string, unknown>;
  notaio: { hints: Record<string, string> };
  factions: string[];
  /** TD v0.44: the six relationship types, in relationships.json's order, with their labels, for the web's key. */
  relationshipTypes?: { type: string; label: string; covers: string }[];
  max: number;
  roster: { name: string; faction: string; subtitle: string; initials: string; colour: string }[];
  playable: { name: string; intro: string }[];
  /** Interface v0.7: the glossary's entries, amounts filled from the game's tuning values; the mini-game's leave out the full game's terms. */
  glossary?: GlossEntry[];
  started: string | null;
  ws: string | null;
}

let info: StartInfo | null = null;

export function setInfo(i: StartInfo): void {
  info = i;
  if (typeof document !== "undefined") document.title = w("screen.title");
}

export const getInfo = (): StartInfo => info!;

/** A word or template from player.json by its dotted key, filled. `{currency}` is the setting's plural. */
export function w(key: string, values: Record<string, string | number> = {}): string {
  const t = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), info?.words);
  if (typeof t !== "string") return key;
  const all: Record<string, string | number> = { currency: info?.currency.plural ?? "", ...values };
  return t.replace(/\{(\w+)\}/g, (m, k: string) => (k in all ? String(all[k]) : m));
}

/** Il Notaio's hint for a moment (notaio.json's hints), filled. */
export function notaioHint(key: string, values: Record<string, string | number> = {}): string {
  const t = info?.notaio?.hints[key];
  if (typeof t !== "string") return `hints.${key}`;
  return t.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

/** A stage's one-line description for the stage bar (player.json's screen.stageBar), by its name; "" if it has none. */
export function stageDescription(stage: string): string {
  const d = (info?.words as { screen?: { stageBar?: { descriptions?: Record<string, unknown> } } } | undefined)?.screen?.stageBar?.descriptions?.[stage];
  return typeof d === "string" ? d : "";
}

/**
 * The input box's placeholder examples (Interface v0.5; player.json's screen.input.examples): each names
 * the command it shows by action, and fills `{guest}` and `{command}`. Malformed entries are left out.
 */
export function placeholderExamples(): { action: string; text: string }[] {
  const t = (info?.words as { screen?: { input?: { examples?: unknown } } } | undefined)?.screen?.input?.examples;
  if (!Array.isArray(t)) return [];
  return t.flatMap((e) => (e && typeof e === "object" && typeof (e as { action?: unknown }).action === "string" && typeof (e as { text?: unknown }).text === "string" ? [e as { action: string; text: string }] : []));
}

/** "A, B, and C": joined the way Il Notaio's notes join names. */
export function names(xs: string[]): string {
  const and = w("screen.and");
  if (xs.length <= 2) return xs.join(` ${and} `);
  return `${xs.slice(0, -1).join(", ")}, ${and} ${xs.at(-1)}`;
}

/** A guest's public information: the subtitle and faction only. */
export const guest = (name: string) => info?.roster.find((r) => r.name === name);
