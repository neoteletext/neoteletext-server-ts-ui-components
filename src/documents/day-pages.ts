// DayPages: headlines over sub-pages, one for each day.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Headline } from "../text/news.ts";
import { framed, type Article, type Framing } from "./document.ts";

export interface Day {
  readonly name: string;
  readonly articles: readonly Article[];
}

export interface DayPagesProps extends Framing {
  readonly days: readonly Day[];
}

/** Headlines a sub-page a day, each sub-page named by its day: "Today", "Yesterday", "Thursday 22 Oct". */
export class DayPages extends Component<DayPagesProps> {
  override render(): Child {
    return this.props.days.map((day, index) =>
      framed(
        this.props,
        day.name,
        `day-${index}`,
        // One list child, not a spread: a feed's day of a few hundred thousand articles would overflow the stack as arguments.
        day.articles.map((article) => h(Headline, { key: article.page, title: article.title, page: article.page })),
      ),
    );
  }
}
