// An action: a line of text a click acts on, as PageLink is one that goes
// to a page. Its text is a control (core/controls.ts), which the browser
// shows as pressable and lights in the page's rollover colours as the
// pointer passes, and only a click on the text acts. It does not take the
// keys: what it does is also a key of the component it belongs to (a
// quiz's coloured keys, a wizard's red and green), so it adds the pointer
// without changing where the keys go. Disabled, it is dim and declares
// nothing.

import type { Canvas } from "../core/canvas.ts";
import { Component, type Size } from "../core/component.ts";
import type { PointerEvent } from "../core/events.ts";
import { DISABLED } from "../core/look.ts";
import { cells, fit } from "../core/text.ts";
import { Colour } from "../kit.ts";

export interface ActionProps {
  readonly text: string;
  readonly onPress: (session: number) => void;
  readonly foreground?: Colour;
  readonly disabled?: boolean;
  /** Centred in its box. */
  readonly centre?: boolean;
  /** What a click does, for the frame's hint row while the pointer is on it. */
  readonly hint?: string;
}

/** The region its text is. */
const TEXT = "text";

export class Action extends Component<ActionProps> {
  override measure(space: Size): Size {
    return { width: Math.min(space.width, cells(this.props.text) + 1), height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const shown = fit(this.props.text, canvas.width - 1);
    const column = this.props.centre === true ? Math.max(0, Math.floor((canvas.width - cells(shown) - 1) / 2)) : 0;
    const disabled = this.props.disabled === true;
    canvas.coloured(0, column, disabled ? DISABLED : (this.props.foreground ?? Colour.White), shown);
    if (!disabled) {
      // From its first character: the colour's cell before it is not the text.
      canvas.control(0, column + 1, cells(shown), 1, TEXT);
    }
  }

  override hint(): string | null {
    return this.props.hint ?? null;
  }

  override onClick(event: PointerEvent): boolean {
    if (this.props.disabled === true || event.region !== TEXT) {
      return false;
    }
    this.props.onPress(event.session);
    return true;
  }
}
