// Making the instance an element names, with the props it carries: the one
// place an element's erased class (element.ts) is given its props back.

import type { Component } from "./component.ts";
import type { Element } from "./element.ts";

/** A new instance of `element`'s component, made with the props it carries. */
export function instantiate(element: Element): Component {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- an element's class is erased to no props (h); it was made with the props the element carries
  return new (element.type as unknown as new (props: object) => Component)(element.props);
}
