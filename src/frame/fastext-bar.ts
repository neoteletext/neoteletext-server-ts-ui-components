// FastextBar: row 24 of the frame, the four Fastext prompts in their
// colours, and the pages they link to.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { cells } from "../core/text.ts";
import { Colour, type FastextLinks, type Language, pageText, textCells, textColour } from "../kit.ts";
import type { Prompt, Prompts } from "./frame.ts";

/** The Fastext colours, red to cyan (EN 300 706 clause 9.6). */
export const KEY_COLOURS = [Colour.Red, Colour.Green, Colour.Yellow, Colour.Cyan] as const;

/** The cells between prompts: the next prompt's colour and a space. */
const PROMPT_GAP = 2;

export interface FastextBarProps {
  /** The prompts, red to cyan, each in its colour: one with no label is not drawn and takes no cells, and past four none is drawn. */
  readonly prompts: Prompts;
}

/** Where each prompt's colour cell is on row 24, or null for an empty prompt. */
export function promptColumns(prompts: Prompts): (number | null)[] {
  let column = 0;
  return prompts.map(([label]) => {
    if (label === "") {
      return null;
    }
    const at = column;
    column += cells(label) + PROMPT_GAP;
    return at;
  });
}

function pageOf(prompt: Prompt | undefined): number | null {
  return prompt?.[1] ?? null;
}

/** The pages the prompts link to, as a sub-page's links: always four, whatever a page passed. */
export function fastextLinks(prompts: readonly Prompt[]): FastextLinks {
  return [pageOf(prompts[0]), pageOf(prompts[1]), pageOf(prompts[2]), pageOf(prompts[3])];
}

/**
 * What a prompt shows: its label, or in a language whose marks take the
 * rows around its letters, which row 24 has not (the server's
 * mark_rows_out_of_range), the page it leads to when the label has any
 * letter of that language's own.
 */
function shownLabel(label: string, page: number | null, language: Language): string {
  if (language.markRows === 0 || !/[^\u0020-\u007E]/u.test(label)) {
    return label;
  }
  return page === null ? "" : pageText(page);
}

/** Row 24: the four prompts in their colours. Clicking a prompt follows its link (the kit's navigation). */
export class FastextBar extends Component<FastextBarProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const columns = promptColumns(this.props.prompts);
    this.props.prompts.forEach(([label, page], index) => {
      const column = columns[index];
      const foreground = KEY_COLOURS[index];
      if (column !== null && column !== undefined && foreground !== undefined) {
        // The prompts are the way about the channel: never a stand-in (DEC-1987 item 6 keeps them the channel's words).
        canvas.asWritten(0, column, [textColour(foreground), ...textCells(shownLabel(label, page, canvas.language))]);
      }
    });
  }
}
