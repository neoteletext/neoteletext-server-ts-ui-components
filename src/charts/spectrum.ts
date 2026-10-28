// A spectrum, as an audio player shows one: a column for each band of
// frequency, lowest on the left, as tall as its level, nought to one, to
// the sixel (three to a row). A band's column is a sixel narrower than its
// cells, so the columns stand apart. Each row of mosaics is one colour
// after its colour's cell (EN 300 706 clause 12.2), so the rows are
// coloured as a meter is, by how loud they stand for: green, yellow near
// the top, red at it; or all one colour, when one is given. The levels are
// the program's, as bandLevels (band-levels.ts) makes them.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { paintEmpty } from "../core/look.ts";
import { Colour, mosaicColour, Sixels, SIXELS_ACROSS, SIXELS_DOWN } from "../kit.ts";
import { cellCount } from "./numbers.ts";

export interface SpectrumProps {
  /** Each band's level, nought to one, lowest band first. */
  readonly levels: readonly number[];
  /** The rows the columns rise through. */
  readonly plotRows?: number;
  /** The cells each band's column takes. */
  readonly bandCells?: number;
  /** One colour for every row, in place of a meter's. */
  readonly foreground?: Colour;
  /** What it says when there are no levels; "no sound" when absent. */
  readonly empty?: string;
}

/** The rows, when not given: twelve levels. */
const PLOT_ROWS = 4;
/** A band's cells, when not given: forty bands could stand across a page. */
const BAND_CELLS = 1;
/** The sixels between one band's column and the next. */
const GAP_SIXELS = 1;
/** The rows' colour cell before them. */
const COLOUR_CELLS = 1;
/** The meter's colours, by the level a row's foot stands for: red from three quarters up, yellow from half way, green below. */
const METER = [
  { from: 0.75, colour: Colour.Red },
  { from: 0.5, colour: Colour.Yellow },
  { from: 0, colour: Colour.Green },
] as const;

/** A level as it is drawn: nought to one, and nought for one that is not a number. */
function levelOf(level: number): number {
  return Number.isNaN(level) ? 0 : Math.max(0, Math.min(1, level));
}

/** The meter's colour of the row `row` from the top of `rows`. */
function meterColour(row: number, rows: number): Colour {
  const foot = (rows - 1 - row) / rows;
  return METER.find((step) => foot >= step.from)?.colour ?? Colour.Green;
}

/** Columns of mosaic sixels, a band each, as tall as each band's level. */
export class Spectrum extends Component<SpectrumProps> {
  get #rows(): number {
    return Math.max(1, cellCount(this.props.plotRows ?? PLOT_ROWS));
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, this.#rows) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.levels.length === 0) {
      paintEmpty(canvas, this.props.empty ?? "no sound");
      return;
    }
    // Only the rows the canvas has, so a height from props sizes nothing past the page.
    const rows = Math.min(this.#rows, canvas.height);
    const bandCells = Math.max(1, cellCount(this.props.bandCells ?? BAND_CELLS));
    const cells = Math.max(0, canvas.width - COLOUR_CELLS);
    const shown = this.props.levels.slice(0, Math.floor(cells / bandCells));
    const sixels = new Sixels(cells * SIXELS_ACROSS, rows * SIXELS_DOWN);
    const bandSixels = bandCells * SIXELS_ACROSS;
    shown.forEach((level, band) => {
      const height = Math.round(levelOf(level) * sixels.height);
      for (let y = sixels.height - height; y < sixels.height; y += 1) {
        for (let x = 0; x < bandSixels - GAP_SIXELS; x += 1) {
          sixels.set(band * bandSixels + x, y, true);
        }
      }
    });
    for (let row = 0; row < rows; row += 1) {
      const colour = this.props.foreground ?? meterColour(row, rows);
      canvas.codes(row, 0, [mosaicColour(colour), ...Array.from({ length: cells }, (_, column) => sixels.cell(column * SIXELS_ACROSS, row * SIXELS_DOWN))]);
    }
  }
}
