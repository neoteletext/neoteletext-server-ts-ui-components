// At: a place given by row and column inside the parent's box, cut to it.

import { type Box, Component, type LayoutChild, type Size, stack, stackSize } from "../core/component.ts";

export interface AtProps {
  /** Cells from the top-left of the parent's box. */
  readonly row: number;
  readonly column: number;
  /** The place's size; when absent, the rest of the box below and to the right. */
  readonly rows?: number;
  readonly columns?: number;
}

/**
 * The place `props` give inside `box`, cut to it: props a page passes are
 * not trusted to stay inside, and a box wider or taller than the page
 * would have a child size its cells by it (a rule's line, a band's rows).
 */
function placeIn(box: Box, props: AtProps): Box {
  const top = Math.min(box.height, Math.max(0, props.row));
  const left = Math.min(box.width, Math.max(0, props.column));
  const bottom = Math.min(box.height, props.rows === undefined ? box.height : props.row + props.rows);
  const right = Math.min(box.width, props.columns === undefined ? box.width : props.column + props.columns);
  return { row: box.row + top, column: box.column + left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

/** Its children at a fixed place inside its parent's box, for what cannot flow: an emblem beside a title, a wheel in the middle. */
export class At extends Component<AtProps> {
  /** As tall as its place's row and what is placed there. */
  override measure(space: Size, children: readonly LayoutChild[]): Size {
    const place = placeIn({ row: 0, column: 0, ...space }, this.props);
    const content = this.props.rows === undefined ? stackSize(place, children).height : place.height;
    return { width: space.width, height: Math.min(space.height, place.row + content) };
  }

  /** Only what it places is reached: laid over another layer, it would otherwise take every click on the cells round what it places. */
  override pointerCells(): null {
    return null;
  }

  override arrange(box: Box, children: readonly LayoutChild[]): void {
    stack(placeIn(box, this.props), children);
  }
}
