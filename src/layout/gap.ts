// Gap: split from layouts.ts; the comments pass writes this file's header.

import { Component, type Size } from "../core/component.ts";

export interface GapProps {
  readonly rows?: number;
}

/** Empty rows; with `grow`, what is left over. */
export class Gap extends Component<GapProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.props.rows ?? 1, space.height) };
  }
}
