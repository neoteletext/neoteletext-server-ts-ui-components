// Flaws fixed in the input and time parts, each test written to fail on
// the code before its fix: a number's complaint with room to be read, a
// step that cannot be taken, options across a row that do not fit, a
// button's label on its own background, a calendar's month followed and
// normalised, and large digits counted by character and bounded.

import assert from "node:assert/strict";
import { test } from "node:test";

import { BigDigits, Button, Calendar, type Child, Component, CUT_MARK, h, type KeyEvent, LABEL_CELLS, NumberInput, RadioGroup } from "../src/index.ts";
import { Attribute, Colour, Key, textColour } from "../src/kit.ts";
import { BODY_ROW, viewer } from "./controls-fixtures.ts";
import { row, shown } from "./input-more-fixtures.ts";

// NumberInput.

test("a number out of range says its range in full on the row under, as a text field's check does, not cut after the + chip", () => {
  const page = viewer(h(NumberInput, { label: "Tickets", min: 1, max: 8, initial: 2 }));
  page.typeKeys(1, "12");
  assert.ok(!row(page, BODY_ROW).includes("!"), "the chips' row holds the number alone");
  assert.match(row(page, BODY_ROW + 1), /! 1 to 8/u, "the whole range, under the number");
  assert.ok(!row(page, BODY_ROW + 1).includes(CUT_MARK), "nothing of it cut");
});

test("a number input steps by one where its step is no number, nought, below nought or not whole", () => {
  for (const step of [Number.NaN, 0, -2, 1.5]) {
    const values: number[] = [];
    const page = viewer(
      h(NumberInput, {
        label: "Count",
        min: 0,
        max: 10,
        initial: 5,
        step,
        onChange: (value: number) => {
          values.push(value);
        },
      }),
    );
    page.press(1, Key.Up);
    assert.deepEqual(values, [6], `a step of ${step} is taken as one`);
  }
});

// RadioGroup.

/** The options of a radio group too many for one row after its label: 45 cells of a 40-cell row. */
const SIZES = ["Small", "Medium", "Large"];

test("a radio group across a row too narrow for its options wraps them, so every option shows whole, and Left and Right still move the choice", () => {
  const page = viewer(h(RadioGroup, { label: "Size", items: SIZES, across: true, initial: 1 }));
  const text = shown(page);
  for (const option of ["( ) Small", "(*) Medium", "( ) Large"]) {
    assert.ok(text.includes(option), `${option} shows whole`);
  }
  assert.ok(![BODY_ROW, BODY_ROW + 1].some((at) => row(page, at).includes(CUT_MARK)), "no option is cut");
  assert.equal(row(page, BODY_ROW + 1).indexOf("( ) Large"), LABEL_CELLS + 1, "the option wrapped starts under the first, after its colour's cell");
  page.press(1, Key.Right);
  assert.ok(shown(page).includes("(*) Large"), "Right chose the option on the row under");
});

test("a radio group whose options fit across keeps them on its one row", () => {
  const labelCells = 6;
  const page = viewer(h(RadioGroup, { label: "Size", labelCells, items: SIZES, across: true }), h(Button, { label: "Under", onPress: () => {} }));
  assert.match(row(page, BODY_ROW), /\(\*\) Small.*\( \) Medium.*\( \) Large/u);
  assert.match(row(page, BODY_ROW + 1), /Under/u, "what follows is on the next row");
});

// Button.

test("a button's label is inked to read on its background: blue on the light ones, white on the dark, never the background's own colour", () => {
  const backgrounds = [Colour.Cyan, Colour.White, Colour.Yellow, Colour.Green, Colour.Red, Colour.Blue, Colour.Magenta];
  const page = viewer(
    // The first button takes the keys, and is drawn in the look of one that has them: the others show their own.
    h(Button, { key: "first", label: "First", onPress: () => {} }),
    ...backgrounds.map((background) => h(Button, { key: String(background), label: "Go", background, onPress: () => {} })),
  );
  /** The cell before a button's label holds its ink: after its colour and New Background. */
  const inkCell = 2;
  const inks = backgrounds.map((_, index) => row(page, BODY_ROW + 1 + index).codePointAt(inkCell));
  assert.deepEqual(
    inks,
    [Colour.Blue, Colour.Blue, Colour.Blue, Colour.Blue, Colour.White, Colour.White, Colour.White].map((ink) => textColour(ink)),
  );
});

// Calendar.

/** The run of codes that draws `day` in `colour`, steady. */
function dayIn(colour: Colour, day: number): string {
  return `${String.fromCodePoint(textColour(colour), Attribute.Steady)}${String(day).padStart(2, " ")}`;
}

test("a calendar given month 12 shows next January and marks its days, rather than comparing them against a month 12", () => {
  const page = viewer(h(Calendar, { year: 2026, month: 12, marked: [{ year: 2027, month: 0, day: 5 }], today: Date.UTC(2027, 0, 7) }));
  const text = Array.from({ length: 8 }, (_, at) => row(page, BODY_ROW + at)).join("\n");
  assert.match(text, /January 2027/u);
  assert.ok(text.includes(dayIn(Colour.Green, 5)), "the day marked is green");
  assert.ok(text.includes(dayIn(Colour.Yellow, 7)), "today is yellow");
});

/** A page whose month Home turns on: a calendar's props changed by its parent. */
class Months extends Component<object, { readonly month: number }> {
  override state = { month: 9 };

  override onPageKey(event: KeyEvent): boolean {
    if (event.action === "release" || event.key !== Key.Home) {
      return false;
    }
    this.setState({ month: this.state.month + 1 });
    return true;
  }

  override render(): Child {
    return h(Calendar, { year: 2026, month: this.state.month });
  }
}

test("a calendar follows its year and month as its parent changes them", () => {
  const page = viewer(h(Months, {}));
  assert.match(row(page, BODY_ROW), /October 2026/u);
  page.press(1, Key.Home);
  assert.match(row(page, BODY_ROW), /November 2026/u, "the new month's title");
  page.press(1, Key.Home);
  page.press(1, Key.Home);
  assert.match(row(page, BODY_ROW), /January 2027/u, "a month past December is next year's January");
});

// BigDigits.

test("large digits are as wide as their characters, a character from beyond the BMP counted once", () => {
  /** Two characters: one sixel short of 12 across, and the colour's cell. */
  const twoWide = 7;
  assert.equal(new BigDigits({ text: "\u{1F600}1" }).measure({ width: 40, height: 20 }).width, twoWide);
});

test("large digits draw no more of a long text than the row can show, however long it is", () => {
  /** Long enough that reading it all takes seconds; what fits in a row is a handful of characters. */
  const longest = 10_000_000;
  /** Far more than the handful takes, and far less than the whole. */
  const mostMs = 250;
  const digits = new BigDigits({ text: "8".repeat(longest) });
  const started = performance.now();
  const size = digits.measure({ width: 40, height: 20 });
  assert.ok(performance.now() - started < mostMs, "the work is bounded by the row, not by the text");
  assert.equal(size.width, 40);
});
