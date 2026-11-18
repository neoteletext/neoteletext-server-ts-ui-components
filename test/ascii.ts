// The codes a page's rows hold under its text: a character's own where it
// is printable ASCII, a space otherwise (the kit's Screen), since the
// server encodes the text over them (DEC-2199). Tests read rows by them.

import type { Harness } from "neoteletext-server-ts-protocol/testing";
import { decodeRow, SPACE, textCells } from "../src/kit.ts";

const FIRST_PRINTABLE = 0x20;
const LAST_PRINTABLE = 0x7e;

/** The codes the rows hold under `text`. */
export function ascii(text: string): number[] {
  return Array.from(text, (character) => {
    const point = character.codePointAt(0) ?? SPACE;
    return point >= FIRST_PRINTABLE && point <= LAST_PRINTABLE ? point : SPACE;
  });
}

/**
 * Row `row` of the copy of `page` `connection` sees, as its codes with the
 * text the server is sent laid over them, a character a cell, left to
 * right: what a test reads of text that is not ASCII.
 */
export function shown(harness: Harness, connection: number, page: number, row: number): string {
  const copy = harness.channel.copy(connection, page) ?? harness.channel.copy("channel", page) ?? [];
  const content = copy.at(-1)?.content;
  const cells = Array.from(decodeRow(content?.rows[row]), (code) => String.fromCodePoint(code));
  for (const run of content?.text ?? []) {
    if (run.row === row) {
      textCells(run.text).forEach((cell, offset) => {
        cells[run.column + offset] = cell;
      });
    }
  }
  return cells.join("");
}
