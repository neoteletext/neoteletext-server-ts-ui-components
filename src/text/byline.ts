// Byline: who wrote an article and when, and its labels.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { fit } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { DATE_FORMATS, formatDate } from "../time/date-text.ts";

export interface BylineProps {
  readonly writer: string;
  /** Milliseconds since the Unix epoch. */
  readonly date: number;
  readonly labels?: readonly string[];
}

/** Who wrote it and when, in cyan; its labels under it in green. */
export class Byline extends Component<BylineProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.props.labels === undefined ? 1 : 2, space.height) };
  }

  override paint(canvas: Canvas): void {
    canvas.coloured(0, 0, Colour.Cyan, fit(`by ${this.props.writer}, ${formatDate(this.props.date, DATE_FORMATS.stamp)}`, canvas.width - 1));
    if (this.props.labels !== undefined) {
      canvas.coloured(1, 0, Colour.Green, fit(this.props.labels.join(", "), canvas.width - 1));
    }
  }
}
