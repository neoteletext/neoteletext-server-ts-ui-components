// A roulette wheel that spins down to a random article, a sound at each
// step. Enter or a click on the wheel's prompt spins it; when it stops, the
// article's headline is a link a click follows, as Enter does.

import { type Child, h } from "../core/element.ts";
import { isPress, type KeyEvent } from "../core/events.ts";
import type { Sound } from "../core/sound.ts";
import type { Article } from "../documents/document.ts";
import { Wheel } from "../graphics/wheel.ts";
import { Key } from "../kit.ts";
import { At } from "../layout/at.ts";
import { Layers } from "../layout/layers.ts";
import { Control, type ControlProps, type KeyHelpEntry } from "../input/control.ts";
import { rouletteText } from "./roulette-text.ts";

/** The spin's fast steps, before it slows. */
const FAST_STEPS = 10;
const FAST_STEP_MS = 60;

/** The roulette's steps, in milliseconds between them: fast, then slowing to a stop. */
export const SPIN_STEPS_MS = [...Array.from({ length: FAST_STEPS }, () => FAST_STEP_MS), 80, 100, 130, 170, 220, 280, 350, 450] as const;

export interface RouletteProps extends ControlProps {
  /** What it spins between; the one it stops on is a link to its page. */
  readonly articles: readonly Article[];
  /** Played to the viewer who spun it at each step of the spin. */
  readonly tick?: Sound;
  /** Played to the viewer who spun it as it stops. */
  readonly done?: Sound;
}

interface RouletteState {
  /** The step of the spin, or null when it is still. */
  readonly step: number | null;
  readonly lit: number;
  /** The article it stopped on, or flicks past while it spins. */
  readonly article: number | null;
}

/** Enter spins the wheel; each step lights the next segment and shows a title flicking past; it stops on one, and Enter again reads it. */
export class Roulette extends Control<RouletteProps, RouletteState> {
  override state: RouletteState = { step: null, lit: 0, article: null };

  /** The viewer who spun it, who hears its sounds. */
  #session = 0;

  override keyBindings(): readonly KeyHelpEntry[] {
    return [
      ["Enter or a click", "spins"],
      ["Enter again", "reads it"],
    ];
  }

  #spin(step: number): void {
    const wait = SPIN_STEPS_MS[step];
    const article = this.services.below(this.props.articles.length);
    if (wait === undefined) {
      this.setState({ step: null, article });
      if (this.props.done !== undefined) {
        this.services.play(this.props.done, this.#session);
      }
      return;
    }
    this.setState({ step, lit: this.state.lit + 1, article });
    if (this.props.tick !== undefined) {
      this.services.play(this.props.tick, this.#session);
    }
    this.setTimeout(() => {
      this.#spin(step + 1);
    }, wait);
  }

  override render(): Child {
    const article = this.state.article === null ? undefined : this.props.articles[this.state.article];
    return h(
      Layers,
      {},
      h(At, { row: 1, column: 10, rows: 11 }, h(Wheel, { lit: this.state.lit })),
      h(
        At,
        { row: 13, column: 0 },
        rouletteText({
          article,
          spinning: this.state.step !== null,
          disabled: this.disabled,
          onSpin: (session: number) => {
            this.#start(session);
          },
        }),
      ),
    );
  }

  override onKey(event: KeyEvent): boolean {
    if (this.state.step !== null) {
      return isPress(event, Key.Enter) || isPress(event, " ");
    }
    const article = this.state.article === null ? undefined : this.props.articles[this.state.article];
    if (isPress(event, Key.Enter) && article !== undefined) {
      this.services.goto(event.session, article.page);
      return true;
    }
    if (isPress(event, Key.Enter) || isPress(event, " ")) {
      this.#start(event.session);
      return true;
    }
    return false;
  }

  #start(session: number): void {
    if (this.state.step !== null || this.disabled) {
      return;
    }
    this.#session = session;
    this.#spin(0);
  }
}
