// A stream played faster or slower without changing its pitch, as a
// podcast player's speed does: a source (core/stream.ts) made from another
// by WSOLA, waveform-similarity overlap-add (Verhelst and Roelands, "An
// overlap-add technique based on waveform similarity", ICASSP 1993). Frames of the input, each
// under a Hann window, are added half a frame apart in the output, taken
// from the input `speed` times as far apart; each frame is moved a little
// from where it would fall to where it best continues the frame before,
// so no beat or echo is heard where they join. The output is made as it is
// asked for, a couple of seconds at a time, so a long track costs nothing
// until it plays, and it waits for an input still being decoded as the
// stream waits for any source.

import type { StreamSource } from "../core/stream.ts";

/** A frame's length: long enough to hold a voice's pitch period, short enough that a join is not heard. */
const FRAME_MS = 32;
/** How far a frame may move to find where it best continues the one before: about the longest pitch period. */
const TOLERANCE_MS = 8;
/** Every how many samples the match is measured: a quarter of them finds the same place at a quarter of the cost. */
const DECIMATE = 4;
/** The output made at most each time it is asked for: more than the stream sends ahead (LEAD_MS) and a tick. */
const AHEAD_MS = 2_000;
const SECOND_MS = 1_000;
/** The output's first room at most, grown by doubling as it fills: a source's expected length is its program's word, not to be trusted with an allocation. */
const FIRST_ROOM_MS = 600_000;
/** The largest sample, either way. */
const PEAK = 32_767;

/** The speeds a player offers: from half to double. */
export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

/** A Hann window of `length`, periodic so windows half a frame apart sum to one. */
function hann(length: number): Float32Array {
  return Float32Array.from({ length }, (_, index) => 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / length));
}

/** How alike `input` is at `a` and `b` over `length` samples, measured every DECIMATE. */
function likeness(input: Int16Array, a: number, b: number, length: number): number {
  let sum = 0;
  for (let index = 0; index < length; index += DECIMATE) {
    sum += (input[a + index] ?? 0) * (input[b + index] ?? 0);
  }
  return sum;
}

class Stretched implements StreamSource {
  readonly name: string;
  readonly rate: StreamSource["rate"];
  readonly expected: number | null;
  readonly speed: number;
  readonly #source: StreamSource;
  readonly #speed: number;
  readonly #frame: number;
  readonly #hop: number;
  readonly #tolerance: number;
  readonly #window: Float32Array;
  readonly #ahead: number;
  #sum: Float32Array;
  #out: Int16Array;
  /** Frames added so far, and where in the input the last began. */
  #frames = 0;
  #lastStart = 0;
  /** Output samples no frame will add to again. */
  #final = 0;
  #complete = false;

  constructor(source: StreamSource, speed: number) {
    this.#source = source;
    this.#speed = speed;
    this.speed = speed;
    this.name = source.name;
    this.rate = source.rate;
    this.expected = source.expected === null ? null : Math.ceil(source.expected / speed);
    this.#hop = Math.max(1, Math.round((source.rate * FRAME_MS) / SECOND_MS / 2));
    this.#frame = 2 * this.#hop;
    this.#tolerance = Math.round((source.rate * TOLERANCE_MS) / SECOND_MS);
    this.#window = hann(this.#frame);
    this.#ahead = Math.ceil((source.rate * AHEAD_MS) / SECOND_MS / this.#hop);
    const most = Math.round((source.rate * FIRST_ROOM_MS) / SECOND_MS);
    const room = Math.min(this.expected ?? most, most) + this.#frame;
    this.#sum = new Float32Array(room);
    this.#out = new Int16Array(room);
  }

  get failure(): string | null {
    return this.#source.failure;
  }

  get complete(): boolean {
    return this.#complete;
  }

  samples(): Int16Array {
    const input = this.#source.samples();
    for (let made = 0; made < this.#ahead && !this.#complete; made += 1) {
      if (!this.#addFrame(input)) {
        break;
      }
    }
    return this.#out.subarray(0, this.#final);
  }

  /** Adds the next frame, if the input holds it; answers whether it did. */
  #addFrame(input: Int16Array): boolean {
    const nominal = Math.round(this.#frames * this.#hop * this.#speed);
    const last = input.length - this.#frame;
    if (nominal > last) {
      if (this.#source.complete) {
        this.#finish();
      }
      return false;
    }
    const start = this.#frames === 0 ? 0 : this.#bestStart(input, nominal, last);
    const at = this.#frames * this.#hop;
    this.#room(at + this.#frame);
    for (let index = 0; index < this.#frame; index += 1) {
      this.#sum[at + index] = (this.#sum[at + index] ?? 0) + (this.#window[index] ?? 0) * (input[start + index] ?? 0);
    }
    this.#settle(at);
    this.#frames += 1;
    this.#lastStart = start;
    return true;
  }

  /** Where near `nominal` a frame best continues the last: its natural next half frame. */
  #bestStart(input: Int16Array, nominal: number, last: number): number {
    const natural = this.#lastStart + this.#hop;
    let best = nominal;
    let bestLikeness = Number.NEGATIVE_INFINITY;
    for (let start = Math.max(0, nominal - this.#tolerance); start <= Math.min(last, nominal + this.#tolerance); start += 1) {
      const alike = likeness(input, natural, start, this.#hop);
      if (alike > bestLikeness) {
        best = start;
        bestLikeness = alike;
      }
    }
    return best;
  }

  /** The output before `until` is final: no frame adds to it again. */
  #settle(until: number): void {
    for (let index = this.#final; index < until; index += 1) {
      this.#out[index] = Math.max(-PEAK, Math.min(PEAK, Math.round(this.#sum[index] ?? 0)));
    }
    this.#final = Math.max(this.#final, until);
  }

  #finish(): void {
    this.#settle(this.#frames === 0 ? 0 : (this.#frames - 1) * this.#hop + this.#frame);
    this.#complete = true;
  }

  /** Grows the output's room to hold `needed` samples. */
  #room(needed: number): void {
    if (needed <= this.#sum.length) {
      return;
    }
    const size = Math.max(needed, 2 * this.#sum.length);
    const sum = new Float32Array(size);
    sum.set(this.#sum);
    const out = new Int16Array(size);
    out.set(this.#out);
    this.#sum = sum;
    this.#out = out;
  }
}

/** `source` played at `speed`, its pitch kept; itself at speed 1. */
export function stretched(source: StreamSource, speed: number): StreamSource {
  return speed === 1 ? source : new Stretched(source, speed);
}
