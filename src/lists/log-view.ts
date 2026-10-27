// A log: entries as they come, the newest at the bottom, each with its
// time and its level's tag in the level's colour. It follows the newest
// until the viewer scrolls back, and says so; End, or a click on the
// PAUSED badge, follows again.

import { type Child, h } from "../core/element.ts";
import { isPress, type KeyEvent, type WheelEvent } from "../core/events.ts";
import { listStep, WheelLines } from "../core/list-cursor.ts";
import { Colour, Key } from "../kit.ts";
import { Control, type ControlProps } from "../input/control.ts";
import { Columns } from "../layout/columns.ts";
import { Rows } from "../layout/layouts.ts";
import { Badges } from "../text/badge.ts";
import { LogLines } from "./log-lines.ts";
import { BAR_CELLS, ScrollBar, scrolled } from "./scroll.ts";

export type LogLevel = "debug" | "info" | "warning" | "error";

export interface LogEntry {
  /** Milliseconds since the Unix epoch. */
  readonly at: number;
  readonly level: LogLevel;
  readonly text: string;
}

export interface LogViewProps extends ControlProps {
  readonly entries: readonly LogEntry[];
  /** The entries shown at once. */
  readonly shown: number;
  readonly empty?: string;
}

interface LogViewState {
  /** The first entry shown, or null while it follows the newest. */
  readonly top: number | null;
}

export class LogView extends Control<LogViewProps, LogViewState> {
  override state: LogViewState = { top: null };
  readonly #wheel = new WheelLines();

  protected override keysHint(): string {
    return "Up PgUp scroll back, End or a click on PAUSED follows";
  }

  get #last(): number {
    return Math.max(0, this.props.entries.length - this.props.shown);
  }

  override render(): Child {
    const top = this.state.top ?? this.#last;
    const following = this.state.top === null;
    return h(
      Rows,
      {},
      h(
        Columns,
        { widths: [null, BAR_CELLS], height: this.props.shown },
        h(LogLines, { entries: this.props.entries.slice(top, top + this.props.shown), empty: this.props.empty ?? "no entries yet" }),
        h(ScrollBar, {
          top,
          total: this.props.entries.length,
          shown: this.props.shown,
          disabled: this.disabled,
          onScroll: (to) => {
            this.#scroll(to);
          },
        }),
      ),
      h(
        Badges,
        following
          ? { badges: [{ text: "LIVE", background: Colour.Red, flash: true }], text: `${this.props.entries.length} entries` }
          : {
              badges: [
                {
                  text: "PAUSED",
                  background: Colour.Blue,
                  ...(this.disabled
                    ? {}
                    : {
                        onPress: () => {
                          this.setState({ top: null });
                        },
                      }),
                },
              ],
              text: "End follows the newest again",
            },
      ),
    );
  }

  #scroll(top: number): void {
    this.setState({ top: top >= this.#last ? null : Math.max(0, top) });
  }

  override onKey(event: KeyEvent): boolean {
    if (isPress(event, Key.End)) {
      this.setState({ top: null });
      return true;
    }
    const step = listStep(event, this.props.shown);
    if (step === null) {
      return false;
    }
    const top = this.state.top ?? this.#last;
    this.#scroll(scrolled(top, step, this.#last));
    return true;
  }

  override onWheel(event: WheelEvent): boolean {
    if (this.disabled) {
      return false;
    }
    this.#scroll((this.state.top ?? this.#last) + this.#wheel.lines(event.dy));
    return true;
  }
}
