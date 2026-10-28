// Large text drawn in mosaic graphics, as large digits are
// (time/big-digits.ts), in their size and by their rules for fitting and
// drawing: letters A to Z, the digits and the common punctuation, five
// sixels by seven with a sixel between, below a clear row. Small letters
// are drawn as capitals; a character it has no letter for is a blank as
// wide as a letter, so what follows it stays in its place. Only the
// letters that fit the width are drawn, whole: a letter cut through would
// read as another.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { Colour } from "../kit.ts";
import { BIG_ROWS, bigCells, bigSixels, charactersIn, DIGITS, MOST_READ } from "../time/big-digits.ts";

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

export interface BigTextProps {
  /** The text, small letters as capitals; only as many whole letters as fit the width are drawn. */
  readonly text: string;
  /** The letters' colour; white when absent. */
  readonly foreground?: Colour;
}

/** `text` in large mosaic letters, as many whole letters as fit the width. */
export class BigText extends Component<BigTextProps> {
  /** The letters of the text shown in `cells`, small letters as capitals. */
  #letters(cells: number): string[] {
    return Array.from(this.props.text.slice(0, MOST_READ).toUpperCase()).slice(0, charactersIn(cells));
  }

  override measure(space: Size): Size {
    return { width: Math.min(space.width, bigCells(this.#letters(space.width).length)), height: Math.min(BIG_ROWS, space.height) };
  }

  override paint(canvas: Canvas): void {
    canvas.sixels(0, 1, this.props.foreground ?? Colour.White, bigSixels(this.#letters(canvas.width).map((letter) => BIG_LETTERS[letter])));
  }
}
