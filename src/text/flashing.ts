// Flashing: a line of text that flashes.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { cells, fit, oneLineRows } from "../core/text.ts";
import { Attribute, Colour } from "../kit.ts";
import type { StyledProps } from "./styles.ts";

/** Flashing text (Table 26), steady again after it. */
export class Flashing extends Component<StyledProps> {
  /** Each line has its mark rows where its language needs them (marks.ts). */
  override laysOutMarks(): boolean {
    return true;
  }

  /** Its colour, Flash and Steady each take a cell beside the text. */
  override measure(space: Size): Size {
    return { width: Math.min(space.width, cells(this.props.text) + 3), height: Math.min(oneLineRows(this.language), space.height) };
  }

  /** On its one row, or in a language whose marks take the rows around its letters on the middle of three (marks.ts). */
  override paint(canvas: Canvas): void {
    const row = canvas.language.markRows;
    const shown = fit(this.props.text, canvas.width - 3);
    canvas.codes(row, 0, [this.props.foreground ?? Colour.Red, Attribute.Flash]);
    canvas.text(row, 2, shown);
    canvas.code(row, 2 + cells(shown), Attribute.Steady);
  }
}
