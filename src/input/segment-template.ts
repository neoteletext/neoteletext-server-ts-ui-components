// A segment field's template (segment-field.ts) read: which of its
// characters are slots for digits, and the segments the slots make between
// the characters that stand as they are; its value, a character a slot,
// read back into digits; and the template drawn with them in it.

import { COLUMNS, englishCodes } from "../kit.ts";
import { CURSOR_BLOCK, firstCharacters } from "./drawn-line.ts";

/** What marks a slot for a digit in the template. */
const SLOT = "9";
/** What an empty slot shows. */
const FILL = "-";
/** What a filled slot of a concealed field shows. */
const CONCEALED = "*";
/** A slot no digit fills, in the value: the value is a character a slot, its end trimmed. */
const HOLE = " ";
/** The most characters of a template read: no more than a row shows. */
const TEMPLATE_LONGEST = COLUMNS;
/** A digit's characters. */
const DIGIT = /^[0-9]$/u;

/** A template read: its characters, and which of them are slots, segment by segment. */
export interface Template {
  readonly pieces: readonly string[];
  /** Each piece's slot, from 0 left to right, or null for a piece that stands as it is. */
  readonly slotOf: readonly (number | null)[];
  /** The slots' count. */
  readonly slots: number;
  /** Each segment's slots, left to right. */
  readonly segments: readonly (readonly number[])[];
}

/** A slot's digit, or null while it has none. */
export type Slot = string | null;

/** `template` read, cut to what a row shows: a program's template is not taken on trust. */
export function readTemplate(template: string): Template {
  const pieces = firstCharacters(template, TEMPLATE_LONGEST);
  const slotOf: (number | null)[] = [];
  const segments: number[][] = [];
  let slots = 0;
  let segment: number[] | null = null;
  for (const piece of pieces) {
    if (piece !== SLOT) {
      slotOf.push(null);
      segment = null;
      continue;
    }
    if (segment === null) {
      segment = [];
      segments.push(segment);
    }
    segment.push(slots);
    slotOf.push(slots);
    slots += 1;
  }
  return { pieces, slotOf, slots, segments };
}

/** Each of `count` slots' digit in `value`, or null: what is not a digit fills none. */
export function digitsOf(value: string, count: number): Slot[] {
  const read = firstCharacters(value, count);
  return Array.from({ length: count }, (_, slot) => {
    const character = read[slot] ?? "";
    return DIGIT.test(character) ? character : null;
  });
}

/** The value `digits` make: a character a slot, a hole a space, the end trimmed. */
export function valueOf(digits: readonly Slot[]): string {
  return digits
    .map((digit) => digit ?? HOLE)
    .join("")
    .trimEnd();
}

/** The first empty slot, or the count when none is. */
export function firstEmpty(digits: readonly Slot[]): number {
  const empty = digits.indexOf(null);
  return empty < 0 ? digits.length : empty;
}

/** The template with each slot's digit in it, or the fill where it has none. */
export function filledText(template: Template, digits: readonly Slot[]): string {
  return template.pieces
    .map((piece, place) => {
      const slot = template.slotOf[place] ?? null;
      return slot === null ? piece : (digits[slot] ?? FILL);
    })
    .join("");
}

/** The template drawn: its codes, and where among them the cursor's slot is, or null where it shows none. */
export interface TemplateCodes {
  readonly codes: readonly number[];
  readonly cursorAt: number | null;
}

/** The codes `template` is drawn in with `digits` in it: the cursor's slot, when it is empty, a block; a filled slot `*` when concealed. */
export function templateCodes(template: Template, digits: readonly Slot[], cursor: number | null, conceal: boolean): TemplateCodes {
  const codes: number[] = [];
  let cursorAt: number | null = null;
  for (const [place, piece] of template.pieces.entries()) {
    const slot = template.slotOf[place] ?? null;
    if (slot === null) {
      codes.push(...englishCodes(piece));
      continue;
    }
    if (slot === cursor) {
      cursorAt = codes.length;
    }
    const digit = digits[slot] ?? null;
    if (digit === null) {
      codes.push(...(slot === cursor ? [CURSOR_BLOCK] : englishCodes(FILL)));
    } else {
      codes.push(...englishCodes(conceal ? CONCEALED : digit));
    }
  }
  return { codes, cursorAt };
}

/** The digits of typed or pasted `text`, read no further than a template's characters: a longer paste is no code. */
export function digitsTyped(text: string): string[] {
  return firstCharacters(text, TEMPLATE_LONGEST).filter((character) => DIGIT.test(character));
}
