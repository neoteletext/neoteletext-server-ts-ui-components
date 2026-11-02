// Input as components receive it: the server's events (docs/applications.md
// section 2), with the session they came from and, for the pointer, the
// wheel and a hover, the cell both on the page and inside the component's
// own box.

import { keyText, type Pointed } from "../kit.ts";

/** A key pressed, repeating or released. */
export interface KeyEvent {
  readonly session: number;
  readonly key: string;
  readonly action: "press" | "repeat" | "release";
  /** The modifier keys held, as the kit's `Mods` bits, when any is (DOC-1935): Control-C is the key `c` with `Mods.Control`. */
  readonly mods?: number;
  /** The text the press produced, if any (DOC-1935). */
  readonly text?: string;
  /** A release the page lost: the key did not come up, the viewer left (REQ-207). */
  readonly lost?: true;
}

/** Text typed or pasted. */
export interface TextEvent {
  readonly session: number;
  readonly text: string;
}

/** An input method's text as it stands while the viewer composes, `cursor` code points in; empty when composing ended (DOC-1969). What it commits comes as text, so nothing here is yet typed. */
export interface ComposeEvent {
  readonly session: number;
  readonly cursor: number;
  readonly text: string;
}

/** A cell, on the page and inside the component's box. */
export interface Cell {
  readonly row: number;
  readonly column: number;
  /** The cell relative to the box's top-left. */
  readonly local: { readonly row: number; readonly column: number };
  /** The region the component marked round the cell as it painted (canvas.ts), if any. */
  readonly region?: string;
}

/** The pointer pressed, moved or released on a cell, with the modifier keys held and the dot under it when the receiver sends them (the kit's `Pointed`, DOC-1946). */
export interface PointerEvent extends Cell, Pointed {
  readonly session: number;
  readonly action: "press" | "release" | "move";
  /** The button pressed or released, 0 left; on a move, the buttons held, a bit each. */
  readonly button: number;
  readonly buttons: number;
  /** A release the page lost: no click, the viewer left in the middle of a drag (REQ-207). */
  readonly lost?: true;
}

/** The wheel turned over a cell, in 1/120ths of a line, down positive, with what comes with the pointer. */
export interface WheelEvent extends Cell, Pointed {
  readonly session: number;
  readonly dx: number;
  readonly dy: number;
}

/**
 * The pointer came onto one of the page's controls, or went off it
 * (DOC-1940): the cell is the control's first, its
 * top-left, as the component declared it (canvas.ts, control). The browser
 * draws the control's look under the pointer itself; this is for what else
 * a hover changes, such as what the hint row says.
 */
export interface HoverEvent extends Cell {
  readonly session: number;
  /** True as the pointer comes onto the control, false as it leaves. */
  readonly entered: boolean;
}

/** A wheel's notch, in its units (DOC-1938). */
export const NOTCH = 120;

/** The text a key's press or repeat typed, if it typed any (the kit's {@link keyText}). */
export function typedText(event: KeyEvent): string | undefined {
  return keyText(event.action, event.text);
}

/** Whether `event` presses (or repeats) `key`. */
export function isPress(event: KeyEvent, key: string): boolean {
  return event.key === key && event.action !== "release";
}
