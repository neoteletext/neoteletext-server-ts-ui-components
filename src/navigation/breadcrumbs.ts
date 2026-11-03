// Breadcrumbs: the way down to where the viewer is, each step with a page
// or an action a control they can click back to: a page goes there, an
// action does what it says, such as a menu going back to that level. The
// English set has the right arrow (EN 300 706 Table 36), so the steps are
// joined by it, or by a slash.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import type { PointerEvent } from "../core/events.ts";
import { cells, fit } from "../core/text.ts";
import { Colour } from "../kit.ts";

/** One step: its label, and the page it is on or what a click on it does. */
export interface Crumb {
  /** What the step is, cut to the room left on the row. */
  readonly label: string;
  /** The page a click on it goes to, when it has no onPress. */
  readonly page?: number;
  /** What a click on it does, in place of going to its page. */
  readonly onPress?: (session: number) => void;
}

export interface BreadcrumbsProps {
  /** The steps, from the top down to where the viewer is: the last in white, the rest in cyan. */
  readonly trail: readonly Crumb[];
  /** What joins the steps: a right arrow or a slash; the arrow when absent. */
  readonly separator?: "arrow" | "slash";
}

/** What joins the steps, left to right and right to left. */
const SEPARATORS = { arrow: "→", slash: "/" } as const;
const SEPARATORS_RIGHT_TO_LEFT = { arrow: "←", slash: "/" } as const;
/** The cells a separator takes: its colour and itself. */
const SEPARATOR_CELLS = 2;

export class Breadcrumbs extends Component<BreadcrumbsProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  /**
   * The steps from the start of the row: from the left, or for a language
   * written right to left from the right, its arrow pointing left. Each
   * block, a step or a separator, keeps its colour's cell before its text.
   */
  override paint(canvas: Canvas): void {
    const separator = this.props.separator ?? "arrow";
    const join = (canvas.rightToLeft ? SEPARATORS_RIGHT_TO_LEFT : SEPARATORS)[separator];
    const placed = (from: number, width: number): number => (canvas.rightToLeft ? canvas.width - from - width : from);
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
        canvas.mark(0, placed(column, SEPARATOR_CELLS), join, Colour.Blue);
      }
      const text = fit(crumb.label, room);
      const at = placed(start, 1 + cells(text));
      canvas.coloured(0, at, index === last ? Colour.White : Colour.Cyan, text);
      if (crumb.page !== undefined || crumb.onPress !== undefined) {
        canvas.control(0, at + 1, cells(text), 1, String(index));
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
    this.services.redirect(event.session, crumb.page);
    return true;
  }
}
