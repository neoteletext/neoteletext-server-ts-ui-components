// The short sounds components play (sound.ts), each sent once to a viewer
// as a stored sound object and played after by its handle. There are only
// as many handles as the profile has, less the streams' own, so a sound
// past that takes the oldest's handle, and every viewer forgets they hold
// the old one: the map of names stays bounded, and a handle never plays a
// sound other than the one it names now.

import type { Context } from "../kit.ts";
import { RATE, type Sound } from "./sound.ts";
import { STREAM_HANDLE } from "./stream.ts";

/** The sound channel the program plays on (the engine's audio profile has four). */
const SOUND_CHANNEL = 0;

/** A handle's sound is made once and only replaced whole, so its generation never changes. */
const GENERATION = 1;

/** Every handle but the streams'. */
const HANDLES = STREAM_HANDLE;

export class SoundObjects {
  /** Each sound's handle, by name, the oldest first. */
  readonly #handles = new Map<string, number>();
  /** The sounds each viewer holds, by name. */
  readonly #sent = new Map<number, Set<string>>();

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
      for (const sent of this.#sent.values()) {
        sent.delete(oldest);
      }
    }
    this.#handles.set(name, handle);
    return handle;
  }

  /** Plays `sound` to `session`, or to everyone with `page` open when it is null. */
  play(context: Context, sound: Sound, session: number | null, page: number): void {
    const handle = this.#handleOf(sound.name);
    const object = { object: { handle, generation: GENERATION, rate: RATE, samples: sound.samples } };
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
