// REQ-6539, page-rules.md RULE-54 item 9 and RULE-112: a sub-page is a
// page (DEC-6599). Each sub-page's table is written from its own
// components and cells, and sent for its own sub-code at each selection of
// it; an input is found on the cells of the sub-page it came from.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness, text } from "neoteletext-server-ts-protocol/testing";
import { Button, type Child, Component, ComponentChannel, type Element, Frame, h, Text, TextField } from "../src/index.ts";
import { Colour } from "../src/kit.ts";
import { BODY_ROW, PAGE } from "./mouse-fixtures.ts";
import { FASTEXT_KEYS, HOVER, KEYS, press, rowsRect, rulesSent, table, TEXT } from "./page-rules-fixtures.ts";

/** The sub-codes the kit gives a page of two sub-pages given whole, numbered by place (its README: 2 to 79 are 0001 to 0079). */
const FIRST_SUB_PAGE = 0x0001;

const SECOND_SUB_PAGE = 0x0002;

const NO_PROMPTS = [
  ["", null],
  ["", null],
  ["", null],
  ["", null],
] as const;

/** A page of two sub-pages: a page of text, then a field to type in. */
class TextThenField extends Component {
  override render(): Child {
    return [
      h(Frame, { key: "text", title: "Words", background: Colour.Blue, prompts: NO_PROMPTS }, h(Text, { text: "Only words" })),
      h(Frame, { key: "field", title: "Name", background: Colour.Blue, prompts: NO_PROMPTS }, h(TextField, { label: "Name", longest: 10 })),
    ];
  }
}

function harness(root: () => Element): Harness {
  return new Harness([new ComponentChannel([{ page: PAGE, title: "Two", root }], { opus: fakeOpus() })]);
}

test("RULE-112: two sub-pages of one page number with different components get two tables, each for its own sub-code at its own selection", () => {
  const page = harness(() => h(TextThenField, {}));
  page.join(1, PAGE);
  // The field on the second sub-page makes the page number own the digits in the kit's page entry, which is the page number's (needs.ts), so neither sub-page asks for them.
  const words = { type: "rules", connections: [1], page: "150", sub: "0001", table: { rules: [FASTEXT_KEYS] } };
  assert.deepEqual(rulesSent(page), [words], "the page selected with no sub-page in particular shows its first, a page of text");
  page.open(1, PAGE, SECOND_SUB_PAGE);
  const field = {
    type: "rules",
    connections: [1],
    page: "150",
    sub: "0002",
    table: table([...KEYS, TEXT, ...HOVER, press("textfield_1")], [rowsRect("textfield_1", BODY_ROW)]),
  };
  assert.deepEqual(rulesSent(page), [words, field], "the second sub-page's own table, of its own cells, for its own sub-code");
  page.open(1, PAGE, FIRST_SUB_PAGE);
  assert.deepEqual(rulesSent(page), [words, field, words], "going back to the first is opening a page: its table is sent afresh");
  page.open(1, PAGE, FIRST_SUB_PAGE);
  assert.deepEqual(rulesSent(page), [words, field, words, words], "a second selection of the same sub-page sends its table again");
  assert.deepEqual(page.errors, []);
});

test("RULE-112: a key its table asked for on the second sub-page reaches the field drawn there", () => {
  const page = harness(() => h(TextThenField, {}));
  page.join(1, PAGE);
  page.open(1, PAGE, SECOND_SUB_PAGE);
  page.fire(1, "keys", { kind: "key", action: "press", key: "a", mods: 0, text: "a" });
  page.fire(1, "keys_up", { kind: "key", action: "release", key: "a", mods: 0 });
  assert.match(text(page.seen(1, PAGE).rows, BODY_ROW), /Name.*a/u, "the field on the second sub-page types the key its own table asked for");
});

/** A page of two sub-pages, a button on each at the same cells. */
class TwoButtons extends Component<{ readonly pressed: string[] }> {
  override render(): Child {
    const { pressed } = this.props;
    return ["one", "two"].map((label) =>
      h(
        Frame,
        { key: label, title: label, background: Colour.Blue, prompts: NO_PROMPTS },
        h(Button, {
          label,
          onPress: () => {
            pressed.push(label);
          },
        }),
      ),
    );
  }
}

test("RULE-112: a press is given to the button drawn there on the sub-page it came from, by the sub-code its input names", () => {
  const pressed: string[] = [];
  const page = harness(() => h(TwoButtons, { pressed }));
  page.join(1, PAGE);
  // The server names the sub-page an input came from; the harness's fire names 3F7F, the page with none in particular, which is the one selected.
  const click = { kind: "mouse", action: "press", button: 0, row: BODY_ROW, column: 1, mods: 0 } as const;
  page.fire(1, "press_button_1", click, undefined, { rect: "button_1" });
  page.open(1, PAGE, SECOND_SUB_PAGE);
  page.fire(1, "press_button_1", click, undefined, { rect: "button_1" });
  assert.deepEqual(pressed, ["one", "two"]);
});
