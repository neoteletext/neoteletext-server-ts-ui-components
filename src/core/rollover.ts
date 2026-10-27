// Rollover colours: what a control looks like under the pointer. The
// browser draws a control's hover look itself by moving each of its
// cells' colours to the same entry of the adjacent colour table, CLUT 0
// to CLUT 1 and CLUT 2 to CLUT 3 (INPUT.md section 9.7; the engine's
// controls.rs, ADJACENT_CLUT_FLIP). CLUT 1 is fixed at Level 2.5: the
// half-intensity colours, and transparent for black, so white text on
// black only dims to grey and a black background does not change.
//
// A page can choose its own instead with packet X/28/0 format 1 (EN 300
// 706 clause 9.4.2, Table 4), which a Level 2.5 receiver reads: it
// redefines CLUTs 2 and 3, and its Colour Table Re-mapping 6 (Table 4,
// triplet 13 bits 16 to 18) makes the Level 1 colour codes select CLUT 2.
// CLUT 2 is given the Level 1 colours, so the page looks as it did; CLUT 3
// is given each colour's rollover colour, which the hover look then shows.
// A receiver of Level 1 or 1.5 ignores the packet, and has no hover look.
//
// The packet also carries the page's character set designation: English,
// the Latin set with its English national option and no second G0 set
// (Tables 32 and 33), which the kit's pages are. Its page function is a
// basic Level 1 page, so the engine reads the designation (its
// level1/designation.rs). No side panels; screen and row colour black; no
// Black Background Colour Substitution.

import { packedLine } from "./controls.ts";

/** A 12-bit colour, 0xRGB, four bits a primary (Table 30). */
export type Rgb12 = number;

/** The eight colours of a colour table, in the order of the Level 1 colour codes: black, red, green, yellow, blue, magenta, cyan, white. */
export type ColourTable = readonly [Rgb12, Rgb12, Rgb12, Rgb12, Rgb12, Rgb12, Rgb12, Rgb12];

/** The Level 1 colours (Table 30, CLUT 0), which CLUT 2 is given so the page looks as it would without the packet. */
export const LEVEL_1_COLOURS: ColourTable = [0x000, 0xf00, 0x0f0, 0xff0, 0x00f, 0xf0f, 0x0ff, 0xfff];

/**
 * The rollover colours the library gives a page: each colour paled toward
 * white, as Table 30's own CLUT 3 has them, so a control lightens under
 * the pointer whatever its colours; black, CLUT 3's dark grey there, is a
 * grey that shows on black.
 */
export const ROLLOVER_COLOURS: ColourTable = [0x444, 0xf77, 0x7f7, 0xff7, 0x77f, 0xf7f, 0x7ff, 0xddd];

/** Packet X/28 is packet 28; designation code 0 is X/28/0. */
const PAGE_ENHANCEMENT_PACKET = 28;
const DESIGNATION_PAGE_DATA = 0;
/** Clause 12.3.1: a packet's thirteen triplets of 18 bits, read as one stream of bits from triplet 1's least significant. */
const TRIPLETS_PER_PACKET = 13;
const TRIPLET_BITS = 18;
/** Table 4, triplet 1: bits 1 to 4 the page function (0000, a basic Level 1 page), 5 to 7 the page coding (000, seven bits and odd parity), 8 to 14 the default G0 and G2 designation, 15 to 18 the low four bits of the second G0 designation. */
const DEFAULT_DESIGNATION_SHIFT = 7;
const SECOND_DESIGNATION_LOW_SHIFT = 14;
const SECOND_DESIGNATION_LOW_BITS = 4;
const NIBBLE = 0xf;
/** Table 32: the Latin set with the English national option, designation 0000 000. */
const DESIGNATION_LATIN_ENGLISH = 0x00;
/** Table 33: 1111 111, no second G0 set. */
const NO_SECOND_G0 = 0x7f;
/** Table 4: the sixteen colour words, CLUT 2's entries 0 to 7 then CLUT 3's, start at bit 11 of triplet 2 (stream bit 28), twelve bits each: red, green, blue, four bits each from the least significant. */
const COLOUR_WORDS_START = 28;
const COLOUR_WORD_BITS = 12;
const PRIMARY_BITS = 4;
/** Table 4, triplet 13: bits 16 to 18, Colour Table Re-mapping; 6 is foreground CLUT 2, background CLUT 2 (the engine's REMAPPING_CLUTS). */
const REMAPPING_SHIFT = 15;
const REMAPPING_CLUT_2 = 6;
/** Where the stream's last colour word ends: triplet 13's bits 1 to 4, before its colour fields. */
const LAST_TRIPLET = TRIPLETS_PER_PACKET - 1;
if (COLOUR_WORDS_START + 2 * LEVEL_1_COLOURS.length * COLOUR_WORD_BITS > LAST_TRIPLET * TRIPLET_BITS + PRIMARY_BITS) {
  throw new Error("Table 4's sixteen colour words end at triplet 13 bit 4");
}

/** Sets `count` bits of `value` from bit `start` of the packet's stream of triplet bits. */
function setBits(triplets: number[], start: number, count: number, value: number): void {
  for (let offset = 0; offset < count; offset += 1) {
    const position = start + offset;
    const index = Math.floor(position / TRIPLET_BITS);
    if (((value >> offset) & 1) === 1) {
      triplets[index] = (triplets[index] ?? 0) | (1 << (position % TRIPLET_BITS));
    }
  }
}

/** A colour word as Table 4 carries it: red in the low four bits, then green, then blue. */
function colourWord(colour: Rgb12): number {
  const red = (colour >> (2 * PRIMARY_BITS)) & NIBBLE;
  const green = (colour >> PRIMARY_BITS) & NIBBLE;
  const blue = colour & NIBBLE;
  return red | (green << PRIMARY_BITS) | (blue << (2 * PRIMARY_BITS));
}

/** The thirteen triplets of X/28/0 format 1 that give a page `rollover` as its controls' hover colours. */
function rolloverTriplets(rollover: ColourTable = ROLLOVER_COLOURS): number[] {
  const triplets = Array.from({ length: TRIPLETS_PER_PACKET }, () => 0);
  triplets[0] = (DESIGNATION_LATIN_ENGLISH << DEFAULT_DESIGNATION_SHIFT) | ((NO_SECOND_G0 & NIBBLE) << SECOND_DESIGNATION_LOW_SHIFT);
  triplets[1] = NO_SECOND_G0 >> SECOND_DESIGNATION_LOW_BITS;
  [...LEVEL_1_COLOURS, ...rollover].forEach((colour, index) => {
    setBits(triplets, COLOUR_WORDS_START + index * COLOUR_WORD_BITS, COLOUR_WORD_BITS, colourWord(colour));
  });
  triplets[LAST_TRIPLET] = (triplets[LAST_TRIPLET] ?? 0) | (REMAPPING_CLUT_2 << REMAPPING_SHIFT);
  return triplets;
}

/** The packed OL,28 line, without its newline, that gives a page `rollover` as its controls' hover colours. */
export function rolloverLine(rollover: ColourTable = ROLLOVER_COLOURS): string {
  return packedLine(PAGE_ENHANCEMENT_PACKET, DESIGNATION_PAGE_DATA, rolloverTriplets(rollover));
}
