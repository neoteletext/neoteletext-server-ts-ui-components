// Text in any language (REQ-2152, DEC-2199): components hand the canvas
// Unicode in their language and the page names its own, for the server to
// encode; right-to-left layout; a line a row in every language (DEC-2239);
// double height by DEC-2222; and the marks a component draws, which every page shows.

import assert from "node:assert/strict";
import { test } from "node:test";

import type { Harness } from "neoteletext-server-ts-protocol/testing";
import { type Element, Breadcrumbs, DoubleHeight, Gap, h, LinesBlock, Paragraph, Rows, Text } from "../src/index.ts";
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

test("DEC-2239: a line takes one row in every language, and the title band two, in double height", () => {
  const { page, content } = seen(
    "ru",
    h(Text, { text: "Привет" }),
    h(Paragraph, { text: "Русский язык" }),
    h(LinesBlock, { lines: [{ foreground: Colour.White, text: "Мир" }] }),
  );
  assert.deepEqual(
    (content.text ?? []).map((run) => [run.row, run.text]),
    [
      [1, "Title"],
      [BODY_ROW, "Привет"],
      [BODY_ROW + 1, "Русский язык"],
      [BODY_ROW + 2, "Мир"],
      [24, "Index"],
    ],
    "the title on row 1, the body from row 3, a line a row",
  );
  assert.equal(page.seen(1, PAGE).rows[1]?.includes(0x0d), true, "the title in double height");
});

test("DEC-2222: double height in every language, never on rows 23 and 24", () => {
  const { page } = seen("ru", h(DoubleHeight, { text: "Заголовок" }));
  assert.equal(page.seen(1, PAGE).rows[BODY_ROW]?.[0], 0x0d, "Cyrillic in double height");
  const low = seen("en", h(Rows, {}, h(Gap, { height: 20 }), h(DoubleHeight, { text: "Low" })));
  assert.ok(!(low.page.seen(1, PAGE).rows[23] ?? []).includes(0x0d), "not on row 23");
});
