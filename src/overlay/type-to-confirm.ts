// A dialog (dialog.ts) before something is destroyed: it says what will
// be, and Confirm acts only once the viewer has typed its name or, for a
// viewer with only a remote, the code of digits it shows, a new one each
// time it opens, so neither a slip nor a habit destroys anything. Cancel is
// the button chosen to begin with, so Enter with nothing typed cancels;
// Escape cancels too. Confirm refused says why under the line typed on
// (confirm-entry.ts). The dialog's own answers are its to send: what comes
// up the tree is an activate with the name when it is confirmed, a cancel
// when it is not.

import type { ComponentEvent } from "../core/component-events.ts";
import { type Child, h } from "../core/element.ts";
import { fit } from "../core/text.ts";
import { Control, type ControlProps } from "../input/control.ts";
import { characters, firstCharacters } from "../input/drawn-line.ts";
import { ConfirmEntry } from "./confirm-entry.ts";
import { Dialog } from "./dialog.ts";

export interface TypeToConfirmProps extends ControlProps {
  /** The name of what is destroyed, which the viewer types to confirm; cut to NAME_LONGEST. */
  readonly name: string;
  /** What is destroyed, in words: "the page and its 12 sub-pages". */
  readonly destroys: string;
  /** The dialog's title; "Destroy" and the name when absent. */
  readonly title?: string;
  /** Called as Confirm, or Enter on the line, is taken: only once what is typed is the name or the code. */
  readonly onConfirm: (session: number) => void;
  /** Called as Cancel or Escape answers it, and nothing is destroyed. */
  readonly onCancel?: (session: number) => void;
}

interface TypeToConfirmState {
  readonly typed: string;
  /** The code that confirms as the name does, or null until it is mounted and has one. */
  readonly code: string | null;
  /** Confirm was refused, and nothing has been typed since. */
  readonly refused: boolean;
}

/** The buttons, Cancel first and chosen to begin with. */
const CANCEL = "Cancel";
const CONFIRM = "Confirm";
const BUTTONS = [CANCEL, CONFIRM] as const;
const CANCEL_BUTTON = BUTTONS.indexOf(CANCEL);
const CONFIRM_BUTTON = BUTTONS.indexOf(CONFIRM);

/** The most characters of a name typed to confirm: a dialog's line holds it with its prompt and cursor. */
const NAME_LONGEST = 24;
/** The most characters of what is destroyed, in words: the dialog stays on the page under the frame's title. */
const DESTROYS_LONGEST = 120;
/** The code's digits: few enough to type on a remote, enough that a guess is no habit. */
const CODE_DIGITS = 4;
/** The codes there are of CODE_DIGITS digits. */
const CODE_RANGE = 10 ** CODE_DIGITS;
/** What Confirm refused says. */
const NOT_IT = "Not the name or the code";

/** The first `most` characters of `text`, whole code points: a program's text is not taken on trust. */
function firstOf(text: string, most: number): string {
  return firstCharacters(text, most).join("");
}

export class TypeToConfirm extends Control<TypeToConfirmProps, TypeToConfirmState> {
  override state: TypeToConfirmState = { typed: "", code: null, refused: false };

  /** Its line typed on has the keys, or its dialog's buttons. */
  override focusable(): boolean {
    return false;
  }

  override componentDidMount(): void {
    super.componentDidMount();
    this.setState({ code: String(this.services.below(CODE_RANGE)).padStart(CODE_DIGITS, "0") });
  }

  get #name(): string {
    return firstOf(this.props.name.trimStart(), NAME_LONGEST).trimEnd();
  }

  get #ready(): boolean {
    const typed = this.state.typed.trim();
    return !this.disabled && typed !== "" && (typed === this.#name || typed === this.state.code);
  }

  #message(): string {
    // A character past the most is read, so a longer text is cut with the mark.
    const destroys = fit(firstOf(this.props.destroys, DESTROYS_LONGEST + 1), DESTROYS_LONGEST);
    const code = this.state.code === null ? "" : `, or the code ${this.state.code} with the digit keys,`;
    return `This destroys ${destroys}, and it cannot be undone. Type ${this.#name}${code} to confirm.`;
  }

  /** Confirm: done when what is typed matches, refused otherwise. */
  #confirm(session: number): void {
    if (!this.#ready) {
      this.setState({ refused: true });
      this.play("error", session);
      return;
    }
    this.activate(this.#name, session);
    this.props.onConfirm(session);
  }

  #cancel(session: number): void {
    this.cancel(session);
    this.props.onCancel?.(session);
  }

  #answer(button: number | null, session: number): void {
    if (button === CONFIRM_BUTTON) {
      this.#confirm(session);
    } else {
      this.#cancel(session);
    }
  }

  /** Enter on the line: it confirms or is refused once something is typed; with nothing typed it is the dialog's chosen button's. */
  #enter(session: number): boolean {
    if (this.state.typed.trim() === "") {
      return false;
    }
    this.#confirm(session);
    return true;
  }

  #type(typed: string, session: number): void {
    if (typed === this.state.typed) {
      return;
    }
    this.setState({ typed, refused: false });
    this.play("change", session);
  }

  /** The dialog's answers are this dialog's to send, and only as it decides them. */
  override onComponentEvent(event: ComponentEvent): boolean {
    return event.source instanceof Dialog && (event.type === "activate" || event.type === "cancel");
  }

  override render(): Child {
    const name = this.#name;
    return h(
      Dialog,
      {
        title: this.props.title ?? `Destroy ${name}?`,
        message: this.#message(),
        kind: "error",
        buttons: BUTTONS,
        initial: CANCEL_BUTTON,
        // Confirm cannot be pressed until what is typed matches.
        disabledButtons: this.#ready ? [] : [CONFIRM_BUTTON],
        childFirst: !this.disabled,
        ...(this.props.hint === undefined ? {} : { hint: this.props.hint }),
        onAnswer: (button: number | null, session: number) => {
          this.#answer(button, session);
        },
      },
      h(ConfirmEntry, {
        typed: this.state.typed,
        longest: Math.max(characters(name).length, CODE_DIGITS),
        ready: this.#ready,
        complaint: this.state.refused ? NOT_IT : null,
        disabled: this.disabled,
        autoFocus: !this.disabled,
        ...(this.props.hint === undefined ? {} : { hint: this.props.hint }),
        onType: (typed: string, session: number) => {
          this.#type(typed, session);
        },
        onEnter: (session: number) => this.#enter(session),
      }),
    );
  }
}
