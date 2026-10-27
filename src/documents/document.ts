// Document: a document's lines over named sub-pages ("Help 2/4"), and what
// the other pages of several sub-pages (story-pages.ts, day-pages.ts) share.
// Each renders several Frames; the mount publishes them as one page.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Frame, type Prompts } from "../frame/frame.ts";
import { Colour } from "../kit.ts";
import { type Block, type Line, LinesBlock } from "../text/lines.ts";

/** Rows of a document's text under its band. */
export const DOCUMENT_ROWS = 20;

/**
 * `lines` in screens: `first` lines on the first, `rest` on each after.
 * Counts are taken as whole and `rest` as one at least, since a screen of
 * none would never use the lines up.
 */
export function chunks<T>(lines: readonly T[], first: number, rest: number): T[][] {
  const head = Math.max(0, Math.floor(first));
  const each = Math.max(1, Math.floor(rest));
  if (lines.length <= head) {
    return [[...lines]];
  }
  const out: T[][] = [lines.slice(0, head)];
  for (let start = head; start < lines.length; start += each) {
    out.push(lines.slice(start, start + each));
  }
  return out;
}

/** A sub-page's name: `name`, with its place among `count` when there are several. */
export function partName(name: string, place: number, count: number): string {
  return count === 1 ? name : `${name} ${place}/${count}`;
}

export interface Framing {
  readonly background: Colour;
  readonly foreground?: Colour;
  readonly prompts: Prompts;
  readonly index?: number;
}

/** A Frame of `framing`'s colours and prompts, titled, over `body`. */
export function framed(framing: Framing, title: string, key: string, ...body: Child[]): Child {
  const { background, foreground, prompts, index } = framing;
  return h(Frame, { key, title, background, prompts, ...(foreground === undefined ? {} : { foreground }), ...(index === undefined ? {} : { index }) }, ...body);
}

export interface DocumentProps extends Framing {
  readonly title: string;
  readonly lines: readonly Line[];
  /** The most sub-pages it takes; as many as the lines need when absent. */
  readonly maxSubPages?: number;
}

/** Lines over as many sub-pages as they need, each named with its place: "Title 2/3". */
export class Document extends Component<DocumentProps> {
  override render(): Child {
    const parts = chunks(this.props.lines, DOCUMENT_ROWS, DOCUMENT_ROWS).slice(0, this.props.maxSubPages ?? Number.POSITIVE_INFINITY);
    return parts.map((part, index) => framed(this.props, partName(this.props.title, index + 1, parts.length), `part-${index}`, h(LinesBlock, { lines: part })));
  }
}

/** What a channel knows of an article. */
export interface Article {
  readonly page: number;
  readonly title: string;
  readonly writer: string;
  /** Milliseconds since the Unix epoch. */
  readonly date: number;
  readonly summary: string;
  readonly blocks: readonly Block[];
  readonly tags: readonly string[];
  readonly link: string;
}
