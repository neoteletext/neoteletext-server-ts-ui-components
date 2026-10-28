// A check box. Teletext has no box character, so a box is a chip (core/
// canvas.ts): a white band holding "x" when ticked, "-" when mixed,
// nothing when not, in its middle, so the state shows without colour. It is
// pressed with Enter, Space or a click; a box and its text are one
// control, and a click ticks only there. A group of boxes
// (checkbox-group.ts) draws each with drawBox.

import { centredOnChip, CHIP_CELLS, type Canvas, NEW_BACKGROUND_CELL } from "../core/canvas.ts";
import type { Size } from "../core/layout.ts";
import type { KeyEvent, PointerEvent } from "../core/events.ts";
import { choosing } from "../core/keys.ts";
import { CHOSEN, DISABLED, DISABLED_CHIP, inkOn, LABEL } from "../core/look.ts";
import { cells, fit } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { type ValueProps, ValueControl, type KeyHelpEntry } from "./value-control.ts";

export type Ticked = boolean | "mixed";

/** What the box holds for each state. */
const MARKS = { true: "x", false: " ", mixed: "-" } as const;

function markOf(ticked: Ticked): string {
  if (ticked === "mixed") {
    return MARKS.mixed;
  }
  return ticked ? MARKS.true : MARKS.false;
}

/** The region of a box on its own. */
const BOX = "box";

/**
 * Draws a box and its text from `column` in `width` cells: the text on the
 * band while `chosen`. A box that can be ticked is a control from its band
 * to the end of its text, and the region `id`.
 */
export function drawBox(
  canvas: Canvas,
  row: number,
  column: number,
  ticked: Ticked,
  text: string,
  look: { readonly chosen: boolean; readonly disabled: boolean },
  width: number,
  id: string,
): void {
  const after = canvas.chip(
    row,
    column,
    look.disabled ? DISABLED_CHIP.background : Colour.White,
    look.disabled ? DISABLED_CHIP.foreground : inkOn(Colour.White),
    centredOnChip(markOf(ticked)),
  );
  const room = width - (after - column) - 1;
  let end: number;
  if (look.chosen && !look.disabled) {
    // Up to the label's Black Background.
    end = canvas.chip(row, after, CHOSEN.background, CHOSEN.foreground, fit(text, room - CHIP_CELLS)) - 1;
  } else {
    const shown = fit(text, room);
    canvas.coloured(row, after, look.disabled ? DISABLED : LABEL, shown);
    end = after + 1 + cells(shown);
  }
  if (!look.disabled) {
    canvas.control(row, column + NEW_BACKGROUND_CELL, end - column - NEW_BACKGROUND_CELL, 1, id);
  }
}

export interface CheckboxProps extends ValueProps<Ticked> {
  /** The text beside the box, cut to its row. */
  readonly label: string;
}

export class Checkbox extends ValueControl<Ticked, CheckboxProps> {
  protected empty(): Ticked {
    return false;
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [["Enter, Space or a click", "ticks"]];
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    drawBox(canvas, 0, 0, this.value, this.props.label, { chosen: this.focused, disabled: this.disabled }, canvas.width, BOX);
  }

  override onKey(event: KeyEvent): boolean {
    if (!choosing(event) || this.disabled) {
      return false;
    }
    this.change(this.value !== true, event.session);
    return true;
  }

  override onClick(event: PointerEvent): boolean {
    if (event.region === BOX) {
      this.change(this.value !== true, event.session);
    }
    return true;
  }
}
