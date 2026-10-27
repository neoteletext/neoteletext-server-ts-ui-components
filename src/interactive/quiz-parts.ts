// The parts of a quiz's page (quiz.ts) that follow its question: an action
// for each answer, named for its coloured key and drawn in its colour, and
// under them the right answer, concealed until Reveal, and what the last
// answer was, flashing.

import { type Child, type Element, h } from "../core/element.ts";
import { COLOUR_KEY_NAMES } from "../core/keys.ts";
import { pad } from "../core/text.ts";
import { KEY_COLOURS } from "../frame/fastext-bar.ts";
import { Action } from "../input/action.ts";
import { Colour } from "../kit.ts";
import { Concealed } from "../text/concealed.ts";
import { Flashing } from "../text/flashing.ts";

/** What the last answer was. */
export type Verdict = "none" | "right" | "wrong";

/** The cells a key's name takes before its answer: "yellow", the longest, and a space. */
const KEY_NAME_CELLS = 7;

/** An action for each answer, which `onAnswer` is told the place of. */
export function answerActions(answers: readonly string[], disabled: boolean, onAnswer: (answer: number, session: number) => void): Element[] {
  return answers.map((answer, index) =>
    h(Action, {
      key: `answer-${index}`,
      text: `${pad(COLOUR_KEY_NAMES[index] ?? "", KEY_NAME_CELLS)} ${answer}`,
      foreground: KEY_COLOURS[index] ?? Colour.White,
      disabled,
      onPress: (session: number) => {
        onAnswer(index, session);
      },
    }),
  );
}

function verdictText(last: Verdict): string {
  if (last === "right") {
    return "RIGHT!";
  }
  return last === "wrong" ? "No, sorry" : "";
}

/** The right answer's key, concealed until Reveal, and the verdict on the last answer while there is one. */
export function verdictRows(right: number, last: Verdict): Child[] {
  const verdict = verdictText(last);
  return [
    h(Concealed, { text: `Reveal: it is ${COLOUR_KEY_NAMES[right] ?? ""}`, foreground: Colour.Magenta }),
    verdict === "" ? null : h(Flashing, { text: verdict, foreground: last === "right" ? Colour.Green : Colour.Red }),
  ];
}
