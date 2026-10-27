// A data table's heading (data-table.ts): each column's title in yellow on
// a blue band, the sorted column marked with its direction, and each title
// a control while the table sorts.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import type { PointerEvent } from "../core/events.ts";
import { fit } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { starts, type TableColumn } from "./data-table.ts";

/** What marks the sorted column: up for ascending; the English set has no down arrow (EN 300 706 Table 36), so a v for descending. */
const ASCENDING = "↑";

const DESCENDING = "v";

/** What follows a column's title: the direction of the sort when the table is sorted by it. */
function sortMark(sorted: boolean, descending: boolean): string {
  if (!sorted) {
    return "";
  }
  return descending ? DESCENDING : ASCENDING;
}

interface HeadingProps {
  readonly columns: readonly TableColumn[];
  /** A click on a column's title sorts by it: each title is a control. */
  readonly sortable: boolean;
  readonly sortBy: number | null;
  readonly descending: boolean;
  readonly onSort: (column: number) => void;
}

export class Heading extends Component<HeadingProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    canvas.background(0, 0, Colour.Blue);
    const at = starts(this.props.columns);
    this.props.columns.forEach((column, index) => {
      const mark = sortMark(index === this.props.sortBy, this.props.descending);
      canvas.coloured(0, at[index] ?? 0, Colour.Yellow, fit(`${column.title}${mark}`, column.width - 1));
      if (this.props.sortable) {
        // The column after its colour's cell.
        canvas.control(0, (at[index] ?? 0) + 1, column.width - 1, 1, String(index));
      }
    });
  }

  override onClick(event: PointerEvent): boolean {
    if (event.region === undefined) {
      return false;
    }
    this.props.onSort(Number(event.region));
    return true;
  }
}
