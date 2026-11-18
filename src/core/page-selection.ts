// The rules that ask for the keys the protocol kit selects pages by. The
// kit takes them of every page that has no use of its own for them (its
// navigation): three digits typed go to the page of that number, and F1
// to F4 and the remote's coloured keys follow the page's Fastext links. A
// viewer's receiver sends a page only what its table asks for
// (neoteletext-common's docs/page-rules.md, RULE-50), so a page whose
// components take no keys asks for these, and page selection goes on.

import { Key, type PageRule, type RuleKey, type RuleTable } from "../kit.ts";
import { type PageRules, REPORT } from "./page-rules.ts";

/** Which of a page's keys the protocol kit's page selection takes: those the page has no use of its own for (the kit's navigation; PageSpec.ownsDigits, ownsColourKeys). */
export interface PageSelectionKeys {
  /** Three digits typed select the page of that number. */
  readonly digits: boolean;
  /** F1 to F4 and the remote's coloured keys follow the page's Fastext links. */
  readonly colourKeys: boolean;
}

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/**
 * The keys of the digit row, each named as the key that carries the digit
 * on a United States layout (page-rules.md RULE-10): the kit reads a
 * digit from the text a key typed, in any script, and on a layout whose
 * digits are typed with Shift, or in another script, the key's own
 * character is not the digit. A rule's key set holds at most
 * `MAX_KEYS_PER_TRIGGER` keys (page-rules.md RULE-57), fewer than twenty, so
 * the keypad's are a rule of their own.
 */
const DIGIT_ROW: readonly RuleKey[] = DIGITS.map((digit) => ({ physical: digit }));

const KEYPAD: readonly RuleKey[] = DIGITS.map((digit) => ({ name: `Numpad${digit}` }));

/** The keys the kit follows a Fastext link by. */
const COLOUR_KEYS: readonly RuleKey[] = [Key.F1, Key.F2, Key.F3, Key.F4, Key.Red, Key.Green, Key.Yellow, Key.Blue].map((name) => ({ name }));

/** The most rules page selection adds to a table: room a page's own rules leave for them. */
export const MOST_SELECTION_RULES = 3;

/** Whether `table` asks for every key already. */
function asksEveryKey(table: RuleTable): boolean {
  return table.rules.some((rule) => [rule.on].flat().some((trigger) => trigger.event === "key" && trigger.keys === "any"));
}

/**
 * `rules` with the rules that ask for the keys the kit selects pages by,
 * so that a viewer still goes to a page by its number and follows the
 * coloured keys on a page whose components take no keys. Only the press
 * of each is asked for, since the kit does nothing at a repeat or a
 * release; text that came from no key (a paste) is not asked for, though
 * the kit would read digits from it, since a rule cannot ask for the text
 * that is digits alone. A table that asks for every key has them already,
 * and no key is to be sent by two rules.
 */
export function withPageSelection(rules: PageRules, takes: PageSelectionKeys): PageRules {
  if (asksEveryKey(rules.table) || !(takes.digits || takes.colourKeys)) {
    return rules;
  }
  const selection: PageRule[] = [];
  if (takes.digits) {
    selection.push(
      { name: "select_digits", on: { event: "key", keys: [...DIGIT_ROW] }, do: REPORT },
      { name: "select_keypad", on: { event: "key", keys: [...KEYPAD] }, do: REPORT },
    );
  }
  if (takes.colourKeys) {
    selection.push({ name: "fastext_keys", on: { event: "key", keys: [...COLOUR_KEYS] }, do: REPORT });
  }
  const table: RuleTable = { ...rules.table, rules: [...selection, ...rules.table.rules] };
  return { key: JSON.stringify(table), table, widened: rules.widened };
}
