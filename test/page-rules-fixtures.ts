// What the rule-table tests share (REQ-6539; page-rules.md RULE-54): the
// tables a channel wrote, read from what it sent, and the rules a table of
// the library's is made of.

import type { Harness } from "neoteletext-server-ts-protocol/testing";
import type { PageRule, RectDeclaration, RuleTable } from "../src/kit.ts";

/** A teletext cell in the dots a rectangle is declared in (page-rules.md RULE-13). */
export const CELL_ACROSS = 12;

export const CELL_DOWN = 20;

/** The page's width in dots, 40 cells (page-rules.md RULE-13). */
export const PAGE_ACROSS = 480;

/** The page's height in dots, 25 rows. */
export const PAGE_DOWN = 500;

/** What every rule of the library's runs: one report of the firing (page-rules.md RULE-54 item 4). */
export const REPORT = [{ type: "report" }] as const;

/** The rules that ask for the keys and their releases. */
export const KEYS: readonly PageRule[] = [
  { name: "keys", on: { event: "key", keys: "any", repeat: true }, do: REPORT },
  { name: "keys_up", on: { event: "key_up", keys: "any" }, do: REPORT },
];

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** The rules that ask for the digits the protocol kit selects a page by: the digit row's keys by their place, and the keypad's. */
export const SELECT_DIGITS: readonly PageRule[] = [
  { name: "select_digits", on: { event: "key", keys: DIGITS.map((digit) => ({ physical: digit })) }, do: REPORT },
  { name: "select_keypad", on: { event: "key", keys: DIGITS.map((digit) => ({ name: `Numpad${digit}` })) }, do: REPORT },
];

/** The rule that asks for the keys the kit follows a Fastext link by. */
export const FASTEXT_KEYS: PageRule = {
  name: "fastext_keys",
  on: {
    event: "key",
    keys: [
      { name: "F1" },
      { name: "F2" },
      { name: "F3" },
      { name: "F4" },
      { name: "ColorF0Red" },
      { name: "ColorF1Green" },
      { name: "ColorF2Yellow" },
      { name: "ColorF3Blue" },
    ],
  },
  do: REPORT,
};

/** What a page whose components take no keys asks for, so that the kit's page selection goes on. */
export const SELECTION: readonly PageRule[] = [...SELECT_DIGITS, FASTEXT_KEYS];

/** The rule that asks for text that came from no key. */
export const TEXT: PageRule = { name: "text", on: { event: "text" }, do: REPORT };

/** The rules that ask for the pointer coming onto a control and leaving it. */
export const HOVER: readonly PageRule[] = [
  { name: "hover_in", on: { event: "enter", target: { control: "any" } }, do: REPORT },
  { name: "hover_out", on: { event: "leave", target: { control: "any" } }, do: REPORT },
];

/** The rule that asks for a drag's moves. */
export const DRAG: PageRule = { name: "drag", on: { event: "move", target: "page", held: true }, do: REPORT };

export function press(rect: string): PageRule {
  return { name: `press_${rect}`, on: { event: "press", target: { rect }, button: "any" }, do: REPORT };
}

export function release(rect: string): PageRule {
  return { name: `release_${rect}`, on: { event: "release", target: { rect }, button: "any" }, do: REPORT };
}

export function wheel(rect: string): PageRule {
  return { name: `wheel_${rect}`, on: { event: "wheel", target: { rect } }, do: REPORT };
}

/** A rectangle of whole cells, in dots. */
export function cellsRect(name: string, row: number, column: number, width: number, height: number): RectDeclaration {
  return { name, x: column * CELL_ACROSS, y: row * CELL_DOWN, width: width * CELL_ACROSS, height: height * CELL_DOWN };
}

/** A whole row's rectangle. */
export function rowsRect(name: string, row: number, height = 1): RectDeclaration {
  return cellsRect(name, row, 0, PAGE_ACROSS / CELL_ACROSS, height);
}

/** Every `rules` message the channel wrote, in order. */
export function rulesSent(page: Harness): readonly unknown[] {
  return page.sent.filter((each) => each["type"] === "rules");
}

/** The table the channel last sent of the page: what a viewer's receiver now holds. */
export function tableSent(page: Harness): unknown {
  return rulesSent(page)
    .map((each) => (typeof each === "object" && each !== null && "table" in each ? each.table : undefined))
    .at(-1);
}

/** A table as the wire carries it: what is absent left out. */
export function table(rules: readonly PageRule[], rects: readonly RectDeclaration[] = []): RuleTable {
  return rects.length === 0 ? { rules } : { rects, rules };
}
