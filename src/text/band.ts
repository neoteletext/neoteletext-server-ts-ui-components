// Band: a row of text on a background of its own colour.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { leadCells } from "../core/language.ts";
import { cells, fit, oneLineRows } from "../core/text.ts";

/** The background's colour and New Background, before the text. */
const BACKGROUND_CELLS = 2;
/** The cells of the band besides its text and what leads it: the background's two, and Black Background in the last. */
const BAND_CELLS = BACKGROUND_CELLS + 1;
import { Colour } from "../kit.ts";

export interface BandProps {
  /** Its text, cut to the row. */
  readonly text: string;
  /** The band's colour; blue when absent. */
  readonly background?: Colour;
  /** The text's colour; white when absent. */
  readonly foreground?: Colour;
  /** In double height (DEC-2222): the band a row deeper; single height on rows 22 to 24. */
  readonly doubleHeight?: boolean;
}

/** A row on a background of its own colour, its text in another: "TOP STORY", "THE MAGAZINES". */
export class Band extends Component<BandProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(oneLineRows(this.props.doubleHeight === true), space.height) };
  }

  override paint(canvas: Canvas): void {
    const double = this.props.doubleHeight === true;
    const rows = oneLineRows(double);
    for (let row = 0; row < rows; row += 1) {
      canvas.background(row, 0, this.props.background ?? Colour.Blue);
    }
    // After the background's colour and New Background; its Black Background may take the box's last cell.
    const text = fit(this.props.text, canvas.width - BAND_CELLS - leadCells(double));
    canvas.line(0, canvas.start(cells(text) + leadCells(double), BACKGROUND_CELLS, 1), this.props.foreground ?? Colour.White, text, double);
  }
}
