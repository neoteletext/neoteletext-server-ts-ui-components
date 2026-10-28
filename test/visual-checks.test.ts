// The catalogue's cell checks (catalogue/checks.ts) find what they say
// they find, and pass what they should pass.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Attribute, Colour, mosaicColour, textColour } from "../src/kit.ts";
import { contrast, gapFindings, gateFindings } from "./catalogue/checks.ts";

const row = (...codes: (number | string)[]): string => codes.map((code) => (typeof code === "number" ? String.fromCodePoint(code) : code)).join("");

test("contrast runs from 1 for one colour to 21 for black and white", () => {
  assert.equal(contrast(Colour.Red, Colour.Red), 1);
  assert.ok(Math.abs(contrast(Colour.White, Colour.Black) - 21) < 0.01);
});

test("text in its background's colour is unseen; yellow on white is too close to read; blue on black is not", () => {
  const unseen = row(textColour(Colour.Cyan), Attribute.NewBackground, "hi");
  assert.match(gateFindings([unseen], false, false)[0]?.what ?? "", /cyan on cyan: unseen/u);
  const close = row(textColour(Colour.White), Attribute.NewBackground, textColour(Colour.Yellow), "hi");
  assert.match(gateFindings([close], false, false)[0]?.what ?? "", /yellow on white: too close/u);
  assert.deepEqual(gateFindings([row(textColour(Colour.Blue), "dim")], false, false), []);
  assert.deepEqual(gateFindings([close], false, true), [], "allowed when the example says why");
});

test("the cut mark is found, an ellipsis is not", () => {
  assert.match(gateFindings(["A long title.."], false, false)[0]?.what ?? "", /cut short/u);
  assert.deepEqual(gateFindings(["Getting it ready..."], false, false), []);
});

test("an attribute between two mosaics, and black in a band, are gaps for the review", () => {
  const notch = row(mosaicColour(Colour.Red), 0x7f, mosaicColour(Colour.Green), 0x7f);
  assert.match(gapFindings([notch])[0]?.what ?? "", /space in a run of mosaics/u);
  const hole = row(textColour(Colour.Cyan), Attribute.NewBackground, "a", Attribute.BlackBackground, textColour(Colour.Cyan), Attribute.NewBackground, "b");
  assert.ok(gapFindings([hole]).some((finding) => /black in a cyan band/u.test(finding.what)));
});
