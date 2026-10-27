// StoryPages: split from document.ts; the comments pass writes this file's header.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { RawSubPage } from "../core/raw-sub-page.ts";
import { Colour, COLUMNS } from "../kit.ts";
import { Gap } from "../layout/gap.ts";
import { type NumberedRow, NumberedRows } from "../lists/numbered-rows.ts";
import { articleLines, LinesBlock } from "../text/lines.ts";
import { Byline } from "../text/byline.ts";
import { Headline } from "../text/news.ts";
import { Placeholder } from "../text/placeholder.ts";
import { Paragraph } from "../text/paragraph.ts";
import { chunks, framed, partName, type Article, type Framing } from "./document.ts";
import { QrPanel } from "./qr-panel.ts";

/** The text's width across the page: after its colour, less a margin. */
export const TEXT_WIDTH = COLUMNS - 2;

/** A story's first sub-page has its headline, byline and labels over its text. */
const STORY_FIRST_ROWS = 14;

/** A later sub-page has the headline, small, over its text. */
const STORY_MORE_ROWS = 18;

export interface StoryProps extends Framing {
  readonly article: Article;
  /** The lead picture, as the engine's converter made it, whole-page; none, and the sub-page says so. */
  readonly picture?: string;
  /** The QR code of the article's address, from `neottx qr`. */
  readonly qr?: string;
  /** Where else it appears. */
  readonly where: readonly NumberedRow[];
}

/** An article's home: "Story 1/n" and on, "Picture", "Links", "Where it appears". */
export class StoryPages extends Component<StoryProps> {
  override render(): Child {
    const { article } = this.props;
    const parts = chunks(articleLines(article.blocks, TEXT_WIDTH), STORY_FIRST_ROWS, STORY_MORE_ROWS);
    const text = parts.map((part, index) =>
      framed(
        this.props,
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
    const picture =
      this.props.picture === undefined
        ? framed(this.props, "Picture", "picture", h(Placeholder, { text: "No picture for this one" }))
        : h(RawSubPage, {
            key: "picture",
            tti: this.props.picture,
            title: "Picture",
            background: this.props.background,
            foreground: this.props.foreground ?? Colour.White,
            fastext: this.props.prompts.map(([, page]) => page) as never,
          });
    const links = framed(
      this.props,
      "Links",
      "links",
      h(QrPanel, { what: "The full article", title: article.title, ...(this.props.qr === undefined ? {} : { qr: this.props.qr }) }),
    );
    const where = framed(
      this.props,
      "Where it appears",
      "where",
      h(Paragraph, { text: "This article is listed on these pages:", foreground: Colour.Cyan }),
      h(Gap, {}),
      h(NumberedRows, { entries: this.props.where }),
    );
    return [...text, picture, links, where];
  }
}
