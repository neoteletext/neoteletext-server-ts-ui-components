// A stream as the viewer sees it: what it is and whether it plays, then a
// bar of how far it has played of how long; with nothing playing, it says
// so and keeps the bar's row, so what is under it does not move, as it does
// for a stream that cannot play, which has played nothing to show. It looks
// at nothing itself; the player that holds it (now-playing.ts,
// audio-player.ts) says what plays.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import type { Listening } from "../core/stream.ts";
import { cells } from "../core/text.ts";
import { Colour } from "../kit.ts";
import { Gap } from "../layout/gap.ts";
import { Rows } from "../layout/layouts.ts";
import { Paragraph } from "../text/paragraph.ts";
import { HOUR_S, MINUTE_S, SECOND_MS } from "../time/clock.ts";
import { ProgressBar } from "./progress.ts";

/** The longest time the bar's label says: hours into hours. */
const LONGEST_TIME = "1:02:03/1:02:03";
/** The time's column before the bar: its colour's cell and the longest time. */
const TIME_CELLS = 1 + cells(LONGEST_TIME);

/** "1:02:03" or "2:03"; NaN or Infinity, which a stream's length can be, as "0:00". */
export function clockTime(seconds: number): string {
  const whole = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds)) : 0;
  const hours = Math.floor(whole / HOUR_S);
  const minutes = Math.floor((whole % HOUR_S) / MINUTE_S);
  const rest = String(whole % MINUTE_S).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

export interface ListeningViewProps {
  /** What plays, or null for nothing. */
  readonly listening: Listening | null;
  /** The bar's colour; magenta when absent. */
  readonly foreground?: Colour;
  /** A click on the bar: how far along it, 0 to 1, to seek there. */
  readonly onSeek?: (fraction: number, session: number) => void;
}

/** The colour of what a stream is doing: red when it cannot play, yellow paused, else green. */
function stateColour(state: Listening["state"]): Colour {
  if (state === "failed") {
    return Colour.Red;
  }
  return state === "paused" ? Colour.Yellow : Colour.Green;
}

/** A stream as the viewer sees it: what it is and whether it plays, and how far it has played of how long. */
export class ListeningView extends Component<ListeningViewProps> {
  override render(): Child {
    const { listening } = this.props;
    if (listening === null) {
      return h(Rows, {}, h(Paragraph, { text: "Nothing playing", foreground: Colour.Blue, lines: 1 }), h(Gap, {}));
    }
    const states: Record<Listening["state"], string> = {
      failed: `Cannot play: ${listening.failure ?? ""}`,
      waiting: "Getting it ready...",
      playing: "Playing",
      paused: "Paused",
      ended: "Played to the end",
    };
    const said = h(Paragraph, { text: `${states[listening.state]}: ${listening.name}`, foreground: stateColour(listening.state), lines: 1 });
    if (listening.state === "failed") {
      return h(Rows, {}, said, h(Gap, {}));
    }
    const heard = Math.floor(listening.heardMs / SECOND_MS);
    const length = listening.lengthMs === null ? null : Math.floor(listening.lengthMs / SECOND_MS);
    return h(
      Rows,
      {},
      said,
      h(ProgressBar, {
        label: `${clockTime(heard)}${length === null ? "" : `/${clockTime(length)}`}`,
        value: heard,
        max: length ?? Math.max(1, heard),
        foreground: this.props.foreground ?? Colour.Magenta,
        labelCells: TIME_CELLS,
        ...(this.props.onSeek === undefined ? {} : { onSeek: this.props.onSeek }),
      }),
    );
  }
}
