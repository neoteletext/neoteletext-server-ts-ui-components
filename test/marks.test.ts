// Thai and Lao lines two rows apart (DEC-604, DEC-2221 item 6): a line's
// lower vowels share a row with the next line's upper marks, a row more
// only where one column needs both; one-row controls of such a language
// given their mark rows; and the stand-in a channel's words are drawn as in
// a viewer's language.

import assert from "node:assert/strict";
import { test } from "node:test";

import { ChoiceList, ComponentChannel, type Element, h, LinesBlock, Paragraph, ScrollView, TabStrip, Ticker } from "../src/index.ts";
import { Colour, Key } from "../src/kit.ts";
import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import type { LanguageTag, SubPageContent } from "../src/kit.ts";
import { clashes, layLines } from "../src/core/marks.ts";
import { textCells } from "../src/kit.ts";
import { languageOf, textRuns } from "../src/core/language.ts";
import { SERVER_LANGUAGES } from "neoteletext-server-ts-protocol/testing";
import { frame, harness, PAGE } from "./components-fixtures.ts";
import { controlsOf } from "./controls-fixtures.ts";

/** A Thai page's body starts on row 4, under the three-row title band (DEC-2226 item 4). */
const THAI_BODY = 4;

function content(page: Harness): SubPageContent {
  const found = (page.channel.copy(1, PAGE) ?? page.channel.copy("channel", PAGE))?.at(-1)?.content;
  assert.ok(found !== undefined, page.errors.join("\n"));
  return found;
}

/** The page in Thai with `body` in a frame: its runs as [row, text]. */
function thai(...body: Element[]): { readonly page: Harness; readonly runs: [number, string][] } {
  const page = harness([{ page: PAGE, title: "Thai", language: "th", perViewer: true, root: (): Element => frame("Title", ...body) }]);
  page.join(1, PAGE);
  assert.deepEqual(page.errors, []);
  return { page, runs: (content(page).text ?? []).map((run) => [run.row, run.text]) };
}

const thaiLanguage = languageOf("th", SERVER_LANGUAGES);
const line = (text: string): { column: number; cells: string[] } => ({ column: 1, cells: textCells(text) });

test("DEC-604: Thai lines are two rows apart, the first's marks above it and the last's below it", () => {
  assert.deepEqual(layLines(thaiLanguage, [line("กข"), line("คง"), line("จฉ")]), { rows: [1, 3, 5], height: 7 });
  const { runs } = thai(h(LinesBlock, { lines: ["กข", "คง", "จฉ"].map((text) => ({ foreground: Colour.White, text })) }));
  assert.deepEqual(
    runs.filter(([row]) => row > THAI_BODY && row < 23),
    [
      [THAI_BODY + 1, "กข"],
      [THAI_BODY + 3, "คง"],
      [THAI_BODY + 5, "จฉ"],
    ],
  );
});

test("DEC-2221 item 6: a line's lower vowel shares a row with the next line's upper mark in another column", () => {
  // Sara u under ko kai in column 1, mai ek over the second letter of the next line, column 2.
  assert.equal(clashes(line("กุ"), line("ขก่")), false);
  const { runs } = thai(
    h(Paragraph, { text: "กุ ขก่", lines: 2 }),
    h(LinesBlock, {
      lines: [
        { foreground: Colour.White, text: "กุ" },
        { foreground: Colour.White, text: "ขก่" },
      ],
    }),
  );
  const block = runs.filter(([, text]) => text === "กุ" || text === "ขก่").map(([row]) => row);
  assert.deepEqual(block, [THAI_BODY + 4, THAI_BODY + 6], "the second line two rows below the first, their marks on the row between");
});

test("DEC-604: where one column needs a lower vowel and the next line's upper mark, that line is a row further on", () => {
  // Sara u under ko kai, then sara i over ko kai in the same column.
  assert.equal(clashes(line("กุ"), line("กิ")), true);
  assert.deepEqual(layLines(thaiLanguage, [line("กุ"), line("กิ"), line("ขค")]), { rows: [1, 4, 6], height: 8 });
  const { runs } = thai(h(LinesBlock, { lines: ["กุ", "กิ", "ขค"].map((text) => ({ foreground: Colour.White, text })) }));
  assert.deepEqual(
    runs.filter(([row]) => row > THAI_BODY && row < 23),
    [
      [THAI_BODY + 1, "กุ"],
      [THAI_BODY + 4, "กิ"],
      [THAI_BODY + 6, "ขค"],
    ],
  );
});

