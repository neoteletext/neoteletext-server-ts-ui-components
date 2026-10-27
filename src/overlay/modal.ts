// A modal: a page with a dialog (dialog.ts) over it, and between them a
// shield (shield.ts), so while the dialog is up no click or turn of the
// wheel reaches the page under it.

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

/** The row the dialog's top is on when not told. */
const ROW = 2;

/** The children are the page. */
export class Modal extends Component<ModalProps> {
  override render(): Child {
    const { dialog } = this.props;
    return h(
      Layers,
      {},
      h(Rows, { key: "content" }, ...(this.props.children ?? [])),
      dialog === null ? null : h(Shield, { key: "shield" }),
      dialog === null ? null : h(At, { key: "dialog", row: this.props.row ?? ROW, column: 0 }, dialog),
    );
  }
}
