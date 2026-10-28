// What a viewer types, pastes and presses, and what a program passes in
// props, is untrusted: the text fields, buttons and polls bound it before
// they store or draw it.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness, text } from "neoteletext-server-ts-protocol/testing";
import { BODY_ROW, Button, type Child, ComponentChannel, type Element, Frame, h, Poll, Tally, TextField } from "../src/index.ts";
import { Colour, Key } from "../src/kit.ts";

const PAGE = 0x150;
const PROMPTS = [
  ["Index", 0x100],
  ["", null],
  ["", null],
  ["", null],
] as const;

/** One viewer's page of `body`, every component its own. */
function viewer(...body: Child[]): Harness {
  const seen = new Harness([
    new ComponentChannel(
      [{ page: PAGE, title: "Test", perViewer: true, root: (): Element => h(Frame, { title: "Test", background: Colour.Blue, prompts: PROMPTS }, ...body) }],
      { opus: fakeOpus() },
    ),
  ]);
  seen.join(1, PAGE);
  return seen;
}

test("a text field keeps no control character typed or pasted (INPUT.md section 5.3)", () => {
  const typed: string[] = [];
  const page = viewer(
    h(TextField, {
      longest: 20,
      autoFocus: true,
      onChange: (value: string) => {
        typed.push(value);
      },
    }),
  );
  page.paste(1, "ab\ncd\u0007e\u001B[2J");
  page.typeText(1, "\r\u0000f");
  assert.deepEqual(typed, ["abcde[2J", "abcde[2Jf"]);
});

test("a text field cuts what is typed to its longest in whole characters, never half a surrogate pair", () => {
  const typed: string[] = [];
  const page = viewer(
    h(TextField, {
      longest: 2,
      autoFocus: true,
      onChange: (value: string) => {
        typed.push(value);
      },
    }),
  );
  page.typeText(1, "a\u{1F600}b");
  assert.deepEqual(typed, ["a\u{1F600}"]);
});

test("a button given a huge padding draws its band cut to its width rather than allocating the padding", () => {
  const page = viewer(h(Button, { label: "Go", paddingLeft: 1e9, onPress: () => {} }));
  const row = text(page.seen(1, PAGE).rows, BODY_ROW);
  assert.match(row, /\.\.\s*$/u, "the label's place cut with the mark");
});

test("a tally counts no vote for a place that is no option's", () => {
  const tally = new Tally("best", ["Red", "Green"]);
  for (const place of [2, 1e9, -1, 0.5, Number.NaN]) {
    tally.move(null, place);
  }
  assert.deepEqual(tally.votes, [0, 0]);
  tally.move(null, 1);
  assert.deepEqual(tally.votes, [0, 1]);
});

test("a poll with no options takes no vote and no step", () => {
  const tally = new Tally("empty", []);
  const page = viewer(h(Poll, { tally, autoFocus: true }));
  page.press(1, Key.Down);
  page.press(1, Key.Enter);
  assert.deepEqual(tally.votes, []);
});
