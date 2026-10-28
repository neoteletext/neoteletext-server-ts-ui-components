// Large digits drawn in mosaic graphics, five sixels by seven, for counters:
// as many whole characters as fit the width, counted as characters, not as
// UTF-16's units, and no more of a long text read than a row can show. The
// seven rows sit below a clear one, in the nine of their three cells, so
// they stand apart from a band or a line directly above them. Large text
// (text/big-text.ts) fits and draws its letters by the same rules.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { COLUMNS, Colour, Sixels, SIXELS_ACROSS, SIXELS_DOWN } from "../kit.ts";

/** Each character's rows of sixels, "#" set; any other character is drawn as "-". Large text (text/big-text.ts) draws its digits from these too. */
export const DIGITS: Readonly<Record<string, readonly string[]>> = {
  "0": ["#####", "#...#", "#..##", "#.#.#", "##..#", "#...#", "#####"],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": ["#####", "....#", "....#", "#####", "#....", "#....", "#####"],
  "3": ["#####", "....#", "....#", ".####", "....#", "....#", "#####"],
  "4": ["#...#", "#...#", "#...#", "#####", "....#", "....#", "....#"],
  "5": ["#####", "#....", "#....", "#####", "....#", "....#", "#####"],
  "6": ["#####", "#....", "#....", "#####", "#...#", "#...#", "#####"],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": ["#####", "#...#", "#...#", "#####", "#...#", "#...#", "#####"],
  "9": ["#####", "#...#", "#...#", "#####", "....#", "....#", "#####"],
  ":": [".....", "..#..", "..#..", ".....", "..#..", "..#..", "....."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
};

/** A character's sixels across and down, its gap's across: large text's letters are sized alike. */
const DIGIT_WIDTH = 5;
const DIGIT_HEIGHT = 7;
/** The sixels between one character and the next. */
const DIGIT_GAP = 1;
/** The clear sixel rows above a character: without one, a character's top row would touch a band directly above it. */
const CLEAR_ABOVE = 1;

/** The rows large digits take: a clear sixel row and seven of the character, over three to a cell. */
export const BIG_ROWS = Math.ceil((CLEAR_ABOVE + DIGIT_HEIGHT) / SIXELS_DOWN);

/** The sixels a character and the gap after it take across. */
const PITCH = DIGIT_WIDTH + DIGIT_GAP;

/**
 * The text a row can hold, in UTF-16 code units: no more than a row's
 * cells of characters ever fit, and a character is at most two units, so
 * this many are always enough. Only these are read of a text that may be
 * long.
 */
export const MOST_READ = 2 * COLUMNS;

/** The characters that fit `cells` across: the mosaic colour takes the first cell, and the last character needs no gap after it. */
export function charactersIn(cells: number): number {
  return Math.max(0, Math.floor(((cells - 1) * SIXELS_ACROSS + DIGIT_GAP) / PITCH));
}

/** The cells `count` large characters take across, their mosaic colour's included. */
export function bigCells(count: number): number {
  return Math.ceil((count * PITCH) / SIXELS_ACROSS) + 1;
}

/**
 * `glyphs` side by side in sixels, each its rows of "#" set, below the
 * clear row. A glyph not given is left clear: a blank as wide as any. The
 * gap after the last is not drawn, but is kept in the width, so the same
 * text is as wide whichever of the two draws it.
 */
export function bigSixels(glyphs: readonly (readonly string[] | undefined)[]): Sixels {
  const sixels = new Sixels(glyphs.length * PITCH, BIG_ROWS * SIXELS_DOWN);
  glyphs.forEach((glyph, place) => {
    (glyph ?? []).forEach((pattern, y) => {
      Array.from(pattern).forEach((sixel, x) => {
        sixels.set(place * PITCH + x, CLEAR_ABOVE + y, sixel === "#");
      });
    });
  });
  return sixels;
}

export interface BigDigitsProps {
  /** What it shows: digits, ":" and "-", any other character drawn as "-"; only as many whole characters as fit the width are drawn. */
  readonly text: string;
  /** Its colour; green when absent. */
  readonly foreground?: Colour;
}

/** `text` in large mosaic digits, as many whole characters as fit the width. */
export class BigDigits extends Component<BigDigitsProps> {
  /** The characters of the text shown in `cells`. */
  #characters(cells: number): string[] {
    return Array.from(this.props.text.slice(0, MOST_READ)).slice(0, charactersIn(cells));
  }

  override measure(space: Size): Size {
    return { width: Math.min(space.width, bigCells(this.#characters(space.width).length)), height: Math.min(BIG_ROWS, space.height) };
  }

  override paint(canvas: Canvas): void {
    const glyphs = this.#characters(canvas.width).map((character) => DIGITS[character] ?? DIGITS["-"]);
    canvas.sixels(0, 1, this.props.foreground ?? Colour.Green, bigSixels(glyphs));
  }
}
