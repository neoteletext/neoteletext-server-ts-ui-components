// A radio group: one of several, "(*)" for the one chosen and "( )" for the
// rest, so it shows without colour; down a column or across a row, after
// its label. Up and Down (Left and Right across) move the choice itself, as
// radio buttons do; a click on an option chooses it. Each option's mark
// and text is a control.

import type { Canvas } from "../core/canvas.ts";
import type { Size } from "../core/layout.ts";
import type { KeyEvent, PointerEvent } from "../core/events.ts";
import { DISABLED, FOCUSED_LABEL, LABEL } from "../core/look.ts";
import { cells, fit } from "../core/text.ts";
import { type Colour, Key } from "../kit.ts";
import { keyStep } from "./key-step.ts";
import { type ValueProps, ValueControl, type KeyHelpEntry } from "./value-control.ts";

export interface RadioGroupProps extends ValueProps<number> {
  readonly items: readonly string[];
  readonly across?: boolean;
}

/** The space between options across a row. */
const GAP = 1;

function option(text: string, chosen: boolean): string {
  return `${chosen ? "(*)" : "( )"} ${text}`;
}

export class RadioGroup extends ValueControl<number, RadioGroupProps> {
  protected empty(): number {
    return 0;
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [[this.props.across === true ? "Left Right" : "Up Down", "choose"]];
  }

  override measure(space: Size): Size {
    const rows = this.props.across === true ? 1 : this.props.items.length;
    return { width: space.width, height: Math.min(space.height, rows) };
  }

  #ink(chosen: boolean): Colour {
    if (this.disabled) {
      return DISABLED;
    }
    return chosen && this.focused ? FOCUSED_LABEL : LABEL;
  }

  override paint(canvas: Canvas): void {
    const across = this.props.across === true;
    let column = across ? this.paintLabel(canvas) : 0;
    this.props.items.forEach((text, index) => {
      const chosen = index === this.value;
      const row = across ? 0 : index;
      const at = across ? column : this.labelCells;
      if (!across && index === 0) {
        this.paintLabel(canvas);
      }
      const shown = fit(option(text, chosen), canvas.width - at - 1);
      canvas.coloured(row, at, this.#ink(chosen), shown);
      if (!this.disabled) {
        // The option's text, after its colour's cell.
        canvas.control(row, at + 1, cells(shown), 1, String(index));
      }
      column = at + cells(shown) + 1 + GAP;
    });
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled) {
      return false;
    }
    const across = this.props.across === true;
    const step = across ? keyStep(event, Key.Right, Key.Left) : keyStep(event, Key.Down, Key.Up);
    if (step === 0) {
      return false;
    }
    this.change(Math.max(0, Math.min(this.props.items.length - 1, this.value + step)), event.session);
    return true;
  }

  override onClick(event: PointerEvent): boolean {
    if (event.region !== undefined) {
      this.change(Number(event.region), event.session);
    }
    return true;
  }
}
