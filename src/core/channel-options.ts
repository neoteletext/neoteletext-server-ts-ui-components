// How a channel of components is made (runtime.ts), and how long the
// language a viewer chooses is kept.

import type { LanguageTag, OpusEncoder } from "../kit.ts";

export interface ComponentChannelOptions {
  /** What encodes its sounds as Opus, the one format desktop and phone receivers play: ffmpeg with libopus, found on the path, when absent. */
  readonly opus?: OpusEncoder;
  /** The channel's language, a tag of the server's languages: what a viewer with no `language` cookie sees, and the copy every viewer shares. Latin English when absent. */
  readonly language?: LanguageTag;
  /**
   * Text in a language, the stand-in for the channel's own words (DEC on
   * stand-in text): on a page in a viewer's language other than the
   * channel's, each word of Latin letters the channel wrote without naming
   * a language is drawn as as many cells of it, so every component shows
   * that language's script. Undefined, or no answer for a language, draws
   * the words as written.
   */
  readonly standIn?: (language: LanguageTag) => string | undefined;
}

/** How long the language a viewer chooses is kept: a year, in seconds (REQ-2217 item 3). */
export const LANGUAGE_COOKIE_SECONDS = 365 * 24 * 60 * 60;
