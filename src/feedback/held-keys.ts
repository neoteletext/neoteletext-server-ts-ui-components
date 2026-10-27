// What holds the keys while something loads (loading.ts): it takes the
// keys in the place of what is coming, so Enter, Space and typing, which
// that would have acted on, act on nothing else meanwhile. Every other key
// goes on up, so a tab can be changed or the page left while it loads; Tab
// goes on to the next control. It is mounted only while loading, so when
// what was coming arrives it goes, and the keys with it.

import { Component } from "../core/component.ts";
import type { KeyEvent } from "../core/events.ts";
import { choosing } from "../core/keys.ts";

/** Holds the keys meant for what is still loading; draws its children, the spinner or the skeleton. */
export class HeldKeys extends Component {
  override focusable(): boolean {
    return true;
  }

  override hint(): string {
    return "Still loading";
  }

  override onKey(event: KeyEvent): boolean {
    return choosing(event);
  }

  override onText(): boolean {
    return true;
  }

  override onPaste(): boolean {
    return true;
  }
}
