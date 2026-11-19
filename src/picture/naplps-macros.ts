// A NAPLPS picture page's macro objects (renderer parity PAR-42; ANSI
// X3.110-1983 section 6.2 for the macros, animation.md ANIM-11 for the
// objects). A sub-page has the 96 macro names 2/0 to 7/15: the caret's is
// the first, and each interactive component takes three more in a slot of
// its own, its frame's and its hover and pressed looks', kept while it is
// drawn so that its macros keep their names. A macro holds at most
// MAX_MACRO_BYTES and a sub-page at most MOST_OBJECTS objects: a component
// whose macros might pass the first, however the server writes their text,
// or for which no slot is left, is a region of the stream's own picture
// instead, drawn in the stream with the base, detectable as an object is,
// without looks.

import { Naplps, type NaplpsObject, naplpsLimits, type NaplpsObjectSpec } from "../kit.ts";
import { drawCells, type Look } from "./cell-drawing.ts";
import { NAPLPS_COLUMN, naplpsDotCentre, naplpsLine, naplpsLineCentre, naplpsX, naplpsY, RASTER_ROW_LINES, rasterDot, rasterLine } from "./grid.ts";
import { boundsOf, objectLabel } from "./naplps-objects.ts";
import { NaplpsPainter } from "./naplps-painter.ts";
import { CURSOR_NUMBER } from "./numbers.ts";
import type { PictureScene, SceneComponent } from "./scene.ts";
import { mostBytes } from "./stream-bounds.ts";

/** The caret's macro, then the components' from the next. */
const CARET_MACRO = 0x20;
const FIRST_COMPONENT_MACRO = CARET_MACRO + 1;
const LAST_MACRO = 0x7f;
const MACROS_PER_COMPONENT = 3;
const HOVER_MACRO_OFFSET = 1;
const PRESSED_MACRO_OFFSET = 2;
/** The components a sub-page's macros hold. */
const MACRO_SLOTS = Math.floor((LAST_MACRO - FIRST_COMPONENT_MACRO + 1) / MACROS_PER_COMPONENT);
/** ANIM-11's `MAX_OBJECTS`: the most objects one NAPLPS_OBJECTS record gives a sub-page. */
const MOST_OBJECTS = 64;
/** The scene and overlay layers of ANIM-11 (1 to LAYERS - 1). */
const SCENE_LAYER = 1;
const OVERLAY_LAYER = naplpsLimits.LAYERS - 1;
/** The caret: a bar along the foot of its cell, 3 raster lines high, in white. */
const CARET_LINES = 3;
const CARET_ENTRY = 7;

/** How a component is drawn this render: by its macros in a slot, or as a region of the stream. */
export type Drawn = { readonly kind: "macro"; readonly slot: number } | { readonly kind: "region" };

/** Whether a component has looks: it takes the pointer and declares controls for them to change. */
function hasLooks(component: SceneComponent): boolean {
  return component.detectable && component.controls.length > 0;
}

/** What draws `component` in `look`: its cells, at their own places. */
function contents(scene: PictureScene, component: SceneComponent, look: Look, rollover: boolean): (builder: Naplps) => void {
  return (builder): void => {
    drawCells(
      scene.cells,
      { owners: scene.owners, drawn: new Set([component.number]), look, controls: component.controls, rollover, pageLanguage: scene.language },
      new NaplpsPainter(builder),
    );
  };
}

/** Whether `component`'s macros fit MAX_MACRO_BYTES however the server writes their text. */
function fits(scene: PictureScene, component: SceneComponent, rollover: boolean): boolean {
  const looks: Look[] = hasLooks(component) ? ["plain", "hover", "pressed"] : ["plain"];
  return looks.every((look) => {
    const trial = new Naplps();
    contents(scene, component, look, rollover)(trial);
    return mostBytes(trial.parts()) <= naplpsLimits.MAX_MACRO_BYTES;
  });
}

/** The first macro of slot `slot`: its frame's. */
function frameOf(slot: number): number {
  return FIRST_COMPONENT_MACRO + slot * MACROS_PER_COMPONENT;
}

/** `component`'s macros defined again, in `slot`. */
export function defineMacros(scene: PictureScene, component: SceneComponent, slot: number, rollover: boolean): Naplps {
  const frame = frameOf(slot);
  const builder = new Naplps().defineMacro(frame, contents(scene, component, "plain", rollover));
  if (hasLooks(component)) {
    builder.defineMacro(frame + HOVER_MACRO_OFFSET, contents(scene, component, "hover", rollover));
    builder.defineMacro(frame + PRESSED_MACRO_OFFSET, contents(scene, component, "pressed", rollover));
  }
  return builder;
}

