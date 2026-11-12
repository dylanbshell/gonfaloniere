// The input box's rules (TD v0.40, The input box and its buttons), kept apart from the components so
// the tests can check them directly. `@` opens the guest menu and `/` the command menu; each stays open
// only while its character is there, and Escape or clicking away closes it until the character is typed again.

/** The characters that open the menus: the protocol's, not words. */
export const MENTION = "@";
export const COMMAND = "/";

/** A command: the box starts with `/` and a command's name has begun. A lone `/` is not one yet. */
export const isCommand = (text: string) => /^\s*\/\S/.test(text);

/** Speak is active only when there's something to say: not empty, and not only `@` or `/`. */
export const canSpeak = (text: string) => !isCommand(text) && /[^\s@/]/.test(text);

/** Do is active once a command has a name. */
export const canDo = (text: string) => isCommand(text);

export type Trigger = { kind: "commands" | "guests"; query: string; at: number };

/**
 * Which menu the text opens, and where its character is: the command menu while the box is `/` and a
 * name being typed (no space yet); the guest menu while the text ends in `@` and a name being typed.
 */
export function trigger(text: string): Trigger | null {
  const c = text.match(/^(\s*)\/(\S*)$/);
  if (c) return { kind: "commands", query: c[2]!, at: c[1]!.length };
  const m = text.match(/@([^@\n]*)$/);
  if (m) return { kind: "guests", query: m[1]!, at: text.length - m[0].length };
  return null;
}

/** The menu shown: the trigger's, unless it was dismissed (Escape, clicking away) at the same place. */
export function openMenu(text: string, dismissed: Trigger | null): Trigger | null {
  const t = trigger(text);
  if (!t || (dismissed && dismissed.kind === t.kind && dismissed.at === t.at)) return null;
  return t;
}

/** The guests a `@` query matches, by the start of their name, ignoring case. */
export const matchGuests = (guests: string[], query: string) => guests.filter((g) => g.toLowerCase().startsWith(query.toLowerCase()));

/** The commands a `/` query matches, by the start of their name. */
export const matchCommands = <C extends { name: string }>(commands: C[], query: string) => commands.filter((c) => c.name.slice(COMMAND.length).toLowerCase().startsWith(query.toLowerCase()));

/** The text after the `@` button: a `@` at the end, after a space if the text has words. */
export const withMention = (text: string) => (text && !/\s$/.test(text) ? `${text} ${MENTION}` : `${text}${MENTION}`);
