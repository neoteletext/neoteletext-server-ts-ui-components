// TitleBand: rows 1 and 2 of the frame, the sub-page's name in double
// height on a band of its colour.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { fit } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { BAND_ROWS } from "./frame.ts";

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

  override paint(canvas: Canvas): void {
    canvas.background(0, 0, this.props.background);
    // After the background's two cells, Double Height and the ink take two more, and its Black Background the last.
    canvas.doubleHeight(0, 2, this.props.foreground ?? Colour.White, fit(this.props.title, canvas.width - 5));
    canvas.background(1, 0, this.props.background);
  }
}
