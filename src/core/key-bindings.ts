// What a component's keys do, said once: each a key, or keys, and what it
// does. The frame's hint row says them in a line (component.ts, hint) and
// KeyHelp lists them (frame/key-help.ts), so the two never disagree.

/** A key, or several said together ("Up Down"), and what it does. */
export type KeyHelpEntry = readonly [key: string, action: string];

/** The entries in one line, as the hint row says them; null for none. */
export function bindingsText(bindings: readonly KeyHelpEntry[]): string | null {
  return bindings.length === 0 ? null : bindings.map(([key, action]) => `${key} ${action}`).join(", ");
}
