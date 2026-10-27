// Newsflash: NEWSFLASH, flashing, before a line of news.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { fit } from "../core/text.ts";
import { Attribute, Colour } from "../kit.ts";

export interface NewsflashProps {
  readonly text: string;
}

/** NEWSFLASH, flashing in red, then the news in yellow. */
export class Newsflash extends Component<NewsflashProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const word = "NEWSFLASH";
    canvas.codes(0, 0, [Colour.Red, Attribute.Flash]);
    canvas.text(0, 2, word);
    canvas.code(0, 2 + word.length, Attribute.Steady);
    canvas.coloured(0, 3 + word.length, Colour.Yellow, fit(this.props.text, canvas.width - word.length - 4));
  }
}
