// A picture page in NAPLPS (renderer parity PAR-42; ANSI X3.110-1983, and
// animation.md ANIM-11 for the objects). The stream begins with RESET and
// CLEAR SCREEN and sets the colour map: entries 0 to 7 the Level 1
// colours, 8 to 15 their rollover colours (rollover.ts) for the hover
// looks. The base, every cell no interactive component is drawn in, is
// drawn in the stream, so that a changed base row is drawn again over
// itself. Each interactive component is a macro object (naplps-macros.ts):
// a change defines its macros again and redefines the object alone (`ONE`,
// REQ-6645), which the receiver draws again. The caret is object 1 in the
// overlay layer.

import { type ColourTable } from "../core/rollover.ts";
import { Naplps, type NaplpsObject, type PicturePart } from "../kit.ts";
import { drawCells, ROLLOVER_ENTRIES } from "./cell-drawing.ts";
import { FIRST_TEXT_ROW, LAST_TEXT_ROW, LEVEL_1_PRIMARIES } from "./grid.ts";
import { caretMacro, caretObject, componentObject, defineMacros, type Drawn, MacroSlots } from "./naplps-macros.ts";
import { NaplpsPainter } from "./naplps-painter.ts";
import { CURSOR_NUMBER } from "./numbers.ts";
import { baseRowKey, componentKeys, cursorChange, cursorKey, linksChange, linksKey, linksOf, type SceneKeys } from "./scene-keys.ts";
import type { PictureScene } from "./scene.ts";
import type { ObjectsUpdate, PictureUpdate, PictureWriter } from "./update.ts";

/** An 8-bit intensity at its full. */
const FULL_INTENSITY = 255;
/** A rollover colour's four bits a primary (Table 30): times 17 is the 8-bit intensity. */
const PRIMARY_BITS = 4;
const PRIMARY_MOST = (1 << PRIMARY_BITS) - 1;
const NIBBLE_TO_BYTE = FULL_INTENSITY / PRIMARY_MOST;

export interface NaplpsPictureOptions {
  readonly rollover: ColourTable | null;
}

interface NaplpsKeys extends SceneKeys {
  /** Each object's definition, as NAPLPS_OBJECTS carries it, by number. */
  readonly objects: ReadonlyMap<number, string>;
}

/** The objects of one render: each by number, its definition's key, and those whose macros were defined again. */
interface Objects {
  readonly objects: Map<number, NaplpsObject>;
  readonly keys: Map<number, string>;
  readonly redrawn: NaplpsObject[];
}

/** RESET and CLEAR SCREEN, then the colour map in colour mode 1. */
function opening(rollover: ColourTable | null): Naplps {
  const builder = new Naplps().reset().clear();
  LEVEL_1_PRIMARIES.forEach(([red, green, blue], entry) => {
    builder.colour(entry, red ? FULL_INTENSITY : 0, green ? FULL_INTENSITY : 0, blue ? FULL_INTENSITY : 0);
  });
  rollover?.forEach((rgb, entry) => {
    const primary = (shift: number): number => Math.round(((rgb >> shift) & PRIMARY_MOST) * NIBBLE_TO_BYTE);
    builder.colour(entry + ROLLOVER_ENTRIES, primary(2 * PRIMARY_BITS), primary(PRIMARY_BITS), primary(0));
  });
  return builder;
}

/** The whole set when an object came, went or changed its definition, or after a restart; else each object whose macros were defined again, alone. */
function objectsUpdate(last: NaplpsKeys | null, now: Objects, caretMoved: boolean): ObjectsUpdate | null {
  const same = last !== null && last.objects.size === now.keys.size && [...now.keys].every(([number, key]) => last.objects.get(number) === key);
  if (!same) {
    return last === null && now.objects.size === 0 ? null : { whole: [...now.objects.values()].toSorted((a, b) => a.number - b.number) };
  }
  const caret = caretMoved ? now.objects.get(CURSOR_NUMBER) : undefined;
  const one = caret === undefined ? now.redrawn : [...now.redrawn, caret];
  return one.length === 0 ? null : { one };
}

