// A page's controls and pointer areas read back from its TTI, as the
// engine reads them (its controls.rs), for tests: what controls.ts writes.

import type { Box } from "./component.ts";
import {
  ADDRESS_MASK,
  CHARACTERS_PER_TRIPLET,
  DATA_MASK,
  DATA_SHIFT,
  ENHANCEMENT_PACKET,
  JOINED,
  LAST_CONTROL_ROW,
  MODE_CONTROL,
  MODE_MASK,
  MODE_POINTER_AREA,
  MODE_SET_ACTIVE_POSITION,
  MODE_SHIFT,
  MODE_TERMINATION,
  PACKED_CHARACTER_BITS,
  PACKED_CHARACTER_MASK,
  ROW_ADDRESS_BASE,
  TERMINATION_ADDRESS,
  TRIPLETS_PER_PACKET,
  WIDTH_MASK,
} from "./controls.ts";

/** What a sub-page declares, as a receiver reads it back. */
export interface Declarations {
  readonly controls: Box[];
  readonly pointer: { readonly areas: Box[]; readonly wholePage: boolean };
}

/** A run on `row` from `address` into `list`: a new one, or the one above it made taller when joined and there is one to join; one of no width is dropped, as the engine drops it. */
function readRun(list: { row: number; column: number; width: number; height: number }[], row: number, address: number, data: number): void {
  const width = data & WIDTH_MASK;
  if (width === 0) {
    return;
  }
  const above = (data & JOINED) === 0 ? undefined : list.find((each) => each.row + each.height === row && each.column === address && each.width === width);
  if (above === undefined) {
    list.push({ row, column: address, width, height: 1 });
  } else {
    above.height += 1;
  }
}

/** Each sub-page's OL,26 packets of `tti`, by designation code, each as its thirteen triplets. */
function packetsOf(tti: string): Map<number, number[]>[] {
  const pages: Map<number, number[]>[] = [];
  for (const line of tti.split("\n")) {
    if (line.startsWith("PN,")) {
      pages.push(new Map());
    }
    const prefix = `OL,${ENHANCEMENT_PACKET},`;
    const packets = pages.at(-1);
    if (!line.startsWith(prefix) || packets === undefined) {
      continue;
    }
    const codes = Array.from(line.slice(prefix.length), (character) => (character.codePointAt(0) ?? 0) & PACKED_CHARACTER_MASK);
    const [designation = 0, ...body] = codes;
    packets.set(
      designation,
      Array.from({ length: TRIPLETS_PER_PACKET }, (_, index) => {
        const [low = 0, middle = 0, high = 0] = body.slice(index * CHARACTERS_PER_TRIPLET, (index + 1) * CHARACTERS_PER_TRIPLET);
        return low | (middle << PACKED_CHARACTER_BITS) | (high << (2 * PACKED_CHARACTER_BITS));
      }),
    );
  }
  return pages;
}

/** What one sub-page's packets declare: their triplets in designation order, to the first Termination Marker. */
function declarationsOf(packets: ReadonlyMap<number, readonly number[]>): Declarations {
  const found = { controls: [] as Box[], pointer: { areas: [] as Box[], wholePage: false } };
  const controls: { row: number; column: number; width: number; height: number }[] = [];
  const areas: { row: number; column: number; width: number; height: number }[] = [];
  let row = 0;
  const triplets = [...packets.entries()].toSorted(([a], [b]) => a - b).flatMap(([, values]) => values);
  for (const value of triplets) {
    const address = value & ADDRESS_MASK;
    const mode = (value >> MODE_SHIFT) & MODE_MASK;
    const data = (value >> DATA_SHIFT) & DATA_MASK;
    if (address === TERMINATION_ADDRESS && mode === MODE_TERMINATION) {
      break;
    }
    if (address >= ROW_ADDRESS_BASE && mode === MODE_SET_ACTIVE_POSITION) {
      row = address === ROW_ADDRESS_BASE ? LAST_CONTROL_ROW + 1 : address - ROW_ADDRESS_BASE;
    } else if (address < ROW_ADDRESS_BASE && mode === MODE_CONTROL) {
      readRun(controls, row, address, data);
    } else if (address < ROW_ADDRESS_BASE && mode === MODE_POINTER_AREA) {
      if (data === 0) {
        found.pointer.wholePage = true;
      } else {
        readRun(areas, row, address, data);
      }
    }
  }
  found.controls.push(...controls);
  found.pointer.areas.push(...areas);
  return found;
}

/**
 * The controls and pointer areas each sub-page of `tti` declares, read back
 * as the engine reads them (its controls.rs): its OL,26 lines in
 * designation order to the first Termination Marker, the row from each Set
 * Active Position, a joined run making the one above it taller, a pointer
 * area of width 0 not joined the whole page. For tests.
 */
export function readDeclarations(tti: string): Declarations[] {
  return packetsOf(tti).map((packets) => declarationsOf(packets));
}

/** The controls each sub-page of `tti` declares (readDeclarations). For tests. */
export function readControls(tti: string): Box[][] {
  return readDeclarations(tti).map((each) => each.controls);
}
