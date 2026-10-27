// The labels jump labels (jump-labels.ts) draw over the controls: each a
// digit on a chip at its control's first cell, over whatever is there
// while the labels are up. It takes no clicks: what is under it does.

import { Component } from "../core/component.ts";
import type { Canvas } from "../core/canvas.ts";
import type { Box } from "../core/layout.ts";
import { Colour } from "../kit.ts";

/** The digit the first control is labelled with. */
export const FIRST_LABEL = 1;

export class LabelLayer extends Component<{ readonly targets: readonly Box[] }> {
  override paint(canvas: Canvas): void {
    const origin = this.box;
    this.props.targets.forEach((target, index) => {
      canvas.chip(target.row - origin.row, target.column - origin.column, Colour.Yellow, Colour.Black, String(FIRST_LABEL + index));
    });
  }

  override pointerCells(): Box | null {
    return null;
  }
}
