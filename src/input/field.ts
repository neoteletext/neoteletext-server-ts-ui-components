// A form's field: its label on the left and its control on the right. A
// group of fields goes in a Panel (layout/panel.ts) with the group's name;
// Tab goes from control to control in the order they are drawn
// (core/mount.ts).

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Box, type LayoutChild, type Size, stack, stackSize } from "../core/layout.ts";
import { LABEL, LABEL_CELLS } from "../core/look.ts";
import { fit } from "../core/text.ts";
import { Colour } from "../kit.ts";

export interface FieldProps {
  /** What the field is, in its column, cut to the column. */
  readonly label: string;
  /** The cells the label's column takes; a control's own label column (core/look.ts, LABEL_CELLS) when absent, so a field's controls line up with labelled ones. */
  readonly labelCells?: number;
  /** A word under the label, as help: what is wanted, or that it must be given. */
  readonly note?: string;
}

/** A note's colour: cyan, as a text field's placeholder (core/look.ts, EMPTY) is help in, never the blue of what cannot be used (DISABLED). */
const NOTE = Colour.Cyan;

/** A label and, beside it, its control: the children. */
export class Field extends Component<FieldProps> {
  get #labelCells(): number {
    return this.props.labelCells ?? LABEL_CELLS;
  }

  #inner(box: Box): Box {
    return { row: box.row, column: box.column + this.#labelCells, width: Math.max(0, box.width - this.#labelCells), height: box.height };
  }

  override measure(space: Size, children: readonly LayoutChild[]): Size {
    const inner = stackSize({ width: Math.max(0, space.width - this.#labelCells), height: space.height }, children);
    return { width: space.width, height: Math.min(space.height, Math.max(this.props.note === undefined ? 1 : 2, inner.height)) };
  }

  override arrange(box: Box, children: readonly LayoutChild[]): void {
    stack(this.#inner(box), children);
  }

  override paint(canvas: Canvas): void {
    canvas.coloured(0, 0, LABEL, fit(this.props.label, this.#labelCells - 1));
    if (this.props.note !== undefined) {
      canvas.coloured(1, 0, NOTE, fit(this.props.note, this.#labelCells - 1));
    }
  }
}
