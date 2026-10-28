// A countdown: the days, hours, minutes and seconds left to a time, in
// large digits, ticking each second while someone watches; nought once the
// time has come.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Colour } from "../kit.ts";
import { BigDigits } from "./big-digits.ts";
import { HOUR_S, MINUTE_S, SECOND_MS } from "./clock.ts";

const DAY_S = 86_400;

export interface CountdownProps {
  /** When it reaches nought, in milliseconds since the Unix epoch. */
  readonly until: number;
  /** The digits' colour; green when absent. */
  readonly foreground?: Colour;
}

interface CountdownState {
  readonly now: number;
}

function twoDigits(value: number): string {
  return value.toString().padStart(2, "0");
}

/** The whole seconds from `now` to `until`: nought once it has passed, and nought for NaN or Infinity, which have no digits to show. */
function secondsLeft(until: number, now: number): number {
  const left = Math.floor((until - now) / SECOND_MS);
  return Number.isFinite(left) ? Math.max(0, left) : 0;
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
    const left = secondsLeft(this.props.until, this.state.now);
    const text = `${Math.floor(left / DAY_S)}:${twoDigits(Math.floor((left % DAY_S) / HOUR_S))}:${twoDigits(Math.floor((left % HOUR_S) / MINUTE_S))}:${twoDigits(left % MINUTE_S)}`;
    return h(BigDigits, { text, foreground: this.props.foreground ?? Colour.Green });
  }
}
