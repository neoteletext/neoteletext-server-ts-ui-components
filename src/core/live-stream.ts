// One generation of a viewer's stream (stream.ts): its samples fed to its
// own Opus encoder ahead of real time, and the packets that come out sent
// to the viewer a tick at a time, never more ahead of what they hear than
// the receiver's ring holds. The encoder may give packets out later than it
// is written to, so they are held until they are due; the stream starts
// once the first have come.

import { type Context, OPUS_FRAME_MS, type OpusStream } from "../kit.ts";
import { FEED_LEAD_MS, type Listening, RING_BLOCKS, SECOND_MS, SEND_LEAD_MS, STREAM_HANDLE, type StreamSource, WRAP } from "./stream.ts";

/** The most packets held for sending: what is fed ahead, twice over; an encoder giving out more has gone wrong. */
const MOST_HELD = Math.ceil((2 * FEED_LEAD_MS) / OPUS_FRAME_MS);

export class LiveStream {
  readonly source: StreamSource;
  readonly page: number;
  readonly generation: number;
  /** The sample this generation starts from: 0, or where it was paused or moved to. */
  readonly from: number;
  state: Listening["state"];
  /** When its first packets were sent, by the channel's clock, or null while it waits for them. */
  #startedAt: number | null = null;
  #encoder: OpusStream | null;
  /** Samples written to the encoder, from `from`. */
  #fed = 0;
  #ended = false;
  #held: Uint8Array[] = [];
  #sent = 0;
  #failure: string | null = null;

  constructor(source: StreamSource, page: number, generation: number, from: number, encoder: OpusStream | null) {
    this.source = source;
    this.page = page;
    this.generation = generation;
    this.from = from;
    this.#encoder = encoder;
    this.state = encoder === null ? "paused" : "waiting";
  }

  /** A stream stopped at `from`, sending nothing, for its resumption as a new generation. */
  static paused(source: StreamSource, page: number, generation: number, from: number): LiveStream {
    return new LiveStream(source, page, generation, from, null);
  }

  get failure(): string | null {
    return this.source.failure ?? this.#encoder?.failure ?? this.#failure;
  }

  /** Samples of the source heard by `now`, from `from`: what was sent and has had time to play. */
  heard(now: number): number {
    if (this.#startedAt === null) {
      return 0;
    }
    const sent = Math.floor((this.#sent * OPUS_FRAME_MS * this.source.rate) / SECOND_MS);
    return Math.min(sent, Math.floor(((now - this.#startedAt) * this.source.rate) / SECOND_MS));
  }

  /** Feeds the encoder, takes what it gave out, and sends the viewer what is due by `now`. */
  pump(context: Context, session: number, now: number): void {
    if (this.#encoder === null || this.state === "ended") {
      return;
    }
    if (this.failure !== null) {
      this.state = "failed";
      this.close();
      return;
    }
    const samples = this.source.samples().subarray(this.from);
    this.#feed(this.#encoder, samples, now);
    this.#hold(this.#encoder);
    if (this.#startedAt === null) {
      if (this.#held.length === 0) {
        return;
      }
      this.#startedAt = now;
      this.state = "playing";
    }
    this.#send(context, session, this.#encoder.packetBytes, now);
    if (this.#ended && this.#held.length === 0 && ((now - this.#startedAt) * this.source.rate) / SECOND_MS >= samples.length) {
      this.state = "ended";
      this.close();
    }
  }

  /** Stops its encoder; it sends nothing more. */
  close(): void {
    this.#encoder?.close();
  }

  #feed(encoder: OpusStream, samples: Int16Array, now: number): void {
    const elapsed = this.#startedAt === null ? 0 : now - this.#startedAt;
    const due = Math.min(samples.length, Math.floor(((elapsed + FEED_LEAD_MS) * this.source.rate) / SECOND_MS));
    if (due > this.#fed) {
      encoder.write(samples.subarray(this.#fed, due));
      this.#fed = due;
    }
    if (this.source.complete && this.#fed === samples.length && !this.#ended) {
      encoder.end();
      this.#ended = true;
    }
  }

  #hold(encoder: OpusStream): void {
    const out = encoder.take();
    for (let at = 0; at + encoder.packetBytes <= out.length; at += encoder.packetBytes) {
      this.#held.push(out.subarray(at, at + encoder.packetBytes));
    }
    if (this.#held.length > MOST_HELD) {
      this.#failure = `the encoder gave out more than ${MOST_HELD} packets ahead`;
    }
  }

  /** The packets due by `now` and the lead, at most the ring's. */
  #send(context: Context, session: number, packetBytes: number, now: number): void {
    const due = Math.floor((now - (this.#startedAt ?? now) + SEND_LEAD_MS) / OPUS_FRAME_MS);
    const count = Math.min(RING_BLOCKS, this.#held.length, due - this.#sent);
    if (count <= 0) {
      return;
    }
    const packets = new Uint8Array(count * packetBytes);
    this.#held.splice(0, count).forEach((packet, index) => {
      packets.set(packet, index * packetBytes);
    });
    context.sound({ session }, { opusPackets: { handle: STREAM_HANDLE, generation: this.generation, packetBytes, first: this.#sent % WRAP, packets } });
    this.#sent += count;
  }
}
