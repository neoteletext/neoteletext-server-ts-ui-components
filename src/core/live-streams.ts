// Each viewer's live stream (stream.ts): one at a time, bound to the page
// it was started on, sent a few blocks ahead of what has been heard as its
// samples come, paused at what was heard and resumed from there as a new
// generation.

import type { Context } from "../kit.ts";
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
function heard(stream: Stream, now: number): number {
  return stream.startedAt === null ? 0 : Math.min(stream.sent, Math.floor(((now - stream.startedAt) * stream.source.rate) / SECOND_MS));
}

export class LiveStreams {
  readonly #streams = new Map<number, Stream>();
  /** Each viewer's streams so far, for the next one's generation. */
  readonly #generations = new Map<number, number>();

  start(context: Context, session: number, page: number, source: StreamSource, from = 0): void {
    const generation = ((this.#generations.get(session) ?? 0) + 1) % WRAP;
    this.#generations.set(session, generation);
    const sound = { handle: STREAM_HANDLE, generation, rate: source.rate };
    context.sound({ session }, { live: sound });
    // Bound to the page: the receiver fades it out when the viewer leaves, before the server hears (the engine's audio.md 7.3).
    context.sound({ session }, { play: { channel: STREAM_CHANNEL, ...sound, page } });
    this.#streams.set(session, { source, page, generation, startedAt: null, sent: 0, nextBlock: 0, state: "waiting", from });
    this.pump(context, context.now());
  }

  stop(context: Context, session: number): void {
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
