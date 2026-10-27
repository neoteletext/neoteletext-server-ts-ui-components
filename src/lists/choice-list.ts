// A list to choose from: the chosen item on the band while the list has the
// keys (core/look.ts), moved with the keys (core/list-cursor.ts), the
// wheel, the scroll bar or a click, and chosen with Enter, Space or a click,
// which sends activate up the tree. Its items are anything: each row is a
// ListRow (list-row.ts), holding the item's text or what `render` makes of
// it, a control the browser lights as the pointer passes, and the pointer
// coming onto a row is told to the list's user (onHover); a row may say
// what it is on the hint row meanwhile (itemHint).

import type { Size } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import type { KeyEvent, WheelEvent } from "../core/events.ts";
import { choosing } from "../core/keys.ts";
import { keepInView, listStep, moveChoice, WheelLines } from "../core/list-cursor.ts";
import { Control, type ControlProps } from "../input/control.ts";
import { Columns } from "../layout/columns.ts";
import type { RowLook } from "./list-row.ts";
import { ListRows, within } from "./list-rows.ts";
import { BAR_CELLS, ScrollBar } from "./scroll.ts";

export interface ChoiceListProps<T = string> extends ControlProps {
  readonly items: readonly T[];
  /** What an item's row holds, drawn to the row's look: its text when absent. */
  readonly render?: (item: T, look: RowLook, index: number) => Child;
  /** An item's text, for the default row: the item itself when it is text. */
  readonly text?: (item: T, index: number) => string;
  /** The rows it shows. */
  readonly shown: number;
  /** Rows each item takes: 1, or 2 for headlines. */
  readonly itemRows?: number;
  /** Enter on an item, or a click on it. */
  readonly onChoose: (index: number, session: number) => void;
  /** The chosen item moved: for showing what it is beside the list. */
  readonly onMove?: (index: number, session: number) => void;
  /** The pointer came onto an item's row, or left it (null): for showing what it is before it is chosen. Moving from one row to the next is a leave, then an enter. */
  readonly onHover?: (index: number | null, session: number) => void;
  /** What the hint row says of an item while the pointer is on its row, such as who wrote it; null for the list's own hint. */
  readonly itemHint?: (item: T, index: number) => string | null;
  /** The item chosen to begin with. */
  readonly initial?: number;
  readonly empty?: string;
}

interface ChoiceListState {
  readonly chosen: number;
  readonly top: number;
}

export class ChoiceList<T = string> extends Control<ChoiceListProps<T>, ChoiceListState> {
  override state: ChoiceListState = { chosen: this.props.initial ?? 0, top: 0 };
  readonly #wheel = new WheelLines();

  get #itemRows(): number {
    return this.props.itemRows ?? 1;
  }

  /** The items that fit in the rows it shows. */
  get #fit(): number {
    return Math.max(1, Math.floor(this.props.shown / this.#itemRows));
  }

  /** The chosen item, kept to the items there are now: its user may take some away, or begin it past them (initial). */
  get #chosen(): number {
    return within(this.state.chosen, this.props.items.length);
  }

  protected override keysHint(): string {
    return "Up Down, wheel or click; Enter chooses";
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.props.shown, space.height) };
  }

  /** Moves the band to `index`, telling the list's user, as the keys do. */
  #moveTo(index: number, session: number): void {
    const previous = this.#chosen;
    this.setState({ chosen: index, top: keepInView(this.state.top, index, this.#fit, this.props.items.length) });
    if (index !== previous) {
      this.emit({ type: "change", value: index, previous, session, origin: "viewer" });
      this.props.onMove?.(index, session);
    }
  }

  /** A choice, by a key or a click, moves the band there first: what shows beside the list is then the item chosen. */
  #choose(index: number, session: number): void {
    this.#moveTo(index, session);
    this.activate(index, session);
    this.props.onChoose(index, session);
  }

  override render(): Child {
    return h(
      Columns,
      { widths: [null, BAR_CELLS] },
      h(ListRows<T>, {
        items: this.props.items,
        top: this.state.top,
        shown: this.#fit,
        chosen: this.#chosen,
        focused: this.focused,
        itemRows: this.#itemRows,
        empty: this.props.empty ?? "nothing to choose",
        ...(this.props.render === undefined ? {} : { render: this.props.render }),
        ...(this.props.text === undefined ? {} : { text: this.props.text }),
        disabled: () => this.disabled,
        onPick: (index: number, session: number) => {
          this.#choose(index, session);
        },
        ...(this.props.onHover === undefined ? {} : { onHover: this.props.onHover }),
        ...(this.props.itemHint === undefined ? {} : { itemHint: this.props.itemHint }),
      }),
      h(ScrollBar, {
        top: this.state.top,
        total: this.props.items.length,
        shown: this.#fit,
        disabled: this.disabled,
        onScroll: (top) => {
          this.setState({ top });
        },
      }),
    );
  }

  override onKey(event: KeyEvent): boolean {
    const count = this.props.items.length;
    if (count === 0 || this.disabled) {
      return false;
    }
    if (choosing(event)) {
      this.#choose(this.#chosen, event.session);
      return true;
    }
    const step = listStep(event, this.#fit);
    if (step === null) {
      return false;
    }
    this.#moveTo(moveChoice(this.#chosen, step, count), event.session);
    this.play("move", event.session);
    return true;
  }

  override onWheel(event: WheelEvent): boolean {
    if (this.disabled) {
      return false;
    }
    const last = Math.max(0, this.props.items.length - this.#fit);
    this.setState({ top: Math.max(0, Math.min(last, this.state.top + this.#wheel.lines(event.dy))) });
    return true;
  }
}
