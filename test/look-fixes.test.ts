// Flaws in how components look, each test written to fail on the code
// before its fix: a rule's dotted and dashed styles that read as each
// other and start a cell late, a select's open list two cells left of its
// field, a field's note in the disabled colour, a table's heading on the
// frame's own band colour, a collapsible's content not under its heading's
// text, sliders that do not line up and lose their colour with the keys,
// and an article's list items a blank line apart.

import assert from "node:assert/strict";
import { test } from "node:test";

import { articleLines, Collapsible, DataTable, Field, Frame, h, LABEL_CELLS, Rule, type RuleStyle, Select, Slider, Text, TextField } from "../src/index.ts";
import { SIXEL } from "../src/core/mosaics.ts";
import { DISABLED, inkOn } from "../src/core/look.ts";
import { Attribute, Colour, Key, mosaicColour, textColour } from "../src/kit.ts";
import { BODY_ROW, harness, PAGE, PROMPTS, viewer } from "./controls-fixtures.ts";
import { row } from "./input-more-fixtures.ts";

/** A mosaic character with no sixel lit. */
const BLANK_MOSAIC = 0x20;

/** The code at `column` of `text`. */
function codeAt(text: string, column: number): number {
  return text.codePointAt(column) ?? 0;
}

/** The character a code is, as a row's text holds it. */
function char(code: number): string {
  return String.fromCodePoint(code);
}

// Rule.

const STYLES: readonly RuleStyle[] = ["thin", "bold", "double", "dotted", "dashed"];

/** Each style's rule on a row of its own, from the frame's first body row. */
function rules(): ReturnType<typeof viewer> {
  return viewer(...STYLES.map((style) => h(Rule, { key: style, style })));
}

/** Viewer 1's row `at` of the page, its codes. */
function codesOf(page: ReturnType<typeof viewer>, at: number): readonly number[] {
  return page.seen(1, PAGE).rows[at] ?? [];
}

/** The first cell of a rule's row that holds lit sixels. */
function lineStart(codes: readonly number[]): number {
  return codes.findIndex((code) => code > BLANK_MOSAIC);
}

/** The middle row of sixels across a rule's line, left then right in each cell, true where lit. */
function middleSixels(codes: readonly number[]): boolean[] {
  return codes.slice(lineStart(codes)).flatMap((code) => [(code & SIXEL.middleLeft) !== 0, (code & SIXEL.middleRight) !== 0]);
}

/** The lengths of the runs of lit and of unlit sixels in `sixels`, the last run dropped: the row's end may cut it. */
function runs(sixels: readonly boolean[]): { readonly lit: number[]; readonly unlit: number[] } {
  const lit: number[] = [];
  const unlit: number[] = [];
  let length = 0;
  sixels.forEach((sixel, index) => {
    length += 1;
    if (sixels[index + 1] !== sixel) {
      (sixel ? lit : unlit).push(length);
      length = 0;
    }
  });
  return { lit, unlit };
}

test("every rule style's line starts in the same column: a dotted one spends no cell on Separated", () => {
  const page = rules();
  const starts = STYLES.map((_, index) => lineStart(codesOf(page, BODY_ROW + index)));
  assert.deepEqual(
    starts,
    STYLES.map(() => 1),
    "each line starts after its mosaic colour's cell",
  );
  assert.ok(!row(page, BODY_ROW + STYLES.indexOf("dotted")).includes(char(Attribute.Separated)), "no Separated cell");
});

test("a dotted rule reads as dots: single sixels apart, on the row's middle", () => {
  const { lit, unlit } = runs(middleSixels(codesOf(rules(), BODY_ROW + STYLES.indexOf("dotted"))));
  assert.ok(lit.length > 1, "more than one dot");
  assert.ok(
    lit.every((length) => length === 1),
    `each dot a sixel: ${lit.join(",")}`,
  );
  assert.ok(
    unlit.every((length) => length >= 1),
    "each dot apart from the next",
  );
});

