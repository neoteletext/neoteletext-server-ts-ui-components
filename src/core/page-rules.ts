// A page's rule table, written from the components on it
// (neoteletext-common's docs/page-rules.md, RULE-54). A page is a page
// number and a sub-code together (DEC-6599, RULE-112): each sub-page has a
// table of its own, from its own components and cells. A viewer's receiver
// sends a page's channel nothing the page's table does not ask for
// (RULE-50, REQ-6523), so the table asks for exactly what the components
// mounted on the page can take, and a page of text asks for nothing:
// - keys, their releases and text, where a component takes the keys;
// - a press, and for a component that follows the pointer the release and
//   its moves, on the cells where the component is drawn;
// - the wheel on the cells of a component that scrolls;
// - the pointer coming onto a control and leaving it, where a component
//   draws something of its own for it;
// - the keyboard's focus coming and going, where a component hears it;
// - the keys the protocol kit selects pages by, which it takes of every
//   page that has no use of its own for them: the digits and the coloured
//   keys (page-selection.ts).
// Every rule only reports: the receiver does nothing locally for it, so
// the components behave as they did when every input was sent. An input that
// comes back is given to its component by where it landed and who has the
// keys, as it always was, on the sub-page it came from (dispatch-input.ts,
// mount.ts); its rule says which need asked for it.

import { COLUMNS, type PageRule, type RectDeclaration, ROWS, type RuleCondition, type RuleTable, type RuleTarget } from "../kit.ts";
import type { Component } from "./component.ts";
import type { Reach } from "./draw.ts";
import { takenByHandlers } from "./events.ts";
import type { Node } from "./node.ts";
import { MOST_SELECTION_RULES } from "./page-selection.ts";
import type { TableLimits } from "./table-limits.ts";

/** A page's table and a key that is the same exactly when the table is. */
export interface PageRules {
  readonly key: string;
  readonly table: RuleTable;
  /** Why the table asks the whole page for the pointer and not each component's cells, when it does: it had more areas or rules than a table holds. Null otherwise. */
  readonly widened: string | null;
}

/** What a sub-page's table is written from: its mount's tree as last drawn. A sub-page is a page (DEC-6599): nothing of another sub-page counts. */
export interface RuleSources {
  /** The components drawn on the sub-page and those it is drawn within. */
  readonly components: Iterable<Component>;
  readonly root: Node | null;
  /** What the sub-page's own cells reach: an input from it is found on those alone (draw.ts). */
  readonly reach: Reach;
  /** Whether a component read what the pointer is over as it rendered: the hint of the control under it, or whether it is on one of its own. */
  readonly hoverRead: boolean;
  /** What one table may hold (table-limits.ts). */
  readonly most: TableLimits;
}

/** A cell of a teletext page in the dots a rectangle is declared in, 12 across and 20 down of the page's 480 by 500 (page-rules.md RULE-13). */
const CELL_DOTS_ACROSS = 12;

const CELL_DOTS_DOWN = 20;

/** The most of a component's class name that names a rectangle: with the longest rule's prefix and the rectangle's number, within the 32 characters a name may have (page-rules.md RULE-36). */
const MOST_CLASS_NAME = 16;

/** What a cell's components take of the pointer there, a bit each. */
const PRESS = 1;

const RELEASE = 2;

const EVERY_MOVE = 4;

const WHEEL = 8;

/** A drag's moves, taken wherever on the page the pointer then is: asked of the page, so no part of a cell's rectangle. */
const HELD_MOVES = 16;

/** The bits a rectangle's rules are written from. */
const CELL_BITS = PRESS | RELEASE | EVERY_MOVE | WHEEL;

/**
 * What every rule of the library's runs: one `report` of the firing, which
 * sends the channel the viewer's event as they made it (page-rules.md
 * RULE-22, RULE-54 item 4). Every rule's `do` is this same list, so the
 * server makes one group of it and every rule shares it (RULE-35).
 */
export const REPORT: NonNullable<PageRule["do"]> = [{ type: "report" }];

/** No button down: with it a rule on every move leaves a drag's moves to the page's rule, so no move is sent twice (page-rules.md RULE-24). */
const NO_BUTTON_HELD: RuleCondition = {
  and: [0, 1, 2].map((button): RuleCondition => ({ read: { of: "button", button }, op: "==", value: 0 })),
};

