// Paragraph: text wrapped to its box, a line a row.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { leadCells, type TextLanguage } from "../core/language.ts";
import { layLines, type LineLayout, placed } from "../core/marks.ts";
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
  /** Each line has its mark rows where its language needs them (marks.ts). */
  override laysOutMarks(): boolean {
    return true;
  }

  #lines(width: number): string[] {
    const most = this.props.lines;
    const room = width - leadCells(this.props.doubleHeight === true);
    return most === undefined ? wrap(this.props.text, room) : headline(this.props.text, room, most);
  }

  /** Where its lines go in `language`: a row each, two in double height, or with their mark rows (marks.ts). */
  #layout(lines: readonly string[], language: TextLanguage): LineLayout {
    const lead = leadCells(this.props.doubleHeight === true);
    return layLines(
      language,
      lines.map((line) => placed(language, lead, line)),
      this.props.doubleHeight === true,
    );
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.#layout(this.#lines(space.width), this.language).height, space.height) };
  }

  /** A line a row, or two apart with their mark rows in a language whose marks take the rows around it; right to left, each flush with the right edge. */
  override paint(canvas: Canvas): void {
    const double = this.props.doubleHeight === true;
    const lines = this.#lines(canvas.width);
    const { rows } = this.#layout(lines, canvas.language);
    lines.forEach((line, index) => {
      canvas.line(rows[index] ?? 0, canvas.start(cells(line) + leadCells(double)), this.props.foreground ?? Colour.White, line, double);
    });
  }
}
