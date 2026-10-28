// Rows of page numbers, as an index page lists them: the number in yellow,
// what is there, a figure on the right; a click on a row goes to its page,
// and each row from its number is a control.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import type { PointerEvent } from "../core/events.ts";
import { paintEmpty } from "../core/look.ts";
import { fit, padStart } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { pageNumber } from "../text/news.ts";

/** A row: a page, its label, and a figure. */
export interface NumberedRow {
  /** The page a click on it goes to, its number first in yellow. */
  readonly page: number;
  /** What it is, cut to the room before the figure. */
  readonly label: string;
  /** What it says on the right, in cyan; nothing when absent. */
  readonly figure?: number | string;
  /** The label's colour; white when absent. */
  readonly foreground?: Colour;
}

export interface NumberedRowsProps {
  /** The rows, from the top: each a page a click goes to. */
  readonly entries: readonly NumberedRow[];
  /** What it says when there are none; "nothing listed" when absent. */
  readonly empty?: string;
}

/** The figures' width on the right. */
const FIGURE_CELLS = 6;
/** The label's first cell: after the number and its colour. */
const LABEL_AT = 4;

export class NumberedRows extends Component<NumberedRowsProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(Math.max(1, this.props.entries.length), space.height) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.entries.length === 0) {
      paintEmpty(canvas, this.props.empty ?? "nothing listed");
      return;
    }
    const figureAt = canvas.width - FIGURE_CELLS;
    this.props.entries.forEach((entry, row) => {
      canvas.coloured(row, 0, Colour.Yellow, pageNumber(entry.page));
      canvas.coloured(row, LABEL_AT, entry.foreground ?? Colour.White, fit(entry.label, figureAt - LABEL_AT - 1));
      if (entry.figure !== undefined) {
        canvas.coloured(row, figureAt, Colour.Cyan, padStart(String(entry.figure), FIGURE_CELLS - 1));
      }
      // From the number, after its colour's cell.
      canvas.control(row, 1, canvas.width - 1, 1, String(row));
    });
  }

  override onClick(event: PointerEvent): boolean {
    const entry = event.region === undefined ? undefined : this.props.entries[Number(event.region)];
    if (entry === undefined) {
      return false;
    }
    this.services.goto(event.session, entry.page);
    return true;
  }
}
