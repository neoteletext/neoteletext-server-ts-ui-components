// A copy of a page mounted (mount.ts): the channel's, or one connection's,
// made from the runtime's parts, with the services its components reach
// (channel-services.ts) and the components whose state is kept for its
// viewer (kept-components.ts).

import { channelServices, type ServiceParts } from "./channel-services.ts";
import { KeptComponents } from "./kept-components.ts";
import { Mount } from "./mount.ts";
import type { PageSpec } from "./page-spec.ts";
import { ROLLOVER_COLOURS } from "./rollover.ts";
import type { PageParams } from "./services.ts";
import type { KeptViewer, StateStore } from "./state-store.ts";

/** The runtime's parts a mount is made from. */
export interface MountParts extends ServiceParts {
  readonly store: StateStore | null;
  /** Who has each page open. */
  readonly watching: ReadonlyMap<number, ReadonlySet<number>>;
  readonly nextTimerId: () => number;
}

/** The copy of `spec`'s page for `connection`, or the channel's (null), made with `params`; and its kept components. */
export function newMount(
  parts: MountParts,
  spec: PageSpec,
  connection: number | null,
  params?: PageParams,
): { readonly mount: Mount; readonly kept: KeptComponents } {
  const log = (text: string): void => {
    parts.context()?.log(text);
  };
  const kept = new KeptComponents(
    parts.store,
    connection === null
      ? null
      : {
          viewer: (): KeptViewer | null => parts.viewers.viewer(parts.context(), connection),
          wantState: (): void => {
            parts.viewers.want(connection);
          },
        },
    (text) => {
      log(`page ${spec.page.toString(16)}: ${text}`);
    },
  );
  const mount = new Mount(spec.page, spec.root(params), {
    services: channelServices(parts, spec.page, connection),
    nextTimerId: parts.nextTimerId,
    report: log,
    rollover: spec.rollover === undefined ? ROLLOVER_COLOURS : spec.rollover,
    pageLanguage: spec.language ?? null,
    level: spec.level ?? null,
    renderer: spec.renderer ?? "teletext",
    standIn: (language): ReturnType<MountParts["languages"]["standIn"]> => parts.languages.standIn(language),
    kept,
    viewed: (): boolean => {
      const watching = parts.watching.get(spec.page);
      return connection === null ? (watching?.size ?? 0) > 0 : watching?.has(connection) === true;
    },
  });
  return { mount, kept };
}
