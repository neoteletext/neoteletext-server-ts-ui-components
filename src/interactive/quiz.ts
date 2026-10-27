// A quiz answered with the four coloured keys, or a click on an answer
// (each an action, input/action.ts, a control the browser lights), its
// answer concealed until Reveal.

import { type Child, h } from "../core/element.ts";
import type { KeyEvent } from "../core/events.ts";
import { colourKeyOf } from "../core/keys.ts";
import type { PageNeeds } from "../core/needs.ts";
import type { Sound } from "../core/sound.ts";
import { Control, type ControlProps, type KeyHelpEntry } from "../input/control.ts";
import { Colour } from "../kit.ts";
import { Rows } from "../layout/layouts.ts";
import { Paragraph } from "../text/paragraph.ts";
import { answerActions, type Verdict, verdictRows } from "./quiz-parts.ts";

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
  readonly last: Verdict;
}

/** A quiz answered with the four coloured keys (the page takes them itself) or a click on an answer; the answer is concealed until Reveal is pressed. */
export class Quiz extends Control<QuizProps, QuizState> {
  override state: QuizState = { asked: 0, score: 0, last: "none" };

  protected override keyNeeds(): PageNeeds {
    return { colourKeys: true };
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [
      ["A coloured key or a click", "answers"],
      ["Reveal", "shows"],
    ];
  }

  override render(): Child {
    const question = this.props.questions[this.state.asked % this.props.questions.length];
    if (question === undefined) {
      return null;
    }
    return h(
      Rows,
      {},
      h(Paragraph, { text: `Question ${this.state.asked + 1}   score ${this.state.score} of ${this.state.asked}`, foreground: Colour.Cyan }),
      h(Paragraph, { text: "" }),
      h(Paragraph, { text: question.question, foreground: Colour.White }),
      h(Paragraph, { text: "" }),
      ...answerActions(question.answers, this.disabled, (answer, session) => {
        this.#answer(answer, session);
      }),
      h(Paragraph, { text: "" }),
      ...verdictRows(question.right, this.state.last),
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
