// Modal: split from dialog.ts; the comments pass writes this file's header.

import { Component } from "../core/component.ts";
import { type Child, type Element, h } from "../core/element.ts";
import { At } from "../layout/at.ts";
import { Layers } from "../layout/layers.ts";
import { Rows } from "../layout/layouts.ts";
import { Shield } from "./shield.ts";

export interface ModalProps {
  /** The dialog over the page, or null while there is none. */
  readonly dialog: Element | null;
  /** The row its top is on, in the content's box. */
  readonly row?: number;
}

/** A page with a dialog over it: the children are the page. */
export class Modal extends Component<ModalProps> {
  override render(): Child {
    const { dialog } = this.props;
    return h(
      Layers,
      {},
      h(Rows, { key: "content" }, ...(this.props.children ?? [])),
      dialog === null ? null : h(Shield, { key: "shield" }),
      dialog === null ? null : h(At, { key: "dialog", row: this.props.row ?? 2, column: 0 }, dialog),
    );
  }
}
