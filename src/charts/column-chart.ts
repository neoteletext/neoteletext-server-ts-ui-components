// Columns up from a floor, a third of a row at a time (three sixels down a
// cell): each column in its own colour, since the colour's cell is the gap
// before it; its label under it and its figure over it. Labels longer than
// a column go on two rows by turns, each then as wide as two columns and
// so in full where a column's own width would cut "Mar" and "May" both to
// "Ma"; a label longer still is cut to that. A chart whose
// columns can be chosen (onChoose) makes each column, with its label, a
// control: a click chooses it, and while the pointer is on one the hint
// row says what it is.

import type { Canvas } from "../core/canvas.ts";
import { paintEmpty } from "../core/look.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import type { HoverEvent, PointerEvent } from "../core/events.ts";
import { FULL_BLOCK, MOSAIC_BASE, SIXEL } from "../core/mosaics.ts";
import { cells, fit, padStart } from "../core/text.ts";
import { Colour, mosaicColour, SIXELS_DOWN } from "../kit.ts";
import { barHint, type ChartRow } from "./bar-chart.ts";
import { mostOf } from "./numbers.ts";

export interface ColumnChartProps {
  /** The columns, left to right, scaled to the largest value that is a finite number; as many as fit across. */
  readonly bars: readonly ChartRow[];
  /** What it says when there are no columns; "no data" when absent. */
  readonly empty?: string;
  /** The rows the columns rise through. */
  readonly plotRows: number;
  /** The cells each column is wide, after its colour's cell. */
  readonly columnCells?: number;
  /** A column's colour when it has none of its own; green when absent. */
  readonly foreground?: Colour;
  /** The figures over the columns. */
  readonly figures?: boolean;
  /** A click on a column chooses it: each column is then a control, and while the pointer is on one the hint row gives its label and figure. */
  readonly onChoose?: (index: number, session: number) => void;
}

/** A column's top cell, by how many of its three sixel rows are filled from the bottom. */
const TOPS = [
  MOSAIC_BASE,
  MOSAIC_BASE | SIXEL.bottomLeft | SIXEL.bottomRight,
  MOSAIC_BASE | SIXEL.middleLeft | SIXEL.middleRight | SIXEL.bottomLeft | SIXEL.bottomRight,
  FULL_BLOCK,
] as const;
/** A column's cells after its colour's, when not given. */
const COLUMN_CELLS = 2;
/** The labels' row under the columns, and the figures' over them. */
const LABEL_ROWS = 1;
/** The labels' rows when one is longer than its column: every other label on the second. */
const STAGGERED_LABEL_ROWS = 2;

/** The column under the pointer, for the hint row. */
interface ColumnState {
  readonly hovered: number | null;
}

export class ColumnChart extends Component<ColumnChartProps, ColumnState> {
  override state: ColumnState = { hovered: null };

  get #figureRows(): number {
    return this.props.figures === true ? 1 : 0;
  }

  /** The cells each column is wide, after its colour's. */
  get #across(): number {
    return this.props.columnCells ?? COLUMN_CELLS;
  }

  /** The labels' rows: one, or two by turns when a label is longer than its column. */
  get #labelRows(): number {
    return this.props.bars.some((column) => cells(column.label) > this.#across) ? STAGGERED_LABEL_ROWS : LABEL_ROWS;
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, this.props.plotRows + this.#labelRows + this.#figureRows) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.bars.length === 0) {
      paintEmpty(canvas, this.props.empty ?? "no data");
      return;
    }
    const across = this.#across;
    const pitch = across + 1;
    const labelRows = this.#labelRows;
    // On two rows a label runs on under the next column, to the colour's cell of the one after.
    const labelCells = labelRows === LABEL_ROWS ? across : labelRows * pitch - 1;
    const top = this.#figureRows;
    // The most of the figures that are numbers: one NaN would leave every other column empty.
    const most = Math.max(1, mostOf(this.props.bars.map((column) => column.value).filter((value) => Number.isFinite(value))));
    const steps = this.props.plotRows * SIXELS_DOWN;
    // Only the rows the canvas has: a row past its foot is not drawn, and plotRows is the program's to give.
    const shownRows = Math.min(this.props.plotRows, canvas.height - top);
    this.props.bars.forEach((column, index) => {
      const at = index * pitch;
      if (at + pitch > canvas.width) {
        return;
      }
      const height = Math.round((steps * Math.max(0, column.value)) / most);
      const foreground = column.foreground ?? this.props.foreground ?? Colour.Green;
      for (let row = 0; row < shownRows; row += 1) {
        const fromBottom = this.props.plotRows - 1 - row;
        const filled = Math.max(0, Math.min(SIXELS_DOWN, height - fromBottom * SIXELS_DOWN));
        const code = TOPS[filled] ?? MOSAIC_BASE;
        canvas.codes(top + row, at, [mosaicColour(foreground), ...Array.from({ length: across }, () => code)]);
      }
      canvas.coloured(top + this.props.plotRows + (index % labelRows), at, Colour.White, fit(column.label, labelCells));
      if (this.props.figures === true) {
        canvas.coloured(0, at, Colour.Cyan, padStart(String(column.value), across).slice(-across));
      }
      if (this.props.onChoose !== undefined) {
        // Its cells after its colour's, from the top of the plot down through its labels' rows.
        canvas.control(top, at + 1, across, this.props.plotRows + labelRows, String(index));
      }
    });
  }

  override hint(): string | null {
    return barHint(this.props.bars, this.state.hovered);
  }

  override hintDescribes(): boolean {
    return true;
  }

  override onClick(event: PointerEvent): boolean {
    if (this.props.onChoose === undefined || event.region === undefined) {
      return false;
    }
    this.props.onChoose(Number(event.region), event.session);
    return true;
  }

  override onHover(event: HoverEvent): boolean {
    if (this.props.onChoose === undefined || event.region === undefined) {
      return false;
    }
    this.setState({ hovered: event.entered ? Number(event.region) : null });
    return true;
  }
}
