// What a mounted component reaches of its mount (mount.ts), and what it
// is told of the components under it that take the keys.

import type { ComponentEventInit } from "./component-events.ts";
import type { Component } from "./component.ts";
import type { KeyHelpEntry } from "./key-bindings.ts";
import type { Box } from "./layout.ts";
import type { Services } from "./services.ts";

/** What a mounted component reaches of its mount. */
export interface ComponentHost {
  readonly services: Services;
  invalidate(component: Component): void;
  focus(component: Component): void;
  isFocused(component: Component): boolean;
  /** Whether the pointer is on a control the component declared, for any viewer of this copy. */
  isHovered(component: Component): boolean;
  setTimer(component: Component, run: () => void, delay: number, every: boolean, whileViewed: boolean): number;
  clearTimer(id: number): void;
  /** The box the component was last laid out in. */
  boxOf(component: Component): Box;
  /** Sends `event` up the tree from the component. */
  emit(component: Component, event: ComponentEventInit): void;
  /** What the component under the viewer's pointer, or else the focused one, says its keys do, or null. */
  focusedHint(): string | null;
  /** What the control under the viewer's pointer says it does, or null when it is on none or none says. */
  hoveredHint(): string | null;
  /** Whether the hint said, the hovered control's or else the focused one's, is what its keys do, shown in whole entries, and not what it is (hintDescribes), which is cut as any text is. */
  hintIsKeys(): boolean;
  /** What the focused component's keys do, entry by entry: for help on the control with the keys. */
  focusedBindings(): readonly KeyHelpEntry[];
  /** The components under `component` that take the keys, in the order they are drawn, with their boxes. */
  focusablesUnder(component: Component): readonly FocusableAt[];
}

/** A component that takes the keys, and where it was laid out. */
export interface FocusableAt {
  readonly component: Component;
  readonly box: Box;
}

/** How a timer runs. */
export interface TimerOptions {
  /** It runs only while someone has the page open: a clock or an animation on the copy every viewer shares, which costs nothing while nobody watches. Missed ticks run once when someone comes. */
  readonly whileViewed?: boolean;
}