export class NaplpsPictureWriter implements PictureWriter {
  readonly #rollover: ColourTable | null;
  #last: NaplpsKeys | null = null;
  readonly #slots = new MacroSlots();

  constructor(options: NaplpsPictureOptions) {
    this.#rollover = options.rollover;
  }

  /** The rows of what the stream draws (`inStream`) that changed since `last`, each drawn again over itself. */
  static #baseRows(scene: PictureScene, last: NaplpsKeys | null, inStream: (owner: number) => boolean, units: PicturePart[][]): string[] {
    const drawn = new Set([0, ...[...scene.components.keys()].filter((number) => inStream(number))]);
    const base: string[] = [];
    for (let row = FIRST_TEXT_ROW; row <= LAST_TEXT_ROW; row += 1) {
      const key = baseRowKey(scene, row, inStream);
      base[row] = key;
      if (last?.base[row] !== key) {
        const builder = new Naplps();
        const selection = {
          owners: scene.owners,
          drawn,
          look: "plain",
          controls: [],
          rollover: false,
          pageLanguage: scene.language,
          rows: new Set([row]),
        } as const;
        drawCells(scene.cells, selection, new NaplpsPainter(builder));
        units.push(builder.parts());
      }
    }
    return base;
  }

  /** Each component's object, its macros defined again where they changed since `last`. */
  #objects(
    scene: PictureScene,
    last: NaplpsKeys | null,
    drawnAs: ReadonlyMap<number, Drawn>,
    keys: ReadonlyMap<number, string>,
    units: PicturePart[][],
  ): Objects {
    const now: Objects = { objects: new Map(), keys: new Map(), redrawn: [] };
    for (const [number, how] of drawnAs) {
      const component = scene.components.get(number);
      const object = component === undefined ? null : componentObject(scene, component, how);
      if (component === undefined || object === null) {
        continue;
      }
      now.objects.set(number, object);
      now.keys.set(number, JSON.stringify(object));
      if (how.kind === "macro" && last?.components.get(number) !== keys.get(number)) {
        units.push(defineMacros(scene, component, how.slot, this.#rollover !== null).parts());
        now.redrawn.push(object);
      }
    }
    return now;
  }

  update(scene: PictureScene, restart: boolean): PictureUpdate {
    const last = restart ? null : this.#last;
    if (last === null) {
      this.#slots.clear();
    }
    const drawnAs = this.#slots.drawnAs(scene, this.#rollover !== null);
    const inStream = (owner: number): boolean => drawnAs.get(owner)?.kind !== "macro";
    const units: PicturePart[][] = last === null ? [opening(this.#rollover).parts()] : [];
    const base = NaplpsPictureWriter.#baseRows(scene, last, inStream, units);
    const keys = componentKeys(scene, this.#rollover !== null);
    const now = this.#objects(scene, last, drawnAs, keys, units);
    const caret = caretObject(scene);
    const caretKey = cursorKey(scene);
    const caretMoved = caretKey !== (last?.cursor ?? null);
    if (caret !== null && scene.cursor !== null) {
      now.objects.set(CURSOR_NUMBER, caret);
      now.keys.set(CURSOR_NUMBER, JSON.stringify(caret));
      if (caretMoved) {
        units.push(caretMacro(scene.cursor.row, scene.cursor.column).parts());
      }
    }
    const links = linksOf(scene).filter((link) => now.objects.has(link.number));
    const cursor = cursorChange(last, caret === null ? 0 : CURSOR_NUMBER, CURSOR_NUMBER);
    const objects = objectsUpdate(last, now, caretMoved);
    this.#last = { base, components: keys, cursor: caretKey, links: linksKey(links), objects: now.keys };
    return { restart: last === null, units, links: linksChange(last, links), cursor, objects };
  }
}
