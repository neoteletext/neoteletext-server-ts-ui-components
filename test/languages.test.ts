// Text in any language (REQ-2152, DEC-2199): components hand the canvas
// Unicode in their language and the page names its own, for the server to
// encode; right-to-left layout; the rows Thai and Lao need; double height
// by DEC-2222; and the marks a component draws, which every page shows.

import assert from "node:assert/strict";
import { test } from "node:test";

import type { Harness } from "neoteletext-server-ts-protocol/testing";
import { type Element, Breadcrumbs, DoubleHeight, Frame, Gap, h, LinesBlock, Paragraph, Rows, ScrollView, Text } from "../src/index.ts";
import { Colour, textCells } from "../src/kit.ts";
import { languageOf, textRuns } from "../src/core/language.ts";
import { SERVER_LANGUAGES } from "neoteletext-server-ts-protocol/testing";
import { BODY_ROW, frame, harness, PAGE } from "./components-fixtures.ts";
import type { LanguageTag, SubPageContent } from "../src/kit.ts";

/** The page `session` sees, with `body` in a frame, in `language`. */
function seen(language: LanguageTag | undefined, ...body: Parameters<typeof frame>[1][]): { readonly page: Harness; readonly content: SubPageContent } {
  const page = harness([
    { page: PAGE, title: "Languages", perViewer: true, ...(language === undefined ? {} : { language }), root: (): Element => frame("Title", ...body) },
  ]);
  page.join(1, PAGE);
  const content = (page.channel.copy(1, PAGE) ?? page.channel.copy("channel", PAGE))?.at(-1)?.content;
  assert.ok(content !== undefined, page.errors.join("\n"));
  return { page, content };
}

function runsOn(content: SubPageContent, row: number): readonly unknown[] {
  return (content.text ?? []).filter((run) => run.row === row);
}

const LANGUAGES = SERVER_LANGUAGES;

test("REQ-2152 item 1: a page names its language, and its text is runs in it, a component's own language prop over the page's", () => {
  const { content } = seen("ru", h(Text, { text: "Привет" }), h(Text, { text: "Γειά σου", language: "el" }));
  assert.equal(content.language, "ru", "the page's language, which sets its sets and has the server write their designation");
  assert.equal(content.character_set, undefined);
  assert.deepEqual(runsOn(content, BODY_ROW), [{ row: BODY_ROW, column: 1, text: "Привет", language: "ru" }]);
  assert.deepEqual(runsOn(content, BODY_ROW + 1), [{ row: BODY_ROW + 1, column: 1, text: "Γειά σου", language: "el" }]);
});

test("REQ-2152 item 1: a page with no language of its own is in the channel's, English", () => {
  const { content } = seen(undefined, h(Text, { text: "Hello" }));
  assert.equal(content.language, "en");
  assert.deepEqual(runsOn(content, BODY_ROW), [{ row: BODY_ROW, column: 1, text: "Hello", language: "en" }]);
});

test("REQ-2152 item 6: what a language's sets lack is written in English, and what no set has is folded", () => {
  const russian = languageOf("ru", LANGUAGES);
  assert.deepEqual(
    textRuns(textCells("Цена Page 2"), russian).map((run) => [run.cells.join(""), run.language]),
    [
      ["Цена ", "ru"],
      ["Page 2", "en"],
    ],
  );
  const arabic = languageOf("ar", LANGUAGES);
  assert.deepEqual(
    textRuns(textCells("سعر 50"), arabic).map((run) => [run.cells.join(""), run.language]),
    [
      ["سعر ", "ar"],
      ["50", "en"],
    ],
    "Arabic's sets have no ASCII digits",
  );
  assert.deepEqual(
    textRuns(textCells("a[1]"), languageOf("en", LANGUAGES)).map((run) => run.cells.join("")),
    ["a(1)"],
    "no set has square brackets",
  );
  assert.deepEqual(
    textRuns(textCells("→"), arabic).map((run) => run.language),
    ["en"],
    "an arrow only English has",
  );
});

