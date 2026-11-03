// The text a list's row holds by default (list-rows.ts): wrapped over the
// row's rows at word boundaries, the last cut with an ellipsis. Its
// leading spaces are kept, on every line: they stand for a mark the row
// does not have, a tree's leaf's or a toggle list's unstarred item's, so
// its text lines up with its siblings' after theirs.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { cells, fit, headline } from "../core/text.ts";
import type { Colour } from "../kit.ts";

export interface ItemTextProps {
  /** The text, wrapped over its rows at word boundaries, the last cut with an ellipsis. */
  readonly text: string;
  /** Its colour: the row's look's. */
  readonly foreground: Colour;
  /** Lines to wrap it over: 1 when absent. */
  readonly rows?: number;
  /** The rows from one line to the next: 1 when absent; in a language whose marks take the rows around its letters, two or three (list-rows.ts, ListPitch), its first line after its mark row. */
  readonly pitch?: number;
}

export class ItemText extends Component<ItemTextProps> {
  /** Each line has its mark rows where its language needs them (marks.ts). */
  override laysOutMarks(): boolean {
    return true;
  }

  get #lines(): number {
    return Math.max(1, this.props.rows ?? 1);
  }

  get #pitch(): number {
    return Math.max(1, this.props.pitch ?? 1);
  }

  /** Its lines' rows, and in a language with mark rows the rows above its first and below its last. */
  override measure(space: Size): Size {
    const { markRows } = this.language;
    return { width: space.width, height: Math.min((this.#lines - 1) * this.#pitch + 1 + 2 * markRows, space.height) };
  }

  override paint(canvas: Canvas): void {
    // Wrapping breaks at spaces and drops them, the leading ones too.
    const lead = /^ */u.exec(this.props.text)?.[0] ?? "";
    const width = canvas.width - 1;
    const lines = headline(this.props.text.slice(lead.length), width - cells(lead), this.#lines);
    lines.forEach((line, index) => {
      canvas.coloured(canvas.language.markRows + index * this.#pitch, 0, this.props.foreground, fit(`${lead}${line}`, width));
    });
  }
}
