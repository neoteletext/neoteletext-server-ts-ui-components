// The catalogue's examples: each a component, with what it shows, on a
// page of its own in a frame, and what is pressed before it is looked at.
// One example serves three ends: the gate's checks of what it draws
// (visual.test.ts), its picture (screenshots.ts), and the docs, whose code
// for it is its own source (docs.ts), so the code shown is the code that
// drew the picture.

import type { Harness } from "neottx-server-ts-protocol/testing";
import type { Child, PageSpec } from "../../src/index.ts";

/** Why an example may break a check: said, so it is a decision and not an oversight. */
interface Allowances {
  /** Text cut with the cut mark, on purpose: a long title shown cut. */
  readonly cut?: string;
  /** Text whose colours are close, on purpose: the disabled look. */
  readonly contrast?: string;
}

export interface Example {
  /** The export it shows, as the package names it. */
  readonly component: string;
  /** What this example shows: its caption, and its picture's name. */
  readonly title: string;
  /** What is drawn under the frame. Its source is the example's code in the docs, so it names only the package's exports and its own data. */
  readonly build: () => Child;
  /** What the viewer does before the picture: keys pressed, time passed. Its source is shown with the code. */
  readonly act?: (page: Harness) => void;
  /** It draws a whole page, its own frames and sub-pages: it is the page's root, with no frame of the example's round it. */
  readonly whole?: boolean;
  /** The sub-page its picture shows, from 1, for a component of several; the first, as a receiver opens the page on, when absent. */
  readonly subPage?: number;
  /** Pages besides the example's own, for a component that goes to one. */
  readonly pages?: readonly PageSpec[];
  readonly allow?: Allowances;
}

/** A part of the library and its examples, in the order the docs show them. */
export interface Part {
  /** Its folder under src/. */
  readonly part: string;
  /** Its heading in the docs. */
  readonly title: string;
  /** What the part is for, a sentence or two, for the top of its page. */
  readonly about: string;
  readonly examples: readonly Example[];
}

/** An example's name, for its picture's file: its component and its title, in lower case, hyphenated. */
export function exampleName(example: Example): string {
  const slug = example.title
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-|-$/gu, "");
  return `${example.component.toLowerCase()}-${slug}`;
}
