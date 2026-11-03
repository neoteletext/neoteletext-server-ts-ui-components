// The components of one copy of a page whose state is kept for its viewer
// (REQ-1058): given back from the channel's store (state-store.ts) as each
// is made, before its first render, and written there each time it changes,
// so that it is there when the component is mounted again for the same
// session, after a restart of the program too.

import type { Component } from "./component.ts";
import type { StateStore } from "./state-store.ts";

/**
 * Where a component's state is kept for its viewer's session (Component.keptAs): `key`, which the channel chooses, names one state for each viewer on
 * whatever page the component is mounted; `version` is raised when the state's shape changes, and state kept at another version is dropped.
 */
export type KeptAs = NonNullable<ReturnType<Component["keptAs"]>>;

/** What is known of a component whose state is kept: where, and its state as last written, as JSON. */
interface Kept {
  readonly name: string;
  readonly version: number;
  json: string;
}

/** What a component's state is kept under in the store, apart from a poll's names and the channel's own. */
function keptName(key: string): string {
  return `component:${key}`;
}

/** Whether `value` is a plain object, as state is: anything else read back is not a component's state. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class KeptComponents {
  readonly #store: StateStore | null;
  readonly #session: number | null;
  readonly #report: (text: string) => void;
  readonly #kept = new Map<Component, Kept>();

  /** The kept components of the copy for `session`; none are kept on the copy every viewer shares (null), or when the channel has no store. */
  constructor(store: StateStore | null, session: number | null, report: (text: string) => void) {
    this.#store = store;
    this.#session = session;
    this.#report = report;
  }

  /** A component just made: when it says where its state is kept, what was kept at its version is laid over its own state. */
  restore(component: Component): void {
    if (this.#store === null || this.#session === null) {
      return;
    }
    const keptAs = component.keptAs();
    if (keptAs === null) {
      return;
    }
    const name = keptName(keptAs.key);
    try {
      const kept = this.#store.ofSession(this.#session, name, keptAs.version);
      if (isPlainObject(kept)) {
        // Laid over, so a field the kept state lacks keeps the component's own start.
        component.state = { ...component.state, ...kept };
      }
      this.#kept.set(component, { name, version: keptAs.version, json: JSON.stringify(component.state) });
    } catch (error) {
      this.#report(`${component.constructor.name}'s kept state could not be read: ${String(error)}`);
    }
  }

  /** Writes the state of each kept component that changed since it was last written. */
  keepChanged(): void {
    if (this.#store === null || this.#session === null) {
      return;
    }
    for (const [component, kept] of this.#kept) {
      try {
        const json = JSON.stringify(component.state);
        if (json !== kept.json) {
          this.#store.keepForSession(this.#session, kept.name, kept.version, component.state);
          kept.json = json;
        }
      } catch (error) {
        // Tried again at its next change; the report says why it failed this time.
        kept.json = "";
        this.#report(`${component.constructor.name}'s state could not be kept: ${String(error)}`);
      }
    }
  }

  /** The component was unmounted: what it last changed was written as it changed. */
  forget(component: Component): void {
    this.#kept.delete(component);
  }
}