test("REQ-2152 item 4: right to left, text is flush with the right edge and breadcrumbs run from the right, their arrow pointing left", () => {
  const { content } = seen("ar", h(Text, { text: "مرحبا" }), h(Breadcrumbs, { trail: [{ label: "بيت" }, { label: "أخبار" }] }));
  assert.deepEqual(
    runsOn(content, BODY_ROW),
    [{ row: BODY_ROW, column: 35, text: "مرحبا", language: "ar" }],
    "the text ends at the row's end, its colour before it",
  );
  const crumbs = runsOn(content, BODY_ROW + 1);
  assert.deepEqual(crumbs, [
    { row: BODY_ROW + 1, column: 29, text: "أخبار", language: "ar" },
    { row: BODY_ROW + 1, column: 35, text: "←", language: "en" },
    { row: BODY_ROW + 1, column: 37, text: "بيت", language: "ar" },
  ]);
});

test("REQ-2152 item 5: a line of Thai takes three rows, its text on the middle one, and the title band three, single height", () => {
  const { page, content } = seen(
    "th",
    h(Text, { text: "สวัสดี" }),
    h(Paragraph, { text: "ภาษาไทย" }),
    h(LinesBlock, { lines: [{ foreground: Colour.White, text: "ไทย" }] }),
  );
  const body = 4;
  assert.deepEqual(
    (content.text ?? []).map((run) => [run.row, run.text]),
    [
      [2, "Title"],
      [body + 1, "สวัสดี"],
      [body + 4, "ภาษาไทย"],
      [body + 7, "ไทย"],
      [24, "Index"],
    ],
    "the title on row 2 between its mark rows, the body from row 4, each line on the middle of its three",
  );
  const rows = page.seen(1, PAGE).rows;
  assert.equal(rows[2]?.includes(0x0d), false, "no double height for Thai (DEC-2222 item 2)");
});

test("REQ-2152 item 5: Thai where its marks would leave the component's rows or the page's is not written, and the Fastext row shows its page", () => {
  const page = harness([
    {
      page: PAGE,
      title: "Thai",
      perViewer: true,
      language: "th",
      root: (): Element => frame("Title", h(ScrollView, { shown: 6, height: 6 }, h(Text, { text: "หนึ่ง", height: 1 }), h(Text, { text: "สอง" }))),
    },
  ]);
  page.join(1, PAGE);
  const content = (page.channel.copy(1, PAGE) ?? page.channel.copy("channel", PAGE))?.at(-1)?.content;
  assert.deepEqual(page.errors, []);
  assert.deepEqual(
    (content?.text ?? []).map((run) => [run.row, run.text]),
    [
      [2, "Title"],
      [6, "สอง"],
      [23, "PgDn PgUp arrows Home End scroll"],
      [24, "Index"],
    ],
    "the library's own words in English, which has no mark rows; a unit given one row has no room for its marks, on row 4; one without a height takes three, rows 5 to 7",
  );
});

test("DEC-2222: double height in every language but Thai and Lao, never on rows 23 and 24", () => {
  const { page } = seen("ru", h(DoubleHeight, { text: "Заголовок" }));
  assert.equal(page.seen(1, PAGE).rows[BODY_ROW]?.[0], 0x0d, "Cyrillic in double height");
  const thai = seen("th", h(DoubleHeight, { text: "หัวข้อ" }));
  assert.ok(!(thai.page.seen(1, PAGE).rows[5] ?? []).includes(0x0d), "Thai single height, on the middle of its three rows");
  assert.deepEqual(runsOn(thai.content, 5), [{ row: 5, column: 2, text: "หัวข้อ", language: "th" }]);
  const low = seen("en", h(Rows, {}, h(Gap, { height: 20 }), h(DoubleHeight, { text: "Low" })));
  assert.ok(!(low.page.seen(1, PAGE).rows[23] ?? []).includes(0x0d), "not on row 23");
});

test("REQ-2152 item 5: a Fastext prompt in Thai, which row 24 has no mark rows for, shows the page it leads to", () => {
  const page = harness([
    {
      page: PAGE,
      title: "Thai",
      language: "th",
      root: (): Element => h(Frame, { title: "ไทย", background: Colour.Blue, prompts: [["หน้าแรก", 0x100]] }, h(Text, { text: "x" })),
    },
  ]);
  page.join(1, PAGE);
  const content = page.channel.copy("channel", PAGE)?.at(-1)?.content;
  assert.ok(content !== undefined);
  assert.deepEqual(runsOn(content, 24), [{ row: 24, column: 1, text: "100", language: "en" }]);
});
