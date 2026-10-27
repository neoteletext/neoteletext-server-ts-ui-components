// A news service's text: headlines with their page numbers, bylines, page
// numbers that can be clicked, a placeholder while something comes, a ticker
// and a newsflash. What goes to a page is a control, from its number to the
// end of what it says, and only a click there goes.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import type { PointerEvent } from "../core/events.ts";
import { headline } from "../core/text.ts";
import { Colour } from "../kit.ts";

/** A page number as a page shows it: three digits, hexadecimal ones capital. */
export function pageNumber(page: number): string {
  return page.toString(16).toUpperCase().padStart(3, "0");
}

export interface HeadlineProps {
  readonly title: string;
  /** The page it is on, written before it in yellow. */
  readonly page?: number;
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
  #lines(width: number): string[] {
    const indent = this.props.page === undefined ? 0 : NUMBER_CELLS;
    return headline(this.props.title, width - indent - 1, this.props.lines ?? HEADLINE_LINES);
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.#lines(space.width).length, space.height) };
  }

  override paint(canvas: Canvas): void {
    const indent = this.props.page === undefined ? 0 : NUMBER_CELLS;
    if (this.props.page !== undefined) {
      canvas.coloured(0, 0, Colour.Yellow, pageNumber(this.props.page));
    }
    const lines = this.#lines(canvas.width);
    lines.forEach((line, row) => {
      canvas.coloured(row, indent, this.props.foreground ?? Colour.White, line);
    });
    if (this.props.page !== undefined && this.props.linked !== false) {
      // From its number, after its colour's cell, over its lines.
      canvas.control(0, 1, canvas.width - 1, lines.length, LINK);
    }
  }

  /** A click on a headline with a page goes there. */
  override onClick(event: PointerEvent): boolean {
    if (this.props.page === undefined || this.props.linked === false || event.region !== LINK) {
      return false;
    }
    this.services.goto(event.session, this.props.page);
    return true;
  }
}
