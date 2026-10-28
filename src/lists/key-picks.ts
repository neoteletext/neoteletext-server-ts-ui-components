// Choosing a list's rows by key (choice-list.ts): the rows shown are
// numbered and a digit chooses one, or the first four are lettered for the
// coloured keys (R G Y C) and a coloured key chooses one, so a remote
// reaches any row shown in one press. A key's letter is in its key's
// colour, and the letter says it too, for a viewer who cannot tell the
// colours apart. A colour costs a cell (EN 300 706 Table 26), and the
// letters' colours would not read on the chosen row's yellow band, so the
// letters stand in a column of their own before every row's band; a digit
// reads on the band, and stays before the row's text.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import type { KeyEvent } from "../core/events.ts";
import type { KeyHelpEntry } from "../core/key-bindings.ts";
import { COLOUR_KEY_NAMES, colourKeyOf, digitOf } from "../core/keys.ts";
import { type Size } from "../core/layout.ts";
import { DISABLED } from "../core/look.ts";
import { KEY_COLOURS } from "../frame/fastext-bar.ts";

/** How a list's rows are chosen by key: by a digit, or by a coloured key. */
export type KeyPick = "digits" | "colours";

/** The rows a digit picks among: one digit each, 1 to 9. */
const DIGIT_PICKS = 9;

/** The column before every row's band, picked by the coloured keys: a key's letter and the colour's cell before it. */
const KEY_LETTER_CELLS = 2;

/** What the keys help says of picking by `pick`. */
export function pickBindings(pick: KeyPick | undefined): KeyHelpEntry[] {
  if (pick === "digits") {
    return [["1-9", "chooses a row"]];
  }
  return pick === "colours" ? [["A coloured key", "chooses"]] : [];
}

/** The row among those shown, from the top, that `event` picks by `pick`, or null; it may be past the rows there are. */
export function pickedPlace(pick: KeyPick | undefined, event: KeyEvent): number | null {
  const digit = pick === "digits" ? digitOf(event) : null;
  if (digit !== null) {
    return digit >= 1 ? digit - 1 : null;
  }
  return pick === "colours" ? colourKeyOf(event) : null;
}

/** The mark before the text of the row `place` from the top, picked by `pick`: its digit; none past those, nor for the coloured keys. */
export function digitMark(pick: KeyPick | undefined, place: number): string {
  return pick === "digits" && place < DIGIT_PICKS ? `${place + 1} ` : "";
}

interface KeyLetterProps {
  /** The row's place from the top among those shown: its key's. */
  readonly place: number;
  /** The list cannot be used: the letter is dimmed with it. */
  readonly disabled: boolean;
}

/** A coloured key's letter, in its key's colour, before a row's band. */
class KeyLetter extends Component<KeyLetterProps> {
  override measure(space: Size): Size {
    return { width: Math.min(KEY_LETTER_CELLS, space.width), height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const name = COLOUR_KEY_NAMES[this.props.place];
    const colour = KEY_COLOURS[this.props.place];
    if (name !== undefined && colour !== undefined) {
      canvas.coloured(0, 0, this.props.disabled ? DISABLED : colour, name.charAt(0).toUpperCase());
    }
  }
}

/** The rows' indent and what stands in it, for a list's rows (list-rows.ts), when picked by the coloured keys: each of the first four's letter, `top` the first row shown. Every row is indented, so every item's text lines up; a row past the four has nothing before its band, and so is told apart from one a key picks. */
export function keyLetters(
  pick: KeyPick | undefined,
  top: number,
  disabled: () => boolean,
): { indent?: () => number; before?: (item: unknown, index: number) => Child } {
  if (pick !== "colours") {
    return {};
  }
  return {
    indent: () => KEY_LETTER_CELLS,
    before: (_item: unknown, index: number) => (index - top < COLOUR_KEY_NAMES.length ? h(KeyLetter, { place: index - top, disabled: disabled() }) : undefined),
  };
}
