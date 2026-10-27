// Centred: a stack whose children are each in the middle of the width.

import { Component } from "../core/component.ts";
import { type Box, type LayoutChild, type Size } from "../core/layout.ts";

/** Children top to bottom, each as wide as it measures and in the middle of the width: a stack of buttons, a title. */
export class Centred extends Component {
  override measure(space: Size, children: readonly LayoutChild[]): Size {
    return {
      width: space.width,
      height: Math.min(
        space.height,
        children.reduce((rows, child) => rows + child.measure(space).height, 0),
      ),
    };
  }

  override arrange(box: Box, children: readonly LayoutChild[]): void {
    let row = box.row;
    for (const child of children) {
      const left = Math.max(0, box.row + box.height - row);
      const size = child.measure({ width: box.width, height: left });
      // A child that measures bigger than it was offered is cut to the box, so it cannot be placed left of it or past its end.
      const width = Math.min(box.width, Math.max(0, size.width));
      const height = Math.min(left, Math.max(0, size.height));
      child.place({ row, column: box.column + Math.floor((box.width - width) / 2), width, height });
      row += height;
    }
  }
}
