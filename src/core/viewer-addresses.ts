// What each viewer's address said beyond the page: the parameters of what
// they selected, the query of its address (DEC-1730). They are untrusted text
// from the viewer, undecoded, and arrive before the page they are for is
// mounted, so they are kept here for its components to ask for.

export class ViewerAddresses {
  readonly #parameters = new Map<number, Map<number, string>>();

  /** The parameters of the viewer's selection of `page`, or null. */
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
    this.#parameters.delete(session);
  }
}
