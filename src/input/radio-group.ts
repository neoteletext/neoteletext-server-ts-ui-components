// A radio group: one of several, "(*)" for the one chosen and "( )" for the
// rest, so it shows without colour; down a column or across a row, after
// its label, the options that do not fit on the row going on under the
// first, so every option shows. Up and Down (Left and Right across) move
// the choice itself, as radio buttons do; a click on an option chooses it.
// Each option's mark and text is a control.

import type { Canvas } from "../core/canvas.ts";
import type { Size } from "../core/layout.ts";
import type { KeyEvent, PointerEvent } from "../core/events.ts";
import { DISABLED, FOCUSED_LABEL, LABEL } from "../core/look.ts";
import { cells, fit } from "../core/text.ts";
import { type Colour, Key } from "../kit.ts";
import { keyStep } from "./key-step.ts";
import { type ValueProps, ValueControl, type KeyHelpEntry } from "./value-control.ts";

export interface RadioGroupProps extends ValueProps<number> {
  /** The options, in order; the value is the chosen one's place. */
  readonly items: readonly string[];
  /** The options across after the label, wrapped onto the rows under as the row is filled, Left and Right moving the choice; down a column when absent. */
  readonly across?: boolean;
}

/** The space between options across a row. */
const GAP = 1;

function option(text: string, chosen: boolean): string {
  return `${chosen ? "(*)" : "( )"} ${text}`;
}

/** Where an option is drawn: its row and the column of its colour's cell. */
interface Place {
  readonly row: number;
  readonly column: number;
}

/**
 * Where each option goes across a row `width` wide from `first`, its
 * colour's cell and its text, and the next row from `first` again once the
 * row has no room for it, so none runs off the edge. An option the row
 * cannot hold even alone is cut, on a row of its own. The chosen mark is
 * as wide as the other, so where they go does not move with the choice.
 */
function placesAcross(items: readonly string[], first: number, width: number): Place[] {
  let row = 0;
  let column = first;
  return items.map((text) => {
    const cellsTaken = 1 + cells(option(text, false));
    if (column > first && column + cellsTaken > width) {
      row += 1;
      column = first;
    }
    const place = { row, column };
    column += cellsTaken + GAP;
    return place;
  });
}

export class RadioGroup extends ValueControl<number, RadioGroupProps> {
  protected empty(): number {
    return 0;
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [[this.props.across === true ? "Left Right" : "Up Down", "choose"]];
  }

  #places(width: number): Place[] {
    return this.props.across === true
      ? placesAcross(this.props.items, this.labelCells, width)
      : this.props.items.map((_, index) => ({ row: index, column: this.labelCells }));
  }

  override measure(space: Size): Size {
    const rows = (this.#places(space.width).at(-1)?.row ?? 0) + 1;
    return { width: space.width, height: Math.min(space.height, rows) };
  }

  #ink(chosen: boolean): Colour {
    if (this.disabled) {
      return DISABLED;
    }
    return chosen && this.focused ? FOCUSED_LABEL : LABEL;
  }

  override paint(canvas: Canvas): void {
    this.paintLabel(canvas);
    const places = this.#places(canvas.width);
    this.props.items.forEach((text, index) => {
      const chosen = index === this.value;
      const { row, column } = places[index] ?? { row: index, column: this.labelCells };
      const shown = fit(option(text, chosen), canvas.width - column - 1);
      canvas.coloured(row, column, this.#ink(chosen), shown);
      if (!this.disabled) {
        // The option's text, after its colour's cell.
        canvas.control(row, column + 1, cells(shown), 1, String(index));
      }
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
