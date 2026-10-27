// A player as it is drawn (audio-player.ts holds its state): what plays and
// how far, on a bar a click seeks along, a spectrum of what is heard when
// it has one, the transport, the modes, and, given tracks, the queue of
// them.

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

export interface PlayerViewProps {
  /** What plays, in the track's own time. */
  readonly listening: ListeningViewProps["listening"];
  readonly foreground?: ListeningViewProps["foreground"];
  /** The tracks, or absent for a player of whatever stream plays. */
  readonly tracks?: readonly Track[];
  readonly queue: readonly number[];
  readonly current: number | null;
  readonly shown: number;
  /** The levels of what is heard, for a spectrum of `spectrumRows` rows; none for no spectrum. */
  readonly levels: readonly number[] | null;
  readonly spectrumRows: number;
  /** The modes, as the status rows say them. */
  readonly status: PlayerStatusProps;
  readonly onPrevious: (session: number) => void;
  readonly onPlayPause: (session: number) => void;
  readonly onStop: (session: number) => void;
  readonly onNext: (session: number) => void;
  readonly onSeek: (fraction: number, session: number) => void;
  readonly onChoose: PlayQueueProps["onChoose"];
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
      }),
      h(PlayerStatus, this.props.status),
      this.#queue(),
    );
  }
}
