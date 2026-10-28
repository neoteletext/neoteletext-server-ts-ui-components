// DayPages: headlines over sub-pages, a day's on as many as they need, as
// a document's lines are (document.ts), each named by its day and, when it
// takes several, its place among them: "Today 2/3". A sub-page holds the
// headlines its body has the rows for, whole, as each measures itself.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { BODY_ROWS } from "../frame/frame.ts";
import { COLUMNS, MOST_SUBPAGES } from "../kit.ts";
import { Headline, type HeadlineProps } from "../text/news.ts";
import { framed, partName, type Article, type Framing } from "./document.ts";

export interface Day {
  /** The sub-page's name: "Today", "Yesterday", "Thursday 22 Oct". */
  readonly name: string;
  /** Its articles, a headline each that links to its page. */
  readonly articles: readonly Article[];
}

export interface DayPagesProps extends Framing {
  /**
   * The days, each on as many sub-pages as its headlines need, named by
   * the day. A page has MOST_SUBPAGES sub-pages at most: the headlines and
   * days past them are left out, and are not walked.
   */
  readonly days: readonly Day[];
}

/** The body a headline is laid out in: the frame's, across the page. */
const BODY = { width: COLUMNS, height: BODY_ROWS };

/** An article's headline, linked to its page. */
function headlineProps(article: Article): HeadlineProps {
  return { title: article.title, page: article.page };
}

/** `articles` in sub-pages, each the headlines its body holds whole, to `most` sub-pages; one, empty, for none. */
function subPagesOf(articles: readonly Article[], most: number): Article[][] {
  const parts: Article[][] = [];
  let part: Article[] = [];
  let rows = 0;
  for (const article of articles) {
    const height = new Headline(headlineProps(article)).measure(BODY).height;
    if (rows + height > BODY.height && part.length > 0) {
      parts.push(part);
      if (parts.length >= most) {
        return parts;
      }
      part = [];
      rows = 0;
    }
    part.push(article);
    rows += height;
  }
  parts.push(part);
  return parts;
}

/** Headlines a day at a time, over as many sub-pages as each day needs, each named by its day: "Today", "Yesterday 1/2". */
export class DayPages extends Component<DayPagesProps> {
  override render(): Child {
    const out: Child[] = [];
    for (const [day, { name, articles }] of this.props.days.entries()) {
      if (out.length >= MOST_SUBPAGES) {
        break;
      }
      const parts = subPagesOf(articles, MOST_SUBPAGES - out.length);
      for (const [index, part] of parts.entries()) {
        out.push(
          framed(
            this.props,
            partName(name, index + 1, parts.length),
            `day-${day}-${index}`,
            // One list child, not a spread: a sub-page is given its headlines as one argument, however many there are.
            part.map((article) => h(Headline, { key: article.page, ...headlineProps(article) })),
          ),
        );
      }
    }
    return out;
  }
}
