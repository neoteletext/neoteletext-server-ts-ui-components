// A page's language and its text's (REQ-2152, REQ-2217): a tag of the
// server's languages (start.languages, REQ-2215), each with the way it is
// written and whether its marks take the rows above and below its letters.
// A component's language is the nearest `language` prop above it, or the
// page's, or the viewer's (the `language` cookie), or the channel's.

import type { Language, LanguageTag } from "../kit.ts";
import type { Node } from "./node.ts";
import { UNSHOWN } from "./unshown.ts";

/** The language of a channel that names none, and of a viewer with no `language` cookie: Latin English. */
export const ENGLISH: LanguageTag = "en";

/** The cookie a viewer's language is kept in (REQ-2217 item 2). */
export const LANGUAGE_COOKIE = "language";

/**
 * The rows a run whose marks take the rows above and below may be on
 * (the server's mark_rows_out_of_range): 2 to 23, so its marks are within
 * rows 1 to 24.
 */
export const FIRST_MARKED_ROW = 2;
export const LAST_MARKED_ROW = 23;

/** The rows a line of a language takes: its own, and for Thai and Lao one above and one below for its marks. */
export function lineRows(language: Language): number {
  return 1 + 2 * language.markRows;
}

/** The rows double height takes: its own and the row below (EN 300 706 clause 12.3). */
const DOUBLE_HEIGHT_ROWS = 2;

/** The rows a line takes in `language`, asked for in double height or not (DEC-2222): three where its marks take the rows around it, whatever was asked, else two for double height and one otherwise. */
export function linePitch(language: Language, doubleHeight: boolean): number {
  if (language.markRows > 0) {
    return lineRows(language);
  }
  return doubleHeight ? DOUBLE_HEIGHT_ROWS : 1;
}

/** The cells a line takes before its text: its colour's, and Double Height's when asked (Canvas.line). */
export function leadCells(doubleHeight: boolean): number {
  return doubleHeight ? DOUBLE_HEIGHT_ROWS : 1;
}

/** The language `tag` names among `languages`; one the server did not list (or before it said) is taken as written left to right, with no mark rows. */
export function languageOf(tag: LanguageTag, languages: readonly Language[]): Language {
  return languages.find((language) => language.tag === tag) ?? { tag, name: tag, direction: "ltr", markRows: 0 };
}

/** The language of `node`'s text: the nearest `language` prop from it up, else `base`. */
export function nearestLanguage(node: Node | null, base: LanguageTag, languages: readonly Language[]): Language {
  for (let at = node; at !== null; at = at.parent) {
    const { language } = at.element.props;
    if (language !== undefined) {
      return languageOf(language, languages);
    }
  }
  return languageOf(base, languages);
}

/** Whether `value` is a tag of `languages`: a prop or a cookie, which may name anything, is taken only then. */
export function isListed(value: unknown, languages: readonly Language[]): value is LanguageTag {
  return typeof value === "string" && languages.some((language) => language.tag === value);
}

/**
 * The stand-ins of the characters of printable ASCII that English cannot
 * show (EN 300 706 Table 36 puts arrows and fractions at their codes), as
 * the kit folded them before the server encoded text: written where the
 * text's own language cannot show them either, so a page is never refused
 * for them.
 */
const FOLDED: ReadonlyMap<string, string> = new Map([
  ["[", "("],
  ["]", ")"],
  ["{", "("],
  ["}", ")"],
  ["\\", "/"],
  ["|", "/"],
  ["^", " "],
  ["~", "-"],
]);

/** What no language's sets show (unshown.ts leaves them out). */
const NO_SET_SHOWS: ReadonlySet<string> = new Set(["[", "]", "{", "}", "\\", "|", "~"]);

/** A cell of printable ASCII, a space included. */
const ASCII_PRINTABLE = /^[\u0020-\u007E]$/u;
const SPACE_CELL = " ";

/** A stretch of a line's cells and the language it is written in. */
export interface LanguageRun {
  readonly from: number;
  readonly cells: readonly string[];
  readonly language: LanguageTag;
}

/** Whether `language` cannot show `cell` (unshown.ts). */
function unshownIn(language: LanguageTag, cell: string): boolean {
  return UNSHOWN[language].includes(cell);
}

/**
 * Text in `language` as runs the server can show (REQ-2152 item 6): a
 * character neither its sets nor English's show is folded to its stand-in
 * (FOLDED); each stretch of ASCII with a character its sets lack (a digit
 * in Arabic, an @ in German), or with a Latin letter where they lack some
 * (a Latin word in Russian), and each arrow they lack, is written in English, whose set every page reaches; the rest stays
 * in `language`.
 */
export function textRuns(cells: readonly string[], language: Language): LanguageRun[] {
  const { tag } = language;
  const folded = cells.map((cell) => {
    const stand = FOLDED.get(cell);
    // UNSHOWN leaves out what no language shows: those are folded always, the rest where neither the language nor English shows them.
    const folds = stand !== undefined && (NO_SET_SHOWS.has(cell) || (unshownIn(tag, cell) && unshownIn(ENGLISH, cell)));
    return folds ? stand : cell;
  });
  // A language whose sets lack some Latin letters writes every Latin word in English, rather than a word's letters in two sets; one whose marks take the rows around its letters writes all its ASCII so, which has no marks and so needs no rows.
  const latinWords = /[A-Za-z]/u.test(UNSHOWN[tag]);
  const english = folded.map(
    (cell) =>
      tag !== ENGLISH &&
      (unshownIn(tag, cell) || (latinWords && /^[A-Za-z]$/u.test(cell)) || (language.markRows > 0 && ASCII_PRINTABLE.test(cell) && cell !== SPACE_CELL)),
  );
  // A stretch of ASCII goes whole to English when any of it must, but for the spaces at its ends.
  let start = 0;
  for (let at = 0; at <= folded.length; at += 1) {
    const cell = folded[at];
    if (cell !== undefined && ASCII_PRINTABLE.test(cell)) {
      continue;
    }
    if (english.slice(start, at).some(Boolean)) {
      let from = start;
      let to = at;
      while (from < to && folded[from] === SPACE_CELL) {
        from += 1;
      }
      while (to > from && folded[to - 1] === SPACE_CELL) {
        to -= 1;
      }
      english.fill(true, from, to);
    }
    start = at + 1;
  }
  const runs: LanguageRun[] = [];
  folded.forEach((cell, at) => {
    const written = english[at] === true ? ENGLISH : tag;
    const last = runs.at(-1);
    if (last !== undefined && last.language === written && last.from + last.cells.length === at) {
      runs[runs.length - 1] = { ...last, cells: [...last.cells, cell] };
    } else {
      runs.push({ from: at, cells: [cell], language: written });
    }
  });
  return runs;
}
