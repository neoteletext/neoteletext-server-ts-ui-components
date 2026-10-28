// Places marked on a map: the map a bitmap of sixels drawn in one colour
// (mosaic.ts) or a picture's TTI rows (picture.ts), the caller's, and each
// place a mark with its name beside it, put by its latitude and longitude
// within the map's bounds, the map taken as a plain grid of degrees
// (equirectangular). A mark and its name are text over the map: the text's
// colour takes the cell before them, and the cell after them sets the
// map's own colour again, so a mark covers its name's cells and two more
// (EN 300 706 clause 12.2). A name goes to the right of its mark, else to
// its left, else is left off, so that no two marks' cells overlap and none
// covers an attribute of the map's other than a colour, which it could not
// set again; a place with no such room, or below the box, is crowded out.
// A place outside the bounds is not drawn, and the row under the map says
// how many were left out, and how many are marked without their names.

import type { Canvas } from "../core/canvas.ts";
import { Component } from "../core/component.ts";
import { type Size } from "../core/layout.ts";
import { LABEL } from "../core/look.ts";
import { cells, fit } from "../core/text.ts";
import { Colour, englishCodes, mosaicColour, readTti, SIXELS_ACROSS, SIXELS_DOWN, SPACE, textColour } from "../kit.ts";
import { cellCount } from "../charts/numbers.ts";
import { type Bitmap, sixelsOf } from "./mosaic.ts";

/** A place on the map. */
export interface MapPlace {
  /** What it is called, beside its mark: cut to nameCells, or left off where there is no room. */
  readonly name: string;
  /** Degrees north; south is below nought. */
  readonly latitude: number;
  /** Degrees east; west is below nought. */
  readonly longitude: number;
  /** Its mark's and its name's colour. */
  readonly foreground?: Colour;
}

/** The latitudes of the map's top and bottom edges and the longitudes of its left and right, in degrees. */
export interface MapBounds {
  /** The latitude of its top edge, in degrees; more than south. */
  readonly north: number;
  /** The latitude of its bottom edge, in degrees. */
  readonly south: number;
  /** The longitude of its left edge, in degrees. */
  readonly west: number;
  /** The longitude of its right edge, in degrees; more than west. */
  readonly east: number;
}

/**
 * The map under the places: a bitmap of sixels in a colour, its colour in
 * the box's first cell; or a page in TTI from `firstRow`, as a converted
 * picture is (picture.ts), its rows filling the box across.
 */
export type MapBackground = { readonly bitmap: Bitmap; readonly foreground?: Colour } | { readonly tti: string; readonly firstRow?: number };

export interface MapMarkersProps {
  /** What the places are marked on: a bitmap in a colour, or a picture's TTI rows. */
  readonly map: MapBackground;
  /** The degrees the map spans; a place outside them is left out, and bounds that make no map leave every place out. */
  readonly bounds: MapBounds;
  /** The places to mark; those crowded out or outside the bounds, and those marked without their names, are counted on the row under the map. */
  readonly places: readonly MapPlace[];
  /** The most cells a place's name takes. */
  readonly nameCells?: number;
}

/** A place's name's cells, when not given: enough for most towns' names. */
const NAME_CELLS = 10;
/** What marks a place. */
const MARK = "*";
/** The marks' colour, when a place names none. */
const MARK_COLOUR = Colour.Yellow;
/** A bitmap map's colour, when not given. */
const MAP_COLOUR = Colour.Green;
/** The row under the map that says how many places it shows. */
const STATUS_ROWS = 1;
/** The column a bitmap's sixels start in: its mosaic colour takes the first. */
const BITMAP_COLUMN = 1;
/** A mark's text colour's cell before it. */
const COLOUR_CELLS = 1;
/** A row's colour before any attribute: white text (EN 300 706 clause 12.2, the start-of-row defaults). */
const ROW_START = textColour(Colour.White);

/** Text colour attributes (Table 26), 0x00 to 0x07, and mosaic colour attributes, 0x10 to 0x17. */
const TEXT_COLOURS = { first: textColour(Colour.Black), last: textColour(Colour.White) } as const;
const MOSAIC_COLOURS = { first: mosaicColour(Colour.Black), last: mosaicColour(Colour.White) } as const;

