// Bars across: one to the half cell, and a chart of labelled bars scaled to
// the largest. A chart whose bars can be chosen (onChoose) makes each bar,
// its label to its end, a control: a click chooses it, and while the
// pointer is on one the hint row says what it is.

import type { Canvas } from "../core/canvas.ts";
import { paintEmpty } from "../core/look.ts";
import { Component, type Size } from "../core/component.ts";
import type { HoverEvent, PointerEvent } from "../core/events.ts";
import { FULL_BLOCK, LEFT_HALF } from "../core/mosaics.ts";
import { fit, padStart } from "../core/text.ts";
import { Colour, mosaicColour } from "../kit.ts";

export interface BarProps {
  readonly value: number;
  readonly max: number;
  readonly foreground?: Colour;
}

/** A horizontal bar across its box, `value` of `most`, to the half cell. */
export class Bar extends Component<BarProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const cells = canvas.width - 1;
    const halves = this.props.max <= 0 ? 0 : Math.round((2 * cells * Math.min(this.props.value, this.props.max)) / this.props.max);
    canvas.code(0, 0, mosaicColour(this.props.foreground ?? Colour.Green));
    canvas.fill(0, 1, Math.floor(halves / 2), FULL_BLOCK);
    if (halves % 2 === 1) {
      canvas.code(0, 1 + Math.floor(halves / 2), LEFT_HALF);
    }
  }
}

/** One bar of a chart. */
export interface ChartRow {
  readonly label: string;
  readonly value: number;
  readonly foreground?: Colour;
}

export interface BarChartProps {
  readonly bars: readonly ChartRow[];
  readonly empty?: string;
  readonly labelCells?: number;
  readonly foreground?: Colour;
  /** A click on a bar chooses it: each bar is then a control, and while the pointer is on one the hint row gives its label and figure. */
  readonly onChoose?: (index: number, session: number) => void;
}

/** The bar under the pointer, for the hint row. */
interface ChartState {
  readonly hovered: number | null;
}

/** What the hint row says of the bar `index` of `bars` under the pointer. */
export function barHint(bars: readonly ChartRow[], index: number | null): string | null {
  const bar = index === null ? undefined : bars[index];
  return bar === undefined ? null : `${bar.label}: ${bar.value}; a click chooses it`;
}

/** Labelled bars, each with its figure, scaled to the largest. */
export class BarChart extends Component<BarChartProps, ChartState> {
  override state: ChartState = { hovered: null };

  static readonly FIGURE_CELLS = 5;

  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(Math.max(1, this.props.bars.length), space.height) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.bars.length === 0) {
      paintEmpty(canvas, this.props.empty ?? "no data");
      return;
    }
    const labels = this.props.labelCells ?? 14;
    const most = Math.max(1, ...this.props.bars.map((row) => row.value));
    const barAt = labels + BarChart.FIGURE_CELLS;
    const cells = canvas.width - barAt;
    this.props.bars.forEach((entry, row) => {
      canvas.coloured(row, 0, entry.foreground ?? Colour.White, fit(entry.label, labels - 1));
      canvas.coloured(row, labels, Colour.Cyan, padStart(String(entry.value), BarChart.FIGURE_CELLS - 1));
      const halves = Math.round((2 * (cells - 1) * entry.value) / most);
      canvas.code(row, barAt, mosaicColour(this.props.foreground ?? Colour.Green));
      canvas.fill(row, barAt + 1, Math.floor(halves / 2), FULL_BLOCK);
      if (halves % 2 === 1) {
        canvas.code(row, barAt + 1 + Math.floor(halves / 2), LEFT_HALF);
      }
      if (this.props.onChoose !== undefined) {
        // From the label, after its colour's cell, to the bar's end.
        canvas.control(row, 1, Math.max(1, barAt + 1 + Math.ceil(halves / 2) - 1), 1, String(row));
      }
    });
  }

  override hint(): string | null {
    return barHint(this.props.bars, this.state.hovered);
  }

  override onClick(event: PointerEvent): boolean {
    if (this.props.onChoose === undefined || event.region === undefined) {
      return false;
    }
    this.props.onChoose(Number(event.region), event.session);
    return true;
  }

  override onHover(event: HoverEvent): boolean {
    if (this.props.onChoose === undefined || event.region === undefined) {
      return false;
    }
    this.setState({ hovered: event.entered ? Number(event.region) : null });
    return true;
  }
}
