// Each viewer's live stream (stream.ts): one at a time, bound to the page
// it was started on, sent as Opus a little ahead of what has been heard as
// its samples come (live-stream.ts), paused at what was heard and resumed
// from there as a new generation; moved to another place the same way. Each viewer's gain is
// kept across their streams, so the next plays as loud as the last, and
// where each stream stopped short of its end, by its name and in the time
// of what it holds (a stretched source's speed undone), so a player can
// take it up there again at any speed.

import { type Context, FULL_GAIN, type OpusEncoder } from "../kit.ts";
import { LiveStream } from "./live-stream.ts";
import { FIRST_PACKETS_MS, type Listening, SECOND_MS, STREAM_CHANNEL, STREAM_HANDLE, type StreamSource, TICK_MS, WRAP } from "./stream.ts";

/** The places kept for each viewer: a long listening session's worth of tracks. */
const MOST_PLACES = 64;

export class LiveStreams {
  readonly #encoder: OpusEncoder;
  readonly #streams = new Map<number, LiveStream>();
  /** Each viewer's streams so far, for the next one's generation. */
  readonly #generations = new Map<number, number>();
  /** Each viewer's gain, when they have changed it from full. */
  readonly #gains = new Map<number, number>();
  /** Where each viewer's streams stopped short of their ends, by name, in milliseconds: the most recent last. */
  readonly #places = new Map<number, Map<string, number>>();

  constructor(encoder: OpusEncoder) {
    this.#encoder = encoder;
  }

  start(context: Context, session: number, page: number, source: StreamSource, from = 0): void {
    this.#keepPlace(session, context.now());
    this.#streams.get(session)?.close();
    const generation = ((this.#generations.get(session) ?? 0) + 1) % WRAP;
    this.#generations.set(session, generation);
    const encoder = this.#encoder.stream(source.rate);
    context.sound({ session }, { opusLive: { handle: STREAM_HANDLE, generation, packetBytes: encoder.packetBytes } });
    // Bound to the page: the receiver fades it out when the viewer leaves, before the server hears (the engine's audio.md 7.3).
    context.sound({ session }, { play: { channel: STREAM_CHANNEL, handle: STREAM_HANDLE, generation, page, gain: this.#gain(session) } });
    this.#streams.set(session, new LiveStream(source, page, generation, from, encoder));
    this.pump(context, context.now());
  }

  #gain(session: number): number {
    return this.#gains.get(session) ?? FULL_GAIN;
  }

  /** Sets how loud the viewer's streams play, `gain` brought to a whole 0 to FULL_GAIN; the one playing changes now. */
  setGain(context: Context, session: number, gain: number): void {
    const kept = Number.isFinite(gain) ? Math.min(FULL_GAIN, Math.max(0, Math.round(gain))) : FULL_GAIN;
    this.#gains.set(session, kept);
    if (this.#streams.has(session)) {
      context.sound({ session }, { gain: { channel: STREAM_CHANNEL, gain: kept } });
    }
  }

  /** Moves the viewer's stream to `ms` from its start, within what is known of it: paused, it stays paused there; else it plays from there as a new generation. */
  seek(context: Context, session: number, ms: number): void {
    const stream = this.#streams.get(session);
    if (stream === undefined || stream.state === "failed") {
      return;
    }
    const known = stream.source.samples().length;
    const at = Math.min(known, LiveStreams.sampleAt(stream.source, ms));
    if (stream.state === "paused") {
      this.#streams.set(session, LiveStream.paused(stream.source, stream.page, stream.generation, at));
      return;
    }
    this.start(context, session, stream.page, stream.source, at);
  }

  stop(context: Context, session: number): void {
    this.#keepPlace(session, context.now());
    this.#streams.get(session)?.close();
    if (this.#streams.delete(session)) {
      context.sound({ session }, { stop: { channel: STREAM_CHANNEL } });
    }
  }

  /** The viewer left `page`: a stream bound to it stops. */
  left(context: Context, session: number, page: number): void {
    if (this.#streams.get(session)?.page === page) {
      this.stop(context, session);
    }
  }

  /** The viewer went: everything kept for them goes. */
  forget(session: number): void {
    this.#streams.get(session)?.close();
    this.#streams.delete(session);
    this.#generations.delete(session);
    this.#gains.delete(session);
    this.#places.delete(session);
  }

  /** The sample `ms` into `source`: whole, and not before its start. */
  static sampleAt(source: StreamSource, ms: number): number {
    return Number.isFinite(ms) ? Math.max(0, Math.round((ms * source.rate) / SECOND_MS)) : 0;
  }

  /** Where the viewer's stream of `name` stopped short of its end, in milliseconds of what it holds, or null. */
  place(session: number, name: string): number | null {
    return this.#places.get(session)?.get(name) ?? null;
  }

  /** Keeps where the viewer's stream is, as it is stopped or replaced: forgotten once it played to its end. */
  #keepPlace(session: number, now: number): void {
    const listening = this.listening(session, now);
    const speed = this.#streams.get(session)?.source.speed ?? 1;
    if (listening === null) {
      return;
    }
    const places = this.#places.get(session) ?? new Map<string, number>();
    places.delete(listening.name);
    if (listening.state !== "ended") {
      places.set(listening.name, listening.heardMs * speed);
    }
    // Bounded: a viewer who plays without end keeps the most recent only.
    for (const name of [...places.keys()].slice(0, Math.max(0, places.size - MOST_PLACES))) {
      places.delete(name);
    }
    this.#places.set(session, places);
  }

  /** The receiver stops the sound; the stream is kept, paused at what was heard, sending nothing. */
  pause(context: Context, session: number): void {
    const stream = this.#streams.get(session);
    if (stream === undefined || (stream.state !== "playing" && stream.state !== "waiting")) {
      return;
    }
    const at = stream.from + stream.heard(context.now());
    context.sound({ session }, { stop: { channel: STREAM_CHANNEL } });
    stream.close();
    this.#streams.set(session, LiveStream.paused(stream.source, stream.page, stream.generation, at));
  }

  /** A new stream, of a new generation, from where the paused one was. */
  resume(context: Context, session: number): void {
    const stream = this.#streams.get(session);
    if (stream?.state === "paused") {
      this.start(context, session, stream.page, stream.source, stream.from);
    }
  }

  listening(session: number, now: number): Listening | null {
    const stream = this.#streams.get(session);
    if (stream === undefined) {
      return null;
    }
    const { source } = stream;
    const at = stream.from + stream.heard(now);
    const length = source.complete ? source.samples().length : source.expected;
    const { failure } = stream;
    return {
      name: source.name,
      heardMs: Math.floor((at * SECOND_MS) / source.rate),
      lengthMs: length === null ? null : Math.floor((length * SECOND_MS) / source.rate),
      state: failure === null ? stream.state : "failed",
      failure,
      gain: this.#gain(session),
    };
  }

  /** When the streams want their next tick, or null when none is sending or still to be heard: sooner while one waits for its encoder's first packets. */
  nextTick(now: number): number | null {
    const streams = [...this.#streams.values()];
    if (streams.some((stream) => stream.state === "waiting" && stream.failure === null)) {
      return now + FIRST_PACKETS_MS;
    }
    return streams.some((stream) => stream.state === "playing") ? now + TICK_MS : null;
  }

  /** Feeds and sends each stream what is due by `now`. */
  pump(context: Context, now: number): void {
    for (const [session, stream] of this.#streams) {
      stream.pump(context, session, now);
    }
  }
}
