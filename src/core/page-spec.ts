// A page of a channel of components, as a program declares it, and what
// the components on it need of their page (needs.ts) where the spec does
// not say: found once, by a probe of its root.

import { LONGEST_TITLE, type PageEntry } from "../kit.ts";
import type { ColourTable } from "./rollover.ts";
import { fit } from "./text.ts";
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
  /** The page's root element; on a page that keeps a copy for each viewer, made with what the viewer was sent there with (Services.goto), if anything. */
  root(params?: PageParams): Element;
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

  /** `spec` as the kit lists it in the channel's contents, its title cut to the kit's bound. */
  entryOf(spec: PageSpec): PageEntry {
    const entry: { page: number; title: string; section?: string; ownsDigits?: boolean; ownsColourKeys?: boolean } = {
      page: spec.page,
      title: fit(spec.title, LONGEST_TITLE),
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
