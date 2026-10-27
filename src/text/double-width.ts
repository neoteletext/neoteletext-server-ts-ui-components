// DoubleWidth: a line of text whose letters are two cells wide (Level 2.5).

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { fit } from "../core/text.ts";
import { Colour } from "../kit.ts";
import type { StyledProps } from "./styles.ts";

/** Double Width, one of EN 300 706 Table 26's Level 2.5 sizes, which the kit does not name. */
const DOUBLE_WIDTH = 0x0e;

/** Double width (Level 2.5): each letter covers the cell after it, so the letters go in every other cell. */
export class DoubleWidth extends Component<StyledProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const letters = Array.from(fit(this.props.text, Math.floor((canvas.width - 2) / 2))).join(" ");
    canvas.attributed(0, 0, DOUBLE_WIDTH, this.props.foreground ?? Colour.Yellow, letters);
  }
}
