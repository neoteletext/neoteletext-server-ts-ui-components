// Concealed: text hidden until the viewer presses Reveal.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { fit, oneLineRows } from "../core/text.ts";
import { Attribute, Colour } from "../kit.ts";
import type { StyledProps } from "./styles.ts";

/** Concealed text: shown when the viewer presses Reveal (Table 26). */
export class Concealed extends Component<StyledProps> {
  /** Each line has its mark rows where its language needs them (marks.ts). */
  override laysOutMarks(): boolean {
    return true;
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(oneLineRows(this.language), space.height) };
  }

  /** On its one row, or in a language whose marks take the rows around its letters on the middle of three (marks.ts). */
  override paint(canvas: Canvas): void {
    const row = canvas.language.markRows;
    canvas.codes(row, 0, [this.props.foreground ?? Colour.Magenta, Attribute.Conceal]);
    canvas.text(row, 2, fit(this.props.text, canvas.width - 2));
  }
}
