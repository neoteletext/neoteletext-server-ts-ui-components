// What a component's keys do, said once: each a key, or keys, and what it
// does. The frame's hint row says them in a line (component.ts, hint) and
// KeyHelp lists them (frame/key-help.ts), so the two never disagree.

/** A key, or several said together ("Up Down"), and what it does. */
export type KeyHelpEntry = readonly [key: string, action: string];

/** What parts the entries' line is joined with, so the line can be parted again where it does not fit. */
const BETWEEN = ", ";

/** The entries in one line, as the hint row says them; null for none. */
export function bindingsText(bindings: readonly KeyHelpEntry[]): string | null {
  return bindings.length === 0 ? null : bindings.map(([key, action]) => `${key} ${action}`).join(BETWEEN);
}

/** As much of a hint as `cells` holds in whole parts, the first parts first, so no key is shown with half its action; null when not even the first fits. KeyHelp lists them all. */
export function wholeParts(text: string, cells: number): string | null {
  let kept = "";
  for (const part of text.split(BETWEEN)) {
    const longer = kept === "" ? part : `${kept}${BETWEEN}${part}`;
    if (Array.from(longer).length > cells) {
      break;
    }
    kept = longer;
  }
  return kept === "" ? null : kept;
}
