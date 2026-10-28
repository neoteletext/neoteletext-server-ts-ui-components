// Jump labels: a key (0 by default) puts a digit on each control under it,
// on a chip at its first cell, and the digit gives that control the keys;
// Escape, or any other key, takes the labels away. A remote reaches any
// control in two presses, however far it is by Tab or the arrows. It
// takes the keys before the control that has them (onKeyCapture), so a
// field that takes digits does not keep them while the labels are up, and
// the page takes the digits from page selection. Only the first nine
// controls are labelled: one digit each.

import { Component } from "../core/component.ts";
import type { FocusableAt } from "../core/component-host.ts";
import { type Child, h } from "../core/element.ts";
import type { KeyEvent } from "../core/events.ts";
import { digitOf } from "../core/keys.ts";
import type { PageNeeds } from "../core/needs.ts";
import { Key } from "../kit.ts";
import { FIRST_LABEL, LabelLayer } from "./jump-label-layer.ts";
import { Layers } from "./layers.ts";
import { Rows } from "./layouts.ts";

/** The last digit that labels a control: one each. */
const LAST_LABEL = 9;
/** The key that shows the labels when not told: the digit no label uses. */
const TRIGGER = "0";

export interface JumpLabelsProps {
  /** The key that shows the labels. */
  readonly trigger?: string;
}

interface JumpLabelsState {
  readonly showing: boolean;
}

export class JumpLabels extends Component<JumpLabelsProps, JumpLabelsState> {
  override state: JumpLabelsState = { showing: false };

  override needs(): PageNeeds {
    return { digits: true };
  }

  get #targets(): readonly FocusableAt[] {
    return this.focusablesWithin.slice(0, LAST_LABEL - FIRST_LABEL + 1);
  }

  override onKeyCapture(event: KeyEvent): boolean {
    if (event.action === "release") {
      return false;
    }
    if (!this.state.showing) {
      if (event.key !== (this.props.trigger ?? TRIGGER)) {
        return false;
      }
      this.setState({ showing: true });
      return true;
    }
    this.setState({ showing: false });
    const digit = digitOf(event);
    const target = digit === null ? undefined : this.#targets[digit - FIRST_LABEL];
    if (target !== undefined) {
      this.focusOn(target.component);
    }
    // Escape and a label are the labels'; any other key goes on, the labels gone.
    return target !== undefined || event.key === Key.Escape;
  }

  override render(): Child {
    return h(
      Layers,
      {},
      h(Rows, { key: "content" }, ...(this.props.children ?? [])),
      this.state.showing ? h(LabelLayer, { key: "labels", targets: this.#targets.map((target) => target.box) }) : null,
    );
  }
}
