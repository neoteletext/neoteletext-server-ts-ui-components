// The text a list's row holds by default (list-rows.ts): wrapped over the
// row's rows at word boundaries, the last cut with an ellipsis.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { fit, headline } from "../core/text.ts";
import type { Colour } from "../kit.ts";

export interface ItemTextProps {
  readonly text: string;
  readonly foreground: Colour;
  /** Rows to wrap it over: 1 when absent. */
  readonly rows?: number;
}

export class ItemText extends Component<ItemTextProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.props.rows ?? 1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const lines = headline(this.props.text, canvas.width - 1, Math.max(1, canvas.height));
    lines.forEach((line, row) => {
      canvas.coloured(row, 0, this.props.foreground, fit(line, canvas.width - 1));
    });
  }
}
