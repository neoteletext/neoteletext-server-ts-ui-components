// Where each unit of a scrolling view (scroll-view.ts) stands among the
// rows of all of them: a unit takes the rows its element's `height` says,
// one otherwise, and the view shows from a unit the units that fit whole.

import { type Element, isElement } from "../core/element.ts";

/** The rows a unit takes: its element's `height`, a whole number of one or more, or one for text and for an element without one. */
function unitRows(unit: Element | string): number {
  const height = isElement(unit) ? unit.props.height : undefined;
  return height !== undefined && Number.isFinite(height) && height >= 1 ? Math.floor(height) : 1;
}

/** Where each unit stands among the rows of all of them, and what fits in `shown` rows from each. */
export class UnitRows {
  /** The first row of each unit, then the rows of all of them. */
  readonly #starts: number[];
  readonly #shown: number;
  /** The last unit that may be the first shown: from it, every unit to the end is in view. */
  readonly last: number;

  /** `units` in order; `shown` the rows the units are shown in. */
  constructor(units: readonly (Element | string)[], shown: number) {
    this.#shown = Math.max(1, shown);
    this.#starts = [0];
    for (const unit of units) {
      this.#starts.push((this.#starts.at(-1) ?? 0) + unitRows(unit));
    }
    let last = units.length;
    while (last > 0 && this.total - this.startOf(last - 1) <= this.#shown) {
      last -= 1;
    }
    // When even the last unit alone is taller than the view, it is the last first one, shown alone.
    this.last = Math.min(last, Math.max(0, units.length - 1));
  }

  get count(): number {
    return this.#starts.length - 1;
  }

  /** The rows of all the units together. */
  get total(): number {
    return this.#starts.at(-1) ?? 0;
  }

  startOf(unit: number): number {
    return this.#starts[unit] ?? this.total;
  }

  /** `top` within the units that may be shown first. */
  clamp(top: number): number {
    return Math.max(0, Math.min(this.last, top));
  }

  /** How many units fit whole from `top`: at least one, which a unit taller than the view is, cut at its edge, when it is the only one there. */
  fitFrom(top: number): number {
    let end = top;
    while (end < this.count && this.startOf(end + 1) - this.startOf(top) <= this.#shown) {
      end += 1;
    }
    return Math.min(this.count - top, Math.max(1, end - top));
  }

  /**
   * The unit to show first when the bar asks for row `row`, from `from`:
   * the one starting nearest it, the last at or past the bar's end, and
   * always at least one unit on in the direction the bar moved, so that a
   * press beside the block moves past a unit taller than it asked.
   */
  unitNear(row: number, from: number): number {
    if (row >= this.total - this.#shown) {
      return this.last;
    }
    // The first unit starting at or after `row`, by halves.
    let low = 0;
    let high = this.count;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.startOf(middle) < row) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    const before = Math.max(0, low - 1);
    let near = row - this.startOf(before) <= this.startOf(low) - row ? before : low;
    const fromRow = this.startOf(from);
    if (row > fromRow && near <= from) {
      near = from + 1;
    } else if (row < fromRow && near >= from) {
      near = from - 1;
    }
    return this.clamp(near);
  }
}
