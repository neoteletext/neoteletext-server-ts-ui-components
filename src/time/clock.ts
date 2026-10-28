// A clock: the time, UTC, in large digits, keeping time with a timer of
// its own that runs only while someone watches.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Colour } from "../kit.ts";
import { BigDigits } from "./big-digits.ts";
import { DATE_FORMATS, formatDate } from "./date-text.ts";

/** A second in milliseconds: how often a clock or a countdown ticks. */
export const SECOND_MS = 1_000;
/** A minute and an hour in seconds, for writing a time out. */
export const MINUTE_S = 60;
export const HOUR_S = 3_600;

export interface ClockProps {
  /** The digits' colour; yellow when absent. */
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
