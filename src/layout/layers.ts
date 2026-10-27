// Layers: split from layouts.ts; the comments pass writes this file's header.

import { type Box, Component, type LayoutChild, type Size } from "../core/component.ts";

/** Layered children: each in the whole box, later ones drawn over earlier ones; as tall as the tallest. */
export class Layers extends Component {
  override measure(space: Size, children: readonly LayoutChild[]): Size {
    return { width: space.width, height: Math.min(space.height, Math.max(0, ...children.map((child) => child.measure(space).height))) };
  }

  override arrange(box: Box, children: readonly LayoutChild[]): void {
    for (const child of children) {
      child.place(box);
    }
  }
}
