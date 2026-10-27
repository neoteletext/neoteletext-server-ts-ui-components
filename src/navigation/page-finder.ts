// A page finder: the channel's pages by name, narrowed as the viewer types
// a word of one (lists/filter-list.ts), and Enter goes there. A remote's
// digits still go to page selection, as on any page; letters, from a
// keyboard or a phone, find a page by what it is called.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { FilterList } from "../lists/filter-list.ts";

/** A page to find: its number and its title. */
export interface FoundPage {
  readonly page: number;
  readonly title: string;
}

export interface PageFinderProps {
  readonly pages: readonly FoundPage[];
  /** The rows of pages shown. */
  readonly shown: number;
  readonly autoFocus?: boolean;
}

/** Page numbers are hexadecimal: 0x100 is page 100. */
const PAGE_RADIX = 16;

export class PageFinder extends Component<PageFinderProps> {
  override render(): Child {
    const { pages } = this.props;
    return h(FilterList<FoundPage>, {
      items: pages,
      text: (found: FoundPage) => `${found.page.toString(PAGE_RADIX)} ${found.title}`,
      shown: this.props.shown,
      prompt: "Type a page's name",
      empty: "no page by that name",
      ...(this.props.autoFocus === undefined ? {} : { autoFocus: this.props.autoFocus }),
      onChoose: (index: number, session: number) => {
        const found = pages[index];
        if (found !== undefined) {
          this.services.goto(session, found.page);
        }
      },
    });
  }
}
