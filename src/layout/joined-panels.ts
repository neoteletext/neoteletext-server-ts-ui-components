// Joined panels: panes side by side in one line frame (panel.ts), each
// border between two drawn once and shared, as a terminal's box drawing
// joins adjacent boxes. The frame's top runs along the bottom of its first
// row and a divider down the left half of its cell, so where they meet the
// sixels already join: no junction character is needed. A divider spends
// two cells on each row, its mosaic colour and its line; each pane's title
// sits in the top line over it. Pane widths are as Columns' (columns.ts):
// given, or a share of what is left.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Box, type LayoutChild, type Size, stackSize } from "../core/layout.ts";
import { cells, fit } from "../core/text.ts";
import { Colour, mosaicColour } from "../kit.ts";
import { LINE, LINE_SIDE } from "./panel.ts";

export interface JoinedPanelsProps {
  /** Each pane's title, in the top line over it. */
  readonly titles?: readonly (string | null)[];
  /** Each pane's width in cells, its divider not counted; one without a width shares what is left. */
  readonly widths?: readonly (number | null)[];
  /** The line's colour. */
  readonly foreground?: Colour;
  /** The titles' colour; yellow when absent. */
  readonly titleForeground?: Colour;
}

/** The rows the frame takes: its top line and its bottom. */
const FRAME_ROWS = 2;
/** A divider's cells: its mosaic colour and its line. */
const DIVIDER = 2;
/** A title's gap in the top line before it: the pane's first cell of line. */
const TITLE_GAP = 1;
/** The cells of a pane's stretch of top line a title cannot take: its colour's cell, and the mosaic colour after it, and a cell of line either side. */
const TITLE_ROOM = 4;

/** Where each pane is across the frame: its first cell and its width. */
interface Span {
  readonly column: number;
  readonly width: number;
}

export class JoinedPanels extends Component<JoinedPanelsProps> {
  /** The panes laid out last, for painting their dividers. */
  #panes = 0;

  /** The panes' spans in a frame `width` wide, from its left edge. */
  #spans(width: number, count: number): Span[] {
    const room = Math.max(0, width - 2 * LINE_SIDE - DIVIDER * Math.max(0, count - 1));
    const given = Array.from({ length: count }, (_, index) => this.props.widths?.[index] ?? null);
    const fixed = given.reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const free = given.filter((value) => value === null).length;
    const share = free > 0 ? Math.floor(Math.max(0, room - fixed) / free) : 0;
    let column = LINE_SIDE;
    return given.map((value) => {
      const span = { column, width: Math.min(value ?? share, Math.max(0, width - LINE_SIDE - column)) };
      column += span.width + DIVIDER;
      return span;
    });
  }

  override measure(space: Size, children: readonly LayoutChild[]): Size {
    const spans = this.#spans(space.width, children.length);
    const inner = Math.max(0, space.height - FRAME_ROWS);
    const tallest = children.reduce((most, child, index) => Math.max(most, stackSize({ width: spans[index]?.width ?? 0, height: inner }, [child]).height), 0);
    return { width: space.width, height: Math.min(space.height, tallest + FRAME_ROWS) };
  }

  override arrange(box: Box, children: readonly LayoutChild[]): void {
    this.#panes = children.length;
    const spans = this.#spans(box.width, children.length);
    children.forEach((child, index) => {
      const span = spans[index] ?? { column: 0, width: 0 };
      child.place({ row: box.row + 1, column: box.column + span.column, width: span.width, height: Math.max(0, box.height - FRAME_ROWS) });
    });
  }

  override paint(canvas: Canvas): void {
    const foreground = this.props.foreground ?? Colour.Blue;
    const { width, height } = canvas;
    const spans = this.#spans(width, this.#panes);
    const run = (code: number): number[] => Array.from({ length: Math.max(0, width - LINE_SIDE - 1) }, () => code);
    canvas.mosaics(0, 0, foreground, [LINE.topLeft, ...run(LINE.top), LINE.topRight]);
    for (let row = 1; row < height - 1; row += 1) {
      canvas.mosaics(row, 0, foreground, [LINE.left]);
      for (const span of spans.slice(1)) {
        canvas.mosaics(row, span.column - DIVIDER, foreground, [LINE.right]);
      }
      canvas.mosaics(row, width - LINE_SIDE, foreground, [LINE.right]);
    }
    if (height >= FRAME_ROWS) {
      canvas.mosaics(height - 1, 0, foreground, [LINE.bottomLeft, ...run(LINE.bottom), LINE.bottomRight]);
    }
    spans.forEach((span, index) => {
      const title = this.props.titles?.[index];
      if (title === undefined || title === null) {
        return;
      }
      const shown = fit(title, Math.max(0, span.width - TITLE_ROOM));
      const at = span.column + TITLE_GAP;
      canvas.coloured(0, at, this.props.titleForeground ?? Colour.Yellow, shown);
      canvas.code(0, at + 1 + cells(shown), mosaicColour(foreground));
    });
  }
}