/** Whether `code` is a colour attribute, text's or mosaics'. */
function isColour(code: number): boolean {
  return (code >= TEXT_COLOURS.first && code <= TEXT_COLOURS.last) || (code >= MOSAIC_COLOURS.first && code <= MOSAIC_COLOURS.last);
}

/** The map as it is drawn: its rows of codes, and the cells of the box its bounds span, from `column` and from its top. */
interface DrawnMap {
  readonly rows: readonly (readonly number[])[];
  readonly column: number;
  readonly height: number;
  /** The width and height a place's position is found in: sixels for a bitmap, cells for TTI. */
  readonly across: number;
  readonly down: number;
  /** The sixels of `across` to a cell, and of `down`. */
  readonly perCellAcross: number;
  readonly perCellDown: number;
}

/** `map` drawn into a box `width` cells wide. */
function drawnMap(map: MapBackground, width: number): DrawnMap {
  if ("tti" in map) {
    // A CR left in a row is code 0x0D, Double Height, which would hide the row below (picture.ts).
    const rows = (readTti(map.tti.replaceAll("\r", ""))[0]?.rows ?? []).slice(cellCount(map.firstRow ?? 0));
    return { rows, column: 0, height: rows.length, across: width, down: rows.length, perCellAcross: 1, perCellDown: 1 };
  }
  const sixels = sixelsOf(map.bitmap);
  const cellsAcross = Math.ceil(sixels.width / SIXELS_ACROSS);
  const cellsDown = Math.ceil(sixels.height / SIXELS_DOWN);
  const colour = mosaicColour(map.foreground ?? MAP_COLOUR);
  const rows = Array.from({ length: cellsDown }, (_, row) => [
    colour,
    ...Array.from({ length: cellsAcross }, (_unused, column) => sixels.cell(column * SIXELS_ACROSS, row * SIXELS_DOWN)),
  ]);
  return {
    rows,
    column: BITMAP_COLUMN,
    height: cellsDown,
    across: sixels.width,
    down: sixels.height,
    perCellAcross: SIXELS_ACROSS,
    perCellDown: SIXELS_DOWN,
  };
}

/** The colour attribute that sets `codes` back to how it is drawn after `column`: its last up to that cell, or the row's start. */
function colourAfter(codes: readonly number[], column: number): number {
  return codes.slice(0, column + 1).findLast((code) => isColour(code)) ?? ROW_START;
}

/**
 * Whether the cells `from` to before `to` of a map's row hold no attribute
 * but a colour, which a mark's last cell sets again: a background, a size
 * or a mosaics mode set there would be lost under the mark.
 */
function onlyColours(codes: readonly number[], from: number, to: number): boolean {
  return codes.slice(Math.max(0, from), to).every((code) => code >= SPACE || isColour(code));
}

/** Whether the bounds make a map: every edge a number, north of south and east of west. */
function usable(bounds: MapBounds): boolean {
  return (
    [bounds.north, bounds.south, bounds.west, bounds.east].every((edge) => Number.isFinite(edge)) && bounds.north > bounds.south && bounds.east > bounds.west
  );
}

/** A place's cell in the box, or null for one outside the bounds. */
function cellOf(place: MapPlace, bounds: MapBounds, map: DrawnMap): { row: number; column: number } | null {
  const { latitude, longitude } = place;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude > bounds.north ||
    latitude < bounds.south ||
    longitude < bounds.west ||
    longitude > bounds.east
  ) {
    return null;
  }
  // The east and south edges are in the map: they are its last sixel, not one past it.
  const x = Math.min(map.across - 1, Math.floor(((longitude - bounds.west) / (bounds.east - bounds.west)) * map.across));
  const y = Math.min(map.down - 1, Math.floor(((bounds.north - latitude) / (bounds.north - bounds.south)) * map.down));
  return { row: Math.floor(y / map.perCellDown), column: map.column + Math.floor(x / map.perCellAcross) };
}

