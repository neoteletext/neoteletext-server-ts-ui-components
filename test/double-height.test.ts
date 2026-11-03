// Double height as a prop of the components that draw text it suits
// (DEC-2222): headings and display text in every language, a row more;
// single height in Thai and Lao, and on rows 22 to 24; never a control's.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Band,
  Button,
  type Child,
  DateText,
  type Element,
  Gap,
  h,
  LinesBlock,
  MetricCard,
  Notice,
  Paragraph,
  Placeholder,
  RichText,
  Rows,
  Text,
} from "../src/index.ts";
import { Attribute, Colour, type LanguageTag } from "../src/kit.ts";
import { BODY_ROW, frame, harness, PAGE } from "./components-fixtures.ts";

const AFTER = "AFTER";

/** The rows of the page with `body` then a line saying AFTER, in `language`. */
function rowsOf(body: Child, language: LanguageTag = "en"): readonly (readonly number[])[] {
  const page = harness([{ page: PAGE, title: "Double", language, root: (): Element => frame("Double", h(Rows, {}, body, h(Text, { text: AFTER }))) }]);
  page.join(1, PAGE);
  assert.deepEqual(page.errors, []);
  return page.seen(1, PAGE).rows;
}

/** The row AFTER is drawn on. */
function afterRow(rows: readonly (readonly number[])[]): number {
  return rows.findIndex((row) => String.fromCodePoint(...row).includes(AFTER));
}

/** Whether `rows` has Double Height between `from` and `to`. */
function doubled(rows: readonly (readonly number[])[], from: number, to: number): boolean {
  return rows.slice(from, to).some((row) => row.includes(Attribute.DoubleHeight));
}

/** Each component given the prop, made with it or without; Placeholder fills the box it is given, so it grows by none. */
const EXAMPLES: readonly (readonly [string, (doubleHeight: boolean) => Child, number?])[] = [
  ["Text", (doubleHeight) => h(Text, { text: "Headline", doubleHeight })],
  ["Paragraph", (doubleHeight) => h(Paragraph, { text: "A paragraph of words", doubleHeight })],
  ["LinesBlock", (doubleHeight) => h(LinesBlock, { lines: [{ foreground: Colour.Yellow, text: "A line" }], doubleHeight })],
  ["RichText", (doubleHeight) => h(RichText, { runs: [{ text: "Rich words", foreground: Colour.Cyan }], doubleHeight })],
  ["Band", (doubleHeight) => h(Band, { text: "TOP STORY", doubleHeight })],
  ["Placeholder", (doubleHeight) => h(Placeholder, { text: "Coming", height: 3, doubleHeight }), 0],
  ["Notice", (doubleHeight) => h(Notice, { kind: "success", text: "Saved", doubleHeight })],
  ["MetricCard", (doubleHeight) => h(MetricCard, { label: "Load", value: 42, unit: "%", doubleHeight })],
  ["DateText", (doubleHeight) => h(DateText, { value: new Date(Date.UTC(2026, 10, 3)), doubleHeight })],
];

for (const [name, example, grows = 1] of EXAMPLES) {
  test(`DEC-2222: ${name} draws in double height when asked, and takes a row more for it`, () => {
    const single = rowsOf(example(false));
    const double = rowsOf(example(true));
    assert.equal(doubled(single, BODY_ROW, afterRow(single)), false, "single height by default, as before");
    assert.equal(doubled(double, BODY_ROW, afterRow(double)), true, "double height when asked");
    assert.equal(afterRow(double), afterRow(single) + grows, "what follows is a row lower");
  });
}

test("DEC-2222 item 2: in Thai a double-height text is single height on the middle of its three rows, with no error", () => {
  const rows = rowsOf(h(Text, { text: "หัวข้อ", doubleHeight: true }), "th");
  const body = 4;
  assert.equal(doubled(rows, body, afterRow(rows)), false);
  assert.equal(afterRow(rows), body + 3 + 1, "its three rows, then AFTER's middle row");
});

test("DEC-2222 item 4: on row 22, whose row below is the hint row, and on rows 23 and 24 a double-height text is single height", () => {
  const rows = rowsOf([h(Gap, { height: 22 - BODY_ROW }), h(Text, { text: "Low", doubleHeight: true, height: 1 })]);
  assert.equal(rows[22]?.includes(Attribute.DoubleHeight), false);
});

test("DEC-2222 item 3: a control takes no double height", () => {
  // @ts-expect-error -- a control has no doubleHeight prop: its pressable cells and the reach grid are one row an item.
  const button = h(Button, { label: "Go", onPress: () => {}, doubleHeight: true });
  assert.equal(button.type, Button);
});
