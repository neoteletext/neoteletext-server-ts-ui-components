// A scatter plot: points on the line chart's axes (line-chart.ts), each a
// block of sixels, scaled from the least to the most each way.

import type { Canvas } from "../core/canvas.ts";
import { paintEmpty } from "../core/look.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { Colour } from "../kit.ts";
import { AXIS_CELLS, LABEL_ROWS, axes, plot, span } from "./line-chart.ts";
import { leastOf, mostOf } from "./numbers.ts";

export interface ScatterPlotProps {
  readonly points: readonly (readonly [x: number, y: number])[];
  readonly plotRows: number;
  readonly empty?: string;
  readonly foreground?: Colour;
  readonly labels?: readonly string[];
}

/** A point's sixels each way: a block of four, so a single one stands out. */
const POINT_SIXELS = 2;

export class ScatterPlot extends Component<ScatterPlotProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, this.props.plotRows + LABEL_ROWS) };
  }

  override paint(canvas: Canvas): void {
    if (this.props.points.length === 0) {
      paintEmpty(canvas, this.props.empty ?? "no data");
      return;
    }
    const { sixels, cells } = plot(canvas.width, this.props.plotRows);
    const xs = this.props.points.map(([x]) => x);
    const ys = this.props.points.map(([, y]) => y);
    const [left, right, least, most] = [leastOf(xs), mostOf(xs), leastOf(ys), mostOf(ys)];
    for (const [x, y] of this.props.points) {
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
