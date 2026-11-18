// The canvas of a component on a page drawn in ReGIS (renderer parity
// PAR-42): the library's Canvas, which a component paints on exactly as on
// a teletext page, with every method Canvas has and on the same cell grid,
// so its layout, props, state, events and focus are the same in all three
// renderers. What it paints is kept cell by cell (recording-screen.ts) and
// drawn as ReGIS (regis-picture.ts): filled rectangles for backgrounds and
// mosaics, and text parts the server writes in the provided sets.

import { Canvas } from "../core/canvas.ts";

export class RegisCanvas extends Canvas {
  /** What the page is drawn in, for a component that draws otherwise for a picture. */
  readonly renderer = "regis";
}