test("DEC-2226: a Thai list's items are two rows apart, each a control on its letters' row, and the keys move along them", () => {
  const { page, runs } = thai(h(ChoiceList, { items: ["กข", "คง", "จฉ"], shown: 7, onChoose: () => {} }));
  assert.deepEqual(
    runs.filter(([row]) => row > THAI_BODY && row < 23),
    [
      [THAI_BODY + 1, "กข"],
      [THAI_BODY + 3, "คง"],
      [THAI_BODY + 5, "จฉ"],
    ],
  );
  assert.deepEqual(
    controlsOf(page, PAGE).map((control) => [control.row, control.height]),
    [
      [THAI_BODY + 1, 1],
      [THAI_BODY + 3, 1],
      [THAI_BODY + 5, 1],
    ],
  );
  page.press(1, Key.Down);
  assert.deepEqual(page.errors, []);
});

test("DEC-2226: a Thai list whose neighbours would need one column of a shared row keeps a row below each item", () => {
  const { runs } = thai(h(ChoiceList, { items: ["กุ", "กิ"], shown: 7, onChoose: () => {} }));
  assert.deepEqual(
    runs.filter(([row]) => row > THAI_BODY && row < 23),
    [
      [THAI_BODY + 1, "กุ"],
      [THAI_BODY + 4, "กิ"],
    ],
  );
});

test("DEC-2226: Thai tabs and a ticker take their mark rows, their text on the middle one", () => {
  const { runs } = thai(h(TabStrip, { tabs: ["กข", "คง"], active: 0, onChange: () => {} }), h(Ticker, { items: ["จฉ"], everyMs: 5000 }));
  assert.deepEqual(
    runs.filter(([row]) => row > THAI_BODY && row < 23).map(([row, text]) => [row, text.trim()]),
    [
      [THAI_BODY + 1, "กข"],
      [THAI_BODY + 1, "คง"],
      [THAI_BODY + 4, "จฉ"],
    ],
  );
});

test("DEC-604: a Thai scrolling view's lines are two rows apart, its last row kept for the marks below the last line shown", () => {
  const { runs } = thai(h(ScrollView, { shown: 6 }, "กข", "คง", "จฉ", "ชซ"));
  assert.deepEqual(
    runs.filter(([row]) => row > THAI_BODY && row < 23),
    [
      [THAI_BODY + 1, "กข"],
      [THAI_BODY + 3, "คง"],
    ],
  );
});

/** A channel whose words stand in Russian and Thai, a page of `text` for a viewer in `language`. */
function standIn(language: LanguageTag, ...body: Element[]): SubPageContent {
  const texts: Partial<Record<LanguageTag, string>> = { ru: "Все люди рождаются свободными", th: "มนุษย์ทั้งหลายเกิดมามีอิสระ" };
  const page = new Harness([
    new ComponentChannel([{ page: PAGE, title: "Words", root: (): Element => frame("Title", ...body) }], {
      opus: fakeOpus(),
      standIn: (tag): string | undefined => texts[tag],
    }),
  ]);
  page.join(1, PAGE, [{ name: "language", value: language }]);
  return content(page);
}

test("stand-in: in a viewer's language, the channel's words are drawn as text of it, cell for cell, its digits kept", () => {
  const russian = standIn("ru", h(Paragraph, { text: "Page 101 News" }));
  const run = (russian.text ?? []).find((each) => each.text.includes("101"));
  assert.ok(run !== undefined);
  assert.equal(run.language, "ru");
  assert.equal(textCells(run.text).length, "Page 101 News".length, "the same cells");
  assert.match(run.text, /^[а-яА-ЯёЁ ]{4} 101 [а-яА-ЯёЁ ]{4}$/u);
  assert.equal(
    standIn("en", h(Paragraph, { text: "Page 101 News" })).text?.some((each) => each.text === "Page 101 News"),
    true,
    "the channel's own language as written",
  );
});

test("stand-in: text that names its language, and the Fastext row, are drawn as written", () => {
  const russian = standIn("ru", h(Paragraph, { text: "Hello", language: "en" }));
  const texts = new Set((russian.text ?? []).map((run) => run.text));
  assert.ok(texts.has("Hello"));
  assert.ok(texts.has("Index"), "the Fastext prompt");
});

test("DEC-2238: punctuation between Arabic-script or kana words is the script's own, one run; in a Latin word or a number it is left as it is", () => {
  const arabic = languageOf("ar", SERVER_LANGUAGES);
  assert.deepEqual(
    textRuns(textCells("سعر, سعر"), arabic).map((run) => [run.cells.join(""), run.language]),
    [["سعر، سعر", "ar"]],
  );
  assert.deepEqual(
    textRuns(textCells("سعر a, b"), arabic).map((run) => [run.cells.join(""), run.language]),
    [
      ["سعر ", "ar"],
      ["a, b", "en"],
    ],
  );
  assert.deepEqual(
    textRuns(textCells("ヒト, ヒト"), languageOf("ja-Kana", SERVER_LANGUAGES)).map((run) => [run.cells.join(""), run.language]),
    [["ヒト、 ヒト", "ja-Kana"]],
  );
});
