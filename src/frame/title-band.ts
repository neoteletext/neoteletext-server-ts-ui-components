// TitleBand: rows 1 and 2 of the frame, the sub-page's name in double
// height on a band of its colour.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { cells, fit } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { BAND_ROWS } from "./frame.ts";

/** The band's colour and New Background, before the title. */
const BACKGROUND_CELLS = 2;
/** The Black Background that ends the band in the box's last cell, when it stops short of the row's end. */
const BLACK_BACKGROUND_CELLS = 1;
/** Before the title's text: Double Height (or Normal Size) and its ink. */
const TITLE_LEAD = 2;
/** The cells of the band that are not the title's text. */
const TITLE_SPARE = BACKGROUND_CELLS + TITLE_LEAD + BLACK_BACKGROUND_CELLS;

export interface TitleBandProps {
  /** The sub-page's name, in double height, cut to the band. */
  readonly title: string;
  /** The band's colour. */
  readonly background: Colour;
  /** The title's colour; white when absent. */
  readonly foreground?: Colour;
}

/** The title band: a background of the band's colour, the title in double height. */
export class TitleBand extends Component<TitleBandProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(BAND_ROWS, space.height) };
  }

  /** The band, and the title on it in double height; right to left, flush with the band's end. */
  override paint(canvas: Canvas): void {
    for (let row = 0; row < BAND_ROWS; row += 1) {
      canvas.background(row, 0, this.props.background);
    }
    // After the background's two cells, Double Height and the ink take two more, and its Black Background the last.
    const title = fit(this.props.title, canvas.width - TITLE_SPARE);
    const width = cells(title) + TITLE_LEAD;
    canvas.doubleHeight(0, canvas.start(width, BACKGROUND_CELLS, BLACK_BACKGROUND_CELLS), this.props.foreground ?? Colour.White, title);
  }
}
