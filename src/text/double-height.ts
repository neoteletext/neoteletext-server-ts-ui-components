// DoubleHeight: split from styles.ts; the comments pass writes this file's header.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { fit } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { type StyledProps } from "./styles.ts";

/** Double height: the text covers its row and the row below, across the whole page (clause 12.3). */
export class DoubleHeight extends Component<StyledProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(2, space.height) };
  }

  override paint(canvas: Canvas): void {
    canvas.doubleHeight(0, 0, this.props.foreground ?? Colour.Yellow, fit(this.props.text, canvas.width - 2));
  }
}
