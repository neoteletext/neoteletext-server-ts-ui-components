// A band drawn inside another band ends back to the outer one's colour, so
// a field in a dialog leaves no black notch; on black it still ends with
// Black Background.

import assert from "node:assert/strict";
import { test } from "node:test";

import { text } from "neoteletext-server-ts-protocol/testing";
import { Columns, Dialog, h, Text, TextField } from "../src/index.ts";
import { Attribute, Colour, textColour } from "../src/kit.ts";
import { BODY_ROW, PAGE, viewer } from "./controls-fixtures.ts";

/** The codes of `row` of what viewer 1 sees. */
const codesOf = (page: ReturnType<typeof viewer>, row: number): number[] =>
  Array.from(text(page.seen(1, PAGE).rows, row), (character) => character.codePointAt(0) ?? 0);

test("a field in a dialog ends its band back to the dialog's blue: no Black Background before the dialog's own edge", () => {
  const page = viewer(h(Dialog, { title: "Your name", buttons: ["OK"], childFirst: true }, h(TextField, { longest: 10, background: Colour.Cyan })));
  const row = codesOf(page, BODY_ROW + 1);
  const dialogEnd = row.lastIndexOf(Attribute.BlackBackground);
  assert.deepEqual(
    row.slice(0, dialogEnd).filter((code) => code === Attribute.BlackBackground),
    [],
    "the dialog's own edge is the row's one Black Background",
  );
  const newBackgrounds = row.flatMap((code, at) => (code === Attribute.NewBackground ? [at] : []));
  const last = newBackgrounds.at(-1) ?? -1;
  assert.equal(row[last - 1], textColour(Colour.Blue), "the field's band ends with the dialog's colour, then New Background");
});

test("a field on black, short of the row's end, still ends its band with Black Background", () => {
  const page = viewer(h(Columns, { widths: [20, null] }, h(TextField, { longest: 10, background: Colour.Cyan }), h(Text, { text: "beside" })));
  assert.ok(codesOf(page, BODY_ROW).includes(Attribute.BlackBackground));
});
