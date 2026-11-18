// Each viewer's language (REQ-2217 item 2): the tag in their `language`
// cookie when it names one of the server's languages, else the channel's;
// and their cookies, which a component reads and sets through the kit.

import type { Context, CookieOptions, LanguageTag } from "../kit.ts";
import { ENGLISH, isListed, LANGUAGE_COOKIE } from "./language.ts";
import type { Services } from "./services.ts";
import type { StandIn } from "./stand-in.ts";
import { StandIns } from "./stand-ins.ts";
import { ViewerCookies } from "./viewer-cookies.ts";

/** Each viewer's cookies and the language they choose by them. */
export class ViewerLanguages {
  readonly #cookies = new ViewerCookies();
  /** The channel's language: a viewer's who chose none, and the copy every viewer shares. */
  readonly #channel: LanguageTag;

  /** What hears a viewer's language change. */
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
  services(context: () => Context | null): Pick<Services, "language" | "cookies" | "setCookie"> {
    const inCall = (): Context => {
      const now = context();
      if (now === null) {
        throw new Error("a component reached the channel outside a server call");
      }
      return now;
    };
    return {
      language: (viewer) => this.of(context(), viewer),
      cookies: (viewer) => this.cookies(inCall(), viewer),
      setCookie: (viewer, name, value, options = {}) => {
        this.set(inCall(), viewer, name, value, options);
      },
    };
  }

  /** The viewer's cookies, as the server gave them with what was set since. */
  cookies(context: Context, connection: number): Readonly<Record<string, string>> {
    return this.#cookies.of(connection, context.cookies(connection));
  }

  /** The viewer's language: their `language` cookie when it names one of the server's languages, else the channel's; the channel's for the shared copy (null) and outside a call. */
  of(context: Context | null, connection: number | null): LanguageTag {
    if (context === null || connection === null) {
      return this.#channel;
    }
    const chosen = this.cookies(context, connection)[LANGUAGE_COOKIE];
    return isListed(chosen, context.languages()) ? chosen : this.#channel;
  }

  /** Whether the viewer's language is not the channel's. */
  differs(context: Context | null, connection: number): boolean {
    return this.of(context, connection) !== this.#channel;
  }

  /** Sets a cookie on each connection the viewer has open; a change of their language is heard. */
  set(context: Context, connection: number, name: string, value: string, options: CookieOptions): void {
    const before = this.of(context, connection);
    for (const open of context.connectionsOf(connection)) {
      context.cookie(open, name, value, options);
    }
    this.#cookies.set(connection, name, value, options);
    const after = this.of(context, connection);
    if (after !== before) {
      this.#changed(connection, after);
    }
  }

  /** The viewer went. */
  forget(connection: number): void {
    this.#cookies.forget(connection);
  }
}
