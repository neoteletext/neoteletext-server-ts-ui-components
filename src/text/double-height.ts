// DoubleHeight: a line of text two rows high.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { lineRows } from "../core/language.ts";
import { cells, fit } from "../core/text.ts";
import { Colour } from "../kit.ts";
import type { StyledProps } from "./styles.ts";

/** The rows double height takes: its own and the row below (clause 12.3). */
const DOUBLE_ROWS = 2;

/** Double height: the text covers its row and the row below, across the whole page (clause 12.3). */
export class DoubleHeight extends Component<StyledProps> {
  /** Two rows; in a language whose marks take the rows around its letters, single height on the middle of three (DEC-2222 item 2). */
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(Math.max(DOUBLE_ROWS, lineRows(this.language)), space.height) };
  }

  override paint(canvas: Canvas): void {
    const shown = fit(this.props.text, canvas.width - 2);
    canvas.doubleHeight(canvas.language.markRows, canvas.start(cells(shown) + 2), this.props.foreground ?? Colour.Yellow, shown);
  }
}
