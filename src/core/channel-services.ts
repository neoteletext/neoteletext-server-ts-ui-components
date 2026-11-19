// What a mounted component reaches of its channel (services.ts), made from
// the runtime's parts for one copy of one page: the server call's context,
// the viewer's address, streams and sounds, their language and their state.
// A snapshot's connection (tab-thumbnails.md section 7.4; REQ-6903) is no
// one: it has no viewer, and nothing beyond drawing is done for it, so
// every call that would ask for state, sound, a stream or a language for it
// does nothing here, once, whichever component makes it.

import type { Context } from "../kit.ts";
import type { EventBus } from "./bus.ts";
import type { LibraryEvents } from "./library-events.ts";
import type { LiveStreams } from "./live-streams.ts";
import type { PageParams, Services } from "./services.ts";
import type { SoundObjects } from "./sound-objects.ts";
import { fit } from "./text.ts";
import type { ViewerLanguages } from "./viewer-languages.ts";
import type { ViewerStates } from "./viewer-states.ts";

/** The runtime's parts the services are made from. */
export interface ServiceParts {
  readonly bus: EventBus<LibraryEvents>;
  /** The server call being run, or null outside one. */
  readonly context: () => Context | null;
  readonly parameters: (connection: number, page: number) => string | null;
  readonly redirect: (context: Context, viewer: number, page: number, params: PageParams | undefined) => void;
  readonly streams: LiveStreams;
  readonly sounds: SoundObjects;
  readonly languages: ViewerLanguages;
  readonly viewers: ViewerStates;
}

/** Whether a connection is a snapshot's: such a connection is no one, and nothing beyond drawing is done for it. */
type IsSnapshot = (connection: number) => boolean;

/** `call`, done for every connection but a snapshot's (REQ-6903 item 2). */
function forViewers<Rest extends unknown[]>(isSnapshot: IsSnapshot, call: (to: number, ...rest: Rest) => void): (to: number, ...rest: Rest) => void {
  return (to, ...rest) => {
    if (!isSnapshot(to)) {
      call(to, ...rest);
    }
  };
}

/** The viewer's stream (live-streams.ts), never started or changed for a snapshot's connection. */
function streamServices(
  streams: ReturnType<LiveStreams["services"]>,
  isSnapshot: IsSnapshot,
): Pick<Services, "stream" | "stopStream" | "pauseStream" | "resumeStream" | "seekStream" | "streamGain" | "listening" | "streamPlace"> {
  return {
    stream: (source, to, fromMs) => {
      if (!isSnapshot(to)) {
        streams.stream(source, to, fromMs);
      }
    },
    stopStream: forViewers(isSnapshot, streams.stopStream),
    pauseStream: forViewers(isSnapshot, streams.pauseStream),
    resumeStream: forViewers(isSnapshot, streams.resumeStream),
    seekStream: forViewers(isSnapshot, streams.seekStream),
    streamGain: forViewers(isSnapshot, streams.streamGain),
    listening: streams.listening,
    streamPlace: streams.streamPlace,
  };
}

/** The viewer and their language (viewer-states.ts, viewer-languages.ts): a snapshot's connection has no viewer, chooses no language and never asks for state (REQ-6903 items 1 and 2). */
function viewerServices(
  parts: ServiceParts,
  isSnapshot: IsSnapshot,
): Pick<Services, "language" | "setLanguage" | "viewer" | "wantState" | "offerRemember" | "forgetViewer"> {
  const languages = parts.languages.services(parts.context);
  const viewers = parts.viewers.services(parts.context, parts.bus);
  return {
    language: languages.language,
    setLanguage: forViewers(isSnapshot, languages.setLanguage),
    viewer: (to) => (isSnapshot(to) ? null : viewers.viewer(to)),
    wantState: forViewers(isSnapshot, viewers.wantState),
    offerRemember: forViewers(isSnapshot, viewers.offerRemember),
    forgetViewer: forViewers(isSnapshot, viewers.forgetViewer),
  };
}

/** The services of the copy of `page` for `connection`, or the channel's (null). */
export function channelServices(parts: ServiceParts, page: number, connection: number | null): Services {
  const context = (): Context => {
    const now = parts.context();
    if (now === null) {
      throw new Error("a component reached the channel outside a server call");
    }
    return now;
  };
  const isSnapshot: IsSnapshot = (to) => parts.context()?.isSnapshot(to) === true;
  return {
    connection,
    page,
    bus: parts.bus.at({ page, connection }),
    now: () => context().now(),
    epochMs: () => context().epochMs(),
    parameters: (viewer) => parts.parameters(viewer, page),
    redirect: (to: number, target: number | string, params?: PageParams): void => {
      if (typeof target === "string") {
        context().redirect(to, target);
      } else {
        parts.redirect(context(), to, target, params);
      }
    },
    deny: (to, status) => {
      context().deny(to, status);
    },
    isSnapshot,
    ...streamServices(
      parts.streams.services(context, page, () => parts.context()?.now() ?? 0),
      isSnapshot,
    ),
    title: (text) => {
      context().title(page, fit(text, context().limits().budgets.titleCharacters));
    },
    limits: () => context().limits(),
    languages: () => context().languages(),
    ...viewerServices(parts, isSnapshot),
    below: (bound) => context().below(bound),
    log: (text) => {
      context().log(text);
    },
    // A sound to the copy's own connection, or to everyone on the page from the channel's copy; none to a snapshot's (REQ-6903 item 2).
    play: (sound, to) => {
      const target = to ?? connection;
      if (target === null || !isSnapshot(target)) {
        parts.sounds.play(context(), sound, target, page);
      }
    },
  };
}
