// The fields a remote can fill: digits to a template (a PIN, a date, a
// time), and letters from the digit keys as on a phone.

import assert from "node:assert/strict";
import { test } from "node:test";

import { ComponentChannel, type Element, h, MultiTapField, SegmentField } from "../src/index.ts";
import { MULTI_TAP_COMMIT_MS } from "../src/input/multi-tap-field.ts";
import { Key } from "../src/kit.ts";
import { BODY_ROW, frame, latestTti, PAGE, viewer } from "./controls-fixtures.ts";
import { BLOCK, Heard, pressAll, row } from "./input-more-fixtures.ts";

/** The English set's up arrow, at ASCII's `^` (EN 300 706 Table 36): a row's text holds its code. */
const UP_ARROW = "^";

/** A month's check, for the second segment of a date. */
function month(segment: number, digits: string): string | null {
  const value = Number(digits);
  return segment === 1 && (value < 1 || value > 12) ? "Month 1 to 12" : null;
}

// SegmentField.

test("a segment field shows a fill in each empty slot and the cursor's block, and digits fill the slots past the separators", () => {
  const changes: string[] = [];
  const page = viewer(
    h(SegmentField, {
      label: "Date",
      template: "99/99/9999",
      autoFocus: true,
      onChange: (value: string) => {
        changes.push(value);
      },
    }),
  );
  assert.match(row(page, BODY_ROW), new RegExp(`${BLOCK}-/--/----`, "u"));
  assert.equal(row(page, BODY_ROW + 1).indexOf(UP_ARROW), row(page, BODY_ROW).indexOf(BLOCK), "the cursor's slot is marked under it");
  pressAll(page, "2", "5", "1", "2", "2", "0", "2", "6");
  assert.match(row(page, BODY_ROW), /25\/12\/2026/u);
  assert.equal(changes.at(-1), "25122026", "the value is the slots' digits");
  assert.ok(!row(page, BODY_ROW + 1).includes(UP_ARROW), "past the last slot, no slot is marked");
});

test("Backspace clears the slot before the cursor; Left and Right move between slots, and a digit there replaces its own", () => {
  const changes: string[] = [];
  const page = viewer(
    h(SegmentField, {
      template: "99:99",
      autoFocus: true,
      onChange: (value: string) => {
        changes.push(value);
      },
    }),
  );
  pressAll(page, "1", "2", "3", "4", Key.Left, Key.Left, "5");
  assert.match(row(page, BODY_ROW), /12:54/u);
  page.press(1, Key.Backspace);
  assert.match(row(page, BODY_ROW), new RegExp(`12:${BLOCK}4`, "u"), "the slot cleared, the cursor on it");
  assert.equal(changes.at(-1), "12 4", "a slot with no digit is a space in the value");
  pressAll(page, Key.Right, Key.Right, Key.Right, "9");
  assert.equal(changes.at(-1), "12 4", "past the last slot a digit is refused");
});

test("a segment's check complains under the field in red, and Enter activates only once every slot is filled and nothing is wrong", () => {
  const heard: string[] = [];
  const submitted: string[] = [];
  const page = viewer(
    h(
      Heard,
      { seen: heard },
      h(SegmentField, {
        template: "99/99/9999",
        autoFocus: true,
        check: month,
        onSubmit: (filled: string) => {
          submitted.push(filled);
        },
      }),
    ),
  );
  pressAll(page, "2", "5", "1", "3");
  assert.match(row(page, BODY_ROW + 1), /! Month 1 to 12/u);
  pressAll(page, Key.Backspace, "2", Key.Enter);
  assert.doesNotMatch(row(page, BODY_ROW + 1), /Month/u, "put right, it no longer complains");
  assert.deepEqual([heard, submitted], [[], []], "not every slot is filled");
  pressAll(page, "2", "0", "2", "6", Key.Enter);
  assert.deepEqual([heard, submitted], [["activate 25/12/2026"], ["25/12/2026"]]);
});

