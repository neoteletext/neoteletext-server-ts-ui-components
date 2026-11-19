// REQ-6774, renderer parity PAR-42, neoteletext-common docs/naplps-raster.md
// RAS-7 and RAS-8: the painter writes every cell, sixel and run of text in
// dots of the teletext raster through the kit's builder, a cell of row r and
// column c being dots 12c to 12c + 11 of lines 20r to 20r + 19, and text at
// one Noto cell a character. test/picture-naplps-cells.test.ts reads what
// the server's renderer then draws.

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { Naplps, type PicturePart } from "../src/kit.ts";
import { FIRST_TEXT_ROW, LAST_TEXT_ROW } from "../src/picture/grid.ts";
import { NaplpsPainter, type RasterBox } from "../src/picture/naplps-painter.ts";

/** A builder that keeps the rectangles the painter writes. */
class Recorder extends Naplps {
  readonly rects: RasterBox[] = [];

  override rect(x: number, y: number, width: number, height: number, options: { filled?: boolean } = {}): this {
    this.rects.push({ x, y, width, height });
    return super.rect(x, y, width, height, options);
  }
}

test("a fill is exactly its cells' dots, the raster's last dot included", () => {
  const builder = new Recorder();
  const painter = new NaplpsPainter(builder);
  // Row 3 is raster lines 60 to 79; columns 0 to 39 are dots 0 to 479.
  painter.fill(3, 0, 40, 1, 1);
  // Rows 5 and 6, columns 10 to 12: lines 100 to 139, dots 120 to 155.
  painter.fill(5, 10, 3, 2, 2);
  // Row 23, the display area's last, is lines 460 to 479.
  painter.fill(23, 39, 1, 1, 3);
  assert.deepEqual(builder.rects, [
    { x: 0, y: 60, width: 480, height: 20 },
    { x: 120, y: 100, width: 36, height: 40 },
    { x: 468, y: 460, width: 12, height: 20 },
  ]);
});

test("a sixel is its own dots and lines, 6 dots by 7, 7 and 6 lines, a separated one leaving its right 2 dots and bottom 2 lines out", () => {
  const builder = new Recorder();
  const painter = new NaplpsPainter(builder);
  // Row 2, column 4 is dots 48 to 59 and lines 40 to 59.
  painter.sixel(2, 4, 1, 1, false, 3);
  painter.sixel(2, 4, 0, 2, true, 3);
  painter.sixel(2, 4, 0, 0, false, 3);
  assert.deepEqual(builder.rects, [
    { x: 54, y: 47, width: 6, height: 7 },
    { x: 48, y: 54, width: 4, height: 4 },
    { x: 48, y: 40, width: 6, height: 7 },
  ]);
});

test("text is the kit's at its cell, after the painter's pen", () => {
  const painted = new Naplps();
  new NaplpsPainter(painted).text(4, 7, "Ab", "fr", true, 2, false);
  assert.deepEqual(painted.parts(), new Naplps().pen(2).text("Ab", { row: 4, column: 7, language: "fr", outside: true }).parts());
});

test("double-height text is the kit's two-row text from its upper row (RAS-8 item 5, DEC-6889)", () => {
  const painted = new Naplps();
  new NaplpsPainter(painted).text(4, 7, "Ab", null, false, 2, true);
  assert.deepEqual(painted.parts(), new Naplps().pen(2).text("Ab", { row: 4, column: 7, rows: 2 }).parts());
});

/**
 * The shared examples of neoteletext-common's docs/picture-examples.jsonl at 92ecc72 (DEC-6857, TODO-6862), as both
 * kits copy them: the renderer's repository draws `naplps-text-page`'s bytes and finds every one of the 920 characters
 * exactly on its Noto cell (RAS-8). The library cannot run the renderer, so it compares its bytes with them.
 */
const SHARED_EXAMPLES = join(import.meta.dirname, "fixtures", "picture-examples.jsonl");
const SHARED_EXAMPLES_SHA256 = "59a543b296a4da4f018d40bc72a9456a391c9725106a5fa1756e15c506138655";
/** RAS-8's page: 40 characters a row, row r and column c the G0 Latin English character of code 0x21 + ((r + c) mod 94). */
const PAGE_COLUMNS = 40;
const FIRST_CODE = 0x21;
const G0_CODES = 94;
/** The G0 Latin English set's characters where they differ from ASCII (EN 300 706 Table 36, English). */
const LATIN_ENGLISH: Readonly<Record<number, string>> = { 0x23: "£", 0x5b: "←", 0x5c: "½", 0x5d: "→", 0x5e: "↑", 0x5f: "#" };
/** SELECT COLOR with one operand, the entry in its top four bits (ANSI X3.110-1983 section 5.3.2.6.2), and TEXT with the kit's fixed-format bytes (section 5.3.2.3). */
const SELECT_COLOR = 0x3e;
const OPERAND = 0x40;
const ENTRY_SHIFT = 2;
const TEXT_OPENING = [0x22, OPERAND, OPERAND] as const;
/** The painter's ink here: nominal white, the pen RESET leaves. */
const WHITE = 7;

