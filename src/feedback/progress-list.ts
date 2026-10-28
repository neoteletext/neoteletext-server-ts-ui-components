// A progress list: several things going on at once, a progress bar each
// (progress.ts) with its label and its share, then how fast it goes and how
// long it has left, estimated from how far it has come since it started.
// Each says "--" while that is not known: before it started, before any
// time has passed, while it has not moved. It looks at the clock again each
// second while someone watches, so the estimates go on as time does.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { padStart } from "../core/text.ts";
import { Colour, ROWS } from "../kit.ts";
import { Columns } from "../layout/columns.ts";
import { Text } from "../text/styles.ts";
import { SECOND_MS } from "../time/clock.ts";
import { clockTime } from "./listening-view.ts";
import { ProgressBar } from "./progress.ts";

export interface ProgressItem {
  /** What it is, before its bar. */
  readonly label: string;
  /** How far along, in max's units; its rate is worked out from it. */
  readonly value: number;
  /** What finished is; its time left is worked out to it. */
  readonly max: number;
  /** When it started, by the channel's clock (Services.now); its rate and time left are not known without it. */
  readonly startedMs?: number;
}

export interface ProgressListProps {
  /** What is under way, a row each: its bar, its rate and its time left; no more than a page's rows are drawn. */
  readonly items: readonly ProgressItem[];
  /** Every bar's colour; green when absent. */
  readonly foreground?: Colour;
  /** Each label's column, as a progress bar's. */
  readonly labelCells?: number;
}

interface ProgressListState {
  /** The channel's clock when it last looked. */
  readonly now: number;
}

/** What a rate or a time left not yet known is written as. */
const UNKNOWN = "--";

/** The cells a rate is written in, as "12.5/s" or "999k/s", and a time left, as "1:02:03". */
const RATE_CELLS = 6;
const LEFT_CELLS = 7;
/** The estimate's column: its colour's cell, the rate, a space, the time left. */
const ESTIMATE_CELLS = 1 + RATE_CELLS + 1 + LEFT_CELLS;

/** Rates a thousand and a million times larger, written with a letter so they fit their cells. */
const KILO = 1_000;
const MEGA = 1_000_000;
/** Below this a rate keeps a place after the point; above it the place says nothing. */
const FINE_RATE = 10;

/** A rate per second in its cells: "0.5/s", "42/s", "12k/s", "3M/s". */
function rateText(perSecond: number): string {
  if (perSecond >= MEGA) {
    return `${Math.round(perSecond / MEGA)}M/s`;
  }
  if (perSecond >= KILO) {
    return `${Math.round(perSecond / KILO)}k/s`;
  }
  return perSecond >= FINE_RATE ? `${Math.round(perSecond)}/s` : `${perSecond.toFixed(1)}/s`;
}

/** The rate and time left of `item` at `now`, written out: each "--" while it is not known. */
function estimate(item: ProgressItem, now: number): string {
  const seconds = item.startedMs === undefined ? Number.NaN : (now - item.startedMs) / SECOND_MS;
  const perSecond = seconds > 0 ? item.value / seconds : Number.NaN;
  const known = Number.isFinite(perSecond) && perSecond >= 0;
  const left = known && perSecond > 0 ? Math.max(0, item.max - item.value) / perSecond : Number.NaN;
  const rate = known ? rateText(perSecond) : UNKNOWN;
  return `${padStart(rate, RATE_CELLS)} ${padStart(Number.isFinite(left) ? clockTime(left) : UNKNOWN, LEFT_CELLS)}`;
}

/** Several progress bars, each with its rate and time left. */
export class ProgressList extends Component<ProgressListProps, ProgressListState> {
  override state: ProgressListState = { now: 0 };

  override componentDidMount(): void {
    const look = (): void => {
      this.setState({ now: this.services.now() });
    };
    look();
    this.setInterval(look, SECOND_MS, { whileViewed: true });
  }

  override render(): Child {
    // No more bars than a page has rows can show, so no more are made, however many come.
    return this.props.items.slice(0, ROWS).map((item, index) =>
      h(
        Columns,
        { key: index, widths: [null, ESTIMATE_CELLS] },
        h(ProgressBar, {
          label: item.label,
          value: item.value,
          max: item.max,
          ...(this.props.foreground === undefined ? {} : { foreground: this.props.foreground }),
          ...(this.props.labelCells === undefined ? {} : { labelCells: this.props.labelCells }),
        }),
        h(Text, { text: estimate(item, this.state.now), foreground: Colour.Cyan }),
      ),
    );
  }
}
