// REQ-6774, renderer parity PAR-42: a picture page shows what the same
// components show on a teletext page, its cells read from their codes as a
// Level 1 receiver reads them (EN 300 706 clause 12.2, Table 26), and its
// text kept cell by cell for the text parts.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Attribute, Colour, mosaicColour, textColour } from "../src/kit.ts";
import { shownCells } from "../src/picture/cells.ts";
import { RecordingScreen } from "../src/picture/recording-screen.ts";

test("a background is set at New Background from the colour before it, and ended by Black Background", () => {
  const screen = new RecordingScreen();
  screen.codes(3, 0, [textColour(Colour.Red), Attribute.NewBackground, textColour(Colour.White)]);
  screen.text(3, 3, "Hi");
  screen.code(3, 5, Attribute.BlackBackground);
  const row = shownCells(screen)[3] ?? [];
  assert.deepEqual(
    row.slice(0, 7).map((cell) => [cell.background, cell.foreground, cell.content.kind]),
    [
      [Colour.Black, Colour.White, "space"],
      [Colour.Red, Colour.Red, "space"],
      [Colour.Red, Colour.Red, "space"],
      [Colour.Red, Colour.White, "text"],
      [Colour.Red, Colour.White, "text"],
      [Colour.Black, Colour.White, "space"],
      [Colour.Black, Colour.White, "space"],
    ],
  );
});

test("mosaics show their sixels, separated after Separated, and a held mosaic in an attribute's cell", () => {
  const screen = new RecordingScreen();
  // Table 47: 0x7F is every sixel, 0x21 the top left alone.
  screen.codes(5, 0, [mosaicColour(Colour.Green), 0x21, Attribute.HoldMosaics, Attribute.Separated, 0x7f, Attribute.ReleaseMosaics, 0x41]);
  const row = shownCells(screen)[5] ?? [];
  assert.deepEqual(
    row.slice(0, 7).map((cell) => cell.content),
    [
      { kind: "space" },
      { kind: "mosaic", sixels: 0b000001, separated: false },
      { kind: "mosaic", sixels: 0b000001, separated: false },
      { kind: "mosaic", sixels: 0b000001, separated: false },
      { kind: "mosaic", sixels: 0b111111, separated: true },
      { kind: "mosaic", sixels: 0b111111, separated: true },
      { kind: "text", written: { text: "A", run: -(5 * 40 + 6 + 1), language: null, outside: false, rightToLeft: false } },
    ],
  );
});

test("double height covers the row below, which shows the row above's background and nothing of its own", () => {
  const screen = new RecordingScreen();
  screen.codes(4, 0, [textColour(Colour.Blue), Attribute.NewBackground, Attribute.DoubleHeight]);
  screen.text(4, 3, "Big");
  screen.text(5, 3, "hidden");
  const cells = shownCells(screen);
  assert.equal(cells[4]?.[3]?.doubleHeight, true);
  assert.equal(cells[4]?.[3]?.tall, true);
  assert.equal(cells[5]?.[3]?.covered, true);
  assert.equal(cells[5]?.[3]?.content.kind, "space");
  assert.equal(cells[5]?.[3]?.background, Colour.Blue);
});

test("concealed text shows a space, since a picture has no reveal", () => {
  const screen = new RecordingScreen();
  screen.code(6, 0, Attribute.Conceal);
  screen.text(6, 1, "secret");
  assert.ok((shownCells(screen)[6] ?? []).every((cell) => cell.content.kind === "space"));
});

test("text written over is gone from the cells it covered, and a right-to-left run is gone whole", () => {
  const screen = new RecordingScreen();
  screen.text(7, 0, "Hello");
  screen.code(7, 1, textColour(Colour.Yellow));
  screen.text(8, 0, "שלום", "he");
  screen.code(8, 3, textColour(Colour.Yellow));
  assert.deepEqual(
    [0, 1, 2].map((column) => screen.written(7, column)?.text ?? null),
    ["H", null, "l"],
  );
  assert.deepEqual(
    [0, 1, 2, 3].map((column) => screen.written(8, column)),
    [null, null, null, null],
  );
});
