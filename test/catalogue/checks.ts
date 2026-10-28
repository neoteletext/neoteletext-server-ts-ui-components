// What the gate checks of every example's page, cell by cell (cells.ts):
// only attributes a level 1 decoder acts on, since a page must read on
// one; nothing drawn in its own background's colour, which no one can see;
// nothing drawn in a colour too close to its background's to read; and no
// text cut short with the cut mark, which says it did not fit. And, for
// the picture's review rather than the gate, the places a row's
// attributes may show as gaps: a space in a run of mosaics, a cell of
// black in a band.

import { CUT_MARK } from "../../src/index.ts";
import { type Cell, cellsOf, inks } from "./cells.ts";

/** Each colour's red, green and blue, 0 or 1: level 1's eight (EN 300 706 Table 26). */
const RGB: readonly (readonly [number, number, number])[] = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
];
/** Relative luminance's weights and the contrast ratio's flare (WCAG 2.2, "relative luminance" and "contrast ratio"). */
const LUMA = [0.2126, 0.7152, 0.0722] as const;
const FLARE = 0.05;
/**
 * The least contrast read as text. Lower than WCAG's 3:1 for large text,
 * since teletext's characters are large and its dimmest foreground, blue
 * on black (2.4:1), is the library's disabled look on purpose; yellow on
 * white (1.07:1) or green on cyan (1.09:1) fall far below it.
 */
const LEAST_CONTRAST = 2;

function luminance(colour: number): number {
  const rgb = RGB[colour] ?? [0, 0, 0];
  return rgb.reduce((sum, channel, index) => sum + channel * (LUMA[index] ?? 0), 0);
}

/** The contrast of two colours, 1 (the same) to 21 (black and white). */
export function contrast(a: number, b: number): number {
  const [light, dark] = [luminance(a), luminance(b)].toSorted((x, y) => y - x);
  return ((light ?? 0) + FLARE) / ((dark ?? 0) + FLARE);
}

/** A finding: where, and what. */
export interface Finding {
  readonly row: number;
  readonly column: number;
  readonly what: string;
}

const COLOUR_NAMES = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"] as const;
const name = (colour: number): string => COLOUR_NAMES[colour] ?? String(colour);

/**
 * The attributes Table 26 gives no response at Levels 1 and 1.5 (EN 300
 * 706 clause 12.2): alpha black, double width, double size, mosaic black.
 * A level 1 decoder shows each as a space and keeps the colour or size
 * before it, so a row that needs one misreads there; a page's level 2.5
 * look goes in its enhancement data, over level 1 rows that read alone.
 */
const LEVEL_25_ONLY: ReadonlyMap<number, string> = new Map([
  [0x00, "alpha black"],
  [0x0e, "double width"],
  [0x0f, "double size"],
  [0x10, "mosaic black"],
]);

/** Where `row` shows the cut mark, or -1: its two dots alone, not an ellipsis's three. */
function cutAt(row: string): number {
  for (let at = row.indexOf(CUT_MARK); at >= 0; at = row.indexOf(CUT_MARK, at + 1)) {
    if (row[at - 1] !== "." && row[at + CUT_MARK.length] !== ".") {
      return at;
    }
  }
  return -1;
}

/** What the gate fails an example for, row by row of `rows` (each a string of codes). */
export function gateFindings(rows: readonly string[], allowCut: boolean, allowContrast: boolean): Finding[] {
  const findings: Finding[] = [];
  rows.forEach((row, at) => {
    cellsOf(row).forEach((cell, column) => {
      const level25 = LEVEL_25_ONLY.get(cell.code);
      if (level25 !== undefined) {
        findings.push({ row: at, column, what: `${level25}: Level 2.5 only, no response at Level 1 (EN 300 706 Table 26)` });
      }
      if (!inks(cell)) {
        return;
      }
      if (cell.foreground === cell.background) {
        findings.push({ row: at, column, what: `drawn ${name(cell.foreground)} on ${name(cell.background)}: unseen` });
      } else if (!allowContrast && !cell.mosaic && contrast(cell.foreground, cell.background) < LEAST_CONTRAST) {
        findings.push({ row: at, column, what: `${name(cell.foreground)} on ${name(cell.background)}: too close to read` });
      }
    });
    const cut = cutAt(row);
    if (!allowCut && cut >= 0) {
      findings.push({ row: at, column: cut, what: "cut short: it did not fit" });
    }
  });
  return findings;
}

/** The longest run of black read as a hole in a band: the cells that end a background and start it again, and one between. Wider is a gap meant. */
const MOST_HOLE = 3;

/** Where in `cells` an attribute shows as a gap: a space between two inked mosaics, or a short run of black between two cells of one band. */
function gapsIn(cells: readonly Cell[]): { column: number; what: string }[] {
  const gaps: { column: number; what: string }[] = [];
  cells.forEach((here, column) => {
    const [left, right] = [cells[column - 1], cells[column + 1]];
    if (left?.mosaic === true && right?.mosaic === true && inks(left) && inks(right) && !inks(here)) {
      gaps.push({ column, what: "a space in a run of mosaics" });
    }
  });
  for (let start = 1; start < cells.length; start += 1) {
    const before = cells[start - 1];
    if (before === undefined || before.background === 0 || cells[start]?.background !== 0) {
      continue;
    }
    let end = start;
    while (end < cells.length && cells[end]?.background === 0 && !inks(cells[end] ?? before)) {
      end += 1;
    }
    if (end - start <= MOST_HOLE && cells[end]?.background === before.background) {
      gaps.push({ column: start, what: `black in a ${name(before.background)} band` });
    }
    start = end;
  }
  return gaps;
}

/** Where `rows` may show an attribute as a gap: for the picture's review. */
export function gapFindings(rows: readonly string[]): Finding[] {
  return rows.flatMap((row, at) => gapsIn(cellsOf(row)).map((gap) => ({ row: at, column: gap.column, what: gap.what })));
}
