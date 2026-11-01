// What a page that keeps a copy for each viewer is made with: the params a
// program's redirect gave, or a viewer's query, which is what they asked the
// page for. A query's values are untrusted text.

import type { PageParams } from "./services.ts";

export class ViewerParams {
  readonly #params = new Map<number, Map<number, PageParams>>();
  /** The pages whose params came from a query. */
  readonly #queried = new Map<number, Set<number>>();

  /** What the viewer's copy of `page` is made with. */
  of(session: number, page: number): PageParams | undefined {
    return this.#params.get(session)?.get(page);
  }

  #set(session: number, page: number, params: PageParams): void {
    const pages = this.#params.get(session) ?? new Map<number, PageParams>();
    pages.set(page, params);
    this.#params.set(session, pages);
  }

  /** A redirect gave these: they stand until a query replaces them. */
  redirected(session: number, page: number, params: PageParams): void {
    this.#queried.get(session)?.delete(page);
    this.#set(session, page, params);
  }

  /**
   * The viewer selected `page` with this query, or none. A selection with
   * none leaves behind what a query gave, and never what a redirect gave.
   * Answers whether what the page is made with changed.
   */
  queried(session: number, page: number, query: PageParams | null): boolean {
    const pages = this.#queried.get(session) ?? new Set<number>();
    this.#queried.set(session, pages);
    if (query !== null) {
      pages.add(page);
      this.#set(session, page, query);
      return true;
    }
    if (pages.delete(page)) {
      this.#params.get(session)?.delete(page);
      return true;
    }
    return false;
  }

  /** The viewer went. */
  forget(session: number): void {
    this.#params.delete(session);
    this.#queried.delete(session);
  }
}
