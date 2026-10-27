// Gap: empty rows between components.

import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";

export interface GapProps {
  /** One when absent. */
  readonly rows?: number;
}

/** Empty rows; with `grow`, what is left over. */
export class Gap extends Component<GapProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.props.rows ?? 1, space.height) };
  }
}
