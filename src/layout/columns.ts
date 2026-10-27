// Columns: split from layouts.ts; the comments pass writes this file's header.

import { type Box, Component, type LayoutChild, type Size } from "../core/component.ts";

export interface ColumnsProps {
  /** The columns' widths; one without a width shares what is left. */
  readonly widths?: readonly (number | null)[];
}

/** Children side by side, each as tall as the tallest. Each column's first cell is its own: its colour attribute (canvas.ts). */
export class Columns extends Component<ColumnsProps> {
  #widths(width: number, children: readonly LayoutChild[]): number[] {
    const given = children.map((child, index) => this.props.widths?.[index] ?? child.props.width ?? null);
    const fixed = given.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const free = given.filter((value) => value === null).length;
    const share = free > 0 ? Math.floor(Math.max(0, width - fixed) / free) : 0;
    return given.map((value) => value ?? share);
  }

  override measure(space: Size, children: readonly LayoutChild[]): Size {
    const widths = this.#widths(space.width, children);
    const height = Math.max(0, ...children.map((child, index) => child.measure({ width: widths[index] ?? 0, height: space.height }).height));
    return { width: space.width, height: Math.min(height, space.height) };
  }

  override arrange(box: Box, children: readonly LayoutChild[]): void {
    const widths = this.#widths(box.width, children);
    let column = box.column;
    children.forEach((child, index) => {
      const width = Math.min(widths[index] ?? 0, box.column + box.width - column);
      child.place({ row: box.row, column, width: Math.max(0, width), height: box.height });
      column += Math.max(0, width);
    });
  }
}
