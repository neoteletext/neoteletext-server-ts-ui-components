// What a player (audio-player.ts) does: plays a track, at its speed and,
// when asked, from where the viewer left it; pauses, stops, steps back and
// on in its order (play-order.ts), seeks in the track's own time, sets the
// volume, loops a part, sleeps, and edits its queue (queue-edit.ts). The
// component keeps the state; these read it as it will be and change it
// through the component, so a change made a moment before is seen.

import { bandLevels } from "../charts/band-levels.ts";
import type { Services } from "../core/services.ts";
import type { StreamSource } from "../core/stream.ts";
import { playing } from "./now-playing.ts";
import { following, nextRepeat, preceding, RESTART_MS, seekStep, shuffled } from "./play-order.ts";
import type { Track } from "./play-queue.ts";
import { type AudioPlayerState, nextSleep, trackTime } from "./player-state.ts";
import { moveBy, playNext, removeAt } from "./queue-edit.ts";
import { SPEEDS, stretched } from "./time-stretch.ts";

/** The digits jump to tenths of the way. */
const DIGIT_PARTS = 10;
const SECOND_MS = 1_000;

/** What the actions reach of the component. */
export interface PlayerHost {
  services(): Services;
  state(): AudioPlayerState;
  set(change: Partial<AudioPlayerState>): void;
  tracks(): readonly Track[];
  /** Tracks are taken up where the viewer left them. */
  resume(): boolean;
}

export class PlayerActions {
  readonly #host: PlayerHost;
  /** The track's source as made, before any speed: a new speed stretches it again. */
  #base: StreamSource | null = null;

  constructor(host: PlayerHost) {
    this.#host = host;
  }

