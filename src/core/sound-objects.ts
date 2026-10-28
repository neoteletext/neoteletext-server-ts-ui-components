// The short sounds components play (sound.ts), each encoded as Opus once
// (docs/applications.md section 3.4), sent once to a viewer as a stored
// sound and played after by its handle. There are only
// as many handles as the profile has, less the streams' own, so a sound
// past that takes the oldest's handle, and every viewer forgets they hold
// the old one: the map of names stays bounded, and a handle never plays a
// sound other than the one it names now.

import type { Context, EncodedOpus, OpusEncoder } from "../kit.ts";
import { RATE, type Sound } from "./sound.ts";
import { STREAM_HANDLE } from "./stream.ts";

/** The sound channel the program plays on (the engine's audio profile has four). */
const SOUND_CHANNEL = 0;

/** A handle's sound is made once and only replaced whole, so its generation never changes. */
const GENERATION = 1;

/** Every handle but the streams'. */
const HANDLES = STREAM_HANDLE;

export class SoundObjects {
  readonly #encoder: OpusEncoder;
  /** Each sound with a handle, encoded, by name: as bounded as the handles. */
  readonly #encoded = new Map<string, EncodedOpus>();
  /** Each sound's handle, by name, the oldest first. */
  readonly #handles = new Map<string, number>();
  /** The sounds each viewer holds, by name. */
  readonly #sent = new Map<number, Set<string>>();

  constructor(encoder: OpusEncoder) {
    this.#encoder = encoder;
  }

  #handleOf(name: string): number {
    const known = this.#handles.get(name);
    if (known !== undefined) {
      return known;
    }
    if (this.#handles.size < HANDLES) {
      this.#handles.set(name, this.#handles.size);
      return this.#handles.size - 1;
    }
    const [oldest, handle = 0] = this.#handles.entries().next().value ?? [];
    if (oldest !== undefined) {
      this.#handles.delete(oldest);
      this.#encoded.delete(oldest);
      for (const sent of this.#sent.values()) {
        sent.delete(oldest);
      }
    }
    this.#handles.set(name, handle);
    return handle;
  }

  /** `sound` encoded, once; null, and said in the channel's log, when it cannot be. */
  #encode(context: Context, sound: Sound): EncodedOpus | null {
    const known = this.#encoded.get(sound.name);
    if (known !== undefined) {
      return known;
    }
    try {
      const encoded = this.#encoder.sound(sound.samples, RATE);
      this.#encoded.set(sound.name, encoded);
      return encoded;
    } catch (error) {
      context.log(`the sound ${sound.name} could not be encoded: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /** Plays `sound` to `session`, or to everyone with `page` open when it is null. */
  play(context: Context, sound: Sound, session: number | null, page: number): void {
    const handle = this.#handleOf(sound.name);
    const encoded = this.#encode(context, sound);
    if (encoded === null) {
      return;
    }
    const object = { opus: { handle, generation: GENERATION, ...encoded } };
    const play = { play: { channel: SOUND_CHANNEL, handle, generation: GENERATION, page } };
    if (session === null) {
      // Everyone on the page: whoever arrived since may not have it, so it goes with each play.
      context.sound({ page }, object);
      context.sound({ page }, play);
      return;
    }
    const sent = this.#sent.get(session) ?? new Set<string>();
    if (!sent.has(sound.name)) {
      context.sound({ session }, object);
      sent.add(sound.name);
      this.#sent.set(session, sent);
    }
    context.sound({ session }, play);
  }

  /** The viewer went. */
  forget(session: number): void {
    this.#sent.delete(session);
  }

  /** The program was started again: no viewer holds what it sent before. */
  forgetAll(): void {
    this.#sent.clear();
  }
}
