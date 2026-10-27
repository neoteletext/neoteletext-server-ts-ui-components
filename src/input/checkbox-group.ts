// CheckboxGroup: split from checkbox.ts; the comments pass writes this file's header.

import { type Canvas } from "../core/canvas.ts";
import type { Size } from "../core/component.ts";
import { isPress, type KeyEvent, type PointerEvent } from "../core/events.ts";
import { choosing } from "../core/keys.ts";
import { Key } from "../kit.ts";
import { type ValueProps, ValueControl, type ValueState } from "./value-control.ts";
import { drawBox } from "./checkbox.ts";

export interface CheckboxGroupProps extends ValueProps<readonly number[]> {
  readonly items: readonly string[];
  /** Items that cannot be changed. */
  readonly disabledItems?: readonly number[];
  /** Two columns, across then down. */
  readonly columns?: 1 | 2;
}

interface CheckboxGroupState extends ValueState<readonly number[]> {
  readonly chosen: number;
}

/** Several boxes, any of them ticked: a multiple choice. */
export class CheckboxGroup extends ValueControl<readonly number[], CheckboxGroupProps, CheckboxGroupState> {
  override state: CheckboxGroupState = { own: this.props.initial ?? [], chosen: 0 };

  protected empty(): readonly number[] {
    return [];
  }

  protected override keysHint(): string {
    return this.#columns > 1 ? "Arrows choose, Enter or Space ticks" : "Up Down choose, Enter or Space ticks";
  }

  get #columns(): number {
    return this.props.columns ?? 1;
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, Math.ceil(this.props.items.length / this.#columns)) };
  }

  override paint(canvas: Canvas): void {
    const across = Math.floor(canvas.width / this.#columns);
    this.props.items.forEach((item, index) => {
      const row = Math.floor(index / this.#columns);
      const column = (index % this.#columns) * across;
      const disabled = this.disabled || this.props.disabledItems?.includes(index) === true;
      drawBox(canvas, row, column, this.value.includes(index), item, { chosen: this.focused && index === this.state.chosen, disabled }, across, String(index));
    });
  }

  #toggle(index: number, session: number): void {
    if (this.props.disabledItems?.includes(index) === true || index < 0 || index >= this.props.items.length) {
      return;
    }
    this.setState({ chosen: index });
    this.change(this.value.includes(index) ? this.value.filter((item) => item !== index) : [...this.value, index].sort((a, b) => a - b), session);
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled) {
      return false;
    }
    if (choosing(event)) {
      this.#toggle(this.state.chosen, event.session);
      return true;
    }
    const columns = this.#columns;
    const step = isPress(event, Key.Down)
      ? columns
      : isPress(event, Key.Up)
        ? -columns
        : isPress(event, Key.Right) && columns > 1
          ? 1
          : isPress(event, Key.Left) && columns > 1
            ? -1
            : 0;
    if (step === 0) {
      return false;
    }
    this.setState({ chosen: Math.max(0, Math.min(this.props.items.length - 1, this.state.chosen + step)) });
    this.play("move", event.session);
    return true;
  }

  override onClick(event: PointerEvent): boolean {
    if (event.region !== undefined && !this.disabled) {
      this.#toggle(Number(event.region), event.session);
    }
    return true;
  }
}
