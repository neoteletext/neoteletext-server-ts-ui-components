// The catalogue's pictures: each example (catalogue/) staged as the gate
// stages it, its page's TTI drawn by the engine's renderer (`neottx
// render`, in the Bedstead font a receiver draws), and written to
// docs/images/PART/NAME.png. It also lists, for review, where each page's
// attributes may show as gaps (catalogue/checks.ts). It is not part of the
// gate: the renderer is the engine's program, built in its own
// repository, so it is named, and its version checked, when this runs.
//
//   NEOTTX=/path/to/neottx node test/screenshots.ts [PART]

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { text } from "neoteletext-server-ts-protocol/testing";
import { ROWS } from "../src/kit.ts";
import { gapFindings } from "./catalogue/checks.ts";
import { exampleName } from "./catalogue/example.ts";
import { PARTS } from "./catalogue/index.ts";
import { EXAMPLE_PAGE, stage } from "./catalogue/stage.ts";

/** The renderer these pictures were made with: another draws them otherwise, and they would change for no change here. */
const ENGINE_VERSION = "neottx 0.1.0";
const ROOT = join(import.meta.dirname, "..");
const IMAGES = join(ROOT, "docs", "images");
const SCRATCH = join(ROOT, "tmp", "screenshots");
/** Page numbers are hexadecimal: 0x150 is page 150. */
const PAGE_RADIX = 16;
/** A sub-page's code, as the renderer names one after its page: four digits (100:0003). */
const SUBPAGE_DIGITS = 4;

function engine(): string {
  const path = process.env["NEOTTX"];
  if (path === undefined || path === "") {
    throw new Error("set NEOTTX to the engine's neottx program (neoteletext-engine: cargo build --release)");
  }
  const version = execFileSync(path, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  if (version !== ENGINE_VERSION) {
    throw new Error(`${path} is ${version}; these pictures are drawn by ${ENGINE_VERSION}`);
  }
  return path;
}

function main(only: string | undefined): void {
  const neottx = engine();
  const review: string[] = [];
  let drawn = 0;
  for (const part of PARTS.filter((each) => only === undefined || each.part === only)) {
    mkdirSync(join(IMAGES, part.part), { recursive: true });
    mkdirSync(SCRATCH, { recursive: true });
    for (const example of part.examples) {
      const name = exampleName(example);
      const staged = stage(example);
      const tti = join(SCRATCH, `${name}.tti`);
      writeFileSync(tti, staged.tti);
      const page = EXAMPLE_PAGE.toString(PAGE_RADIX);
      // Named, so the picture is the sub-page the example shows, which a receiver opens on unless it says.
      const shown = staged.subPages.length === 1 ? page : `${page}:${String(example.subPage ?? 1).padStart(SUBPAGE_DIGITS, "0")}`;
      execFileSync(neottx, ["render", "--format", "tti", tti, shown, "-o", join(IMAGES, part.part, `${name}.png`)], {
        stdio: ["ignore", "ignore", "ignore"],
      });
      drawn += 1;
      const rows = Array.from({ length: ROWS }, (_, row) => text(staged.rows, row));
      for (const gap of gapFindings(rows)) {
        review.push(`${part.part}/${name}: row ${gap.row} column ${gap.column}: ${gap.what}`);
      }
    }
  }
  const reviewed = join(SCRATCH, `review-${only ?? "all"}.txt`);
  writeFileSync(reviewed, `${review.join("\n")}\n`);
  process.stdout.write(`${drawn} pictures in docs/images; ${review.length} gaps to review in ${reviewed}\n`);
}

main(process.argv[2]);
