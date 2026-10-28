// The lists part's examples: lists to choose from, tables, logs and the rows they are made of.

import {
  BAR_CELLS,
  ChoiceList,
  Columns,
  DataTable,
  FilterList,
  h,
  ItemText,
  ListRow,
  ListRows,
  LogView,
  NumberedRows,
  ScrollBar,
  ScrollingText,
  Table,
  ToggleList,
} from "../../src/index.ts";
import { Colour, Key } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const lists: Part = {
  part: "lists",
  title: "Lists",
  about:
    "Lists to choose from, by the arrows, a digit, a coloured key or what is typed; tables to read and sort; a log that follows what happens; and the rows and scroll bar every list is built from.",
  examples: [
    {
      component: "ChoiceList",
      title: "More than fit, scrolled",
      build: () =>
        h(ChoiceList, {
          items: ["Arsenal", "Aston Villa", "Brentford", "Brighton", "Chelsea", "Everton", "Fulham", "Liverpool"],
          shown: 5,
          onChoose: () => {},
        }),
      act: (page) => {
        page.press(1, Key.PageDown);
      },
    },
    {
      component: "ChoiceList",
      title: "Picked by digits",
      build: () => h(ChoiceList, { items: ["Breakfast news", "Morning film", "Quiz hour", "Local weather"], shown: 4, pick: "digits", onChoose: () => {} }),
    },
    {
      component: "ChoiceList",
      title: "Picked by the coloured keys",
      build: () => h(ChoiceList, { items: ["Breakfast news", "Morning film", "Quiz hour", "Local weather"], shown: 4, pick: "colours", onChoose: () => {} }),
      act: (page) => {
        page.press(1, Key.Down);
      },
    },
    {
      component: "FilterList",
      title: "Before anything is typed",
      build: () =>
        h(FilterList<string>, {
          items: ["Aberdeen", "Belfast", "Birmingham", "Bristol", "Cardiff", "Edinburgh", "Glasgow", "Leeds"],
          text: (city) => city,
          shown: 5,
          prompt: "Type a city",
          onChoose: () => {},
        }),
    },
    {
      component: "FilterList",
      title: "Narrowed by what is typed",
      build: () =>
        h(FilterList<string>, {
          items: ["Aberdeen", "Belfast", "Birmingham", "Bristol", "Cardiff", "Edinburgh", "Glasgow", "Leeds"],
          text: (city) => city,
          shown: 5,
          prompt: "Type a city",
          onChoose: () => {},
        }),
      act: (page) => {
        page.typeKeys(1, "br");
      },
    },
    {
      component: "DataTable",
      title: "Striped",
      build: () =>
        h(DataTable, {
          columns: [
            { title: "Team", width: 16 },
            { title: "P", width: 4, align: "right" },
            { title: "Pts", width: 5, align: "right", foreground: Colour.Yellow },
          ],
          rows: [
            ["Liverpool", "12", "30"],
            ["Arsenal", "12", "28"],
            ["Chelsea", "12", "25"],
            ["Brighton", "12", "21"],
          ],
          shown: 4,
          striped: true,
        }),
    },
    {
      component: "DataTable",
      title: "Sorted, a row chosen",
      build: () =>
        h(DataTable, {
          columns: [
            { title: "Team", width: 16 },
            { title: "P", width: 4, align: "right" },
            { title: "Pts", width: 5, align: "right" },
          ],
          rows: [
            ["Liverpool", "12", "30"],
            ["Arsenal", "12", "28"],
            ["Chelsea", "12", "25"],
            ["Brighton", "12", "21"],
          ],
          shown: 4,
          sortable: true,
          selectable: true,
          onChoose: () => {},
        }),
      act: (page) => {
        page.typeKeys(1, "1");
        page.press(1, Key.Down);
      },
    },
    {
      component: "ItemText",
      title: "Wrapped over two rows",
      build: () =>
        h(ItemText, {
          text: "Storm warning for the north coast tonight, with gales and heavy rain spreading south by the morning",
          foreground: Colour.White,
          rows: 2,
        }),
    },
    {
      component: "ListRow",
      title: "Chosen and not",
      build: () => [
        h(ListRow, {
          key: "chosen",
          chosen: true,
          focused: true,
          content: (look) => h(ItemText, { text: "On the band: chosen", foreground: look.foreground }),
        }),
        h(ListRow, { key: "plain", chosen: false, focused: true, content: (look) => h(ItemText, { text: "Off it", foreground: look.foreground }) }),
      ],
    },
    {
      component: "ListRows",
      title: "Two-row items, the second chosen",
      build: () =>
        h(ListRows, {
          items: ["Rail strike called off after late talks", "Record crowd for the city marathon", "New bridge opens to traffic"],
          shown: 3,
          itemRows: 2,
          chosen: 1,
          focused: true,
          onPick: () => {},
        }),
    },
    {
      component: "LogView",
      title: "Following the newest",
      build: () =>
        h(LogView, {
          shown: 5,
          entries: [
            { at: Date.UTC(2026, 9, 28, 9, 0, 1), level: "info", text: "Channel started" },
            { at: Date.UTC(2026, 9, 28, 9, 0, 4), level: "debug", text: "Page 100 published" },
            { at: Date.UTC(2026, 9, 28, 9, 2, 10), level: "warning", text: "Feed slow to answer" },
            { at: Date.UTC(2026, 9, 28, 9, 2, 40), level: "error", text: "Feed timed out" },
            { at: Date.UTC(2026, 9, 28, 9, 3, 0), level: "info", text: "Feed back" },
            { at: Date.UTC(2026, 9, 28, 9, 3, 5), level: "info", text: "Viewer joined" },
          ],
        }),
    },
    {
      component: "LogView",
      title: "Scrolled back, paused",
      build: () =>
        h(LogView, {
          shown: 5,
          entries: [
            { at: Date.UTC(2026, 9, 28, 9, 0, 1), level: "info", text: "Channel started" },
            { at: Date.UTC(2026, 9, 28, 9, 0, 4), level: "debug", text: "Page 100 published" },
            { at: Date.UTC(2026, 9, 28, 9, 2, 10), level: "warning", text: "Feed slow to answer" },
            { at: Date.UTC(2026, 9, 28, 9, 2, 40), level: "error", text: "Feed timed out" },
            { at: Date.UTC(2026, 9, 28, 9, 3, 0), level: "info", text: "Feed back" },
            { at: Date.UTC(2026, 9, 28, 9, 3, 5), level: "info", text: "Viewer joined" },
          ],
        }),
      act: (page) => {
        page.press(1, Key.Up);
      },
    },
    {
      component: "NumberedRows",
      title: "An index",
      build: () =>
        h(NumberedRows, {
          entries: [
            { page: 0x101, label: "Headlines", figure: 12 },
            { page: 0x300, label: "Sport", figure: 8 },
            { page: 0x400, label: "Weather", figure: "18C" },
            { page: 0x500, label: "TV listings" },
          ],
        }),
    },
    {
      component: "ScrollBar",
      title: "Beside lines of its own",
      build: () =>
        h(
          Columns,
          { widths: [null, BAR_CELLS], height: 4 },
          h(ListRows, { items: ["Monday", "Tuesday", "Wednesday", "Thursday"], shown: 4, chosen: null, focused: false, onPick: () => {} }),
          h(ScrollBar, { top: 3, total: 12, shown: 4, onScroll: () => {} }),
        ),
    },
    {
      component: "ScrollingText",
      title: "A page down",
      build: () =>
        h(ScrollingText, {
          shown: 4,
          lines: [
            { foreground: Colour.Yellow, text: "Getting there" },
            { foreground: Colour.White, text: "By train: the station is a" },
            { foreground: Colour.White, text: "short walk from the gate." },
            { foreground: Colour.White, text: "By bus: the 42 stops outside." },
            { foreground: Colour.White, text: "By car: park in the east lot." },
            { foreground: Colour.Cyan, text: "Doors open at 9am." },
          ],
        }),
      act: (page) => {
        page.press(1, Key.PageDown);
      },
    },
    {
      component: "Table",
      title: "Labels and values",
      build: () =>
        h(Table, {
          labelCells: 14,
          rows: [
            ["Kick-off", "3pm"],
            ["Ground", "Anfield"],
            ["Referee", "M Oliver"],
            ["Attendance", "53,000"],
          ],
        }),
    },
    {
      component: "ToggleList",
      title: "Some starred",
      build: () => h(ToggleList, { items: ["News", "Sport", "Weather", "Finance", "TV listings"], initial: [0, 2] }),
      act: (page) => {
        page.press(1, Key.Down);
        page.press(1, Key.Enter);
      },
    },
  ],
};
