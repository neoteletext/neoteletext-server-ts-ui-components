// One bar across its box, a value of a most, to the half cell: a bar on its
// own, as a poll's count is, without a chart's labels and figures.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { FULL_BLOCK, LEFT_HALF } from "../core/mosaics.ts";
import { Colour, mosaicColour } from "../kit.ts";

export interface BarProps {
  readonly value: number;
  readonly max: number;
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
    canvas.code(0, 0, mosaicColour(this.props.foreground ?? Colour.Green));
    canvas.fill(0, 1, Math.floor(halves / 2), FULL_BLOCK);
    if (halves % 2 === 1) {
      canvas.code(0, 1 + Math.floor(halves / 2), LEFT_HALF);
    }
  }
}
