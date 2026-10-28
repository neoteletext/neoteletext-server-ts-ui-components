// Bitmaps of sixels, written as rows of text, drawn in mosaic graphics.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { Colour, Sixels, SIXELS_ACROSS, SIXELS_DOWN } from "../kit.ts";

/** A bitmap as rows of text, "#" for a set sixel. */
export type Bitmap = readonly string[];

/** A bitmap's sixels, as wide as its longest row; a page's at most (Sixels). */
export function sixelsOf(bitmap: Bitmap): Sixels {
  // By a loop, not Math.max(...): a bitmap of more rows than a call takes arguments would throw a RangeError.
  const width = bitmap.reduce((widest, line) => Math.max(widest, line.length), 0);
  const sixels = new Sixels(width, bitmap.length);
  bitmap.forEach((line, y) => {
    Array.from(line).forEach((sixel, x) => {
      sixels.set(x, y, sixel === "#");
    });
  });
  return sixels;
}

export interface MosaicProps {
  /** Its sixels, a row of text each, "#" set; a page's at most. */
  readonly bitmap: Bitmap;
  /** Its colour; white when absent. */
  readonly foreground?: Colour;
}

/** A bitmap drawn in mosaic graphics; its colour takes the cell before it. */
export class Mosaic extends Component<MosaicProps> {
  override measure(space: Size): Size {
    const sixels = sixelsOf(this.props.bitmap);
    return {
      width: Math.min(space.width, Math.ceil(sixels.width / SIXELS_ACROSS) + 1),
      height: Math.min(space.height, Math.ceil(sixels.height / SIXELS_DOWN)),
    };
  }

  override paint(canvas: Canvas): void {
    canvas.sixels(0, 1, this.props.foreground ?? Colour.White, sixelsOf(this.props.bitmap));
  }
}
