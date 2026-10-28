// A scatter plot: points on the line chart's axes (line-chart.ts), each a
// block of sixels, scaled from the least to the most each way. A point
// either of whose figures is NaN or Infinity has no place on the axes, and
// is left out, as the line chart leaves such a value out.

import type { Canvas } from "../core/canvas.ts";
import { paintEmpty } from "../core/look.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { Colour } from "../kit.ts";
import { AXIS_CELLS, LABEL_ROWS, axes, plot, span } from "./line-chart.ts";
import { leastOf, mostOf } from "./numbers.ts";

export interface ScatterPlotProps {
  /** The points, each its x and y, scaled from the least to the most each way; a point with a figure that is not a finite number is left out. */
  readonly points: readonly (readonly [x: number, y: number])[];
  /** The rows the plot takes, above the labels' row. */
  readonly plotRows: number;
  /** What it says when no point has two finite numbers; "no data" when absent. */
  readonly empty?: string;
  /** The points' colour; yellow when absent. */
  readonly foreground?: Colour;
  /** Labels spread along the bottom. */
  readonly labels?: readonly string[];
}

/** A point's sixels each way: a block of four, so a single one stands out. */
const POINT_SIXELS = 2;

export class ScatterPlot extends Component<ScatterPlotProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, this.props.plotRows + LABEL_ROWS) };
  }

  override paint(canvas: Canvas): void {
    const points = this.props.points.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
    if (points.length === 0) {
      paintEmpty(canvas, this.props.empty ?? "no data");
      return;
    }
    const { sixels, cells } = plot(canvas.width, this.props.plotRows);
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    const [left, right, least, most] = [leastOf(xs), mostOf(xs), leastOf(ys), mostOf(ys)];
    for (const [x, y] of points) {
      const across = Math.round(((x - left) / span(left, right)) * (sixels.width - POINT_SIXELS));
      const down = Math.round(((most - y) / span(least, most)) * (sixels.height - POINT_SIXELS));
      for (let dy = 0; dy < POINT_SIXELS; dy += 1) {
        for (let dx = 0; dx < POINT_SIXELS; dx += 1) {
          sixels.set(across + dx, down + dy, true);
        }
      }
    }
    canvas.sixels(0, AXIS_CELLS + 1, this.props.foreground ?? Colour.Yellow, sixels);
    axes(canvas, this.props.plotRows, least, most, this.props.labels, cells);
  }
}
