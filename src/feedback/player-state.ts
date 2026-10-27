// What a player (audio-player.ts) keeps for its viewer: what plays and the
// track it is, its modes, its queue and where the list's choice is in it,
// its speed, the part of the track it loops, and when it goes to sleep;
// and the track's own time, which is the stream's at speed 1.

import type { Listening } from "../core/stream.ts";
import type { Repeat } from "./play-order.ts";
import type { Speed } from "./time-stretch.ts";

export interface AudioPlayerState {
  /** What plays, as the stream reports it: in the stream's time. */
  readonly listening: Listening | null;
  /** The track it plays, or last played, or null. */
  readonly current: number | null;
  /** The name of the source it started, to tell its stream ending from another's. */
  readonly started: string | null;
  readonly repeat: Repeat;
  readonly shuffle: boolean;
  /** The order shuffled, while it shuffles. */
  readonly order: readonly number[];
  /** The gain before muting, or null while not muted. */
  readonly unmuted: number | null;
  /** The tracks in the order queued, or null for the page's order. */
  readonly queue: readonly number[] | null;
  /** The place in the queue the list's choice is at. */
  readonly selected: number;
  readonly speed: Speed;
  /** The part of the track looped, in its own milliseconds: from, then to once set. */
  readonly loopFrom: number | null;
  readonly loopTo: number | null;
  /** When it pauses, by the channel's clock, or null. */
  readonly sleepAt: number | null;
}

export const INITIAL_STATE: AudioPlayerState = {
  listening: null,
  current: null,
  started: null,
  repeat: "off",
  shuffle: false,
  order: [],
  unmuted: null,
  queue: null,
  selected: 0,
  speed: 1,
  loopFrom: null,
  loopTo: null,
  sleepAt: null,
};

/** What plays in the track's own time: a stream at double speed has heard twice as far into its track as it has played. */
export function trackTime(listening: Listening | null, speed: number): Listening | null {
  if (listening === null) {
    return null;
  }
  return { ...listening, heardMs: listening.heardMs * speed, lengthMs: listening.lengthMs === null ? null : listening.lengthMs * speed };
}

/** The sleep timer's settings in minutes, which its key turns through, then off. */
const SLEEP_MINUTES = [15, 30, 60] as const;
const MINUTE_MS = 60_000;

/** When the sleep timer set after `sleepAt` pauses, from `now`: the next setting, or off after the last. */
export function nextSleep(sleepAt: number | null, now: number): number | null {
  const left = sleepAt === null ? 0 : Math.ceil((sleepAt - now) / MINUTE_MS);
  const next = SLEEP_MINUTES.find((minutes) => minutes > left);
  return next === undefined ? null : now + next * MINUTE_MS;
}

/** The whole minutes before the sleep timer pauses, at least one. */
export function sleepMinutes(sleepAt: number, now: number): number {
  return Math.max(1, Math.ceil((sleepAt - now) / MINUTE_MS));
}
