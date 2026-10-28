// A rule across its box, to divide a page: a line of mosaic sixels, thin,
// bold, double, dotted or dashed, with a title in it if it has one. Every
// style is contiguous mosaics, so each line starts in the cell after its
// colour's: Separated Graphics would cost a cell of its own (EN 300 706
// Table 26), and its gapped sixels turn a dot's row into fine dashes.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { BOTTOM_ROW, LOWER_TWO, MIDDLE_ROW, MOSAIC_BASE, SIXEL, TOP_ROW } from "../core/mosaics.ts";
import { cells, fit } from "../core/text.ts";
import { Colour, mosaicColour } from "../kit.ts";

export type RuleStyle = "thin" | "bold" | "double" | "dotted" | "dashed";

export interface RuleProps {
  /** The line's look: thin, bold, double, dotted or dashed; thin when absent. */
  readonly style?: RuleStyle;
  /** The line's colour; blue when absent. */
  readonly foreground?: Colour;
  /** A title in the line, after three cells of it. */
  readonly title?: string;
  /** The title's colour; yellow when absent. */
  readonly titleForeground?: Colour;
}

/** A dot: one sixel of the middle row, a sixel unlit after it. */
const DOT = MOSAIC_BASE | SIXEL.middleLeft;

/**
 * Each style's characters, repeated across the line. A dash is a cell and
 * a half of the middle row, three sixels, and its gap the half cell after:
 * longer than a dot and than the gap between dots, so the two styles read
 * as their names.
 */
const PATTERN: Readonly<Record<RuleStyle, readonly number[]>> = {
  thin: [MIDDLE_ROW],
  bold: [LOWER_TWO],
  double: [TOP_ROW | BOTTOM_ROW],
  dotted: [DOT],
  dashed: [MIDDLE_ROW, DOT],
};

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
    const pattern = PATTERN[style];
    const line = Array.from({ length: Math.max(0, canvas.width - 1) }, (_, cell) => pattern[cell % pattern.length] ?? MIDDLE_ROW);
    canvas.mosaics(0, 0, foreground, line);
    if (this.props.title !== undefined) {
      const at = 1 + TITLE_AT;
      const title = fit(this.props.title, Math.max(0, canvas.width - at - TITLE_AT - TITLE_CODES));
      canvas.coloured(0, at, this.props.titleForeground ?? Colour.Yellow, title);
      canvas.code(0, at + 1 + cells(title), mosaicColour(foreground));
    }
  }
}
