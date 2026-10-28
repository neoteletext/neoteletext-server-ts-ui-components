// A pie, or a donut, of the parts of a whole (shares.ts), drawn in mosaic
// sixels: slices clockwise from twelve o'clock, round on the screen, where
// a sixel is a little taller than it is wide (core/mosaics.ts). A row of
// mosaics has one foreground colour at a time, so each cell keeps every
// sixel of the pie in it and takes the colour of the slice most of them
// are in. A change of colour takes a cell (EN 300 706 clause 12.2): it goes
// in the cell before the one that needs it, and with Hold Mosaics, set at
// the head of each row, that cell shows the block before it again in the
// colour before, so slices meet with no notch between them, and the first
// and last, which meet at twelve o'clock, with no seam. Each slice's mark
// is drawn outside the rim at its middle, and the legend beside the pie
// names every slice with its share, those too thin to win a cell too, so
// a slice is never told by its colour alone (core/look.ts).

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { paintEmpty } from "../core/look.ts";
import { CELL_ASPECT, MOSAIC_BASE } from "../core/mosaics.ts";
import { Attribute, Colour, mosaicColour, Sixels, SIXELS_ACROSS, SIXELS_DOWN, textColour } from "../kit.ts";
import { cellCount } from "./numbers.ts";
import { amountOf, colourOf, markCode, paintLegend, type Share, totalOf } from "./shares.ts";

export interface PieChartProps {
  /** The slices, clockwise from twelve o'clock; a value that is no finite number, or is below nought, counts for none. */
  readonly slices: readonly Share[];
  /** The rows the pie takes, with a row over it and one under it for the marks. */
  readonly plotRows?: number;
  /** A hole in the middle. */
  readonly donut?: boolean;
  /** What it says when the slices make no whole; "no data" when absent. */
  readonly empty?: string;
}

/** The pie's rows, when not given: seven rows of pie, round in twelve cells, and the marks' rows. */
const PLOT_ROWS = 9;
/** The rows over and under the pie, and the cells either side of it, where the marks go. */
const MARK_ROWS = 1;
/** A mark's cells beside the pie: its colour, the mark, and a blank cell for the pie's colour after it. */
const MARK_CELLS = 3;
/** Hold Mosaics, at the head of each row of pie, before the marks' cells on its left. */
const HOLD_CELLS = 1;
/** Where the pie's cells start: after Hold Mosaics and the marks' cells on its left. */
const PIE_AT = HOLD_CELLS + MARK_CELLS;
/**
 * The blank cell between the pie and a mark on its right: a mark's colour
 * is set-after, so Hold Mosaics would show the pie's last block again in
 * the colour's cell. A mark on the left is in text from the row's head.
 */
const HELD_GAP_CELLS = 1;
/** A sixel's width over its height: a cell's split two sixels across and three down (clause 15.7.1). It is 0.9. */
const SIXEL_ASPECT = (CELL_ASPECT * SIXELS_DOWN) / SIXELS_ACROSS;
/** The donut's hole, as a fraction of the pie's radius. */
const DONUT_HOLE = 0.5;
/** How far past the rim a slice's mark is put, in rows of sixels: a cell's worth, so it clears the pie. */
const MARK_BEYOND = SIXELS_DOWN;
/** The fewest rows a pie can be drawn in: the marks' rows and a row of pie. */
const LEAST_ROWS = 2 * MARK_ROWS + 1;
const TURN = 2 * Math.PI;

/** The pie's sixels, where it is, and which slice each of them is in. */
interface Disc {
  readonly sixels: Sixels;
  /** Each sixel's slice, by its index in the slices, or -1 where there is no pie. */
  readonly slices: readonly number[];
  readonly radius: number;
  readonly centreX: number;
  readonly centreY: number;
}

/** The first of `ends` past `fraction`: the slice a fraction of the turn is in, by halving, since a program may give many. */
function sliceAt(ends: readonly number[], fraction: number): number {
  let low = 0;
  let high = ends.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if ((ends[middle] ?? 1) > fraction) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  return low;
}

/** Each slice's end, as a fraction of the whole turn from twelve o'clock. */
function endsOf(slices: readonly Share[], total: number): number[] {
  let sum = 0;
  return slices.map((share) => {
    sum += amountOf(share);
    return sum / total;
  });
}

