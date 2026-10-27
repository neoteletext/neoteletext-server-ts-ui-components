// Text: one line of text in a colour, and the props of the styled lines
// (double height and width, flashing, concealed) that have a file each.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { cells, fit } from "../core/text.ts";
import { Colour } from "../kit.ts";

export interface TextProps {
  readonly text: string;
  readonly foreground?: Colour;
  /** Centred in its box. */
  readonly centre?: boolean;
}

/** One line of text in a colour: the colour takes the first cell, the text is cut with a mark at the box's edge. */
export class Text extends Component<TextProps> {
  override measure(space: Size): Size {
    return { width: Math.min(space.width, cells(this.props.text) + 1), height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const shown = fit(this.props.text, canvas.width - 1);
    const column = this.props.centre === true ? Math.max(0, Math.floor((canvas.width - cells(shown) - 1) / 2)) : 0;
    canvas.coloured(0, column, this.props.foreground ?? Colour.White, shown);
  }
}

export interface StyledProps {
  readonly text: string;
  readonly foreground?: Colour;
}
