// What the tests of the fields a remote can fill share: the rows a viewer
// sees, keys pressed in turn, and a component that hears the answers.

import assert from "node:assert/strict";

import { type Harness, rowOf, text } from "neoteletext-server-ts-protocol/testing";
import { Component, type ComponentEvent } from "../src/index.ts";
import { CURSOR_BLOCK } from "../src/input/drawn-line.ts";
import { SPACE_CODE } from "../src/kit.ts";
import { PAGE } from "./controls-fixtures.ts";

/** The cursor's block, as a row's text holds it. */
export const BLOCK = String.fromCodePoint(CURSOR_BLOCK);

/** The last of the spacing attributes' codes (EN 300 706 Table 26). */
const LAST_ATTRIBUTE = 0x1f;

/** Viewer 1's row `at` of the page. */
export function row(page: Harness, at: number): string {
  return text(page.seen(1, PAGE).rows, at);
}

/** Viewer 1's row of the page that holds `wanted`. */
export function rowWith(page: Harness, wanted: string): number {
  const found = rowOf(page.seen(1, PAGE).rows, wanted);
  assert.ok(found !== undefined, `a row shows ${JSON.stringify(wanted)}`);
  return found;
}

/** The words on viewer 1's page, its rows' attributes and the ends between them taken as spaces. */
export function shown(page: Harness): string {
  const { rows } = page.seen(1, PAGE);
  return rows
    .map((codes) => String.fromCodePoint(...codes.map((code) => (code <= LAST_ATTRIBUTE ? SPACE_CODE : code))))
    .join(" ")
    .replaceAll(/\s+/gu, " ");
}

/** Viewer 1 presses each of `keys` in turn. */
export function pressAll(page: Harness, ...keys: readonly string[]): void {
  for (const key of keys) {
    page.press(1, key);
  }
}

/** Hears the answers that come up the tree from the components under it. */
export class Heard extends Component<{ readonly seen: string[] }> {
  override onComponentEvent(event: ComponentEvent): boolean {
    if (event.type === "activate" || event.type === "submit") {
      this.props.seen.push(`${event.type} ${String(event.value)}`);
    } else if (event.type === "cancel") {
      this.props.seen.push("cancel");
    }
    return false;
  }
}