/** `component`'s object, drawn as `drawn` says, round its cells; null when none of its cells is shown. */
export function componentObject(scene: PictureScene, component: SceneComponent, drawn: Drawn): NaplpsObject | null {
  const box = boundsOf(scene, component.number);
  if (box === null) {
    return null;
  }
  const label = objectLabel(component.label);
  const spec: NaplpsObjectSpec = {
    number: component.number,
    ...box,
    detectable: component.detectable,
    layer: SCENE_LAYER,
    ...(label === null ? {} : { label }),
  };
  if (drawn.kind === "region") {
    return new Naplps().object({ ...spec, kind: "region" });
  }
  const frame = frameOf(drawn.slot);
  const looks = hasLooks(component) ? { hover: frame + HOVER_MACRO_OFFSET, pressed: frame + PRESSED_MACRO_OFFSET } : {};
  // The macro draws at the cells' own places: its origin is the rectangle's corner, so nothing moves (ANIM-11).
  return new Naplps().object({ ...spec, kind: "macro", originX: box.x, originY: box.y, frames: [frame], ...looks });
}

/** The caret's rectangle: the foot of its cell. */
function caretBox(row: number, column: number): { readonly x: number; readonly y: number; readonly width: number; readonly height: number } {
  const y = naplpsLine(RASTER_ROW_LINES * (row + 1) - CARET_LINES);
  return { x: naplpsX(column), y, width: NAPLPS_COLUMN, height: Math.max(1, naplpsY(row + 1) - y) };
}

/** The caret's object, or null with none. */
export function caretObject(scene: PictureScene): NaplpsObject | null {
  if (scene.cursor === null) {
    return null;
  }
  const box = caretBox(scene.cursor.row, scene.cursor.column);
  return new Naplps().object({ number: CURSOR_NUMBER, kind: "macro", ...box, originX: box.x, originY: box.y, frames: [CARET_MACRO], layer: OVERLAY_LAYER });
}

/** The caret's macro defined where it is now. */
export function caretMacro(row: number, column: number): Naplps {
  // The bar covers exactly the last CARET_LINES raster lines of its cell, from the first's centre to the last's (DEC-6849).
  const [left, right] = [naplpsDotCentre(rasterDot(column)), naplpsDotCentre(rasterDot(column + 1) - 1)];
  const [top, bottom] = [naplpsLineCentre(rasterLine(row + 1) - CARET_LINES), naplpsLineCentre(rasterLine(row + 1) - 1)];
  return new Naplps().defineMacro(CARET_MACRO, (builder) => {
    builder.pen(CARET_ENTRY).rect(left, top, right - left, bottom - top, { filled: true });
  });
}

/** The macro slots of one sub-page's stream. */
export class MacroSlots {
  /** Each component's slot, by its number. */
  readonly #slots = new Map<number, number>();

  /** Every slot is free again: the stream restarted. */
  clear(): void {
    this.#slots.clear();
  }

  /** A free slot, or undefined when none is. */
  #free(): number | undefined {
    const taken = new Set(this.#slots.values());
    return Array.from({ length: MACRO_SLOTS }, (_, slot) => slot).find((slot) => !taken.has(slot));
  }

  /** How each of `scene`'s components is drawn this render: those that fit keep their slot or take a free one, while slots and objects last. */
  drawnAs(scene: PictureScene, rollover: boolean): Map<number, Drawn> {
    for (const number of this.#slots.keys()) {
      if (!scene.components.has(number)) {
        this.#slots.delete(number);
      }
    }
    const drawn = new Map<number, Drawn>();
    // The caret's object counts against the most a sub-page has.
    const room = MOST_OBJECTS - (scene.cursor === null ? 0 : 1);
    for (const component of [...scene.components.values()].slice(0, room)) {
      if (!fits(scene, component, rollover)) {
        this.#slots.delete(component.number);
        drawn.set(component.number, { kind: "region" });
        continue;
      }
      const slot = this.#slots.get(component.number) ?? this.#free();
      if (slot === undefined) {
        drawn.set(component.number, { kind: "region" });
      } else {
        this.#slots.set(component.number, slot);
        drawn.set(component.number, { kind: "macro", slot });
      }
    }
    return drawn;
  }
}
