// A rule between a menu's groups (menu.ts): a line of mosaic cells in blue.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { MIDDLE_ROW } from "../core/mosaics.ts";
import { Colour } from "../kit.ts";

export class MenuRule extends Component {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    canvas.mosaics(
      0,
      0,
      Colour.Blue,
      Array.from({ length: Math.max(0, canvas.width - 1) }, () => MIDDLE_ROW),
    );
  }
}
