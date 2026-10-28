// HintLine: row 23 of the frame, what the keys or the control under the
// pointer do. A line of keys shows as many of its entries as fit whole, so
// no key is shown with its action cut short; a control's words of its own,
// and an entry too long for the row, are cut.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { wholeParts } from "../core/key-bindings.ts";
import { fit } from "../core/text.ts";
import { Colour } from "../kit.ts";

export interface LineProps {
  /** What the keys do here; when absent, what the component with the keys says (core/component.ts, hint). While the pointer is on a control that says what it does, that is said instead. */
  readonly text?: string;
  /** The hint's colour; green when absent. */
  readonly foreground?: Colour;
}

/** Row 23: what the control under the pointer does, or else what the keys do here. */
export class HintLine extends Component<LineProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const hovered = this.hoveredHint;
    const text = hovered ?? this.props.text ?? this.focusedHint;
    if (text !== null) {
      const cells = canvas.width - 1;
      // The frame's own hint says what the keys do here.
      const keys = hovered === null && this.props.text !== undefined ? true : this.hintIsKeys;
      canvas.coloured(0, 0, this.props.foreground ?? Colour.Green, (keys ? wholeParts(text, cells) : null) ?? fit(text, cells));
    }
  }
}
