// A viewer's input, as the protocol gives it, handed to the mount of the
// page they have open as the events its components take.

import type { Input, Pointed } from "../kit.ts";
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
export function dispatchInput(mount: Mount, connection: number, input: Input): boolean {
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
