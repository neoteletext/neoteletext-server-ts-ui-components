// The docs' pages of components are what the catalogue and the source make
// of them now (docs/generate.ts): a page written by hand, or left behind as
// a component changed, fails here until `node test/docs.ts` writes it again.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { PARTS } from "./catalogue/index.ts";
import { generate, undocumentedProps } from "./docs/generate.ts";

const DOCS = join(import.meta.dirname, "..", "docs");

for (const page of generate(PARTS)) {
  test(`docs/${page.path} is up to date`, () => {
    const path = join(DOCS, page.path);
    assert.ok(existsSync(path), `run node test/docs.ts to write docs/${page.path}`);
    assert.equal(readFileSync(path, "utf8"), page.text, `run node test/docs.ts: docs/${page.path} is out of step with the code`);
  });
}

test("every prop says what it is, for the docs' tables", () => {
  assert.deepEqual(undocumentedProps(), []);
});
