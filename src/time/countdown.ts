// Countdown: split from clock.ts; the comments pass writes this file's header.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Colour } from "../kit.ts";
import { BigDigits } from "./big-digits.ts";
import { SECOND_MS } from "./clock.ts";

const MINUTE_S = 60;

const HOUR_S = 3_600;

const DAY_S = 86_400;

export interface CountdownProps {
  /** When it reaches nought, in milliseconds since the Unix epoch. */
  readonly until: number;
  readonly foreground?: Colour;
}

interface CountdownState {
  readonly now: number;
}

/** Days, hours, minutes and seconds to a time, in large digits, ticking each second. */
export class Countdown extends Component<CountdownProps, CountdownState> {
  override state: CountdownState = { now: 0 };

  override componentDidMount(): void {
    this.setState({ now: this.services.epochMs() });
    this.setInterval(
      () => {
        this.setState({ now: this.services.epochMs() });
      },
      SECOND_MS,
      { whileViewed: true },
    );
  }

  override render(): Child {
    const left = Math.max(0, Math.floor((this.props.until - this.state.now) / SECOND_MS));
    const two = (value: number): string => value.toString().padStart(2, "0");
    const text = `${Math.floor(left / DAY_S)}:${two(Math.floor((left % DAY_S) / HOUR_S))}:${two(Math.floor((left % HOUR_S) / MINUTE_S))}:${two(left % MINUTE_S)}`;
    return h(BigDigits, { text, foreground: this.props.foreground ?? Colour.Green });
  }
}
