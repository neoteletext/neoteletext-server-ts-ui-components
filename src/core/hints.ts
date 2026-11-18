// What a mount's hint row says: what the control under the viewer's
// pointer says it does, or else what the keys of the component that has
// them do. It also knows whether any component asked, since a page whose
// components draw something for the control under the pointer must ask the
// receiver to say when the pointer comes onto one (page-rules.ts).

import { type AnyComponent, nearest, type Node } from "./node.ts";

/** What the hints need of their mount. */
export interface HintHost {
  /** The component with the keys, or null. */
  readonly focused: () => AnyComponent | null;
  /** The component that declared the control the mount's viewer's pointer is on; on the copy every viewer shares, which follows no one's pointer, null. */
  readonly hovered: () => Node | null;
}

export class Hints {
  readonly #host: HintHost;
  /** Whether a component read what the pointer is over as it rendered. */
  read = false;

  constructor(host: HintHost) {
    this.#host = host;
  }

  /** The component under the pointer that says what it does, nearest first. */
  #hinted(): AnyComponent | null {
    return nearest(this.#host.hovered(), (each) => each.hint() !== null);
  }

  /** What the hint row says and what the hovered control says, without that being a component's reading: for the mount, to see whether a hover changed either. */
  shown(): readonly [focused: string | null, hovered: string | null] {
    const hovered = this.#hinted()?.hint() ?? null;
    return [hovered ?? this.#host.focused()?.hint() ?? null, hovered];
  }

  focused(): string | null {
    this.read = true;
    return this.shown()[0];
  }

  hovered(): string | null {
    this.read = true;
    return this.shown()[1];
  }

  /** Whether the hint shown says what its component's keys do, and not what it is. */
  isKeys(): boolean {
    this.read = true;
    const source = this.#hinted() ?? this.#host.focused();
    return source !== null && !source.hintDescribes();
  }
}
