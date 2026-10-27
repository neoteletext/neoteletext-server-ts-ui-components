// Breadcrumbs: the way down to where the viewer is, each step with a page
// or an action a control they can click back to: a page goes there, an
// action does what it says, such as a menu going back to that level. The
// English set has the right arrow (EN 300 706 Table 36), so the steps are
// joined by it, or by a slash.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import type { PointerEvent } from "../core/events.ts";
import { cells, fit } from "../core/text.ts";
import { Colour, englishCodes, textColour } from "../kit.ts";

/** One step: its label, and the page it is on or what a click on it does. */
export interface Crumb {
  readonly label: string;
  readonly page?: number;
  readonly onPress?: (session: number) => void;
}

export interface BreadcrumbsProps {
  readonly trail: readonly Crumb[];
  readonly separator?: "arrow" | "slash";
}

/** What joins the steps. */
const SEPARATORS = { arrow: "→", slash: "/" } as const;
/** The cells a separator takes: its colour and itself. */
const SEPARATOR_CELLS = 2;

export class Breadcrumbs extends Component<BreadcrumbsProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const join = englishCodes(SEPARATORS[this.props.separator ?? "arrow"]);
    const last = this.props.trail.length - 1;
    let column = 0;
    for (const [index, crumb] of this.props.trail.entries()) {
      // A step's colour takes its first cell; before it, the separator takes its colour's cell and its own.
      const start = index === 0 ? column : column + SEPARATOR_CELLS;
      const room = canvas.width - start - 1;
      if (room <= 0) {
        break;
      }
      if (index > 0) {
        canvas.codes(0, column, [textColour(Colour.Blue), ...join]);
      }
      const text = fit(crumb.label, room);
      canvas.coloured(0, start, index === last ? Colour.White : Colour.Cyan, text);
      if (crumb.page !== undefined || crumb.onPress !== undefined) {
        canvas.control(0, start + 1, cells(text), 1, String(index));
      }
      column = start + 1 + cells(text);
    }
  }

  override onClick(event: PointerEvent): boolean {
    const crumb = event.region === undefined ? undefined : this.props.trail[Number(event.region)];
    if (crumb?.onPress !== undefined) {
      crumb.onPress(event.session);
      return true;
    }
    if (crumb?.page === undefined) {
      return false;
    }
    this.services.goto(event.session, crumb.page);
    return true;
  }
}
