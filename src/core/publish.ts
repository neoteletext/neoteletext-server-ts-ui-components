// What a channel of components publishes after each server call.

import type { Context } from "../kit.ts";
import type { Mount } from "./mount.ts";

/**
 * Publishes what changed: each mount with something new renders, and a page
 * is published only if its TTI changed. A viewer's copy is published only
 * while it differs from the channel's; when it is the same again it is
 * released, so a viewer who only reads costs the server nothing. `own` is
 * which pages each viewer is sent their own copy of now.
 */
export function publishChanges(
  context: Context,
  shared: ReadonlyMap<number, Mount>,
  viewers: ReadonlyMap<number, ReadonlyMap<number, Mount>>,
  own: Map<number, Set<number>>,
): void {
  // The channel's copies first: a viewer's is compared with its page's.
  for (const mount of shared.values()) {
    if (mount.dirty) {
      const before = mount.lastTti;
      const text = mount.render();
      if (text !== before) {
        context.publishTti("channel", mount.page, text);
      }
    }
  }
  for (const [session, pages] of viewers) {
    for (const mount of pages.values()) {
      const sharedTti = shared.get(mount.page)?.lastTti ?? null;
      const ownPages = own.get(session) ?? new Set<number>();
      own.set(session, ownPages);
      const before = mount.lastTti;
      const text = mount.dirty ? mount.render() : before;
      if (text === null) {
        continue;
      }
      if (text === sharedTti) {
        if (ownPages.delete(mount.page)) {
          context.release(session, mount.page);
        }
      } else if (text !== before || !ownPages.has(mount.page)) {
        context.publishTti(session, mount.page, text);
        ownPages.add(mount.page);
      }
    }
  }
}
