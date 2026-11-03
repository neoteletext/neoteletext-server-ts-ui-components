// Each viewer's cookies as the program set them since the server gave
// them (REQ-2217 item 1): the server sends a connection's cookies only
// when it opens, so what a component sets is kept here, for the viewer's
// next read, until the viewer goes.

import type { CookieOptions } from "../kit.ts";

export class ViewerCookies {
  /** By session, each name set and its value, or null for one removed. */
  readonly #set = new Map<number, Map<string, string | null>>();

  /** The viewer's cookies: `given`, the server's, with what was set since laid over. */
  of(session: number, given: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
    const set = this.#set.get(session);
    if (set === undefined) {
      return given;
    }
    const cookies = new Map(Object.entries(given));
    for (const [name, value] of set) {
      if (value === null) {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    }
    // fromEntries defines each name, so a viewer's `__proto__` is a name like any other.
    return Object.fromEntries(cookies);
  }

  /** The program set a cookie for the viewer: `maxAge` 0 removes it. */
  set(session: number, name: string, value: string, options: CookieOptions): void {
    const set = this.#set.get(session) ?? new Map<string, string | null>();
    set.set(name, options.maxAge === 0 ? null : value);
    this.#set.set(session, set);
  }

  /** The viewer went. */
  forget(session: number): void {
    this.#set.delete(session);
  }
}
