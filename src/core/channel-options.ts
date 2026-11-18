// How a channel of components is made (runtime.ts).

import type { LanguageTag, OpusEncoder } from "../kit.ts";
import type { StateStore } from "./state-store.ts";

export interface ComponentChannelOptions {
  /** What encodes its sounds as Opus, the one format desktop and phone receivers play: ffmpeg with libopus, found on the path, when absent. */
  readonly opus?: OpusEncoder;
  /** The channel's language, a tag of the server's languages: what a viewer who chose no language sees, and the copy every viewer shares. Latin English when absent. */
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
  /**
   * Where what outlasts the program is kept (REQ-1057): the components'
   * kept state (Component.keptAs, REQ-1058), each viewer's under their
   * connection's number. The channel opens it, usually a SqliteStateStore on
   * a file of its own, and gives the same store to what it keeps itself,
   * such as a poll's Tally. Nothing is kept when absent.
   */
  readonly state?: StateStore;
  /**
   * Who says what input each page asks of a viewer's receiver
   * (neoteletext-common's docs/page-rules.md, RULE-54). `"components"`,
   * when absent: the library sends every page a rule table written from
   * the components on it, with the keys the protocol kit selects pages
   * by. `"none"`: the library sends no table, so every page is left to
   * the channel's `default_rules` in the server's configuration (RULE-53);
   * with `send_all` there, every input is sent, as it was before pages
   * had tables.
   */
  readonly ruleTables?: "components" | "none";
}
