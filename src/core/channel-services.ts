// What a mounted component reaches of its channel (services.ts), made from
// the runtime's parts for one copy of one page: the server call's context,
// the viewer's address, streams and sounds, their language and their state.

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

/** The services of the copy of `page` for `connection`, or the channel's (null). */
export function channelServices(parts: ServiceParts, page: number, connection: number | null): Services {
  const context = (): Context => {
    const now = parts.context();
    if (now === null) {
      throw new Error("a component reached the channel outside a server call");
    }
    return now;
  };
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
    ...parts.streams.services(context, page, () => parts.context()?.now() ?? 0),
    title: (text) => {
      context().title(page, fit(text, context().limits().budgets.titleCharacters));
    },
    limits: () => context().limits(),
    languages: () => context().languages(),
    ...parts.languages.services(parts.context),
    ...parts.viewers.services(parts.context, parts.bus),
    below: (bound) => context().below(bound),
    log: (text) => {
      context().log(text);
    },
    play: (sound, to) => {
      parts.sounds.play(context(), sound, to ?? connection, page);
    },
  };
}
