// ListRows: split from list-row.ts; the comments pass writes this file's header.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { paintEmpty } from "../core/look.ts";
import type { Colour } from "../kit.ts";
import { ItemText } from "./item-text.ts";
import { ListRow, type RowLook } from "./list-row.ts";

export interface ListRowsProps<T> {
  readonly items: readonly T[];
  /** Cells before each row's band, and what they hold. */
  readonly indent?: (item: T, index: number) => number;
  readonly before?: (item: T, index: number) => Child;
  /** The first item shown. */
  readonly top?: number;
  /** How many items are shown from the top. */
  readonly shown: number;
  /** The chosen item, or null for none. */
  readonly chosen: number | null;
  readonly focused: boolean;
  /** Rows each item takes. */
  readonly itemRows?: number;
  /** What an empty list says. */
  readonly empty?: string;
  /** What an item's row holds: its text in its look by default. */
  readonly render?: (item: T, look: RowLook, index: number) => Child;
  /** An item's text, for the default row: the item itself when it is text. */
  readonly text?: (item: T, index: number) => string;
  readonly disabled?: (item: T, index: number) => boolean;
  /** An item's foreground off the band. */
  readonly foreground?: (item: T, index: number) => Colour | undefined;
  readonly onPick: (index: number, session: number) => void;
  /** The pointer came onto an item's row, or left it (null). Moving from one row to the next is a leave, then an enter. */
  readonly onHover?: (index: number | null, session: number) => void;
  /** What the hint row says of an item while the pointer is on its row, or null for the list's own hint. */
  readonly itemHint?: (item: T, index: number) => string | null;
}

/** A list's rows, a ListRow each, as many as are shown from `top`. */
export class ListRows<T> extends Component<ListRowsProps<T>> {
  /** The rows its items take, or one for what an empty list says. */
  override measure(space: Size): Size {
    const items = Math.max(1, Math.min(this.props.shown, this.props.items.length - (this.props.top ?? 0)));
    return { width: space.width, height: Math.min(space.height, items * (this.props.itemRows ?? 1)) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.items.length === 0) {
      paintEmpty(canvas, this.props.empty ?? "nothing to show");
    }
  }

  override render(): Child {
    const { items, shown, chosen, focused } = this.props;
    const top = this.props.top ?? 0;
    const rows = this.props.itemRows ?? 1;
    const textOf = this.props.text ?? ((item: T): string => String(item));
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
        rows,
        indent: this.props.indent?.(item, index) ?? 0,
        ...(before === undefined ? {} : { before }),
        ...(hint === null ? {} : { hint }),
        ...(foreground === undefined ? {} : { foreground }),
        content: (look: RowLook) => this.props.render?.(item, look, index) ?? h(ItemText, { text: textOf(item, index), foreground: look.foreground, rows }),
        onPress: (session: number) => {
          this.props.onPick(index, session);
        },
        ...(this.props.onHover === undefined ? {} : { onHover: (entered: boolean, session: number) => this.props.onHover?.(entered ? index : null, session) }),
      });
    });
  }
}
