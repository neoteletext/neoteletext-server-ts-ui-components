// A skeleton: where text is still coming, rows of blocks in the shape of
// its lines, in separated graphics (EN 300 706 clause 12.2) so they read as
// a placeholder and not as a bar. Told to shimmer, a brighter band moves
// across them on a timer of its own while someone watches. The band
// changes colour in a cell of its own; with Hold Mosaics that cell shows
// the last block again (Table 26), so the line has no gap, as a line
// gauge's has none (line-gauge.ts).

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { FULL_BLOCK } from "../core/mosaics.ts";
import { framePeriod } from "../core/timers.ts";
import { Attribute, Colour, mosaicColour, ROWS } from "../kit.ts";
import { cellCount } from "../charts/numbers.ts";

export interface SkeletonProps {
  /** The lines it stands for; three when absent. */
  readonly rows?: number;
  /** Each line's blocks, used in turn, so lines of text's ragged ends are shown; when absent, lines nearly as wide as the box and a short last one. */
  readonly widths?: readonly number[];
  /** A brighter band moves across. */
  readonly shimmer?: boolean;
  readonly foreground?: Colour;
  /** The band's colour. */
  readonly band?: Colour;
  /** Milliseconds a step of the band. */
  readonly everyMs?: number;
}

interface SkeletonState {
  readonly step: number;
}

/** The lines when not told: a short paragraph. */
const ROWS_SHOWN = 3;
/** The lines' widths when not told, as shares of the room: two full lines and a short last one, as a paragraph ends. */
const SHARES = [1, 1, 0.6];
/** The cells before the blocks: the colour, Separated, Hold Mosaics; and Release Mosaics after them. */
const LEAD_CELLS = 3;
const END_CELLS = 1;
/** The band's blocks, and how far it moves a step. */
const BAND_CELLS = 4;
const BAND_STEP = 2;
/** Milliseconds a step when not told: four a second, as a spinner's frames. */
const STEP_MS = 250;

/**
 * A line of `blocks` cells after its lead: blocks, and a colour code where
 * the band, from `bandAt` for BAND_CELLS, starts or ends on it, in a cell
 * that shows the block held before it. The lead's colour is the first
 * cell's, so a band over the line's start needs no code of its own.
 */
function lineCodes(blocks: number, foreground: Colour, band: Colour, bandAt: number | null): number[] {
  const inBand = (cell: number): boolean => bandAt !== null && cell >= bandAt && cell < bandAt + BAND_CELLS;
  const lead = [mosaicColour(inBand(0) ? band : foreground), Attribute.Separated, Attribute.HoldMosaics];
  const cells = Array.from({ length: blocks }, (_, cell) => {
    if (cell > 0 && inBand(cell) !== inBand(cell - 1)) {
      return mosaicColour(inBand(cell) ? band : foreground);
    }
    return FULL_BLOCK;
  });
  return [...lead, ...cells, Attribute.ReleaseMosaics];
}

/** Rows of separated blocks where text is still coming, shimmering when told. */
export class Skeleton extends Component<SkeletonProps, SkeletonState> {
  override state: SkeletonState = { step: 0 };
  /** The band's timer, -1 for none: none while it does not shimmer. */
  #timer = -1;

  /** The lines it draws: a whole number from nought to a page's rows. */
  get #rows(): number {
    const rows = this.props.rows ?? ROWS_SHOWN;
    return Number.isNaN(rows) ? ROWS_SHOWN : Math.min(ROWS, Math.max(0, Math.trunc(rows)));
  }

  override componentDidMount(): void {
    this.#start();
  }

  override componentDidUpdate(previous: Readonly<SkeletonProps>): void {
    if (previous.shimmer !== this.props.shimmer || previous.everyMs !== this.props.everyMs) {
      this.#start();
    }
  }

  #start(): void {
    this.clearTimer(this.#timer);
    this.#timer = -1;
    if (this.props.shimmer === true) {
      this.#timer = this.setInterval(
        () => {
          this.setState((state) => ({ step: state.step + 1 }));
        },
        framePeriod(this.props.everyMs ?? STEP_MS),
        { whileViewed: true },
      );
    }
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.#rows, space.height) };
  }

  /** Line `row`'s blocks in `room`: its width given, or its share of the room, no more than the room. */
  #blocks(row: number, room: number): number {
    const widths = this.props.widths;
    const given = widths === undefined || widths.length === 0 ? undefined : widths[row % widths.length];
    const wanted = given === undefined ? Math.round(room * (SHARES[row % SHARES.length] ?? 1)) : Math.trunc(cellCount(given));
    return Math.min(room, wanted);
  }

  override paint(canvas: Canvas): void {
    const room = Math.max(0, canvas.width - LEAD_CELLS - END_CELLS);
    const foreground = this.props.foreground ?? Colour.Blue;
    const band = this.props.band ?? Colour.White;
    // The band goes from before the line's start to past its end, then round again.
    const bandAt = this.props.shimmer === true ? ((this.state.step * BAND_STEP) % (room + BAND_CELLS)) - BAND_CELLS : null;
    for (let row = 0; row < Math.min(this.#rows, canvas.height); row += 1) {
      canvas.codes(row, 0, lineCodes(this.#blocks(row, room), foreground, band, bandAt));
    }
  }
}