test("a whole value's own check holds Enter back as a segment's does", () => {
  const submitted: string[] = [];
  const page = viewer(
    h(SegmentField, {
      template: "9999",
      autoFocus: true,
      validate: (value: string) => (value === "0000" ? "Not 0000" : null),
      onSubmit: (filled: string) => {
        submitted.push(filled);
      },
    }),
  );
  pressAll(page, "0", "0", "0", "0", Key.Enter);
  assert.match(row(page, BODY_ROW + 1), /! Not 0000/u);
  assert.deepEqual(submitted, []);
});

test("a concealed segment field draws each filled slot as *, so a PIN's digits are never in the page", () => {
  const changes: string[] = [];
  const page = viewer(
    h(SegmentField, {
      label: "PIN",
      template: "9999",
      conceal: true,
      autoFocus: true,
      onChange: (value: string) => {
        changes.push(value);
      },
    }),
  );
  pressAll(page, "8", "3", "6", "1");
  assert.match(row(page, BODY_ROW), /\*\*\*\*/u);
  assert.equal(changes.at(-1), "8361");
  assert.ok(!latestTti(page, PAGE).includes("8361"), "the digits are the server's alone");
});

test("a segment field takes the digits from page selection; typed or pasted digits fill it, the rest of the text passed over", () => {
  const components = new ComponentChannel([{ page: PAGE, title: "Test", root: (): Element => frame("Code", h(SegmentField, { template: "9999" })) }]);
  assert.equal(components.pages()[0]?.ownsDigits, true);
  const changes: string[] = [];
  const page = viewer(
    h(SegmentField, {
      template: "99:99",
      autoFocus: true,
      onChange: (value: string) => {
        changes.push(value);
      },
    }),
  );
  page.typeText(1, "1a2\u00003");
  page.paste(1, `45${"6".repeat(100_000)}`);
  assert.deepEqual(changes, ["123", "1234"], "a slot each, and none past the last");
});

test("Escape clears a segment field, and with nothing in it sends cancel", () => {
  const heard: string[] = [];
  const page = viewer(h(Heard, { seen: heard }, h(SegmentField, { template: "9999", autoFocus: true })));
  pressAll(page, "1", "2", Key.Escape);
  assert.match(row(page, BODY_ROW), new RegExp(`${BLOCK}---`, "u"));
  assert.deepEqual(heard, []);
  page.press(1, Key.Escape);
  assert.deepEqual(heard, ["cancel"]);
});

test("a segment field reads a program's template no further than a row, and of its value only digits in its slots", () => {
  // The page's one control has the keys, so its cursor is on the first empty slot.
  const page = viewer(h(SegmentField, { template: "9".repeat(1_000_000), initial: "12x4" }));
  assert.match(row(page, BODY_ROW), new RegExp(`12${BLOCK}4-+ *$`, "u"));
});

// MultiTapField.

test("a key pressed again within the timeout goes on to its next letter, and the timeout takes the letter", () => {
  const changes: string[] = [];
  const page = viewer(
    h(MultiTapField, {
      label: "Name",
      autoFocus: true,
      onChange: (value: string) => {
        changes.push(value);
      },
    }),
  );
  pressAll(page, "4", "4");
  assert.match(row(page, BODY_ROW), new RegExp(`> h${BLOCK}`, "u"), "the server draws the letter and the cursor after it");
  assert.match(row(page, BODY_ROW + 1), /abc {2}4: g\(h\)i/u, "the case, and the key's letters with the one it has come to");
  assert.deepEqual(changes, [], "a letter being chosen is not yet the value");
  page.advance(MULTI_TAP_COMMIT_MS - 1);
  assert.deepEqual(changes, []);
  page.runUntil(page.now + 1);
  assert.deepEqual(changes, ["h"]);
  page.press(1, "4");
  page.runUntil(page.now + MULTI_TAP_COMMIT_MS);
  assert.deepEqual(changes, ["h", "hg"], "after the timeout the same key starts a new letter");
});

