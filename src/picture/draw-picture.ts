// Drawing a sub-page of a picture page (renderer parity PAR-42), as
// draw.ts draws a teletext sub-page: on a screen that keeps its text cell
// by cell, each component on a picture canvas, and what each painted kept,
// to make the sub-page's scene from.

import type { Canvas } from "../core/canvas.ts";
import { Canvas as TeletextCanvas, type Declared } from "../core/canvas.ts";
import type { Node } from "../core/node.ts";
import { takesPointer } from "../core/pointer-rules.ts";
import { Screen } from "../kit.ts";
import { NaplpsCanvas } from "./naplps-canvas.ts";
import { pictureLinkOf } from "./picture-link.ts";
import { RecordingScreen } from "./recording-screen.ts";
import { RegisCanvas } from "./regis-canvas.ts";
import type { Renderer } from "./renderer.ts";
import type { PaintedComponent } from "./scene.ts";

export type { PictureScene } from "./scene.ts";
export { sceneOf } from "./scene.ts";
export type { PaintedComponent, Renderer };

/** The screen a sub-page in `renderer` is drawn on: a picture's keeps its text cell by cell. */
export function screenFor(renderer: Renderer): Screen {
  return renderer === "teletext" ? new Screen() : new RecordingScreen();
}

/** The canvas of a component on a page in `renderer`. */
export function canvasFor(renderer: Renderer, ...parts: ConstructorParameters<typeof TeletextCanvas>): Canvas {
  if (renderer === "regis") {
    return new RegisCanvas(...parts);
  }
  return renderer === "naplps" ? new NaplpsCanvas(...parts) : new TeletextCanvas(...parts);
}

/**
 * What `node` painted, for its sub-page's scene: interactive when it takes
 * the pointer or the keys or declared a control, then with its number
 * (`numberOf`), detectable when it takes the pointer; `within` the number of
 * the interactive component it is drawn within.
 */
export function paintedOf(node: Node, declared: Declared, numberOf: (node: Node) => number, within: number): PaintedComponent {
  const { component } = node;
  const detectable = takesPointer(component);
  const number = detectable || component.focusable() || declared.controls.length > 0 ? numberOf(node) : 0;
  return { number, detectable, box: node.box, controls: declared.controls, link: pictureLinkOf(component), within };
}
