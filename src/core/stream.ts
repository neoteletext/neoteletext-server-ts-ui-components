// Sound too long to send whole: a live sound (docs/applications.md section
// 3.4; the engine's audio.md section 8.3), played to one viewer as it is
// sent. Its samples go to an Opus encoder ahead of real time, and its
// packets to the viewer a tick at a time, never more than the receiver's
// ring holds ahead of what it plays. Where the samples come from
// is the source's: one that is still being decoded says how far it has
// got, and the stream waits for it.

import { OPUS_FRAME_MS, type SampleRate } from "../kit.ts";

/** A live sound's samples, as far as they are known. */
export interface StreamSource {
  /** What it is, for the page that shows it playing. */
  readonly name: string;
  /** Its sample rate: one the protocol takes (16000 for speech). */
  readonly rate: SampleRate;
  /** The samples known so far, 16-bit mono. */
  samples(): Int16Array;
  /** Whether every sample is known. */
  readonly complete: boolean;
  /** Why it cannot play, if it cannot. */
  readonly failure: string | null;
  /** Its length in samples when known in advance, or null. */
  readonly expected: number | null;
  /** How much faster than its samples it plays what it holds: a source stretched to play faster or slower (feedback/time-stretch.ts). 1 when absent. */
  readonly speed?: number;
}

/** A viewer's stream as a page shows it. */
export interface Listening {
  /** What it is called, as the viewer sees it. */
  readonly name: string;
  /** Milliseconds heard, and in all (null while not known). */
  readonly heardMs: number;
  /** Its length in milliseconds, or null while it is not known. */
  readonly lengthMs: number | null;
  /** What it is doing: waiting to start, playing, paused, played to its end, or unable to play. */
  readonly state: "waiting" | "playing" | "paused" | "ended" | "failed";
  /** Why it cannot play, or null; its state is failed while it is not null. */
  readonly failure: string | null;
  /** How loud it plays, 0 to FULL_GAIN. */
  readonly gain: number;
}

/** The blocks a receiver keeps of a live sound: a ring, the newest replacing the oldest (the engine's LIVE_RING_BLOCKS). An Opus block is one 20 ms packet. */
export const RING_BLOCKS = 32;
/** Blocks of the ring left clear of what is sent ahead, for a tick that comes late. */
const RING_MARGIN_BLOCKS = 4;
/** How far ahead of real time packets are sent: 28 of the ring's 20 ms blocks, so none sent overwrites one still to be played. */
export const SEND_LEAD_MS = (RING_BLOCKS - RING_MARGIN_BLOCKS) * OPUS_FRAME_MS;
/** How often streams are topped up. */
export const TICK_MS = 250;
/** How soon a stream waiting for its first packets looks again: the encoder gives them out within this of being written to (ffmpeg 8.0.1, measured 28 October 2026). */
export const FIRST_PACKETS_MS = 50;
/** The encoder's delay, with room: ffmpeg 8.0.1 gave packets out under 110 ms after their samples went in (measured 28 October 2026). */
const ENCODER_DELAY_MS = 200;
/** How far ahead of real time samples go to the encoder: what is sent ahead, a tick more, and the encoder's delay, so each tick's packets are out by then. */
export const FEED_LEAD_MS = SEND_LEAD_MS + TICK_MS + ENCODER_DELAY_MS;
// A tick's packets last until the next tick.
if (SEND_LEAD_MS <= TICK_MS) {
  throw new RangeError(`streams are sent ${SEND_LEAD_MS} ms ahead, which a tick of ${TICK_MS} ms outlasts`);
}
/** Block numbers and generations are two bytes, wrapping. */
export const WRAP = 0x1_0000;
/** The handle every viewer's stream has: the last, which stored sounds never take. */
export const STREAM_HANDLE = 255;
/** The profile's channel streams play on: the last of four, clear of effects. */
export const STREAM_CHANNEL = 3;
/** Milliseconds in a second, for converting samples. */
export const SECOND_MS = 1_000;
