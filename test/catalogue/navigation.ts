// The navigation part's examples: the ways about a channel and its pages.

import { Breadcrumbs, Collapsible, h, Menu, PageFinder, Pagination, TabStrip, TabView, Text, Tree } from "../../src/index.ts";
import { Colour, Key } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const navigation: Part = {
  part: "navigation",
  title: "Navigation",
  about:
    "The ways about a channel: tabs, menus and trees to choose where to go, sections that open and shut, the way back up, the pages of a run, and a finder that goes to a page by its name.",
  examples: [
    {
      component: "Breadcrumbs",
      title: "The way down",
      build: () =>
        h(Breadcrumbs, {
          trail: [{ label: "Index", page: 0x100 }, { label: "Sport", page: 0x300 }, { label: "Football", page: 0x302 }, { label: "Results" }],
        }),
    },
    {
      component: "Breadcrumbs",
      title: "Joined by slashes",
      build: () =>
        h(Breadcrumbs, {
          separator: "slash",
          trail: [{ label: "Settings", onPress: () => {} }, { label: "Display", onPress: () => {} }, { label: "Colours" }],
        }),
    },
    {
      component: "Collapsible",
      title: "One section open",
      build: () =>
        h(
          Collapsible,
          { titles: ["Opening times", "Getting there", "Prices"], initial: [0] },
          h(Text, { text: "Daily 9am to 5pm, closed Mondays." }),
          h(Text, { text: "Bus 42 stops at the gate." }),
          h(Text, { text: "Adults 8, children free." }),
        ),
    },
    {
      component: "Collapsible",
      title: "An accordion, the second opened",
      build: () =>
        h(
          Collapsible,
          { titles: ["Opening times", "Getting there", "Prices"], accordion: true, initial: [0], background: Colour.Magenta },
          h(Text, { text: "Daily 9am to 5pm, closed Mondays." }),
          h(Text, { text: "Bus 42 stops at the gate." }),
          h(Text, { text: "Adults 8, children free." }),
        ),
      act: (page) => {
        page.press(1, Key.Down);
        page.press(1, Key.Enter);
      },
    },
    {
      component: "Menu",
      title: "Numbered, with a rule and a choice not yet open",
      build: () =>
        h(Menu, {
          title: "Main menu",
          numbered: true,
          items: [
            { label: "News", shortcut: "101" },
            { label: "Weather", shortcut: "400" },
            { label: "Sport", shortcut: "300" },
            { label: "", rule: true },
            { label: "Settings", shortcut: "900" },
            { label: "Sign out", disabled: true },
          ],
          onChoose: () => {},
        }),
    },
    {
      component: "Menu",
      title: "A submenu open",
      build: () =>
        h(Menu, {
          title: "Main menu",
          items: [
            { label: "News", items: [{ label: "Headlines" }, { label: "World" }, { label: "Business" }] },
            {
              label: "Sport",
              items: [
                { label: "Football", shortcut: "302" },
                { label: "Cricket", shortcut: "340" },
                { label: "Tennis", shortcut: "360" },
              ],
            },
            { label: "Weather" },
          ],
          onChoose: () => {},
        }),
      act: (page) => {
        page.press(1, Key.Down);
        page.press(1, Key.Right);
        page.press(1, Key.Down);
      },
    },
    {
      component: "Menu",
      title: "More than fit, scrolled",
      build: () =>
        h(Menu, {
          shown: 4,
          items: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((label) => ({ label })),
          onChoose: () => {},
        }),
      act: (page) => {
        for (let step = 0; step < 4; step += 1) {
          page.press(1, Key.Down);
        }
      },
    },
    {
      component: "PageFinder",
      title: "Before anything is typed",
      build: () =>
        h(PageFinder, {
          shown: 5,
          pages: [
            { page: 0x101, title: "Headlines" },
            { page: 0x300, title: "Sport" },
            { page: 0x302, title: "Football results" },
            { page: 0x400, title: "Weather" },
            { page: 0x410, title: "Weather maps" },
            { page: 0x500, title: "TV listings" },
          ],
        }),
    },
    {
      component: "PageFinder",
      title: "With a word typed",
      build: () =>
        h(PageFinder, {
          shown: 5,
          pages: [
            { page: 0x101, title: "Headlines" },
            { page: 0x300, title: "Sport" },
            { page: 0x302, title: "Football results" },
            { page: 0x400, title: "Weather" },
            { page: 0x410, title: "Weather maps" },
            { page: 0x500, title: "TV listings" },
          ],
        }),
      act: (page) => {
        page.typeKeys(1, "wea");
      },
    },
    {
      component: "Pagination",
      title: "Numbers round the current page",
      build: () => h(Pagination, { count: 20, initial: 4 }),
      allow: { cut: 'the pages left out show as "..", which is the cut mark' },
    },
    {
      component: "Pagination",
      title: "A count and dots",
      build: () => [
        h(Pagination, { key: "count", count: 20, initial: 4, style: "count" }),
        h(Pagination, { key: "dots", count: 8, initial: 2, style: "dots" }),
      ],
    },
    {
      component: "TabStrip",
      title: "Each style",
      build: () => [
        h(TabStrip, { key: "chips", style: "chips", tabs: ["News", "Sport", "Weather", "TV"], active: 1, onChange: () => {} }),
        h(TabStrip, { key: "fastext", style: "fastext", tabs: ["News", "Sport", "Weather", "TV"], active: 1, onChange: () => {} }),
        h(TabStrip, { key: "numbered", style: "numbered", tabs: ["News", "Sport", "Weather", "TV"], active: 1, onChange: () => {} }),
        h(TabStrip, { key: "underline", style: "underline", tabs: ["News", "Sport", "Weather", "TV"], active: 1, onChange: () => {} }),
      ],
    },
    {
      component: "TabView",
      title: "Chips, the second tab chosen",
      build: () =>
        h(
          TabView,
          { tabs: ["Today", "Tomorrow", "Weekend"] },
          h(Text, { text: "Sunny spells, 18C." }),
          h(Text, { text: "Showers later, 15C." }),
          h(Text, { text: "Dry and bright, 20C." }),
        ),
      act: (page) => {
        page.press(1, Key.Right);
      },
    },
    {
      component: "TabView",
      title: "Fastext, chosen by the yellow key",
      build: () =>
        h(
          TabView,
          { tabs: ["Today", "Tomorrow", "Weekend"], style: "fastext" },
          h(Text, { text: "Sunny spells, 18C." }),
          h(Text, { text: "Showers later, 15C." }),
          h(Text, { text: "Dry and bright, 20C." }),
        ),
      act: (page) => {
        page.press(1, Key.Yellow);
      },
    },
    {
      component: "TabView",
      title: "Numbered, chosen by its digit",
      build: () =>
        h(
          TabView,
          { tabs: ["Today", "Tomorrow", "Weekend"], style: "numbered" },
          h(Text, { text: "Sunny spells, 18C." }),
          h(Text, { text: "Showers later, 15C." }),
          h(Text, { text: "Dry and bright, 20C." }),
        ),
      act: (page) => {
        page.typeKeys(1, "3");
      },
    },
    {
      component: "Tree",
      title: "Shut",
      build: () =>
        h(Tree, {
          shown: 6,
          nodes: [
            { label: "News", children: [{ label: "UK" }, { label: "World" }] },
            { label: "Sport", children: [{ label: "Football" }, { label: "Cricket" }] },
            { label: "Weather" },
          ],
        }),
    },
    {
      component: "Tree",
      title: "Opened, with guides",
      build: () =>
        h(Tree, {
          shown: 10,
          guides: true,
          open: ["News", "Sport", "Football"],
          nodes: [
            { label: "News", children: [{ label: "UK" }, { label: "World" }] },
            {
              label: "Sport",
              children: [{ label: "Football", children: [{ label: "Results" }, { label: "Tables" }] }, { label: "Cricket" }],
            },
            { label: "Weather" },
          ],
        }),
      act: (page) => {
        page.press(1, Key.Down);
        page.press(1, Key.Down);
        page.press(1, Key.Down);
      },
    },
  ],
};
