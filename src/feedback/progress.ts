// How far along something is, or how full: a progress bar of mosaic blocks
// to the half cell, solid or in separated graphics (EN 300 706 clause
// 12.2), whose colour may follow thresholds as a gauge's does; either
// kind spends the cell after its colour's on saying which, so solid bars
// and separated ones start in one column. The share it shows, and the
// label's and the share's cells, are the line gauge's too (line-gauge.ts).
// Given onSeek, its track is a control: a click on it says how far along
// the click was, as a player's seek bar does.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { FULL_BLOCK, LEFT_HALF, MOSAIC_BASE, SIXEL } from "../core/mosaics.ts";
import { fit, padStart } from "../core/text.ts";
import { Attribute, Colour, mosaicColour } from "../kit.ts";
import type { PointerEvent } from "../core/events.ts";
import { cellCount } from "../charts/numbers.ts";

/** A colour from a share upward, as a gauge goes green, yellow, red. */
export type Threshold = readonly [from: number, foreground: Colour];

export interface ProgressProps {
  /** What it measures, in a column of its own before the bar; no column when absent. */
  readonly label?: string;
  /** How far along, in max's units; the share it makes is kept from 0 to 1. */
  readonly value: number;
  /** What a full bar is; nought or less shows an empty one. */
  readonly max: number;
  /** The bar's colour where no threshold is reached; green when absent. */
  readonly foreground?: Colour;
  /** Separated graphics: the bar in blocks with gaps, as segments. */
  readonly separated?: boolean;
  /** Colours by share, the highest whose `from` the share reaches. */
  readonly thresholds?: readonly Threshold[];
  /** The label's column. */
  readonly labelCells?: number;
  /** The share after the bar, as a percentage; shown unless false. */
  readonly percent?: boolean;
  /** A click on the track: how far along it, 0 to 1. */
  readonly onSeek?: (fraction: number, session: number) => void;
}

/** The label's column when there is a label and no width is given. */
export const LABEL_CELLS = 12;

/** The share's cells after the bar: its colour and "100%". */
export const PERCENT_CELLS = 5;

/** The empty part of the track: its bottom sixels, a floor to fill along. */
const TRACK = MOSAIC_BASE | SIXEL.bottomLeft | SIXEL.bottomRight;

/** Thresholds a gauge has when it is given only a colour: green, then yellow past 60%, red past 85%. */
export const GAUGE: readonly Threshold[] = [
  [0, Colour.Green],
  [0.6, Colour.Yellow],
  [0.85, Colour.Red],
];

/** `value` as a share of `max`, from 0 to 1. */
export function share(value: number, max: number): number {
  const fraction = value / max;
  // NaN, from a value or a max that is not a number or from Infinity of Infinity, is none: a bar of NaN cells cannot be made.
  return max <= 0 || Number.isNaN(fraction) ? 0 : Math.max(0, Math.min(1, fraction));
}

function colourFor(fraction: number, given: Colour, thresholds: readonly Threshold[] | undefined): Colour {
  if (thresholds === undefined) {
    return given;
  }
  return thresholds.toReversed().find(([from]) => fraction >= from)?.[1] ?? given;
}

/** The track's cell `cell` with `halves` half cells filled: full, half full, or empty. */
function trackCell(cell: number, halves: number): number {
  if (2 * cell + 2 <= halves) {
    return FULL_BLOCK;
  }
  return 2 * cell + 1 === halves ? LEFT_HALF | TRACK : TRACK;
}

/** Where the track is on the bar's row: its first cell and how many. */
interface TrackSpan {
  readonly start: number;
  readonly cells: number;
}

/** Half a cell: a click is taken at its cell's middle. */
const HALF_CELL = 0.5;
/** The region the track is, for a click. */
const TRACK_REGION = "track";

export class ProgressBar extends Component<ProgressProps> {
  /** The track as last painted. */
  #track: TrackSpan = { start: 0, cells: 0 };

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const fraction = share(this.props.value, this.props.max);
    const labelCells = this.props.label === undefined ? 0 : cellCount(this.props.labelCells ?? LABEL_CELLS);
    if (this.props.label !== undefined) {
      canvas.coloured(0, 0, Colour.White, fit(this.props.label, labelCells - 1));
    }
    // EN 300 706 Table 26: Contiguous is the default, but saying it keeps a solid bar's track in the separated one's column.
    const lead = [this.props.separated === true ? Attribute.Separated : Attribute.Contiguous];
    const after = this.props.percent === false ? 0 : PERCENT_CELLS;
    const cells = Math.max(1, canvas.width - labelCells - 1 - lead.length - after);
    const halves = Math.round(2 * cells * fraction);
    const codes = Array.from({ length: cells }, (_, cell) => trackCell(cell, halves));
    const foreground = colourFor(fraction, this.props.foreground ?? Colour.Green, this.props.thresholds);
    canvas.codes(0, labelCells, [mosaicColour(foreground), ...lead, ...codes]);
    this.#track = { start: labelCells + 1 + lead.length, cells };
    if (this.props.onSeek !== undefined) {
      canvas.control(0, this.#track.start, cells, 1, TRACK_REGION);
    }
    if (this.props.percent !== false) {
      canvas.coloured(0, labelCells + 1 + lead.length + cells, Colour.White, padStart(`${Math.round(fraction * 100)}%`, PERCENT_CELLS - 1));
    }
  }

  override onClick(event: PointerEvent): boolean {
    const { onSeek } = this.props;
    if (onSeek === undefined || event.region !== TRACK_REGION || this.#track.cells === 0) {
      return false;
    }
    // The middle of the cell clicked: a click on the first cell is a little way in, not the very start.
    onSeek(Math.max(0, Math.min(1, (event.local.column - this.#track.start + HALF_CELL) / this.#track.cells)), event.session);
    return true;
  }
}
