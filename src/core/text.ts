// Text as a teletext row holds it: measured in the cells the server's
// encoder gives it, one a character with its marks (the kit's cellsOf),
// broken at spaces, cut between cells with a mark.

import { cellsOf, type Language, textCells } from "../kit.ts";

/** The cells `text` takes. */
export function cells(text: string): number {
  return cellsOf(text);
}

/** The cells of `text` from `from` to before `to`, joined: never a mark parted from its letter. */
function sliceCells(text: string, from: number, to?: number): string {
  return textCells(text).slice(from, to).join("");
}

/** `text` broken at spaces into lines of at most `width` cells; a word longer than a line is cut across lines. */
export function wrap(text: string, width: number): string[] {
  if (width <= 0) {
    return [];
  }
  const lines: string[] = [];
  let line = "";
  for (const found of text.split(/\s+/u)) {
    let word = found;
    if (word === "") {
      continue;
    }
    while (cells(word) > width) {
      if (line !== "") {
        lines.push(line);
        line = "";
      }
      lines.push(sliceCells(word, 0, width));
      word = sliceCells(word, width);
    }
    const candidate = line === "" ? word : `${line} ${word}`;
    if (cells(candidate) > width) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line !== "") {
    lines.push(line);
  }
  return lines;
}

/** The mark a text cut short ends with: full stops, which every language's sets have (the ellipsis is not in the English set). */
export const CUT_MARK = "..";

/** `text` cut to `width` cells, ending in the mark when cut. */
export function fit(text: string, width: number): string {
  if (cells(text) <= width) {
    return text;
  }
  return width <= CUT_MARK.length ? sliceCells(text, 0, Math.max(0, width)) : `${sliceCells(text, 0, width - CUT_MARK.length)}${CUT_MARK}`;
}

/** What ends a headline cut short. */
export const HEADLINE_CUT = "...";

/** A title on at most `most` lines of `width`, the last cut with an ellipsis, whole words first, when it runs over. */
export function headline(title: string, width: number, most: number): string[] {
  const lines = wrap(title, width);
  if (lines.length <= most) {
    return lines;
  }
  const kept = lines.slice(0, most);
  let last = kept.at(-1) ?? "";
  while (last !== "" && cells(`${last}${HEADLINE_CUT}`) > width) {
    last = last.includes(" ") ? last.slice(0, last.lastIndexOf(" ")) : sliceCells(last, 0, -1);
  }
  kept[kept.length - 1] = `${last.trimEnd()}${HEADLINE_CUT}`;
  return kept;
}

/** `text` padded with spaces, or cut, to exactly `width` cells. */
export function pad(text: string, width: number): string {
  const shown = fit(text, width);
  return shown + " ".repeat(Math.max(0, width - cells(shown)));
}

/** `text` right-aligned in `width` cells. */
export function padStart(text: string, width: number): string {
  const shown = fit(text, width);
  return " ".repeat(Math.max(0, width - cells(shown))) + shown;
}

/** The rows double height takes: its own and the row below (EN 300 706 clause 12.3). */
const DOUBLE_HEIGHT_ROWS = 2;

/** The rows one line takes in `language`: its own, two in double height; in a language whose marks take the rows around its letters (DEC-604, marks.ts) its own and those above and below it, never double height (DEC-2222). */
export function oneLineRows(language: Language, doubleHeight = false): number {
  if (language.markRows > 0) {
    return 1 + 2 * language.markRows;
  }
  return doubleHeight ? DOUBLE_HEIGHT_ROWS : 1;
}
