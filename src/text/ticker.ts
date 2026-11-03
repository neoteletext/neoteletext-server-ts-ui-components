// Ticker: a band whose text changes to the next item every few seconds.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { framePeriod } from "../core/timers.ts";
import { oneLineRows, pad } from "../core/text.ts";
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
  /** Each line has its mark rows where its language needs them (marks.ts). */
  override laysOutMarks(): boolean {
    return true;
  }

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

  /** One row, or in a language whose marks take the rows around its letters three, the band on all of them (marks.ts). */
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(oneLineRows(this.language), space.height) };
  }

  override paint(canvas: Canvas): void {
    const items = this.props.items;
    const shown = items.length === 0 ? "" : (items[this.state.at % items.length] ?? "");
    for (let row = 0; row < canvas.height; row += 1) {
      canvas.background(row, 0, this.props.background ?? Colour.Blue);
    }
    canvas.coloured(canvas.language.markRows, 2, Colour.White, pad(shown, canvas.width - 4));
  }
}
