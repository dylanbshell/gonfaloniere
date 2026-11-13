// Every word the screen shows comes from the setting pack (TD v0.38, The Setting Pack): the engine sends
// player.json's words with the start information, and this fills their {named} placeholders. The app's
// code writes no words of its own.

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

/** A list from player.json (the example lines). */
export function list(key: string): string[] {
  const t = key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), info?.words);
  return Array.isArray(t) ? t.map(String) : [];
}

/** "A, B, and C": joined the way Il Notaio's notes join names. */
export function names(xs: string[]): string {
  const and = w("screen.and");
  if (xs.length <= 2) return xs.join(` ${and} `);
  return `${xs.slice(0, -1).join(", ")}, ${and} ${xs.at(-1)}`;
}

/** A guest's public information: the subtitle and faction only. */
export const guest = (name: string) => info?.roster.find((r) => r.name === name);
