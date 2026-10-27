// The parts of a whole that a breakdown bar (breakdown-bar.ts) and a pie
// (pie-chart.ts) show, and the legend both draw: each part's mark in its
// colour, then its label and its share of the whole in white. A part is
// told by its mark as well as by its colour (core/look.ts), so the legend
// reads without colour, and a part too small to draw is still listed.

import type { Canvas } from "../core/canvas.ts";
import { LABEL } from "../core/look.ts";
import { fit, pad, padStart } from "../core/text.ts";
import { Colour, englishCodes, textColour } from "../kit.ts";

/** One part of a whole: what it is, how much of the whole, and how it is told from the others. */
export interface Share {
  readonly label: string;
  readonly value: number;
  readonly foreground?: Colour;
  /** The character that stands for it in the legend and on the chart; its letter, A for the first, when absent. */
  readonly mark?: string;
}

/**
 * The parts' colours in turn, when a part names none: every colour but
 * black, which would not show on the page's black, and blue last, the
 * dimmest on black (core/look.ts).
 */
const SHARE_COLOURS = [Colour.Red, Colour.Green, Colour.Yellow, Colour.Cyan, Colour.Magenta, Colour.White, Colour.Blue] as const;

/** The marks in turn, when a part names none: past Z they start again, and the legend's order still tells them apart. */
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** The cells a share takes at the end of a legend entry: "100%". */
const SHARE_CELLS = 4;

/** A legend entry's cells before its label: its mark's colour, its mark, and the label's colour. */
const ENTRY_LEAD_CELLS = 3;

/** The cell between a label and its share, so the two never run together. */
const SHARE_GAP_CELLS = 1;

/** A percentage below which a share that is not nothing would round to 0%. */
const LEAST_WHOLE_PERCENT = 0.5;

const PERCENT = 100;

/** How much of the whole a part's value counts for: one that is not a finite number, or is below nought, counts for none. */
export function amountOf(share: Share): number {
  return Number.isFinite(share.value) && share.value > 0 ? share.value : 0;
}

/** The whole the parts make, by a loop over their amounts. */
export function totalOf(shares: readonly Share[]): number {
  return shares.reduce((total, share) => total + amountOf(share), 0);
}

/** The colour of the part at `index`: its own, or the next of the turn. */
export function colourOf(share: Share, index: number): Colour {
  return share.foreground ?? SHARE_COLOURS[index % SHARE_COLOURS.length] ?? Colour.White;
}

/** The mark of the part at `index`, one cell: its own first character, or its letter. */
function markOf(share: Share, index: number): string {
  const own = share.mark === undefined ? "" : fit(share.mark, 1);
  return own === "" ? (LETTERS[index % LETTERS.length] ?? "?") : own;
}

/** The mark's one code, as a row holds it. */
export function markCode(share: Share, index: number): number {
  return englishCodes(markOf(share, index))[0] ?? englishCodes("?")[0] ?? 0;
}

/** `amount` of `total` as a whole percentage; a part that is something but rounds to nothing says so as "<1%". */
function percentText(amount: number, total: number): string {
  const percent = total > 0 ? (PERCENT * amount) / total : 0;
  return percent > 0 && percent < LEAST_WHOLE_PERCENT ? "<1%" : `${Math.round(percent)}%`;
}

/**
 * `cells` shared among `amounts` in proportion, every cell given, by the
 * largest remainder: each takes the whole cells of its quota, and the cells
 * left go to the largest fractions, the earlier part first on a tie. A
 * part whose quota is under a cell may take none.
 */
export function apportion(amounts: readonly number[], cells: number): number[] {
  const total = amounts.reduce((sum, amount) => sum + amount, 0);
  if (total <= 0 || cells <= 0) {
    return amounts.map(() => 0);
  }
  const quotas = amounts.map((amount) => (amount * cells) / total);
  const given = quotas.map((quota) => Math.floor(quota));
  const left = cells - given.reduce((sum, count) => sum + count, 0);
  const byFraction = quotas
    .map((quota, index) => ({ index, fraction: quota - Math.floor(quota) }))
    .toSorted((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of byFraction.slice(0, left)) {
    given[index] = (given[index] ?? 0) + 1;
  }
  return given;
}

/** The fewest cells an entry is worth drawing in: its lead, a character of its label, the gap and its share. */
const LEAST_ENTRY_CELLS = ENTRY_LEAD_CELLS + 1 + SHARE_GAP_CELLS + SHARE_CELLS;

/** The entries across a row of `width` cells: as many as are `wanted`, but never so many that one is too narrow to read, and at least one. */
export function legendAcross(wanted: number, width: number): number {
  return Math.max(1, Math.min(Number.isNaN(wanted) ? 1 : wanted, Math.floor(width / LEAST_ENTRY_CELLS)));
}

/** Where a legend is drawn: its top-left cell, its width, the entries wanted across a row and the rows it has. */
export interface LegendPlace {
  readonly row: number;
  readonly column: number;
  readonly width: number;
  readonly across: number;
  readonly rows: number;
}

/**
 * Draws the legend of `shares` at `place`, an entry each, along the rows:
 * its mark in its colour, its label, and its share right-aligned. When the
 * parts are more than the legend holds, its last entry says how many more.
 */
export function paintLegend(canvas: Canvas, place: LegendPlace, shares: readonly Share[]): void {
  const total = totalOf(shares);
  const across = legendAcross(place.across, place.width);
  const entryCells = Math.floor(place.width / across);
  const slots = Math.max(0, across * place.rows);
  const listed = shares.length > slots ? Math.max(0, slots - 1) : shares.length;
  const labelCells = entryCells - ENTRY_LEAD_CELLS - SHARE_CELLS;
  const at = (slot: number): { row: number; column: number } => ({
    row: place.row + Math.floor(slot / across),
    column: place.column + (slot % across) * entryCells,
  });
  shares.slice(0, listed).forEach((share, index) => {
    const { row, column } = at(index);
    const label = pad(fit(share.label, labelCells - SHARE_GAP_CELLS), labelCells);
    canvas.codes(row, column, [textColour(colourOf(share, index)), markCode(share, index), textColour(LABEL)]);
    canvas.text(row, column + ENTRY_LEAD_CELLS, `${label}${padStart(percentText(amountOf(share), total), SHARE_CELLS)}`);
  });
  if (listed < shares.length && slots > 0) {
    const { row, column } = at(listed);
    canvas.coloured(row, column, LABEL, fit(`and ${shares.length - listed} more`, entryCells - 1));
  }
}
