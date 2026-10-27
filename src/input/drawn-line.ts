// A line of typing the server draws itself, for a field the receiver does
// not echo into (a text field's echo, text-field.ts, shows only what the
// receiver typed, and a letter chosen by a key's presses or a word checked
// against a dialog's is the server's): a prompt, the end of what is typed,
// so the cursor is always in sight, and a block for the cursor. And what of
// a viewer's typing such a field keeps.

import type { Canvas } from "../core/canvas.ts";
import { cells, CUT_MARK } from "../core/text.ts";
import { CONTROL_CHARACTER, type Colour, englishCodes, textColour } from "../kit.ts";

/** The prompt before what is typed, as a text field's. */
const PROMPT = "> ";

/** The cursor: the G0 set's last code, 0x7F, which every national option shows as a solid block (EN 300 706 Table 36). */
export const CURSOR_BLOCK = 0x7f;

/** The cells beyond the text: the ink's, the prompt's, the cursor's, and the box's last, which a band's Black Background may take. */
const LINE_CELLS = 1 + cells(PROMPT) + 1 + 1;

/** The characters of `text`, in whole code points. */
export function characters(text: string): string[] {
  return Array.from(text);
}

/** A character's most code units: one, or a surrogate pair. */
const MOST_UNITS = 2;

/** The first `most` characters of `text`, whole code points, read no further than they reach: a program's text is not taken on trust. */
export function firstCharacters(text: string, most: number): string[] {
  return characters(text.slice(0, MOST_UNITS * most)).slice(0, most);
}

/** The cells a drawn line from a column `width` cells before the box's end leaves for the text. */
function lineRoom(width: number): number {
  return Math.max(0, width - LINE_CELLS);
}

/** The end of `text` in `width` cells, the cut mark first when its start is cut: the cursor follows the end. */
function lastCells(text: string, width: number): string {
  if (cells(text) <= width) {
    return text;
  }
  const room = width - cells(CUT_MARK);
  if (room <= 0) {
    return "";
  }
  let kept = "";
  for (const character of characters(text).toReversed()) {
    if (cells(`${character}${kept}`) > room) {
      break;
    }
    kept = `${character}${kept}`;
  }
  return `${CUT_MARK}${kept}`;
}

/** Draws the prompt and `text` in `ink` from `column`, its end in sight, and the cursor's block after it when `cursor`. */
export function paintDrawnLine(canvas: Canvas, row: number, column: number, ink: Colour, text: string, cursor: boolean): void {
  const shown = lastCells(text, lineRoom(canvas.width - column));
  canvas.codes(row, column, [textColour(ink), ...englishCodes(`${PROMPT}${shown}`), ...(cursor ? [CURSOR_BLOCK] : [])]);
}

/**
 * The first `most` characters of `text` that are text, whole code points:
 * a control character is never text (INPUT.md section 5.3), typed or
 * pasted. It reads no further than it keeps, so a paste as long as the
 * server's line costs no more than the field holds.
 */
export function typedCharacters(text: string, most: number): string {
  let kept = "";
  let count = 0;
  for (const character of text) {
    if (count >= most) {
      break;
    }
    if (!CONTROL_CHARACTER.test(character)) {
      kept += character;
      count += 1;
    }
  }
  return kept;
}
