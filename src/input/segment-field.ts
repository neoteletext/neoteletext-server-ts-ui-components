// Digits to a template, for a PIN, a date, a time or a code: each `9` of
// the template is a slot for a digit and every other character stands as it
// is ("99/99/9999", "99:99", "9999"). Digits, from the remote's keys or
// typed, fill the slots from the cursor on and pass over what stands
// between them; Backspace clears the slot before the cursor and goes back
// to it; Left and Right move from slot to slot, and a digit there replaces
// the one it has. An empty slot shows a fill character, so the field's
// width shows before anything is typed, and the cursor's slot a block, a
// mark under it too. Each segment, the slots between two separators, may be
// checked as it is filled (a month 1 to 12); a complaint shows under the
// field in red, as a text field's does. Enter sends activate with the
// template filled in, and only when every slot is filled and nothing is
// wrong; otherwise it is refused. Concealed, a filled slot shows `*`, so a
// PIN is never in the page sent to the receiver. Escape clears, or sends
// cancel when it is clear.

import type { Canvas } from "../core/canvas.ts";
import type { Size } from "../core/layout.ts";
import { isPress, type KeyEvent, type PointerEvent, type TextEvent } from "../core/events.ts";
import { digitOf } from "../core/keys.ts";
import { DISABLED } from "../core/look.ts";
import type { PageNeeds } from "../core/needs.ts";
import { fit } from "../core/text.ts";
import { Colour, Key, textColour } from "../kit.ts";
import { digitsOf, digitsTyped, filledText, firstEmpty, readTemplate, type Slot, type Template, templateCodes, valueOf } from "./segment-template.ts";
import { type ValueProps, ValueControl, type ValueState, type KeyHelpEntry } from "./value-control.ts";

export interface SegmentFieldProps extends ValueProps<string> {
  /** Where the digits go: each `9` a slot, every other character standing as it is. */
  readonly template: string;
  /** What is wrong with segment `segment` (from 0, left to right) now that its slots are all filled with `digits`, or null. */
  readonly check?: (segment: number, digits: string) => string | null;
  /** A filled slot shows `*`, not its digit: a PIN. */
  readonly conceal?: boolean;
  /** Its band's colour; blue when absent, black while disabled. */
  readonly background?: Colour;
  /** Enter with every slot filled and nothing wrong: the template filled in. */
  readonly onSubmit?: (filled: string, session: number) => void;
}

interface SegmentFieldState extends ValueState<string> {
  /** The slot the next digit goes in, from 0; the slots' count once past the last. */
  readonly at: number;
}

/** What marks the cursor's slot from the row under it: the English set's up arrow, at 0x5E (EN 300 706 Table 36). */
const UNDER_MARK = "↑";
/** The cells a background takes before the field: its colour and New Background. */
const BACKGROUND_CELLS = 2;
/** The region its band is. */
const FIELD = "field";

export class SegmentField extends ValueControl<string, SegmentFieldProps, SegmentFieldState> {
  override state: SegmentFieldState = {
    own: this.props.initial ?? "",
    at: firstEmpty(digitsOf(this.props.initial ?? "", readTemplate(this.props.template).slots)),
  };

  protected empty(): string {
    return "";
  }

  /** A page with digits to type takes the digits, or typing one would choose a page. */
  protected override keyNeeds(): PageNeeds {
    return { digits: true };
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [
      ["Digits", "fill"],
      ["Left Right", "move"],
      ["Enter", "sends"],
    ];
  }

