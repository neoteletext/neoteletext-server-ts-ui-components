// Band: a row of text on a background of its own colour.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { fit } from "../core/text.ts";
import { Colour } from "../kit.ts";

export interface BandProps {
  readonly text: string;
  readonly background?: Colour;
  readonly foreground?: Colour;
}

/** A row on a background of its own colour, its text in another: "TOP STORY", "THE MAGAZINES". */
export class Band extends Component<BandProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    canvas.background(0, 0, this.props.background ?? Colour.Blue);
    // After the background's colour and New Background; its Black Background may take the box's last cell.
    canvas.coloured(0, 2, this.props.foreground ?? Colour.White, fit(this.props.text, canvas.width - 4));
  }
}
