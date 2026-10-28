// The frame part's examples: the frame round every page, and the rows it
// is made of, which a page may also use on their own.

import { Calendar, FastextBar, Frame, Gap, h, HintLine, KeyHelp, Paragraph, PositionLine, StatusBar, Text, TitleBand } from "../../src/index.ts";
import { Colour } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const frame: Part = {
  part: "frame",
  title: "The frame",
  about:
    "Every page's frame, as Ceefax laid it out: a title band in double height, the body, a hint of what the keys do, and the four Fastext prompts in red, green, yellow and cyan. Its rows are components of their own, with a status bar and lists of keys beside them.",
  examples: [
    {
      component: "Frame",
      title: "A page with its prompts",
      build: () =>
        h(
          Frame,
          {
            title: "Weather",
            background: Colour.Magenta,
            hint: "Press 401 to 403 for the regions",
            prompts: [
              ["Index", 0x100],
              ["Rain", 0x401],
              ["Wind", 0x402],
              ["Tides", 0x403],
            ],
          },
          h(Paragraph, { text: "Rain in the west by noon, spreading east through the afternoon. Brighter later, with a few showers." }),
        ),
    },
    {
      component: "Frame",
      title: "A band in its own colours",
      build: () =>
        h(
          Frame,
          { title: "Football results", background: Colour.Red, foreground: Colour.Yellow, prompts: [["Index", 0x100]] },
          h(Text, { text: "Rovers 2 City 1" }),
          h(Text, { text: "Wanderers 0 United 0" }),
        ),
    },
    {
      component: "TitleBand",
      title: "In a colour",
      build: () => [
        h(Gap, { key: "1" }),
        h(TitleBand, { key: "news", title: "News", background: Colour.Blue }),
        h(Gap, { key: "2" }),
        h(TitleBand, { key: "sport", title: "Sport", background: Colour.Red, foreground: Colour.Yellow }),
        h(Gap, { key: "3" }),
        h(TitleBand, { key: "travel", title: "Travel", background: Colour.Magenta }),
      ],
    },
    {
      component: "HintLine",
      title: "What the keys do",
      build: () => [
        h(HintLine, { key: "plain", text: "Up and Down to choose, OK to open" }),
        h(HintLine, { key: "cyan", text: "Press 0 for the labels", foreground: Colour.Cyan }),
      ],
    },
    {
      component: "KeyHelp",
      title: "Keys given",
      build: () =>
        h(KeyHelp, {
          keys: [
            ["Up Down", "choose a story"],
            ["OK", "read it"],
            ["Red", "the front page"],
            ["Green", "sport"],
          ],
        }),
    },
    {
      component: "KeyHelp",
      title: "In two columns",
      build: () =>
        h(KeyHelp, {
          columns: 2,
          keys: [
            ["Play", "plays"],
            ["Stop", "stops"],
            ["Left", "back 10s"],
            ["Right", "on 10s"],
          ],
        }),
    },
    {
      component: "KeyHelp",
      title: "Following the keys",
      build: () => [h(Calendar, { key: "calendar", year: 2026, month: 9, selectable: true }), h(KeyHelp, { key: "help" })],
    },
    {
      component: "PositionLine",
      title: "Where a long list is",
      build: () => [
        h(PositionLine, { key: "lines", first: 0, shown: 18, total: 66 }),
        h(PositionLine, { key: "results", first: 20, shown: 10, total: 42, noun: "Results" }),
      ],
    },
    {
      component: "StatusBar",
      title: "Segments and the time",
      build: () => [
        h(Text, { key: "show", text: "Now playing: Breakfast with Jo" }),
        h(StatusBar, {
          key: "status",
          segments: [{ text: "ON AIR", foreground: Colour.Green }, { text: "Radio 2" }, { text: "Live", foreground: Colour.Yellow }],
          right: "14:05",
        }),
      ],
    },
    {
      component: "StatusBar",
      title: "An alarm",
      build: () => [
        h(Text, { key: "site", text: "Transmitter: Mendip" }),
        h(StatusBar, { key: "status", segments: [{ text: "OFF AIR" }, { text: "Signal lost" }], right: "14:07", background: Colour.Red, alarm: true }),
      ],
    },
    {
      component: "FastextBar",
      title: "Four prompts",
      build: () =>
        h(FastextBar, {
          prompts: [
            ["News", 0x101],
            ["Sport", 0x300],
            ["Weather", 0x400],
            ["TV", 0x600],
          ],
        }),
    },
  ],
};
