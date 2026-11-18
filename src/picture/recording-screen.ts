// A screen that also keeps, cell by cell, the text written on it: what a
// picture page draws as text parts (renderer parity PAR-42, PAR-21). The
// kit's Screen gives its text back only as the protocol's runs, joined over
// spaces and over colours that change nothing, and a picture needs each
// cell's own: which run it belongs to, so that a run cut by a component's
// edge is written apart in each drawing. It keeps them as the kit's text
// runs do: a run in a script written right to left is one whole, cleared
// whole when any of its cells is written over, since the server orders it
// whole; a space of a run written left to right is no part of it.

import { COLUMNS, hasRightToLeft, type LanguageTag, ROWS, runText, Screen, textCells } from "../kit.ts";

/** One cell of text as written: its character with its marks, its run, the run's language and whether it came from outside the program. */
export interface WrittenText {
  readonly text: string;
  /** The run it was written in: the same number for every cell of one write. */
  readonly run: number;
  readonly language: LanguageTag | null;
  readonly outside: boolean;
  readonly rightToLeft: boolean;
}

/** A space, which every set shows alike: a run written left to right needs no part of it. */
const SPACE_CELL = " ";

/** The first row that carries text runs: row 0 is the header, the program's own codes (the kit's Screen.text). */
const FIRST_TEXT_ROW = 1;

export class RecordingScreen extends Screen {
  readonly #written: (WrittenText | null)[][] = Array.from({ length: ROWS }, () => Array.from({ length: COLUMNS }, () => null));
  #nextRun = 0;

  override codes(row: number, column: number, codes: readonly number[]): void {
    super.codes(row, column, codes);
    this.#clear(row, column, codes.length);
  }

  override text(row: number, column: number, text: string, language: LanguageTag | null = null, outside = false): void {
    super.text(row, column, text, language, outside);
    if (row < FIRST_TEXT_ROW || row >= ROWS) {
      return;
    }
    // As a run carries it: controls and format characters as spaces, in normalisation form C (PAR-21).
    const cells = textCells(text).map((cell) => runText(cell));
    this.#clear(row, column, cells.length);
    const run = this.#nextRun;
    this.#nextRun += 1;
    const rightToLeft = hasRightToLeft(cells.join(""));
    const line = this.#written[row];
    cells.forEach((cell, offset) => {
      const at = column + offset;
      if (line !== undefined && at >= 0 && at < COLUMNS && (rightToLeft || cell !== SPACE_CELL)) {
        line[at] = { text: cell, run, language, outside, rightToLeft };
      }
    });
  }

  /** The text written at `row`, `column` and not written over since, or null. */
  written(row: number, column: number): WrittenText | null {
    return this.#written[row]?.[column] ?? null;
  }

  /** Clears `count` cells from `column` of `row`, and the whole of any right-to-left run one of them belongs to, as the kit's runs are cleared. */
  #clear(row: number, column: number, count: number): void {
    const line = this.#written[row];
    if (line === undefined) {
      return;
    }
    const wholeRuns = new Set<number>();
    for (let at = Math.max(0, column); at < Math.min(COLUMNS, column + count); at += 1) {
      const cell = line[at];
      if (cell !== null && cell !== undefined && cell.rightToLeft) {
        wholeRuns.add(cell.run);
      }
      line[at] = null;
    }
    if (wholeRuns.size > 0) {
      line.forEach((cell, at) => {
        if (cell !== null && wholeRuns.has(cell.run)) {
          line[at] = null;
        }
      });
    }
  }
}
