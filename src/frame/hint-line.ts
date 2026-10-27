// HintLine: row 23 of the frame, what the keys or the control under the
// pointer do.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { fit } from "../core/text.ts";
import { Colour } from "../kit.ts";

export interface LineProps {
  /** What the keys do here; when absent, what the component with the keys says (core/component.ts, hint). While the pointer is on a control that says what it does, that is said instead. */
  readonly text?: string;
  readonly foreground?: Colour;
}

/** Row 23: what the control under the pointer does, or else what the keys do here. */
export class HintLine extends Component<LineProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const text = this.hoveredHint ?? this.props.text ?? this.focusedHint;
    if (text !== null) {
      canvas.coloured(0, 0, this.props.foreground ?? Colour.Green, fit(text, canvas.width - 1));
    }
  }
}
