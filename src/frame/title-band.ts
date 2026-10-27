// TitleBand: split from frame.ts; the comments pass writes this file's header.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { fit } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { BAND_ROWS } from "./frame.ts";

export interface TitleBandProps {
  readonly title: string;
  readonly background: Colour;
  readonly foreground?: Colour;
}

/** The title band: a background of the band's colour, the title in double height. */
export class TitleBand extends Component<TitleBandProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(BAND_ROWS, space.height) };
  }

  override paint(canvas: Canvas): void {
    canvas.background(0, 0, this.props.background);
    canvas.doubleHeight(0, 2, this.props.foreground ?? Colour.White, fit(this.props.title, canvas.width - 5));
    canvas.background(1, 0, this.props.background);
  }
}
