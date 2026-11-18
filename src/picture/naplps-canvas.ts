// The canvas of a component on a page drawn in NAPLPS (renderer parity
// PAR-42): the library's Canvas, as regis-canvas.ts says, its cells drawn
// as NAPLPS (naplps-picture.ts) on the teletext raster's own grid.

import { Canvas } from "../core/canvas.ts";

export class NaplpsCanvas extends Canvas {
  /** What the page is drawn in, for a component that draws otherwise for a picture. */
  readonly renderer = "naplps";
}