test("a dashed rule reads as dashes: runs of sixels longer than the gaps between them", () => {
  const { lit, unlit } = runs(middleSixels(codesOf(rules(), BODY_ROW + STYLES.indexOf("dashed"))));
  assert.ok(unlit.length > 0, "gaps between the dashes");
  const shortestDash = Math.min(...lit);
  assert.ok(shortestDash > 1, `each dash more than a sixel: ${lit.join(",")}`);
  assert.ok(
    unlit.every((gap) => gap < shortestDash),
    `each gap shorter than a dash: ${unlit.join(",")} against ${lit.join(",")}`,
  );
});

// Select.

const REGIONS = ["London", "North West", "Scotland", "Wales"];

test("a select's open list lines up with its field: its band and its text start in the field's columns", () => {
  const page = viewer(h(Select, { label: "Region", items: REGIONS, initial: 1 }));
  page.press(1, Key.Enter);
  const field = row(page, BODY_ROW);
  const fieldText = field.indexOf("North West");
  assert.ok(fieldText > LABEL_CELLS, "the field shows the value");
  REGIONS.forEach((region, index) => {
    assert.equal(row(page, BODY_ROW + 1 + index).indexOf(region), fieldText, `${region} starts under the field's text`);
  });
  const newBackground = char(Attribute.NewBackground);
  const chosen = row(page, BODY_ROW + 1 + REGIONS.indexOf("North West"));
  assert.equal(chosen.indexOf(newBackground), field.indexOf(newBackground, LABEL_CELLS), "the chosen item's band starts where the field's does");
});

// Field.

test("a field's note is drawn as help, in cyan, not in the disabled blue", () => {
  const page = viewer(h(Field, { label: "Name", note: "required" }, h(TextField, { longest: 20 })));
  const under = row(page, BODY_ROW + 1);
  const note = under.indexOf("required");
  assert.ok(note > 0, "the note shows under the label");
  assert.equal(codeAt(under, note - 1), textColour(Colour.Cyan), "the note's colour is cyan");
  assert.notEqual(codeAt(under, note - 1), textColour(DISABLED), "and not what cannot be used is drawn in");
});

// DataTable.

const TEAMS = { columns: [{ title: "Team", width: 16 }], rows: [["Arsenal"], ["Chelsea"]], shown: 2 } as const;

/** A table on a page whose frame's title band is `title`. */
function tableUnder(title: Colour, headingBackground?: Colour): ReturnType<typeof viewer> {
  const page = harness([
    {
      page: PAGE,
      title: "Test",
      perViewer: true,
      root: (): ReturnType<typeof h> =>
        h(
          Frame,
          { title: "Test", background: title, prompts: PROMPTS },
          h(DataTable, { ...TEAMS, ...(headingBackground === undefined ? {} : { headingBackground }) }),
        ),
    },
  ]);
  page.join(1, PAGE);
  return page;
}

/** The band colour a row sets in its first cell. */
function bandOf(text: string): number {
  assert.equal(codeAt(text, 1), Attribute.NewBackground, "the row starts a band");
  return codeAt(text, 0);
}

test("a table's heading stands apart from the frame's blue title band directly above it: its band is another colour", () => {
  const page = viewer(h(DataTable, TEAMS));
  const title = bandOf(row(page, BODY_ROW - 1));
  const heading = row(page, BODY_ROW);
  assert.notEqual(bandOf(heading), title, "the heading's band is not the title band's colour");
  const background = Colour.Cyan;
  assert.equal(bandOf(heading), textColour(background), "the heading's band is cyan");
  assert.equal(codeAt(heading, heading.indexOf("Team") - 1), textColour(inkOn(background)), "its titles in the ink that reads on it");
});

test("a page whose title band is cyan gives the table's heading a band of another colour, its titles inked to read on it", () => {
  const page = tableUnder(Colour.Cyan, Colour.Magenta);
  const heading = row(page, BODY_ROW);
  assert.equal(bandOf(heading), textColour(Colour.Magenta));
  assert.notEqual(bandOf(heading), bandOf(row(page, BODY_ROW - 1)));
  assert.equal(codeAt(heading, heading.indexOf("Team") - 1), textColour(inkOn(Colour.Magenta)));
});

// Collapsible.

