// The layout part's examples: stacks, columns, places, layers, grids,
// panels, rules and jump labels.

import {
  At,
  Badges,
  Button,
  Centred,
  Columns,
  Gap,
  Grid,
  h,
  JoinedPanels,
  JumpLabels,
  Layers,
  PageLink,
  Panel,
  Paragraph,
  Rows,
  Rule,
  Text,
} from "../../src/index.ts";
import { Colour } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const layout: Part = {
  part: "layout",
  title: "Layout",
  about:
    "Where components go on the page: stacked in rows, side by side in columns, in a grid, at a fixed place, or over one another; framed in panels, divided by rules, and reached in two presses by jump labels.",
  examples: [
    {
      component: "Rows",
      title: "A footer pushed to the bottom",
      build: () =>
        h(
          Rows,
          { grow: 1 },
          h(Text, { text: "Rail services this morning", foreground: Colour.Yellow }),
          h(Paragraph, { text: "Delays of up to 20 minutes between Reading and Swindon after a signal fault at Didcot." }),
          h(Gap, { grow: 1 }),
          h(Text, { text: "Updated 08:15", foreground: Colour.Cyan }),
        ),
    },
    {
      component: "Columns",
      title: "A fixed column and a shared one",
      build: () =>
        h(
          Columns,
          { widths: [14, null] },
          h(
            Rows,
            {},
            h(Text, { text: "London", foreground: Colour.Cyan }),
            h(Text, { text: "Cardiff", foreground: Colour.Cyan }),
            h(Text, { text: "Edinburgh", foreground: Colour.Cyan }),
          ),
          h(Rows, {}, h(Text, { text: "Sunny, 18C" }), h(Text, { text: "Showers, 14C" }), h(Text, { text: "Cloudy, 12C" })),
        ),
    },
    {
      component: "Columns",
      title: "Two even columns",
      build: () =>
        h(
          Columns,
          {},
          h(Paragraph, { text: "Rovers came from behind to beat City 2-1 with a late header.", foreground: Colour.White }),
          h(Paragraph, { text: "Wanderers stay top after a goalless draw at home.", foreground: Colour.Yellow }),
        ),
    },
    {
      component: "Centred",
      title: "A question and its buttons",
      build: () =>
        h(
          Centred,
          {},
          h(Text, { text: "Play another round?", foreground: Colour.Yellow }),
          h(Gap, {}),
          h(Button, { label: "Play again", onPress: () => {} }),
          h(Button, { label: "Back to the scores", onPress: () => {} }),
        ),
    },
    {
      component: "Gap",
      title: "Space between sections",
      build: () => [
        h(Text, { key: "first", text: "HEADLINES", foreground: Colour.Yellow }),
        h(Paragraph, { key: "news", text: "Council approves the new bridge over the Avon." }),
        h(Gap, { key: "gap", rows: 3 }),
        h(Text, { key: "second", text: "SPORT", foreground: Colour.Yellow }),
        h(Paragraph, { key: "sport", text: "England name an unchanged side for Saturday." }),
      ],
    },
    {
      component: "Grid",
      title: "An index in two columns",
      build: () =>
        h(
          Grid,
          { columns: 2 },
          h(PageLink, { page: 0x101, label: "News" }),
          h(PageLink, { page: 0x300, label: "Sport" }),
          h(PageLink, { page: 0x400, label: "Weather" }),
          h(PageLink, { page: 0x500, label: "Travel" }),
          h(PageLink, { page: 0x600, label: "TV guide" }),
          h(PageLink, { page: 0x700, label: "Recipes" }),
        ),
    },
    {
      component: "At",
      title: "Text at a fixed place",
      build: () => h(At, { row: 6, column: 10 }, h(Text, { text: "Back after the break", foreground: Colour.Cyan })),
    },
    {
      component: "Layers",
      title: "A badge over a story",
      build: () =>
        h(
          Layers,
          {},
          h(
            Rows,
            {},
            h(Text, { text: "Rovers v City", foreground: Colour.Yellow }),
            h(Paragraph, { text: "Under way at the Riverside after a delay for heavy rain." }),
          ),
          h(At, { row: 0, column: 29 }, h(Badges, { badges: [{ text: "LIVE", flash: true }] })),
        ),
    },
    {
      component: "Panel",
      title: "A line with a title",
      build: () =>
        h(Panel, { title: "Travel" }, h(Text, { text: "M4 J15: one lane closed" }), h(Text, { text: "A34: clear" }), h(Text, { text: "M5 J9: slow traffic" })),
    },
    {
      component: "Panel",
      title: "A band in a colour",
      build: () =>
        h(
          Panel,
          { title: "Tonight", style: "band", foreground: Colour.Red, titleForeground: Colour.Yellow },
          h(Text, { text: "19:00 The news" }),
          h(Text, { text: "19:30 Gardeners' hour" }),
          h(Text, { text: "20:00 The quiz" }),
        ),
    },
    {
      component: "JoinedPanels",
      title: "Two panes",
      build: () =>
        h(
          JoinedPanels,
          { titles: ["News", "Sport"] },
          h(Rows, {}, h(Text, { text: "Bridge plan" }), h(Text, { text: "Bus fares up" })),
          h(Rows, {}, h(Text, { text: "Rovers 2-1" }), h(Text, { text: "Test drawn" })),
        ),
    },
    {
      component: "JoinedPanels",
      title: "Three panes of given widths",
      build: () =>
        h(
          JoinedPanels,
          { titles: ["Mon", "Tue", "Wed"], widths: [10, 10, null], foreground: Colour.Green, titleForeground: Colour.White },
          h(Text, { text: "Sunny" }),
          h(Text, { text: "Rain" }),
          h(Text, { text: "Windy, 9C" }),
        ),
    },
    {
      component: "Rule",
      title: "Each style",
      build: () => [
        h(Rule, { key: "thin", style: "thin", title: "thin" }),
        h(Gap, { key: "1" }),
        h(Rule, { key: "bold", style: "bold", title: "bold" }),
        h(Gap, { key: "2" }),
        h(Rule, { key: "double", style: "double", title: "double" }),
        h(Gap, { key: "3" }),
        h(Rule, { key: "dotted", style: "dotted", title: "dotted" }),
        h(Gap, { key: "4" }),
        h(Rule, { key: "dashed", style: "dashed", title: "dashed" }),
      ],
    },
    {
      component: "Rule",
      title: "In a colour, between sections",
      build: () => [
        h(Text, { key: "top", text: "Rovers 2 City 1" }),
        h(Rule, { key: "rule", foreground: Colour.Red, title: "Latest", titleForeground: Colour.White }),
        h(Text, { key: "bottom", text: "Wanderers 0 United 0" }),
      ],
    },
    {
      component: "JumpLabels",
      title: "The labels up",
      build: () =>
        h(
          JumpLabels,
          {},
          h(Button, { label: "News", onPress: () => {} }),
          h(Button, { label: "Sport", onPress: () => {} }),
          h(Button, { label: "Weather", onPress: () => {} }),
          h(Button, { label: "Travel", onPress: () => {} }),
        ),
      act: (page) => {
        page.press(1, "0");
      },
    },
    {
      component: "JumpLabels",
      title: "After 3 is pressed",
      build: () =>
        h(
          JumpLabels,
          {},
          h(Button, { label: "News", onPress: () => {} }),
          h(Button, { label: "Sport", onPress: () => {} }),
          h(Button, { label: "Weather", onPress: () => {} }),
          h(Button, { label: "Travel", onPress: () => {} }),
        ),
      act: (page) => {
        page.press(1, "0");
        page.press(1, "3");
      },
    },
  ],
};
