// Paragraph: text wrapped to its box, a line a row.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { leadCells, linePitch } from "../core/language.ts";
import { cells, headline, wrap } from "../core/text.ts";
import { Colour } from "../kit.ts";

export interface ParagraphProps {
  /** The text, wrapped to the box's width. */
  readonly text: string;
  /** Its colour; white when absent. */
  readonly foreground?: Colour;
  /** At most this many lines; the last cut with an ellipsis. */
  readonly lines?: number;
  /** In double height (DEC-2222): each line a row more; single height on rows 22 to 24 and in Thai and Lao. */
  readonly doubleHeight?: boolean;
}

/** Text wrapped to the box's width, a line a row. */
export class Paragraph extends Component<ParagraphProps> {
  #lines(width: number): string[] {
    const most = this.props.lines;
    const room = width - leadCells(this.props.doubleHeight === true);
    return most === undefined ? wrap(this.props.text, room) : headline(this.props.text, room, most);
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.#lines(space.width).length * linePitch(this.language, this.props.doubleHeight === true), space.height) };
  }

  /** A line a row, or three in a language whose marks take the rows around it; right to left, each flush with the right edge. */
  override paint(canvas: Canvas): void {
    const double = this.props.doubleHeight === true;
    const pitch = linePitch(canvas.language, double);
    this.#lines(canvas.width).forEach((line, index) => {
      canvas.line(index * pitch + canvas.language.markRows, canvas.start(cells(line) + leadCells(double)), this.props.foreground ?? Colour.White, line, double);
    });
  }
}