test("a collapsible section's content is indented under its heading's text", () => {
  const page = viewer(
    h(Collapsible, { titles: ["Opening times", "Prices"], initial: [0] }, h(Text, { text: "Daily 9am to 5pm." }), h(Text, { text: "Adults 8." })),
  );
  const heading = row(page, BODY_ROW).indexOf("- Opening times");
  assert.ok(heading > 0, "the open heading shows");
  assert.equal(row(page, BODY_ROW + 1).indexOf("Daily"), heading, "the content starts under the heading's text");
});

// Slider.

/** Where a slider's track ends on `text`: the value's colour cell, the first white after the label's column. */
function trackEnd(text: string): number {
  return text.indexOf(char(textColour(Colour.White)), LABEL_CELLS);
}

test("sliders of a percentage and of decibels stacked together line up: the value has a column of its own whatever its unit", () => {
  const page = viewer(
    h(Slider, { key: "volume", label: "Volume", min: 0, max: 100, initial: 50, unit: "%" }),
    h(Slider, { key: "treble", label: "Treble", min: -10, max: 10, initial: -2, unit: "dB" }),
    h(Slider, { key: "plain", label: "Plain", min: 0, max: 10, initial: 3 }),
  );
  const ends = [0, 1, 2].map((offset) => trackEnd(row(page, BODY_ROW + offset)));
  assert.ok(
    ends.every((end) => end > LABEL_CELLS),
    "each track is followed by its value",
  );
  assert.deepEqual(
    ends,
    ends.map(() => ends[0]),
    "every track ends in the same column",
  );
});

test("a slider's value column is as wide as its widest value and unit, so the widest shows whole", () => {
  const page = viewer(h(Slider, { label: "Gain", min: -1000, max: 1000, initial: -1000, unit: "dB" }));
  assert.match(row(page, BODY_ROW), /-1000dB/u);
});

test("sliders given the same value column line up whatever their values", () => {
  const valueCells = 8;
  const page = viewer(
    h(Slider, { key: "wide", label: "Gain", min: -1000, max: 1000, initial: 0, unit: "dB", valueCells }),
    h(Slider, { key: "narrow", label: "Pan", min: 0, max: 9, initial: 3, valueCells }),
  );
  assert.equal(trackEnd(row(page, BODY_ROW)), trackEnd(row(page, BODY_ROW + 1)));
});

test("a slider with the keys keeps its own colour: its label marks the focus", () => {
  const page = viewer(h(Slider, { label: "Bass", min: -10, max: 10, initial: 4, foreground: Colour.Green }));
  const text = row(page, BODY_ROW);
  assert.ok(text.startsWith(`${char(textColour(Colour.Yellow))}>Bass`), "the label is marked and yellow");
  assert.equal(codeAt(text, LABEL_CELLS), mosaicColour(Colour.Green), "the track is in its own green");
});

test("a slider without a colour of its own keeps cyan with the keys", () => {
  const text = row(viewer(h(Slider, { label: "Bass", min: -10, max: 10, initial: 4 })), BODY_ROW);
  assert.equal(codeAt(text, LABEL_CELLS), mosaicColour(Colour.Cyan));
});

// articleLines.

/** A page's body across, less the colour cell of each line. */
const ARTICLE_WIDTH = 38;

test("an article's list items follow each other with no blank line, and the list has one after it", () => {
  const lines = articleLines(
    [
      { kind: "paragraph", text: "Before." },
      { kind: "item", text: "One" },
      { kind: "item", text: "Two" },
      { kind: "item", text: "Three" },
      { kind: "paragraph", text: "After." },
    ],
    ARTICLE_WIDTH,
  );
  assert.deepEqual(
    lines.map((line) => line.text),
    ["Before.", "", "* One", "* Two", "* Three", "", "After."],
  );
});

test("an item that wraps keeps its lines together and is followed directly by the next item", () => {
  const width = 12;
  const lines = articleLines(
    [
      { kind: "item", text: "A long item that wraps" },
      { kind: "item", text: "Next" },
    ],
    width,
  );
  assert.deepEqual(
    lines.map((line) => line.text),
    ["* A long", "  item that", "  wraps", "* Next"],
  );
});
