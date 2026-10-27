// What lies between a dialog and the page under it in a modal (modal.ts):
// it takes every click and turn of the wheel there, so none reaches the
// page while the dialog is up, and the page's controls under it are not
// declared.

import { Component, type Size } from "../core/component.ts";
import type { PointerEvent, WheelEvent } from "../core/events.ts";

export class Shield extends Component {
  /** No rows of its own: the layers give it the modal's whole box, whatever it measures. */
  override measure(space: Size): Size {
    return { width: space.width, height: 0 };
  }

  override onPointer(_event: PointerEvent): boolean {
    return true;
  }

  override onWheel(_event: WheelEvent): boolean {
    return true;
  }
}
