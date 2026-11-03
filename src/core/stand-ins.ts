// A channel's stand-in text by language (stand-in.ts,
// ComponentChannelOptions.standIn), each made once.

import type { LanguageTag } from "../kit.ts";
import { ENGLISH } from "./language.ts";
import { StandIn } from "./stand-in.ts";

/** A channel's stand-ins by language, each made once: none for the channel's own language, whose words are what they stand in for. */
export class StandIns {
  readonly #channel: LanguageTag;
  readonly #text: ((language: LanguageTag) => string | undefined) | undefined;
  readonly #made = new Map<LanguageTag, StandIn | null>();

  /** For a channel in `channel`, English when undefined, whose `text` gives a language's stand-in. */
  constructor(channel: LanguageTag | undefined, text: ((language: LanguageTag) => string | undefined) | undefined) {
    this.#channel = channel ?? ENGLISH;
    this.#text = text;
  }

  /** The stand-in in `language`, or undefined where the channel's words are drawn as written. */
  of(language: LanguageTag): StandIn | undefined {
    if (language === this.#channel || this.#text === undefined) {
      return undefined;
    }
    let made = this.#made.get(language);
    if (made === undefined) {
      const text = this.#text(language);
      made = text === undefined ? null : new StandIn(text);
      this.#made.set(language, made);
    }
    return made ?? undefined;
  }
}
