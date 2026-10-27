// Paragraph: text wrapped to its box, a line a row.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { headline, wrap } from "../core/text.ts";
import { Colour } from "../kit.ts";

export interface ParagraphProps {
  readonly text: string;
  readonly foreground?: Colour;
  /** At most this many lines; the last cut with an ellipsis. */
  readonly lines?: number;
}

/** Text wrapped to the box's width, a line a row. */
export class Paragraph extends Component<ParagraphProps> {
  #lines(width: number): string[] {
    const most = this.props.lines;
    return most === undefined ? wrap(this.props.text, width - 1) : headline(this.props.text, width - 1, most);
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.#lines(space.width).length, space.height) };
  }

  override paint(canvas: Canvas): void {
    this.#lines(canvas.width).forEach((line, row) => {
      canvas.coloured(row, 0, this.props.foreground ?? Colour.White, line);
    });
  }
}