/** The pie of `ends` in `cellsAcross` by `cellsDown` cells: a sixel is in it if its middle is, as the screen shows it. */
function discOf(ends: readonly number[], cellsAcross: number, cellsDown: number, donut: boolean): Disc {
  const sixels = new Sixels(cellsAcross * SIXELS_ACROSS, cellsDown * SIXELS_DOWN);
  const radius = sixels.height / 2;
  const hole = donut ? radius * DONUT_HOLE : 0;
  const centreX = sixels.width / 2;
  const centreY = sixels.height / 2;
  const slices: number[] = Array.from({ length: sixels.width * sixels.height }, () => -1);
  for (let y = 0; y < sixels.height; y += 1) {
    for (let x = 0; x < sixels.width; x += 1) {
      // In rows of sixels both ways, so the circle is round on the screen.
      const across = (x + 0.5 - centreX) * SIXEL_ASPECT;
      const down = y + 0.5 - centreY;
      const distance = Math.hypot(across, down);
      if (distance <= radius && distance >= hole) {
        sixels.set(x, y, true);
        const fraction = (Math.atan2(across, -down) / TURN + 1) % 1;
        slices[y * sixels.width + x] = sliceAt(ends, fraction);
      }
    }
  }
  return { sixels, slices, radius, centreX, centreY };
}

/** The slice most of the sixels of the cell at `cellX`, `cellY` are in, the first on a tie; -1 for a cell with none. */
function cellSlice(disc: Disc, cellX: number, cellY: number): number {
  const counts = new Map<number, number>();
  for (let dy = 0; dy < SIXELS_DOWN; dy += 1) {
    for (let dx = 0; dx < SIXELS_ACROSS; dx += 1) {
      const slice = disc.slices[(cellY * SIXELS_DOWN + dy) * disc.sixels.width + cellX * SIXELS_ACROSS + dx] ?? -1;
      if (slice >= 0) {
        counts.set(slice, (counts.get(slice) ?? 0) + 1);
      }
    }
  }
  let most = -1;
  let mostCount = 0;
  for (const [slice, count] of counts) {
    if (count > mostCount || (count === mostCount && slice < most)) {
      most = slice;
      mostCount = count;
    }
  }
  return most;
}

/** One row of the plot as it is built: each cell's code, and the colour of each cell of pie in it. */
interface PlotRow {
  readonly codes: number[];
  readonly colours: Colour[];
}

/** A pie or a donut of the parts of a whole, a mark by each slice and a legend beside it. */
/** A mosaic code's sixels: its bits but 0x20, which every mosaic has, and 0x80 (Table 47's layout, core/mosaics.ts). */
const SIXEL_BITS = 0x5f;

/** How many sixels a mosaic code sets. */
function sixelCount(code: number | undefined): number {
  let bits = (code ?? MOSAIC_BASE) & SIXEL_BITS;
  let count = 0;
  while (bits !== 0) {
    count += bits & 1;
    bits >>= 1;
  }
  return count;
}

/** The sixels wrong when a colour starting at `column` takes the cell before it: it shows the block before that, held, where its own was. */
function wrongBefore(codes: readonly number[], column: number): number {
  return sixelCount((codes[column - 2] ?? MOSAIC_BASE) ^ (codes[column - 1] ?? MOSAIC_BASE));
}

/** The sixels wrong when the colour takes its own first cell: that cell shows the one before's block, in the old colour, where its own was. */
function wrongAt(codes: readonly number[], column: number): number {
  return sixelCount(codes[column - 1]) + sixelCount(codes[column]);
}

/** The cell a colour starting at `column` of a row's mosaic `codes` takes: the one before it, or, where that gets more sixels wrong, its own first. */
export function colourCell(codes: readonly number[], column: number): number {
  return column >= 1 && wrongBefore(codes, column) > wrongAt(codes, column) ? column : column - 1;
}

export class PieChart extends Component<PieChartProps> {
  get #rows(): number {
    return cellCount(this.props.plotRows ?? PLOT_ROWS);
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, Math.max(this.#rows, this.props.slices.length)) };
  }

