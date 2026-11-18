// DEC-6599 and REQ-6539 item 9 (rdm TODO-6674): a sub-page is a page, so
// each has its own keyboard focus, its own focus history and its own key
// routing. A key, typed text or Tab on one sub-page never reaches the
// components of another sub-page of the same page number.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness, text } from "neoteletext-server-ts-protocol/testing";
import { type Child, Component, ComponentChannel, type Element, Frame, h, type KeyEvent, TextField } from "../src/index.ts";
import { Colour } from "../src/kit.ts";
import { BODY_ROW, PAGE } from "./mouse-fixtures.ts";

const FIRST_SUB_PAGE = 0x0001;

const SECOND_SUB_PAGE = 0x0002;

const NO_PROMPTS = [
  ["", null],
  ["", null],
  ["", null],
  ["", null],
] as const;

/** The page keys each sub-page's listener heard, by the sub-page's name. */
const heard: string[] = [];

/** Hears every page key of the sub-page it is drawn on, and takes none. */
class Listener extends Component<{ readonly name: string }> {
  override render(): Child {
    return [];
  }

  override onPageKey(event: KeyEvent): boolean {
    heard.push(`${this.props.name} ${event.key} ${event.action}`);
    return false;
  }
}

/** A page of two sub-pages, each a field to type in and a listener of its page keys. */
class TwoFields extends Component {
  override render(): Child {
    return ["first", "second"].map((name) =>
      h(Frame, { key: name, title: name, background: Colour.Blue, prompts: NO_PROMPTS }, h(TextField, { label: "Name", longest: 10 }), h(Listener, { name })),
    );
  }
}

function harness(): Harness {
  heard.length = 0;
  return new Harness([new ComponentChannel([{ page: PAGE, title: "Two", root: (): Element => h(TwoFields, {}) }], { opus: fakeOpus() })]);
}

/** Types `typed` on the connection's sub-page, a key's press and release a character, as its table asks for them. */
function typeOn(page: Harness, typed: string): void {
  for (const character of typed) {
    page.fire(1, "keys", { kind: "key", action: "press", key: character, mods: 0, text: character });
    page.fire(1, "keys_up", { kind: "key", action: "release", key: character, mods: 0 });
  }
}

/** The field's row of sub-page `place` (0 the first) of the copy the connection sees. */
function fieldRow(page: Harness, place: number): string {
  const pages = page.ownPages(1, PAGE) ?? page.sharedPages(PAGE);
  const shown = pages[place];
  assert.ok(shown !== undefined, `sub-page ${place + 1} is published`);
  return text(shown.rows, BODY_ROW);
}

test("TODO-6674: two sub-pages each holding a text field type into their own field alone", () => {
  const page = harness();
  page.join(1, PAGE);
  page.open(1, PAGE, SECOND_SUB_PAGE);
  typeOn(page, "ab");
  assert.match(fieldRow(page, 1), /Name.*ab/u, "the second sub-page's field has the keys of its own sub-page");
  assert.doesNotMatch(fieldRow(page, 0), /ab/u, "the first sub-page's field typed nothing");
  page.open(1, PAGE, FIRST_SUB_PAGE);
  typeOn(page, "xy");
  assert.match(fieldRow(page, 0), /Name.*xy/u);
  assert.match(fieldRow(page, 1), /Name.*ab/u);
  assert.doesNotMatch(fieldRow(page, 1), /xy/u, "what was typed on the first never reached the second");
});

test("TODO-6674: a page key on one sub-page is offered to that sub-page's components alone", () => {
  const page = harness();
  page.join(1, PAGE);
  page.open(1, PAGE, SECOND_SUB_PAGE);
  page.fire(1, "keys", { kind: "key", action: "press", key: "F5", mods: 0 });
  page.open(1, PAGE, FIRST_SUB_PAGE);
  page.fire(1, "keys", { kind: "key", action: "press", key: "F6", mods: 0 });
  assert.deepEqual(heard, ["second F5 press", "first F6 press"]);
});
