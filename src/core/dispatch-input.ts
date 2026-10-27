// A viewer's input, as the protocol gives it, handed to the mount of the
// page they have open as the events its components take.

import type { Input } from "../kit.ts";
import type { Mount } from "./mount.ts";

/** Gives `input` to `mount`: answers whether a component took it. */
// oxlint-disable-next-line typescript/consistent-return -- the switch is over every kind of Input, as switch-exhaustiveness-check holds it to
export function dispatchInput(mount: Mount, session: number, input: Input): boolean {
  switch (input.kind) {
    case "key": {
      return mount.key({ session, key: input.key, action: input.action, ...(input.text === undefined ? {} : { text: input.text }) });
    }
    case "text": {
      return mount.text({ session, text: input.text });
    }
    case "paste": {
      return mount.paste({ session, text: input.text });
    }
    case "mouse": {
      return input.action === "move"
        ? mount.pointer(session, "move", input.row, input.column, 0, input.buttons)
        : mount.pointer(session, input.action, input.row, input.column, input.button, input.action === "press" ? 1 << input.button : 0);
    }
    case "wheel": {
      return mount.wheel(session, input.row, input.column, input.dx, input.dy);
    }
    case "hover": {
      return mount.hover(session, input.action === "enter", input.row, input.column);
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
