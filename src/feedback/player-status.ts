// A player's modes (audio-player.ts) on two rows, each in words, so its
// state shows without colour: how loud, or muted, and, for a player of
// tracks, what repeats and whether it shuffles; then its speed, the part
// it loops and when it sleeps, each only while it is set.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Colour } from "../kit.ts";
import { Rows } from "../layout/layouts.ts";
import { Text } from "../text/styles.ts";
import { clockTime } from "./listening-view.ts";
import type { Repeat } from "./play-order.ts";

export interface PlayerStatusProps {
  /** How loud, 0 to FULL_GAIN, or null while nothing plays. */
  readonly gain: number | null;
  readonly muted: boolean;
  /** The modes of a player of tracks; absent for one that only shows what plays. */
  readonly repeat?: Repeat;
  readonly shuffle?: boolean;
  /** How fast it plays: 1 is as recorded. */
  readonly speed?: number;
  /** The part looped, in milliseconds of the track: from, then to once set. */
  readonly loopFrom?: number | null;
  readonly loopTo?: number | null;
  /** The minutes before it sleeps, or null. */
  readonly sleepMinutes?: number | null;
}

/** The spaces between modes. */
const SPACING = "  ";
const SECOND_MS = 1_000;

export class PlayerStatus extends Component<PlayerStatusProps> {
  #volume(): string {
    const { gain, muted } = this.props;
    if (muted) {
      return "Muted";
    }
    return gain === null ? "Vol --" : `Vol ${gain}%`;
  }

  #loop(): string | null {
    const { loopFrom, loopTo } = this.props;
    if (loopFrom === undefined || loopFrom === null) {
      return null;
    }
    const from = clockTime(loopFrom / SECOND_MS);
    return loopTo === undefined || loopTo === null ? `Loop from ${from}` : `Loop ${from}-${clockTime(loopTo / SECOND_MS)}`;
  }

  override render(): Child {
    const { repeat, shuffle, speed, sleepMinutes } = this.props;
    const modes = [
      this.#volume(),
      ...(repeat === undefined ? [] : [`Repeat ${repeat}`]),
      ...(shuffle === undefined ? [] : [`Shuffle ${shuffle ? "on" : "off"}`]),
    ];
    const set = [
      ...(speed === undefined || speed === 1 ? [] : [`Speed ${speed}x`]),
      ...(this.#loop() === null ? [] : [this.#loop() ?? ""]),
      ...(sleepMinutes === undefined || sleepMinutes === null ? [] : [`Sleep ${sleepMinutes}m`]),
    ];
    return h(
      Rows,
      {},
      h(Text, { text: modes.join(SPACING), foreground: this.props.muted ? Colour.Yellow : Colour.Cyan }),
      h(Text, { text: set.join(SPACING), foreground: Colour.Cyan }),
    );
  }
}
