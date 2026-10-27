// Each viewer's live stream (stream.ts): one at a time, bound to the page
// it was started on, sent a few blocks ahead of what has been heard as its
// samples come, paused at what was heard and resumed from there as a new
// generation; moved to another place the same way. Each viewer's gain is
// kept across their streams, so the next plays as loud as the last, and
// where each stream stopped short of its end, by its name and in the time
// of what it holds (a stretched source's speed undone), so a player can
// take it up there again at any speed.

import { type Context, FULL_GAIN } from "../kit.ts";
import { BLOCK_SAMPLES, LEAD_MS, type Listening, MOST_BLOCKS, SECOND_MS, STREAM_CHANNEL, STREAM_HANDLE, type StreamSource, WRAP } from "./stream.ts";

interface Stream {
  readonly source: StreamSource;
  readonly page: number;
  readonly generation: number;
  /** When its first block was sent, by the channel's clock, or null while it waits for samples. */
  startedAt: number | null;
  /** Samples sent. */
  sent: number;
  nextBlock: number;
  state: Listening["state"];
  /** The sample this generation starts from: 0, or where it was paused. */
  readonly from: number;
}

/** Samples of `stream` heard by `now`: what was sent and has had time to play. */
/** The places kept for each viewer: a long listening session's worth of tracks. */
const MOST_PLACES = 64;

function heard(stream: Stream, now: number): number {
  return stream.startedAt === null ? 0 : Math.min(stream.sent, Math.floor(((now - stream.startedAt) * stream.source.rate) / SECOND_MS));
}

export class LiveStreams {
  readonly #streams = new Map<number, Stream>();
  /** Each viewer's streams so far, for the next one's generation. */
  readonly #generations = new Map<number, number>();
  /** Each viewer's gain, when they have changed it from full. */
  readonly #gains = new Map<number, number>();
  /** Where each viewer's streams stopped short of their ends, by name, in milliseconds: the most recent last. */
  readonly #places = new Map<number, Map<string, number>>();

  start(context: Context, session: number, page: number, source: StreamSource, from = 0): void {
    this.#keepPlace(session, context.now());
    const generation = ((this.#generations.get(session) ?? 0) + 1) % WRAP;
    this.#generations.set(session, generation);
    const sound = { handle: STREAM_HANDLE, generation, rate: source.rate };
    context.sound({ session }, { live: sound });
    // Bound to the page: the receiver fades it out when the viewer leaves, before the server hears (the engine's audio.md 7.3).
    context.sound({ session }, { play: { channel: STREAM_CHANNEL, ...sound, page, gain: this.#gain(session) } });
    this.#streams.set(session, { source, page, generation, startedAt: null, sent: 0, nextBlock: 0, state: "waiting", from });
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
      this.#streams.set(session, { ...stream, from: at });
      return;
    }
    this.start(context, session, stream.page, stream.source, at);
  }

  stop(context: Context, session: number): void {
    this.#keepPlace(session, context.now());
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
    const at = stream.from + heard(stream, context.now());
    context.sound({ session }, { stop: { channel: STREAM_CHANNEL } });
    this.#streams.set(session, { ...stream, startedAt: null, sent: 0, nextBlock: 0, state: "paused", from: at });
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
    const at = stream.from + heard(stream, now);
    const length = source.complete ? source.samples().length : source.expected;
    return {
      name: source.name,
      heardMs: Math.floor((at * SECOND_MS) / source.rate),
      lengthMs: length === null ? null : Math.floor((length * SECOND_MS) / source.rate),
      state: source.failure === null ? stream.state : "failed",
      failure: source.failure,
      gain: this.#gain(session),
    };
  }

  /** Whether a stream is still sending, or still to be heard to its end: it wants its tick. */
  active(): boolean {
    return [...this.#streams.values()].some((stream) => stream.state === "waiting" || stream.state === "playing");
  }

  /** Sends each stream's blocks due by `now` and the lead, as far as its samples are known. */
  pump(context: Context, now: number): void {
    for (const [session, stream] of this.#streams) {
      const { source } = stream;
      if (source.failure !== null) {
        stream.state = "failed";
        continue;
      }
      if (stream.state === "paused") {
        continue;
      }
      const samples = source.samples().subarray(stream.from);
      if (stream.startedAt === null) {
        if (samples.length < BLOCK_SAMPLES && !source.complete) {
          continue;
        }
        stream.startedAt = now;
        stream.state = "playing";
      }
      this.#send(context, session, stream, samples, now);
      if (source.complete && Math.floor(((now - stream.startedAt) * source.rate) / SECOND_MS) >= samples.length) {
        stream.state = "ended";
      }
    }
  }

  /** The blocks of `stream` due by `now`, at most a message's; the last block filled out with silence. */
  #send(context: Context, session: number, stream: Stream, samples: Int16Array, now: number): void {
    const { source } = stream;
    const due = Math.floor(((now - (stream.startedAt ?? now) + LEAD_MS) * source.rate) / SECOND_MS);
    const known = source.complete ? Math.ceil(samples.length / BLOCK_SAMPLES) * BLOCK_SAMPLES : samples.length;
    const count = Math.min(MOST_BLOCKS, Math.floor((Math.min(due, known) - stream.sent) / BLOCK_SAMPLES));
    if (count <= 0) {
      return;
    }
    const blocks = new Int16Array(count * BLOCK_SAMPLES);
    blocks.set(samples.subarray(stream.sent, Math.min(samples.length, stream.sent + blocks.length)));
    context.sound(
      { session },
      { blocks: { handle: STREAM_HANDLE, generation: stream.generation, rate: source.rate, first: stream.nextBlock, samples: blocks } },
    );
    stream.sent += blocks.length;
    stream.nextBlock = (stream.nextBlock + count) % WRAP;
  }
}
