// What each viewer's address said beyond the page: the query of the address
// they opened (REQ-1674) and the page parameters of what they selected
// (REQ-1693 item 6). Both are untrusted text from the viewer, undecoded, and
// both arrive before the page they are for is mounted, so they are kept
// here for its components to ask for.

export class ViewerAddresses {
  readonly #queries = new Map<number, string>();
  readonly #parameters = new Map<number, Map<number, string>>();

  /** The query of the address the viewer opened, or null. */
  query(session: number): string | null {
    return this.#queries.get(session) ?? null;
  }

  setQuery(session: number, query: string): void {
    this.#queries.set(session, query);
  }

  /** The page parameters of the viewer's selection of `page`, or null. */
  parameters(session: number, page: number): string | null {
    return this.#parameters.get(session)?.get(page) ?? null;
  }

  /** The viewer's selection of `page` has these parameters; null leaves them behind. */
  setParameters(session: number, page: number, parameters: string | null): void {
    const pages = this.#parameters.get(session) ?? new Map<number, string>();
    this.#parameters.set(session, pages);
    if (parameters === null) {
      pages.delete(page);
    } else {
      pages.set(page, parameters);
    }
  }

  /** The viewer went. */
  forget(session: number): void {
    this.#queries.delete(session);
    this.#parameters.delete(session);
  }
}
