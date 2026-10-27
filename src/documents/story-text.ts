// The text sub-pages of an article's home (story-pages.ts): its lines over
// as many sub-pages as they need, the first under its headline and byline,
// each after under its headline, small.

import { type Child, h } from "../core/element.ts";
import { Colour } from "../kit.ts";
import { Gap } from "../layout/gap.ts";
import { articleLines, LinesBlock } from "../text/lines.ts";
import { Byline } from "../text/byline.ts";
import { Headline } from "../text/news.ts";
import { chunks, framed, partName, type Article, type Framing } from "./document.ts";

/** A story's first sub-page has its headline, byline and labels over its text. */
const STORY_FIRST_ROWS = 14;

/** A later sub-page has the headline, small, over its text. */
const STORY_MORE_ROWS = 18;

/** `article`'s text in lines of `width`, "Story 1/n" and on. */
export function storyText(framing: Framing, article: Article, width: number): Child[] {
  const parts = chunks(articleLines(article.blocks, width), STORY_FIRST_ROWS, STORY_MORE_ROWS);
  return parts.map((part, index) =>
    framed(
      framing,
      partName("Story", index + 1, parts.length),
      `story-${index}`,
      index === 0
        ? [
            h(Headline, { title: article.title, foreground: Colour.Yellow }),
            h(Byline, { writer: article.writer, date: article.date, labels: article.tags }),
            h(Gap, {}),
          ]
        : [h(Headline, { title: article.title, foreground: Colour.Yellow, lines: 1 }), h(Gap, {})],
      h(LinesBlock, { lines: part }),
    ),
  );
}
