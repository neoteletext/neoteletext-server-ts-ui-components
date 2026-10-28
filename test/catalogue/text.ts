// The text part's examples: lines in styles, wrapped and rich text, news,
// badges and large letters.

import {
  articleLines,
  Badges,
  Band,
  BigText,
  Byline,
  Concealed,
  DoubleHeight,
  DoubleWidth,
  Flashing,
  Gap,
  h,
  Headline,
  LinesBlock,
  Newsflash,
  PageLink,
  Paragraph,
  Placeholder,
  RichText,
  Text,
  Ticker,
} from "../../src/index.ts";
import { Colour } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const text: Part = {
  part: "text",
  title: "Text",
  about:
    "Words on the page: a line in a colour, wrapped paragraphs and runs of mixed styles, the teletext sizes and effects, and the pieces of a news service, from headlines and bylines to badges, tickers and large letters.",
  examples: [
    {
      component: "Text",
      title: "In colours",
      build: () => [
        h(Text, { key: "white", text: "Rain at first, then brighter" }),
        h(Text, { key: "yellow", text: "Weather warning: strong winds", foreground: Colour.Yellow }),
        h(Text, { key: "cyan", text: "Updated 08:15", foreground: Colour.Cyan }),
      ],
    },
    {
      component: "Text",
      title: "Centred",
      build: () => h(Text, { text: "Back after the break", foreground: Colour.Green, centre: true }),
    },
    {
      component: "Paragraph",
      title: "Wrapped",
      build: () =>
        h(Paragraph, {
          text: "Work on the new bridge over the Avon starts in March, the council said last night, after a vote of 31 to 12. The old bridge stays open until the new one is finished.",
        }),
    },
    {
      component: "Paragraph",
      title: "At most two lines",
      build: () =>
        h(Paragraph, {
          text: "Work on the new bridge over the Avon starts in March, the council said last night, after a vote of 31 to 12.",
          foreground: Colour.Cyan,
          lines: 2,
        }),
    },
    {
      component: "RichText",
      title: "Runs of styles",
      build: () =>
        h(RichText, {
          runs: [
            { text: "Storm Agnes", foreground: Colour.Yellow },
            { text: "brings winds of up to 70mph to the west tonight." },
            { text: "AMBER", foreground: Colour.Blue, background: Colour.Yellow },
            { text: "warning from 6pm.", foreground: Colour.Cyan },
            { text: "Travel only if you must.", flash: true },
          ],
        }),
    },
    {
      component: "Band",
      title: "Section headings",
      build: () => [
        h(Gap, { key: "space" }),
        h(Band, { key: "top", text: "TOP STORY" }),
        h(Headline, { key: "story", page: 0x104, title: "Council approves the new bridge over the Avon" }),
        h(Gap, { key: "between" }),
        h(Band, { key: "magazines", text: "THE MAGAZINES", background: Colour.Red, foreground: Colour.Yellow }),
        h(Headline, { key: "magazine", page: 0x170, title: "Gardening: what to plant in November" }),
      ],
    },
    {
      component: "Badges",
      title: "Before a line of text",
      build: () => [
        h(Badges, { key: "live", badges: [{ text: "LIVE", flash: true }], text: "Rovers v City" }),
        h(Badges, { key: "new", badges: [{ text: "3 NEW", background: Colour.Blue, foreground: Colour.Yellow }], text: "Messages" }),
        h(Badges, {
          key: "two",
          badges: [
            { text: "BETA", background: Colour.Magenta },
            { text: "FREE", background: Colour.Green, foreground: Colour.Blue },
          ],
          text: "Quiz night",
        }),
      ],
    },
    {
      component: "BigText",
      title: "A word in large letters",
      build: () => [h(BigText, { key: "goal", text: "Goal!", foreground: Colour.Yellow }), h(BigText, { key: "score", text: "2-1" })],
    },
    {
      component: "Headline",
      title: "With their pages",
      build: () => [
        h(Headline, { key: "bridge", page: 0x104, title: "Council approves the new bridge over the Avon after a long debate" }),
        h(Headline, { key: "fares", page: 0x105, title: "Bus fares to rise by 10p in April", foreground: Colour.Cyan }),
        h(Headline, { key: "rail", page: 0x106, title: "Rail strike called off at the last minute after talks through the night", lines: 1 }),
      ],
    },
    {
      component: "Byline",
      title: "Writer, date and labels",
      build: () => [
        h(Headline, { key: "title", title: "Council approves the new bridge", foreground: Colour.Yellow }),
        h(Byline, { key: "byline", writer: "Sam Jones", date: Date.UTC(2026, 9, 27, 14, 5), labels: ["Bristol", "Transport"] }),
      ],
    },
    {
      component: "LinesBlock",
      title: "An article's lines",
      build: () =>
        h(LinesBlock, {
          lines: articleLines(
            [
              { kind: "heading", text: "What happens next" },
              { kind: "paragraph", text: "Work starts in March and should take two years." },
              { kind: "quote", text: '"It is the biggest change to the city centre in fifty years," the council said.' },
              { kind: "item", text: "The old bridge stays open" },
              { kind: "item", text: "Buses run as now" },
            ],
            38,
          ),
        }),
    },
    {
      component: "LinesBlock",
      title: "Nothing to show",
      build: () => h(LinesBlock, { lines: [], empty: "No messages yet" }),
    },
    {
      component: "PageLink",
      title: "Links to pages",
      build: () => [
        h(PageLink, { key: "news", page: 0x101, label: "News" }),
        h(PageLink, { key: "sport", page: 0x300, label: "Sport", foreground: Colour.Green }),
        h(PageLink, { key: "weather", page: 0x400, label: "Weather", foreground: Colour.Cyan }),
      ],
    },
    {
      component: "Newsflash",
      title: "Before the news",
      build: () => h(Newsflash, { text: "Rail strike called off" }),
    },
    {
      component: "Ticker",
      title: "On its second item",
      build: () => [
        h(Text, { key: "label", text: "Latest scores", foreground: Colour.Yellow }),
        h(Ticker, { key: "ticker", items: ["Rovers 2 City 1", "Wanderers 0 United 0", "Town 3 Albion 3"], everyMs: 4000 }),
      ],
      act: (page) => {
        page.advance(4000);
      },
    },
    {
      component: "DoubleHeight",
      title: "A headline two rows high",
      build: () => h(DoubleHeight, { text: "ROVERS ARE CHAMPIONS" }),
    },
    {
      component: "DoubleWidth",
      title: "Letters two cells wide",
      build: () => h(DoubleWidth, { text: "GOAL!", foreground: Colour.Green }),
    },
    {
      component: "Flashing",
      title: "A warning",
      build: () => h(Flashing, { text: "Flood warning in force" }),
    },
    {
      component: "Concealed",
      title: "An answer until Reveal",
      build: () => [
        h(Text, { key: "question", text: "Which city is on the Avon?", foreground: Colour.Yellow }),
        h(Concealed, { key: "answer", text: "Bristol" }),
        h(Text, { key: "reveal", text: "Press Reveal for the answer", foreground: Colour.Cyan }),
      ],
    },
    {
      component: "Placeholder",
      title: "While the results come",
      build: () => h(Placeholder, { text: "Loading the results" }),
    },
  ],
};
