// Lines that scroll in their box beside a scroll bar (scroll.ts), moved
// with the keys (core/list-cursor.ts), the wheel and the bar.

import type { Size } from "../core/layout.ts";
import { type Child, h } from "../core/element.ts";
import type { KeyEvent, WheelEvent } from "../core/events.ts";
import { listStep, WheelLines } from "../core/list-cursor.ts";
import { Control, type ControlProps, type KeyHelpEntry } from "../input/control.ts";
import { Columns } from "../layout/columns.ts";
import { type Line, LinesBlock } from "../text/lines.ts";
import { BAR_CELLS, ScrollBar, scrolled } from "./scroll.ts";

export interface ScrollingTextProps extends ControlProps {
  /** The lines to read, a row each. */
  readonly lines: readonly Line[];
  /** The rows it shows at once. */
  readonly shown: number;
  /** What it says when there are no lines; "nothing to read" when absent. */
  readonly empty?: string;
}

interface ScrollingTextState {
  readonly top: number;
}

export class ScrollingText extends Control<ScrollingTextProps, ScrollingTextState> {
  override state: ScrollingTextState = { top: 0 };
  readonly #wheel = new WheelLines();

  override keyBindings(): readonly KeyHelpEntry[] {
    return [
      ["PgDn PgUp arrows Home End", "scroll"],
      ["wheel or the bar", "too"],
    ];
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(this.props.shown, space.height) };
  }

  get #last(): number {
    return Math.max(0, this.props.lines.length - this.props.shown);
  }

  override render(): Child {
    const { lines, shown } = this.props;
    const top = Math.min(this.state.top, this.#last);
    return h(
      Columns,
      { widths: [null, BAR_CELLS] },
      h(LinesBlock, { lines: lines.slice(top, top + shown), empty: this.props.empty ?? "nothing to read" }),
      h(ScrollBar, {
        top,
        total: lines.length,
        shown,
        disabled: this.disabled,
        onScroll: (to) => {
          this.setState({ top: to });
        },
      }),
    );
  }

  override onKey(event: KeyEvent): boolean {
    const step = listStep(event, this.props.shown);
    if (step === null || this.disabled) {
      return false;
    }
    this.setState({ top: scrolled(this.state.top, step, this.#last) });
    return true;
  }

  override onWheel(event: WheelEvent): boolean {
    if (this.disabled) {
      return false;
    }
    this.setState({ top: Math.max(0, Math.min(this.#last, this.state.top + this.#wheel.lines(event.dy))) });
    return true;
  }
}
