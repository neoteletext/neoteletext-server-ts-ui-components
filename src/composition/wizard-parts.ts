// The parts of a wizard's page (wizard.ts) round its step's content: above
// it, the steps' names as badges and a progress bar; below it, Back and
// Next as actions.

import { type Element, h } from "../core/element.ts";
import { CHOSEN, inkOn } from "../core/look.ts";
import { ProgressBar } from "../feedback/progress.ts";
import { Action } from "../input/action.ts";
import { Colour } from "../kit.ts";
import { Columns } from "../layout/columns.ts";
import { type BadgeSpec, Badges } from "../text/badge.ts";

/** Where the wizard is: the step shown, and whether it is finished. */
export interface WizardPlace {
  readonly steps: readonly string[];
  readonly step: number;
  readonly finished: boolean;
}

/** The cells Back takes before Next: its colour's cell, its text and two of space, so Next's colour takes the third. */
const BACK_CELLS = 1 + "red Back".length + 2;

/** A step's badge: the one shown on the band, those done green, those to come blue. */
function badgeLook(index: number, place: WizardPlace): { readonly background: Colour; readonly foreground: Colour } {
  if (index === place.step && !place.finished) {
    return CHOSEN;
  }
  return index < place.step || place.finished
    ? { background: Colour.Green, foreground: inkOn(Colour.Green) }
    : { background: Colour.Blue, foreground: inkOn(Colour.Blue) };
}

/** The steps' names, those done ticked; `go`, while there is one, goes back to a step done before the one shown. */
export function stepBadges(place: WizardPlace, go: ((step: number, session: number) => void) | null): Element {
  const { steps, step, finished } = place;
  const badges = steps.map((name, index): BadgeSpec => {
    const { background, foreground } = badgeLook(index, place);
    const text = `${index < step || finished ? "x" : String(index + 1)} ${name}`;
    // A step done, before the one shown, is a way back to it.
    if (index < step && !finished && go !== null) {
      return {
        text,
        background,
        foreground,
        onPress: (session: number): void => {
          go(index, session);
        },
      };
    }
    return { text, background, foreground };
  });
  return h(Badges, { badges });
}

export function stepProgress({ steps, step, finished }: WizardPlace): Element {
  return h(ProgressBar, {
    label: finished ? "Done" : `Step ${step + 1} of ${steps.length}`,
    value: finished ? steps.length : step,
    max: steps.length,
    foreground: Colour.Cyan,
  });
}

/** Next, or Finish on the last step, after Back on every step but the first. */
export function stepMoves(place: WizardPlace, disabled: boolean, back: (session: number) => void, next: (session: number) => void): Element {
  const last = place.step === place.steps.length - 1;
  const nextAction = h(Action, { text: `green ${last ? "Finish" : "Next"}`, foreground: Colour.Green, disabled, onPress: next });
  if (place.step === 0) {
    return nextAction;
  }
  return h(Columns, { widths: [BACK_CELLS, null], height: 1 }, h(Action, { text: "red Back", foreground: Colour.Red, disabled, onPress: back }), nextAction);
}
