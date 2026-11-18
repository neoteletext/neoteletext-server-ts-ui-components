// Where the keys go when the component with them goes, where an arrow no
// component took sends them, and who may take a key before the component
// with the keys. The mount (mount.ts) remembers which
// components had the keys, most recent last, so when a dialog closes they
// go back to the control that opened it, not to the page's first. A
// remote has no Tab key, so an arrow nothing took moves the keys to the
// control nearest in its direction.

import { Key } from "../kit.ts";
import type { Component } from "./component.ts";
import { isPress, type KeyEvent, typedText } from "./events.ts";
import type { Box } from "./layout.ts";
import { bubble, focusables, type Node } from "./node.ts";

/** The components remembered: enough for dialogs over dialogs, few enough that walking them costs nothing. */
const MOST_REMEMBERED = 16;

export class FocusHistory {
  #nodes: Node[] = [];

  /** `node` had the keys and gave them up. */
  left(node: Node): void {
    this.#nodes = [...this.#nodes.filter((each) => each !== node), node].slice(-MOST_REMEMBERED);
  }

  /** `node` was unmounted: it can never have the keys again. */
  forget(node: Node): void {
    this.#nodes = this.#nodes.filter((each) => each !== node);
  }

  /** The component that had the keys most recently and can take them still, or null. */
  back(): Node | null {
    for (let index = this.#nodes.length - 1; index >= 0; index -= 1) {
      const node = this.#nodes[index];
      if (node !== undefined && node.component.mounted && node.component.focusable()) {
        return node;
      }
    }
    return null;
  }
}

/** Each arrow's direction, in rows and columns. */
const DIRECTIONS: Readonly<Record<string, { readonly rows: number; readonly columns: number }>> = {
  [Key.Up]: { rows: -1, columns: 0 },
  [Key.Down]: { rows: 1, columns: 0 },
  [Key.Left]: { rows: 0, columns: -1 },
  [Key.Right]: { rows: 0, columns: 1 },
};

/** How much more a step across the arrow's direction costs than one along it, so the control straight ahead wins over a nearer one off to the side. */
const ACROSS_WEIGHT = 2;

/** Whether `key` is an arrow. */
function isArrow(key: string): boolean {
  return Object.hasOwn(DIRECTIONS, key);
}

/** A box's centre, in half cells so it stays whole. */
function centre(box: Box): { readonly row: number; readonly column: number } {
  return { row: 2 * box.row + box.height, column: 2 * box.column + box.width };
}

/** The control in `candidates` nearest `from` in the arrow `key`'s direction, its centre past `from`'s that way; null when there is none. */
function nearestIn(key: string, from: Node, candidates: readonly Node[]): Node | null {
  const direction = DIRECTIONS[key];
  if (direction === undefined) {
    return null;
  }
  const here = centre(from.box);
  let best: Node | null = null;
  let bestCost = Number.POSITIVE_INFINITY;
  for (const node of candidates) {
    if (node === from || node.box.width === 0 || node.box.height === 0) {
      continue;
    }
    const there = centre(node.box);
    const along = (there.row - here.row) * direction.rows + (there.column - here.column) * direction.columns;
    const across = Math.abs((there.row - here.row) * direction.columns) + Math.abs((there.column - here.column) * direction.rows);
    const cost = along + ACROSS_WEIGHT * across;
    if (along > 0 && cost < bestCost) {
      best = node;
      bestCost = cost;
    }
  }
  return best;
}

/** Offers `event` to each component above `focus`, from the root down, before `focus` has it; answers whether one took it. */
function captured(focus: Node | null, event: KeyEvent): boolean {
  const above: Node[] = [];
  for (let node = focus?.parent ?? null; node !== null; node = node.parent) {
    above.push(node);
  }
  return above.toReversed().some((node) => node.component.onKeyCapture?.(event) === true);
}

/** Where a key no component took moves the keys from `focus` among `order`, the components that take them as drawn: Tab to the next, wrapping; an arrow to the nearest that way. Null for nowhere. */
function focusMove(event: KeyEvent, focus: Node | null, order: readonly Node[]): Node | null {
  if (event.action === "release") {
    return null;
  }
  if (event.key === Key.Tab) {
    const next = order[(focus === null ? 0 : order.indexOf(focus) + 1) % Math.max(1, order.length)];
    return next === undefined || next === focus ? null : next;
  }
  return focus === null || !isArrow(event.key) ? null : nearestIn(event.key, focus, order);
}

/**
 * Where a key goes on a page whose keys `focus` has: captured on its way
 * down, to the focused component (or the root), as typed text to it, up to
 * those above it, to every component as a page key, then Tab or an arrow
 * moves the keys (`moveTo`); what none took as a key is typed text for those
 * above. Answers whether it was taken.
 */
export function routeKey(event: KeyEvent, focused: Node | null, root: Node | null, components: Iterable<Component>, moveTo: (node: Node) => void): boolean {
  const focus = focused ?? root;
  if (captured(focused, event) || focus?.component.onKey?.(event) === true) {
    return true;
  }
  // Typing comes as each key's press and repeat with its text (DOC-1935): the component with the keys has it as text before any above it has it as a key, so a field types the letter a page's shortcut would take.
  const typed = typedText(event);
  const text = typed === undefined ? null : { connection: event.connection, text: typed };
  if (text !== null && focus?.component.onText?.(text) === true) {
    return true;
  }
  if (bubble(focus?.parent ?? null, (component) => component.onKey?.(event)) || [...components].some((component) => component.onPageKey?.(event) === true)) {
    return true;
  }
  const moved = focused === null && !isPress(event, Key.Tab) ? null : focusMove(event, focused, focusables(root));
  if (moved !== null) {
    moveTo(moved);
    return true;
  }
  // What no component took as a key is typed text for those above the one with the keys.
  return text !== null && bubble(focus?.parent ?? null, (component) => component.onText?.(text));
}
