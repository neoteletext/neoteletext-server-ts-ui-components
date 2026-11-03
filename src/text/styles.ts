// Text: one line of text in a colour, and the props of the styled lines
// (double height and width, flashing, concealed) that have a file each.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { leadCells } from "../core/language.ts";
import { cells, fit, oneLineRows } from "../core/text.ts";
import { Colour } from "../kit.ts";

export interface TextProps {
  /** The line, cut with a mark at the box's edge. */
  readonly text: string;
  /** Its colour; white when absent. */
  readonly foreground?: Colour;
  /** Centred in its box. */
  readonly centre?: boolean;
  /** In double height (DEC-2222): a row more; single height on rows 22 to 24 and in Thai and Lao. */
  readonly doubleHeight?: boolean;
}

/**
 * One line of text in a colour: the colour takes the first cell, the text is
 * cut with a mark at the box's edge. Right to left it is flush with the
 * box's right edge; in a language whose marks take the rows around its
 * letters, it takes three rows, its text on the middle one (marks.ts).
 */
export class Text extends Component<TextProps> {
  /** Each line has its mark rows where its language needs them (marks.ts). */
  override laysOutMarks(): boolean {
    return true;
  }

  override measure(space: Size): Size {
    const double = this.props.doubleHeight === true;
    return { width: Math.min(space.width, cells(this.props.text) + leadCells(double)), height: Math.min(oneLineRows(this.language, double), space.height) };
  }

  override paint(canvas: Canvas): void {
    const double = this.props.doubleHeight === true;
    const shown = fit(this.props.text, canvas.width - leadCells(double));
    const width = cells(shown) + leadCells(double);
    const column = this.props.centre === true ? Math.max(0, Math.floor((canvas.width - width) / 2)) : canvas.start(width);
    canvas.line(canvas.language.markRows, column, this.props.foreground ?? Colour.White, shown, double);
  }
}

export interface StyledProps {
  /** The line, cut to the box. */
  readonly text: string;
  /** Its colour; when absent, the style's own: magenta concealed, red flashing, yellow in double height or width. */
  readonly foreground?: Colour;
}
