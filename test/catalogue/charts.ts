// The charts part's examples: bars, columns, lines, points, heat, shares, a bracket and a spectrum.

import {
  Bar,
  BarChart,
  Bracket,
  BreakdownBar,
  ColumnChart,
  Gap,
  Heatmap,
  LineChart,
  PieChart,
  ScatterPlot,
  Sparkline,
  Spectrum,
  Text,
  h,
} from "../../src/index.ts";
import { Colour, Key } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const charts: Part = {
  part: "charts",
  title: "Charts",
  about:
    "Figures drawn in mosaics: bars and columns scaled to the largest, lines and points on axes, heat maps, the shares of a whole as a bar or a pie, a cup's bracket and a sound's spectrum. Each says its figures in words or marks as well, so none is read by colour alone.",
  examples: [
    {
      component: "BarChart",
      title: "A league table's points",
      build: () =>
        h(BarChart, {
          bars: [
            { label: "Arsenal", value: 74 },
            { label: "Liverpool", value: 71 },
            { label: "Man City", value: 68 },
            { label: "Chelsea", value: 63 },
            { label: "Newcastle", value: 57 },
            { label: "Aston Villa", value: 55 },
          ],
          foreground: Colour.Cyan,
        }),
    },
    {
      component: "BarChart",
      title: "Seats, the labels in party colours, the pointer on one",
      build: () =>
        h(BarChart, {
          bars: [
            { label: "Labour", value: 411, foreground: Colour.Red },
            { label: "Conservative", value: 121, foreground: Colour.Cyan },
            { label: "Lib Dem", value: 72, foreground: Colour.Yellow },
            { label: "SNP", value: 9, foreground: Colour.Yellow },
            { label: "Green", value: 4, foreground: Colour.Green },
          ],
          labelCells: 14,
          onChoose: () => {},
        }),
      act: (page) => {
        page.hover(1, "enter", 1, 4);
      },
    },
    {
      component: "Bar",
      title: "Bars on their own",
      build: () => [
        h(Text, { key: "yes-label", text: "Yes  64%", foreground: Colour.Green }),
        h(Bar, { key: "yes", value: 64, max: 100, foreground: Colour.Green }),
        h(Text, { key: "no-label", text: "No   36%", foreground: Colour.Red }),
        h(Bar, { key: "no", value: 36, max: 100, foreground: Colour.Red }),
      ],
    },
    {
      component: "ColumnChart",
      title: "Rainfall by month, with figures",
      build: () =>
        h(ColumnChart, {
          bars: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"].map((label, index) => ({
            label,
            value: [79, 59, 52, 51, 49, 45, 45, 50][index] ?? 0,
          })),
          plotRows: 8,
          figures: true,
          foreground: Colour.Cyan,
        }),
    },
    {
      component: "ColumnChart",
      title: "Medals, each in its colour",
      build: () =>
        h(ColumnChart, {
          bars: [
            { label: "Gold", value: 14, foreground: Colour.Yellow },
            { label: "Silver", value: 22, foreground: Colour.White },
            { label: "Bronze", value: 29, foreground: Colour.Red },
          ],
          plotRows: 10,
          columnCells: 6,
          figures: true,
        }),
    },
    {
      component: "LineChart",
      title: "A day's temperature",
      build: () =>
        h(LineChart, {
          values: [11, 10, 10, 9, 9, 9, 10, 12, 14, 16, 18, 19, 21, 22, 23, 23, 22, 21, 19, 17, 15, 14, 13, 12],
          plotRows: 8,
          labels: ["00", "06", "12", "18"],
          foreground: Colour.Yellow,
        }),
    },
    {
      component: "LineChart",
      title: "The area under it filled",
      build: () =>
        h(LineChart, {
          values: [120, 180, 260, 410, 520, 480, 610, 700, 650, 820, 1010, 1180],
          plotRows: 6,
          area: true,
          labels: ["Jan", "Apr", "Jul", "Oct"],
          foreground: Colour.Green,
        }),
    },
    {
      component: "ScatterPlot",
      title: "Goals scored and points won",
      build: () =>
        h(ScatterPlot, {
          // Each club's goals scored and points won.
          points: [72, 68, 70, 55, 61, 52, 44, 41, 38, 30].map((goals, index) => [goals, [74, 71, 68, 63, 57, 55, 48, 45, 39, 28][index] ?? 0]),
          plotRows: 8,
          labels: ["30 goals", "44", "58"],
          foreground: Colour.Cyan,
        }),
    },
    {
      component: "Sparkline",
      title: "Prices with their last",
      build: () => [
        h(Sparkline, { key: "ftse", label: "FTSE", values: [7612, 7650, 7598, 7701, 7745, 7730, 7802, 7790, 7841, 7866], last: true }),
        h(Sparkline, { key: "gold", label: "Gold", values: [2311, 2330, 2302, 2288, 2295, 2320, 2341, 2336], last: true, foreground: Colour.Yellow }),
        h(Gap, { key: "gap" }),
        h(Sparkline, {
          key: "pound",
          label: "GBP/USD",
          values: [1.25, 1.26, 1.27, 1.26, 1.24, 1.25, 1.27, 1.28, 1.29, 1.28, 1.3, 1.31],
          plotRows: 3,
          last: true,
          foreground: Colour.Green,
        }),
      ],
    },
    {
      component: "Heatmap",
      title: "Temperatures by colour, with a legend",
      build: () =>
        h(Heatmap, {
          rows: [
            { label: "Mon", values: [8, 9, 12, 15, 17, 16, 13, 10] },
            { label: "Tue", values: [9, 11, 14, 18, 20, 19, 15, 11] },
            { label: "Wed", values: [12, 14, 18, 22, 24, 23, 19, 15] },
            { label: "Thu", values: [10, 12, 15, 17, 18, 17, 14, 12] },
            { label: "Fri", values: [6, 7, 9, 11, 12, 11, 9, 7] },
          ],
          legend: true,
        }),
    },
    {
      component: "Heatmap",
      title: "Viewers by the hour, by density",
      build: () =>
        h(Heatmap, {
          rows: [
            { label: "Sat", values: [1, 1, 0, 0, 0, 1, 2, 3, 4, 4, 5, 5, 4, 4, 5, 6, 7, 8, 9, 9, 8, 6, 4, 2] },
            { label: "Sun", values: [2, 1, 1, 0, 0, 0, 1, 2, 3, 5, 6, 6, 5, 4, 4, 5, 6, 8, 9, 8, 7, 5, 3, 1] },
            { label: "Mon", values: [0, 0, 0, 0, 0, 1, 3, 5, 4, 2, 2, 2, 3, 2, 2, 2, 3, 5, 7, 8, 7, 5, 3, 1] },
          ],
          scale: "density",
          max: 9,
          legend: true,
          foreground: Colour.Green,
        }),
    },
    {
      component: "BreakdownBar",
      title: "An election's shares of the vote",
      build: () =>
        h(BreakdownBar, {
          parts: [
            { label: "Labour", value: 33.7, foreground: Colour.Red },
            { label: "Conservative", value: 23.7, foreground: Colour.Blue },
            { label: "Reform", value: 14.3, foreground: Colour.Cyan },
            { label: "Lib Dem", value: 12.2, foreground: Colour.Yellow },
            { label: "Green", value: 6.7, foreground: Colour.Green },
            { label: "Others", value: 9.4, foreground: Colour.White },
          ],
          barRows: 2,
          legendColumns: 2,
        }),
    },
    {
      component: "PieChart",
      title: "Shares of the vote",
      build: () =>
        h(PieChart, {
          slices: [
            { label: "Labour", value: 33.7, foreground: Colour.Red },
            { label: "Conservative", value: 23.7, foreground: Colour.Blue },
            { label: "Reform", value: 14.3, foreground: Colour.Cyan },
            { label: "Lib Dem", value: 12.2, foreground: Colour.Yellow },
            { label: "Others", value: 16.1, foreground: Colour.White },
          ],
        }),
    },
    {
      component: "PieChart",
      title: "A donut, with marks of its own",
      build: () =>
        h(PieChart, {
          slices: [
            { label: "Streaming", value: 61, foreground: Colour.Green, mark: "S" },
            { label: "Broadcast", value: 27, foreground: Colour.Magenta, mark: "B" },
            { label: "Radio", value: 12, foreground: Colour.Yellow, mark: "R" },
          ],
          plotRows: 10,
          donut: true,
        }),
    },
    {
      component: "Bracket",
      title: "A cup from the quarter-finals",
      build: () =>
        h(Bracket, {
          rounds: [
            {
              name: "Quarter-finals",
              matches: [
                { entrants: ["Arsenal", "Fulham"], scores: [2, 0], winner: 0 },
                { entrants: ["Chelsea", "Leeds"], scores: [1, 2], winner: 1 },
                { entrants: ["Everton", "Spurs"], scores: [0, 3], winner: 1 },
                { entrants: ["Wolves", "Villa"], scores: [2, 1], winner: 0 },
              ],
            },
            {
              name: "Semi-finals",
              matches: [
                { entrants: ["Arsenal", "Leeds"], scores: [3, 1], winner: 0 },
                { entrants: ["Spurs", "Wolves"], scores: [1, 1] },
              ],
            },
            { name: "Final", matches: [{ entrants: ["Arsenal", "?"] }] },
          ],
        }),
    },
    {
      component: "Bracket",
      title: "Moved on a round",
      build: () =>
        h(Bracket, {
          rounds: [
            {
              name: "Round of 16",
              matches: [
                { entrants: ["Spain", "Georgia"], scores: [4, 1], winner: 0 },
                { entrants: ["Germany", "Denmark"], scores: [2, 0], winner: 0 },
                { entrants: ["Portugal", "Slovenia"], scores: [3, 0], winner: 0 },
                { entrants: ["France", "Belgium"], scores: [1, 0], winner: 0 },
              ],
            },
            {
              name: "Quarter-finals",
              matches: [
                { entrants: ["Spain", "Germany"], scores: [2, 1], winner: 0 },
                { entrants: ["Portugal", "France"], scores: [3, 5], winner: 1 },
              ],
            },
            { name: "Semi-final", matches: [{ entrants: ["Spain", "France"], scores: [2, 1], winner: 0 }] },
          ],
          roundCells: 19,
        }),
      act: (page) => {
        page.press(1, Key.Right);
      },
    },
    {
      component: "Spectrum",
      title: "A meter's colours",
      build: () => h(Spectrum, { levels: [0.35, 0.6, 0.95, 0.8, 0.7, 0.55, 0.62, 0.48, 0.4, 0.3, 0.36, 0.22, 0.15, 0.1], plotRows: 6, bandCells: 2 }),
    },
    {
      component: "Spectrum",
      title: "In one colour",
      build: () =>
        h(Spectrum, { levels: [0.2, 0.45, 0.7, 0.9, 0.65, 0.5, 0.42, 0.3, 0.25, 0.18, 0.12, 0.08], plotRows: 4, bandCells: 3, foreground: Colour.Cyan }),
    },
  ],
};
