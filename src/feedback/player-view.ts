// A player as it is drawn (audio-player.ts holds its state): what plays and
// how far, on a bar a click seeks along, a spectrum of what is heard when
// it has one, the transport, the modes, and, given tracks, the queue of
// them. The transport and the queue say the player's keys on the hint row,
// which the player takes while either has them (player-keys.ts).

import { Spectrum } from "../charts/spectrum.ts";
import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { COLUMNS } from "../kit.ts";
import { Rows } from "../layout/layouts.ts";
import { ListeningView, type ListeningViewProps } from "./listening-view.ts";
import { playing } from "./now-playing.ts";
import { PlayQueue, type PlayQueueProps, type Track } from "./play-queue.ts";
import { PlayerStatus, type PlayerStatusProps } from "./player-status.ts";
import { Transport } from "./transport.ts";

/** A spectrum band's cells: a column of sixels and the gap beside it. */
const SPECTRUM_BAND_CELLS = 2;
/** The spectrum's bands: as many as stand across a page after its colour's cell. */
export const SPECTRUM_BANDS = Math.floor((COLUMNS - 1) / SPECTRUM_BAND_CELLS);

/** What the player's keys do while a transport button has them, and while the queue does (player-keys.ts). */
const TRANSPORT_HINT = "Left Right seek  Up Down volume";
const QUEUE_HINT = "Enter plays  Left Right seek";

export interface PlayerViewProps {
  /** What plays, in the track's own time. */
  readonly listening: ListeningViewProps["listening"];
  /** The bar's colour; magenta when absent. */
  readonly foreground?: ListeningViewProps["foreground"];
  /** The tracks, or absent for a player of whatever stream plays. */
  readonly tracks?: readonly Track[];
  /** The tracks' places in `tracks`, in the order queued. */
  readonly queue: readonly number[];
  /** The track it plays, by its place in `tracks`, or null. */
  readonly current: number | null;
  /** The rows the queue shows. */
  readonly shown: number;
  /** The levels of what is heard, for a spectrum of `spectrumRows` rows; none for no spectrum. */
  readonly levels: readonly number[] | null;
  /** The spectrum's rows, while there are levels. */
  readonly spectrumRows: number;
  /** The modes, as the status rows say them. */
  readonly status: PlayerStatusProps;
  /** The prev button pressed. */
  readonly onPrevious: (session: number) => void;
  /** The play or pause button pressed. */
  readonly onPlayPause: (session: number) => void;
  /** The stop button pressed. */
  readonly onStop: (session: number) => void;
  /** The next button pressed. */
  readonly onNext: (session: number) => void;
  /** A click on the bar: how far along it, 0 to 1. */
  readonly onSeek: (fraction: number, session: number) => void;
  /** A track chosen in the queue, by its place in `tracks`. */
  readonly onChoose: PlayQueueProps["onChoose"];
  /** The queue's choice moved to `place` in the queue. */
  readonly onMove: NonNullable<PlayQueueProps["onMove"]>;
}

export class PlayerView extends Component<PlayerViewProps> {
  #queue(): Child {
    const { tracks } = this.props;
    return tracks === undefined
      ? null
      : h(PlayQueue, {
          tracks,
          queue: this.props.queue,
          current: this.props.current,
          shown: this.props.shown,
          onChoose: this.props.onChoose,
          onMove: this.props.onMove,
          hint: QUEUE_HINT,
        });
  }

  override render(): Child {
    const { listening, tracks, foreground } = this.props;
    const shown = playing(listening) ? listening : null;
    const state = shown?.state;
    const going = state === "playing" || state === "waiting";
    return h(
      Rows,
      {},
      h(ListeningView, { listening: shown, ...(foreground === undefined ? {} : { foreground }), onSeek: this.props.onSeek }),
      this.props.levels === null
        ? null
        : h(Spectrum, { levels: this.props.levels, plotRows: this.props.spectrumRows, bandCells: SPECTRUM_BAND_CELLS, empty: "silence" }),
      h(Transport, {
        going,
        canPlay: going || state === "paused" || (tracks?.length ?? 0) > 0,
        canStop: shown !== null,
        canStep: (tracks?.length ?? 0) > 0,
        onPrevious: this.props.onPrevious,
        onPlayPause: this.props.onPlayPause,
        onStop: this.props.onStop,
        onNext: this.props.onNext,
        hint: TRANSPORT_HINT,
      }),
      h(PlayerStatus, this.props.status),
      this.#queue(),
    );
  }
}
