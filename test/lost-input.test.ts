// A release the page lost, as a component hears it (the engine's REQ-207).

import assert from "node:assert/strict";
import { test } from "node:test";

import { Component, h } from "../src/index.ts";
import { viewer } from "./controls-fixtures.ts";

test("a release the page lost reaches a component marked lost, a real one unmarked (REQ-207)", () => {
  const seen: string[] = [];
  /** Keeps what the pointer and the keys do, marked or not. */
  class Held extends Component {
    override focusable(): boolean {
      return true;
    }

    override measure(space: { readonly width: number; readonly height: number }): { width: number; height: number } {
      return { width: space.width, height: 4 };
    }

    override onPointer(event: { readonly action: string; readonly lost?: true }): boolean {
      seen.push(`pointer ${event.action} ${String(event.lost === true)}`);
      return true;
    }

    override onKey(event: { readonly action: string; readonly lost?: true }): boolean {
      seen.push(`key ${event.action} ${String(event.lost === true)}`);
      return true;
    }
  }
  const harness = viewer(h(Held, {}));
  harness.send(1, { kind: "mouse", action: "press", button: 0, column: 2, row: 4 });
  harness.send(1, { kind: "mouse", action: "release", button: 0, column: 2, row: 4, lost: true });
  harness.send(1, { kind: "mouse", action: "press", button: 0, column: 2, row: 4 });
  harness.send(1, { kind: "mouse", action: "release", button: 0, column: 2, row: 4 });
  harness.send(1, { kind: "key", action: "release", key: "a", lost: true });
  assert.deepEqual(seen, ["pointer press false", "pointer release true", "pointer press false", "pointer release false", "key release true"]);
});
