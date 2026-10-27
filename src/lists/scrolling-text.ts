// ScrollingText: split from scroll.ts; the comments pass writes this file's header.

import type { Size } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import type { KeyEvent, WheelEvent } from "../core/events.ts";
import { listStep, WheelLines } from "../core/list-cursor.ts";
import { Control, type ControlProps } from "../input/control.ts";
import { Columns } from "../layout/columns.ts";
import { type Line, LinesBlock } from "../text/lines.ts";
import { BAR_CELLS, ScrollBar } from "./scroll.ts";

export interface ScrollingTextProps extends ControlProps {
  readonly lines: readonly Line[];
  /** The rows it shows at once. */
  readonly shown: number;
  readonly empty?: string;
}

interface ScrollingTextState {
  readonly top: number;
}

/** Lines that scroll in their box with the keys, the wheel and a scroll bar. */
export class ScrollingText extends Control<ScrollingTextProps, ScrollingTextState> {
  override state: ScrollingTextState = { top: 0 };
  readonly #wheel = new WheelLines();

  protected override keysHint(): string {
    return "PgDn PgUp arrows Home End, wheel, drag the bar";
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
    this.setState({ top: Math.max(0, Math.min(this.#last, Number.isFinite(step) ? this.state.top + step : step > 0 ? this.#last : 0)) });
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
