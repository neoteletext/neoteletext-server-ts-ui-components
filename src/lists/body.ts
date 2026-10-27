// Body: split from data-table.ts; the comments pass writes this file's header.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import type { HoverEvent, PointerEvent } from "../core/events.ts";
import { CHOSEN, MARK, paintEmpty, SELECTED } from "../core/look.ts";
import { pad, padStart } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { starts, type TableColumn } from "./data-table.ts";

function cell(text: string, column: TableColumn): string {
  return column.align === "right" ? padStart(text, column.width - 1) : pad(text, column.width - 1);
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
      this.props.columns.forEach((column, place) => {
        const foreground = banded
          ? CHOSEN.foreground
          : chosen
            ? SELECTED
            : this.props.striped && index % 2 === 1
              ? Colour.Cyan
              : (column.foreground ?? Colour.White);
        canvas.coloured(row, at[place] ?? 0, foreground, cell(values[place] ?? "", column));
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
