// A picture page in ReGIS (renderer parity PAR-42; neoteletext-renderer-regis
// docs/regis-v2.md). The stream begins by erasing the screen and setting
// the output map: locations 0 to 7 the Level 1 colours, 8 to 15 their
// rollover colours (rollover.ts) for the hover looks. The base, every cell
// no interactive component is drawn in, is drawn on the screen itself,
// outside numbered drawings, so that a changed base row is drawn again over
// itself. Each interactive component is a numbered drawing in the scene
// layer, detectable when it takes the pointer, with two hidden drawings
// (`V0`) after it for its hover and pressed looks (`H`, `A`); its contents
// are its cells, from a fresh context as a drawing's always are, so each
// text part sets its character cell first. The caret is drawing 1, in the
// overlay layer. A change redefines the drawings that changed and commits
// them together (`D(C)`), which the renderer repaints alone.

import { type ColourTable } from "../core/rollover.ts";
import { type PicturePart, Regis, type RegisDrawingAttributes, regisLimits } from "../kit.ts";
import { drawCells, type Look, ROLLOVER_ENTRIES } from "./cell-drawing.ts";
import { FIRST_TEXT_ROW, LAST_TEXT_ROW, LEVEL_1_PRIMARIES, REGIS_CELL, regisX, regisY } from "./grid.ts";
import { RegisPainter } from "./regis-painter.ts";
import { CURSOR_NUMBER, HOVER_LOOK_OFFSET, PRESSED_LOOK_OFFSET } from "./numbers.ts";
import { baseRowKey, componentKeys, cursorChange, cursorKey, linksChange, linksKey, linksOf, type SceneKeys } from "./scene-keys.ts";
import type { PictureScene, SceneComponent } from "./scene.ts";
import type { PictureUpdate, PictureWriter } from "./update.ts";

/** A colour's primaries in the manual's percentages (chapter 2, "Output Mapping"): full or none. */
const FULL_PERCENT = 100;
/** A rollover colour's four bits a primary (Table 30), and their most. */
const PRIMARY_BITS = 4;
const PRIMARY_MOST = (1 << PRIMARY_BITS) - 1;
/** The screen's background: output map location 0, black. */
const BACKGROUND_ENTRY = 0;
/** The layers of regis-v2.md's animation: the caret lies over everything (ANIM-12). */
const SCENE_LAYER = 1;
const OVERLAY_LAYER = regisLimits.LAYERS - 1;
/** The caret: a bar along the foot of its cell, this many pixels high, in white. */
const CARET_HEIGHT = 3;
const CARET_ENTRY = 7;
/** A rollover colour, 0xRGB, as the manual's percentages. */
function percents(rgb: number, shift: number): number {
  return Math.round((((rgb >> shift) & PRIMARY_MOST) * FULL_PERCENT) / PRIMARY_MOST);
}

/** What a stream starts with: the screen erased to black and the output map set. */
function opening(rollover: ColourTable | null): Regis {
  const builder = new Regis().erase(BACKGROUND_ENTRY);
  LEVEL_1_PRIMARIES.forEach(([red, green, blue], entry) => {
    builder.colour(entry, red ? FULL_PERCENT : 0, green ? FULL_PERCENT : 0, blue ? FULL_PERCENT : 0);
  });
  rollover?.forEach((rgb, entry) => {
    builder.colour(entry + ROLLOVER_ENTRIES, percents(rgb, 2 * PRIMARY_BITS), percents(rgb, PRIMARY_BITS), percents(rgb, 0));
  });
  return builder;
}

/** A label as `U` takes it: plain ISO/IEC 8859-1 within MAX_LABEL_BYTES, or none. */
function latinLabel(label: string): string | null {
  // oxlint-disable-next-line no-control-regex -- the label must be printable Latin-1: the range is the rule, not a control.
  return label !== "" && /^[ -~ -ÿ]*$/u.test(label) ? label.slice(0, regisLimits.MAX_LABEL_BYTES) : null;
}

export interface RegisPictureOptions {
  readonly rollover: ColourTable | null;
}

export class RegisPictureWriter implements PictureWriter {
  readonly #options: RegisPictureOptions;
  #last: SceneKeys | null = null;

  constructor(options: RegisPictureOptions) {
    this.#options = options;
  }