  get #state(): AudioPlayerState {
    return this.#host.state();
  }

  get #services(): Services {
    return this.#host.services();
  }

  /** The levels of `bands` bands of what is heard now, for a spectrum: from the track as made, at the place heard in it; none while nothing plays. */
  levels(bands: number): number[] {
    const heard = this.#heard();
    if (this.#base === null || heard === null || !playing(heard)) {
      return [];
    }
    return bandLevels(this.#base.samples(), this.#base.rate, Math.round((heard.heardMs * this.#base.rate) / SECOND_MS), bands);
  }

  /** The tracks in their queue, as the page gave them unless edited. */
  queue(): readonly number[] {
    return this.#state.queue ?? this.#host.tracks().map((_, index) => index);
  }

  /** The order it plays in: shuffled while it shuffles, else the queue's. */
  #order(): readonly number[] {
    const { shuffle, order } = this.#state;
    const queue = this.queue();
    return shuffle && order.length === queue.length ? order : queue;
  }

  /** What plays, in the track's own time. */
  #heard(): ReturnType<typeof trackTime> {
    return trackTime(this.#state.listening, this.#state.speed);
  }

  /** Looks at what plays: plays what comes next when its track ended, loops, and sleeps when it is time. */
  look(session: number): void {
    const listening = this.#services.listening(session);
    this.#host.set({ listening });
    const { current, started, repeat, loopFrom, loopTo, sleepAt } = this.#state;
    if (sleepAt !== null && this.#services.now() >= sleepAt) {
      this.#host.set({ sleepAt: null });
      this.#services.pauseStream(session);
      return;
    }
    const heard = this.#heard();
    if (loopFrom !== null && loopTo !== null && heard !== null && playing(heard) && heard.heardMs >= loopTo) {
      this.seekTo(loopFrom, session);
      return;
    }
    if (current === null || listening?.state !== "ended" || listening.name !== started) {
      return;
    }
    const next = repeat === "one" ? current : following(this.#order(), current, repeat);
    if (next !== null) {
      this.play(next, session);
    }
  }

  /** Plays track `index` at the speed set, from where the viewer left it when it resumes. */
  play(index: number, session: number): void {
    const track = this.#host.tracks()[index];
    if (track === undefined) {
      return;
    }
    this.#base = track.source();
    const { speed } = this.#state;
    const place = this.#host.resume() ? (this.#services.streamPlace(session, this.#base.name) ?? 0) : 0;
    const source = stretched(this.#base, speed);
    this.#services.stream(source, session, place / speed);
    this.#host.set({ current: index, started: source.name, loopFrom: null, loopTo: null });
    this.look(session);
  }

  playPause(session: number): void {
    const { listening, current } = this.#state;
    const state = listening?.state;
    if (state === "playing" || state === "waiting") {
      this.#services.pauseStream(session);
    } else if (state === "paused") {
      this.#services.resumeStream(session);
    } else {
      const first = current ?? this.#order()[0];
      if (first !== undefined) {
        this.play(first, session);
      }
    }
    this.look(session);
  }

  stop(session: number): void {
    this.#services.stopStream(session);
    this.look(session);
  }

  /** Next, past a repeated track: repeat one holds a track only as it ends. */
  next(session: number): void {
    const { current, repeat } = this.#state;
    const next = current === null ? this.#order()[0] : following(this.#order(), current, repeat === "all" ? "all" : "off");
    if (next !== undefined && next !== null) {
      this.play(next, session);
    }
  }

  /** Previous: the track again from its start once it is well under way, or when there is none before it. */
  previous(session: number): void {
    const { current, repeat } = this.#state;
    const before = current === null ? null : preceding(this.#order(), current, repeat === "all" ? "all" : "off");
    const heard = this.#heard();
    if (before === null || (heard !== null && heard.heardMs > RESTART_MS)) {
      this.seekTo(0, session);
    } else {
      this.play(before, session);
    }
  }

  /** Seeks to `ms` into the track, in its own time. */
  seekTo(ms: number, session: number): void {
    this.#services.seekStream(session, ms / this.#state.speed);
    this.look(session);
  }

  seekBy(direction: 1 | -1, session: number): boolean {
    const heard = this.#heard();
    if (!playing(heard)) {
      return false;
    }
    this.seekTo(heard.heardMs + direction * seekStep(heard.lengthMs), session);
    return true;
  }

  /** Seeks to `fraction` of the way through the track. */
  seekFraction(fraction: number, session: number): boolean {
    const length = this.#heard()?.lengthMs ?? null;
    if (length === null) {
      return false;
    }
    this.seekTo(length * fraction, session);
    return true;
  }

  jump(digit: number, session: number): boolean {
    return this.seekFraction(digit / DIGIT_PARTS, session);
  }

  /** Moves the volume by `step`, unmuting from where it was muted. */
  volume(step: number, session: number): boolean {
    const { listening, unmuted } = this.#state;
    if (listening === null) {
      return false;
    }
    // The runtime keeps the gain to 0 to FULL_GAIN.
    this.#services.streamGain(session, (unmuted ?? listening.gain) + step);
    this.#host.set({ unmuted: null });
    this.look(session);
    return true;
  }

  mute(session: number): boolean {
    const { listening, unmuted } = this.#state;
    if (listening === null) {
      return false;
    }
    this.#services.streamGain(session, unmuted ?? 0);
    this.#host.set({ unmuted: unmuted === null ? listening.gain : null });
    this.look(session);
    return true;
  }

  repeat(): void {
    this.#host.set({ repeat: nextRepeat(this.#state.repeat) });
  }

  shuffle(): void {
    const shuffle = !this.#state.shuffle;
    const queue = this.queue();
    const { current } = this.#state;
    const first = current === null ? null : queue.indexOf(current);
    const order = shuffle ? shuffled(queue.length, first === -1 ? null : first, (bound) => this.#services.below(bound)).map((place) => queue[place] ?? 0) : [];
    this.#host.set({ shuffle, order });
  }

  /** One speed faster (`step` 1) or slower (-1): what plays goes on from the same place in its track. */
  speed(step: 1 | -1, session: number): boolean {
    const { speed: was, listening } = this.#state;
    const speed = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, SPEEDS.indexOf(was) + step))] ?? was;
    if (speed === was) {
      return false;
    }
    this.#host.set({ speed });
    const heard = trackTime(listening, was);
    if (this.#base === null || heard === null || !playing(heard)) {
      return true;
    }
    this.#services.stream(stretched(this.#base, speed), session, heard.heardMs / speed);
    if (heard.state === "paused") {
      this.#services.pauseStream(session);
    }
    this.look(session);
    return true;
  }

  /** The A–B loop: from here, then to here, then off. */
  loop(): boolean {
    const heard = this.#heard();
    const { loopFrom, loopTo } = this.#state;
    if (!playing(heard)) {
      return false;
    }
    if (loopFrom === null) {
      this.#host.set({ loopFrom: heard.heardMs });
    } else if (loopTo === null && heard.heardMs > loopFrom) {
      this.#host.set({ loopTo: heard.heardMs });
    } else {
      this.#host.set({ loopFrom: null, loopTo: null });
    }
    return true;
  }

  /** The sleep timer's next setting. */
  sleep(): void {
    this.#host.set({ sleepAt: nextSleep(this.#state.sleepAt, this.#services.now()) });
  }

  /** The list's choice moved to `place` in the queue. */
  select(place: number): void {
    this.#host.set({ selected: place });
  }

  /** The track at the list's choice: out of the queue, up or down one, or next to play. */
  remove(): boolean {
    const removed = this.queue()[this.#state.selected];
    const { queue, at } = removeAt(this.queue(), this.#state.selected);
    this.#host.set({ queue, selected: at, order: this.#state.order.filter((track) => track !== removed) });
    return removed !== undefined;
  }

  move(step: 1 | -1): boolean {
    const { queue, at } = moveBy(this.queue(), this.#state.selected, step);
    this.#host.set({ queue, selected: at });
    return true;
  }

  playNext(): boolean {
    const { selected, current, shuffle, order } = this.#state;
    const track = this.queue()[selected];
    const edited = playNext(this.queue(), selected, current);
    const reordered = shuffle && track !== undefined ? playNext(order, order.indexOf(track), current).queue : order;
    this.#host.set({ queue: edited.queue, selected: edited.at, order: reordered });
    return track !== undefined;
  }
}
