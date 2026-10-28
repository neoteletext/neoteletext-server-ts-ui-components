// Lines of a document: an article's blocks laid out as coloured lines, and
// lines drawn as they are, a row each.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { paintEmpty } from "../core/look.ts";
import { fit, wrap } from "../core/text.ts";
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
}

/** Lines as they are, a row each. */
export class LinesBlock extends Component<LinesProps> {
  override measure(space: Size): Size {
    const rows = this.props.lines.length === 0 && this.props.empty !== undefined ? 1 : this.props.lines.length;
    return { width: space.width, height: Math.min(rows, space.height) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.lines.length === 0 && this.props.empty !== undefined) {
      paintEmpty(canvas, this.props.empty);
      return;
    }
    this.props.lines.forEach((line, row) => {
      if (line.text !== "") {
        canvas.coloured(row, 0, line.foreground, fit(line.text, canvas.width - 1));
      }
    });
  }
}
