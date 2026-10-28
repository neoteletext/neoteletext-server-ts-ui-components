// A roulette wheel: a ring of coloured blocks, one lit. The ring is round
// on the cell's shape (core/mosaics.ts), as a pie is, and the same each
// side of its middle both ways. The lit segment is white and hollow, a
// ring of sixels where the others are solid, so it is told by its shape as
// well as its colour (core/look.ts).

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { BOTTOM_ROW, CELL_ASPECT, FULL_BLOCK, LEFT_HALF, RIGHT_HALF, TOP_ROW } from "../core/mosaics.ts";
import { Colour, mosaicColour } from "../kit.ts";

export interface WheelProps {
  /** The segment lit, which turns as the wheel spins. */
  readonly lit: number;
  /** The blocks round it, a whole number up to MOST_SEGMENTS; 12 when absent. */
  readonly segments?: number;
}

/** A roulette wheel's colours round it. */
const WHEEL_COLOURS = [Colour.Red, Colour.Yellow, Colour.Green, Colour.Cyan, Colour.Blue, Colour.Magenta] as const;

/** The segments round it when not given. */
const WHEEL_SEGMENTS = 12;

/** Its radius in rows, and in columns as wide as that is tall on the cell's shape: 8 columns of 12 pixels for 5 rows of 20. */
const WHEEL_ROWS = 5;
const WHEEL_COLUMNS = Math.round(WHEEL_ROWS / CELL_ASPECT);

/** The cells before the ring's leftmost segment: a blank, then its colour's. */
const LEFT_CELLS = 2;

/**
 * The most segments drawn: a ring of these radii steps through at most one
 * row or one column a cell, so it has no more cells than its rows and
 * columns round it, and more segments only draw over each other.
 */
const MOST_SEGMENTS = 4 * (WHEEL_ROWS + WHEEL_COLUMNS);

/** A segment's two cells, unlit: solid, so a narrow cell does not look like a slit. */
const SOLID = [FULL_BLOCK, FULL_BLOCK] as const;
/** The lit segment's two cells: the same block hollowed, its middle two sixels clear. */
const HOLLOW = [LEFT_HALF | TOP_ROW | BOTTOM_ROW, RIGHT_HALF | TOP_ROW | BOTTOM_ROW] as const;

/** `segments` as a count to draw: whole, from none to the most the ring has cells for. */
function segmentCount(segments: number): number {
  return Number.isNaN(segments) ? 0 : Math.max(0, Math.min(MOST_SEGMENTS, Math.trunc(segments)));
}

/**
 * Segment `segment` of `segments`'s offset from the middle, across and
 * down, in whole cells of the radii. Each is found in the first quarter
 * and its sign given after, so a segment and its mirror round alike: in
 * floating point cos 240 degrees times five is -2.5000000000000018 where
 * cos 60 times five is 2.5000000000000004, and Math.round takes -2.5 up,
 * so rounded as they come the ring is a row lower on one side.
 */
function offsetOf(segment: number, segments: number): { readonly across: number; readonly down: number } {
  // The angle from twelve o'clock to the nearer of twelve and six, in half-turns of `segments`: a whole number, the same for a segment and its mirrors.
  const halfTurns = (2 * segment) % segments;
  const fromVertical = (Math.PI * Math.min(halfTurns, segments - halfTurns)) / segments;
  const right = 2 * segment < segments;
  const up = 4 * segment < segments || 4 * segment > 3 * segments;
  const across = Math.round(WHEEL_COLUMNS * Math.sin(fromVertical)) * (right ? 1 : -1);
  const down = Math.round(WHEEL_ROWS * Math.cos(fromVertical)) * (up ? -1 : 1);
  return { across, down };
}

/** A ring of coloured blocks, one lit white and hollow. */
export class Wheel extends Component<WheelProps> {
  override measure(space: Size): Size {
    return { width: Math.min(space.width, 2 * (WHEEL_COLUMNS + LEFT_CELLS)), height: Math.min(space.height, 2 * WHEEL_ROWS + 1) };
  }

  override paint(canvas: Canvas): void {
    const segments = segmentCount(this.props.segments ?? WHEEL_SEGMENTS);
    for (let segment = 0; segment < segments; segment += 1) {
      const { across, down } = offsetOf(segment, segments);
      const lit = ((this.props.lit % segments) + segments) % segments === segment;
      const foreground = lit ? Colour.White : (WHEEL_COLOURS[segment % WHEEL_COLOURS.length] ?? Colour.White);
      canvas.codes(WHEEL_ROWS + down, WHEEL_COLUMNS + LEFT_CELLS + across - 1, [mosaicColour(foreground), ...(lit ? HOLLOW : SOLID)]);
    }
  }
}
