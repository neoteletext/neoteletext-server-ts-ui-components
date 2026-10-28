// The line a type-to-confirm dialog (type-to-confirm.ts) is answered on:
// what the viewer types, drawn by the server (input/drawn-line.ts), and
// under it whether
// Confirm is ready, or why it was refused. It takes typing, from a
// keyboard's keys, a phone, or the remote's digits; its dialog keeps what
// is typed and the keys it does not take (Escape, Left, Right, Tab), and is
// asked whether Enter confirms.

import type { Canvas } from "../core/canvas.ts";
import type { Size } from "../core/layout.ts";
import { isPress, type KeyEvent, type TextEvent, typedText } from "../core/events.ts";
import type { PageNeeds } from "../core/needs.ts";
import { fit } from "../core/text.ts";
import { Colour, Key } from "../kit.ts";
import { Control, type ControlProps, type KeyHelpEntry } from "../input/control.ts";
import { characters, paintDrawnLine, typedCharacters } from "../input/drawn-line.ts";

interface ConfirmEntryProps extends ControlProps {
  readonly typed: string;
  /** The most characters it takes. */
  readonly longest: number;
  /** What is typed is what confirms: the dialog's Confirm will act. */
  readonly ready: boolean;
  /** Why Confirm was refused, or null. */
  readonly complaint: string | null;
  readonly onType: (typed: string, session: number) => void;
  /** Enter: whether it confirmed or was refused, or else goes to the dialog's chosen button. */
  readonly onEnter: (session: number) => boolean;
}

/** What the row under the line says, in words as well as colour (core/look.ts). */
const READY = "Ready: Enter destroys it";
const LOCKED = "Confirm locked until it matches";

export class ConfirmEntry extends Control<ConfirmEntryProps> {
  /** It takes the digits: the remote's viewer types the code with them. */
  protected override keyNeeds(): PageNeeds {
    return { digits: true };
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [
      ["Type", "the name or code"],
      ["Escape", "cancels"],
    ];
  }

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(2, space.height) };
  }

  override paint(canvas: Canvas): void {
    paintDrawnLine(canvas, 0, 0, Colour.Yellow, this.props.typed, this.focused && !this.disabled);
    const { complaint, ready } = this.props;
    if (complaint === null) {
      canvas.coloured(1, 0, ready ? Colour.Green : Colour.Cyan, fit(ready ? READY : LOCKED, canvas.width - 1));
    } else {
      canvas.coloured(1, 0, Colour.Yellow, fit(`! ${complaint}`, canvas.width - 1));
    }
  }

  #type(text: string, session: number): void {
    const { typed, longest } = this.props;
    const room = longest - characters(typed).length;
    this.props.onType(`${typed}${typedCharacters(text, Math.max(0, room))}`, session);
  }

  override onText(event: TextEvent): boolean {
    if (this.disabled) {
      return false;
    }
    this.#type(event.text, event.session);
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled || event.action === "release") {
      return false;
    }
    if (isPress(event, Key.Backspace)) {
      this.props.onType(characters(this.props.typed).slice(0, -1).join(""), event.session);
      return true;
    }
    if (isPress(event, Key.Enter)) {
      return this.props.onEnter(event.session);
    }
    // A key's typing is taken here, as a key: the dialog round it keeps every key it is given, so none would come back as text.
    const typed = typedText(event);
    if (typed === undefined) {
      return false;
    }
    this.#type(typed, event.session);
    return true;
  }
}
