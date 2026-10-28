// Writes the docs' pages of components (docs/generate.ts) under docs/: run
// it whenever a component, its props or the catalogue changes, and
// docs.test.ts fails until it is run.
//
//   node test/docs.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { PARTS } from "./catalogue/index.ts";
import { generate } from "./docs/generate.ts";

const DOCS = join(import.meta.dirname, "..", "docs");

for (const page of generate(PARTS)) {
  const path = join(DOCS, page.path);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, page.text);
}
process.stdout.write(`wrote ${DOCS}/components\n`);
