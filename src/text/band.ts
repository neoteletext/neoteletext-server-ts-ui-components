// Band: split from styles.ts; the comments pass writes this file's header.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
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
    canvas.coloured(0, 2, this.props.foreground ?? Colour.White, fit(this.props.text, canvas.width - 4));
  }
}
