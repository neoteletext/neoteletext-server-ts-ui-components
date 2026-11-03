// A list's rows: as many of its items as are shown from its top, each a
// ListRow (list-row.ts) holding the item's text or what the list's user
// makes of it, so every list chooses, highlights, takes clicks and hears
// the pointer alike.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { type Child, h } from "../core/element.ts";
import { paintEmpty } from "../core/look.ts";
import type { Colour } from "../kit.ts";
import type { TextLanguage } from "../core/language.ts";
import { clashes, placed } from "../core/marks.ts";
import { ItemText } from "./item-text.ts";
import { ListRow, type RowLook } from "./list-row.ts";

export type { RowLook } from "./list-row.ts";

export interface ListRowsProps<T> {
  /** The list's items, all of them; those from `top` are shown. */
  readonly items: readonly T[];
  /** Cells before each row's band, and what they hold. */
  readonly indent?: (item: T, index: number) => number;
  /** What the cells before an item's band hold: a tree's guide lines. */
  readonly before?: (item: T, index: number) => Child;
  /** The first item shown. */
  readonly top?: number;
  /** How many items are shown from the top. */
  readonly shown: number;
  /** The chosen item, or null for none. */
  readonly chosen: number | null;
  /** The list has the keys: the chosen item is on the band. */
  readonly focused: boolean;
  /** Rows each item takes. */
  readonly itemRows?: number;
  /** What an empty list says. */
  readonly empty?: string;
  /** What an item's row holds: its text in its look by default. */
  readonly render?: (item: T, look: RowLook, index: number) => Child;
  /** An item's text, for the default row: the item itself when it is text. */
  readonly text?: (item: T, index: number) => string;
  /** The text an item drawn by `render` shows on its line, for laying out a language whose marks take the rows around its letters; without it (or `text`), such a list keeps a row below each item for its marks. */
  readonly lineText?: (item: T, index: number) => string;
  /** Whether an item cannot be picked: drawn dimmed, and a click on it does nothing. */
  readonly disabled?: (item: T, index: number) => boolean;
  /** An item's foreground off the band. */
  readonly foreground?: (item: T, index: number) => Colour | undefined;
  /** A click on an item's band: its place in `items`. */
  readonly onPick: (index: number, session: number) => void;
  /** The pointer came onto an item's row, or left it (null). Moving from one row to the next is a leave, then an enter. */
  readonly onHover?: (index: number | null, session: number) => void;
  /** What the hint row says of an item while the pointer is on its row, or null for the list's own hint. */
  readonly itemHint?: (item: T, index: number) => string | null;
}

/**
 * How a list lays out its items in a language. With no mark rows, an item
 * takes its lines' rows. Where marks take the rows around the letters
 * (Thai, Lao; DEC-604, marks.ts), each line takes two rows, its upper marks'
 * and its letters, a line's lower vowels sharing the next one's mark row
 * (`pitch` 2): an item's text may mark the row below its own (`markRoom`),
 * and the list keeps a row after its last item (`after`). Where the items'
 * text is not known, or one item's lower vowels and the next one's upper
 * marks need a column of the same row, or an item has more than one line,
 * each line keeps its own row below as well (`pitch` 3).
 */
export interface ListPitch {
  /** The rows between one line of an item and the next, and between items. */
  readonly pitch: number;
  /** The rows of an item below its own its text may write its marks on: the next item's mark row, or the list's last row. */
  readonly markRoom: number;
  /** The rows the list keeps after its last item shown. */
  readonly after: number;
}

/** The rows between lines with mark rows that share them, and that do not (marks.ts). */
const SHARED_PITCH = 2;
const OWN_PITCH = 3;

/** How a list of `lines` items of `itemRows` lines each lays out in `language`: `lines` the items' texts, each from `column`, or null when they are not known. */
function listPitch(language: TextLanguage, itemRows: number, lines: readonly { readonly column: number; readonly text: string }[] | null): ListPitch {
  if (language.markRows === 0) {
    return { pitch: 1, markRoom: 0, after: 0 };
  }
  const shown = lines?.map((line) => placed(language, line.column, line.text)) ?? null;
  const shares = itemRows === 1 && shown !== null && shown.every((line, index) => index === 0 || !clashes(shown[index - 1] ?? line, line));
  return shares ? { pitch: SHARED_PITCH, markRoom: language.markRows, after: language.markRows } : { pitch: OWN_PITCH, markRoom: 0, after: 0 };
}

/** How the items of a list with `props` lay out in `language`, their text from `text` or `lineText`, or themselves when no `render` draws them. */
export function itemsPitch<T>(
  language: TextLanguage,
  props: Pick<ListRowsProps<T>, "items" | "itemRows" | "text" | "lineText" | "render" | "indent">,
): ListPitch {
  const text = props.lineText ?? props.text ?? (props.render === undefined ? String : undefined);
  const lines = text === undefined ? null : props.items.map((item, index) => ({ column: props.indent?.(item, index) ?? 0, text: text(item, index) }));
  return listPitch(language, props.itemRows ?? 1, lines);
}

/** A list's choice, `index`, kept among the `count` items it has now: the last when the list shrank under it or it is past the end, 0 when the list is empty or it is no number. */
export function within(index: number, count: number): number {
  return Number.isNaN(index) ? 0 : Math.max(0, Math.min(count - 1, Math.trunc(index)));
}

export class ListRows<T> extends Component<ListRowsProps<T>> {
  /** How its items lay out in its language. */
  get #pitch(): ListPitch {
    return itemsPitch(this.language, this.props);
  }

  /** The rows its items take, or one for what an empty list says. */
  override measure(space: Size): Size {
    const items = Math.max(1, Math.min(this.props.shown, this.props.items.length - (this.props.top ?? 0)));
    const { pitch, after } = this.#pitch;
    return { width: space.width, height: Math.min(space.height, items * (this.props.itemRows ?? 1) * pitch + after) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.items.length === 0) {
      paintEmpty(canvas, this.props.empty ?? "nothing to show");
    }
  }

  override render(): Child {
    const { items, shown, chosen, focused } = this.props;
    const top = this.props.top ?? 0;
    const lines = this.props.itemRows ?? 1;
    const { pitch, markRoom } = this.#pitch;
    const textOf: (item: T, index: number) => string = this.props.text ?? String;
    return items.slice(top, top + shown).map((item, offset) => {
      const index = top + offset;
      const disabled = this.props.disabled?.(item, index) === true;
      const foreground = this.props.foreground?.(item, index);
      const before = this.props.before?.(item, index);
      const hint = this.props.itemHint?.(item, index) ?? null;
      return h(ListRow, {
        key: index,
        chosen: index === chosen,
        focused,
        disabled,
        rows: lines * pitch,
        lines,
        markRoom,
        indent: this.props.indent?.(item, index) ?? 0,
        ...(before === undefined ? {} : { before }),
        ...(hint === null ? {} : { hint }),
        ...(foreground === undefined ? {} : { foreground }),
        content: (look: RowLook) =>
          this.props.render?.(item, look, index) ?? h(ItemText, { text: textOf(item, index), foreground: look.foreground, rows: lines, pitch }),
        onPress: (session: number) => {
          this.props.onPick(index, session);
        },
        ...(this.props.onHover === undefined ? {} : { onHover: (entered: boolean, session: number) => this.props.onHover?.(entered ? index : null, session) }),
      });
    });
  }
}
