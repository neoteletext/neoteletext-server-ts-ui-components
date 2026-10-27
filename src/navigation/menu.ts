// A menu: choices with their shortcuts, rules between groups, choices that
// cannot be made yet, and choices that open a menu of their own. Up and
// Down move past rules and what cannot be chosen (core/list-cursor.ts),
// Enter, Space or Right chooses or opens, Left or Escape goes back, a click
// chooses, and a click on a menu's name in the way down goes back to it;
// numbered, the digits choose as an index page's do, so the page takes
// them. The pointer coming onto a choice is told to the menu's user
// (onHover). More choices than fit scroll beside a scroll bar, and with
// the wheel.

import { type Size } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { isPress, type KeyEvent, type WheelEvent } from "../core/events.ts";
import { choosing, digitOf } from "../core/keys.ts";
import { keepInView, listStep, moveChoice, WheelLines } from "../core/list-cursor.ts";
import type { PageNeeds } from "../core/needs.ts";
import { cells } from "../core/text.ts";
import { Colour, Key } from "../kit.ts";
import { Control, type ControlProps } from "../input/control.ts";
import { Columns } from "../layout/columns.ts";
import { Rows } from "../layout/layouts.ts";
import { Text } from "../text/styles.ts";
import { Breadcrumbs } from "./breadcrumbs.ts";
import { ListRows } from "../lists/list-rows.ts";
import { type RowLook } from "../lists/list-row.ts";
import { BAR_CELLS, ScrollBar } from "../lists/scroll.ts";
import { MenuRule } from "./menu-rule.ts";

export interface MenuItem {
  readonly label: string;
  /** What it says on the right: a key, a page. */
  readonly shortcut?: string;
  readonly disabled?: boolean;
  /** A rule, not a choice. */
  readonly rule?: boolean;
  /** A menu it opens. */
  readonly items?: readonly MenuItem[];
}

export interface MenuProps extends ControlProps {
  readonly items: readonly MenuItem[];
  /** The top menu's name, shown over its items with the way down to a menu opened. */
  readonly title?: string;
  /** Each choice has its number, which chooses it. */
  readonly numbered?: boolean;
  /** The choices shown at once. */
  readonly shown?: number;
  readonly empty?: string;
  /** A choice made: the labels from the top menu down to it. */
  readonly onChoose: (path: readonly string[], session: number) => void;
  /** The pointer came onto a choice, or left it (null): the labels from the top menu down to it. Moving from one choice to the next is a leave, then an enter. */
  readonly onHover?: (path: readonly string[] | null, session: number) => void;
}

interface MenuState {
  /** The choices opened, from the top. */
  readonly path: readonly number[];
  readonly chosen: number;
  readonly top: number;
}

/** What marks a choice that opens a menu. */
const OPENS = "→";

function choosable(item: MenuItem | undefined): boolean {
  return item !== undefined && item.rule !== true && item.disabled !== true;
}

/** A choice's row: its number when numbered, its label, and its shortcut or the mark of a menu it opens on the right. */
function menuRow(item: MenuItem, number: number | null, look: RowLook): Child {
  if (item.rule === true) {
    return h(MenuRule, {});
  }
  const right = item.items !== undefined ? OPENS : (item.shortcut ?? "");
  const label = `${number === null ? "" : `${number} `}${item.label}`;
  // The shortcut's column: its colour's cell, a space and the shortcut.
  return right === ""
    ? h(Text, { text: label, foreground: look.foreground })
    : h(
        Columns,
        { widths: [null, cells(right) + 2] },
        h(Text, { text: label, foreground: look.foreground }),
        h(Text, { text: right, foreground: look.foreground }),
      );
}

export class Menu extends Control<MenuProps, MenuState> {
  override state: MenuState = { path: [], chosen: Math.max(0, this.props.items.findIndex(choosable)), top: 0 };
  readonly #wheel = new WheelLines();

  protected override keyNeeds(): PageNeeds {
    return { digits: this.props.numbered === true };
  }

  protected override keysHint(): string {
    return `Up Down, Enter chooses${this.props.numbered === true ? ", or its number" : ""}; Left goes back`;
  }

