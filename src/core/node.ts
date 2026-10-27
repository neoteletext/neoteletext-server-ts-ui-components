// One instance in a mount's tree (mount.ts): the component, the element it
// was last rendered from, where it was laid out and what it marked, and the
// walks over the tree that find components by what they take.

import type { Region } from "./canvas.ts";
import type { Component } from "./component.ts";
import type { Box } from "./layout.ts";
import type { Element } from "./element.ts";

export type AnyComponent = Component;

/** No box: where a component is before it is first laid out. */
export const EMPTY: Box = { row: 0, column: 0, width: 0, height: 0 };

export class Node {
  element: Element;
  readonly component: AnyComponent;
  readonly parent: Node | null;
  children: Node[] = [];
  box: Box = EMPTY;
  /** The regions it marked as it last painted the first sub-page (canvas.ts). */
  regions: Region[] = [];

  constructor(element: Element, component: AnyComponent, parent: Node | null) {
    this.element = element;
    this.component = component;
    this.parent = parent;
  }
}

/** Every node under `root` that takes the keys, in the order they are drawn. */
export function focusables(root: Node | null): Node[] {
  const found: Node[] = [];
  const visit = (node: Node): void => {
    if (node.component.focusable()) {
      found.push(node);
    }
    for (const child of node.children) {
      visit(child);
    }
  };
  if (root !== null) {
    visit(root);
  }
  return found;
}

/** The first node under `root` that takes the keys. */
export function firstFocusable(root: Node | null): Node | null {
  return focusables(root)[0] ?? null;
}

/** Hands `handle` each node from `from` up to the root, until one takes what it is given. */
export function bubble(from: Node | null, handle: (component: AnyComponent, node: Node) => boolean | void): boolean {
  for (let node = from; node !== null; node = node.parent) {
    if (handle(node.component, node) === true) {
      return true;
    }
  }
  return false;
}
