// One bar split into the parts of a whole, as an election's shares of the
// vote are: each part a run of whole cells in its colour, shared by the
// largest remainder (shares.ts). A colour change takes a cell (EN 300 706
// clause 12.2); with Hold Mosaics that cell shows the last block again in
// the colour before, so the runs meet with no gap and each part is exactly
// its cells, one to the right of its colour's. Under the bar each part's
// mark sits under its middle, so a part is told by its mark and not by its
// colour alone (core/look.ts); under that, the legend names every part
// with its share, those too small for a cell of the bar too.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { LABEL, paintEmpty } from "../core/look.ts";
import { FULL_BLOCK } from "../core/mosaics.ts";
import { Attribute, mosaicColour } from "../kit.ts";
import { cellCount } from "./numbers.ts";
import { amountOf, apportion, colourOf, legendAcross, markCode, paintLegend, type Share, totalOf } from "./shares.ts";

export interface BreakdownBarProps {
  /** The parts of the whole, left to right; a value that is no finite number, or is below nought, counts for none. */
  readonly parts: readonly Share[];
  /** The rows the bar is tall. */
  readonly barRows?: number;
  /** The legend's entries across a row. */
  readonly legendColumns?: number;
  /** What it says when the parts make no whole; "no data" when absent. */
  readonly empty?: string;
}

/** The bar's rows, when not given. */
const BAR_ROWS = 1;
/** The legend's entries across, when not given: two of twenty cells fill a row of forty. */
const LEGEND_COLUMNS = 2;
/** The row of marks under the bar. */
const MARK_ROWS = 1;
/** The bar's first cell, Hold Mosaics, which shows nothing: no block has been drawn on the row yet. */
const HOLD_CELLS = 1;
/** The first part's colour's cell, also blank, since nothing is held yet. */
const FIRST_COLOUR_CELLS = 1;
/** The block after the last part's run, which its run takes to make up for the cell its colour took. */
const LAST_BLOCK_CELLS = 1;
/** Where the first part shows: after Hold Mosaics and its own colour's cell. */
const FIRST_SHOWN = HOLD_CELLS + FIRST_COLOUR_CELLS;

/** A part's run on the bar: the part, its place in the parts, and the cells it shows in. */
interface Run {
  readonly share: Share;
  readonly index: number;
  readonly from: number;
  readonly cells: number;
}

/** The runs of `parts` across `cells`, from the first shown cell; a part given no cell has no run. */
function runsOf(parts: readonly Share[], cells: number): Run[] {
  const given = apportion(
    parts.map((share) => amountOf(share)),
    cells,
  );
  const runs: Run[] = [];
  let from = FIRST_SHOWN;
  parts.forEach((share, index) => {
    const count = given[index] ?? 0;
    if (count > 0) {
      runs.push({ share, index, from, cells: count });
      from += count;
    }
  });
  return runs;
}

/** A bar of the parts of a whole in their colours, their marks under it and a legend of them all. */
export class BreakdownBar extends Component<BreakdownBarProps> {
  get #barRows(): number {
    return Math.max(1, cellCount(this.props.barRows ?? BAR_ROWS));
  }

  /** The legend's rows across `width`: enough for every part. */
  #legendRows(width: number): number {
    return Math.max(1, Math.ceil(this.props.parts.length / legendAcross(this.props.legendColumns ?? LEGEND_COLUMNS, width)));
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, this.#barRows + MARK_ROWS + this.#legendRows(space.width)) };
  }

  override paint(canvas: Canvas): void {
    if (totalOf(this.props.parts) <= 0) {
      paintEmpty(canvas, this.props.empty ?? "no data");
      return;
    }
    const runs = runsOf(this.props.parts, canvas.width - FIRST_SHOWN);
    // Each run's colour comes in the cell before it shows: the first's after Hold Mosaics, each next one's in the last cell of the run before.
    const codes: number[] = [Attribute.HoldMosaics];
    for (const run of runs) {
      codes.push(mosaicColour(colourOf(run.share, run.index)), ...Array.from({ length: run.cells - 1 }, () => FULL_BLOCK));
    }
    if (runs.length > 0) {
      codes.push(...Array.from({ length: LAST_BLOCK_CELLS }, () => FULL_BLOCK));
    }
    const barRows = Math.min(this.#barRows, canvas.height);
    for (let row = 0; row < barRows; row += 1) {
      canvas.codes(row, 0, codes);
    }
    const markRow = barRows;
    canvas.coloured(markRow, 0, LABEL, "");
    for (const run of runs) {
      canvas.code(markRow, run.from + Math.floor((run.cells - 1) / 2), markCode(run.share, run.index));
    }
    paintLegend(
      canvas,
      {
        row: markRow + MARK_ROWS,
        column: 0,
        width: canvas.width,
        across: this.props.legendColumns ?? LEGEND_COLUMNS,
        rows: canvas.height - markRow - MARK_ROWS,
      },
      this.props.parts,
    );
  }
}
