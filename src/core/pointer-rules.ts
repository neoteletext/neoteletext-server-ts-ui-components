// The pointer's part of a sub-page's rule table (page-rules.md RULE-54),
// shared by a teletext page's table, which names rectangles of its cells,
// and a picture page's, which names its drawings and objects (renderer
// parity PAR-42, RULE-12 kind 2): what a component takes of the pointer, as
// bits, and the rules that send it.

import type { PageRule, RuleCondition, RuleTarget } from "../kit.ts";
import type { Component } from "./component.ts";
import { takenByHandlers } from "./events.ts";

/** Cells of which the same is taken, by the component that names them: a rectangle of a teletext page's table. */
export interface PointerArea {
  readonly row: number;
  readonly column: number;
  readonly width: number;
  readonly height: number;
  readonly bits: number;
  readonly by: Component | null;
}

/** The most of a component's class name that names a rectangle: with the longest rule's prefix and the rectangle's number, within the 32 characters a name may have (page-rules.md RULE-36). */
const MOST_CLASS_NAME = 16;

/** What a cell's components take of the pointer there, a bit each. */
const PRESS = 1;

const RELEASE = 2;

export const EVERY_MOVE = 4;

const WHEEL = 8;

/** The rules of the pointer coming onto a control and leaving it, by which an input on a picture page is known as one (dispatch-input.ts). */
export const HOVER_IN = "hover_in";
export const HOVER_OUT = "hover_out";

/** A drag's moves, taken wherever on the page the pointer then is: asked of the page, so no part of a cell's rectangle. */
export const HELD_MOVES = 16;

/** The bits a rectangle's rules are written from. */
export const CELL_BITS = PRESS | RELEASE | EVERY_MOVE | WHEEL;

/**
 * What every rule of the library's runs: one `report` of the firing, which
 * sends the channel the viewer's event as they made it (page-rules.md
 * RULE-22, RULE-54 item 4). Every rule's `do` is this same list, so the
 * server makes one group of it and every rule shares it (RULE-35).
 */
export const REPORT: NonNullable<PageRule["do"]> = [{ type: "report" }];

/** No button down: with it a rule on every move leaves a drag's moves to the page's rule, so no move is sent twice (page-rules.md RULE-24). */
export const NO_BUTTON_HELD: RuleCondition = {
  and: [0, 1, 2].map((button): RuleCondition => ({ read: { of: "button", button }, op: "==", value: 0 })),
};

/** What a component takes of the pointer on its own cells, as bits. */
export function ownBits(component: Component): number {
  const { press, release, moves, wheel } = component.pointerInput?.() ?? takenByHandlers(component);
  const moved = moves === "all" ? EVERY_MOVE | HELD_MOVES : HELD_MOVES;
  return (press ? PRESS : 0) | (release ? RELEASE : 0) | (moves === "none" ? 0 : moved) | (wheel ? WHEEL : 0);
}

/** Whether `component` takes anything of the pointer on its own cells: on a picture page it is then a detectable drawing or object (renderer parity PAR-42). */
export function takesPointer(component: Component): boolean {
  return ownBits(component) !== 0;
}

/** A name for a rectangle from its component's class, in the letters a name may have (page-rules.md RULE-36), with its number so that no two are the same. */
export function rectName(by: Component | null, number: number): string {
  const letters = (by?.constructor.name ?? "").toLowerCase().replaceAll(/[^a-z0-9]/gu, "");
  const named = /^[a-z]/u.test(letters) ? letters : `component${letters}`;
  return `${named.slice(0, MOST_CLASS_NAME)}_${number}`;
}

/** The rules that send what `bits` take of the pointer inside `target`, each named with `suffix`. */
export function pointerRules(bits: number, target: RuleTarget, suffix: string): PageRule[] {
  const rules: PageRule[] = [];
  if ((bits & PRESS) !== 0) {
    rules.push({ name: `press${suffix}`, on: { event: "press", target, button: "any" }, do: REPORT });
  }
  if ((bits & RELEASE) !== 0) {
    rules.push({ name: `release${suffix}`, on: { event: "release", target, button: "any" }, do: REPORT });
  }
  if ((bits & WHEEL) !== 0) {
    rules.push({ name: `wheel${suffix}`, on: { event: "wheel", target }, do: REPORT });
  }
  return rules;
}

/** The rule for a drag's moves, wherever on the page the pointer goes while a button is down: the component that took the press hears them all (pointer.ts). */
export const DRAG: PageRule = { name: "drag", on: { event: "move", target: "page", held: true }, do: REPORT };

/**
 * The pointer's rules of a picture page (renderer parity PAR-42): each
 * area's cells name the drawings or objects they are drawn in (RULE-12, kind
 * 2), which the rules target in place of rectangles, whose dots are a
 * teletext page's; what is taken on the picture's base is asked of the page.
 */
export function objectRules(areas: readonly PointerArea[], everything: number, owners: readonly (readonly number[])[]): PageRule[] {
  const bitsOf = new Map<number, { bits: number; by: Component | null }>();
  for (const area of areas) {
    for (let row = area.row; row < area.row + area.height; row += 1) {
      for (let column = area.column; column < area.column + area.width; column += 1) {
        const number = owners[row]?.[column] ?? 0;
        const known = bitsOf.get(number);
        bitsOf.set(number, { bits: (known?.bits ?? 0) | area.bits, by: known?.by ?? area.by });
      }
    }
  }
  const rules: PageRule[] = [];
  for (const [number, { bits, by }] of [...bitsOf].toSorted(([a], [b]) => a - b)) {
    const target: RuleTarget = number === 0 ? "page" : { object: number };
    const name = number === 0 ? "page" : rectName(by, number);
    rules.push(...pointerRules(bits, target, `_${name}`));
    if ((bits & EVERY_MOVE) !== 0) {
      rules.push({ name: `move_${name}`, on: { event: "move", target, held: false }, when: NO_BUTTON_HELD, do: REPORT });
    }
  }
  if ((everything & HELD_MOVES) !== 0) {
    rules.push(DRAG);
  }
  return rules;
}
