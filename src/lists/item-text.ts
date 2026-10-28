// The text a list's row holds by default (list-rows.ts): wrapped over the
// row's rows at word boundaries, the last cut with an ellipsis. Its
// leading spaces are kept, on every line: they stand for a mark the row
// does not have, a tree's leaf's or a toggle list's unstarred item's, so
// its text lines up with its siblings' after theirs.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { cells, fit, headline } from "../core/text.ts";
import type { Colour } from "../kit.ts";

export interface ItemTextProps {
  /** The text, wrapped over its rows at word boundaries, the last cut with an ellipsis. */
  readonly text: string;
  /** Its colour: the row's look's. */
  readonly foreground: Colour;
  /** Rows to wrap it over: 1 when absent. */
  readonly rows?: number;
}

export class ItemText extends Component<ItemTextProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.props.rows ?? 1, space.height) };
  }

  override paint(canvas: Canvas): void {
    // Wrapping breaks at spaces and drops them, the leading ones too.
    const lead = /^ */u.exec(this.props.text)?.[0] ?? "";
    const width = canvas.width - 1;
    const lines = headline(this.props.text.slice(lead.length), width - cells(lead), Math.max(1, canvas.height));
    lines.forEach((line, row) => {
      canvas.coloured(row, 0, this.props.foreground, fit(`${lead}${line}`, width));
    });
  }
}
