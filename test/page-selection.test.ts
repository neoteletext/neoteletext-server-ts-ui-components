// REQ-6539, page-rules.md RULE-54: a page whose components take no keys
// still asks for the keys the protocol kit selects pages by, so that a
// typed page number and the coloured keys go on working.

import assert from "node:assert/strict";
import { test } from "node:test";

import type { InputEvent } from "neoteletext-server-ts-protocol/protocol";
import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import { ComponentChannel, type ComponentChannelOptions, type Element, h, type PageSpec, Text } from "../src/index.ts";
import { frame } from "./components-fixtures.ts";
import { PAGE } from "./mouse-fixtures.ts";
import { FASTEXT_KEYS, rulesSent, SELECT_DIGITS, SELECTION, tableSent } from "./page-rules-fixtures.ts";

/** No modifier key held, as an input event of the wire says it. */
const NO_MODS = 0;

/** The index page, which the frame's red prompt links to. */
const INDEX = 0x100;

/** A channel of a page of words alone, 150, with `more` said of it, and the index, 100. */
function words(more: Partial<PageSpec> = {}, options: ComponentChannelOptions = {}): Harness {
  return new Harness([
    new ComponentChannel(
      [
        { page: PAGE, title: "Text", root: (): Element => frame("Text", h(Text, { text: "Only words" })), ...more },
        { page: INDEX, title: "Index", root: (): Element => frame("Index", h(Text, { text: "Contents" })) },
      ],
      { opus: fakeOpus(), ...options },
    ),
  ]);
}

/** A digit's key pressed, as the wire says it. */
function digit(key: string): InputEvent {
  return { kind: "key", action: "press", key, mods: NO_MODS, text: key };
}

test("RULE-54: a page of static text asks for the keys the kit selects pages by and nothing else, of each connection as it opens the page", () => {
  const page = words();
  page.join(1, PAGE);
  assert.deepEqual(rulesSent(page), [{ type: "rules", connections: [1], page: "150", table: { rules: SELECTION } }]);
  page.join(2, PAGE);
  assert.deepEqual(
    rulesSent(page).at(-1),
    { type: "rules", connections: [2], page: "150", table: { rules: SELECTION } },
    "the page every viewer shares gives each its table",
  );
  assert.equal(rulesSent(page).length, 2, "and the first viewer is not sent theirs again");
});

test("RULE-54: three digits typed on a page of static text still select a page, by the rules its table asks for them with", () => {
  const page = words();
  page.join(1, PAGE);
  page.fire(1, "select_digits", digit("1"));
  page.fire(1, "select_digits", digit("0"));
  assert.deepEqual(page.redirects(1), [], "two digits are no page yet");
  page.fire(1, "select_keypad", { kind: "key", action: "press", key: "Numpad0", mods: NO_MODS, text: "0" });
  assert.deepEqual(page.redirects(1), [INDEX], "the third, from the keypad, makes the page's number");
});

test("RULE-54: a coloured key pressed on a page of static text still follows the page's Fastext link", () => {
  const page = words();
  page.join(1, PAGE);
  page.fire(1, "fastext_keys", { kind: "key", action: "press", key: "ColorF0Red", mods: NO_MODS });
  assert.deepEqual(page.redirects(1), [INDEX]);
});

test("RULE-54: a page asks for the digits and the coloured keys only where the kit takes them: a page that has its own use for either leaves its rule out, and one with a use for both asks for nothing", () => {
  const digitsOwned = words({ ownsDigits: true });
  digitsOwned.join(1, PAGE);
  assert.deepEqual(tableSent(digitsOwned), { rules: [FASTEXT_KEYS] });
  const coloursOwned = words({ ownsColourKeys: true });
  coloursOwned.join(1, PAGE);
  assert.deepEqual(tableSent(coloursOwned), { rules: SELECT_DIGITS });
  const bothOwned = words({ ownsDigits: true, ownsColourKeys: true });
  bothOwned.join(1, PAGE);
  assert.deepEqual(tableSent(bothOwned), { rules: [] });
});
