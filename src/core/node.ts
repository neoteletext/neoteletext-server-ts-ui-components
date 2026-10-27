// Node: split from mount.ts; the comments pass writes this file's header.

import { type Region } from "./canvas.ts";
import type { Box } from "./component.ts";
import { type Element } from "./element.ts";
import { EMPTY, type AnyComponent } from "./mount.ts";

/** One instance in the tree, with the element it was last rendered from. */
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
