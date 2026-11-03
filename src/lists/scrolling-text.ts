// Lines of text in a scrolling view (scroll-view.ts): each line a unit of
// one row, so the lines scroll with the keys, the wheel and the bar as any
// components in a ScrollView do.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import type { ControlProps } from "../input/control.ts";
import { type Line, LinesBlock } from "../text/lines.ts";
import { ScrollView } from "./scroll-view.ts";

export interface ScrollingTextProps extends ControlProps {
  /** The lines to read, a row each. */
  readonly lines: readonly Line[];
  /** The rows it shows at once. */
  readonly shown: number;
  /** What it says when there are no lines; "nothing to read" when absent. */
  readonly empty?: string;
}

/** Lines that scroll in a ScrollView beside its bar: a ScrollView of a LinesBlock for each line. */
export class ScrollingText extends Component<ScrollingTextProps> {
  override render(): Child {
    const { lines, empty, children: _children, ...view } = this.props;
    const units =
      lines.length === 0 ? [h(LinesBlock, { lines: [], empty: empty ?? "nothing to read" })] : lines.map((line) => h(LinesBlock, { lines: [line] }));
    return h(ScrollView, view, ...units);
  }
}
