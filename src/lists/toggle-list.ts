// A list whose items are switched on and off, each marked with a star:
// Up and Down choose (core/list-cursor.ts), Enter, Space or a click
// switches one. Its value is the items on. Its rows are ListRows
// (list-row.ts), controls the browser lights as the pointer passes; the
// pointer coming onto one is told to the list's user (onHover).

import type { Size } from "../core/layout.ts";
import { type Child, h } from "../core/element.ts";
import type { KeyEvent } from "../core/events.ts";
import { choosing } from "../core/keys.ts";
import { listStep, moveChoice } from "../core/list-cursor.ts";
import { type ValueProps, ValueControl, type ValueState, type KeyHelpEntry } from "../input/value-control.ts";
import { ListRows, within } from "./list-rows.ts";

export interface ToggleListProps extends ValueProps<readonly number[]> {
  readonly items: readonly string[];
  readonly empty?: string;
  /** The pointer came onto an item's row, or left it (null): for showing what it is before it is chosen. Moving from one row to the next is a leave, then an enter. */
  readonly onHover?: (index: number | null, session: number) => void;
}

interface ToggleListState extends ValueState<readonly number[]> {
  readonly chosen: number;
}

export class ToggleList extends ValueControl<readonly number[], ToggleListProps, ToggleListState> {
  override state: ToggleListState = { own: this.props.initial ?? [], chosen: 0 };

  protected empty(): readonly number[] {
    return [];
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [
      ["Up Down", "choose"],
      ["Enter or a click", "stars"],
    ];
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(Math.max(1, this.props.items.length), space.height) };
  }

  /** The chosen item, kept to the items there are now: its user may take some away. */
  get #chosen(): number {
    return within(this.state.chosen, this.props.items.length);
  }

  #toggle(index: number, session: number): void {
    this.setState({ chosen: index });
    this.change(this.value.includes(index) ? this.value.filter((item) => item !== index) : [...this.value, index].toSorted((a, b) => a - b), session);
  }

  override render(): Child {
    return h(ListRows<string>, {
      items: this.props.items,
      shown: this.props.items.length,
      chosen: this.#chosen,
      focused: this.focused,
      empty: this.props.empty ?? "nothing to star",
      text: (item: string, index: number) => `${this.value.includes(index) ? "*" : " "} ${item}`,
      disabled: () => this.disabled,
      onPick: (index: number, session: number) => {
        this.#toggle(index, session);
      },
      ...(this.props.onHover === undefined ? {} : { onHover: this.props.onHover }),
    });
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled || this.props.items.length === 0) {
      return false;
    }
    if (choosing(event)) {
      this.#toggle(this.#chosen, event.session);
      return true;
    }
    const step = listStep(event, this.props.items.length);
    if (step === null) {
      return false;
    }
    this.setState({ chosen: moveChoice(this.#chosen, step, this.props.items.length) });
    this.play("move", event.session);
    return true;
  }
}
