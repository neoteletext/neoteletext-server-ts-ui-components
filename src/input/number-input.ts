// A number to set: its label, a "-" chip, the number, a "+" chip. Up and
// Down (or Left and Right), the wheel (up for more) or a click on a chip,
// each a control, step it; digits typed replace it (the page takes the
// digits), Backspace takes one back; a number out of range says so in red
// until it is put right, and is sent as invalid rather than as a change.

import type { Canvas } from "../core/canvas.ts";
import type { Size } from "../core/layout.ts";
import { isPress, type KeyEvent, type PointerEvent, type WheelEvent } from "../core/events.ts";
import { WheelLines } from "../core/list-cursor.ts";
import { digitOf } from "../core/keys.ts";
import { DISABLED, DISABLED_CHIP } from "../core/look.ts";
import type { PageNeeds } from "../core/needs.ts";
import { fit, padStart } from "../core/text.ts";
import { Colour, Key } from "../kit.ts";
import { type ValueProps, ValueControl, type ValueState, type KeyHelpEntry } from "./value-control.ts";

export interface NumberInputProps extends ValueProps<number> {
  readonly label: string;
  readonly min: number;
  readonly max: number;
  readonly step?: number;
}

interface NumberInputState extends ValueState<number> {
  /** The digits being typed, or null while it shows the value. */
  readonly typing: string | null;
}

/** The chips' text, and the number's cells between them. */
const MINUS = " - ";
const PLUS = " + ";
const NUMBER_CELLS = 7;

/**
 * The number `text` says. Backspace on a value shown as "1.5" or "1e+21"
 * leaves "1." or "1e+2", and what is read is the whole number before the
 * point or the exponent; "" and "-" are no number.
 */
function readNumber(text: string): number {
  // oxlint-disable-next-line unicorn/prefer-number-coercion -- the prefix reading is meant: Number("1e+2") is 100 and Number("") is 0, where the digits typed say 1 and nothing
  return Number.parseInt(text, 10);
}

function inkOf(disabled: boolean, valid: boolean): Colour {
  if (disabled) {
    return DISABLED;
  }
  return valid ? Colour.White : Colour.Red;
}

export class NumberInput extends ValueControl<number, NumberInputProps, NumberInputState> {
  override state: NumberInputState = { own: this.props.initial ?? this.props.min, typing: null };
  readonly #wheel = new WheelLines();

  protected empty(): number {
    return this.props.min;
  }

  protected override keyNeeds(): PageNeeds {
    return { digits: true };
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [
      ["Up Down or the wheel", "step"],
      ["digits", "type"],
      ["Backspace", "rubs out"],
    ];
  }

  #inRange(value: number): boolean {
    return Number.isInteger(value) && value >= this.props.min && value <= this.props.max;
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const chip = this.disabled ? DISABLED_CHIP.background : Colour.Cyan;
    const start = this.paintLabel(canvas);
    let column = canvas.chip(0, start, chip, Colour.Black, MINUS);
    if (!this.disabled) {
      canvas.chipControl(0, start, column, "minus");
    }
    const text = this.state.typing ?? String(this.value);
    const valid = this.#inRange(readNumber(text));
    canvas.coloured(0, column, inkOf(this.disabled, valid), padStart(text, NUMBER_CELLS - 2));
    const plusAt = column + NUMBER_CELLS - 1;
    column = canvas.chip(0, plusAt, chip, Colour.Black, PLUS);
    if (!this.disabled) {
      canvas.chipControl(0, plusAt, column, "plus");
    }
    if (!valid && column < canvas.width - 2) {
      canvas.coloured(0, column, Colour.Red, fit(`! ${this.props.min} to ${this.props.max}`, canvas.width - column - 1));
    }
  }

  #typed(text: string, session: number): void {
    this.setState({ typing: text });
    const value = readNumber(text);
    if (this.#inRange(value)) {
      this.change(value, session);
    } else if (text !== "") {
      this.emit({ type: "invalid", value, reason: `${this.props.min} to ${this.props.max}`, session, origin: "viewer" });
      this.play("error", session);
    }
  }

  #step(by: number, session: number): void {
    this.setState({ typing: null });
    this.change(Math.max(this.props.min, Math.min(this.props.max, this.value + by * (this.props.step ?? 1))), session);
  }

  override componentDidBlur(): void {
    this.setState({ typing: null });
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled || event.action === "release") {
      return false;
    }
    if (isPress(event, Key.Up) || isPress(event, Key.Right)) {
      this.#step(1, event.session);
      return true;
    }
    if (isPress(event, Key.Down) || isPress(event, Key.Left)) {
      this.#step(-1, event.session);
      return true;
    }
    if (isPress(event, Key.Backspace)) {
      this.#typed((this.state.typing ?? String(this.value)).slice(0, -1), event.session);
      return true;
    }
    const digit = digitOf(event);
    if (digit !== null) {
      // The first digit after a step starts a new number.
      this.#typed(`${this.state.typing ?? ""}${digit}`.slice(-(NUMBER_CELLS - 2)), event.session);
      return true;
    }
    return false;
  }

  override onClick(event: PointerEvent): boolean {
    if (event.region === "minus") {
      this.#step(-1, event.session);
    } else if (event.region === "plus") {
      this.#step(1, event.session);
    }
    return true;
  }

  /** A notch a step: the wheel turned up (dy negative) is more. */
  override onWheel(event: WheelEvent): boolean {
    if (this.disabled) {
      return false;
    }
    const notches = -this.#wheel.lines(event.dy);
    if (notches !== 0) {
      this.#step(notches, event.session);
    }
    return true;
  }
}
