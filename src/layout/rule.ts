// A rule across its box, to divide a page: a line of mosaic sixels, thin,
// bold, double, dotted (separated graphics, EN 300 706 clause 12.2) or
// dashed, with a title in it if it has one.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { BOTTOM_ROW, LOWER_TWO, MIDDLE_ROW, MOSAIC_BASE, SIXEL, TOP_ROW } from "../core/mosaics.ts";
import { cells, fit } from "../core/text.ts";
import { Attribute, Colour, mosaicColour } from "../kit.ts";

export type RuleStyle = "thin" | "bold" | "double" | "dotted" | "dashed";

export interface RuleProps {
  readonly style?: RuleStyle;
  readonly foreground?: Colour;
  readonly title?: string;
  readonly titleForeground?: Colour;
}

/** Each style's character, a cell of it. */
const CHARACTER: Readonly<Record<RuleStyle, number>> = {
  thin: MIDDLE_ROW,
  bold: LOWER_TWO,
  double: TOP_ROW | BOTTOM_ROW,
  dotted: MIDDLE_ROW,
  dashed: MOSAIC_BASE | SIXEL.middleLeft,
};

/** The cells after the line's mosaic colour and before its run: Separated for a dotted one. */
function lead(style: RuleStyle): number[] {
  return style === "dotted" ? [Attribute.Separated] : [];
}

/** The cells of line before a title, and kept after it. */
const TITLE_AT = 3;
/** The title's colour cell and the mosaic colour's after it. */
const TITLE_CODES = 2;

/** A line across its box, a row high, with its title in it. */
export class Rule extends Component<RuleProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const style = this.props.style ?? "thin";
    const foreground = this.props.foreground ?? Colour.Blue;
    const before = lead(style);
    const line = Array.from({ length: Math.max(0, canvas.width - 1 - before.length) }, () => CHARACTER[style]);
    canvas.codes(0, 0, [mosaicColour(foreground), ...before, ...line]);
    if (this.props.title !== undefined) {
      const at = 1 + before.length + TITLE_AT;
      const title = fit(this.props.title, Math.max(0, canvas.width - at - TITLE_AT - TITLE_CODES));
      canvas.coloured(0, at, this.props.titleForeground ?? Colour.Yellow, title);
      canvas.code(0, at + 1 + cells(title), mosaicColour(foreground));
    }
  }
}
