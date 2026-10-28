// The labels jump labels (jump-labels.ts) draw over the controls: each a
// digit in its control's first cell that is not an attribute, usually the
// space its label or its band starts with. A digit takes one cell and
// keeps the control's colours, so the control stays as it was drawn round
// it; a chip of a colour of its own would need four cells of attributes,
// which would overwrite the control's own and leave its text unseen. It
// takes no clicks: what is under it does.

import { Component } from "../core/component.ts";
import type { Canvas } from "../core/canvas.ts";
import type { Box } from "../core/layout.ts";

/** The digit the first control is labelled with. */
export const FIRST_LABEL = 1;
/** The last code that is an attribute, not a character (EN 300 706 Table 26). */
const LAST_ATTRIBUTE = 0x1f;
/** A digit's code: its character's, as the English set has it. */
const DIGIT_ZERO = 0x30;

export class LabelLayer extends Component<{ readonly targets: readonly Box[] }> {
  override paint(canvas: Canvas): void {
    const origin = this.box;
    this.props.targets.forEach((target, index) => {
      const row = target.row - origin.row;
      const first = target.column - origin.column;
      for (let column = first; column < first + target.width; column += 1) {
        if (canvas.at(row, column) > LAST_ATTRIBUTE) {
          canvas.code(row, column, DIGIT_ZERO + FIRST_LABEL + index);
          return;
        }
      }
    });
  }

  override pointerCells(): Box | null {
    return null;
  }
}
