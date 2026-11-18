// A page's language and its text's (REQ-2152, REQ-2217): a tag of the
// server's languages (start.languages, REQ-2215), each with the way it is
// written.
// A component's language is the nearest `language` prop above it, or the
// page's, or the viewer's (the one they chose), or the channel's.

import type { Language, LanguageTag } from "../kit.ts";
import type { Node } from "./node.ts";
import type { StandIn } from "./stand-in.ts";
import { OWN_CODES } from "./own-codes.ts";
import { UNSHOWN } from "./unshown.ts";

/** The language of a channel that names none, and of a viewer who chose none: Latin English. */
export const ENGLISH: LanguageTag = "en";

/** The cells Double Height takes with a line's colour before its text (Canvas.line). */
const DOUBLE_HEIGHT_LEAD = 2;

/** The cells a line takes before its text: its colour's, and Double Height's when asked (Canvas.line). */
export function leadCells(doubleHeight: boolean): number {
  return doubleHeight ? DOUBLE_HEIGHT_LEAD : 1;
}

/**
 * The language a component's text is drawn in: a language of the server's,
 * and, where the language is the viewer's and not the channel's and the
 * channel gave text of it, the stand-in its words of Latin letters are drawn
 * as (stand-in.ts).
 */
export interface TextLanguage extends Language {
  readonly standIn?: StandIn;
  /** Text from outside the program, what a viewer typed: the server shows a stand-in for what its language cannot show, rather than refuse the page (DEC-2326, REQ-2150). */
  readonly outside?: boolean;
}

/** The language `tag` names among `languages`; one the server did not list (or before it said) is taken as written left to right. */
export function languageOf(tag: LanguageTag, languages: readonly Language[]): Language {
  return languages.find((language) => language.tag === tag) ?? { tag, name: tag, direction: "ltr" };
}

/** `language` with no stand-in: its text drawn as it is written. */
export function asWritten(language: Language): Language {
  const { tag, name, direction } = language;
  return { tag, name, direction };
}

/** The nearest `language` prop from `node` up, or undefined when none names one. */
function namedLanguage(node: Node | null): LanguageTag | undefined {
  for (let at = node; at !== null; at = at.parent) {
    const { language } = at.element.props;
    if (language !== undefined) {
      return language;
    }
  }
  return undefined;
}

/** Whether the nearest `outside` prop from `node` up marks its text as from outside the program; unmarked when none says. */
function markedOutside(node: Node | null): boolean {
  for (let at = node; at !== null; at = at.parent) {
    const { outside } = at.element.props;
    if (outside !== undefined) {
      return outside;
    }
  }
  return false;
}

/** `language`, marked as from outside the program when `outside`. */
export function fromOutside(language: TextLanguage, outside: boolean): TextLanguage {
  return outside ? { ...language, outside: true } : language;
}

/**
 * The language a component's text is drawn in: `named`, a `language` prop
 * or the page's, as written; else the `viewer`'s, with the channel's
 * stand-in for its words in it where there is one (`standIn`).
 */
function textLanguageOf(
  named: LanguageTag | null,
  viewer: () => LanguageTag,
  languages: readonly Language[],
  standIn: (language: LanguageTag) => StandIn | undefined,
): TextLanguage {
  if (named !== null) {
    return languageOf(named, languages);
  }
  const language = languageOf(viewer(), languages);
  const found = standIn(language.tag);
  return found === undefined ? language : { ...language, standIn: found };
}

/**
 * The language `node`'s text is drawn in (textLanguageOf): its nearest
 * `language` prop's, else `page`'s, else the `viewer`'s; from outside the
 * program when its nearest `outside` prop says so.
 */
export function nodeLanguage(
  node: Node | null,
  page: LanguageTag | null,
  viewer: () => LanguageTag,
  languages: readonly Language[],
  standIn: (language: LanguageTag) => StandIn | undefined,
): TextLanguage {
  return fromOutside(textLanguageOf(namedLanguage(node) ?? page, viewer, languages, standIn), markedOutside(node));
}

/** Whether `value` is a tag of `languages`: a prop or a kept choice, which may name anything, is taken only then. */
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

/** The Arabic script's own comma, semicolon and question mark, for ASCII's that its sets lack (unshown.ts). */
const ARABIC_PUNCTUATION: ReadonlyMap<string, string> = new Map([
  [",", "\u060C"],
  [";", "\u061B"],
  ["?", "\u061F"],
]);

