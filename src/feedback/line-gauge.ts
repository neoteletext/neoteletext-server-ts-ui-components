// A line gauge: a thin line whose filled part is in one colour and the rest
// in another. The line changes colour in a cell of its own; with Hold
// Mosaics that cell shows the last mosaic again (EN 300 706 clause 12.2,
// Table 26), so the line has no gap.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { MIDDLE_ROW } from "../core/mosaics.ts";
import { fit, padStart } from "../core/text.ts";
import { Attribute, Colour, mosaicColour } from "../kit.ts";
import { cellCount } from "../charts/numbers.ts";
import { LABEL_CELLS, PERCENT_CELLS, share } from "./progress.ts";

export interface LineGaugeProps {
  readonly label?: string;
  readonly value: number;
  readonly max: number;
  readonly foreground?: Colour;
  /** The rest of the line's colour. */
  readonly rest?: Colour;
  readonly labelCells?: number;
}

/** The line's codes besides its cells: Hold Mosaics, the filled colour, the rest's colour and Release Mosaics. */
const LINE_CODES = 4;

export class LineGauge extends Component<LineGaugeProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const fraction = share(this.props.value, this.props.max);
    const labelCells = this.props.label === undefined ? 0 : cellCount(this.props.labelCells ?? LABEL_CELLS);
    if (this.props.label !== undefined) {
      canvas.coloured(0, 0, Colour.White, fit(this.props.label, labelCells - 1));
    }
    // Hold Mosaics, the filled colour, the filled line, the rest's colour (showing the held line), the rest.
    const cells = Math.max(2, canvas.width - labelCells - LINE_CODES - PERCENT_CELLS);
    const filled = Math.round(cells * fraction);
    const codes = [
      Attribute.HoldMosaics,
      mosaicColour(this.props.foreground ?? Colour.Cyan),
      ...Array.from({ length: filled }, () => MIDDLE_ROW),
      mosaicColour(this.props.rest ?? Colour.Blue),
      ...Array.from({ length: Math.max(0, cells - filled) }, () => MIDDLE_ROW),
      Attribute.ReleaseMosaics,
    ];
    canvas.codes(0, labelCells, codes);
    canvas.coloured(0, labelCells + codes.length, Colour.White, padStart(`${Math.round(fraction * 100)}%`, PERCENT_CELLS - 1));
  }
}
