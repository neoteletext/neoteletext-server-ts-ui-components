// A viewer's input, as the protocol gives it, handed to the mount of the
// page they have open as the events its components take.
//
// On a page drawn as a picture (renderer parity PAR-42) the same
// components take the same events. A NAPLPS picture lies on the teletext
// raster, so an input's cell is the cell of the grid the components are
// laid out on. A ReGIS picture is placed in the page's image by the
// receiver's fit, so its input's cell is not; the PICK that follows every
// pointer event on a ReGIS page (page-rules.md RULE-46) gives the pixel of
// the picture, whose cell on the grid of PAR-42 is the one the event is
// taken on. The pointer coming onto a drawing or an object, and leaving
// it, is carried as the move that made it, named by the rule that sent it.

import type { Input, Pointed } from "../kit.ts";
import { FIRST_TEXT_ROW, LAST_TEXT_ROW, REGIS_CELL, REGIS_MARGIN } from "../picture/grid.ts";
import { HOVER_IN, HOVER_OUT } from "./pointer-rules.ts";

/** A pointer input on a ReGIS page, waiting for the PICK that says where on the picture it was. */
export type Pointing = Extract<Input, { kind: "mouse" | "wheel" }>;
import type { KeyEvent } from "./events.ts";
import { routeTyped } from "./focus.ts";
import type { Mount } from "./mount.ts";
import type { PointerAt } from "./pointer.ts";

/** What comes with the pointer, each field only when the input has it, as the kit gives them. */
function pointed(input: Pointed): Pointed {
  return {
    ...(input.mods === undefined ? {} : { mods: input.mods }),
    ...(input.px === undefined ? {} : { px: input.px }),
    ...(input.py === undefined ? {} : { py: input.py }),
  };
}

/** A key as a component hears it, each optional field only when the input has it. */
function keyEvent(connection: number, input: Extract<Input, { kind: "key" }>): KeyEvent {
  return {
    connection,
    key: input.key,
    action: input.action,
    ...(input.mods === undefined ? {} : { mods: input.mods }),
    ...(input.text === undefined ? {} : { text: input.text }),
    ...(input.lost === undefined ? {} : { lost: input.lost }),
  };
}

/** The mouse as the mount takes it: a press holds its own button, a release none, a move those it says. */
function pointerAt(input: Exclude<Extract<Input, { kind: "mouse" }>, { action: "gone" }>): PointerAt {
  const at = { row: input.row, column: input.column, ...pointed(input) };
  return input.action === "move"
    ? { ...at, action: "move", button: 0, buttons: input.buttons }
    : {
        ...at,
        action: input.action,
        button: input.button,
        buttons: input.action === "press" ? 1 << input.button : 0,
        ...(input.lost === undefined ? {} : { lost: input.lost }),
      };
}

/** Gives `input` to `mount`: answers whether a component took it. */
// oxlint-disable-next-line typescript/consistent-return -- the switch is over every kind of Input, as switch-exhaustiveness-check holds it to
function dispatchInput(mount: Mount, connection: number, input: Input): boolean {
  switch (input.kind) {
    case "key": {
      return mount.key(keyEvent(connection, input));
    }
    case "text": {
      return routeTyped(mount.typedAt, { kind: "text", event: { connection, text: input.text } });
    }
    case "paste": {
      return routeTyped(mount.typedAt, { kind: "paste", event: { connection, text: input.text } });
    }
    case "compose": {
      return routeTyped(mount.typedAt, { kind: "compose", event: { connection, cursor: input.cursor, text: input.text } });
    }
    case "mouse": {
      return input.action === "gone" ? mount.pointer.gone(connection) : mount.pointer.pointer(connection, pointerAt(input));
    }
    case "touch": {
      // The library follows one pointer: the first finger, which comes as
      // the mouse. A second finger is the channel's to take, through its
      // application's input, and no component takes it.
      return false;
    }
    case "wheel": {
      return mount.pointer.wheel(connection, { row: input.row, column: input.column, dx: input.dx, dy: input.dy, ...pointed(input) });
    }
    case "hover": {
      return mount.hover(connection, input.action === "enter", input.row, input.column);
    }
    case "pick":
    case "drawingHover": {
      // A page drawn in ReGIS is a picture, not a tree of components: what
      // the pointer met in it is the channel's to take, through its
      // application's input, and no component takes it.
      return false;
    }
    case "focus": {
      mount.focusChanged(true);
      return false;
    }
    case "blur": {
      mount.focusChanged(false);
      return false;
    }
  }
}

/** The cell of the grid a ReGIS picture's pixel lies in. */
function regisCell(pictureX: number, pictureY: number): { readonly row: number; readonly column: number } {
  const row = FIRST_TEXT_ROW + Math.floor((pictureY - REGIS_MARGIN) / REGIS_CELL);
  return { row: Math.min(Math.max(row, FIRST_TEXT_ROW), LAST_TEXT_ROW), column: Math.max(0, Math.floor(pictureX / REGIS_CELL)) };
}

/**
 * Gives `input` to `mount`, on a picture page as on a teletext page:
 * answers whether a component took it. A pointer input on a ReGIS page
 * waits for its PICK; one whose PICK does not come is given at its own
 * cell before the next input.
 */
export function dispatchPictureInput(mount: Mount, connection: number, input: Input): boolean {
  const { picture } = mount;
  if (picture === null) {
    return dispatchInput(mount, connection, input);
  }
  let taken = false;
  const waiting = picture.waitingPointer;
  if (picture.renderer === "regis") {
    picture.waitingPointer = null;
    if (input.kind === "pick") {
      return waiting !== null && waiting.connection === connection
        ? dispatchInput(mount, connection, { ...waiting.input, ...regisCell(input.pictureX, input.pictureY) })
        : false;
    }
    if (waiting !== null) {
      taken = dispatchInput(mount, waiting.connection, waiting.input);
    }
    if (input.kind === "wheel" || (input.kind === "mouse" && input.action !== "gone")) {
      picture.waitingPointer = { connection, input };
      return taken;
    }
  }
  if (input.kind === "mouse" && input.action === "move" && (input.rule === HOVER_IN || input.rule === HOVER_OUT)) {
    return mount.hover(connection, input.rule === HOVER_IN, input.row, input.column) || taken;
  }
  return dispatchInput(mount, connection, input) || taken;
}
