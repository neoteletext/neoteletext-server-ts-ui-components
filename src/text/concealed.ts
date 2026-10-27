// Concealed: text hidden until the viewer presses Reveal.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { fit } from "../core/text.ts";
import { Attribute, Colour } from "../kit.ts";
import type { StyledProps } from "./styles.ts";

/** Concealed text: shown when the viewer presses Reveal (Table 26). */
export class Concealed extends Component<StyledProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    canvas.codes(0, 0, [this.props.foreground ?? Colour.Magenta, Attribute.Conceal]);
    canvas.text(0, 2, fit(this.props.text, canvas.width - 2));
  }
}
