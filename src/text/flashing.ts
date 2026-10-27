// Flashing: a line of text that flashes.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { cells, fit } from "../core/text.ts";
import { Attribute, Colour } from "../kit.ts";
import type { StyledProps } from "./styles.ts";

/** Flashing text (Table 26), steady again after it. */
export class Flashing extends Component<StyledProps> {
  /** Its colour, Flash and Steady each take a cell beside the text. */
  override measure(space: Size): Size {
    return { width: Math.min(space.width, cells(this.props.text) + 3), height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const shown = fit(this.props.text, canvas.width - 3);
    canvas.codes(0, 0, [this.props.foreground ?? Colour.Red, Attribute.Flash]);
    canvas.text(0, 2, shown);
    canvas.code(0, 2 + cells(shown), Attribute.Steady);
  }
}
