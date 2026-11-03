// Stand-in text (DEC on stand-in text, REQ-2218): a channel that has no
// translation of its own words can still show every component in a
// viewer's language and script. Given text in that language (the channel's
// ComponentChannelOptions.standIn), each word of Latin letters the channel
// wrote without naming a language is drawn as as many cells of that text,
// so every component keeps its layout and shows real letters of the
// language. Digits, punctuation and spaces stay, so page numbers and
// navigation keep their meaning. The same word always gets the same
// stand-in, so a page reads the same each time it is drawn.

import { textCells } from "../kit.ts";
import type { CanvasCell } from "./canvas-parts.ts";

/** A word the stand-in replaces: a stretch of Latin letters. */
const LATIN_LETTER = /^[A-Za-z]$/u;
/** What the stand-in is made of: the language's letters with their marks, and the spaces between its words; its digits and punctuation are left out, as a language may lack ASCII's. */
const KEPT = /^[\p{L}\p{M}]+$/u;
const SPACE_CELL = " ";
/** FNV-1a's 32-bit offset basis and prime (the hash's published constants). */
const FNV_OFFSET = 0x81_1c_9d_c5;
const FNV_PRIME = 0x01_00_01_93;
/** The most cells of stand-in text kept: the opening of a text is enough to vary every word, and a channel's text is not trusted to be small. */
const MOST_CELLS = 4096;

/** A word's place in the stand-in, the same for the same word every time. */
function hashOf(word: string): number {
  let hash = FNV_OFFSET;
  for (const character of word) {
    hash = Math.imul(hash ^ (character.codePointAt(0) ?? 0), FNV_PRIME) >>> 0;
  }
  return hash;
}

/** Text in a language, cell by cell, drawn in place of the words of Latin letters a channel wrote in English. */
export class StandIn {
  /** Its cells: letters, and a single space between its words. */
  readonly #cells: readonly string[];
  /** Where each of its words starts. */
  readonly #starts: readonly number[];

  /** From `text` in the language; empty when it has no letters, and then it changes nothing. */
  constructor(text: string) {
    const kept: string[] = [];
    for (const cell of textCells(text).slice(0, MOST_CELLS)) {
      if (KEPT.test(cell)) {
        kept.push(cell);
      } else if (kept.length > 0 && kept.at(-1) !== SPACE_CELL) {
        kept.push(SPACE_CELL);
      }
    }
    while (kept.at(-1) === SPACE_CELL) {
      kept.pop();
    }
    this.#cells = kept;
    this.#starts = kept.flatMap((cell, at) => (cell !== SPACE_CELL && (at === 0 || kept[at - 1] === SPACE_CELL) ? [at] : []));
  }

  /** `count` cells of the stand-in for `word`, from the start of one of its words, round again at its end. */
  #for(word: string, count: number): string[] {
    const start = this.#starts[hashOf(word) % this.#starts.length] ?? 0;
    return Array.from({ length: count }, (_cell, offset) => this.#cells[(start + offset) % this.#cells.length] ?? SPACE_CELL);
  }

  /** `cells` with each stretch of Latin letters replaced by as many cells of the stand-in. */
  cells(cells: readonly CanvasCell[]): CanvasCell[] {
    if (this.#starts.length === 0) {
      return [...cells];
    }
    const out: CanvasCell[] = [];
    let word: string[] = [];
    const flush = (): void => {
      if (word.length > 0) {
        out.push(...this.#for(word.join(""), word.length));
        word = [];
      }
    };
    for (const cell of cells) {
      if (typeof cell === "string" && LATIN_LETTER.test(cell)) {
        word.push(cell);
        continue;
      }
      flush();
      out.push(cell);
    }
    flush();
    return out;
  }

  /** `text` with each word of Latin letters replaced, cell for cell. */
  text(text: string): string {
    return this.cells(textCells(text)).join("");
  }
}
