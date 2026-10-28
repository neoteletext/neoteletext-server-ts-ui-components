// What the roulette shows under its wheel (roulette.ts): the prompt to spin,
// or the article flicking past or the one it stopped on, and under that
// what to do next.

import { type Child, h } from "../core/element.ts";
import type { Article } from "../documents/document.ts";
import { Colour } from "../kit.ts";
import { Gap } from "../layout/gap.ts";
import { Rows } from "../layout/layouts.ts";
import { Headline } from "../text/news.ts";
import { Paragraph } from "../text/paragraph.ts";
import { Action } from "../input/action.ts";

export interface RouletteText {
  /** The article it stopped on or flicks past, or undefined before its first spin. */
  readonly article: Article | undefined;
  readonly spinning: boolean;
  readonly disabled: boolean;
  readonly onSpin: (session: number) => void;
}

export function rouletteText({ article, spinning, disabled, onSpin }: RouletteText): Child {
  return h(
    Rows,
    {},
    article === undefined
      ? h(Action, { text: "Press Enter to spin the wheel", foreground: Colour.Cyan, disabled, onPress: onSpin })
      : h(Headline, { title: article.title, page: article.page, foreground: spinning ? Colour.White : Colour.Yellow, linked: !spinning }),
    h(Gap, {}),
    spinning || article === undefined
      ? h(Paragraph, { text: spinning ? "Spinning..." : "", foreground: Colour.Green })
      : h(Action, { text: "Enter reads it; Space to spin again", foreground: Colour.Green, disabled, hint: "A click spins again", onPress: onSpin }),
  );
}
