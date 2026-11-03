// Placeholder: a line in the middle of its box while something is still
// coming, or in place of what is missing.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { leadCells, linePitch } from "../core/language.ts";
import { cells, fit } from "../core/text.ts";
import { Colour } from "../kit.ts";

export interface PlaceholderProps {
  /** What it says, in white, centred in the box and cut to its width. */
  readonly text: string;
  /** In double height (DEC-2222): a row more; single height on rows 22 to 24 and in Thai and Lao. */
  readonly doubleHeight?: boolean;
}

/** What shows while something is still coming: a line centred in the box. */
export class Placeholder extends Component<PlaceholderProps> {
  override measure(space: Size): Size {
    return space;
  }

  override paint(canvas: Canvas): void {
    const double = this.props.doubleHeight === true;
    const shown = fit(this.props.text, canvas.width - leadCells(double));
    const rows = linePitch(canvas.language, double);
    const row = Math.max(0, Math.floor((canvas.height - rows + 1) / 2)) + canvas.language.markRows;
    canvas.line(row, Math.max(0, Math.floor((canvas.width - cells(shown) - leadCells(double)) / 2)), Colour.White, shown, double);
  }
}
