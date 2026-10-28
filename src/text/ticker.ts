// Ticker: a band whose text changes to the next item every few seconds.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { framePeriod } from "../core/timers.ts";
import { pad } from "../core/text.ts";
import { Colour } from "../kit.ts";

export interface TickerProps {
  /** The items it shows in turn. */
  readonly items: readonly string[];
  /** How long each shows, in milliseconds. */
  readonly everyMs: number;
  /** The band's colour; blue when absent. */
  readonly background?: Colour;
}

interface TickerState {
  readonly at: number;
}

/** A band whose text changes every few seconds: a timer of its own, cleared when it leaves the page. */
export class Ticker extends Component<TickerProps, TickerState> {
  override state: TickerState = { at: 0 };
  #timer = -1;

  override componentDidMount(): void {
    this.#timer = this.setInterval(
      () => {
        this.setState((state) => ({ at: state.at + 1 }));
      },
      framePeriod(this.props.everyMs),
      { whileViewed: true },
    );
  }

  override componentWillUnmount(): void {
    this.clearTimer(this.#timer);
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const items = this.props.items;
    const shown = items.length === 0 ? "" : (items[this.state.at % items.length] ?? "");
    canvas.background(0, 0, this.props.background ?? Colour.Blue);
    canvas.coloured(0, 2, Colour.White, pad(shown, canvas.width - 4));
  }
}