  /** Whether a component has looks: it takes the pointer and declares controls for them to change. */
  #hasLooks(component: SceneComponent): boolean {
    return component.detectable && component.controls.length > 0;
  }

  #drawing(scene: PictureScene, component: SceneComponent, builder: Regis, isNew: boolean): void {
    const { number } = component;
    const looks = this.#hasLooks(component);
    const label = latinLabel(component.label);
    const attributes: RegisDrawingAttributes = {
      detectable: component.detectable,
      layer: SCENE_LAYER,
      ...(looks ? { hover: number + HOVER_LOOK_OFFSET, pressed: number + PRESSED_LOOK_OFFSET } : { hover: 0, pressed: 0 }),
      label: label ?? "",
    };
    const contents =
      (look: Look) =>
      (drawing: Regis): void => {
        drawCells(
          scene.cells,
          {
            owners: scene.owners,
            drawn: new Set([number]),
            look,
            controls: component.controls,
            rollover: this.#options.rollover !== null,
            pageLanguage: scene.language,
          },
          new RegisPainter(drawing),
        );
      };
    builder.drawing(number, attributes, contents("plain"));
    if (looks) {
      builder.drawing(number + HOVER_LOOK_OFFSET, {}, contents("hover"));
      builder.drawing(number + PRESSED_LOOK_OFFSET, {}, contents("pressed"));
      if (isNew) {
        // Looks are drawn only in the place of the drawing that names them (regis-v2.md, "Viewer state").
        builder.bytes(`D(S${number + HOVER_LOOK_OFFSET}(V0),S${number + PRESSED_LOOK_OFFSET}(V0))`);
      }
    }
  }

  /** The base rows that changed since `last`, each drawn again over itself. */
  #baseRows(scene: PictureScene, last: SceneKeys | null, units: PicturePart[][]): string[] {
    const base: string[] = [];
    for (let row = FIRST_TEXT_ROW; row <= LAST_TEXT_ROW; row += 1) {
      const key = baseRowKey(scene, row, (owner) => owner === 0);
      base[row] = key;
      if (last?.base[row] !== key) {
        const builder = new Regis();
        drawCells(
          scene.cells,
          { owners: scene.owners, drawn: new Set([0]), look: "plain", controls: [], rollover: false, pageLanguage: scene.language, rows: new Set([row]) },
          new RegisPainter(builder),
        );
        units.push(builder.parts());
      }
    }
    return base;
  }

  /** The drawings that came or changed since `last` defined, and those that went deleted; whether any D operation was staged. */
  #drawings(scene: PictureScene, last: SceneKeys | null, keys: ReadonlyMap<number, string>, units: PicturePart[][]): boolean {
    let staged = false;
    for (const [number, key] of keys) {
      const before = last?.components.get(number);
      const component = scene.components.get(number);
      if (component !== undefined && before !== key) {
        const builder = new Regis();
        this.#drawing(scene, component, builder, before === undefined);
        units.push(builder.parts());
        staged = true;
      }
    }
    for (const number of last?.components.keys() ?? []) {
      if (!keys.has(number)) {
        units.push(new Regis().bytes(`D(K${number},K${number + HOVER_LOOK_OFFSET},K${number + PRESSED_LOOK_OFFSET})`).parts());
        staged = true;
      }
    }
    return staged;
  }

  /** The caret's drawing, defined where it is now, or deleted with none. */
  static #caret(scene: PictureScene): PicturePart[] {
    const builder = new Regis();
    if (scene.cursor === null) {
      return builder.bytes(`D(K${CURSOR_NUMBER})`).parts();
    }
    const { row, column } = scene.cursor;
    return builder
      .drawing(CURSOR_NUMBER, { layer: OVERLAY_LAYER }, (drawing) => {
        drawing.box(regisX(column), regisY(row) + REGIS_CELL - CARET_HEIGHT, REGIS_CELL - 1, CARET_HEIGHT - 1, { fill: true, pen: CARET_ENTRY });
      })
      .parts();
  }

  update(scene: PictureScene, restart: boolean): PictureUpdate {
    const last = restart ? null : this.#last;
    const keys = componentKeys(scene, this.#options.rollover !== null);
    const units: PicturePart[][] = last === null ? [opening(this.#options.rollover).parts()] : [];
    const base = this.#baseRows(scene, last, units);
    let staged = this.#drawings(scene, last, keys, units);
    const caret = cursorKey(scene);
    if (caret !== (last?.cursor ?? null)) {
      units.push(RegisPictureWriter.#caret(scene));
      staged = true;
    }
    if (staged) {
      units.push(new Regis().commit().parts());
    }
    const links = linksOf(scene);
    const cursor = cursorChange(last, scene.cursor === null ? 0 : CURSOR_NUMBER, CURSOR_NUMBER);
    this.#last = { base, components: keys, cursor: caret, links: linksKey(links) };
    return { restart: last === null, units, links: linksChange(last, links), cursor, objects: null };
  }
}
