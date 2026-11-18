// A sub-page as a picture shows it (renderer parity PAR-42): its cells
// (cells.ts), which component's drawing or object each cell is drawn in,
// and what each of those is. An interactive component, one that takes the
// pointer or the keys or declares a control, is drawn as a numbered drawing
// (ReGIS) or an object (NAPLPS) of its own, holding every cell it and the
// components drawn within it paint, but those of an interactive component
// drawn within it, which are that one's. The rest of the page is the
// picture's base. A component keeps its number for as long as it is
// mounted (numbers.ts), so a render changes only what it changed.

import { type PictureCell, shownCells } from "./cells.ts";
import { COLUMNS, FIRST_TEXT_ROW, LAST_TEXT_ROW } from "./grid.ts";
import type { LanguageTag } from "../kit.ts";
import { RecordingScreen } from "./recording-screen.ts";
import type { Screen } from "../kit.ts";

/** A rectangle of cells of the page. */
export interface CellBox {
  readonly row: number;
  readonly column: number;
  readonly width: number;
  readonly height: number;
}

/** One interactive component as its picture draws it. */
export interface SceneComponent {
  /** Its drawing's or object's number, given by the library and kept while it is mounted. */
  readonly number: number;
  /** Pointer events report it: the component takes the pointer. */
  readonly detectable: boolean;
  /** What a screen reader says for it: the text its cells show. */
  readonly label: string;
  /** Where a link on it goes, as a link's target, or null. */
  readonly link: string | null;
  /** Its controls' cells, which its hover and pressed looks change (look.ts). */
  readonly controls: readonly CellBox[];
}

/** A sub-page as a picture. */
export interface PictureScene {
  /** Rows 1 to 23 as shown, indexed by the page's row. */
  readonly cells: readonly (readonly PictureCell[])[];
  /** For each cell of rows 1 to 23, the number of the component it is drawn in, or 0 for the base. */
  readonly owners: readonly (readonly number[])[];
  readonly components: ReadonlyMap<number, SceneComponent>;
  /** The caret of the focused text field: the cell the cursor is at, or null. */
  readonly cursor: { readonly row: number; readonly column: number } | null;
  /** The sub-page's language, which its text that names none is written in. */
  readonly language: LanguageTag;
}

/** What a scene is made from, for one painted component: its number when it is interactive (0 when not), its box, the controls it declared, its link, and the component it is drawn within. */
export interface PaintedComponent {
  readonly number: number;
  readonly detectable: boolean;
  readonly box: CellBox;
  readonly controls: readonly CellBox[];
  readonly link: string | null;
  /** The interactive component it is drawn within: its number, or 0 for none. */
  readonly within: number;
}

/** The most bytes of a label (regis-v2.md, `U`; ANIM-11's `MAX_LABEL_BYTES`): both renderers' limit is 64. */
const MOST_LABEL_CHARACTERS = 64;

/** The text of `number`'s cells, row by row, its spaces run together: what it shows, for a screen reader. */
function labelOf(cells: readonly (readonly PictureCell[])[], owners: readonly (readonly number[])[], number: number): string {
  const words: string[] = [];
  for (let row = FIRST_TEXT_ROW; row <= LAST_TEXT_ROW; row += 1) {
    let line = "";
    for (let column = 0; column < COLUMNS; column += 1) {
      const cell = cells[row]?.[column];
      if (owners[row]?.[column] === number && cell !== undefined) {
        line += cell.content.kind === "text" ? cell.content.written.text : " ";
      }
    }
    words.push(line);
  }
  return words.join(" ").replaceAll(/\s+/gu, " ").trim().slice(0, MOST_LABEL_CHARACTERS);
}

/**
 * The scene of a sub-page painted on `screen`: `painted` in the order they
 * painted, each over those before it, with the cursor's cell.
 */
export function sceneOf(
  screen: Screen,
  painted: readonly PaintedComponent[],
  cursor: { readonly row: number; readonly column: number } | null,
  language: LanguageTag,
): PictureScene {
  if (!(screen instanceof RecordingScreen)) {
    throw new TypeError("a picture's sub-page is drawn on a RecordingScreen (draw-picture.ts, screenFor)");
  }
  const cells = shownCells(screen);
  const owners: number[][] = Array.from({ length: LAST_TEXT_ROW + 1 }, () => Array.from({ length: COLUMNS }, () => 0));
  for (const each of painted) {
    const owner = each.number === 0 ? each.within : each.number;
    const { box } = each;
    for (let row = Math.max(FIRST_TEXT_ROW, box.row); row < box.row + box.height && row <= LAST_TEXT_ROW; row += 1) {
      const line = owners[row];
      for (let column = Math.max(0, box.column); column < box.column + box.width && column < COLUMNS; column += 1) {
        if (line !== undefined) {
          line[column] = owner;
        }
      }
    }
  }
  // A row under double height is drawn with the row above it, so its cells are that row's component's.
  for (let row = FIRST_TEXT_ROW + 1; row <= LAST_TEXT_ROW; row += 1) {
    if (cells[row]?.[0]?.covered === true) {
      owners[row] = [...(owners[row - 1] ?? [])];
    }
  }
  const components = new Map<number, SceneComponent>();
  for (const each of painted) {
    if (each.number !== 0 && owners.some((line) => line.includes(each.number))) {
      components.set(each.number, {
        number: each.number,
        detectable: each.detectable,
        label: labelOf(cells, owners, each.number),
        link: each.link,
        controls: each.controls,
      });
    }
  }
  const shownCursor = cursor !== null && cursor.row >= FIRST_TEXT_ROW && cursor.row <= LAST_TEXT_ROW ? cursor : null;
  return { cells, owners, components, cursor: shownCursor, language };
}