/** The Japanese kana's comma, for ASCII's, which the kana sets lack (unshown.ts). */
const KANA_PUNCTUATION: ReadonlyMap<string, string> = new Map([[",", "\u3001"]]);

/**
 * The languages whose sets lack ASCII punctuation but show their script's
 * own (read on 3 November 2026 from the demo site's character tables, the
 * engine's decoder's reading of each set): punctuation between their words
 * is written as their own, which keeps a line one run.
 */
const OWN_PUNCTUATION: Readonly<Partial<Record<LanguageTag, ReadonlyMap<string, string>>>> = {
  ja: KANA_PUNCTUATION,
  "ja-Hira": KANA_PUNCTUATION,
  "ja-Hrkt": KANA_PUNCTUATION,
  "ja-Kana": KANA_PUNCTUATION,
  ar: ARABIC_PUNCTUATION,
  bal: ARABIC_PUNCTUATION,
  ckb: ARABIC_PUNCTUATION,
  fa: ARABIC_PUNCTUATION,
  prs: ARABIC_PUNCTUATION,
  ps: ARABIC_PUNCTUATION,
  sd: ARABIC_PUNCTUATION,
  ug: ARABIC_PUNCTUATION,
  ur: ARABIC_PUNCTUATION,
};

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

/** Puts `tag`'s own punctuation for each cell from `from` to before `to` its sets lack and it has its own for, when that stretch of ASCII has no letter or digit: punctuation between words of the language, not in a Latin word or a number. Answers whether every cell it lacks was put so. */
function ownPunctuation(cells: string[], from: number, to: number, tag: LanguageTag): boolean {
  const own = OWN_PUNCTUATION[tag];
  const stretch = cells.slice(from, to);
  if (own === undefined || stretch.some((cell) => /^[A-Za-z0-9]$/u.test(cell)) || !stretch.every((cell) => !unshownIn(tag, cell) || own.has(cell))) {
    return false;
  }
  for (let at = from; at < to; at += 1) {
    cells[at] = own.get(cells[at] ?? "") ?? cells[at] ?? "";
  }
  return true;
}

/** `cells` with what neither `tag`'s sets nor English's show folded to its stand-in (FOLDED). */
function foldedCells(cells: readonly string[], tag: LanguageTag): string[] {
  return cells.map((cell) => {
    const stand = FOLDED.get(cell);
    // UNSHOWN leaves out what no language shows: those are folded always, the rest where neither the language nor English shows them.
    const folds = stand !== undefined && (NO_SET_SHOWS.has(cell) || (unshownIn(tag, cell) && unshownIn(ENGLISH, cell)));
    return folds ? stand : cell;
  });
}

/** The printable ASCII `tag`'s own set shows at their own codes (own-codes.ts), for the kit to leave runs of them to their codes past 64 a page. */
export function ownCodesOf(tag: LanguageTag): string {
  return OWN_CODES[tag] ?? "";
}

/**
 * Text in `language` as runs the server can show (REQ-2152 item 6): a
 * character neither its sets nor English's show is folded to its stand-in
 * (FOLDED); each stretch of ASCII with a character its sets lack (a digit
 * in Arabic, an @ in German), or with a Latin letter where they lack some
 * (a Latin word in Russian), and each arrow they lack, is written in
 * English, whose set every page reaches; the rest stays in `language`. In
 * a stretch of only punctuation between words of a language whose script
 * has its own (Arabic's comma, the kana's) is written as its own.
 */
export function textRuns(cells: readonly string[], language: Language): LanguageRun[] {
  const { tag } = language;
  const folded = foldedCells(cells, tag);
  // A language whose sets lack some Latin letters writes every Latin word in English, rather than a word's letters in two sets.
  const latinWords = /[A-Za-z]/u.test(UNSHOWN[tag]);
  const english = folded.map((cell) => tag !== ENGLISH && (unshownIn(tag, cell) || (latinWords && /^[A-Za-z]$/u.test(cell))));
  // A stretch of ASCII goes whole to English when any of it must, but for the spaces at its ends.
  let start = 0;
  for (let at = 0; at <= folded.length; at += 1) {
    const cell = folded[at];
    if (cell !== undefined && ASCII_PRINTABLE.test(cell)) {
      continue;
    }
    if (english.slice(start, at).some(Boolean) && ownPunctuation(folded, start, at, tag)) {
      english.fill(false, start, at);
    } else if (english.slice(start, at).some(Boolean)) {
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
