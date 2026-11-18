// The runtime's copies of its pages: the channel's copy of each, every
// connection's own, which pages each connection is sent its own copy of,
// and who has each page open.

import type { Mount } from "./mount.ts";

export class ConnectionMounts {
  /** The channel's copy of each page, by page. */
  readonly shared = new Map<number, Mount>();
  /** Each connection's mounts, by connection, then page. */
  readonly viewers = new Map<number, Map<number, Mount>>();
  /** Whether a connection's own copy of a page is what it is sent now. */
  readonly own = new Map<number, Set<number>>();
  /** Who has each page open. */
  readonly watching = new Map<number, Set<number>>();
  /** The viewers of each picture page shown the channel's copy on a stream of their own, its changes sent to them too (publish.ts). */
  readonly pictureMirrors = new Map<number, Set<number>>();

  /** The connection selected `page` again, or left it: the server's kept picture reaches it again, so it mirrors nothing. */
  unmirror(connection: number, page: number): void {
    this.pictureMirrors.get(page)?.delete(connection);
  }

  /** The connection's mount of `page`, if it has one. */
  of(connection: number, page: number): Mount | undefined {
    return this.viewers.get(connection)?.get(page);
  }

  /** Every mount of the connection's. */
  ofConnection(connection: number): Iterable<Mount> {
    return this.viewers.get(connection)?.values() ?? [];
  }

  /** Every mount: the channel's copies, then each connection's. */
  *all(): Generator<Mount> {
    yield* this.shared.values();
    for (const pages of this.viewers.values()) {
      yield* pages.values();
    }
  }

  /** The connection's mount of `page`, made by `make` when it has none. */
  viewerMount(connection: number, page: number, make: () => Mount): Mount {
    const pages = this.viewers.get(connection) ?? new Map<number, Mount>();
    this.viewers.set(connection, pages);
    const found = pages.get(page);
    if (found !== undefined) {
      return found;
    }
    const mount = make();
    pages.set(page, mount);
    return mount;
  }

  /** The connection opened `page`. */
  watch(connection: number, page: number): void {
    const watching = this.watching.get(page) ?? new Set<number>();
    watching.add(connection);
    this.watching.set(page, watching);
  }

  /** The connection's mount of `page` goes; answers whether the connection was sent its own copy of it, which is then to be released. */
  unmount(connection: number, page: number): boolean {
    this.of(connection, page)?.unmount();
    this.viewers.get(connection)?.delete(page);
    return this.own.get(connection)?.delete(page) === true;
  }

  /** The connection is gone: its mounts go, and it watches nothing. */
  forget(connection: number): void {
    for (const mount of this.ofConnection(connection)) {
      mount.unmount();
    }
    this.viewers.delete(connection);
    this.own.delete(connection);
    for (const watching of this.watching.values()) {
      watching.delete(connection);
    }
    for (const mirrors of this.pictureMirrors.values()) {
      mirrors.delete(connection);
    }
  }

  /** The program started again: every mount goes. */
  clear(): void {
    for (const mount of this.all()) {
      mount.unmount();
    }
    this.shared.clear();
    this.viewers.clear();
    this.own.clear();
    this.watching.clear();
    this.pictureMirrors.clear();
  }
}
