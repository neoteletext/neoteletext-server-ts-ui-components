// A list to choose from: the chosen item on the band while the list has the
// keys (core/look.ts), moved with the keys (core/list-cursor.ts), the
// wheel, the scroll bar or a click, and chosen with Enter, Space or a click,
// which sends activate up the tree. Its items are anything: each row is a
// ListRow (list-row.ts), holding the item's text or what `render` makes of
// it, a control the browser lights as the pointer passes, and the pointer
// coming onto a row is told to the list's user (onHover); a row may say
// what it is on the hint row meanwhile (itemHint). Told to pick by key,
// the rows shown are numbered and a digit chooses one, or the first four
// are lettered for the coloured keys (R G Y C), each in its key's colour,
// and a coloured key chooses one (key-picks.ts).

import type { Size } from "../core/layout.ts";
import { type Child, h } from "../core/element.ts";
import type { KeyEvent, WheelEvent } from "../core/events.ts";
import { choosing } from "../core/keys.ts";
import { followItem, keepInView, listStep, moveChoice, WheelLines } from "../core/list-cursor.ts";
import { Control, type ControlProps, type KeyHelpEntry, type PageNeeds } from "../input/control.ts";
import { Columns } from "../layout/columns.ts";
import { digitMark, type KeyPick, keyLetters, pickBindings, pickedPlace } from "./key-picks.ts";
import { ListRows, type RowLook, within } from "./list-rows.ts";
import { BAR_CELLS, ScrollBar } from "./scroll.ts";

export interface ChoiceListProps<T = string> extends ControlProps {
  /** The items, in order: as many as fit `shown` at once, scrolled to keep the chosen one in view. */
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
  /** What an empty list says; "nothing to choose" when absent. */
  readonly empty?: string;
  /** What tells one item from another, so the chosen item stays chosen as items come and go: a live list. */
  readonly itemKey?: (item: T) => string;
  /** The rows shown chosen by a digit, numbered 1 to 9, or by a coloured key, lettered in its colour; the page then takes those keys. Digits show on rows drawn as text; letters show on every row, before its band. */
  readonly pick?: KeyPick;
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

  override keyBindings(): readonly KeyHelpEntry[] {
    return [["Up Down, wheel or click", "move"], ["Enter", "chooses"], ...pickBindings(this.props.pick)];
  }

  protected override keyNeeds(): PageNeeds {
    return { digits: this.props.pick === "digits", colourKeys: this.props.pick === "colours" };
  }

  /** The item a key picks among those shown, or null. */
  #picked(event: KeyEvent): number | null {
    const place = pickedPlace(this.props.pick, event);
    const index = place === null ? -1 : this.state.top + place;
    return index >= 0 && index < Math.min(this.props.items.length, this.state.top + this.#fit) ? index : null;
  }

  /** The items changed under the chosen one: it stays chosen where it went, when its key says which it is. */
  override componentDidUpdate(previous: Readonly<ChoiceListProps<T>>): void {
    const followed = followItem(previous.items, this.props.items, this.state.chosen, this.props.itemKey);
    if (followed !== null && followed !== this.state.chosen) {
      this.setState({ chosen: followed, top: keepInView(this.state.top, followed, this.#fit, this.props.items.length) });
    }
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
        ...keyLetters(this.props.pick, this.state.top, () => this.disabled),
        ...(this.props.pick !== "digits" && this.props.text === undefined
          ? {}
          : { text: (item: T, index: number) => `${digitMark(this.props.pick, index - this.state.top)}${this.props.text?.(item, index) ?? String(item)}` }),
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
    const picked = this.#picked(event);
    if (picked !== null) {
      this.#choose(picked, event.session);
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
