// What the tests of the charts of parts, places and sound share: a viewer's
// page of one component, and its rows as codes, as readable text and as a
// receiver shows them.

import type { Harness } from "neoteletext-server-ts-protocol/testing";
import { type Child, type Element, MOSAIC_BASE } from "../src/index.ts";
import { Colour, mosaicColour, SPACE, textColour } from "../src/kit.ts";
import { frame, harness, PAGE } from "./components-fixtures.ts";

/** One viewer's own page of `body`, joined. */
export function viewer(body: Child): Harness {
  const seen = harness([{ page: PAGE, title: "Test", perViewer: true, root: (): Element => frame("Charts", body) }]);
  seen.join(1, PAGE);
  return seen;
}

/** The codes of `row` of the viewer's page. */
export function codesOf(seen: Harness, row: number): readonly number[] {
  return seen.seen(1, PAGE).rows[row] ?? [];
}

/** The colours' names, by their codes (EN 300 706 Table 26). */
const COLOUR_NAMES = ["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"] as const;

/** `codes` as text with each attribute named, "<white>" or "<mosaic red>", so a test can match a row without control characters. */
export function readable(codes: readonly number[]): string {
  return codes
    .map((code) => {
      if (code <= textColour(Colour.White)) {
        return `<${COLOUR_NAMES[code] ?? "?"}>`;
      }
      if (code >= mosaicColour(Colour.Black) && code <= mosaicColour(Colour.White)) {
        return `<mosaic ${COLOUR_NAMES[code - mosaicColour(Colour.Black)] ?? "?"}>`;
      }
      return code < SPACE ? "<attribute>" : String.fromCodePoint(code);
    })
    .join("");
}

/** The row `row` of the viewer's page, readable. */
export function rowText(seen: Harness, row: number): string {
  return readable(codesOf(seen, row));
}

/** What a cell shows, as a receiver draws a row without Hold Mosaics: a mosaic in a colour, or not. */
export interface Shown {
  readonly mosaic: number | null;
  readonly colour: number;
}

/** Each cell of `codes` as it is shown: a colour attribute is a blank cell, and sets the colour and mode after it (EN 300 706 Table 26). */
export function shown(codes: readonly number[]): Shown[] {
  let colour: number = Colour.White;
  let mosaics = false;
  return codes.map((code) => {
    if (code <= textColour(Colour.White)) {
      [colour, mosaics] = [code, false];
      return { mosaic: null, colour };
    }
    if (code >= mosaicColour(Colour.Black) && code <= mosaicColour(Colour.White)) {
      [colour, mosaics] = [code - mosaicColour(Colour.Black), true];
      return { mosaic: null, colour };
    }
    return { mosaic: mosaics && code !== MOSAIC_BASE ? code : null, colour };
  });
}
