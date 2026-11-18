// What a channel of components publishes after each server call: on a
// picture page (renderer parity PAR-42), its pictures with its teletext
// page. The channel's copy of a picture is kept by the server for every
// viewer (PAR-16); a viewer's own copy goes to their connection alone. A
// viewer whose own copy is released while they stay on the page holds a
// picture stream of their own, which the server's kept picture does not
// reach until they select the page again (PAR-18), so they are sent the
// channel's whole picture, and its changes after it, on that stream: they
// are its mirrors until they leave or select the page again.

import type { Context } from "../kit.ts";
import type { Mount } from "./mount.ts";

/** One viewer's copy of a page, the channel's, which pages they are sent their own copy of, and the picture pages' mirrors. */
interface ViewerCopy {
  readonly connection: number;
  readonly mount: Mount;
  readonly shared: Mount | undefined;
  readonly ownPages: Set<number>;
  readonly mirrors: Map<number, Set<number>>;
}

/** Publishes a viewer's copy when it differs from the channel's, or releases it when it is the same again. */
function publishViewer(context: Context, { connection, mount, shared, ownPages, mirrors }: ViewerCopy): void {
  const before = mount.lastPage?.key;
  const rendered = mount.dirty;
  const drawn = rendered ? mount.render() : mount.lastPage;
  if (drawn === null) {
    return;
  }
  if (drawn.key === (shared?.lastPage?.key ?? null)) {
    if (ownPages.delete(mount.page)) {
      context.release(connection, mount.page);
      if (mount.picture !== null && shared !== undefined) {
        shared.picture?.sendWhole(context, shared, { connection });
        mount.picture.reset();
        mirrors.set(mount.page, (mirrors.get(mount.page) ?? new Set<number>()).add(connection));
      }
    }
    return;
  }
  if (drawn.key !== before || !ownPages.has(mount.page)) {
    context.publishSubpages(connection, mount.page, drawn.subpages);
    if (!ownPages.has(mount.page)) {
      mirrors.get(mount.page)?.delete(connection);
    }
    ownPages.add(mount.page);
  } else if (!rendered) {
    return;
  }
  // Rendered, its rows the same or not: what is drawn in which drawing or object may have changed.
  mount.picture?.send(context, mount, { connection });
}

/**
 * Publishes what changed: each mount with something new renders, and a page
 * is published only if what it shows changed. A viewer's copy is published only
 * while it differs from the channel's; when it is the same again it is
 * released, so a viewer who only reads costs the server nothing. `own` is
 * which pages each viewer is sent their own copy of now.
 */
export function publishChanges(
  context: Context,
  shared: ReadonlyMap<number, Mount>,
  viewers: ReadonlyMap<number, ReadonlyMap<number, Mount>>,
  own: Map<number, Set<number>>,
  mirrors: Map<number, Set<number>> = new Map(),
): void {
  // The channel's copies first: a viewer's is compared with its page's.
  for (const mount of shared.values()) {
    if (mount.dirty) {
      const before = mount.lastPage?.key;
      const drawn = mount.render();
      if (drawn !== null && drawn.key !== before) {
        context.publishSubpages("channel", mount.page, drawn.subpages);
      }
      if (drawn !== null) {
        mount.picture?.send(context, mount, { kept: true }, [...(mirrors.get(mount.page) ?? [])]);
      }
    }
  }
  for (const [connection, pages] of viewers) {
    const ownPages = own.get(connection) ?? new Set<number>();
    own.set(connection, ownPages);
    for (const mount of pages.values()) {
      publishViewer(context, { connection, mount, shared: shared.get(mount.page), ownPages, mirrors });
    }
  }
}

/** When the channel next needs waking: the earliest of its mounts' timers and `tick`, or null. */
export function earliestWake(mounts: Iterable<Mount>, tick: number | null): number | null {
  let earliest = tick;
  for (const mount of mounts) {
    const at = mount.nextWake();
    if (at !== null) {
      earliest = earliest === null ? at : Math.min(earliest, at);
    }
  }
  return earliest;
}