/** What a component takes of the pointer on its own cells, as bits. */
function ownBits(component: Component): number {
  const { press, release, moves, wheel } = component.pointerInput?.() ?? takenByHandlers(component);
  const moved = moves === "all" ? EVERY_MOVE | HELD_MOVES : HELD_MOVES;
  return (press ? PRESS : 0) | (release ? RELEASE : 0) | (moves === "none" ? 0 : moved) | (wheel ? WHEEL : 0);
}

/** A cell's part of the pointer: what the component drawn there and those above it take, since each is offered it in turn (pointer.ts), and the nearest of them that takes any, which names its rectangle. */
interface Taken {
  readonly bits: number;
  readonly by: Component | null;
}

const NOTHING_TAKEN: Taken = { bits: 0, by: null };

/** What is taken of the pointer on a cell that reaches `node`, kept in `known` as it is found. */
function takenAt(node: Node | null, known: Map<Node, Taken>): Taken {
  if (node === null) {
    return NOTHING_TAKEN;
  }
  const found = known.get(node);
  if (found !== undefined) {
    return found;
  }
  const own = ownBits(node.component);
  const above = takenAt(node.parent, known);
  const taken = { bits: own | above.bits, by: own === 0 ? above.by : node.component };
  known.set(node, taken);
  return taken;
}

/** A rectangle of cells of which the same is taken, by the component that names it. */
interface Area {
  readonly row: number;
  readonly column: number;
  readonly width: number;
  height: number;
  readonly bits: number;
  readonly by: Component | null;
}

/**
 * The cells of which something is taken, as rectangles that share no cell:
 * each row's runs of cells of which the same is taken, a run joined to the
 * one above it where that has the same columns. A pointer event is then
 * inside one rectangle at most, so no two rules send it.
 */
function areasOf(sources: RuleSources): { readonly areas: Area[]; readonly everything: number } {
  const known = new Map<Node, Taken>();
  const areas: Area[] = [];
  let open = new Map<string, Area>();
  let everything = 0;
  for (let row = 0; row < ROWS; row += 1) {
    const stillOpen = new Map<string, Area>();
    let column = 0;
    while (column < COLUMNS) {
      const start = column;
      const taken = takenAt(sources.reach.grid[row]?.[column] ?? sources.root, known);
      everything |= taken.bits;
      const bits = taken.bits & CELL_BITS;
      column += 1;
      while (column < COLUMNS && (takenAt(sources.reach.grid[row]?.[column] ?? sources.root, known).bits & CELL_BITS) === bits) {
        column += 1;
      }
      if (bits !== 0) {
        const place = `${start}:${column - start}:${bits}`;
        let area = open.get(place);
        if (area === undefined) {
          area = { row, column: start, width: column - start, height: 0, bits, by: taken.by };
          areas.push(area);
        }
        area.height += 1;
        stillOpen.set(place, area);
      }
    }
    open = stillOpen;
  }
  return { areas, everything };
}

/** A name for a rectangle from its component's class, in the letters a name may have (page-rules.md RULE-36), with its number so that no two are the same. */
function rectName(by: Component | null, number: number): string {
  const letters = (by?.constructor.name ?? "").toLowerCase().replaceAll(/[^a-z0-9]/gu, "");
  const named = /^[a-z]/u.test(letters) ? letters : `component${letters}`;
  return `${named.slice(0, MOST_CLASS_NAME)}_${number}`;
}