  /** The menu open now and the labels down to it. */
  #open(): { items: readonly MenuItem[]; labels: string[] } {
    let items = this.props.items;
    const labels: string[] = [];
    for (const index of this.state.path) {
      const item = items[index];
      if (item?.items === undefined) {
        break;
      }
      labels.push(item.label);
      items = item.items;
    }
    return { items, labels };
  }

  get #titled(): boolean {
    return this.props.title !== undefined || this.state.path.length > 0;
  }

  get #shown(): number {
    return this.props.shown ?? Math.max(1, this.#open().items.length);
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, this.#shown + (this.#titled ? 1 : 0)) };
  }

  override render(): Child {
    const { items, labels } = this.#open();
    // Each choice's number, counting choices alone, as the digits choose them.
    let counted = 0;
    const numbers = items.map((item) => (item.rule === true ? null : (counted += 1)));
    return h(
      Rows,
      {},
      this.#titled ? this.#title(labels) : null,
      h(
        Columns,
        { widths: [null, BAR_CELLS], height: this.#shown },
        h(ListRows<MenuItem>, {
          items,
          top: this.state.top,
          shown: this.#shown,
          chosen: this.state.chosen,
          focused: this.focused,
          empty: this.props.empty ?? "no choices",
          disabled: (item: MenuItem) => this.disabled || !choosable(item),
          render: (item: MenuItem, look: RowLook, index: number) => menuRow(item, this.props.numbered === true ? (numbers[index] ?? null) : null, look),
          onPick: (index: number, session: number) => {
            this.#choose(index, session);
          },
          ...(this.props.onHover === undefined
            ? {}
            : {
                onHover: (index: number | null, session: number) =>
                  this.props.onHover?.(index === null || items[index] === undefined ? null : [...labels, items[index].label], session),
              }),
        }),
        h(ScrollBar, {
          top: this.state.top,
          total: items.length,
          shown: this.#shown,
          disabled: this.disabled,
          onScroll: (top) => {
            this.setState({ top });
          },
        }),
      ),
    );
  }

  /** The way down to the menu open: each menu above it a step a click goes back to. */
  #title(labels: readonly string[]): Child {
    const top = this.props.title ?? "Menu";
    if (labels.length === 0) {
      return h(Text, { text: top, foreground: Colour.Cyan });
    }
    const steps = [top, ...labels];
    return h(Breadcrumbs, {
      trail: steps.map((label, depth) =>
        depth === steps.length - 1 || this.disabled
          ? { label }
          : {
              label,
              onPress: () => {
                this.#backTo(depth);
              },
            },
      ),
    });
  }

  /** Goes back to the menu `depth` levels down, its choice the one that was opened from it. */
  #backTo(depth: number): void {
    const chosen = this.state.path[depth] ?? 0;
    this.setState({ path: this.state.path.slice(0, depth), chosen, top: 0 });
  }

  #choose(index: number, session: number): void {
    const { items, labels } = this.#open();
    const item = items[index];
    if (!choosable(item) || item === undefined || this.disabled) {
      return;
    }
    if (item.items !== undefined) {
      this.setState({ path: [...this.state.path, index], chosen: Math.max(0, item.items.findIndex(choosable)), top: 0 });
      this.play("move", session);
      return;
    }
    const path = [...labels, item.label];
    this.setState({ chosen: index });
    this.activate(path, session);
    this.props.onChoose(path, session);
  }

  #back(session: number): boolean {
    if (this.state.path.length === 0) {
      this.cancel(session);
      return false;
    }
    this.#backTo(this.state.path.length - 1);
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled) {
      return false;
    }
    const { items } = this.#open();
    if (choosing(event) || isPress(event, Key.Right)) {
      this.#choose(this.state.chosen, event.session);
      return true;
    }
    if (isPress(event, Key.Left) || isPress(event, Key.Escape)) {
      return this.#back(event.session);
    }
    const step = listStep(event, this.#shown);
    if (step !== null) {
      const chosen = moveChoice(this.state.chosen, step, items.length, (index) => choosable(items[index]));
      this.setState({ chosen, top: keepInView(this.state.top, chosen, this.#shown, items.length) });
      this.play("move", event.session);
      return true;
    }
    const digit = this.props.numbered === true ? digitOf(event) : null;
    if (digit !== null) {
      const index = items.map((item, place) => ({ item, place })).filter(({ item }) => item.rule !== true)[digit - 1]?.place;
      if (index !== undefined) {
        this.#choose(index, event.session);
        return true;
      }
    }
    return false;
  }

  override onWheel(event: WheelEvent): boolean {
    if (this.disabled) {
      return false;
    }
    const last = Math.max(0, this.#open().items.length - this.#shown);
    this.setState({ top: Math.max(0, Math.min(last, this.state.top + this.#wheel.lines(event.dy))) });
    return true;
  }
}