/** Row `row` of RAS-8's page. */
function pageRow(row: number): string {
  return Array.from({ length: PAGE_COLUMNS }, (_, column) => {
    const code = FIRST_CODE + ((row + column) % G0_CODES);
    return LATIN_ENGLISH[code] ?? String.fromCodePoint(code);
  }).join("");
}

/** One part of the shared examples, as JSON gives it. */
type SharedPart = { readonly data: string } | { readonly text: string };

/** `parts` as the shared examples write them: bytes in base 64, text as it is. */
function shared(parts: readonly PicturePart[]): SharedPart[] {
  return parts.map((part) => {
    assert.ok(typeof part !== "string", "the builder writes no Latin-1 text");
    return part instanceof Uint8Array ? { data: Buffer.from(part).toString("base64") } : { text: part.text };
  });
}

/** `parts` with the pen selected before each TEXT, as the painter selects its ink before every run. */
function withPen(parts: readonly SharedPart[], entry: number): SharedPart[] {
  return parts.map((part) => {
    if (!("data" in part)) {
      return part;
    }
    const bytes = [...Buffer.from(part.data, "base64")];
    const at = bytes.findIndex((_, index) => TEXT_OPENING.every((byte, offset) => bytes[index + offset] === byte));
    assert.ok(at >= 0, "every data part of the page sets the text field before its row");
    bytes.splice(at, 0, SELECT_COLOR, OPERAND | (entry << ENTRY_SHIFT));
    return { data: Buffer.from(bytes).toString("base64") };
  });
}

/** The parts of the shared example `name` in `text`, the shared examples' file. */
function exampleParts(text: string, name: string): SharedPart[] {
  const example: unknown = text
    .split("\n")
    .filter((line) => line !== "")
    .map((line): unknown => JSON.parse(line))
    .find((line) => typeof line === "object" && line !== null && "example" in line && line.example === name);
  assert.ok(typeof example === "object" && example !== null && "parts" in example && Array.isArray(example.parts));
  const listedParts: unknown[] = example.parts;
  return listedParts.map((part): SharedPart => {
    assert.ok(typeof part === "object" && part !== null, "a part is an object");
    if ("data" in part && typeof part.data === "string") {
      return { data: part.data };
    }
    assert.ok("text" in part && typeof part.text === "string", "a part is data or text");
    return { text: part.text };
  });
}

test("a page of 23 rows of 40 characters written by the painter is the shared example the renderer draws one Noto cell a character (RAS-8)", () => {
  const text = readFileSync(SHARED_EXAMPLES, "utf8");
  assert.equal(createHash("sha256").update(text).digest("hex"), SHARED_EXAMPLES_SHA256, "the shared examples as neoteletext-common 92ecc72 has them");
  const expected = exampleParts(text, "naplps-text-page");

  const builder = new Naplps().reset().clear();
  const painter = new NaplpsPainter(builder);
  for (let row = FIRST_TEXT_ROW; row <= LAST_TEXT_ROW; row += 1) {
    painter.text(row, 0, pageRow(row), null, false, WHITE, false);
  }
  const written = shared(builder.parts());
  assert.equal(written.filter((part) => "text" in part).length, LAST_TEXT_ROW - FIRST_TEXT_ROW + 1, "one run a row");
  assert.deepEqual(written, withPen(expected, WHITE));
});

test("double-height text written by the painter is the shared example naplps-double-height-text (RAS-8 item 5)", () => {
  const [first, ...rest] = exampleParts(readFileSync(SHARED_EXAMPLES, "utf8"), "naplps-double-height-text");
  assert.ok(first !== undefined);
  const builder = new Naplps().reset().clear();
  const painter = new NaplpsPainter(builder);
  painter.text(1, 0, pageRow(0), null, false, WHITE, true);
  painter.text(LAST_TEXT_ROW - 1, PAGE_COLUMNS - "Last".length, "Last", null, false, WHITE, true);
  // The example selects the pen once; the painter selects its ink before every run.
  assert.deepEqual(shared(builder.parts()), [first, ...withPen(rest, WHITE)]);
});
