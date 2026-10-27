// A scrim: what a modal (modal.ts) lays between a page and its dialog, so
// the page shows dimmed behind it. Teletext has no dim attribute, so it
// draws the page again in one colour: every colour the page set becomes
// the disabled look's (core/look.ts), text and mosaics alike, and every
// background it started ends, so no band stays bright. What the page
// says, and where, is kept; only its colours go. It takes no clicks: the
// shield (shield.ts) does.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import type { Box, Size } from "../core/layout.ts";
import { DISABLED } from "../core/look.ts";
import { Attribute, Colour, mosaicColour, textColour } from "../kit.ts";

/** The colours a page may set, black aside, which level 1 text cannot (EN 300 706 Table 26). */
const COLOURS = [Colour.Red, Colour.Green, Colour.Yellow, Colour.Blue, Colour.Magenta, Colour.Cyan, Colour.White];
const TEXT_COLOURS = new Set(COLOURS.map((colour) => textColour(colour)));
const MOSAIC_COLOURS = new Set(COLOURS.map((colour) => mosaicColour(colour)));

/** What `code` becomes under a scrim. */
function dimmed(code: number): number {
  if (TEXT_COLOURS.has(code)) {
    return textColour(DISABLED);
  }
  if (MOSAIC_COLOURS.has(code)) {
    return mosaicColour(DISABLED);
  }
  return code === Attribute.NewBackground ? Attribute.BlackBackground : code;
}

export class Scrim extends Component {
  /** No rows of its own: the layers give it the modal's whole box, whatever it measures. */
  override measure(space: Size): Size {
    return { width: space.width, height: 0 };
  }

  override paint(canvas: Canvas): void {
    for (let row = 0; row < canvas.height; row += 1) {
      for (let column = 0; column < canvas.width; column += 1) {
        const code = canvas.at(row, column);
        const shown = dimmed(code);
        if (shown !== code) {
          canvas.code(row, column, shown);
        }
      }
    }
  }

  override pointerCells(): Box | null {
    return null;
  }
}
