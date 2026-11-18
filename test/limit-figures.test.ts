// REQ-6608 (neoteletext-common's docs/page-rules.md RULE-57): a limit of a
// page's rule table is written by its name, as the protocol kit exports it
// from the engine's neoteletext_rules::limits, never by its figure. The
// kit's check reads every file of the repository.

import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "node:test";

import { limitFigureLines } from "neoteletext-server-ts-protocol/testing";

test("REQ-6608: no file of the library writes a limit's figure beside its name", () => {
  assert.deepEqual(limitFigureLines(join(import.meta.dirname, ".."), []), []);
});
