// Who has the keys on each sub-page of a mount. A sub-page is a page
// (DEC-6599), so each has its own focused component and its own history of
// who had the keys (focus.ts), kept by the sub-page's own component. A page
// with no sub-page drawn yet, or an input from a sub-page the page does not
// have, has the whole tree's.

import { FocusHistory } from "./focus.ts";
import { firstFocusable, type Node } from "./node.ts";

/** Who has the keys on one sub-page, and who had them before. */
interface KeyScope {
  focus: Node | null;
  readonly history: FocusHistory;
}

function keyScope(): KeyScope {
  return { focus: null, history: new FocusHistory() };
}

export class SubPageKeys {
  readonly #scopes = new Map<Node, KeyScope>();
  readonly #whole = keyScope();
  readonly #roots: () => readonly Node[];
  readonly #moved: (before: Node | null, node: Node | null) => void;

  /** The keys of the sub-pages whose components `roots` gives, telling `moved` each time the keys of one go from one component to another. */
  constructor(roots: () => readonly Node[], moved: (before: Node | null, node: Node | null) => void) {
    this.#roots = roots;
    this.#moved = moved;
  }

  /** The component of the sub-page drawn that `node` is on, or null for none: the root of its keys. */
  rootOf(node: Node | null): Node | null {
    const roots = new Set(this.#roots());
    for (let at = node; at !== null; at = at.parent) {
      if (roots.has(at)) {
        return at;
      }
    }
    return null;
  }

  #scope(root: Node | null): KeyScope {
    if (root === null) {
      return this.#whole;
    }
    let scope = this.#scopes.get(root);
    if (scope === undefined) {
      scope = keyScope();
      this.#scopes.set(root, scope);
    }
    return scope;
  }

  /** The component with the keys of the sub-page whose component is `root`, or the whole tree's for null. */
  focusOf(root: Node | null): Node | null {
    return this.#scope(root).focus;
  }

  /** Whether `node` has the keys of the sub-page it is drawn on. */
  isFocused(node: Node): boolean {
    return this.#scope(this.rootOf(node)).focus === node;
  }

  /**
   * On each sub-page found, the keys go back to what had them before the
   * one that went (a dialog), or else to the sub-page's first component
   * that takes them; a page with no sub-page has the whole tree's, under
   * `tree`. The keys of a sub-page no longer drawn are forgotten.
   */
  place(tree: Node | null): void {
    const roots = this.#roots();
    for (const root of this.#scopes.keys()) {
      if (!roots.includes(root)) {
        this.#scopes.delete(root);
      }
    }
    for (const root of roots.length === 0 ? [null] : roots) {
      const scope = this.#scope(root);
      if (scope.focus === null || !scope.focus.component.mounted) {
        this.focusOn(root, scope.history.back() ?? firstFocusable(root ?? tree));
      }
    }
  }

  /** Gives the keys of the sub-page whose component is `root` to `node`. */
  focusOn(root: Node | null, node: Node | null): void {
    const scope = this.#scope(root);
    if (node === scope.focus) {
      return;
    }
    const before = scope.focus;
    if (before !== null) {
      scope.history.left(before);
    }
    scope.focus = node;
    this.#moved(before, node);
  }

  /** `node` was unmounted: no sub-page's keys are with it, or go back to it. */
  forget(node: Node): void {
    for (const scope of [this.#whole, ...this.#scopes.values()]) {
      scope.history.forget(node);
      if (scope.focus === node) {
        scope.focus = null;
      }
    }
  }
}
