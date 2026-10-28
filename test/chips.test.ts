// Chips: a text on a band of its own colour. A band ends at its Black
// Background, whose own cell is already black (EN 300 706 Table 26:
// set-at), so a chip keeps a cell of band after its text, as its ink's
// cell gives it one before, and the text never runs into the band's end.
// Its control is the whole band, the space after the text too.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Badges, type Canvas, Checkbox, CHIP_CELLS, Component, type Element, h, NumberInput, type Size } from "../src/index.ts";
import { Attribute, Colour, englishCodes, textColour } from "../src/kit.ts";
import { PAGE, BODY_ROW, frame, controlsOf, inOrder, harness } from "./controls-fixtures.ts";

/** A space: the cell of band after a chip's text. */
const SPACE = englishCodes(" ")[0];
/** A band's cells before its text: New Background and the ink. */
const CELLS_BEFORE_TEXT = 2;

/** A chip's codes: its band's colour, New Background, its ink, its text, a space of band, Black Background. */
function chipCodes(background: Colour, foreground: Colour, text: string): number[] {
  return [textColour(background), Attribute.NewBackground, textColour(foreground), ...englishCodes(text), SPACE, Attribute.BlackBackground].flatMap((code) =>
    code === undefined ? [] : [code],
  );
}

/** One chip, from the box's first cell, as a control. */
class OneChip extends Component<{ readonly text: string; readonly after: number[] }> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(1, space.height) };
  }

  override paint(canvas: Canvas): void {
    const after = canvas.chip(0, 0, Colour.Red, Colour.White, this.props.text);
    canvas.chipControl(0, 0, after);
    this.props.after.push(canvas.box.column + after);
  }
}

function page(...body: Element[]): ReturnType<typeof harness> {
  const seen = harness([{ page: PAGE, title: "Test", root: (): Element => frame("Chips", ...body) }]);
  seen.join(1, PAGE);
  return seen;
}

/** The cells of the band that starts at the first New Background from `from` on `row`, up to its Black Background. */
function bandOf(row: readonly number[], from = 0): { readonly start: number; readonly cells: readonly number[] } {
  const start = row.indexOf(Attribute.NewBackground, from);
  const end = row.indexOf(Attribute.BlackBackground, start);
  assert.ok(start >= 0 && end > start, "a band, ended");
  return { start, cells: row.slice(start, end) };
}

test("a chip has a cell of band after its text, and answers the column after its Black Background, CHIP_CELLS past the text", () => {
  const after: number[] = [];
  const seen = page(h(OneChip, { text: "LIVE", after }));
  const row = seen.seen(1, PAGE).rows[BODY_ROW] ?? [];
  const column = row.indexOf(textColour(Colour.Red));
  const expected = chipCodes(Colour.Red, Colour.White, "LIVE");
  assert.deepEqual(row.slice(column, column + expected.length), expected);
  assert.equal(expected.length, "LIVE".length + CHIP_CELLS, "CHIP_CELLS counts every cell but the text's");
  assert.deepEqual(after, [column + expected.length]);
  const [control] = inOrder(controlsOf(seen, PAGE));
  assert.deepEqual(
    control,
    { row: BODY_ROW, column: column + 1, width: CELLS_BEFORE_TEXT + "LIVE".length + 1, height: 1 },
    "the whole band, the space after the text too",
  );
});

test("a badge is a balanced chip, and one that can be pressed is a control over its whole band", () => {
  const seen = page(
    h(Badges, {
      badges: [
        { text: "LIVE", onPress: (): void => {} },
        { text: "BETA", background: Colour.Magenta, onPress: (): void => {} },
      ],
      text: "Rovers",
    }),
  );
  const row = seen.seen(1, PAGE).rows[BODY_ROW] ?? [];
  const live = chipCodes(Colour.Red, Colour.White, "LIVE");
  const column = row.indexOf(textColour(Colour.Red));
  assert.deepEqual(row.slice(column, column + live.length), live);
  const beta = chipCodes(Colour.Magenta, Colour.White, "BETA");
  assert.deepEqual(row.slice(column + live.length, column + live.length + beta.length), beta, "the next badge after the first's Black Background");
  const [first, second] = inOrder(controlsOf(seen, PAGE));
  const band = CELLS_BEFORE_TEXT + "LIVE".length + 1;
  assert.deepEqual(first, { row: BODY_ROW, column: column + 1, width: band, height: 1 });
  assert.deepEqual(second, { row: BODY_ROW, column: column + live.length + 1, width: band, height: 1 });
});

test("a check box is a box with its mark in the middle: as much band after the mark as before it", () => {
  const seen = page(h(Checkbox, { label: "News", initial: true }), h(Checkbox, { label: "Sport", initial: "mixed" }));
  const rows = seen.seen(1, PAGE).rows;
  for (const [offset, mark] of [
    [0, "x"],
    [1, "-"],
  ] as const) {
    const band = bandOf(rows[BODY_ROW + offset] ?? []);
    const at = band.cells.indexOf(englishCodes(mark)[0] ?? -1);
    assert.deepEqual(band.cells.slice(0, CELLS_BEFORE_TEXT), [Attribute.NewBackground, textColour(Colour.Blue)], "white, the mark in blue");
    assert.equal(at, CELLS_BEFORE_TEXT, "the mark after the band's first cells");
    assert.equal(band.cells.length - 1 - at, at, `${mark}: the same band either side of the mark`);
  }
});

test("a number input's - and + are each in the middle of their chip, and each chip's control is its whole band", () => {
  const seen = page(h(NumberInput, { label: "Tickets", min: 0, max: 9, initial: 3 }));
  const row = seen.seen(1, PAGE).rows[BODY_ROW] ?? [];
  const minus = bandOf(row);
  const plus = bandOf(row, minus.start + minus.cells.length);
  const [minusControl, plusControl] = inOrder(controlsOf(seen, PAGE).filter((control) => control.row === BODY_ROW));
  for (const [band, sign, control] of [
    [minus, "-", minusControl],
    [plus, "+", plusControl],
  ] as const) {
    const at = band.cells.indexOf(englishCodes(sign)[0] ?? -1);
    assert.equal(band.cells.length - 1 - at, at, `${sign}: the same band either side`);
    assert.deepEqual(control, { row: BODY_ROW, column: band.start, width: band.cells.length, height: 1 }, `${sign}: the whole band`);
  }
});
