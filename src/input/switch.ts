// A switch: a setting on or off, its label, then a chip saying ON on green
// or OFF on red, so the word says it as well as the colour. Enter, Space or
// a click on the chip, its control, turns it over.

import { type Canvas, CHIP_CELLS } from "../core/canvas.ts";
import type { Size } from "../core/layout.ts";
import type { KeyEvent, PointerEvent } from "../core/events.ts";
import { choosing } from "../core/keys.ts";
import { DISABLED_CHIP, inkOn } from "../core/look.ts";
import { Colour } from "../kit.ts";
import { type ValueProps, ValueControl, type KeyHelpEntry } from "./value-control.ts";

export interface SwitchProps extends ValueProps<boolean> {
  /** What it sets, in a column of its own: SWITCH_LABEL_CELLS wide unless labelCells says. */
  readonly label: string;
}

/** What the chip says, padded alike so it keeps its width. */
const OFF = "OFF";
const ON = "ON".padEnd(OFF.length);
/** A switch's label column is wider than other controls': settings have long names. */
const SWITCH_LABEL_CELLS = 24;
/** The region its chip is. */
const CHIP = "chip";

export class Switch extends ValueControl<boolean, SwitchProps> {
  protected empty(): boolean {
    return false;
  }

  protected override get labelCells(): number {
    return this.props.labelCells ?? SWITCH_LABEL_CELLS;
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [["Enter, Space or a click", "turns it over"]];
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  get #look(): { readonly background: Colour; readonly foreground: Colour } {
    if (this.disabled) {
      return DISABLED_CHIP;
    }
    return this.value ? { background: Colour.Green, foreground: inkOn(Colour.Green) } : { background: Colour.Red, foreground: inkOn(Colour.Red) };
  }

  override paint(canvas: Canvas): void {
    // In a narrow box the chip goes back over the label, its Black Background in the box's last cell at the latest.
    const at = Math.min(this.paintLabel(canvas), canvas.width - ON.length - CHIP_CELLS);
    const look = this.#look;
    const after = canvas.chip(0, at, look.background, look.foreground, this.value ? ON : OFF);
    if (!this.disabled) {
      canvas.chipControl(0, at, after, CHIP);
    }
  }

  override onKey(event: KeyEvent): boolean {
    if (!choosing(event) || this.disabled) {
      return false;
    }
    this.change(!this.value, event.session);
    return true;
  }

  override onClick(event: PointerEvent): boolean {
    if (event.region === CHIP) {
      this.change(!this.value, event.session);
    }
    return true;
  }
}