  override paint(canvas: Canvas): void {
    const total = totalOf(this.props.slices);
    const rows = Math.min(this.#rows, canvas.height);
    if (total <= 0 || rows < LEAST_ROWS) {
      paintEmpty(canvas, this.props.empty ?? "no data");
      return;
    }
    const pieRows = rows - 2 * MARK_ROWS;
    // As many cells across as make it as wide as it is tall on the screen.
    const pieCells = Math.ceil((pieRows * SIXELS_DOWN) / SIXEL_ASPECT / SIXELS_ACROSS);
    const plotCells = Math.min(canvas.width, PIE_AT + pieCells + HELD_GAP_CELLS + MARK_CELLS);
    const disc = discOf(endsOf(this.props.slices, total), pieCells, pieRows, this.props.donut === true);
    const plot: PlotRow[] = Array.from({ length: rows }, () => ({ codes: Array.from({ length: plotCells }, () => MOSAIC_BASE), colours: [] }));
    const won = new Set<number>();
    for (let cellY = 0; cellY < pieRows; cellY += 1) {
      const row = plot[MARK_ROWS + cellY];
      if (row === undefined) {
        continue;
      }
      row.codes[0] = Attribute.HoldMosaics;
      for (let cellX = 0; cellX < pieCells && PIE_AT + cellX < plotCells; cellX += 1) {
        const slice = cellSlice(disc, cellX, cellY);
        const share = this.props.slices[slice];
        if (share !== undefined) {
          row.codes[PIE_AT + cellX] = disc.sixels.cell(cellX * SIXELS_ACROSS, cellY * SIXELS_DOWN);
          row.colours[PIE_AT + cellX] = colourOf(share, slice);
          won.add(slice);
        }
      }
    }
    const marks = this.#marks(plot, disc, won, total);
    plot.forEach((row, index) => {
      canvas.codes(index, 0, this.#coloured(row, marks.get(index) ?? new Map()));
    });
    paintLegend(canvas, { row: 0, column: plotCells, width: canvas.width - plotCells, across: 1, rows: canvas.height }, this.props.slices);
  }

  /**
   * Where each slice that won a cell has its mark: just past the rim at the
   * middle of its slice, or the nearest cell outward along that row with
   * room for the mark's colour before it and a blank cell after, so the
   * pie's own colour can follow, and no pie just before its colour, which
   * Hold Mosaics would show again in the colour's cell. A mark with no room
   * is left to the legend. Answers, by row, the marks' cells and the codes
   * to put there.
   */
  #marks(plot: readonly PlotRow[], disc: Disc, won: ReadonlySet<number>, total: number): Map<number, Map<number, number>> {
    const marks = new Map<number, Map<number, number>>();
    const taken = (row: number, column: number): boolean => {
      const codes = plot[row]?.codes;
      const marked = marks.get(row);
      const held = codes?.[column - 2];
      return (
        (held !== undefined && held !== MOSAIC_BASE && held !== Attribute.HoldMosaics) ||
        [column - 1, column, column + 1].some((cell) => codes === undefined || codes[cell] !== MOSAIC_BASE || marked?.has(cell) === true)
      );
    };
    let before = 0;
    this.props.slices.forEach((share, index) => {
      const amount = amountOf(share);
      const middle = (before + amount / 2) / total;
      before += amount;
      if (!won.has(index)) {
        return;
      }
      const angle = middle * TURN;
      const reach = disc.radius + MARK_BEYOND;
      const x = disc.centreX + (Math.sin(angle) * reach) / SIXEL_ASPECT;
      const y = disc.centreY - Math.cos(angle) * reach;
      const row = Math.max(0, Math.min(plot.length - 1, MARK_ROWS + Math.floor(y / SIXELS_DOWN)));
      const width = plot[row]?.codes.length ?? 0;
      const outward = x < disc.centreX ? -1 : 1;
      for (let column = Math.max(1, Math.min(width - 2, PIE_AT + Math.floor(x / SIXELS_ACROSS))); column >= 1 && column < width - 1; column += outward) {
        if (!taken(row, column)) {
          const marked = marks.get(row) ?? new Map<number, number>();
          marked.set(column - 1, textColour(colourOf(share, index))).set(column, markCode(share, index));
          marks.set(row, marked);
          return;
        }
      }
    });
    return marks;
  }

  /**
   * The codes of `row` with its colours set and `marks` in place: a mark
   * leaves the row in text, so the next cell of pie needs its colour again.
   * A change of colour goes in the cell before the cell that needs it: a
   * blank cell, or the last of the slice before, which Hold Mosaics shows
   * as the block before it. A mark always has a blank cell after it, so a
   * colour never covers one.
   */
  #coloured(row: PlotRow, marks: ReadonlyMap<number, number>): number[] {
    const codes = [...row.codes];
    let current: Colour | null = null;
    for (let column = 0; column < codes.length; column += 1) {
      const mark = marks.get(column);
      if (mark !== undefined) {
        codes[column] = mark;
        current = null;
        continue;
      }
      const colour = row.colours[column];
      if (colour === undefined || colour === current) {
        continue;
      }
      // Hold Mosaics shows, in a colour's cell, the most recent mosaic on the row (EN 300 706 Table 26, 1/E). In the cell before the colour, that is the block before it where its own was, which beside a donut's hole fills the hole's part of a partial cell; in the colour's own cell, the cell before's block, in the old colour, where the new one's was. The colour goes where fewer sixels come out wrong.
      codes[colourCell(codes, column)] = mosaicColour(colour);
      current = colour;
    }
    return codes;
  }
}
