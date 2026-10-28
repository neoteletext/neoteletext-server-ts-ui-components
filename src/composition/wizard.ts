// A wizard: steps taken in order. The steps' names run along the top, the
// current one on a band and those done ticked; a progress bar shows how far
// along; the current step's content is under it; Back and Next are the red
// and green keys (F1 and F2 on a keyboard), so the page takes the coloured
// keys, and the last step's Next is Finish. Back and Next are also actions
// a click takes (input/action.ts), and a step done is a badge a click goes
// back to; each is a control the browser lights. Disabled or finished, it
// has no Back or Next: it takes no coloured key, the page keeps them, and
// its hint offers none.

import { type Child, h } from "../core/element.ts";
import type { KeyEvent } from "../core/events.ts";
import { colourKeyOf } from "../core/keys.ts";
import type { PageNeeds } from "../core/needs.ts";
import { Control, type ControlProps, type KeyHelpEntry } from "../input/control.ts";
import { Colour } from "../kit.ts";
import { Gap } from "../layout/gap.ts";
import { Rows } from "../layout/layouts.ts";
import { Paragraph } from "../text/paragraph.ts";
import { stepBadges, stepMoves, stepProgress, type WizardPlace } from "./wizard-parts.ts";

export interface WizardProps extends ControlProps {
  /** The steps' names; the children are their contents, in order. */
  readonly steps: readonly string[];
  /** Whether the step may be left forward: a step with something missing says what. */
  readonly ready?: (step: number) => string | null;
  /** Next on the last step, once it is ready: the wizard is done. */
  readonly onFinish?: (session: number) => void;
  /** The step changed, by Back, Next or a click on a step done: the step now shown. */
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

export class Wizard extends Control<WizardProps, WizardState> {
  override state: WizardState = { step: 0, finished: false, complaint: null };

  /** Back and Next can be pressed: it is neither disabled nor finished. */
  get #moving(): boolean {
    return !this.disabled && !this.state.finished;
  }

  protected override keyNeeds(): PageNeeds {
    return { colourKeys: this.#moving };
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return this.#moving
      ? [
          ["red", "Back"],
          ["green", "Next"],
          ["Tab", "to a step's fields"],
        ]
      : [];
  }

  override render(): Child {
    const { step, finished } = this.state;
    const place: WizardPlace = { steps: this.props.steps, step, finished };
    const go = this.disabled
      ? null
      : (to: number, session: number): void => {
          this.#go(to, session);
        };
    return h(
      Rows,
      {},
      stepBadges(place, go),
      stepProgress(place),
      h(Gap, {}),
      finished ? h(Paragraph, { text: "All done. Thank you.", foreground: Colour.Green }) : ((this.props.children ?? [])[step] ?? null),
      h(Gap, { rows: 0, grow: 1 }),
      this.state.complaint === null ? null : h(Paragraph, { text: `! ${this.state.complaint}`, foreground: Colour.Red }),
      finished
        ? null
        : stepMoves(
            place,
            this.disabled,
            (session) => {
              this.#back(session);
            },
            (session) => {
              this.#next(session);
            },
          ),
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
    if (!this.#moving) {
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
