// PageLink: a page number and what is there, which a click follows.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import type { PointerEvent } from "../core/events.ts";
import { cells, fit } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { LINK, NUMBER_CELLS, pageNumber } from "./news.ts";

export interface PageLinkProps {
  readonly page: number;
  readonly label: string;
  readonly foreground?: Colour;
}

/** "120 Lists": a page number and what is there; clicking it goes there. */
export class PageLink extends Component<PageLinkProps> {
  override measure(space: Size): Size {
    return { width: Math.min(space.width, cells(this.props.label) + NUMBER_CELLS + 2), height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    canvas.coloured(0, 0, Colour.Yellow, pageNumber(this.props.page));
    const label = fit(this.props.label, canvas.width - NUMBER_CELLS - 1);
    canvas.coloured(0, NUMBER_CELLS, this.props.foreground ?? Colour.White, label);
    // From its number to the end of its label, after their colours' cells.
    canvas.control(0, 1, NUMBER_CELLS + cells(label), 1, LINK);
  }

  override onClick(event: PointerEvent): boolean {
    if (event.region !== LINK) {
      return false;
    }
    this.services.goto(event.session, this.props.page);
    return true;
  }
}
