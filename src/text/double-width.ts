// DoubleWidth: a line of text whose letters are two cells wide at Level 2.5, and spaced out at Level 1.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { DisplayAttribute } from "../core/enhancement.ts";
import { type Size } from "../core/layout.ts";
import { fit } from "../core/text.ts";
import { Colour, COLUMNS, englishCodes, textColour } from "../kit.ts";
import type { StyledProps } from "./styles.ts";

/** The cell before the letters: the colour's. */
const LEAD_CELLS = 1;
/** The cells a letter covers: its own and the space after it. */
const LETTER_CELLS = 2;
/** The cell after the last covered space, where double width is ended. */
const END_CELLS = 1;
/** EN 300 706 Table 26 NOTE 4: nothing double width in a row's last two columns. */
const EDGE_COLUMNS = 2;

/**
 * Double width without the spacing attribute: Double Width (0/E) has no
 * response at Levels 1 and 1.5, and some such decoders misread it (EN 300
 * 706 Table 26 NOTE 4). So the level 1 row holds only the colour and the
 * letters, each followed by a space, and reads spaced out there, as
 * "G O A L"; the double width is in the sub-page's local enhancement data
 * (clause 12.3, packets X/26): a Display attributes triplet (Table 29)
 * with Double Width at the first letter, non-spacing, so each letter
 * covers the space after it, and one with no attribute at the cell after
 * the last covered space, which ends it there rather than at the row's
 * end. The text is fitted so nothing double width is in the row's last
 * two columns (NOTE 4) and the ending cell is in the box.
 */
export class DoubleWidth extends Component<StyledProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const cells = Math.min(canvas.width - END_CELLS, COLUMNS - EDGE_COLUMNS - canvas.box.column) - LEAD_CELLS;
    const letters = Array.from(fit(this.props.text, Math.floor(cells / LETTER_CELLS)));
    if (letters.length === 0) {
      return;
    }
    canvas.codes(0, 0, [textColour(this.props.foreground ?? Colour.Yellow), ...englishCodes(letters.map((letter) => `${letter} `).join(""))]);
    canvas.displayAttributes(0, LEAD_CELLS, DisplayAttribute.DoubleWidth);
    canvas.displayAttributes(0, LEAD_CELLS + LETTER_CELLS * letters.length, DisplayAttribute.None);
  }
}
