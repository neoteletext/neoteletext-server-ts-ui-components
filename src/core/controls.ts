// Controls (INPUT.md sections 7.3 and 9.7, REQ-INT-117 to REQ-INT-119; the
// engine's decision E.127): the cells a page answers itself, its buttons
// and the rows of its lists, declared in the page's own local enhancement
// data, packets X/26, by NeoTeletext's control triplet, column mode 00101,
// which EN 300 706 Table 29 reserves and every decoder skips. The browser
// shows them as it shows links and draws their hover and pressed looks
// itself, so a page that declares them is drawn the same everywhere.
// Pointer areas, column mode 01010, are withdrawn (INPUT.md section 7.4,
// 28 October 2026: every move over the page is sent, so an area asks for
// nothing); the mode is reserved again, as Table 29 has it.
//
// A control is one triplet on each row it covers, after a Set Active
// Position triplet for the row; its rows below the first are joined to it.
// enhancement.ts orders them with the page's display attributes.
// In TTI a packet X/26 is a packed OL,26 line: its designation code, then
// its thirteen triplets as 39 characters, six bits of a triplet's 18-bit
// value each, least significant first, each with bit 6 set so the line is
// printable (vbit2's form; the engine's tti/packed.rs and
// encode/triplets.rs). The server's TTI reader codes each triplet Hamming
// 24/18 (clause 8.3) as it makes the packets.

import { COLUMNS } from "../kit.ts";
import type { Box } from "./layout.ts";

/** Clause 12.3.1: a triplet's 18 bits are its address (6 bits), its mode (5) and its data (7), from the least significant. */
const ADDRESS_BITS = 6;
const MODE_BITS = 5;
const DATA_BITS = 7;
export const MODE_SHIFT = ADDRESS_BITS;
export const DATA_SHIFT = ADDRESS_BITS + MODE_BITS;
export const ADDRESS_MASK = (1 << ADDRESS_BITS) - 1;
export const MODE_MASK = (1 << MODE_BITS) - 1;
export const DATA_MASK = (1 << DATA_BITS) - 1;
/** Table 28, the row address group: Set Active Position. */
export const MODE_SET_ACTIVE_POSITION = 0b00100;
/** Table 29, a column mode EN 300 706 reserves: NeoTeletext's control (INPUT.md section 7.3). */
export const MODE_CONTROL = 0b00101;
/** Clause 12.3.1: row addresses are 40 to 63, 40 meaning row 24 and 41 to 63 rows 1 to 23. */
export const ROW_ADDRESS_BASE = 40;
/** Table 28: the Termination Marker, address 63 and mode 11111; its type, data 111, says the local enhancement data ends and no Local Object definitions follow. */
export const TERMINATION_ADDRESS = 63;
export const MODE_TERMINATION = 0b11111;
const TERMINATION_DATA = 0b111;
/** INPUT.md section 7.3: D6 joins a run to the control on the row above at the same column and width; D5 to D0 are its width. */
export const JOINED = 0x40;
export const WIDTH_MASK = 0x3f;
/** The rows a control may be on: not the header, not the Fastext row (the engine's FIRST_CONTROL_ROW and LAST_CONTROL_ROW). */
export const FIRST_CONTROL_ROW = 1;
export const LAST_CONTROL_ROW = 23;
/** The most controls a page has (the engine's MAX_CONTROLS, REQ-INT-118). */
export const MAX_CONTROLS = 32;
/** Clause 12.3.1: a packet X/26 holds 13 triplets after its designation code, which runs 0 to 15. */
export const TRIPLETS_PER_PACKET = 13;
const DESIGNATION_CODES = 16;
/** The local enhancement data's triplets: 16 packets of 13 (the engine's LOCAL_TRIPLETS). */
export const LOCAL_TRIPLETS = DESIGNATION_CODES * TRIPLETS_PER_PACKET;
/** The packet number of local enhancement data, written as the OL line's row. */
export const ENHANCEMENT_PACKET = 26;
/** A packed character: bit 6 set, six bits of a triplet below it (the engine's TTI_PACKED_CHARACTER_BASE and TTI_TRIPLET_CHARACTER_BITS). */
const PACKED_CHARACTER_BASE = 0x40;
export const PACKED_CHARACTER_BITS = 6;
export const PACKED_CHARACTER_MASK = 0x3f;
/** The characters of one triplet in a packed line. */
export const CHARACTERS_PER_TRIPLET = 3;
if (CHARACTERS_PER_TRIPLET * PACKED_CHARACTER_BITS !== ADDRESS_BITS + MODE_BITS + DATA_BITS) {
  throw new Error("a triplet's 18 bits are three packed characters of six");
}

/** A triplet's 18-bit value (clause 12.3.1). */
export function triplet(address: number, mode: number, data: number): number {
  return (address & ADDRESS_MASK) | ((mode & MODE_MASK) << MODE_SHIFT) | ((data & DATA_MASK) << DATA_SHIFT);
}

