// Placeholder: split from news.ts; the comments pass writes this file's header.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { cells, fit } from "../core/text.ts";
import { Colour } from "../kit.ts";

export interface PlaceholderProps {
  readonly text: string;
}

/** What shows while something is still coming: a line centred in the box. */
export class Placeholder extends Component<PlaceholderProps> {
  override measure(space: Size): Size {
    return space;
  }

  override paint(canvas: Canvas): void {
    const shown = fit(this.props.text, canvas.width - 1);
    canvas.coloured(Math.floor(canvas.height / 2), Math.max(0, Math.floor((canvas.width - cells(shown) - 1) / 2)), Colour.White, shown);
  }
}
