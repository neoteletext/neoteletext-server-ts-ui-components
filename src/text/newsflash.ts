// Newsflash: NEWSFLASH, flashing, before a line of news.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { fit, oneLineRows } from "../core/text.ts";
import { Attribute, Colour } from "../kit.ts";

export interface NewsflashProps {
  /** The news, in yellow after NEWSFLASH, cut to the row. */
  readonly text: string;
}

/** NEWSFLASH, flashing in red, then the news in yellow. */
export class Newsflash extends Component<NewsflashProps> {
  /** Each line has its mark rows where its language needs them (marks.ts). */
  override laysOutMarks(): boolean {
    return true;
  }

  /** One row, or in a language whose marks take the rows around its letters three, the news on the middle one (marks.ts). */
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(oneLineRows(this.language), space.height) };
  }

  override paint(canvas: Canvas): void {
    const word = "NEWSFLASH";
    const row = canvas.language.markRows;
    canvas.codes(row, 0, [Colour.Red, Attribute.Flash]);
    canvas.text(row, 2, word);
    canvas.code(row, 2 + word.length, Attribute.Steady);
    canvas.coloured(row, 3 + word.length, Colour.Yellow, fit(this.props.text, canvas.width - word.length - 4));
  }
}
