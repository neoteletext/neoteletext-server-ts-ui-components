// A sparkline: a series in one or more rows of mosaic sixels, a value to
// each column of sixels (two to a cell), scaled from its least to its
// most; its label before it and its last value after. A value that is NaN
// or Infinity has no level, and is left out, as the line chart leaves it.

import type { Canvas } from "../core/canvas.ts";
import { paintEmpty } from "../core/look.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { fit, padStart } from "../core/text.ts";
import { Colour, Sixels, SIXELS_ACROSS, SIXELS_DOWN } from "../kit.ts";
import { cellCount, leastOf, mostOf } from "./numbers.ts";

export interface SparklineProps {
  /** The series, oldest first: the latest that fit, two to a cell, scaled from their least to their most; a value that is not a finite number is left out. */
  readonly values: readonly number[];
  /** What it is, before it on its bottom row; no column when absent. */
  readonly label?: string;
  /** The label's column; 8 when absent, and none for less than none. */
  readonly labelCells?: number;
  /** One row has three levels; each row more, three more. */
  readonly plotRows?: number;
  /** What it says when no value is a finite number; "no data" when absent. */
  readonly empty?: string;
  /** Its colour; green when absent. */
  readonly foreground?: Colour;
  /** The last value after it. */
  readonly last?: boolean;
}

const LABEL_CELLS = 8;
/** The last value's cells, its colour's included. */
const LAST_CELLS = 6;

export class Sparkline extends Component<SparklineProps> {
  get #rows(): number {
    return this.props.plotRows ?? 1;
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, this.#rows) };
  }

  override paint(canvas: Canvas): void {
    const values = this.props.values.filter((value) => Number.isFinite(value));
    if (values.length === 0) {
      paintEmpty(canvas, this.props.empty ?? "no data");
      return;
    }
    const labelCells = this.props.label === undefined ? 0 : cellCount(this.props.labelCells ?? LABEL_CELLS);
    if (this.props.label !== undefined) {
      canvas.coloured(this.#rows - 1, 0, Colour.White, fit(this.props.label, labelCells - 1));
    }
    const lastCells = this.props.last === false ? 0 : LAST_CELLS;
    const cells = Math.max(1, canvas.width - labelCells - 1 - lastCells);
    const shown = values.slice(-cells * SIXELS_ACROSS);
    const height = this.#rows * SIXELS_DOWN;
    const least = leastOf(shown);
    const span = mostOf(shown) - least;
    const sixels = new Sixels(cells * SIXELS_ACROSS, height);
    shown.forEach((value, x) => {
      // Every value shows at least its bottom sixel, so a low one is not mistaken for none.
      const level = span <= 0 ? 1 : 1 + Math.round(((value - least) / span) * (height - 1));
      for (let y = height - level; y < height; y += 1) {
        sixels.set(x, y, true);
      }
    });
    canvas.sixels(0, labelCells + 1, this.props.foreground ?? Colour.Green, sixels);
    const last = shown.at(-1);
    if (this.props.last !== false && last !== undefined) {
      canvas.coloured(this.#rows - 1, labelCells + 1 + cells, Colour.Cyan, padStart(String(last), LAST_CELLS - 1));
    }
  }
}
