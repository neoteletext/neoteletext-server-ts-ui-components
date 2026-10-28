// A player's transport (audio-player.ts): previous, play or pause, stop and
// next, as buttons of one width in a row; what cannot be done now is
// disabled, not hidden. Its buttons say their own keys on the hint row,
// unless the player that takes more of the keys says what they do there.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Button } from "../input/button.ts";
import { Columns } from "../layout/columns.ts";
import { Gap } from "../layout/gap.ts";

const PREVIOUS = "prev";
const PLAY = "play";
const PAUSE = "pause";
const STOP = "stop";
const NEXT = "next";
/** Every button the widest label's width, without padding, so the four and their gaps fit a row of the page's 40 cells. */
const BUTTON_WIDTH = Math.max(...[PREVIOUS, PLAY, PAUSE, STOP, NEXT].map((label) => Button.widthOf(label, 0, 0)));
/** The cell between buttons. */
const GAP = 1;

export interface TransportProps {
  /** Whether what plays is going (or getting ready), so the middle button pauses rather than plays. */
  readonly going: boolean;
  /** Whether there is anything to play or pause. */
  readonly canPlay: boolean;
  /** Whether there is anything to stop; the stop button is disabled when not. */
  readonly canStop: boolean;
  /** Whether there are tracks to go back and on through. */
  readonly canStep: boolean;
  /** The prev button pressed; never while canStep is false. */
  readonly onPrevious: (session: number) => void;
  /** The play or pause button pressed; never while canPlay is false. */
  readonly onPlayPause: (session: number) => void;
  /** The stop button pressed; never while canStop is false. */
  readonly onStop: (session: number) => void;
  /** The next button pressed; never while canStep is false. */
  readonly onNext: (session: number) => void;
  /** What the keys do while a button has them, for the hint row: the player's (player-view.ts), which takes keys the buttons do not; the buttons' own when absent. */
  readonly hint?: string;
}

export class Transport extends Component<TransportProps> {
  #button(label: string, disabled: boolean, onPress: (session: number) => void): Child {
    const { hint } = this.props;
    return h(Button, { key: label === PAUSE ? PLAY : label, label, width: BUTTON_WIDTH, disabled, ...(hint === undefined ? {} : { hint }), onPress });
  }

  override render(): Child {
    const { going, canPlay, canStop, canStep } = this.props;
    return h(
      Columns,
      { widths: [BUTTON_WIDTH, GAP, BUTTON_WIDTH, GAP, BUTTON_WIDTH, GAP, BUTTON_WIDTH] },
      this.#button(PREVIOUS, !canStep, this.props.onPrevious),
      h(Gap, {}),
      this.#button(going ? PAUSE : PLAY, !canPlay, this.props.onPlayPause),
      h(Gap, {}),
      this.#button(STOP, !canStop, this.props.onStop),
      h(Gap, {}),
      this.#button(NEXT, !canStep, this.props.onNext),
    );
  }
}
