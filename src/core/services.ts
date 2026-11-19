// What a mounted component reaches of the channel, through its mount: the
// viewer it is drawn for, the clock, the protocol's redirect and title, sounds
// and the event bus. Calls made outside a server call (none should be) are
// held until the next one.

import type { DeniedStatus, Language, LanguageTag, Limits } from "../kit.ts";
import type { Bus } from "./bus.ts";
import type { KeptViewer } from "./state-store.ts";
import type { LibraryEvents } from "./library-events.ts";
import type { Sound } from "./sound.ts";
import type { Listening, StreamSource } from "./stream.ts";

/** What a page is opened with: what it shows of many (an article, an episode). */
export type PageParams = Readonly<Record<string, string | number>>;

export interface Services {
  /** The viewer this copy of the page is drawn for, or null for the copy every viewer shares. */
  readonly connection: number | null;
  /** The page it is on. */
  readonly page: number;
  /** Milliseconds since the program started. */
  now(): number;
  /** The real time, in milliseconds since the Unix epoch, UTC. */
  epochMs(): number;
  /** The parameters of the viewer's selection of this page, the query of its address, or null: untrusted text from the viewer, undecoded (DEC-1730). The bus's `parameters` says when they change. */
  parameters(connection: number): string | null;
  /** Sends a viewer to a page (DOC-1970), opened with `params` when given: a page whose root takes them shows that one of many. */
  redirect(connection: number, page: number, params?: PageParams): void;
  /** Sends a viewer to another channel's address: their receiver shows a notice, and then opens it by its own rules. */
  redirect(connection: number, address: string): void;
  /** Ends a viewer's selection with no page, the kit's `Context.deny` (DOC-1961): 403 forbidden, 404 not found, 429 too many, 503 unavailable. Called while their selection is being answered (from a page's render or mount), the status is the answer in place of the page; at any other time it ends the selection they have. */
  deny(connection: number, status: DeniedStatus): void;
  /**
   * Whether `connection` is a snapshot's (tab-thumbnails.md section 7.4;
   * REQ-6903): the page drawn for no one in particular, for a tab's
   * picture, which any stranger may see. It has no viewer and no
   * parameters, and the library does nothing beyond drawing for it (no
   * state asked for, no sound, no stream, no language); a component with
   * an effect of its own beyond drawing, such as counting visitors or
   * telling others someone arrived, skips it for a snapshot.
   */
  isSnapshot(connection: number): boolean;
  /** Gives this page a new title in the channel's contents (section 3.5). */
  title(text: string): void;
  /** Plays a sound to one viewer, or to everyone with this page open. */
  play(sound: Sound, connection?: number): void;
  /** Plays a long sound to one viewer as a live stream (stream.ts), bound to this page: it stops when they leave. A new one replaces theirs. It starts `fromMs` in, or at its start. */
  stream(source: StreamSource, connection: number, fromMs?: number): void;
  /** Stops the viewer's stream. */
  stopStream(connection: number): void;
  /** Pauses the viewer's stream where they have heard to; resumeStream goes on from there. */
  pauseStream(connection: number): void;
  resumeStream(connection: number): void;
  /** Moves the viewer's stream to `ms` from its start: paused, it stays paused there. */
  seekStream(connection: number, ms: number): void;
  /** How loud the viewer's streams play, 0 to FULL_GAIN; it lasts until they go. */
  streamGain(connection: number, gain: number): void;
  /** The viewer's stream, or null. */
  listening(connection: number): Listening | null;
  /** Where the viewer's stream of `name` last stopped short of its end, in milliseconds, or null: for taking it up again. */
  streamPlace(connection: number, name: string): number | null;
  /** The standard's maxima and the server's budgets, as the server's `start` gave them: a page holds up to `standard.subpages` sub-pages. */
  limits(): Limits;
  /** The languages a page or its text may name, as the server's `start` listed them, each with its direction (REQ-2215). */
  languages(): readonly Language[];
  /**
   * The language a page that names none is drawn in for the viewer
   * (REQ-2217 item 2): the one they chose with a LanguagePicker when it is
   * one of the server's languages, else the channel's own; the channel's
   * for the copy every viewer shares (null).
   */
  language(connection: number | null): LanguageTag;
  /** The viewer chose `language`, one of the server's: every page they have open is drawn again in it. A tag the server does not list is no choice. */
  setLanguage(connection: number, language: LanguageTag): void;
  /**
   * The connection's viewer, or null while it has none (viewer-state.md
   * VS-401): their handle and whether they chose to be remembered. The
   * handle is for keeping what the viewer asked for on this channel and
   * nothing else (VS-409): never shown, logged or sent anywhere.
   */
  viewer(connection: number): KeptViewer | null;
  /**
   * Something the viewer did on a connection with no viewer is to be kept
   * for them (VS-407): the library asks for their state when this input
   * is done, or at their next one, and once only on the connection. The
   * poll, kept components and the language picker call it themselves.
   */
  wantState(connection: number): void;
  /** Asks the viewer's browser to offer "remember me" on this channel (VS-208); a connection with no viewer is refused. */
  offerRemember(connection: number): void;
  /** Ends the viewer's state on this channel and deletes all the channel's store keeps for them (VS-409): every connection presenting them has no viewer after. Nothing when the connection has none. */
  forgetViewer(connection: number): void;
  /** A pseudo-random number below `bound`: for games, never for secrets. */
  below(bound: number): number;
  /** Reports a line in the server's log. */
  log(text: string): void;
  /** The channel's event bus: what is heard is what is for this page and this viewer. */
  readonly bus: Bus<LibraryEvents>;
}
