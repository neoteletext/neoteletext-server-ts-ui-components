// A player's queue (audio-player.ts) as a list to choose from: the tracks
// in the order queued, the one it plays marked with a star, so it shows
// without colour; choosing one plays it, and where the choice is, the
// player is told, for the keys that edit the queue there. The choice
// follows its track as the queue is edited.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import type { StreamSource } from "../core/stream.ts";
import { ChoiceList } from "../lists/choice-list.ts";

/** A track: its name, for the list before it plays, and its source, made when it is played. */
export interface Track {
  readonly name: string;
  readonly source: () => StreamSource;
}

/** What marks the track the player plays, and the others' place. */
const PLAYING_MARK = "*";
const OTHER_MARK = " ";
/** What the player's keys do while the list has them (player-keys.ts). */
const HINT = "Enter plays  Left Right seek";

export interface PlayQueueProps {
  readonly tracks: readonly Track[];
  /** The tracks' places in `tracks`, in the order queued. */
  readonly queue: readonly number[];
  /** The track the player plays, by its place in `tracks`, or null. */
  readonly current: number | null;
  /** The rows the list shows. */
  readonly shown: number;
  /** A track chosen, by its place in `tracks`. */
  readonly onChoose: (track: number, session: number) => void;
  /** The list's choice moved to `place` in the queue. */
  readonly onMove?: (place: number, session: number) => void;
}

export class PlayQueue extends Component<PlayQueueProps> {
  override render(): Child {
    const { tracks, queue, current } = this.props;
    return h(ChoiceList<number>, {
      items: queue,
      text: (track: number) => `${track === current ? PLAYING_MARK : OTHER_MARK}${tracks[track]?.name ?? ""}`,
      // A track is in the queue once: its place in the page's list tells it from the others.
      itemKey: String,
      shown: this.props.shown,
      hint: HINT,
      empty: "no tracks",
      onChoose: (place: number, session: number) => {
        const track = queue[place];
        if (track !== undefined) {
          this.props.onChoose(track, session);
        }
      },
      ...(this.props.onMove === undefined ? {} : { onMove: this.props.onMove }),
    });
  }
}
