// Loading: what is still coming, shown in its place by a spinner
// (spinner.ts) or, told so, a skeleton of its lines (skeleton.ts). While it
// loads its children are not mounted, so nothing of them runs, and the keys
// meant for them are held (held-keys.ts); once it has loaded they are
// mounted and drawn in its place.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { HeldKeys } from "./held-keys.ts";
import { Skeleton, type SkeletonProps } from "./skeleton.ts";
import { Spinner, type SpinnerStyle } from "./spinner.ts";

export interface LoadingProps {
  /** Still coming: the spinner or the skeleton shows, and the children are not mounted. */
  readonly loading: boolean;
  /** What the spinner says; "Loading" when absent. */
  readonly label?: string;
  /** The spinner's frames; orbit when absent. */
  readonly spinner?: SpinnerStyle;
  /** A skeleton of these props instead of the spinner. */
  readonly skeleton?: SkeletonProps;
}

/** What the spinner says when not told. */
const LABEL = "Loading";

export class Loading extends Component<LoadingProps> {
  /** The spinner, or the skeleton, in what holds the keys. */
  #placeholder(): Child {
    const { skeleton, spinner } = this.props;
    const shown =
      skeleton === undefined ? h(Spinner, { label: this.props.label ?? LABEL, ...(spinner === undefined ? {} : { style: spinner }) }) : h(Skeleton, skeleton);
    return h(HeldKeys, {}, shown);
  }

  override render(): Child {
    if (!this.props.loading) {
      return this.props.children ?? null;
    }
    // Unmounted, it is the page's probe of what its components need (core/needs.ts), made before anything runs, often while
    // still loading: the children are rendered for it too, so a control's own copy for each viewer is not missed.
    return this.mounted ? this.#placeholder() : [this.#placeholder(), this.props.children ?? null];
  }
}
