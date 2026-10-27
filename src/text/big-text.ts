// Large text drawn in mosaic graphics, as large digits are
// (time/big-digits.ts) and in their size: letters A to Z, the digits and
// the common punctuation, five sixels by seven with a sixel between. Small
// letters are drawn as capitals; a character it has no letter for is a
// blank as wide as a letter, so what follows it stays in its place. Only
// the letters that fit the width are drawn, whole: a letter cut through
// would read as another.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { Colour, COLUMNS, Sixels, SIXELS_ACROSS } from "../kit.ts";
import { BIG_ROWS, DIGIT_GAP, DIGIT_HEIGHT, DIGIT_WIDTH, DIGITS } from "../time/big-digits.ts";

/** Each letter's rows of sixels, "#" set, as the digits' are; the digits, ":" and "-" are the large digits' own. */
export const BIG_LETTERS: Readonly<Record<string, readonly string[]>> = {
  ...DIGITS,
  A: ["#####", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: ["#####", "#....", "#....", "#....", "#....", "#....", "#####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: ["#####", "#....", "#....", "#.###", "#...#", "#...#", "#####"],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  J: ["....#", "....#", "....#", "....#", "#...#", "#...#", "#####"],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: ["#####", "#...#", "#...#", "#...#", "#...#", "#...#", "#####"],
  P: ["#####", "#...#", "#...#", "#####", "#....", "#....", "#...."],
  Q: ["#####", "#...#", "#...#", "#...#", "#.#.#", "#..#.", "###.#"],
  R: ["#####", "#...#", "#...#", "#####", "#.#..", "#..#.", "#...#"],
  // Rounded, unlike the square 5 it would otherwise be.
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", "#####"],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  ".": [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
  ",": [".....", ".....", ".....", ".....", ".....", "..#..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": ["#####", "....#", "....#", "..###", "..#..", ".....", "..#.."],
  ";": [".....", "..#..", "..#..", ".....", "..#..", "..#..", ".#..."],
  "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "(": ["...#.", "..#..", "..#..", "..#..", "..#..", "..#..", "...#."],
  ")": [".#...", "..#..", "..#..", "..#..", "..#..", "..#..", ".#..."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "%": ["##..#", "##..#", "...#.", "..#..", ".#...", "#..##", "#..##"],
  "#": [".#.#.", ".#.#.", "#####", ".#.#.", "#####", ".#.#.", ".#.#."],
  "*": [".....", "#.#.#", ".###.", "#####", ".###.", "#.#.#", "....."],
  _: [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
};

/** The sixels a letter and the gap after it take across. */
const LETTER_PITCH = DIGIT_WIDTH + DIGIT_GAP;

/**
 * The text a row can hold, in UTF-16 code units: no more than a row's
 * cells of letters ever fit, and a letter is at most two units, so this
 * many are always enough. Only these are read of a text that may be long.
 */
const MOST_READ = 2 * COLUMNS;

export interface BigTextProps {
  readonly text: string;
  readonly foreground?: Colour;
}

/** The letters that fit `cells` across: the mosaic colour takes the first cell, and the last letter needs no gap after it. */
function lettersIn(cells: number): number {
  return Math.max(0, Math.floor(((cells - 1) * SIXELS_ACROSS + DIGIT_GAP) / LETTER_PITCH));
}

/** `text` in large mosaic letters, as many whole letters as fit the width. */
export class BigText extends Component<BigTextProps> {
  /** The letters of the text shown in `cells`, small letters as capitals. */
  #letters(cells: number): string[] {
    return Array.from(this.props.text.slice(0, MOST_READ).toUpperCase()).slice(0, lettersIn(cells));
  }

  #sixels(letters: readonly string[]): Sixels {
    // The gap after the last letter is not drawn, but keeps the width the large digits give the same text.
    const sixels = new Sixels(letters.length * LETTER_PITCH, DIGIT_HEIGHT);
    letters.forEach((letter, place) => {
      // A letter it has none for is left clear: a blank as wide as any.
      (BIG_LETTERS[letter] ?? []).forEach((pattern, y) => {
        Array.from(pattern).forEach((sixel, x) => {
          sixels.set(place * LETTER_PITCH + x, y, sixel === "#");
        });
      });
    });
    return sixels;
  }

  override measure(space: Size): Size {
    const across = this.#letters(space.width).length * LETTER_PITCH;
    return { width: Math.min(space.width, Math.ceil(across / SIXELS_ACROSS) + 1), height: Math.min(BIG_ROWS, space.height) };
  }

  override paint(canvas: Canvas): void {
    canvas.sixels(0, 1, this.props.foreground ?? Colour.White, this.#sixels(this.#letters(canvas.width)));
  }
}
