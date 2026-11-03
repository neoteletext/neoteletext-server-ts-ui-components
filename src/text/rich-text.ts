// Text in runs of their own styles, wrapped. A teletext row changes style
// only with spacing attributes, each taking a cell (EN 300 706 clause
// 12.2), so a change of style between words takes the space between them,
// and a change that needs more than one attribute (a background needs its
// colour, New Background and the ink) takes more cells, counted when the
// line is broken.

import type { Canvas, CanvasCell } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { Attribute, Colour, COLUMNS, textCells, SPACE, textColour } from "../kit.ts";
import { linePitch } from "../core/language.ts";

export interface RunStyle {
  /** Its colour; white when absent. */
  readonly foreground?: Colour;
  /** A background of its own; black when absent. */
  readonly background?: Colour;
  /** It flashes. */
  readonly flash?: boolean;
  /** Shown only when the viewer presses Reveal. */
  readonly conceal?: boolean;
}

/** Text in one style. */
export interface Run extends RunStyle {
  /** What it says, in its style. */
  readonly text: string;
}

interface Style {
  readonly foreground: Colour;
  readonly background: Colour;
  readonly flash: boolean;
  readonly conceal: boolean;
}

const PLAIN: Style = { foreground: Colour.White, background: Colour.Black, flash: false, conceal: false };

function styleOf(run: RunStyle): Style {
  return { foreground: run.foreground ?? Colour.White, background: run.background ?? Colour.Black, flash: run.flash === true, conceal: run.conceal === true };
}

/**
 * The attributes that change `from` to `to`, in the order a receiver needs
 * them: a background is set by its colour then New Background, so the ink
 * comes after; a colour code also ends concealment (Table 26).
 */
export function changes(from: Style, to: Style): number[] {
  const codes: number[] = [];
  if (to.background !== from.background) {
    codes.push(...(to.background === Colour.Black ? [Attribute.BlackBackground] : [textColour(to.background), Attribute.NewBackground]));
  }
  const inkChanged =
    to.foreground !== from.foreground || (to.background !== from.background && to.background !== Colour.Black) || (from.conceal && !to.conceal);
  if (inkChanged) {
    codes.push(textColour(to.foreground));
  }
  if (to.flash !== from.flash) {
    codes.push(to.flash ? Attribute.Flash : Attribute.Steady);
  }
  if (to.conceal && (!from.conceal || inkChanged)) {
    codes.push(Attribute.Conceal);
  }
  return codes;
}

interface Word {
  readonly codes: readonly CanvasCell[];
  readonly style: Style;
}

/** `runs` as words, each in its run's style. */
function words(runs: readonly Run[]): Word[] {
  return runs.flatMap((run) =>
    run.text
      .split(/\s+/u)
      .filter((word) => word !== "")
      .map((word) => ({ codes: textCells(word), style: styleOf(run) })),
  );
}

/**
 * The attributes a line starts a style with: what was before the box is
 * not known, so the ink is always set, and the line's first cell is its
 * colour, as every component's is.
 */
function startOf(style: Style): number[] {
  return [
    ...(style.background === Colour.Black ? [] : [textColour(style.background), Attribute.NewBackground]),
    textColour(style.foreground),
    ...(style.flash ? [Attribute.Flash] : []),
    ...(style.conceal ? [Attribute.Conceal] : []),
  ];
}

/** Lines of codes, each at most `width` cells: every attribute counted in the cell it takes. */
export function layoutRuns(runs: readonly Run[], width: number): CanvasCell[][] {
  const lines: CanvasCell[][] = [];
  let line: CanvasCell[] = [];
  let style = PLAIN;
  for (const word of words(runs)) {
    const between = changes(style, word.style);
    const gap = between.length === 0 ? [SPACE] : between;
    if (line.length > 0 && line.length + gap.length + word.codes.length > width) {
      lines.push(line);
      line = [];
    }
    const lead = line.length === 0 ? startOf(word.style) : gap;
    line.push(...lead, ...word.codes.slice(0, Math.max(0, width - line.length - lead.length)));
    style = word.style;
  }
  if (line.length > 0) {
    lines.push(line);
  }
  return lines;
}

export interface RichTextProps {
  /** The text, in runs of their own styles, wrapped to the box. */
  readonly runs: readonly Run[];
  /** At most this many lines. */
  readonly lines?: number;
  /** In double height (DEC-2222): each line a row more, Double Height in its first cell; single height on rows 22 to 24 and in Thai and Lao. */
  readonly doubleHeight?: boolean;
}

/** Runs of styled text, wrapped to the box. */
export class RichText extends Component<RichTextProps> {
  #lines(width: number): CanvasCell[][] {
    const lines = layoutRuns(this.props.runs, width - (this.props.doubleHeight === true ? 1 : 0));
    return this.props.lines === undefined ? lines : lines.slice(0, this.props.lines);
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.#lines(space.width).length * linePitch(this.language, this.props.doubleHeight === true), space.height) };
  }

  override paint(canvas: Canvas): void {
    const double = this.props.doubleHeight === true;
    const pitch = linePitch(canvas.language, double);
    this.#lines(canvas.width).forEach((line, index) => {
      const row = index * pitch + canvas.language.markRows;
      const codes = double && canvas.doubleHeightAllowed(row) ? [Attribute.DoubleHeight, ...line] : line;
      canvas.codes(row, 0, codes);
      // A background still on at the end of the line is ended in the box's last cell.
      if (canvas.box.column + canvas.width < COLUMNS && codes.includes(Attribute.NewBackground)) {
        canvas.code(row, canvas.width - 1, Attribute.BlackBackground);
      }
    });
  }
}
