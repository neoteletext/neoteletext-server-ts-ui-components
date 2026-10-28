// RawSubPage: split from page.ts; the comments pass writes this file's header.

import { type Colour } from "../kit.ts";
import { SubPage, type SubPageProps } from "./page.ts";

/** A sub-page given whole as TTI, such as a converted picture's page with its enhancement packets: published as it is, but for its page number and links. */
export interface RawProps extends SubPageProps {
  /** The sub-page's TTI: its PN, SC, DE and CT lines give way to the page's own, and its FL line to the sub-page's links when it has any. */
  readonly tti: string;
  /** A name for the sub-page, which the browser lists it by: drawn as a band over rows 1 and 2, as a frame's title band. */
  readonly title?: string;
  /** The title band's colour, blue when absent; unused without a title. */
  readonly background?: Colour;
  /** The title's colour, white when absent; unused without a title. */
  readonly foreground?: Colour;
}

export class RawSubPage extends SubPage<RawProps> {}
