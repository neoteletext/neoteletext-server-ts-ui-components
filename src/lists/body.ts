// A data table's body (data-table.ts): its rows from the top shown, each
// cell in its column, the chosen row on the band while the table has the
// keys (core/look.ts) and marked while it does not, rows striped when asked,
// and each row a control when a row can be chosen.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import type { HoverEvent, PointerEvent } from "../core/events.ts";
import { CHOSEN, MARK, paintEmpty, SELECTED } from "../core/look.ts";
import { cells, fit } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { starts, type TableColumn } from "./data-table.ts";

/**
 * A cell's text in its column, after the column's colour cell, padded or
 * cut to the column as pad and padStart do (core/text.ts), but of a column
 * wider than the `room` left on the row only what falls on the row is
 * made: the width a program gives costs no more than the row's cells.
 */
function cell(text: string, column: TableColumn, room: number): string {
  const width = column.width - 1;
  const shown = fit(text, width);
  const space = Math.max(0, width - cells(shown));
  if (column.align === "right") {
    return space >= room ? " ".repeat(Math.max(0, room)) : " ".repeat(space) + shown;
  }
  return shown + " ".repeat(Math.min(space, Math.max(0, room - cells(shown))));
}

/** A row's foreground in every column, or null for each column's own. */
function rowForeground(banded: boolean, chosen: boolean, stripe: boolean): Colour | null {
  if (banded) {
    return CHOSEN.foreground;
  }
  if (chosen) {
    return SELECTED;
  }
  return stripe ? Colour.Cyan : null;
}

interface BodyProps {
  readonly columns: readonly TableColumn[];
  readonly rows: readonly (readonly string[])[];
  readonly top: number;
  readonly chosen: number | null;
  readonly focused: boolean;
  readonly striped: boolean;
  /** A click on a row chooses it: each row is a control. */
  readonly selectable: boolean;
  readonly empty: string;
  readonly onPick: (index: number, session: number) => void;
  readonly onHover?: (index: number | null, session: number) => void;
}

export class Body extends Component<BodyProps> {
  override measure(space: Size): Size {
    return space;
  }

  override paint(canvas: Canvas): void {
    if (this.props.rows.length === 0) {
      paintEmpty(canvas, this.props.empty);
      return;
    }
    const at = starts(this.props.columns);
    this.props.rows.slice(this.props.top, this.props.top + canvas.height).forEach((values, row) => {
      const index = this.props.top + row;
      const chosen = index === this.props.chosen;
      const banded = chosen && this.props.focused;
      if (banded) {
        canvas.background(row, 0, CHOSEN.background);
      } else if (chosen) {
        canvas.coloured(row, 0, SELECTED, MARK);
      }
      const foreground = rowForeground(banded, chosen, this.props.striped && index % 2 === 1);
      this.props.columns.forEach((column, place) => {
        const start = at[place] ?? 0;
        canvas.coloured(row, start, foreground ?? column.foreground ?? Colour.White, cell(values[place] ?? "", column, canvas.width - start - 1));
      });
      if (this.props.selectable) {
        canvas.bandControl(row, 0, 1, String(index));
      }
    });
  }

  override onClick(event: PointerEvent): boolean {
    if (event.region === undefined) {
      return false;
    }
    this.props.onPick(Number(event.region), event.session);
    return true;
  }

  override onHover(event: HoverEvent): boolean {
    if (this.props.onHover === undefined || event.region === undefined) {
      return false;
    }
    this.props.onHover(event.entered ? Number(event.region) : null, event.session);
    return true;
  }
}
