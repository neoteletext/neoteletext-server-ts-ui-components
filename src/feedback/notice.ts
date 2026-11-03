// Notices: a line that says what happened, its kind's mark on a chip of
// its kind's colour (core/look.ts) so it shows without colour too. A notice
// stays; a toast is one that goes after a few seconds, sent on the bus
// (core/library-events.ts) to every shelf (toast-shelf.ts) its audience
// reaches, so a toast for one viewer shows only on their own copy of a page.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { type Kind, KINDS } from "../core/look.ts";
import { leadCells } from "../core/language.ts";
import { cells, fit, oneLineRows } from "../core/text.ts";

export interface NoticeProps {
  /** What happened: its mark and its colour (core/look.ts). */
  readonly kind: Kind;
  /** What it says, after the mark, cut to its row. */
  readonly text: string;
  /** Its words in double height (DEC-2222), the mark's chip single: a row more; single height on rows 22 to 24. */
  readonly doubleHeight?: boolean;
}

/** The mark's chip, always as wide whatever the mark, so notices line up. */
const MARK_CELLS = 2;

/** Paints a notice on `row`; answers the column after its text. */
export function paintNotice(canvas: Canvas, row: number, kind: Kind, text: string, doubleHeight = false): number {
  const look = KINDS[kind];
  const after = canvas.chip(row, 0, look.background, look.foreground, look.mark.padEnd(MARK_CELLS));
  const shown = fit(text, canvas.width - after - leadCells(doubleHeight));
  // The mark's chip stays single height: Double Height takes the cell after it, before the text's colour.
  const lead = canvas.line(row, after, look.background, shown, doubleHeight);
  return after + lead + cells(shown);
}

/** A notice that stays. */
export class Notice extends Component<NoticeProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(oneLineRows(this.props.doubleHeight === true), space.height) };
  }

  override paint(canvas: Canvas): void {
    paintNotice(canvas, 0, this.props.kind, this.props.text, this.props.doubleHeight === true);
  }
}
