// What a component needs of its page, which the runtime gives the page
// rather than each page saying it: the digits (a number to type, a numbered
// menu), the coloured keys (a quiz, Fastext tabs), and a copy for each
// viewer (anything whose state is one viewer's, such as a ticked box, which
// on the copy every viewer shares would tick for everyone).
//
// The kit asks for the pages before anything runs, so the runtime finds
// them by a probe: each element is made and rendered, down the tree,
// without mounting it, so no lifecycle runs and no timer starts.

import { instantiate } from "./instantiate.ts";
import { type Element, flatten, isElement } from "./element.ts";

export interface PageNeeds {
  readonly digits?: boolean;
  readonly colourKeys?: boolean;
  readonly ownCopy?: boolean;
}

/** The deepest a probe goes: a tree deeper than this renders itself without end. */
const MOST_DEPTH = 64;

/**
 * What the components under `root` need, together. A render that cannot
 * run unmounted, because it reaches the channel (services, the connection),
 * hides what is under it: `unprobed` is told the component's name, so the
 * page's needs are never lost without a word (TODO-2229 item 7 in rdm).
 */
export function probeNeeds(root: Element, unprobed: (component: string) => void = (): void => {}): Required<PageNeeds> {
  const found = { digits: false, colourKeys: false, ownCopy: false };
  const visit = (element: Element, depth: number): void => {
    if (depth > MOST_DEPTH) {
      return;
    }
    const component = instantiate(element);
    const needs = component.needs();
    found.digits ||= needs.digits === true;
    found.colourKeys ||= needs.colourKeys === true;
    found.ownCopy ||= needs.ownCopy === true;
    let children: (Element | string)[];
    try {
      children = flatten(component.render());
    } catch {
      // A render that reaches the channel (services, the connection) cannot run unmounted: what is under it is not known.
      unprobed(component.constructor.name);
      return;
    }
    for (const child of children) {
      if (isElement(child)) {
        visit(child, depth + 1);
      }
    }
  };
  visit(root, 0);
  return found;
}
