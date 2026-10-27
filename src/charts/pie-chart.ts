// A pie, or a donut, of the parts of a whole (shares.ts), drawn in mosaic
// sixels: slices clockwise from twelve o'clock, round on the screen, where
// a sixel is wider than it is tall. A row of mosaics has one foreground
// colour at a time, and a change of colour takes a cell (EN 300 706 clause
// 12.2), so the simplest correct drawing is one colour a cell: each cell
// keeps every sixel of the pie in it and takes the colour of the slice
// most of them are in. Where a row's colour changes, the colour goes in the
// blank cell before when there is one, as at the pie's edge and the
// donut's hole; inside the pie it takes the cell itself, which shows as a
// black notch on the line between two slices. Each slice's mark is drawn
// outside the rim at its middle, and the legend beside the pie names every
// slice with its share, those too thin to win a cell too, so a slice is
// never told by its colour alone (core/look.ts).

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { paintEmpty } from "../core/look.ts";
import { MOSAIC_BASE } from "../core/mosaics.ts";
import { Colour, COLUMNS, mosaicColour, ROWS, Sixels, SIXELS_ACROSS, SIXELS_DOWN, textColour } from "../kit.ts";
import { cellCount } from "./numbers.ts";
import { amountOf, colourOf, markCode, paintLegend, type Share, totalOf } from "./shares.ts";

export interface PieChartProps {
  readonly slices: readonly Share[];
  /** The rows the pie takes, with a row over it and one under it for the marks. */
  readonly plotRows?: number;
  /** A hole in the middle. */
  readonly donut?: boolean;
  readonly empty?: string;
}

/** The pie's rows, when not given: seven rows of pie, round in fifteen cells, and the marks' rows. */
const PLOT_ROWS = 9;
/** The rows over and under the pie, and the cells either side of it, where the marks go. */
const MARK_ROWS = 1;
/** A mark's cells beside the pie: its colour, the mark, and a blank cell for the pie's colour after it. */
const MARK_CELLS = 3;
/** A teletext page fills a 4:3 picture. */
const SCREEN_ASPECT = 4 / 3;
/**
 * A sixel's width over its height: a cell is a fortieth of the picture's
 * width and a twenty-fifth of its height (EN 300 706 clause 9.3), split two
 * sixels across and three down (clause 15.7.1). It is 1.25.
 */
const SIXEL_ASPECT = SCREEN_ASPECT / COLUMNS / SIXELS_ACROSS / (1 / ROWS / SIXELS_DOWN);
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
    const plotCells = Math.min(canvas.width, pieCells + 2 * MARK_CELLS);
    const disc = discOf(endsOf(this.props.slices, total), pieCells, pieRows, this.props.donut === true);
    const plot: PlotRow[] = Array.from({ length: rows }, () => ({ codes: Array.from({ length: plotCells }, () => MOSAIC_BASE), colours: [] }));
    const won = new Set<number>();
    for (let cellY = 0; cellY < pieRows; cellY += 1) {
      const row = plot[MARK_ROWS + cellY];
      if (row === undefined) {
        continue;
      }
      for (let cellX = 0; cellX < pieCells; cellX += 1) {
        const slice = cellSlice(disc, cellX, cellY);
        const share = this.props.slices[slice];
        if (share !== undefined) {
          row.codes[MARK_CELLS + cellX] = disc.sixels.cell(cellX * SIXELS_ACROSS, cellY * SIXELS_DOWN);
          row.colours[MARK_CELLS + cellX] = colourOf(share, slice);
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
   * pie's own colour can follow. A mark with no room is left to the legend.
   * Answers, by row, the marks' cells and the codes to put there.
   */
  #marks(plot: readonly PlotRow[], disc: Disc, won: ReadonlySet<number>, total: number): Map<number, Map<number, number>> {
    const marks = new Map<number, Map<number, number>>();
    const taken = (row: number, column: number): boolean => {
      const codes = plot[row]?.codes;
      const marked = marks.get(row);
      return [column - 1, column, column + 1].some((cell) => codes === undefined || codes[cell] !== MOSAIC_BASE || marked?.has(cell) === true);
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
      for (let column = Math.max(1, Math.min(width - 2, MARK_CELLS + Math.floor(x / SIXELS_ACROSS))); column >= 1 && column < width - 1; column += outward) {
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
   * A change of colour goes in the blank cell before the cell that needs it
   * when there is one, else in the cell itself.
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
      if (column > 0 && codes[column - 1] === MOSAIC_BASE && !marks.has(column - 1)) {
        codes[column - 1] = mosaicColour(colour);
      } else {
        codes[column] = mosaicColour(colour);
      }
      current = colour;
    }
    return codes;
  }
}
