// A mount's tree of component instances, reconciled with each render as
// React does: an instance is kept where the same class renders in the same
// place, by key or by position, and given its new props; anything else is
// made, or unmounted. The lifecycle's commit phase runs after the page is
// drawn, so a component that mounts sees its box.

import type { Component } from "./component.ts";
import type { ComponentHost } from "./component-host.ts";
import { instantiate } from "./instantiate.ts";
import { type Element, flatten, h, isElement } from "./element.ts";
import { type AnyComponent, Node } from "./node.ts";
import { Text } from "../text/styles.ts";

/** What the tree needs of its mount. */
export interface TreeHost {
  /** What a mounted component reaches of the channel: the mount itself. */
  readonly components: ComponentHost;
  /** A node is unmounting: what the mount keeps of it goes, after its children's. */
  readonly unmounted: (node: Node) => void;
}

/** Text in a render is a line in white. */
function textElement(text: string, key: string): Element {
  return h(Text, { key, text });
}

/** Where an element sits among its siblings: its key, or its place. */
function slot(element: Element, index: number): string {
  return element.key === undefined ? `#${index}` : `k${String(element.key)}`;
}

export class Tree {
  readonly #host: TreeHost;
  root: Node | null = null;
  readonly nodes = new Map<AnyComponent, Node>();
  /** Components to render again although nothing they were given changed: their state did, or focus moved. */
  readonly forced = new Set<AnyComponent>();
  #mounted: Node[] = [];
  #updated: { node: Node; props: object; state: object }[] = [];

  constructor(host: TreeHost) {
    this.#host = host;
  }

  /** Renders the tree again from `rootElement`. */
  reconcile(rootElement: Element): void {
    if (this.root === null || this.root.element.type !== rootElement.type || this.root.element.key !== rootElement.key) {
      if (this.root !== null) {
        this.#unmount(this.root);
      }
      this.root = this.#create(rootElement, null);
    } else {
      this.#update(this.root, rootElement);
    }
  }

  #create(element: Element, parent: Node | null): Node {
    const component = instantiate(element);
    const node = new Node(element, component, parent);
    this.nodes.set(component, node);
    component.attach(this.#host.components);
    this.#renderChildren(node);
    this.#mounted.push(node);
    return node;
  }

  #update(node: Node, element: Element): void {
    const { component } = node;
    const changed = element !== node.element || this.forced.has(component) || component.hasPending();
    this.forced.delete(component);
    if (!changed) {
      // Nothing of its own changed; a descendant may have.
      for (const child of node.children) {
        this.#update(child, child.element);
      }
      return;
    }
    const previousProps = component.props;
    const previousState = component.state;
    const nextState = component.nextState();
    const wanted = component.shouldComponentUpdate?.(element.props, nextState) ?? true;
    node.element = element;
    component.props = element.props;
    component.commitState();
    if (wanted) {
      this.#renderChildren(node);
      this.#updated.push({ node, props: previousProps, state: previousState });
    } else {
      for (const child of node.children) {
        this.#update(child, child.element);
      }
    }
  }

  #renderChildren(node: Node): void {
    const rendered = flatten(node.component.render()).map((child, index) => (isElement(child) ? child : textElement(child, `text-${index}`)));
    const byKey = new Map<string, Node>();
    for (const [index, child] of node.children.entries()) {
      byKey.set(slot(child.element, index), child);
    }
    const kept = new Set<Node>();
    node.children = rendered.map((element, index) => {
      const existing = byKey.get(slot(element, index));
      if (existing !== undefined && existing.element.type === element.type && !kept.has(existing)) {
        kept.add(existing);
        this.#update(existing, element);
        return existing;
      }
      return this.#create(element, node);
    });
    for (const old of byKey.values()) {
      if (!kept.has(old)) {
        this.#unmount(old);
      }
    }
  }

  #unmount(node: Node): void {
    node.component.componentWillUnmount?.();
    for (const child of node.children) {
      this.#unmount(child);
    }
    this.#host.unmounted(node);
    this.nodes.delete(node.component);
    node.component.detach();
  }

  /** Unmounts every component: the viewer left the page or went. */
  unmountAll(): void {
    if (this.root !== null) {
      this.#unmount(this.root);
      this.root = null;
    }
  }

  /** The lifecycle's commit phase: what mounted, then what updated, each still mounted. */
  commit(): void {
    const mounted = this.#mounted;
    const updated = this.#updated;
    this.#mounted = [];
    this.#updated = [];
    for (const node of mounted) {
      if (node.component.mounted) {
        node.component.componentDidMount?.();
      }
    }
    for (const { node, props, state } of updated) {
      if (node.component.mounted) {
        node.component.componentDidUpdate?.(props, state);
      }
    }
  }

  /** Every mounted component. */
  components(): IterableIterator<Component> {
    return this.nodes.keys();
  }
}
