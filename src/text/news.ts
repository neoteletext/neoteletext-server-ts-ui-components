// Headlines: a post's title after the page it is on, and how page numbers
// are written. What goes to a page is a control, from its number to the end
// of what it says, and only a click there goes.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import type { PointerEvent } from "../core/events.ts";
import type { TextLanguage } from "../core/language.ts";
import { layLines, type LineLayout, placed } from "../core/marks.ts";
import { headline } from "../core/text.ts";
import { Colour } from "../kit.ts";

/** A page number as a page shows it: three digits, hexadecimal ones capital. */
export function pageNumber(page: number): string {
  return page.toString(16).toUpperCase().padStart(3, "0");
}

export interface HeadlineProps {
  /** The post's title, over its lines, the last cut with an ellipsis. */
  readonly title: string;
  /** The page it is on, written before it in yellow. */
  readonly page?: number;
  /** The title's colour; white when absent. */
  readonly foreground?: Colour;
  /** The most lines it takes; one or two, as everywhere on the channel. */
  readonly lines?: number;
  /** A click on it goes to its page: true when absent. False for a headline that is passing, such as a spinning roulette's. */
  readonly linked?: boolean;
}

/** The width a headline's page number takes: three digits and a space, after its colour. */
export const NUMBER_CELLS = 4;

/** A headline's lines, everywhere: two, the second cut with an ellipsis. */
export const HEADLINE_LINES = 2;

/** The region of what goes to a page. */
export const LINK = "link";

/** A post's title on one or two lines, after its page number when it has one. */
export class Headline extends Component<HeadlineProps> {
  /** Each line has its mark rows where its language needs them (marks.ts). */
  override laysOutMarks(): boolean {
    return true;
  }

  #lines(width: number): string[] {
    const indent = this.props.page === undefined ? 0 : NUMBER_CELLS;
    return headline(this.props.title, width - indent - 1, this.props.lines ?? HEADLINE_LINES);
  }

  /** Where its lines go in `language`: a row each, or with their mark rows (marks.ts). */
  #layout(lines: readonly string[], language: TextLanguage): LineLayout {
    const indent = this.props.page === undefined ? 0 : NUMBER_CELLS;
    return layLines(
      language,
      lines.map((line) => placed(language, indent + 1, line)),
    );
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.#layout(this.#lines(space.width), this.language).height, space.height) };
  }

  override paint(canvas: Canvas): void {
    const indent = this.props.page === undefined ? 0 : NUMBER_CELLS;
    const lines = this.#lines(canvas.width);
    const { rows } = this.#layout(lines, canvas.language);
    const first = rows[0] ?? 0;
    if (this.props.page !== undefined) {
      canvas.coloured(first, 0, Colour.Yellow, pageNumber(this.props.page));
    }
    lines.forEach((line, index) => {
      canvas.coloured(rows[index] ?? 0, indent, this.props.foreground ?? Colour.White, line);
    });
    if (this.props.page !== undefined && this.props.linked !== false) {
      // From its number, after its colour's cell, over its lines: from the first line's row to the last's.
      canvas.control(first, 1, canvas.width - 1, (rows.at(-1) ?? first) - first + 1, LINK);
    }
  }

  /** A click on a headline with a page goes there. */
  override onClick(event: PointerEvent): boolean {
    if (this.props.page === undefined || this.props.linked === false || event.region !== LINK) {
      return false;
    }
    this.services.redirect(event.session, this.props.page);
    return true;
  }
}
