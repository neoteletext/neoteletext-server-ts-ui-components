// Every example in the catalogue (catalogue/) draws without the channel
// reporting a failure, and draws nothing unseen, nothing too close to its
// background to read, and no text cut short, unless it says why, on every
// sub-page: each is a page a viewer steps to.

import assert from "node:assert/strict";
import { test } from "node:test";

import { text } from "neoteletext-server-ts-protocol/testing";
import { ROWS } from "../src/kit.ts";
import { gateFindings } from "./catalogue/checks.ts";
import { exampleName } from "./catalogue/example.ts";
import { PARTS } from "./catalogue/index.ts";
import { stage } from "./catalogue/stage.ts";

for (const part of PARTS) {
  for (const example of part.examples) {
    test(`${part.part}: ${exampleName(example)} draws cleanly`, () => {
      const staged = stage(example);
      assert.deepEqual(staged.failures, [], "the channel reported no failure");
      const findings = staged.subPages.flatMap((subPage, index) => {
        const rows = Array.from({ length: ROWS }, (_, row) => text(subPage, row));
        return gateFindings(rows, example.allow?.cut !== undefined, example.allow?.contrast !== undefined).map(
          (finding) => `sub-page ${index + 1} row ${finding.row} column ${finding.column}: ${finding.what}`,
        );
      });
      assert.deepEqual(findings, [], findings.join("\n"));
    });
  }
}

test("every example's picture has a name of its own", () => {
  const names = PARTS.flatMap((part) => part.examples.map(exampleName));
  assert.deepEqual(
    names.filter((name, index) => names.indexOf(name) !== index),
    [],
  );
});
