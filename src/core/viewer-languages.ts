// Each viewer's language (REQ-2217 item 2): the one they chose with a
// LanguagePicker when it is one of the server's languages, else the
// channel's. It is kept in the store under the viewer's handle (name
// `language`, version 1; viewer-state.md VS-408), read when a connection
// of theirs opens, and every connection of theirs draws again in it as they
// choose; a connection with no viewer keeps it for its own life, and asks
// for the viewer's state so that it can be kept (VS-407).

import type { Context, LanguageTag } from "../kit.ts";
import { ENGLISH, isListed } from "./language.ts";
import type { Services } from "./services.ts";
import type { StandIn } from "./stand-in.ts";
import { StandIns } from "./stand-ins.ts";
import type { StateStore } from "./state-store.ts";
import type { ViewerStates } from "./viewer-states.ts";

/** The name and version a viewer's language is kept under (VS-408). */
const LANGUAGE_NAME = "language";
const LANGUAGE_VERSION = 1;

/** How a channel's languages are made. */
export interface ViewerLanguagesOptions {
  /** The channel's language, English when undefined. */
  readonly channel: LanguageTag | undefined;
  /** Hears each connection's change of language. */
  readonly changed: (connection: number, language: LanguageTag) => void;
  /** Text in a language for the channel's words (ComponentChannelOptions.standIn). */
  readonly standIn: ((language: LanguageTag) => string | undefined) | undefined;
  /** Where a viewer's language is kept, or null for nowhere. */
  readonly store: StateStore | null;
  /** Each connection's viewer. */
  readonly viewers: ViewerStates;
}

/** The language each connection's viewer chose. */
export class ViewerLanguages {
  /** By connection, the tag its viewer chose. */
  readonly #chosen = new Map<number, LanguageTag>();
  /** Connections that chose with no viewer: what they chose becomes the viewer's when the viewer begins. */
  readonly #unkept = new Set<number>();
  /** The channel's language: a viewer's who chose none, and the copy every viewer shares. */
  readonly #channel: LanguageTag;
  readonly #changed: (connection: number, language: LanguageTag) => void;
  /** The stand-in for the channel's words in each language (ComponentChannelOptions.standIn). */
  readonly #standIns: StandIns;
  readonly #store: StateStore | null;
  readonly #viewers: ViewerStates;

  constructor(options: ViewerLanguagesOptions) {
    this.#channel = options.channel ?? ENGLISH;
    this.#changed = options.changed;
    this.#standIns = new StandIns(this.#channel, options.standIn);
    this.#store = options.store;
    this.#viewers = options.viewers;
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

  /** A connection opened: its viewer's kept language is its language (VS-407). */
  joined(context: Context, connection: number): void {
    const kept = this.#kept(context, connection);
    if (kept !== undefined) {
      this.#chosen.set(connection, kept);
    }
  }

  /** The viewer's kept language, when it is one of the server's. */
  #kept(context: Context, connection: number): LanguageTag | undefined {
    const viewer = this.#viewers.viewer(context, connection);
    const kept = viewer === null ? undefined : this.#store?.ofViewer(viewer, LANGUAGE_NAME, LANGUAGE_VERSION);
    return isListed(kept, context.languages()) ? kept : undefined;
  }

  /** The connection's viewer chose `language`: one the server does not list is no choice; every connection of the viewer takes it. */
  set(context: Context, connection: number, language: LanguageTag): void {
    if (!isListed(language, context.languages())) {
      return;
    }
    const viewer = this.#viewers.viewer(context, connection);
    if (viewer === null) {
      this.#unkept.add(connection);
      this.#viewers.want(connection);
    } else {
      this.#store?.keepForViewer(viewer, LANGUAGE_NAME, LANGUAGE_VERSION, language);
    }
    for (const open of this.#viewers.sameViewer(context, connection)) {
      this.#take(context, open, language);
    }
  }

  /** The connection is drawn in `language` from now on. */
  #take(context: Context, connection: number, language: LanguageTag): void {
    const before = this.of(context, connection);
    this.#chosen.set(connection, language);
    if (language !== before) {
      this.#changed(connection, language);
    }
  }

  /** The connection's viewer began (VS-407): a language it chose before is kept for them; otherwise theirs, if they kept one, is its language. */
  began(context: Context, connection: number): void {
    const chosen = this.#chosen.get(connection);
    if (this.#unkept.delete(connection) && chosen !== undefined) {
      this.set(context, connection, chosen);
      return;
    }
    const kept = this.#kept(context, connection);
    if (kept !== undefined) {
      this.#take(context, connection, kept);
    }
  }

  /** The connection is gone. */
  forget(connection: number): void {
    this.#chosen.delete(connection);
    this.#unkept.delete(connection);
  }
}
