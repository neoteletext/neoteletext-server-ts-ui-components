// Centred: split from layouts.ts; the comments pass writes this file's header.

import { type Box, Component, type LayoutChild, type Size } from "../core/component.ts";

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
      const size = child.measure({ width: box.width, height: Math.max(0, box.row + box.height - row) });
      child.place({ row, column: box.column + Math.floor((box.width - size.width) / 2), width: size.width, height: size.height });
      row += size.height;
    }
  }
}
