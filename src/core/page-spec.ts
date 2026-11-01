// A page of a channel of components, as a program declares it, and what
// the components on it need of their page (needs.ts) where the spec does
// not say: found once, by a probe of its root.

import type { PageDescription, PageEntry } from "../kit.ts";
import type { ColourTable } from "./rollover.ts";
import type { Element } from "./element.ts";
import { type PageNeeds, probeNeeds } from "./needs.ts";
import type { PageParams } from "./services.ts";

/** One page of the channel. */
export interface PageSpec {
  readonly page: number;
  readonly title: string;
  /** The section of the contents it starts: its magazine's name. */
  readonly section?: string;
  /** The page takes digits itself (typing, answers), rather than page selection; when absent, whether a component on it needs them (needs.ts). */
  readonly ownsDigits?: boolean;
  /** The page takes the coloured keys itself; when absent, whether a component on it needs them. */
  readonly ownsColourKeys?: boolean;
  /** Each viewer gets a mount of their own, with state of their own; when absent, whether a component on it needs its own copy. */
  readonly perViewer?: boolean;
  /** A viewer's mount is kept while they are on other pages, until they go. */
  readonly keepWhileAway?: boolean;
  /** Its controls' colours under the pointer (rollover.ts): the library's ROLLOVER_COLOURS when absent, null for the receiver's own hover look. */
  readonly rollover?: ColourTable | null;
  /**
   * What the page shows on the web; when absent, or when it gives nothing, the page is not public, which is every page's default (REQ-1728).
   * It takes nothing: no session and no parameters, because the answer goes to everyone, so it cannot hold one viewer's data. The picture is of the channel's copy.
   * All it gives, and all the page shows, is readable by anyone.
   */
  readonly describe?: () => PageDescription | null;
  /** The page's root element; on a page that keeps a copy for each viewer, made with what the viewer was sent there with (Services.redirect) or asked for in the address's query, if anything: a query's values are untrusted text. */
  root(params?: PageParams): Element;
}

/** What `spec` says of its page for the web: called with nothing, so that it can hold no viewer's data (REQ-1728). */
export function describedBy(spec: PageSpec | undefined): PageDescription | null {
  return spec?.describe?.() ?? null;
}

/** What each page's components need, found once (needs.ts), and what that makes of its spec. */
export class SpecNeeds {
  readonly #needs = new Map<number, Required<PageNeeds>>();

  #of(spec: PageSpec): Required<PageNeeds> {
    let needs = this.#needs.get(spec.page);
    if (needs === undefined) {
      needs = probeNeeds(spec.root());
      this.#needs.set(spec.page, needs);
    }
    return needs;
  }

  ownsDigits(spec: PageSpec): boolean {
    return spec.ownsDigits ?? this.#of(spec).digits;
  }

  ownsColourKeys(spec: PageSpec): boolean {
    return spec.ownsColourKeys ?? this.#of(spec).colourKeys;
  }

  perViewer(spec: PageSpec): boolean {
    return spec.perViewer ?? this.#of(spec).ownCopy;
  }

  /**
   * `spec` as the kit lists it in the channel's contents. Its title is
   * declared as written: the declaration comes before the server's
   * `start` says how long a title may be, and the server refuses one too
   * long with the reason in its log.
   */
  entryOf(spec: PageSpec): PageEntry {
    const entry: { page: number; title: string; section?: string; ownsDigits?: boolean; ownsColourKeys?: boolean } = {
      page: spec.page,
      title: spec.title,
    };
    if (spec.section !== undefined) {
      entry.section = spec.section;
    }
    if (this.ownsDigits(spec)) {
      entry.ownsDigits = true;
    }
    if (this.ownsColourKeys(spec)) {
      entry.ownsColourKeys = true;
    }
    return entry;
  }
}
