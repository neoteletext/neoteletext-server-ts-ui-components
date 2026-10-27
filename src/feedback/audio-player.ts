// A player for the viewer's stream (core/stream.ts), drawn by player-view.ts,
// its doings player-actions.ts's. Given tracks, it plays them: a queue of
// them to choose from and edit, Previous and Next, repeat and shuffle, the
// next track when one ends, a speed, an A–B loop and a sleep timer, and,
// when told to, each track from where the viewer left it; without, it
// works the stream something else started. The keys that reach it seek
// and set the volume, a keyboard's letters do the rest (player-keys.ts),
// and the digits, when it takes them, jump to a tenth of the way; a click
// on the bar seeks there. It looks again twice a second while someone
// watches. With no tracks and nothing playing it draws nothing, or keeps
// its rows empty when told to (now-playing.ts). Its state is one viewer's,
// so each has a copy of its page.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import type { KeyEvent } from "../core/events.ts";
import type { PageNeeds } from "../core/needs.ts";
import { LISTENING_ROWS, LOOK_MS, nothingPlaying, playing } from "./now-playing.ts";
import { PlayerActions, type PlayerHost } from "./player-actions.ts";
import { type PlayerCommands, playerKey } from "./player-keys.ts";
import { type AudioPlayerState, INITIAL_STATE, sleepMinutes, trackTime } from "./player-state.ts";
import { PlayerView, type PlayerViewProps, SPECTRUM_BANDS } from "./player-view.ts";

/** The transport's row and the modes' two rows under the display. */
const CONTROL_ROWS = 3;
/** The rows of tracks shown when not told. */
const SHOWN = 5;

/** A command that always does something. */
function done(run: () => void): () => boolean {
  return () => {
    run();
    return true;
  };
}

export interface AudioPlayerProps extends Pick<PlayerViewProps, "foreground"> {
  /** With no tracks, while nothing plays its rows stay, empty, so what is under it does not move. */
  readonly keepRows?: boolean;
  /** The tracks it plays; without, it works whatever stream plays. */
  readonly tracks?: PlayerViewProps["tracks"];
  /** The rows of tracks shown. */
  readonly shown?: number;
  /** The digits jump to a tenth of the way through, so the page takes them from page selection. */
  readonly digits?: boolean;
  /** Each track is taken up where the viewer last left it: for talks and podcasts, not music. */
  readonly resume?: boolean;
  /** A spectrum of what is heard, of this many rows, under the bar. */
  readonly spectrum?: number;
}

export class AudioPlayer extends Component<AudioPlayerProps, AudioPlayerState> {
  override state: AudioPlayerState = INITIAL_STATE;
  readonly #actions = new PlayerActions({
    services: (): ReturnType<PlayerHost["services"]> => this.services,
    state: (): AudioPlayerState => this.nextState(),
    set: (change): void => {
      this.setState(change);
    },
    tracks: (): ReturnType<PlayerHost["tracks"]> => this.props.tracks ?? [],
    resume: (): boolean => this.props.resume === true,
  });

  override needs(): PageNeeds {
    return { ownCopy: true, digits: this.props.digits === true };
  }

  override componentDidMount(): void {
    const session = this.services.session;
    if (session === null) {
      return;
    }
    this.#actions.look(session);
    this.setInterval(
      () => {
        this.#actions.look(session);
      },
      LOOK_MS,
      { whileViewed: true },
    );
  }

  /** What `session`'s keys ask of the player. */
  #commands(session: number): PlayerCommands {
    const actions = this.#actions;
    return {
      seek: (direction) => actions.seekBy(direction, session),
      jump: (digit) => actions.jump(digit, session),
      volume: (step) => actions.volume(step, session),
      mute: () => actions.mute(session),
      playPause: done(() => {
        actions.playPause(session);
      }),
      stop: done(() => {
        actions.stop(session);
      }),
      previous: done(() => {
        actions.previous(session);
      }),
      next: done(() => {
        actions.next(session);
      }),
      repeat: done(() => {
        actions.repeat();
      }),
      shuffle: done(() => {
        actions.shuffle();
      }),
      speed: (step) => actions.speed(step, session),
      loop: () => actions.loop(),
      sleep: done(() => {
        actions.sleep();
      }),
      remove: () => actions.remove(),
      move: (step) => actions.move(step),
      playNext: () => actions.playNext(),
    };
  }

  /** The arrows, the digits and a keyboard's letters; Enter and Space are the buttons' and the list's. */
  override onKey(event: KeyEvent): boolean {
    return playerKey(event, this.#commands(event.session), { hasTracks: (this.props.tracks ?? []).length > 0, digits: this.props.digits === true });
  }

  #status(): PlayerViewProps["status"] {
    const { listening, repeat, shuffle, unmuted, speed, loopFrom, loopTo, sleepAt } = this.state;
    return {
      gain: listening?.gain ?? null,
      muted: unmuted !== null,
      ...(this.props.tracks === undefined ? {} : { repeat, shuffle }),
      speed,
      loopFrom,
      loopTo,
      sleepMinutes: sleepAt === null || this.services.session === null ? null : sleepMinutes(sleepAt, this.services.now()),
    };
  }

  override render(): Child {
    const { listening, current, speed } = this.state;
    const { tracks, foreground } = this.props;
    if (tracks === undefined && !playing(listening)) {
      return nothingPlaying(this.props.keepRows === true, LISTENING_ROWS + CONTROL_ROWS);
    }
    const actions = this.#actions;
    return h(PlayerView, {
      listening: trackTime(listening, speed),
      ...(foreground === undefined ? {} : { foreground }),
      ...(tracks === undefined ? {} : { tracks }),
      queue: actions.queue(),
      current,
      shown: this.props.shown ?? SHOWN,
      levels: this.props.spectrum === undefined ? null : actions.levels(SPECTRUM_BANDS),
      spectrumRows: this.props.spectrum ?? 0,
      status: this.#status(),
      onPrevious: (session: number) => {
        actions.previous(session);
      },
      onPlayPause: (session: number) => {
        actions.playPause(session);
      },
      onStop: (session: number) => {
        actions.stop(session);
      },
      onNext: (session: number) => {
        actions.next(session);
      },
      onSeek: (fraction: number, session: number) => {
        actions.seekFraction(fraction, session);
      },
      onChoose: (track: number, session: number) => {
        actions.play(track, session);
      },
      onMove: (place: number) => {
        actions.select(place);
      },
    });
  }
}
