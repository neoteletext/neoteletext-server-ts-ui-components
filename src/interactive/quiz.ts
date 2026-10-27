// A quiz answered with the four coloured keys, or a click on an answer
// (each an action, input/action.ts, a control the browser lights), its
// answer concealed until Reveal.

import { type Child, h } from "../core/element.ts";
import type { KeyEvent } from "../core/events.ts";
import { COLOUR_KEY_NAMES, colourKeyOf } from "../core/keys.ts";
import { type Sound } from "../core/sound.ts";
import { pad } from "../core/text.ts";
import { KEY_COLOURS } from "../frame/frame.ts";
import { Colour } from "../kit.ts";
import { Rows } from "../layout/layouts.ts";
import { Concealed, Flashing, Paragraph } from "../text/styles.ts";
import { Action } from "../input/action.ts";
import { Control, type ControlProps } from "../input/control.ts";
import type { PageNeeds } from "../core/needs.ts";

/** One question of a quiz. */
export interface Question {
  readonly question: string;
  readonly answers: readonly [string, string, string, string];
  /** The right answer's place, 0 to 3. */
  readonly right: number;
}

export interface QuizProps extends ControlProps {
  readonly questions: readonly Question[];
  readonly right?: Sound;
  readonly wrong?: Sound;
}

interface QuizState {
  readonly asked: number;
  readonly score: number;
  readonly last: "none" | "right" | "wrong";
}


/** A quiz answered with the four coloured keys (the page takes them itself) or a click on an answer; the answer is concealed until Reveal is pressed. */
export class Quiz extends Control<QuizProps, QuizState> {
  override state: QuizState = { asked: 0, score: 0, last: "none" };

  protected override keyNeeds(): PageNeeds {
    return { colourKeys: true };
  }

  protected override keysHint(): string {
    return "Answer with a coloured key or a click; Reveal shows";
  }


  override render(): Child {
    const question = this.props.questions[this.state.asked % this.props.questions.length];
    if (question === undefined) {
      return null;
    }
    const verdict = this.state.last === "right" ? "RIGHT!" : this.state.last === "wrong" ? "No, sorry" : "";
    return h(
      Rows,
      {},
      h(Paragraph, { text: `Question ${this.state.asked + 1}   score ${this.state.score} of ${this.state.asked}`, foreground: Colour.Cyan }),
      h(Paragraph, { text: "" }),
      h(Paragraph, { text: question.question, foreground: Colour.White }),
      h(Paragraph, { text: "" }),
      ...question.answers.map((answer, index) =>
        h(Action, {
          key: `answer-${index}`,
          text: `${pad(COLOUR_KEY_NAMES[index] ?? "", 7)} ${answer}`,
          foreground: KEY_COLOURS[index] ?? Colour.White,
          disabled: this.disabled,
          onPress: (session: number) => this.#answer(index, session),
        }),
      ),
      h(Paragraph, { text: "" }),
      h(Concealed, { text: `Reveal: it is ${COLOUR_KEY_NAMES[question.right] ?? ""}`, foreground: Colour.Magenta }),
      verdict === "" ? null : h(Flashing, { text: verdict, foreground: this.state.last === "right" ? Colour.Green : Colour.Red }),
    );
  }

  /** Answers the question asked with answer `answer`, 0 to 3; false when there is no question. */
  #answer(answer: number, session: number): boolean {
    const question = this.props.questions[this.state.asked % this.props.questions.length];
    if (question === undefined || this.disabled) {
      return false;
    }
    const right = answer === question.right;
    const sound = right ? this.props.right : this.props.wrong;
    if (sound !== undefined) {
      this.services.play(sound, session);
    }
    this.setState({ asked: this.state.asked + 1, score: this.state.score + (right ? 1 : 0), last: right ? "right" : "wrong" });
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    const answer = colourKeyOf(event);
    return answer !== null && this.#answer(answer, event.session);
  }
}
