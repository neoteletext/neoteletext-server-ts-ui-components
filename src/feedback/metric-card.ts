// A metric card: one figure of a dashboard. Its label after its kind's
// mark on a chip of the kind's colour, as a notice has (notice.ts), so its
// health shows without colour too; the figure, in large text or a line;
// how far it moved since before, its way said by a mark, "+" up, "-" down
// and "=" not at all, before the amount; and, given its history, a
// sparkline of it beneath.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { type Kind, KINDS } from "../core/look.ts";
import { Colour } from "../kit.ts";
import { Sparkline } from "../charts/sparkline.ts";
import { BigText } from "../text/big-text.ts";
import { Text } from "../text/styles.ts";
import { Notice } from "./notice.ts";

export interface MetricCardProps {
  /** What it measures, after its kind's mark. */
  readonly label: string;
  /** The figure, in its kind's colour; "--" when it is no number. */
  readonly value: number;
  /** What it was before, for its change; no change is shown without it. */
  readonly previous?: number;
  /** Its health; info when absent. */
  readonly kind?: Kind;
  /** Written after the figure, as "%" or " ms". */
  readonly unit?: string;
  /** Places after the point; none when absent. */
  readonly decimals?: number;
  /** The figure in large text rather than a line. */
  readonly big?: boolean;
  /** Its values over time, oldest first, drawn beneath as a sparkline. */
  readonly history?: readonly number[];
  /** The sparkline's rows; one when absent. */
  readonly historyRows?: number;
}

/** The most places shown after the point: more than any figure on a row needs, and within what toFixed takes (0 to 100), so a count from props never makes it throw. */
const MOST_DECIMALS = 6;
/** What a figure that is no number is written as. */
const UNKNOWN = "--";

/** Each way a figure can move, and the mark that says it. */
const UP = "+";
const DOWN = "-";
const FLAT = "=";

/** A count of places as toFixed takes it: a whole number from nought to the most. */
function placesOf(decimals: number | undefined): number {
  return Number.isNaN(decimals) || decimals === undefined ? 0 : Math.min(MOST_DECIMALS, Math.max(0, Math.trunc(decimals)));
}

/** `value` to `places` after the point, or the unknown mark for NaN or Infinity. */
function figure(value: number, places: number): string {
  return Number.isFinite(value) ? value.toFixed(places) : UNKNOWN;
}

/** The change from `previous` to `value` as its mark and amount, at the places shown: a move too small to show is none. */
function changeOf(value: number, previous: number, places: number): string {
  const amount = value - previous;
  if (!Number.isFinite(amount)) {
    return UNKNOWN;
  }
  const shown = Math.abs(amount).toFixed(places);
  if (Number(shown) === 0) {
    return `${FLAT}${shown}`;
  }
  return `${amount > 0 ? UP : DOWN}${shown}`;
}

/** One figure of a dashboard: label, health, value, change, history. */
export class MetricCard extends Component<MetricCardProps> {
  override render(): Child {
    const kind = this.props.kind ?? "info";
    const colour = KINDS[kind].background;
    const places = placesOf(this.props.decimals);
    const shown = `${figure(this.props.value, places)}${this.props.unit ?? ""}`;
    const change = this.props.previous === undefined ? null : changeOf(this.props.value, this.props.previous, places);
    const history = this.props.history;
    return [
      h(Notice, { kind, text: this.props.label }),
      this.props.big === true
        ? [h(BigText, { text: shown, foreground: colour }), change === null ? null : h(Text, { text: change, foreground: Colour.White })]
        : h(Text, { text: change === null ? shown : `${shown}  ${change}`, foreground: colour }),
      history === undefined ? null : h(Sparkline, { values: history, last: false, foreground: colour, plotRows: this.props.historyRows ?? 1 }),
    ];
  }
}
