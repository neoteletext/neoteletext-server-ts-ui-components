// At: split from layouts.ts; the comments pass writes this file's header.

import { type Box, Component, type LayoutChild, type Size, stack, stackSize } from "../core/component.ts";

export interface AtProps {
  readonly row: number;
  readonly column: number;
  readonly rows?: number;
  readonly columns?: number;
}

/** Its children at a fixed place inside its parent's box, for what cannot flow: an emblem beside a title, a wheel in the middle. */
export class At extends Component<AtProps> {
  /** As tall as its place's row and what is placed there. */
  override measure(space: Size, children: readonly LayoutChild[]): Size {
    const inner = {
      width: this.props.columns ?? Math.max(0, space.width - this.props.column),
      height: this.props.rows ?? Math.max(0, space.height - this.props.row),
    };
    const content = this.props.rows ?? stackSize(inner, children).height;
    return { width: space.width, height: Math.min(space.height, this.props.row + content) };
  }

  /** Only what it places is reached: laid over another layer, it would otherwise take every click on the cells round what it places. */
  override pointerCells(): null {
    return null;
  }

  override arrange(box: Box, children: readonly LayoutChild[]): void {
    const inner: Box = {
      row: box.row + this.props.row,
      column: box.column + this.props.column,
      width: this.props.columns ?? Math.max(0, box.width - this.props.column),
      height: this.props.rows ?? Math.max(0, box.height - this.props.row),
    };
    stack(inner, children);
  }
}