/** Set Active Position on `row`, 1 to 23, at column 0. */
export function setActivePosition(row: number): number {
  return triplet(ROW_ADDRESS_BASE + row, MODE_SET_ACTIVE_POSITION, 0);
}

/** A control's run on the active row: from `column`, `width` cells, joined to the run above or not. */
export function controlTriplet(column: number, width: number, joined: boolean): number {
  return triplet(column, MODE_CONTROL, width | (joined ? JOINED : 0));
}

/** The Termination Marker that ends the local enhancement data. */
export const TERMINATION = triplet(TERMINATION_ADDRESS, MODE_TERMINATION, TERMINATION_DATA);

function overlaps(a: Box, b: Box): boolean {
  return a.row < b.row + b.height && b.row < a.row + a.height && a.column < b.column + b.width && b.column < a.column + a.width;
}

/** `each` cut to rows 1 to 23 and the page's columns; nothing left is no width or no height. */
function cut(each: Box): Box {
  const row = Math.max(FIRST_CONTROL_ROW, each.row);
  const column = Math.max(0, each.column);
  return {
    row,
    column,
    width: Math.min(COLUMNS, each.column + each.width) - column,
    height: Math.min(LAST_CONTROL_ROW + 1, each.row + each.height) - row,
  };
}

/** The local data's triplets runs take: one for each row of each run, and a Set Active Position for each row no run before had. */
class Budget {
  // The Termination Marker is always sent.
  #used = 1;
  readonly #rows = new Set<number>();

  /** Takes the triplets `run` needs, if there is room. */
  take(run: Box): boolean {
    let newRows = 0;
    for (let at = run.row; at < run.row + run.height; at += 1) {
      newRows += this.#rows.has(at) ? 0 : 1;
    }
    if (this.#used + run.height + newRows > LOCAL_TRIPLETS) {
      return false;
    }
    this.#used += run.height + newRows;
    for (let at = run.row; at < run.row + run.height; at += 1) {
      this.#rows.add(at);
    }
    return true;
  }
}

/** What a page keeps of the controls its components declare. */
export interface Kept {
  readonly controls: readonly Box[];
  /** For each control kept, its place among those declared: what tells a hover's control's owner. */
  readonly declaredAt: readonly number[];
}

/**
 * What a page keeps of what it declares, in the order declared, as the
 * engine reads it (REQ-INT-118): each control cut to rows 1 to 23 and the
 * page's columns, and one with nothing left dropped; a control over a
 * control kept before it dropped; past MAX_CONTROLS dropped; and what the
 * local data has no triplets left for dropped.
 */
export function keptDeclarations(controls: readonly Box[]): Kept {
  const budget = new Budget();
  const held: Box[] = [];
  const declaredAt: number[] = [];
  controls.forEach((each, index) => {
    const control = cut(each);
    if (control.width > 0 && control.height > 0 && held.length < MAX_CONTROLS && !held.some((other) => overlaps(other, control)) && budget.take(control)) {
      held.push(control);
      declaredAt.push(index);
    }
  });
  return { controls: held, declaredAt };
}

/** The controls a page keeps of those declared (keptDeclarations). */
export function keptControls(declared: readonly Box[]): Box[] {
  return [...keptDeclarations(declared).controls];
}

/** One packet of thirteen triplets as a packed OL line for packet `packet` with `designation`, without its newline. */
export function packedLine(packet: number, designation: number, triplets: readonly number[]): string {
  if (triplets.length !== TRIPLETS_PER_PACKET) {
    throw new RangeError(`a packet holds ${TRIPLETS_PER_PACKET} triplets`);
  }
  const characters = triplets.flatMap((value) =>
    Array.from({ length: CHARACTERS_PER_TRIPLET }, (_, place) => PACKED_CHARACTER_BASE | ((value >> (place * PACKED_CHARACTER_BITS)) & PACKED_CHARACTER_MASK)),
  );
  return `OL,${packet},${String.fromCodePoint(PACKED_CHARACTER_BASE | designation, ...characters)}`;
}

/** Triplets as packed OL,26 lines, without newlines, designation codes from 0; the last packet's unused triplets are Termination Markers. */
export function enhancementLines(triplets: readonly number[]): string[] {
  if (triplets.length > LOCAL_TRIPLETS) {
    throw new RangeError(`the local enhancement data holds ${LOCAL_TRIPLETS} triplets`);
  }
  const lines: string[] = [];
  for (let start = 0; start < triplets.length; start += TRIPLETS_PER_PACKET) {
    const packet = triplets.slice(start, start + TRIPLETS_PER_PACKET);
    while (packet.length < TRIPLETS_PER_PACKET) {
      packet.push(TERMINATION);
    }
    lines.push(packedLine(ENHANCEMENT_PACKET, start / TRIPLETS_PER_PACKET, packet));
  }
  return lines;
}
