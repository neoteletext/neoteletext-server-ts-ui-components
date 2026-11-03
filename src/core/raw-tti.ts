// A sub-page given whole as TTI (page.ts's RawSubPage), such as a converted
// picture's page with its enhancement packets, made this page's content:
// read as the kit reads TTI, its links the sub-page's when it gives them,
// and rows 1 and 2 a named band when it has a title, the band's title text
// for the server to encode in `language`. What it holds otherwise passes
// through; the protocol checks the whole publication as the server will.

import { type Colour, COLUMNS, type FastextLinks, type LanguageTag, readTtiPages, Screen, type SubPageContent } from "../kit.ts";
import { fit } from "./text.ts";

/** A band of rows 1 and 2 naming the sub-page, as a frame's title band. */
export interface RawBand {
  readonly title: string;
  readonly background: Colour;
  readonly foreground: Colour;
}

/** The two rows of a band, and the cells its double-height title leaves for the text. */
const BAND_ROWS = [1, 2] as const;
const TITLE_CELLS = COLUMNS - 5;
/** A PN line the sub-page is read under: its number is the page's, given when it is published. */
const ANY_PAGE_LINE = "PN,10000";

/** The content of `text`'s first sub-page, with `fastext` for its links when any is given and `band` over rows 1 and 2. */
export function rawContent(text: string, fastext: FastextLinks, band: RawBand | null, language: LanguageTag): SubPageContent {
  // One sub-page, whatever page and sub-code its own lines name: the server numbers a page's sub-pages by place.
  const body = text
    .replaceAll("\r", "")
    .split("\n")
    .filter((line) => !/^(PN|SC),/u.test(line));
  const read = readTtiPages([ANY_PAGE_LINE, ...body].join("\n"))[0]?.content ?? new Screen().content();
  const screen = new Screen();
  screen.fastext(fastext);
  const linked = fastext.some((link) => link !== null);
  const links = linked ? { links: screen.content().links, display_row_24: true } : {};
  if (band === null) {
    return { ...read, ...links };
  }
  screen.background(1, 0, band.background);
  screen.doubleHeight(1, 2, band.foreground, fit(band.title, TITLE_CELLS), language);
  screen.background(2, 0, band.background);
  const drawn = screen.content();
  const rows = read.rows.map((row, at) => (BAND_ROWS.some((bandRow) => bandRow === at) ? (drawn.rows[at] ?? null) : row));
  // The band's title names its language: the page keeps the sets its own TTI gave it.
  return { ...read, ...links, rows, text: drawn.text ?? [] };
}
