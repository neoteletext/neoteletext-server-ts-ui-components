// Which sub-page each connection's selection shows. A sub-page is a page
// (DEC-6599, neoteletext-common's docs/page-rules.md RULE-112): its rule
// table is sent for its own sub-code (rule-tables.ts) and an input is
// found on its own cells (mount.ts). The kit tells an application of every
// selection (`request`), naming the place selected as the server's address
// names it, `302` or `302/0002`, and gives no other word of the sub-code;
// the kit answers a selection of the page with no sub-page in particular
// (3F7F) with the page's first sub-page, which the mount resolves.

import { ANY_SUB, type PageRequest } from "../kit.ts";

/** The place selected as the server names it: the page's three hexadecimal digits, then a slash and the sub-code's four when one sub-page was selected (the kit's `PageRequest.path`). */
const SELECTED_SUB_PAGE = /^[0-9A-F]{3}\/(?<sub>[0-9A-F]{4})$/iu;

/** The sub-code a selection's path names, or 3F7F for the page with none in particular, which is also what a path of any other shape is read as. */
function subOfPath(path: string): number {
  const sub = SELECTED_SUB_PAGE.exec(path)?.groups?.["sub"];
  return sub === undefined ? ANY_SUB : Number.parseInt(sub, 16);
}

export class Selections {
  /** The page and sub-code each connection last selected. */
  readonly #shown = new Map<number, { readonly page: number; readonly sub: number }>();

  /** The connection selected `page` with `request`, or left it (null). */
  selected(connection: number, page: number, request: PageRequest | null): void {
    if (request !== null) {
      this.#shown.set(connection, { page, sub: subOfPath(request.path) });
    } else if (this.#shown.get(connection)?.page === page) {
      this.#shown.delete(connection);
    }
  }

  /** The sub-code the connection selected of `page`: 3F7F when it selected the page with none in particular, or is not known to have it selected. */
  subOf(connection: number, page: number): number {
    const shown = this.#shown.get(connection);
    return shown?.page === page ? shown.sub : ANY_SUB;
  }

  /** The connection is gone. */
  forget(connection: number): void {
    this.#shown.delete(connection);
  }

  /** The program started again: no connection is known. */
  clear(): void {
    this.#shown.clear();
  }
}