/** The rules that send what `bits` take of the pointer inside `target`, each named with `suffix`. */
function pointerRules(bits: number, target: RuleTarget, suffix: string): PageRule[] {
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
const DRAG: PageRule = { name: "drag", on: { event: "move", target: "page", held: true }, do: REPORT };

/** The pointer's rules with a rectangle for each area, and the rectangles. */
function areaRules(areas: readonly Area[], everything: number): { readonly rects: RectDeclaration[]; readonly rules: PageRule[] } {
  const rects: RectDeclaration[] = [];
  const rules: PageRule[] = [];
  for (const [index, area] of areas.entries()) {
    const name = rectName(area.by, index + 1);
    const target: RuleTarget = { rect: name };
    rects.push({
      name,
      x: area.column * CELL_DOTS_ACROSS,
      y: area.row * CELL_DOTS_DOWN,
      width: area.width * CELL_DOTS_ACROSS,
      height: area.height * CELL_DOTS_DOWN,
    });
    rules.push(...pointerRules(area.bits, target, `_${name}`));
    if ((area.bits & EVERY_MOVE) !== 0) {
      rules.push({ name: `move_${name}`, on: { event: "move", target, held: false }, when: NO_BUTTON_HELD, do: REPORT });
    }
  }
  if ((everything & HELD_MOVES) !== 0) {
    rules.push(DRAG);
  }
  return { rects, rules };
}

/** The pointer's rules asked of the whole page, for a page with more areas than a table has rectangles or rules for: each under the name the server's default table gives it (page-rules.md RULE-53). */
function wholePageRules(everything: number): PageRule[] {
  const rules = pointerRules(everything, "page", "");
  if ((everything & EVERY_MOVE) !== 0) {
    rules.push({ name: "move", on: { event: "move", target: "page", held: false }, do: REPORT });
  } else if ((everything & HELD_MOVES) !== 0) {
    rules.push(DRAG);
  }
  return rules;
}

/** The rules for the keys, text and the keyboard's focus: asked of the page, since they go to whichever component has the keys (focus.ts). */
function keyboardRules(components: readonly Component[]): PageRule[] {
  const rules: PageRule[] = [];
  const texts = components.some((each) => each.onText !== undefined || each.onPaste !== undefined || each.onCompose !== undefined);
  // A key goes to the component with the keys, as a key and as the text it typed, to those above it, to every component as a page key, and moves the keys among those that take them.
  const keys = components.some(
    (each) => each.onKey !== undefined || each.onKeyCapture !== undefined || each.onPageKey !== undefined || each.onText !== undefined || each.focusable(),
  );
  if (keys) {
    rules.push(
      { name: "keys", on: { event: "key", keys: "any", repeat: true }, do: REPORT },
      { name: "keys_up", on: { event: "key_up", keys: "any" }, do: REPORT },
    );
  }
  if (texts) {
    rules.push({ name: "text", on: { event: "text" }, do: REPORT });
  }
  if (components.some((each) => each.onPageFocus !== undefined)) {
    rules.push({ name: "focus", on: { event: "focus" }, do: REPORT });
  }
  if (components.some((each) => each.onPageBlur !== undefined)) {
    rules.push({ name: "blur", on: { event: "blur" }, do: REPORT });
  }
  return rules;
}

/** The rules for the pointer coming onto a control and leaving it: only where the page declares a control and a component draws something of its own for it, since the receiver draws a control's look under the pointer itself (page-rules.md RULE-50). */
function hoverRules(sources: RuleSources): PageRule[] {
  const { controls } = sources.reach;
  const heard = controls.some(({ node }) => {
    for (let at: Node | null = node; at !== null; at = at.parent) {
      if (at.component.onHover !== undefined) {
        return true;
      }
    }
    return false;
  });
  if (controls.length === 0 || !(heard || sources.hoverRead)) {
    return [];
  }
  return [
    { name: "hover_in", on: { event: "enter", target: { control: "any" } }, do: REPORT },
    { name: "hover_out", on: { event: "leave", target: { control: "any" } }, do: REPORT },
  ];
}

/** The table of a sub-page whose tree is `sources` (page-rules.md RULE-54), before the kit's page selection: with no rules when nothing on it takes input. */
export function pageRules(sources: RuleSources): PageRules {
  const keyboard = keyboardRules([...sources.components]);
  const others = [...keyboard, ...hoverRules(sources)];
  const { areas, everything } = areasOf(sources);
  const byArea = areaRules(areas, everything);
  // A page that does not ask for every key may be given page selection's rules as well.
  const { most } = sources;
  const room = most.rules - (keyboard.some((rule) => rule.name === "keys") ? 0 : MOST_SELECTION_RULES);
  const fits = byArea.rects.length <= most.rects && others.length + byArea.rules.length <= room;
  const table: RuleTable = fits
    ? { ...(byArea.rects.length === 0 ? {} : { rects: byArea.rects }), rules: [...others, ...byArea.rules] }
    : { rules: [...others, ...wholePageRules(everything)] };
  const widened = fits
    ? null
    : `${byArea.rects.length} pointer areas and ${others.length + byArea.rules.length + most.rules - room} rules, of the ${most.rects} rectangles (MAX_RECTS) and ${most.rules} rules (MAX_RULES) a rule table holds; the pointer is asked for over the whole page`;
  return { key: JSON.stringify(table), table, widened };
}
