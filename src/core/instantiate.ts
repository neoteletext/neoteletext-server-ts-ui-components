// Making the instance an element names: a class component's own, or for a
// function component a class made once for it, whose render calls it. An
// element's type is the function itself, so the tree keeps a function
// component's instance where it renders in the same place, and replaces
// it, as it does a class's.

import { Component } from "./component.ts";
import type { Child, ComponentClass, Element, FunctionComponent } from "./element.ts";

/** The class made for each function component. */
const hosts = new WeakMap<FunctionComponent<never>, new (props: object) => Component>();

function isClass(type: Element["type"]): type is ComponentClass<never> {
  return type.prototype instanceof Component;
}

function hostOf(render: FunctionComponent<never>): new (props: object) => Component {
  const known = hosts.get(render);
  if (known !== undefined) {
    return known;
  }
  const host = class extends Component {
    override render(): Child {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the props h was given for this function, erased in the element
      return (render as FunctionComponent)(this.props);
    }
  };
  hosts.set(render, host);
  return host;
}

/** A new instance of `element`'s component, made with the props it carries. */
export function instantiate(element: Element): Component {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- an element's class is erased to no props (h); it was made with the props the element carries
  const Type = isClass(element.type) ? (element.type as unknown as new (props: object) => Component) : hostOf(element.type);
  return new Type(element.props);
}
