// The dialog that asks for a name, or a code a remote can type, before
// something is destroyed.

import assert from "node:assert/strict";
import { test } from "node:test";

import type { Harness } from "neottx-server-ts-protocol/testing";
import { h, Modal, TypeToConfirm } from "../src/index.ts";
import { Key } from "../src/kit.ts";
import { viewer } from "./controls-fixtures.ts";
import { Heard, pressAll, row, rowWith, shown } from "./input-more-fixtures.ts";

/** A page with a type-to-confirm dialog over it, and what it answered. */
function confirming(name = "news"): { page: Harness; answers: string[] } {
  const answers: string[] = [];
  const page = viewer(
    h(
      Heard,
      { seen: answers },
      h(Modal, {
        row: 0,
        dialog: h(TypeToConfirm, {
          name,
          destroys: "the page and its 12 sub-pages",
          onConfirm: () => {
            answers.push("confirmed");
          },
          onCancel: () => {
            answers.push("cancelled");
          },
        }),
      }),
    ),
  );
  return { page, answers };
}

/** The code the dialog shows. */
function codeOf(page: Harness): string {
  const found = /code (\d+)/u.exec(shown(page));
  assert.ok(found?.[1] !== undefined, "the dialog shows a code");
  return found[1];
}

test("a type-to-confirm dialog says what it destroys, and Confirm is locked until the name is typed", () => {
  const { page, answers } = confirming();
  assert.match(shown(page), /Destroy news\? This destroys the page and its 12 sub-pages, and it cannot be undone\. Type news/u);
  const status = rowWith(page, "Confirm locked");
  page.typeKeys(1, "new");
  page.press(1, Key.Enter);
  assert.match(row(page, status), /! Not the name or the code/u);
  assert.deepEqual(answers, []);
  page.typeKeys(1, "s");
  assert.match(row(page, status), /Ready/u);
  page.press(1, Key.Enter);
  assert.deepEqual(answers, ["activate news", "confirmed"]);
});

test("a viewer with only a remote confirms with the digits of the code the dialog shows", () => {
  const { page, answers } = confirming();
  const code = codeOf(page);
  assert.equal(code.length, 4);
  pressAll(page, ...Array.from(code), Key.Enter);
  assert.deepEqual(answers, ["activate news", "confirmed"]);
});

test("Cancel is the default: Enter with nothing typed cancels, and Escape cancels with something typed", () => {
  const first = confirming();
  first.page.press(1, Key.Enter);
  assert.deepEqual(first.answers, ["cancel", "cancelled"]);
  const second = confirming();
  second.page.typeKeys(1, "news");
  second.page.press(1, Key.Escape);
  assert.deepEqual(second.answers, ["cancel", "cancelled"]);
});

test("Right goes to the buttons; Confirm there is refused until what is typed matches, and only the dialog's own answers come up", () => {
  const refused = confirming();
  pressAll(refused.page, Key.Right, Key.Enter);
  assert.deepEqual(refused.answers, [], "neither Confirm nor the dialog's activate reached the page");
  const { page, answers } = confirming();
  page.typeKeys(1, "news");
  pressAll(page, Key.Right, Key.Enter);
  assert.deepEqual(answers, ["activate news", "confirmed"]);
});

test("a type-to-confirm dialog reads a program's name no further than its line holds, and that is what confirms", () => {
  const most = "a".repeat(24);
  const { page, answers } = confirming(`${most}${"b".repeat(1_000_000)}`);
  assert.match(shown(page), new RegExp(`Type ${most}, or the code`, "u"));
  page.typeText(1, "a".repeat(30));
  page.press(1, Key.Enter);
  assert.deepEqual(answers, [`activate ${most}`, "confirmed"], "the name is its first 24 characters, and no more are typed");
});
