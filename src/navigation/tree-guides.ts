// TreeGuides: split from tree.ts; the comments pass writes this file's header.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { Colour } from "../kit.ts";

/** The mosaic lines that join an item to its parent, in blue after their colour's cell. */
export class TreeGuides extends Component<{ readonly codes: readonly number[] }> {
  override paint(canvas: Canvas): void {
    canvas.mosaics(0, 0, Colour.Blue, [...this.props.codes]);
  }
}
