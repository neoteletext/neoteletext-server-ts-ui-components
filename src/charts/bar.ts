// One bar across its box, a value of a most, to the half cell: a bar on its
// own, as a poll's count is, without a chart's labels and figures. A bar
// takes its cells' upper two rows of sixels, the bottom row left clear, so
// bars in rows one under another, a chart's or a poll's, stand apart
// rather than reading as one block. A bar chart (bar-chart.ts) draws its
// bars by the same rule.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { MOSAIC_BASE, SIXEL, UPPER_TWO } from "../core/mosaics.ts";
import { Colour, mosaicColour } from "../kit.ts";

/** Half a cell of bar: the left sixels of its upper two rows. */
const BAR_HALF = MOSAIC_BASE | SIXEL.topLeft | SIXEL.middleLeft;

/** Paints a bar of `halves` half cells on `row` from `column`, which its mosaic colour takes, in `foreground`. */
export function paintBar(canvas: Canvas, row: number, column: number, halves: number, foreground: Colour): void {
  canvas.code(row, column, mosaicColour(foreground));
  canvas.fill(row, column + 1, Math.floor(halves / 2), UPPER_TWO);
  if (halves % 2 === 1) {
    canvas.code(row, column + 1 + Math.floor(halves / 2), BAR_HALF);
  }
}

export interface BarProps {
  /** How much of max: past max, a whole bar; nought or less, none. */
  readonly value: number;
  /** What a whole bar is; nought or less is no bar. */
  readonly max: number;
  /** Its colour; green when absent. */
  readonly foreground?: Colour;
}

/** A horizontal bar across its box, `value` of `max`, to the half cell; its colour takes the first cell. */
export class Bar extends Component<BarProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const cells = canvas.width - 1;
    const scaled = this.props.max <= 0 ? 0 : Math.round((2 * cells * Math.min(this.props.value, this.props.max)) / this.props.max);
    // A value or a max that is not a number, or Infinity of Infinity, is no bar: a NaN count of cells cannot be filled.
    const halves = Number.isNaN(scaled) ? 0 : scaled;
    paintBar(canvas, 0, 0, halves, this.props.foreground ?? Colour.Green);
  }
}
