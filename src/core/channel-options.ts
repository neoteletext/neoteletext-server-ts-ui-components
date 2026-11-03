// How a channel of components is made (runtime.ts), and how long the
// language a viewer chooses is kept.

import type { LanguageTag, OpusEncoder } from "../kit.ts";

export interface ComponentChannelOptions {
  /** What encodes its sounds as Opus, the one format desktop and phone receivers play: ffmpeg with libopus, found on the path, when absent. */
  readonly opus?: OpusEncoder;
  /** The channel's language, a tag of the server's languages: what a viewer with no `language` cookie sees, and the copy every viewer shares. Latin English when absent. */
  readonly language?: LanguageTag;
}

/** How long the language a viewer chooses is kept: a year, in seconds (REQ-2217 item 3). */
export const LANGUAGE_COOKIE_SECONDS = 365 * 24 * 60 * 60;
