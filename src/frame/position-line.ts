// PositionLine: where a long list or text is, as "Lines 1-18 of 66".

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { Colour } from "../kit.ts";

export interface PositionProps {
  /** The first shown, from 0; it is written from 1. */
  readonly first: number;
  readonly shown: number;
  readonly total: number;
  /** What is counted: "Lines" when absent. */
  readonly noun?: string;
}

/** "Lines 1-18 of 66": where a long list or text is. Nothing when everything shows. */
export class PositionLine extends Component<PositionProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const { first, shown, total } = this.props;
    if (total > shown) {
      const last = Math.min(total, first + shown);
      canvas.coloured(0, 0, Colour.Cyan, `${this.props.noun ?? "Lines"} ${first + 1}-${last} of ${total}`);
    }
  }
}
