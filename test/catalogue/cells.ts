// A row as a receiver shows it, cell by cell: what each cell draws, in
// what colour on what background, decoded from the row's codes as level 1
// decodes them (EN 300 706 clause 12.2 and Table 26). An attribute set at
// its cell (backgrounds, steady, normal size, conceal, contiguous,
// separated, hold) takes effect in that cell; one set after it (colours,
// flash, the double sizes, release) from the next. An attribute's cell
// shows as a space, or as the held mosaic while mosaics are held.

/** What a cell draws. */
export interface Cell {
  /** Its code: a character, a mosaic, or an attribute shown as a space. */
  readonly code: number;
  readonly foreground: number;
  readonly background: number;
  /** It draws a mosaic, not a character. */
  readonly mosaic: boolean;
  /** It is an attribute, shown as a space (or the held mosaic). */
  readonly attribute: boolean;
  readonly concealed: boolean;
}

/** Table 26's codes the decoding needs. */
const ALPHA_FIRST = 0x00;
const ALPHA_LAST = 0x07;
const MOSAIC_FIRST = 0x10;
const MOSAIC_LAST = 0x17;
const CONCEAL = 0x18;
const BLACK_BACKGROUND = 0x1c;
const NEW_BACKGROUND = 0x1d;
const LAST_ATTRIBUTE = 0x1f;
const SPACE = 0x20;
/** In mosaic mode the codes from 0x40 to 0x5F are characters still ("blast through"). */
const BLAST_FIRST = 0x40;
const BLAST_LAST = 0x5f;
/** What a row starts in: white text on black. */
const WHITE = 7;
const BLACK = 0;

/** The cells of `row`, a row's codes as a string of one character each. */
export function cellsOf(row: string): Cell[] {
  let foreground = WHITE;
  let background = BLACK;
  let mosaicMode = false;
  let concealed = false;
  const cells: Cell[] = [];
  for (const character of row) {
    const code = character.codePointAt(0) ?? SPACE;
    // Set-at attributes, before the cell is drawn.
    if (code === BLACK_BACKGROUND) {
      background = BLACK;
    } else if (code === NEW_BACKGROUND) {
      background = foreground;
    } else if (code === CONCEAL) {
      concealed = true;
    }
    const attribute = code <= LAST_ATTRIBUTE;
    const mosaic = !attribute && mosaicMode && (code < BLAST_FIRST || code > BLAST_LAST);
    cells.push({ code, foreground, background, mosaic, attribute, concealed });
    // Set-after attributes, from the next cell.
    if (code >= ALPHA_FIRST && code <= ALPHA_LAST) {
      foreground = code - ALPHA_FIRST;
      mosaicMode = false;
      concealed = false;
    } else if (code >= MOSAIC_FIRST && code <= MOSAIC_LAST) {
      foreground = code - MOSAIC_FIRST;
      mosaicMode = true;
      concealed = false;
    }
  }
  return cells;
}

/** Whether `cell` draws something to see: a character other than a space, or a mosaic with a sixel set. */
export function inks(cell: Cell): boolean {
  if (cell.attribute || cell.concealed) {
    return false;
  }
  // A space is blank as a character and as a mosaic: 0x20 sets no sixel.
  return cell.code !== SPACE;
}
