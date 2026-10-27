// StoryPages: an article's home, over sub-pages of its own: its text, its
// picture, its links with a QR code, and where else it appears.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Colour, COLUMNS } from "../kit.ts";
import { Gap } from "../layout/gap.ts";
import { type NumberedRow, NumberedRows } from "../lists/numbered-rows.ts";
import { Paragraph } from "../text/paragraph.ts";
import { framed, type Article, type Framing } from "./document.ts";
import { QrPanel } from "./qr-panel.ts";
import { storyPicture } from "./story-picture.ts";
import { storyText } from "./story-text.ts";

/** The text's width across the page: after its colour, less a margin. */
export const TEXT_WIDTH = COLUMNS - 2;

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
    return [...storyText(this.props, article, TEXT_WIDTH), storyPicture(this.props, this.props.picture), links, where];
  }
}
