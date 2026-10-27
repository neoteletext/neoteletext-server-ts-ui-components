// DayPages: split from document.ts; the comments pass writes this file's header.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Headline } from "../text/news.ts";
import { framed, type Article, type Framing } from "./document.ts";

/** A day's headlines: its name and its articles. */
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
        ...day.articles.map((article) => h(Headline, { key: article.page, title: article.title, page: article.page })),
      ),
    );
  }
}
