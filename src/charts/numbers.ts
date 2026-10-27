// The numbers a chart or a gauge is given, made safe to draw with: a
// series' least and most found by a loop, and a count of cells that can
// size an array.

/**
 * The least of `values`, exactly as Math.min(...values) is (NaN if any is
 * NaN, Infinity for none), but by a loop: spread, each value is an argument,
 * and past about 120,000 of them the call throws a RangeError.
 */
export function leastOf(values: readonly number[]): number {
  return values.reduce((least, value) => Math.min(least, value), Number.POSITIVE_INFINITY);
}

/** The most of `values`, exactly as Math.max(...values) is (-Infinity for none), by a loop for the same reason. */
export function mostOf(values: readonly number[]): number {
  return values.reduce((most, value) => Math.max(most, value), Number.NEGATIVE_INFINITY);
}

/**
 * A count of cells a program gives, such as a label's width: below nought
 * is nought, and so is NaN. A width taken off the canvas's is then never
 * more than the canvas, so an array it sizes is never refused (a length
 * past 2^32 - 1 throws a RangeError) or made huge.
 */
export function cellCount(cells: number): number {
  return Number.isNaN(cells) ? 0 : Math.max(0, cells);
}
