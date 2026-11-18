// What a page that keeps a copy for each viewer is made with: the params a
// program's redirect gave, or a viewer's query, which is what they asked the
// page for. A query's values are untrusted text.

import type { PageParams } from "./services.ts";

export class ViewerParams {
  readonly #params = new Map<number, Map<number, PageParams>>();
  /** The pages whose params came from a query. */
  readonly #queried = new Map<number, Set<number>>();

  /** What the viewer's copy of `page` is made with. */
  of(connection: number, page: number): PageParams | undefined {
    return this.#params.get(connection)?.get(page);
  }

  #set(connection: number, page: number, params: PageParams): void {
    const pages = this.#params.get(connection) ?? new Map<number, PageParams>();
    pages.set(page, params);
    this.#params.set(connection, pages);
  }

  /** A redirect gave these: they stand until a query replaces them. */
  redirected(connection: number, page: number, params: PageParams): void {
    this.#queried.get(connection)?.delete(page);
    this.#set(connection, page, params);
  }

  /**
   * The viewer selected `page` with this query, or none. A selection with
   * none leaves behind what a query gave, and never what a redirect gave.
   * Answers whether what the page is made with changed.
   */
  queried(connection: number, page: number, query: PageParams | null): boolean {
    const pages = this.#queried.get(connection) ?? new Set<number>();
    this.#queried.set(connection, pages);
    if (query !== null) {
      pages.add(page);
      this.#set(connection, page, query);
      return true;
    }
    if (pages.delete(page)) {
      this.#params.get(connection)?.delete(page);
      return true;
    }
    return false;
  }

  /** The viewer went. */
  forget(connection: number): void {
    this.#params.delete(connection);
    this.#queried.delete(connection);
  }
}
