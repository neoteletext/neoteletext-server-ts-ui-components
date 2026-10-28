// The roots of what is published: a page's sub-pages. A page component
// renders one or more SubPage elements (directly or through components such
// as Document that make several); the mount lays each out on a screen of
// its own and publishes them together, numbered 1 to n, or 0 when there is
// one (docs/applications.md section 3.2).

import { COLUMNS, type FastextLinks, ROWS } from "../kit.ts";
import type { Canvas } from "./canvas.ts";
import { Component } from "./component.ts";
import { type Box, type LayoutChild, type Size } from "./layout.ts";

/** The whole screen, header row included: the server writes row 0's columns 8 to 39 itself. */
export const SCREEN: Box = { row: 0, column: 0, width: COLUMNS, height: ROWS };

/** What a sub-page sets on its screen beyond its cells. */
export interface SubPageLinks {
  readonly fastext: FastextLinks;
  /** The page the Index key goes to. */
  readonly index: number | null;
}

/** A sub-page's own props: its links. A component subclass gives its frame. */
export interface SubPageProps {
  /** The four Fastext links, red, green, yellow and cyan, each a page or null; none when absent. */
  readonly fastext?: FastextLinks;
  /** The page the Index key goes to; none when absent. */
  readonly index?: number;
}

/**
 * One screen of a page. Its children are laid out on the whole screen
 * (rows 0 to 24); the frame components (frame.ts) put the title band and
 * the Fastext row on it. The mount finds every SubPage under a page's root.
 */
export class SubPage<P extends SubPageProps = SubPageProps> extends Component<P> {
  links(): SubPageLinks {
    return { fastext: this.props.fastext ?? [null, null, null, null], index: this.props.index ?? null };
  }

  override measure(space: Size): Size {
    return space;
  }

  override arrange(_box: Box, children: readonly LayoutChild[]): void {
    for (const child of children) {
      child.place(SCREEN);
    }
  }

  override paint(_canvas: Canvas): void {}
}

/** Whether `component` is a sub-page: `instanceof` alone would make it one of any props. */
export function isSubPage(component: Component): component is SubPage {
  return component instanceof SubPage;
}
