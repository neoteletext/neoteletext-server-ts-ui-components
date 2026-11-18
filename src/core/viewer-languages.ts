// Each connection's language (REQ-2217 item 2): the one its viewer chose
// with a LanguagePicker when it is one of the server's languages, else the
// channel's.

import type { Context, LanguageTag } from "../kit.ts";
import { ENGLISH, isListed } from "./language.ts";
import type { Services } from "./services.ts";
import type { StandIn } from "./stand-in.ts";
import { StandIns } from "./stand-ins.ts";

/** The language each connection's viewer chose. */
export class ViewerLanguages {
  /** By connection, the tag its viewer chose. */
  readonly #chosen = new Map<number, LanguageTag>();
  /** The channel's language: a viewer's who chose none, and the copy every viewer shares. */
  readonly #channel: LanguageTag;

  /** What hears a viewer's change of language. */
  readonly #changed: (connection: number, language: LanguageTag) => void;

  /** The stand-in for the channel's words in each language (ComponentChannelOptions.standIn). */
  readonly #standIns: StandIns;

  /** The channel's language, English when undefined; `changed` hears each viewer's change of language; `standIn` gives text in a language for the channel's words. */
  constructor(
    channel: LanguageTag | undefined,
    changed: (connection: number, language: LanguageTag) => void,
    standIn?: (language: LanguageTag) => string | undefined,
  ) {
    this.#channel = channel ?? ENGLISH;
    this.#changed = changed;
    this.#standIns = new StandIns(this.#channel, standIn);
  }

  /** The stand-in for the channel's words in `language`, or undefined where they are drawn as written. */
  standIn(language: LanguageTag): StandIn | undefined {
    return this.#standIns.of(language);
  }

  /** The services a component reaches them by, `context` the server call's, or null outside one. */
  services(context: () => Context | null): Pick<Services, "language" | "setLanguage"> {
    return {
      language: (connection) => this.of(context(), connection),
      setLanguage: (connection, language) => {
        const now = context();
        if (now === null) {
          throw new Error("a component reached the channel outside a server call");
        }
        this.set(now, connection, language);
      },
    };
  }

  /** The connection's language: the one its viewer chose when the server lists it, else the channel's; the channel's for the shared copy (null) and outside a call. */
  of(context: Context | null, connection: number | null): LanguageTag {
    if (context === null || connection === null) {
      return this.#channel;
    }
    const chosen = this.#chosen.get(connection);
    return isListed(chosen, context.languages()) ? chosen : this.#channel;
  }

  /** Whether the connection's language is not the channel's. */
  differs(context: Context | null, connection: number): boolean {
    return this.of(context, connection) !== this.#channel;
  }

  /** The connection's viewer chose `language`: one the server does not list is no choice; a change is heard. */
  set(context: Context, connection: number, language: LanguageTag): void {
    if (!isListed(language, context.languages())) {
      return;
    }
    const before = this.of(context, connection);
    this.#chosen.set(connection, language);
    if (language !== before) {
      this.#changed(connection, language);
    }
  }

  /** The connection is gone. */
  forget(connection: number): void {
    this.#chosen.delete(connection);
  }
}
