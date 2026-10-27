// A live poll: every viewer's copy hears each vote through the bus. Up and
// Down choose and Enter votes, or a click on an option votes for it: each
// option is an action (input/action.ts), a control the browser lights.

import { Bar } from "../charts/bar.ts";
import { type Child, h } from "../core/element.ts";
import { isPress, type KeyEvent } from "../core/events.ts";
import { pad } from "../core/text.ts";
import { Colour, Key } from "../kit.ts";
import { Rows } from "../layout/layouts.ts";
import { Paragraph } from "../text/paragraph.ts";
import { Action } from "../input/action.ts";
import { Control, type ControlProps } from "../input/control.ts";
import { Tally } from "./tally.ts";

export interface PollProps extends ControlProps {
  readonly tally: Tally;
}

interface PollState {
  readonly chosen: number;
  /** This viewer's vote. */
  readonly mine: number | null;
  readonly votes: readonly number[];
}

/** An option's text cells, and its count's after it. */
const OPTION_CELLS = 26;
const COUNT_CELLS = 4;

/** Down chooses the next option and Up the one before. */
function stepOf(event: KeyEvent): number {
  if (isPress(event, Key.Down)) {
    return 1;
  }
  return isPress(event, Key.Up) ? -1 : 0;
}

export class Poll extends Control<PollProps, PollState> {
  override state: PollState = { chosen: 0, mine: null, votes: this.props.tally.votes.slice() };

  #unsubscribe: (() => void) | null = null;

  protected override keysHint(): string {
    return "Up Down choose, Enter or a click votes";
  }

  override componentDidMount(): void {
    this.#unsubscribe = this.services.bus.on("poll", ({ name, votes }) => {
      if (name === this.props.tally.name) {
        this.setState({ votes });
      }
    });
  }

  override componentWillUnmount(): void {
    this.#unsubscribe?.();
  }

  override render(): Child {
    const { options } = this.props.tally;
    const most = Math.max(1, ...this.state.votes);
    const total = this.state.votes.reduce((sum, count) => sum + count, 0);
    return h(
      Rows,
      {},
      ...options.flatMap((option, index) => [
        h(Action, {
          key: `option-${index}`,
          text: `${index === this.state.chosen ? ">" : " "}${this.state.mine === index ? "*" : " "}${pad(option, OPTION_CELLS)}${String(this.state.votes[index] ?? 0).padStart(COUNT_CELLS)}`,
          foreground: index === this.state.chosen ? Colour.Yellow : Colour.White,
          disabled: this.disabled,
          hint: `A click votes for ${option}`,
          onPress: (session: number) => {
            this.#vote(index, session);
          },
        }),
        h(Bar, { key: `bar-${index}`, value: this.state.votes[index] ?? 0, max: most, foreground: Colour.Magenta }),
      ]),
      h(Paragraph, { text: `${total} votes, live${this.state.mine === null ? "" : ": * is yours"}`, foreground: Colour.Cyan }),
    );
  }

  /** Votes for `option`, moving this viewer's vote there if they had one, and tells every copy. */
  #vote(option: number, session: number): void {
    if (this.disabled) {
      return;
    }
    this.props.tally.move(this.state.mine, option);
    this.setState({ chosen: option, mine: option });
    this.services.bus.emit("poll", { name: this.props.tally.name, votes: this.props.tally.votes.slice() });
    this.activate(option, session);
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled) {
      return false;
    }
    const count = this.props.tally.options.length;
    // With no options there is nothing to choose or vote for.
    if (count === 0) {
      return false;
    }
    if (isPress(event, Key.Enter)) {
      this.#vote(this.state.chosen, event.session);
      return true;
    }
    const step = stepOf(event);
    if (step === 0) {
      return false;
    }
    this.setState({ chosen: (this.state.chosen + step + count) % count });
    return true;
  }
}
