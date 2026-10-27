// Snapshots: a page's 25 rows of 40 cells, every cell one character, kept
// in test/snapshots/ and compared exactly, so any change to what a page
// shows is seen in review. Attribute cells, which teletext shows as
// spaces, are written as letters saying what they set (LEGEND); a test run
// with UPDATE_SNAPSHOTS=1 writes the snapshots instead of comparing them.
// A missing snapshot fails: one is written only when asked for.

import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { text } from "neottx-server-ts-protocol/testing";
import { ROWS } from "../src/kit.ts";

/** A page's rows, as the harness answers them. */
type Rows = Parameters<typeof text>[0];

const DIRECTORY = join(import.meta.dirname, "snapshots");

/** Spacing attributes as letters (EN 300 706 Table 26): alphanumeric colours lower case, mosaic colours upper case, black k. */
const ATTRIBUTES: Readonly<Record<number, string>> = {
  0x00: "k",
  0x01: "r",
  0x02: "g",
  0x03: "y",
  0x04: "b",
  0x05: "m",
  0x06: "c",
  0x07: "w",
  0x08: "F",
  0x09: "S",
  0x0c: "n",
  0x0d: "D",
  0x0e: "E",
  0x0f: "Z",
  0x10: "K",
  0x11: "R",
  0x12: "G",
  0x13: "Y",
  0x14: "B",
  0x15: "M",
  0x16: "C",
  0x17: "W",
  0x18: "?",
  0x19: "|",
  0x1a: ":",
  0x1c: "_",
  0x1d: "N",
  0x1e: "H",
  0x1f: "L",
};

/** The last code that is an attribute, not a character. */
const LAST_ATTRIBUTE = 0x1f;
/** The solid block (0x7F), which a text file would hold as a control character: a mark outside the codes, all of which are characters of the page. */
const SOLID = 0x7f;
const SOLID_MARK = "█";
/** What a cell with an attribute this legend does not name shows. */
const OTHER = "~";

const LEGEND = [
  "# Each cell one character. Attributes: k r g y b m c w alphanumeric black red green yellow blue magenta cyan white;",
  "# K R G Y B M C W mosaic colours; F flash S steady n normal size D double height E double width Z double size;",
  "# ? conceal | contiguous : separated _ black background N new background H hold L release; ~ another; █ the solid block, 0x7F.",
].join("\n");

/** `rows` as a snapshot's lines: every cell one character. */
function cellsOf(rows: Rows): string {
  return Array.from({ length: ROWS }, (_, row) => text(rows, row))
    .map((row) =>
      Array.from(row, (character) => {
        const code = character.codePointAt(0) ?? 0;
        if (code === SOLID) {
          return SOLID_MARK;
        }
        return code <= LAST_ATTRIBUTE ? (ATTRIBUTES[code] ?? OTHER) : character;
      }).join(""),
    )
    .join("\n");
}

/** Asserts `rows` are the snapshot `name`, or writes them as it when UPDATE_SNAPSHOTS=1. */
export function matchesSnapshot(name: string, rows: Rows): void {
  const file = join(DIRECTORY, `${name}.txt`);
  const shown = `${LEGEND}\n${cellsOf(rows)}\n`;
  if (process.env["UPDATE_SNAPSHOTS"] === "1") {
    writeFileSync(file, shown);
    return;
  }
  assert.ok(existsSync(file), `no snapshot ${name}: run the tests with UPDATE_SNAPSHOTS=1 to write it, then review it`);
  assert.equal(shown, readFileSync(file, "utf8"), `the page differs from the snapshot ${name}`);
}
