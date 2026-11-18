// Input as components receive it: the server's events (DOC-1968)
//, with the connection they came from and, for the pointer, the
// wheel and a hover, the cell both on the page and inside the component's
// own box. And what of the pointer a component asks for: a page hears no
// input but what a rule of its table sends (neoteletext-common's
// docs/page-rules.md, RULE-50), and the library writes each page's table
// from what its components take (RULE-54, page-rules.ts).

import { keyText, type Pointed } from "../kit.ts";

/** A key pressed, repeating or released. */
export interface KeyEvent {
  readonly connection: number;
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
  readonly connection: number;
  readonly text: string;
}

/** An input method's text as it stands while the viewer composes, `cursor` code points in; empty when composing ended (DOC-1969). What it commits comes as text, so nothing here is yet typed. */
export interface ComposeEvent {
  readonly connection: number;
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
  readonly connection: number;
  readonly action: "press" | "release" | "move";
  /** The button pressed or released, 0 left; on a move, the buttons held, a bit each. */
  readonly button: number;
  readonly buttons: number;
  /** A release the page lost: no click, the viewer left in the middle of a drag (REQ-207). */
  readonly lost?: true;
}

/** The wheel turned over a cell, in 1/120ths of a line, down positive, with what comes with the pointer. */
export interface WheelEvent extends Cell, Pointed {
  readonly connection: number;
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
  readonly connection: number;
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

/**
 * Which of the pointer's moves a component takes: `none`; `held`, those
 * while a button is down, which a drag is made of; or `all`, every move
 * over its cells, a button held or not, as a brush that follows the
 * pointer needs.
 */
export type PointerMoves = "none" | "held" | "all";

/** What a component takes of the pointer on its own cells and those of the components under it. */
export interface PointerInput {
  /** A button or a finger going down: a click, the start of a drag, or the press that gives it the keys. */
  readonly press: boolean;
  /** The button coming up again, wherever the pointer then is. */
  readonly release: boolean;
  readonly moves: PointerMoves;
  /** The wheel turning over it. */
  readonly wheel: boolean;
}

/** Nothing of the pointer: what a component that only stops it, or only draws, asks for. */
export const NO_POINTER_INPUT: PointerInput = { press: false, release: false, moves: "none", wheel: false };

/** What a component's handlers show of it, and whether it takes the keys. */
interface Handlers {
  readonly onClick?: unknown;
  readonly onPointer?: unknown;
  readonly onWheel?: unknown;
  focusable(): boolean;
}

/**
 * What a component can take of the pointer, read from the handlers it has:
 * a press for `onClick`, `onPointer` or the keys, which a press gives it;
 * the release and every move over it for `onPointer`, which is offered each
 * of them; the wheel for `onWheel`. A component that takes less defines
 * `pointerInput` and says so: one that is only dragged answers `held` for
 * its moves.
 */
export function takenByHandlers(component: Handlers): PointerInput {
  const pointed = component.onPointer !== undefined;
  return {
    press: pointed || component.onClick !== undefined || component.focusable(),
    release: pointed,
    moves: pointed ? "all" : "none",
    wheel: component.onWheel !== undefined,
  };
}
