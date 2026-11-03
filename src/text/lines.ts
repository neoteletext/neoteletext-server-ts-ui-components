// Lines of a document: an article's blocks laid out as coloured lines, and
// lines drawn as they are, a row each.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { paintEmpty } from "../core/look.ts";
import { leadCells, type TextLanguage } from "../core/language.ts";
import { layLines, type LineLayout, placed } from "../core/marks.ts";
import { cells, fit, wrap } from "../core/text.ts";
import { Colour } from "../kit.ts";

/** One block of an article: a paragraph, a heading, a quotation or code, or an item of a list. */
export interface Block {
  /** What it is: a paragraph in white, a heading in yellow, a quotation in cyan, or an item of a list, marked "*". */
  readonly kind: "paragraph" | "heading" | "quote" | "item";
  /** Its text, wrapped to the width. */
  readonly text: string;
}

/** A line of a document: its colour and text. */
export interface Line {
  /** Its colour. */
  readonly foreground: Colour;
  /** Its text: one row of it. */
  readonly text: string;
}

/** An item's mark, on its first line, and the indent of the lines after it: as wide as each other. */
const ITEM_MARK = "* ";
const ITEM_INDENT = "  ";

function blockColour(kind: Exclude<Block["kind"], "item">): Colour {
  if (kind === "heading") {
    return Colour.Yellow;
  }
  if (kind === "quote") {
    return Colour.Cyan;
  }
  return Colour.White;
}

/** Whether a blank line follows `block`: after every block but an item another item follows, so a list's items keep together and the list has one after it. */
function blankAfter(block: Block, next: Block | undefined): boolean {
  return !(block.kind === "item" && next?.kind === "item");
}

/** An article's blocks as lines of `width`: headings yellow, quotations cyan, items marked, a blank line after each block and after a list, none between its items. */
export function articleLines(blocks: readonly Block[], width: number): Line[] {
  const lines: Line[] = [];
  for (const [index, block] of blocks.entries()) {
    if (block.kind === "item") {
      for (const [at, line] of wrap(block.text, width - ITEM_MARK.length).entries()) {
        lines.push({ foreground: Colour.White, text: `${at === 0 ? ITEM_MARK : ITEM_INDENT}${line}` });
      }
    } else {
      const foreground = blockColour(block.kind);
      // A push each, not a spread: a block of a few hundred thousand lines would overflow the stack as arguments.
      for (const text of wrap(block.text, width)) {
        lines.push({ foreground, text });
      }
    }
    if (blankAfter(block, blocks[index + 1])) {
      lines.push({ foreground: Colour.White, text: "" });
    }
  }
  while (lines.length > 0 && lines.at(-1)?.text === "") {
    lines.pop();
  }
  return lines;
}

export interface LinesProps {
  /** The lines, a row each, cut to the width. */
  readonly lines: readonly Line[];
  /** What it says when there are no lines; nothing when absent. */
  readonly empty?: string;
  /** In double height (DEC-2222): each line a row more; single height on rows 22 to 24 and in Thai and Lao. */
  readonly doubleHeight?: boolean;
}

/** Lines as they are, a row each. */
export class LinesBlock extends Component<LinesProps> {
  /** Each line has its mark rows where its language needs them (marks.ts). */
  override laysOutMarks(): boolean {
    return true;
  }

  /** Its lines as drawn in `width`, each cut to it. */
  #shown(width: number): string[] {
    return this.props.lines.map((line) => fit(line.text, width - leadCells(this.props.doubleHeight === true)));
  }

  /** Where its lines go in `language`: a row each, two in double height, or with their mark rows (marks.ts). */
  #layout(shown: readonly string[], language: TextLanguage): LineLayout {
    const lead = leadCells(this.props.doubleHeight === true);
    return layLines(
      language,
      shown.map((line) => placed(language, lead, line)),
      this.props.doubleHeight === true,
    );
  }

  override measure(space: Size): Size {
    const rows = this.props.lines.length === 0 && this.props.empty !== undefined ? 1 : this.#layout(this.#shown(space.width), this.language).height;
    return { width: space.width, height: Math.min(rows, space.height) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.lines.length === 0 && this.props.empty !== undefined) {
      paintEmpty(canvas, this.props.empty);
      return;
    }
    // A line a row, or two apart with their mark rows in a language whose marks take the rows around it; right to left, each flush with the right edge.
    const double = this.props.doubleHeight === true;
    const shown = this.#shown(canvas.width);
    const { rows } = this.#layout(shown, canvas.language);
    this.props.lines.forEach((line, index) => {
      const text = shown[index] ?? "";
      if (text !== "") {
        canvas.line(rows[index] ?? 0, canvas.start(cells(text) + leadCells(double)), line.foreground, text, double);
      }
    });
  }
}
