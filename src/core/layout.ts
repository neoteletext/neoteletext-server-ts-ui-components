// The language a parent and its children lay out in: a box of cells, a
// size, a child as its parent's layout sees it (measured, then placed), and
// the stacking of children down a box, which most containers do.

import type { LayoutProps } from "./element.ts";

/** A size in cells. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** A box of cells on the page: its top-left cell and its size. */
export interface Box extends Size {
  readonly row: number;
  readonly column: number;
}

/** A child as its parent's layout sees it: measured in some space, then placed in a box. */
export interface LayoutChild {
  readonly props: LayoutProps;
  measure(space: Size): Size;
  place(box: Box): void;
}

/** The default stack: children top to bottom, each as tall as it measures, sharing what is left by `grow`. */
export function stack(box: Box, children: readonly LayoutChild[]): void {
  const heights = children.map((child) => child.props.height ?? child.measure({ width: box.width, height: box.height }).height);
  const used = heights.reduce((sum, height) => sum + height, 0);
  const shares = children.map((child) => child.props.grow ?? 0);
  const total = shares.reduce((sum, share) => sum + share, 0);
  let left = Math.max(0, box.height - used);
  let row = box.row;
  children.forEach((child, index) => {
    const share = shares[index] ?? 0;
    const extra = total > 0 ? Math.floor((left * share) / total) : 0;
    const height = Math.min((heights[index] ?? 0) + extra, box.row + box.height - row);
    child.place({ row, column: box.column, width: box.width, height: Math.max(0, height) });
    row += Math.max(0, height);
    if (share > 0) {
      left -= extra;
    }
  });
}

/** The default stack's size: as wide as the space, as tall as its children together. */
export function stackSize(space: Size, children: readonly LayoutChild[]): Size {
  let height = 0;
  for (const child of children) {
    height += child.props.height ?? child.measure({ width: space.width, height: Math.max(0, space.height - height) }).height;
  }
  return { width: space.width, height: Math.min(height, space.height) };
}
