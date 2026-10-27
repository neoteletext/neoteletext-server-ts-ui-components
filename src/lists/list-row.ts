// A list's row as a component: the band, the mark and the colours every
// list's row has in each state (core/look.ts), and whatever the row holds,
// laid out from ITEM_TEXT: a line of text by default, or any components a
// list's user gives it. A row that can be pressed declares its band's cells
// as a control (core/controls.ts), which the browser lights as the pointer
// passes, and only a click there presses it: not one on its indent, a
// tree's guides or a control's label column. The pointer coming onto the
// band and leaving it (HOVER) is told to the list, for showing what the
// row is before it is chosen, and a row may say what it is on the hint
// row while the pointer is on it. ListRows is a list's rows, as many as are
// shown from its top, each one a ListRow, so every list chooses,
// highlights, takes clicks and hears the pointer alike.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Box, type LayoutChild, type Size, stack } from "../core/layout.ts";
import { type Child } from "../core/element.ts";
import type { HoverEvent, PointerEvent } from "../core/events.ts";
import { CHOSEN, DISABLED, ITEM_TEXT, LABEL, MARK, SELECTED } from "../core/look.ts";
import type { Colour } from "../kit.ts";

/** A row's state, for what it holds to draw itself to match. */
export interface RowLook {
  readonly chosen: boolean;
  /** The list has the keys. */
  readonly focused: boolean;
  readonly disabled: boolean;
  /** On a band: the chosen row of the list with the keys. */
  readonly band: boolean;
  /** The foreground to draw in, to read on the band or off it. */
  readonly foreground: Colour;
}

export interface ListRowProps {
  readonly chosen: boolean;
  readonly focused: boolean;
  readonly disabled?: boolean;
  /** Its foreground off the band, LABEL when absent. */
  readonly foreground?: Colour;
  /** Rows it takes: 1 when absent. */
  readonly rows?: number;
  /** Cells before the row's band and mark: a tree's depth, a control's label column. */
  readonly indent?: number;
  /** What those cells hold: a tree's guide lines. */
  readonly before?: Child;
  /** What it holds, drawn to its look. */
  readonly content: (look: RowLook) => Child;
  readonly onPress?: (session: number) => void;
  /** The pointer came onto its band, or left it (`entered` false). */
  readonly onHover?: (entered: boolean, session: number) => void;
  /** What the hint row says while the pointer is on it: what the row is. */
  readonly hint?: string;
}

/** Where a row's content starts: on the cell before its text, which its content's colour takes. */
const CONTENT_AT = ITEM_TEXT - 1;

/** The region its band is. */
const BAND = "band";

/** A row's foreground in its state: the band's, the dimmed, the chosen, or its own. */
function foregroundOf(band: boolean, disabled: boolean, chosen: boolean, own: Colour): Colour {
  if (band) {
    return CHOSEN.foreground;
  }
  if (disabled) {
    return DISABLED;
  }
  return chosen ? SELECTED : own;
}

export class ListRow extends Component<ListRowProps> {
  get look(): RowLook {
    const { chosen, focused } = this.props;
    const disabled = this.props.disabled === true;
    const band = chosen && focused && !disabled;
    const foreground = foregroundOf(band, disabled, chosen, this.props.foreground ?? LABEL);
    return { chosen, focused, disabled, band, foreground };
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.props.rows ?? 1, space.height) };
  }

  get #indent(): number {
    return this.props.indent ?? 0;
  }

  override arrange(box: Box, children: readonly LayoutChild[]): void {
    const [first, ...rest] = children;
    const content = this.props.before === undefined ? children : rest;
    if (this.props.before !== undefined && first !== undefined) {
      first.place({ ...box, width: Math.min(box.width, this.#indent) });
    }
    const at = this.#indent + CONTENT_AT;
    stack({ ...box, column: box.column + at, width: Math.max(0, box.width - at) }, content);
  }

  override paint(canvas: Canvas): void {
    const look = this.look;
    if (look.band) {
      for (let row = 0; row < canvas.height; row += 1) {
        canvas.background(row, this.#indent, CHOSEN.background);
      }
    } else if (look.chosen) {
      canvas.coloured(0, this.#indent, SELECTED, MARK);
    }
    // Where its band is, or would be, on every row it takes: one control, its rows joined.
    if (this.props.onPress !== undefined && !look.disabled) {
      canvas.bandControl(0, this.#indent, canvas.height, BAND);
    }
  }

  override render(): Child {
    const content = this.props.content(this.look);
    return this.props.before === undefined ? content : [this.props.before, content];
  }

  override onClick(event: PointerEvent): boolean {
    if (this.props.disabled === true || this.props.onPress === undefined || event.region !== BAND) {
      return false;
    }
    this.props.onPress(event.session);
    return true;
  }

  override hint(): string | null {
    return this.props.hint ?? null;
  }

  override onHover(event: HoverEvent): boolean {
    if (this.props.onHover === undefined || event.region !== BAND) {
      return false;
    }
    this.props.onHover(event.entered, event.session);
    return true;
  }
}
