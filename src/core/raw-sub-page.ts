// RawSubPage: split from page.ts; the comments pass writes this file's header.

import { type Colour } from "../kit.ts";
import { SubPage, type SubPageProps } from "./page.ts";

/** A sub-page given whole as TTI, such as a converted picture's page with its enhancement packets: published as it is, but for its page number and links. */
export interface RawProps extends SubPageProps {
  readonly tti: string;
  /** A name for the sub-page, which the browser lists it by: drawn as a band over rows 1 and 2, as a frame's title band. */
  readonly title?: string;
  readonly background?: Colour;
  readonly foreground?: Colour;
}

export class RawSubPage extends SubPage<RawProps> {}
