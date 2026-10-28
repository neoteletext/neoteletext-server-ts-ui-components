// An example on its page: a frame titled with its component, viewer 1 on
// it with a copy of their own, what the example does done, and what the
// viewer then sees, as rows and as the page's TTI. A receiver opens a page
// on its first sub-page and NeoTeletext shows each sub-page as a page of its
// own, never cycling them, so every sub-page is held, and the one shown is
// the example's, or the first.

import assert from "node:assert/strict";

import type { Harness } from "neottx-server-ts-protocol/testing";
import type { Rows } from "neottx-server-ts-protocol";
import { type Element, h, Rows as RowsLayout } from "../../src/index.ts";
import { frame, harness, PAGE } from "../components-fixtures.ts";
import { latestTti } from "../controls-fixtures.ts";
import type { Example } from "./example.ts";

/** What an example shows once staged. */
export interface Staged {
  readonly page: Harness;
  /** The sub-page the example shows. */
  readonly rows: Rows;
  /** Every sub-page, in order: the gate checks each. */
  readonly subPages: readonly Rows[];
  readonly tti: string;
  /** What the channel reported failing: nothing, for a good example. */
  readonly failures: readonly string[];
}

/** Every example's page number. */
export const EXAMPLE_PAGE = PAGE;

export function stage(example: Example): Staged {
  const page = harness([
    {
      page: EXAMPLE_PAGE,
      title: example.component,
      perViewer: true,
      root: (): Element => (example.whole === true ? h(RowsLayout, {}, example.build()) : frame(example.component, example.build())),
    },
    ...(example.pages ?? []),
  ]);
  page.join(1, EXAMPLE_PAGE);
  example.act?.(page);
  const subPages = (page.ownPages(1, EXAMPLE_PAGE) ?? page.sharedPages(EXAMPLE_PAGE)).map((each) => each.rows);
  const shown = subPages[(example.subPage ?? 1) - 1];
  assert.ok(shown !== undefined, `${example.component} has sub-page ${String(example.subPage)}`);
  return { page, rows: shown, subPages, tti: latestTti(page, EXAMPLE_PAGE), failures: page.errors };
}
