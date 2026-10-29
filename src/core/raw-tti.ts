// A sub-page given whole as TTI (page.ts's RawSubPage), such as a converted
// picture's page with its enhancement packets, made this page's: its PN and
// SC lines replaced by this page's PN line (the server numbers a page's
// sub-pages by place), its FL line too when the sub-page gives links, and rows
// 1 and 2 a named band when it has a title. What it holds otherwise passes
// through; the protocol checks the whole publication (its publishTti) as
// the server will.

import { type Colour, COLUMNS, type FastextLinks, Screen, tti as subpagesTti } from "../kit.ts";
import { fit } from "./text.ts";

/** A band of rows 1 and 2 naming the sub-page, as a frame's title band. */
export interface RawBand {
  readonly title: string;
  readonly background: Colour;
  readonly foreground: Colour;
}

/** The two rows of a band, and the cells its double-height title leaves for the text. */
const BAND_ROWS = /^OL,(1|2),/u;
const TITLE_CELLS = COLUMNS - 5;

export function rawTti(text: string, page: number, fastext: FastextLinks, band: RawBand | null): string {
  const linked = fastext.some((link) => link !== null);
  const banded = (line: string): boolean => band !== null && BAND_ROWS.test(line);
  const body = text
    .replaceAll("\r", "")
    .split("\n")
    .filter((line) => line !== "" && !/^(PN|SC|DE|CT),/u.test(line) && !(linked && line.startsWith("FL,")) && !banded(line));
  if (band !== null) {
    const screen = new Screen();
    screen.background(1, 0, band.background);
    screen.doubleHeight(1, 2, band.foreground, fit(band.title, TITLE_CELLS));
    screen.background(2, 0, band.background);
    const rows = subpagesTti(page, [{ screen }])
      .split("\n")
      .filter((line) => BAND_ROWS.test(line));
    body.unshift(...rows);
  }
  const screen = new Screen();
  if (linked) {
    screen.fastext(fastext);
  }
  const ours = subpagesTti(page, [{ screen }]).split("\n");
  const head = ours.filter((line) => line.startsWith("PN,") || line.startsWith("SC,"));
  const links = ours.filter((line) => line.startsWith("FL,"));
  return `${[...head, ...body, ...links].join("\n")}\n`;
}