/** A mark as it is drawn: its row, its first cell (its colour's) and its codes, the last setting the map's colour again. */
interface Marker {
  readonly row: number;
  readonly from: number;
  readonly codes: readonly number[];
}

/** What became of the places. */
interface Placed {
  readonly markers: readonly Marker[];
  readonly offMap: number;
  readonly crowded: number;
  /** The places marked with no room for their names. */
  readonly unnamed: number;
}

/** A map with places marked and named on it, and a row saying how many it shows and how many it left out. */
export class MapMarkers extends Component<MapMarkersProps> {
  override measure(space: Size): Size {
    return { width: space.width, height: Math.min(space.height, drawnMap(this.props.map, space.width).height + STATUS_ROWS) };
  }

  get #nameCells(): number {
    return this.props.nameCells ?? NAME_CELLS;
  }

  /** The ways to draw `place` at its cell, each from its colour's cell to the cell setting the map's colour again: its name to the right, to the left, or, last, with no name. */
  #ways(place: MapPlace, row: number, column: number, map: DrawnMap): Marker[] {
    const mapCodes = map.rows[row] ?? [];
    const name = englishCodes(fit(place.name, this.#nameCells));
    const mark = englishCodes(MARK);
    const colour = textColour(place.foreground ?? MARK_COLOUR);
    const after = (last: number): number => colourAfter(mapCodes, last);
    const right = column + cells(MARK) + name.length;
    const left = column - COLOUR_CELLS - name.length;
    const bare = column + cells(MARK);
    return [
      { row, from: column - COLOUR_CELLS, codes: [colour, ...mark, ...name, after(right)] },
      { row, from: left, codes: [colour, ...name, ...mark, after(bare)] },
      { row, from: column - COLOUR_CELLS, codes: [colour, ...mark, after(bare)] },
    ];
  }

  #placed(map: DrawnMap, width: number, rows: number): Placed {
    const { bounds } = this.props;
    const markers: Marker[] = [];
    let offMap = 0;
    let crowded = 0;
    let unnamed = 0;
    const fits = (way: Marker): boolean =>
      way.from >= 0 &&
      // Its last cell, setting the map's colour again, may fall past the box: there is no map there to set.
      way.from + way.codes.length - 1 <= width &&
      onlyColours(map.rows[way.row] ?? [], way.from, way.from + way.codes.length) &&
      markers.every((other) => other.row !== way.row || way.from + way.codes.length <= other.from || other.from + other.codes.length <= way.from);
    for (const place of this.props.places) {
      const cell = usable(bounds) ? cellOf(place, bounds, map) : null;
      if (cell === null) {
        offMap += 1;
        continue;
      }
      const ways = cell.row < rows ? this.#ways(place, cell.row, cell.column, map) : [];
      const way = ways.find((each) => fits(each));
      if (way === undefined) {
        crowded += 1;
        continue;
      }
      markers.push(way);
      // The last way has no name: a name given and not shown is said, as a place crowded out is.
      if (way === ways.at(-1) && fit(place.name, this.#nameCells) !== "") {
        unnamed += 1;
      }
    }
    return { markers, offMap, crowded, unnamed };
  }

  override paint(canvas: Canvas): void {
    const map = drawnMap(this.props.map, canvas.width);
    const rows = Math.min(map.height, canvas.height - STATUS_ROWS);
    map.rows.slice(0, rows).forEach((codes, row) => {
      canvas.codes(row, 0, codes);
    });
    const { markers, offMap, crowded, unnamed } = this.#placed(map, canvas.width, rows);
    for (const marker of markers) {
      canvas.codes(marker.row, marker.from, marker.codes);
    }
    const said = [`${markers.length} ${markers.length === 1 ? "place" : "places"}`];
    if (unnamed > 0) {
      said.push(`${unnamed} unnamed`);
    }
    if (offMap > 0) {
      said.push(`${offMap} off the map`);
    }
    if (crowded > 0) {
      said.push(`${crowded} crowded out`);
    }
    canvas.coloured(rows, 0, LABEL, fit(said.join(", "), canvas.width - 1));
  }
}
