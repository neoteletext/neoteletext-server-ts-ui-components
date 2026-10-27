// FastextBar: split from frame.ts; the comments pass writes this file's header.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { cells } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { type Prompts } from "./frame.ts";

/** The Fastext colours, red to cyan (EN 300 706 clause 9.6). */
export const KEY_COLOURS = [Colour.Red, Colour.Green, Colour.Yellow, Colour.Cyan] as const;

/** The cells between prompts: the next prompt's colour and a space. */
const PROMPT_GAP = 2;

export interface FastextBarProps {
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

/** Row 24: the four prompts in their colours. Clicking a prompt follows its link (the kit's navigation). */
export class FastextBar extends Component<FastextBarProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const columns = promptColumns(this.props.prompts);
    this.props.prompts.forEach(([label], index) => {
      const column = columns[index];
      const foreground = KEY_COLOURS[index];
      if (column !== null && column !== undefined && foreground !== undefined) {
        canvas.coloured(0, column, foreground, label);
      }
    });
  }
}
