// The games part's examples: a roulette of articles and snake.

import { h, Roulette, Snake, tone } from "../../src/index.ts";
import { Key } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const games: Part = {
  part: "games",
  title: "Games",
  about: "Games for a page, each viewer playing their own: a roulette wheel that spins down to an article to read, and snake.",
  examples: [
    {
      component: "Roulette",
      title: "Spinning",
      build: () =>
        h(Roulette, {
          articles: ["Storm closes the coast road", "Village wins best-kept prize", "New bridge opens at last", "Library to stay open late"].map(
            (title, index) => ({
              page: 0x201 + index,
              title,
              writer: "News desk",
              date: 1_790_000_000_000,
              blocks: [],
              tags: ["local"],
            }),
          ),
          tick: { name: "tick", samples: tone(1_200, 20) },
        }),
      act: (page) => {
        page.press(1, Key.Enter);
        page.runUntil(600);
      },
    },
    {
      component: "Roulette",
      title: "Stopped on an article",
      build: () =>
        h(Roulette, {
          articles: ["Storm closes the coast road", "Village wins best-kept prize", "New bridge opens at last", "Library to stay open late"].map(
            (title, index) => ({
              page: 0x201 + index,
              title,
              writer: "News desk",
              date: 1_790_000_000_000,
              blocks: [],
              tags: ["local"],
            }),
          ),
        }),
      act: (page) => {
        page.press(1, Key.Enter);
        page.runUntil(10_000);
      },
    },
    {
      component: "Snake",
      title: "Mid-game",
      build: () => h(Snake, { everyMs: 150, rows: 14 }),
      act: (page) => {
        page.runUntil(4_000);
        page.press(1, Key.Down);
        page.runUntil(5_500);
        page.press(1, Key.Left);
        page.runUntil(8_000);
      },
    },
    {
      component: "Snake",
      title: "Crashed",
      build: () => h(Snake, { everyMs: 150, rows: 10 }),
      act: (page) => {
        page.runUntil(30_000);
      },
    },
  ],
};
