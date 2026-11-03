// A view that scrolls any components beside a scroll bar (scroll.ts),
// moved with the arrows a unit, Page Up and Page Down a screen less one
// unit, Home and End to the ends (core/list-cursor.ts), the wheel a unit a
// notch, and presses and drags on the bar: the one scrolling mechanism of
// the library (REQ-2153). Its children are its units, each as many rows as
// its `height` prop says, one when absent, as a line of text is and a
// DoubleHeight line with `height: 2` is two. A unit is never cut at the
// view's edge. Only the units in view are rendered, so those out of it are
// neither laid out nor painted and cost the page nothing; what a unit keeps
// in its own state goes as it leaves the view, so a unit that must
// remember something keeps it in its parent. Where it stands is each
// viewer's own, as every control's state is.

import { type Child, type Element, flatten, h, isElement } from "../core/element.ts";
import type { KeyEvent, WheelEvent } from "../core/events.ts";
import type { Size } from "../core/layout.ts";
import { languageOf, lineRows } from "../core/language.ts";
import { listStep, WheelLines } from "../core/list-cursor.ts";
import { Control, type ControlProps, type KeyHelpEntry } from "../input/control.ts";
import { Columns } from "../layout/columns.ts";
import { Rows } from "../layout/layouts.ts";
import { BAR_CELLS, ScrollBar, scrolled } from "./scroll.ts";
import { UnitRows } from "./unit-rows.ts";

export interface ScrollViewProps extends ControlProps {
  /** The rows it shows at once, beside its bar: the units that fit in them whole. */
  readonly shown: number;
}

interface ScrollViewState {
  /** The first unit shown, from 0. */
  readonly top: number;
}

/** `unit`, at `index` among the units, keyed by its place among them unless it has a key of its own, so its instance stays its own as the view scrolls. */
function keyed(unit: Element | string, index: number): Element | string {
  return isElement(unit) && unit.key === undefined ? { ...unit, key: `unit ${index}` } : unit;
}

/**
 * Any components scrolled in a box beside a scroll bar, each child a unit
 * of as many rows as its `height` prop says, one when absent. The view
 * shows the units that fit whole in its `shown` rows from the first one
 * shown, which is each viewer's own (a copy of the page each, as every
 * control has); the arrows move it a unit, Page Up and Page Down a screen
 * less one unit, Home and End to the ends, the wheel a unit a notch, and
 * the bar where it is pressed or dragged. Units out of view are not
 * rendered: what they keep in their own state goes as they leave the view,
 * so a unit that must remember something keeps it in its parent.
 */
export class ScrollView extends Control<ScrollViewProps, ScrollViewState> {
  override state: ScrollViewState = { top: 0 };
  readonly #wheel = new WheelLines();

  override keyBindings(): readonly KeyHelpEntry[] {
    return [
      ["PgDn PgUp arrows Home End", "scroll"],
      ["wheel or the bar", "too"],
    ];
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(Math.max(0, this.props.shown), space.height) };
  }

  /** The rows a unit of a line takes in its language, its own `language` prop or the view's: three where its marks take the rows around it (REQ-2152 item 5). */
  readonly #lineRows = (unit: Element | string): number => {
    const own = isElement(unit) ? unit.props.language : undefined;
    return lineRows(own === undefined ? this.language : languageOf(own, this.services.languages()));
  };

  get #units(): (Element | string)[] {
    return flatten(this.props.children ?? null);
  }

  override render(): Child {
    const units = this.#units;
    const rows = new UnitRows(units, this.props.shown, this.#lineRows);
    const top = rows.clamp(this.state.top);
    const inView = units.slice(top, top + rows.fitFrom(top)).map((unit, at) => keyed(unit, top + at));
    return h(
      Columns,
      { widths: [null, BAR_CELLS] },
      h(Rows, {}, ...inView),
      h(ScrollBar, {
        top: rows.startOf(top),
        total: rows.total,
        shown: this.props.shown,
        disabled: this.disabled,
        onScroll: (row) => {
          this.setState({ top: rows.unitNear(row, top) });
        },
      }),
    );
  }

  override onKey(event: KeyEvent): boolean {
    const rows = new UnitRows(this.#units, this.props.shown, this.#lineRows);
    const top = rows.clamp(this.state.top);
    const step = listStep(event, rows.fitFrom(top));
    if (step === null || this.disabled) {
      return false;
    }
    this.setState({ top: scrolled(top, step, rows.last) });
    return true;
  }

  override onWheel(event: WheelEvent): boolean {
    if (this.disabled) {
      return false;
    }
    const rows = new UnitRows(this.#units, this.props.shown, this.#lineRows);
    this.setState({ top: rows.clamp(rows.clamp(this.state.top) + this.#wheel.lines(event.dy)) });
    return true;
  }
}
