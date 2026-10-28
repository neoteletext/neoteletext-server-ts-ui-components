// A list that narrows as the viewer types (choice-list.ts under a line of
// what is typed): the items whose text holds what is typed, those that
// begin with it first, then those that hold it as a run, then those that
// hold its letters in order, as fuzzy finders rank them; case aside.
// Backspace rubs a letter out, Escape clears what is typed. Choosing an
// item says its place in the items given, not in the list narrowed. What
// is typed changing takes the choice to the top row, the best match, so
// Enter after typing chooses what the typing found; the list is made anew
// for it, its keys kept.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { isPress, type KeyEvent, type TextEvent } from "../core/events.ts";
import { fit } from "../core/text.ts";
import { Colour, Key } from "../kit.ts";
import { Rows } from "../layout/layouts.ts";
import { Text } from "../text/styles.ts";
import { ChoiceList } from "./choice-list.ts";

/** The most typed: a line's worth, and the bound on the matching's work. */
const MOST_TYPED = 38;

export interface FilterListProps<T> {
  /** The items to narrow: an item chosen is said by its place here. */
  readonly items: readonly T[];
  /** An item's text, which what is typed is found in. */
  readonly text: (item: T) => string;
  /** The rows of items shown, under the typed line. */
  readonly shown: number;
  /** What the typed line says while nothing is typed. */
  readonly prompt?: string;
  /** What it says when nothing matches; "nothing matches" when absent. */
  readonly empty?: string;
  /** An item chosen: its place in `items`. */
  readonly onChoose: (index: number, session: number) => void;
  /** Its list takes the keys when it arrives. */
  readonly autoFocus?: boolean;
}

interface FilterListState {
  readonly typed: string;
  /** How many times what is typed has changed: the list's key, so each change makes it anew, its choice on the top row. */
  readonly typings: number;
}

/** How well `text` matches `typed`: 0 begins with it, 1 holds it, 2 holds its letters in order, null not at all. */
export function matchRank(text: string, typed: string): number | null {
  const haystack = text.toLowerCase();
  const needle = typed.toLowerCase();
  if (haystack.startsWith(needle)) {
    return 0;
  }
  if (haystack.includes(needle)) {
    return 1;
  }
  let at = 0;
  for (const letter of needle) {
    at = haystack.indexOf(letter, at);
    if (at < 0) {
      return null;
    }
    at += 1;
  }
  return 2;
}

export class FilterList<T> extends Component<FilterListProps<T>, FilterListState> {
  override state: FilterListState = { typed: "", typings: 0 };

  /** The places of the items that match, best first, in the items' order within a rank. */
  #matches(): number[] {
    const { typed } = this.state;
    return this.props.items
      .map((item, index) => ({ index, rank: typed === "" ? 0 : matchRank(this.props.text(item), typed) }))
      .filter((each): each is { index: number; rank: number } => each.rank !== null)
      .toSorted((a, b) => a.rank - b.rank || a.index - b.index)
      .map((each) => each.index);
  }

  /** What is typed is now `typed`, kept to MOST_TYPED characters, not UTF-16 units, so none is cut in half. */
  #type(typed: string): void {
    const kept = Array.from(typed).slice(0, MOST_TYPED).join("");
    if (kept !== this.state.typed) {
      this.setState({ typed: kept, typings: this.state.typings + 1 });
    }
  }

  override onText(event: TextEvent): boolean {
    this.#type(`${this.state.typed}${event.text}`);
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    if (isPress(event, Key.Backspace) && this.state.typed !== "") {
      this.#type(Array.from(this.state.typed).slice(0, -1).join(""));
      return true;
    }
    if (isPress(event, Key.Escape) && this.state.typed !== "") {
      this.#type("");
      return true;
    }
    return false;
  }

  override render(): Child {
    const matches = this.#matches();
    const { typed, typings } = this.state;
    const line = typed === "" ? (this.props.prompt ?? "Type to find") : `Find: ${typed}`;
    return h(
      Rows,
      {},
      h(Text, { text: fit(line, MOST_TYPED + 1), foreground: typed === "" ? Colour.Cyan : Colour.Yellow }),
      h(ChoiceList<number>, {
        key: typings,
        items: matches,
        text: (index: number) => {
          const item = this.props.items[index];
          return item === undefined ? "" : this.props.text(item);
        },
        shown: this.props.shown,
        empty: this.props.empty ?? "nothing matches",
        // What is typed reaches this list from its own list, which had the keys: the new one takes them.
        autoFocus: typings > 0 || this.props.autoFocus === true,
        onChoose: (place: number, session: number) => {
          const index = matches[place];
          if (index !== undefined) {
            this.props.onChoose(index, session);
          }
        },
      }),
    );
  }
}
