// The time part's examples: dates as text, large digits, clocks,
// countdowns, stopwatches and calendars. The channel's clock starts at the
// Unix epoch, so an example that shows the time first runs it on.

import { BigDigits, Calendar, Clock, Countdown, DATE_FORMATS, DateText, Grid, h, Stopwatch, Text } from "../../src/index.ts";
import { Colour, Key } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const time: Part = {
  part: "time",
  title: "Time",
  about:
    "Dates and times as the pages write them, always in UTC, and the components that keep time: a clock, a countdown and a stopwatch in large digits, and a calendar to choose a day in.",
  examples: [
    {
      component: "DateText",
      title: "In each format",
      build: () =>
        h(
          Grid,
          { columns: 2 },
          ...Object.entries(DATE_FORMATS).flatMap(([name, pattern]) => [
            h(Text, { key: `${name}-name`, text: name, foreground: Colour.Cyan }),
            h(DateText, { key: name, value: "2026-10-27T14:05:09Z", pattern }),
          ]),
        ),
    },
    {
      component: "DateText",
      title: "A pattern of its own, centred",
      build: () => [
        h(DateText, { key: "own", value: Date.UTC(2026, 11, 25), pattern: "dddd D MMMM", foreground: Colour.Yellow, centre: true }),
        h(DateText, { key: "bad", value: "not a date", fallback: "Date to follow", foreground: Colour.Cyan, centre: true }),
      ],
    },
    {
      component: "BigDigits",
      title: "A score and a time",
      build: () => [h(BigDigits, { key: "score", text: "3-1" }), h(BigDigits, { key: "time", text: "90:00", foreground: Colour.Yellow })],
    },
    {
      component: "Clock",
      title: "The time",
      build: () => h(Clock, {}),
      act: (page) => {
        page.advance(Date.UTC(2026, 9, 27, 14, 5));
      },
    },
    {
      component: "Clock",
      title: "With seconds, in cyan",
      build: () => h(Clock, { seconds: true, foreground: Colour.Cyan }),
      act: (page) => {
        page.advance(Date.UTC(2026, 9, 27, 14, 5, 9));
      },
    },
    {
      component: "Countdown",
      title: "Days to Christmas",
      build: () => [
        h(Text, { key: "label", text: "Days, hours, minutes and seconds to go", foreground: Colour.Cyan }),
        h(Countdown, { key: "countdown", until: Date.UTC(2026, 11, 25) }),
      ],
      act: (page) => {
        page.advance(Date.UTC(2026, 11, 22, 9, 15, 30));
      },
    },
    {
      component: "Stopwatch",
      title: "Ready to start",
      build: () => h(Stopwatch, { label: "Lap timer" }),
    },
    {
      component: "Stopwatch",
      title: "Running, with laps, large",
      build: () => h(Stopwatch, { label: "Lap timer", big: true }),
      act: (page) => {
        page.press(1, Key.Enter);
        page.advance(62_000);
        page.press(1, "l");
        page.advance(58_000);
        page.press(1, "l");
        page.advance(31_000);
      },
    },
    {
      component: "Calendar",
      title: "A month to read",
      build: () =>
        h(Calendar, {
          year: 2026,
          month: 9,
          today: Date.UTC(2026, 9, 27),
          marked: [
            { year: 2026, month: 9, day: 3 },
            { year: 2026, month: 9, day: 14 },
            { year: 2026, month: 9, day: 31 },
          ],
        }),
    },
    {
      component: "Calendar",
      title: "A day chosen with the arrows",
      build: () => h(Calendar, { year: 2026, month: 9, selectable: true, marked: [{ year: 2026, month: 9, day: 14 }] }),
      act: (page) => {
        page.press(1, Key.Down);
        page.press(1, Key.Down);
        page.press(1, Key.Right);
      },
    },
  ],
};