  get #template(): Template {
    return readTemplate(this.props.template);
  }

  get #digits(): Slot[] {
    return digitsOf(this.value, this.#template.slots);
  }

  /** The cursor's slot, within the slots however the value came to change. */
  get #at(): number {
    return Math.max(0, Math.min(this.state.at, this.#template.slots));
  }

  /** What is wrong with the first segment that is filled and fails its check, or null. */
  get #segmentComplaint(): string | null {
    const { check } = this.props;
    if (check === undefined) {
      return null;
    }
    const digits = this.#digits;
    for (const [index, segment] of this.#template.segments.entries()) {
      const typed = segment.map((slot) => digits[slot] ?? null);
      if (typed.every((digit) => digit !== null)) {
        const complaint = check(index, typed.join(""));
        if (complaint !== null) {
          return complaint;
        }
      }
    }
    return null;
  }

  /** What is wrong, once anything is typed: a segment's check first, then the whole value's. */
  get #shownComplaint(): string | null {
    return this.value === "" ? null : (this.#segmentComplaint ?? this.complaint);
  }

  get #complete(): boolean {
    return this.#digits.every((digit) => digit !== null);
  }

  override measure(space: Size): Size {
    // The row under the field marks the cursor's slot, or says what is wrong.
    return { width: space.width, height: Math.min(2, space.height) };
  }

  override paint(canvas: Canvas): void {
    const field = this.paintLabel(canvas);
    canvas.background(0, field, this.disabled ? Colour.Black : (this.props.background ?? Colour.Blue));
    if (!this.disabled) {
      canvas.bandControl(0, field, 1, FIELD);
    }
    const cursor = this.focused && !this.disabled ? this.#at : null;
    const { codes, cursorAt } = templateCodes(this.#template, this.#digits, cursor, this.props.conceal === true);
    const at = field + BACKGROUND_CELLS;
    // The ink's cell, then the template, which stops before the band's end.
    canvas.codes(0, at, [textColour(this.disabled ? DISABLED : Colour.Yellow), ...codes].slice(0, Math.max(0, canvas.bandEnd - at)));
    const complaint = this.#shownComplaint;
    if (complaint !== null) {
      canvas.coloured(1, field, Colour.Red, fit(`! ${complaint}`, canvas.width - field - 1));
    } else if (cursorAt !== null) {
      // Under the slot: the mark's ink takes the cell under the field's.
      canvas.coloured(1, at + cursorAt, Colour.Yellow, UNDER_MARK);
    }
  }

  /** A press on the band has given it the keys already (core/mount.ts); the click is taken so it goes no further. */
  override onClick(event: PointerEvent): boolean {
    return !this.disabled && event.region === FIELD;
  }

  /** Puts `typed` digits in from the cursor on; one past the last slot is refused. */
  #fill(typed: readonly string[], session: number): void {
    const digits = this.#digits;
    let at = this.#at;
    for (const digit of typed) {
      if (at >= digits.length) {
        this.play("error", session);
        break;
      }
      digits[at] = digit;
      at += 1;
    }
    this.setState({ at });
    this.change(valueOf(digits), session);
  }

  #clear(session: number): void {
    this.setState({ at: 0 });
    this.change("", session);
  }

  #submit(session: number): void {
    if (!this.#complete || this.#shownComplaint !== null) {
      this.play("error", session);
      return;
    }
    const filled = filledText(this.#template, this.#digits);
    this.activate(filled, session);
    this.props.onSubmit?.(filled, session);
  }

  override onText(event: TextEvent): boolean {
    if (this.disabled) {
      return false;
    }
    this.#fill(digitsTyped(event.text), event.session);
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled || event.action === "release") {
      return false;
    }
    const digit = digitOf(event);
    if (digit !== null) {
      this.#fill([String(digit)], event.session);
      return true;
    }
    if (isPress(event, Key.Left)) {
      this.setState({ at: Math.max(0, this.#at - 1) });
      return true;
    }
    if (isPress(event, Key.Right)) {
      this.setState({ at: Math.min(this.#template.slots, this.#at + 1) });
      return true;
    }
    if (isPress(event, Key.Backspace)) {
      const back = this.#at - 1;
      if (back >= 0) {
        const digits = this.#digits;
        digits[back] = null;
        this.setState({ at: back });
        this.change(valueOf(digits), event.session);
      }
      return true;
    }
    if (isPress(event, Key.Escape)) {
      if (this.value === "") {
        this.cancel(event.session);
        return false;
      }
      this.#clear(event.session);
      return true;
    }
    if (isPress(event, Key.Enter)) {
      this.#submit(event.session);
      return true;
    }
    return false;
  }
}
