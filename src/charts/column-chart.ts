// Columns up from a floor, a third of a row at a time (three sixels down a
// cell): each column in its own colour, since the colour's cell is the gap
// before it; its label under it and its figure over it. A chart whose
// columns can be chosen (onChoose) makes each column, with its label, a
// control: a click chooses it, and while the pointer is on one the hint
// row says what it is.

import type { Canvas } from "../core/canvas.ts";
import { paintEmpty } from "../core/look.ts";
import { Component, type Size } from "../core/component.ts";
import type { HoverEvent, PointerEvent } from "../core/events.ts";
import { FULL_BLOCK, MOSAIC_BASE, SIXEL } from "../core/mosaics.ts";
import { fit, padStart } from "../core/text.ts";
import { Colour, mosaicColour, SIXELS_DOWN } from "../kit.ts";
import { barHint, type ChartRow } from "./bar-chart.ts";

export interface ColumnChartProps {
  readonly bars: readonly ChartRow[];
  readonly empty?: string;
  /** The rows the columns rise through. */
  readonly plotRows: number;
  /** The cells each column is wide, after its colour's cell. */
  readonly columnCells?: number;
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
const COLUMN_CELLS = 2;
/** The labels' row under the columns, and the figures' over them. */
const LABEL_ROWS = 1;

export class ColumnChart extends Component<ColumnChartProps, { readonly hovered: number | null }> {
  override state = { hovered: null as number | null };

  get #figureRows(): number {
    return this.props.figures === true ? 1 : 0;
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, this.props.plotRows + LABEL_ROWS + this.#figureRows) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.bars.length === 0) {
      paintEmpty(canvas, this.props.empty ?? "no data");
      return;
    }
    const across = this.props.columnCells ?? COLUMN_CELLS;
    const pitch = across + 1;
    const top = this.#figureRows;
    const most = Math.max(1, ...this.props.bars.map((column) => column.value));
    const steps = this.props.plotRows * SIXELS_DOWN;
    this.props.bars.forEach((column, index) => {
      const at = index * pitch;
      if (at + pitch > canvas.width) {
        return;
      }
      const height = Math.round((steps * Math.max(0, column.value)) / most);
      const foreground = column.foreground ?? this.props.foreground ?? Colour.Green;
      for (let row = 0; row < this.props.plotRows; row += 1) {
        const fromBottom = this.props.plotRows - 1 - row;
        const filled = Math.max(0, Math.min(SIXELS_DOWN, height - fromBottom * SIXELS_DOWN));
        canvas.codes(top + row, at, [mosaicColour(foreground), ...new Array<number>(across).fill(TOPS[filled] ?? MOSAIC_BASE)]);
      }
      canvas.coloured(top + this.props.plotRows, at, Colour.White, fit(column.label, across));
      if (this.props.figures === true) {
        canvas.coloured(0, at, Colour.Cyan, padStart(String(column.value), across).slice(-across));
      }
      if (this.props.onChoose !== undefined) {
        // Its cells after its colour's, from the top of the plot down through its label.
        canvas.control(top, at + 1, across, this.props.plotRows + LABEL_ROWS, String(index));
      }
    });
  }

  override hint(): string | null {
    return barHint(this.props.bars, this.state.hovered);
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
