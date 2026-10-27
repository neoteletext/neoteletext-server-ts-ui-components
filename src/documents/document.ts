// Pages of several sub-pages: a document's lines over named sub-pages
// ("Help 2/4"), an article's home (its text, its picture, its links with a
// QR code, and where else it appears), and headlines a sub-page a day. Each
// renders several Frames; the mount publishes them as one page.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { Frame, type Prompts } from "../frame/frame.ts";
import { Colour } from "../kit.ts";
import { type Block, type Line, LinesBlock } from "../text/lines.ts";

/** Rows of a document's text under its band. */
export const DOCUMENT_ROWS = 20;

/** `lines` in screens: `first` lines on the first, `rest` on each after. */
export function chunks<T>(lines: readonly T[], first: number, rest: number): T[][] {
  if (lines.length <= first) {
    return [[...lines]];
  }
  const out: T[][] = [lines.slice(0, first)];
  for (let start = first; start < lines.length; start += rest) {
    out.push(lines.slice(start, start + rest));
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

export function framed(framing: Framing, title: string, key: string, ...body: Child[]): Child {
  const { background, foreground, prompts, index } = framing;
  return h(Frame, { key, title, background, prompts, ...(foreground === undefined ? {} : { foreground }), ...(index === undefined ? {} : { index }) }, ...body);
}

export interface DocumentProps extends Framing {
  readonly title: string;
  readonly lines: readonly Line[];
  /** The most sub-pages it takes. */
  readonly maxSubPages?: number;
}

/** Lines over as many sub-pages as they need, each named with its place: "Title 2/3". */
export class Document extends Component<DocumentProps> {
  override render(): Child {
    const parts = chunks(this.props.lines, DOCUMENT_ROWS, DOCUMENT_ROWS).slice(0, this.props.maxSubPages ?? Number.POSITIVE_INFINITY);
    return parts.map((part, index) => framed(this.props, partName(this.props.title, index + 1, parts.length), `part-${index}`, h(LinesBlock, { lines: part })));
  }
}

/** What the kitchensink knows of an article (content.ts). */
export interface Article {
  readonly page: number;
  readonly title: string;
  readonly writer: string;
  readonly date: number;
  readonly summary: string;
  readonly blocks: readonly Block[];
  readonly tags: readonly string[];
  readonly link: string;
}
