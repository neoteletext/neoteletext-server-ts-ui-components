// MenuRule: split from menu.ts; the comments pass writes this file's header.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { MIDDLE_ROW } from "../core/mosaics.ts";
import { Colour } from "../kit.ts";

/** A rule between a menu's groups: a line of mosaic cells in blue. */
export class MenuRule extends Component {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    canvas.mosaics(0, 0, Colour.Blue, new Array<number>(Math.max(0, canvas.width - 1)).fill(MIDDLE_ROW));
  }
}
