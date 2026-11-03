// Where each unit of a scrolling view (scroll-view.ts) stands among the
// rows of all of them: the rows each takes, in its language and with the
// mark rows of a language whose marks take rows of their own (marks.ts);
// the units the view shows from a unit, those that fit whole; and how the
// units in view are drawn.

import { type Element, h, isElement } from "../core/element.ts";
import type { TextLanguage } from "../core/language.ts";
import { clashes, placed } from "../core/marks.ts";
import { oneLineRows } from "../core/text.ts";
import { Colour, type Language, type LanguageTag } from "../kit.ts";
import { LinesBlock } from "../text/lines.ts";

/** The cell a unit of text starts at, after its colour's (Text, LinesBlock). */
const TEXT_AT = 1;
/** The rows between consecutive lines of text with mark rows: the shared mark row and the next letters (marks.ts). */
const MARKED_PITCH = 2;

/**
 * The rows each unit takes in a view in `language`: its element's
 * `height`, a whole number of one or more; else a line of its own language's
 * (`languageOf` its `language` prop) or the view's. In a language whose
 * marks take the rows around its letters, a unit of text takes two rows,
 * its upper marks' and its letters, its lower vowels sharing the next text
 * unit's mark row, and a row more where a column needs both (marks.ts);
 * before anything else, or at the end, it takes its own row below.
 */
export function unitRows(units: readonly (Element | string)[], language: TextLanguage, languageOf: (tag: LanguageTag) => Language): number[] {
  return units.map((unit, index) => {
    if (isElement(unit)) {
      const height = unit.props.height;
      if (height !== undefined && Number.isFinite(height) && height >= 1) {
        return Math.floor(height);
      }
      const own = unit.props.language;
      return oneLineRows(own === undefined ? language : languageOf(own));
    }
    if (language.markRows === 0) {
      return 1;
    }
    const next = units[index + 1];
    const below = typeof next !== "string" || clashes(placed(language, TEXT_AT, unit), placed(language, TEXT_AT, next)) ? language.markRows : 0;
    return MARKED_PITCH + below;
  });
}

/** The units in view, each run of text units in a language with mark rows drawn as one block, whose lines share their mark rows. */
export function drawnUnits(inView: readonly (Element | string)[], language: TextLanguage): (Element | string)[] {
  if (language.markRows === 0) {
    return [...inView];
  }
  const drawn: (Element | string)[] = [];
  let lines: string[] = [];
  const flush = (): void => {
    if (lines.length > 0) {
      drawn.push(h(LinesBlock, { key: `lines ${drawn.length}`, lines: lines.map((text) => ({ foreground: Colour.White, text })) }));
      lines = [];
    }
  };
  for (const unit of inView) {
    if (typeof unit === "string") {
      lines.push(unit);
    } else {
      flush();
      drawn.push(unit);
    }
  }
  flush();
  return drawn;
}

/** Where each unit stands among the rows of all of them, and what fits in `shown` rows from each. */
export class UnitRows {
  /** The first row of each unit, then the rows of all of them. */
  readonly #starts: number[];
  readonly #shown: number;
  /** The last unit that may be the first shown: from it, every unit to the end is in view. */
  readonly last: number;

  /** `rows` is the rows each unit takes, in order; `shown` the rows the units are shown in. */
  constructor(rows: readonly number[], shown: number) {
    this.#shown = Math.max(1, shown);
    this.#starts = [0];
    for (const each of rows) {
      this.#starts.push((this.#starts.at(-1) ?? 0) + Math.max(1, each));
    }
    let last = rows.length;
    while (last > 0 && this.total - this.startOf(last - 1) <= this.#shown) {
      last -= 1;
    }
    // When even the last unit alone is taller than the view, it is the last first one, shown alone.
    this.last = Math.min(last, Math.max(0, rows.length - 1));
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