test("another key takes the letter being chosen at once; a key's letters go round; 0 types a space and 1 the punctuation", () => {
  const changes: string[] = [];
  const page = viewer(
    h(MultiTapField, {
      autoFocus: true,
      onChange: (value: string) => {
        changes.push(value);
      },
    }),
  );
  pressAll(page, "7", "7", "7", "7", "7", "0");
  assert.deepEqual(changes, ["p", "p "], "pqrs went round to p; 0, one character, types it at once");
  pressAll(page, "1", "1", "1", "1");
  page.runUntil(page.now + MULTI_TAP_COMMIT_MS);
  assert.deepEqual(changes.at(-1), "p !");
});

test("the yellow key, and # as on a phone, change the case of the letters", () => {
  const changes: string[] = [];
  const page = viewer(
    h(MultiTapField, {
      autoFocus: true,
      onChange: (value: string) => {
        changes.push(value);
      },
    }),
  );
  pressAll(page, Key.Yellow, "2", "2", "3");
  assert.match(row(page, BODY_ROW + 1), /ABC {2}3: \(D\)EF/u);
  page.press(1, "#");
  assert.match(row(page, BODY_ROW + 1), /abc {2}3: \(d\)ef/u, "the letter being chosen changes with it");
  page.runUntil(page.now + MULTI_TAP_COMMIT_MS);
  assert.deepEqual(changes, ["B", "Bd"]);
});

test("Backspace takes back the letter being chosen, or else the last letter taken", () => {
  const changes: string[] = [];
  const page = viewer(
    h(MultiTapField, {
      autoFocus: true,
      initial: "ok",
      onChange: (value: string) => {
        changes.push(value);
      },
    }),
  );
  pressAll(page, "9", Key.Backspace);
  page.runUntil(page.now + MULTI_TAP_COMMIT_MS);
  assert.deepEqual(changes, [], "the w being chosen was taken back, and the timeout takes nothing");
  page.press(1, Key.Backspace);
  assert.deepEqual(changes, ["o"]);
});

test("a multi-tap field takes typing from a keyboard as it is, and no more characters than its longest", () => {
  const changes: string[] = [];
  const page = viewer(
    h(MultiTapField, {
      autoFocus: true,
      longest: 4,
      onChange: (value: string) => {
        changes.push(value);
      },
    }),
  );
  pressAll(page, "2");
  page.typeKeys(1, "Hi");
  page.typeText(1, "9\u0007x!");
  assert.deepEqual(changes, ["a", "aH", "aHi", "aHi9"], "the letter being chosen taken first; a phone's text as it is, a control character never");
  pressAll(page, "5");
  assert.deepEqual(changes.length, 4, "full, a key types nothing");
});

test("Enter takes the letter being chosen and sends submit with the text, then clears it", () => {
  const heard: string[] = [];
  const submitted: string[] = [];
  const page = viewer(
    h(
      Heard,
      { seen: heard },
      h(MultiTapField, {
        autoFocus: true,
        initial: "h",
        onSubmit: (typed: string) => {
          submitted.push(typed);
        },
      }),
    ),
  );
  pressAll(page, "4", "4", "4", Key.Enter);
  assert.deepEqual([heard, submitted], [["submit hi"], ["hi"]]);
  assert.match(row(page, BODY_ROW), new RegExp(`> ${BLOCK}`, "u"), "cleared");
});

test("a multi-tap field takes the digits and the coloured keys from the page", () => {
  const components = new ComponentChannel([{ page: PAGE, title: "Test", root: (): Element => frame("Name", h(MultiTapField, {})) }]);
  const [needs] = components.pages();
  assert.deepEqual([needs?.ownsDigits, needs?.ownsColourKeys], [true, true]);
});
