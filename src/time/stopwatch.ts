// A stopwatch: the time since it was started, counting up, in large digits
// or as a line of text, its laps beneath, the latest first. It is a
// control: Enter or Space starts and stops it, its lap key records a lap
// while it runs, Escape or Backspace sets it back to nought. Its time is
// read off the channel's clock, not counted in ticks, so a tick missed
// while nobody watched loses nothing; its timer runs only while it runs and
// someone watches, to show the time go on.

import { type Child, h } from "../core/element.ts";
import { isPress, type KeyEvent } from "../core/events.ts";
import { choosing } from "../core/keys.ts";
import { DISABLED, FOCUSED_LABEL, LABEL, MARK } from "../core/look.ts";
import { Colour, Key, ROWS } from "../kit.ts";
import { clockTime } from "../feedback/listening-view.ts";
import { type ControlProps, Control, type KeyHelpEntry } from "../input/control.ts";
import { Text } from "../text/styles.ts";
import { BigDigits } from "./big-digits.ts";
import { SECOND_MS } from "./clock.ts";

export interface StopwatchProps extends ControlProps {
  /** The time in large digits rather than a line of text. */
  readonly big?: boolean;
  /** The key that records a lap; "l" when absent, either case. */
  readonly lapKey?: string;
  /** The most laps kept and shown; older ones go. */
  readonly mostLaps?: number;
  readonly foreground?: Colour;
}

/** One lap: its number, its own time and the time at its end, in milliseconds. */
interface Lap {
  readonly number: number;
  readonly lapMs: number;
  readonly splitMs: number;
}

interface StopwatchState {
  /** When it was last started, by the channel's clock, or null while it is stopped. */
  readonly startedAt: number | null;
  /** The milliseconds it ran before it was last started. */
  readonly bankedMs: number;
  /** The channel's clock when it last looked: what the time shown is read against. */
  readonly now: number;
  /** The laps kept, the latest first. */
  readonly laps: readonly Lap[];
}

/** The lap key when not told: L for lap. */
const LAP_KEY = "l";
/** The laps kept when not told: a few rows under the time. */
const MOST_LAPS = 5;
/** What it is called when it has no label. */
const NAME = "Stopwatch";

/** The elapsed milliseconds as the whole seconds a stopwatch shows: one shows a second only once it has passed. */
function shownTime(elapsedMs: number): string {
  return clockTime(Math.floor(elapsedMs / SECOND_MS));
}

export class Stopwatch extends Control<StopwatchProps, StopwatchState> {
  override state: StopwatchState = { startedAt: null, bankedMs: 0, now: 0, laps: [] };
  /** The tick's timer, -1 for none: none while it is stopped. */
  #timer = -1;

  /** The laps it keeps: a whole number from nought to a page's rows, since no more can be shown. */
  get #mostLaps(): number {
    const most = this.props.mostLaps ?? MOST_LAPS;
    return Number.isNaN(most) ? MOST_LAPS : Math.min(ROWS, Math.max(0, Math.trunc(most)));
  }

  get #running(): boolean {
    return this.state.startedAt !== null;
  }

  /** The milliseconds it has run, by the time it last looked. */
  #elapsedMs(state: Readonly<StopwatchState>, now: number): number {
    return state.bankedMs + (state.startedAt === null ? 0 : Math.max(0, now - state.startedAt));
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [
      ["Enter", "starts or stops"],
      [(this.props.lapKey ?? LAP_KEY).toUpperCase(), "laps"],
      ["Esc", "resets"],
    ];
  }

  #start(): void {
    const now = this.services.now();
    this.setState({ startedAt: now, now });
    this.#timer = this.setInterval(
      () => {
        this.setState({ now: this.services.now() });
      },
      SECOND_MS,
      { whileViewed: true },
    );
  }

  #stop(): void {
    this.clearTimer(this.#timer);
    this.#timer = -1;
    const now = this.services.now();
    this.setState((state) => ({ startedAt: null, bankedMs: this.#elapsedMs(state, now), now }));
  }

  #lap(): void {
    const now = this.services.now();
    this.setState((state) => {
      const splitMs = this.#elapsedMs(state, now);
      const number = (state.laps[0]?.number ?? 0) + 1;
      const lapMs = splitMs - (state.laps[0]?.splitMs ?? 0);
      return { now, laps: [{ number, lapMs, splitMs }, ...state.laps].slice(0, this.#mostLaps) };
    });
  }

  /** Back to nought and stopped; answers false when it is there already, so the key goes on up, as a dialog's Escape would. */
  #reset(): boolean {
    if (!this.#running && this.state.bankedMs === 0 && this.state.laps.length === 0) {
      return false;
    }
    this.clearTimer(this.#timer);
    this.#timer = -1;
    this.setState({ startedAt: null, bankedMs: 0, laps: [] });
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled) {
      return false;
    }
    if (choosing(event)) {
      if (this.#running) {
        this.#stop();
      } else {
        this.#start();
      }
      return true;
    }
    if (isPress(event, Key.Escape) || isPress(event, Key.Backspace)) {
      return this.#reset();
    }
    if (event.action !== "release" && event.key.toLowerCase() === (this.props.lapKey ?? LAP_KEY).toLowerCase()) {
      // A lap is taken only while it runs; the key is its own either way.
      if (this.#running) {
        this.#lap();
      }
      return true;
    }
    return false;
  }

  /** Its name and whether it runs, in words: a mark and yellow while it has the keys, blue while disabled. */
  #heading(): Child {
    let foreground: Colour = LABEL;
    if (this.disabled) {
      foreground = DISABLED;
    } else if (this.focused) {
      foreground = FOCUSED_LABEL;
    }
    const mark = this.focused && !this.disabled ? MARK : " ";
    return h(Text, { text: `${mark}${this.props.label ?? NAME}  ${this.#running ? "RUNNING" : "STOPPED"}`, foreground });
  }

  override render(): Child {
    const shown = shownTime(this.#elapsedMs(this.state, this.state.now));
    const foreground = this.props.foreground ?? Colour.Green;
    return [
      this.#heading(),
      this.props.big === true ? h(BigDigits, { text: shown, foreground }) : h(Text, { text: shown, foreground }),
      ...this.state.laps.map((lap) => h(Text, { key: lap.number, text: `Lap ${lap.number}  ${shownTime(lap.lapMs)}  at ${shownTime(lap.splitMs)}` })),
    ];
  }
}
