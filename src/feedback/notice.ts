// Notices: a line that says what happened, its kind's mark on a chip of
// its kind's colour (core/look.ts) so it shows without colour too. A notice
// stays; a toast is one that goes after a few seconds, sent on the bus
// (core/library-events.ts) to every shelf (toast-shelf.ts) its audience
// reaches, so a toast for one viewer shows only on their own copy of a page.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { type Kind, KINDS } from "../core/look.ts";
import { cells, fit } from "../core/text.ts";

export interface NoticeProps {
  readonly kind: Kind;
  readonly text: string;
}

/** The mark's chip, always as wide whatever the mark, so notices line up. */
const MARK_CELLS = 2;

/** Paints a notice on `row`; answers the column after its text. */
export function paintNotice(canvas: Canvas, row: number, kind: Kind, text: string): number {
  const look = KINDS[kind];
  const after = canvas.chip(row, 0, look.background, look.foreground, look.mark.padEnd(MARK_CELLS));
  const shown = fit(text, canvas.width - after - 1);
  canvas.coloured(row, after, look.background, shown);
  return after + 1 + cells(shown);
}

/** A notice that stays. */
export class Notice extends Component<NoticeProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    paintNotice(canvas, 0, this.props.kind, this.props.text);
  }
}
