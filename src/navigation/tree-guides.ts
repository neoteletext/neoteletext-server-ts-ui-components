// The mosaic lines that join a tree's item to its parent (tree.ts), in
// blue after their colour's cell.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { Colour } from "../kit.ts";

export class TreeGuides extends Component<{ readonly codes: readonly number[] }> {
  override paint(canvas: Canvas): void {
    canvas.mosaics(0, 0, Colour.Blue, [...this.props.codes]);
  }
}
