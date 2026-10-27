// A wizard: steps taken in order. The steps' names run along the top, the
// current one on a band and those done ticked; a progress bar shows how far
// along; the current step's content is under it; Back and Next are the red
// and green keys (F1 and F2 on a keyboard), so the page takes the coloured
// keys, and the last step's Next is Finish. Back and Next are also actions
// a click takes (input/action.ts), and a step done is a badge a click goes
// back to; each is a control the browser lights.

import { type Child, h } from "../core/element.ts";
import type { KeyEvent } from "../core/events.ts";
import { colourKeyOf } from "../core/keys.ts";
import type { PageNeeds } from "../core/needs.ts";
import { Control, type ControlProps } from "../input/control.ts";
import { Colour } from "../kit.ts";
import { ProgressBar } from "../feedback/progress.ts";
import { Gap, Rows } from "../layout/layouts.ts";
import { Paragraph } from "../text/styles.ts";
import { Badges } from "../text/badge.ts";
import { Action } from "../input/action.ts";
import { Columns } from "../layout/layouts.ts";
import { CHOSEN } from "../core/look.ts";

export interface WizardProps extends ControlProps {
  /** The steps' names; the children are their contents, in order. */
  readonly steps: readonly string[];
  /** Whether the step may be left forward: a step with something missing says what. */
  readonly ready?: (step: number) => string | null;
  readonly onFinish?: (session: number) => void;
  readonly onStep?: (step: number, session: number) => void;
}

interface WizardState {
  readonly step: number;
  readonly finished: boolean;
  readonly complaint: string | null;
}

/** Back and Next: the red and green keys. */
const BACK = 0;
const NEXT = 1;
/** The cells Back takes before Next: its colour's cell, its text and two of space, so Next's colour takes the third. */
const BACK_CELLS = 1 + "red Back".length + 2;

export class Wizard extends Control<WizardProps, WizardState> {
  override state: WizardState = { step: 0, finished: false, complaint: null };

  protected override keyNeeds(): PageNeeds {
    return { colourKeys: true };
  }

  protected override keysHint(): string {
    return "red Back, green Next, or a click; Tab to a step's fields";
  }

  override render(): Child {
    const { steps } = this.props;
    const { step, finished } = this.state;
    const last = step === steps.length - 1;
    const badges = steps.map((name, index) => ({
      text: `${index < step || finished ? "x" : String(index + 1)} ${name}`,
      background: index === step && !finished ? CHOSEN.background : index < step || finished ? Colour.Green : Colour.Blue,
      foreground: index === step && !finished ? CHOSEN.foreground : index < step || finished ? Colour.Black : Colour.White,
      // A step done, before the one shown, is a way back to it.
      ...(index < step && !finished && !this.disabled ? { onPress: (session: number) => this.#go(index, session) } : {}),
    }));
    const nextAction = h(Action, { text: `green ${last ? "Finish" : "Next"}`, foreground: Colour.Green, disabled: this.disabled, onPress: (session: number) => this.#next(session) });
    return h(
      Rows,
      {},
      h(Badges, { badges }),
      h(ProgressBar, { label: finished ? "Done" : `Step ${step + 1} of ${steps.length}`, value: finished ? steps.length : step, max: steps.length, foreground: Colour.Cyan }),
      h(Gap, {}),
      finished ? h(Paragraph, { text: "All done. Thank you.", foreground: Colour.Green }) : ((this.props.children ?? [])[step] ?? null),
      h(Gap, { rows: 0, grow: 1 }),
      this.state.complaint === null ? null : h(Paragraph, { text: `! ${this.state.complaint}`, foreground: Colour.Red }),
      finished ? null : step === 0 ? nextAction : h(Columns, { widths: [BACK_CELLS, null], height: 1 }, h(Action, { text: "red Back", foreground: Colour.Green, disabled: this.disabled, onPress: (session: number) => this.#back(session) }), nextAction),
    );
  }

  #go(step: number, session: number): void {
    this.setState({ step, complaint: null });
    this.props.onStep?.(step, session);
  }

  #back(session: number): void {
    if (this.state.step > 0 && !this.state.finished) {
      this.#go(this.state.step - 1, session);
    }
  }

  /** Next, or Finish on the last step, unless the step says what it is missing. */
  #next(session: number): void {
    const { step, finished } = this.state;
    if (finished) {
      return;
    }
    const complaint = this.props.ready?.(step) ?? null;
    if (complaint !== null) {
      this.setState({ complaint });
    } else if (step === this.props.steps.length - 1) {
      this.setState({ finished: true, complaint: null });
      this.emit({ type: "submit", value: step, session, origin: "viewer" });
      this.props.onFinish?.(session);
    } else {
      this.#go(step + 1, session);
    }
  }

  override onKey(event: KeyEvent): boolean {
    if (this.state.finished) {
      return false;
    }
    const key = colourKeyOf(event);
    if (key === BACK) {
      this.#back(event.session);
      return true;
    }
    if (key === NEXT) {
      this.#next(event.session);
      return true;
    }
    return false;
  }
}
