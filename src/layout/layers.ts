// Layers: children drawn over one another in the same box.

import { type Box, Component, type LayoutChild, type Size } from "../core/component.ts";

/** Layered children: each in the whole box, later ones drawn over earlier ones; as tall as the tallest. */
export class Layers extends Component {
  override measure(space: Size, children: readonly LayoutChild[]): Size {
    // A reduce, not Math.max over a spread: a spread of more than about a hundred thousand children overflows the stack.
    const tallest = children.reduce((most, child) => Math.max(most, child.measure(space).height), 0);
    return { width: space.width, height: Math.min(space.height, tallest) };
  }

  override arrange(box: Box, children: readonly LayoutChild[]): void {
    for (const child of children) {
      child.place(box);
    }
  }
}
