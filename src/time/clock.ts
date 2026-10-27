// Time that ticks: a countdown and a clock, each keeping time with a timer
// of its own.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Colour } from "../kit.ts";
import { BigDigits } from "./big-digits.ts";
import { DATE_FORMATS, formatDate } from "./date-text.ts";

export const SECOND_MS = 1_000;

export interface ClockProps {
  readonly foreground?: Colour;
  /** Seconds shown. */
  readonly seconds?: boolean;
}

interface ClockState {
  readonly now: number;
}

/** The time, UTC, in large digits, ticking each second. */
export class Clock extends Component<ClockProps, ClockState> {
  override state: ClockState = { now: 0 };

  override componentDidMount(): void {
    const tick = (): void => {
      this.setState({ now: this.services.epochMs() });
    };
    tick();
    this.setInterval(tick, SECOND_MS, { whileViewed: true });
  }

  override render(): Child {
    const text = formatDate(this.state.now, this.props.seconds === true ? DATE_FORMATS.seconds : DATE_FORMATS.time);
    return h(BigDigits, { text, foreground: this.props.foreground ?? Colour.Yellow });
  }
}
