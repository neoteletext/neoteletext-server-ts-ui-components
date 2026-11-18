// A mount's sub-pages as last drawn, each a page of its own (DEC-6599,
// neoteletext-common's docs/page-rules.md RULE-112): what each one's cells
// reach, each one's rule table written from its own components
// (page-rules.ts), and which of them the input being routed came from.
// The kit numbers a page given whole by place (its `numbered`), so a
// sub-code names a sub-page by its place among those drawn.

import { ANY_SUB, type Limits, numbered, type PageKeys } from "../kit.ts";
import type { Component } from "./component.ts";
import { type FoundSubPage, NO_REACH, type Reach } from "./draw.ts";
import type { Node } from "./node.ts";
import { type PageRules, pageRules } from "./page-rules.ts";

/** The components a sub-page's table is written from: those drawn on it, under `node`, and those it is drawn within, which a key or a press bubbles up to. */
function subPageComponents(node: Node): Component[] {
  const found: Component[] = [];
  for (let above = node.parent; above !== null; above = above.parent) {
    found.push(above.component);
  }
  const visit = (at: Node): void => {
    found.push(at.component);
    for (const child of at.children) {
      visit(child);
    }
  };
  visit(node);
  return found;
}

export class SubPages {
  readonly #limits: () => Limits;
  #shown: readonly FoundSubPage[] = [];
  #reaches: readonly Reach[] = [];
  /** The place of the sub-page the input being routed came from (routeOn), or -1 for one the page does not have. */
  #routed = 0;
  /** Each sub-page's rule table, written from its own components as last drawn, in the order drawn; none until it is first drawn. */
  rules: readonly PageRules[] = [];
  /**
   * The keys each sub-page's own components take themselves, rather than
   * page selection (needs.ts), by its sub-code: a sub-page is a page
   * (DEC-6599). Kept by sub-code, as written in a call, since the kit asks
   * for them outside one (PageEntry.keysOf), when the limits that number
   * the sub-pages cannot be read.
   */
  #keys: ReadonlyMap<number, PageKeys> = new Map();
  /** The first sub-page's sub-code, which 3F7F shows, or null when none is drawn. */
  #firstSub: number | null = null;

  constructor(limits: () => Limits) {
    this.#limits = limits;
  }

  /** The sub-pages were drawn: `shown`, whose cells reach what `reaches` says, in the same order. */
  drawn(shown: readonly FoundSubPage[], reaches: readonly Reach[]): void {
    this.#shown = shown;
    this.#reaches = reaches;
  }

  /** Writes each sub-page's table again, from the components drawn on it and those round it alone. */
  writeRules(root: Node | null, hoverRead: boolean): void {
    const components = this.#shown.map(({ node }) => subPageComponents(node));
    this.rules = components.map((each, place) => pageRules({ components: each, root, reach: this.#reaches[place] ?? NO_REACH, hoverRead }));
    // Numbered here, in a call, where the limits can be read (DEC-6599: each sub-page's keys are its own components').
    const subs = this.#shown.length === 0 ? [] : numbered(this.#shown.length, this.#limits());
    this.#firstSub = subs[0] ?? null;
    this.#keys = new Map(
      components.flatMap((each, place) => {
        const sub = subs[place];
        const needs = each.map((component) => component.needs());
        return sub === undefined
          ? []
          : [[sub, { ownsDigits: needs.some((need) => need.digits === true), ownsColourKeys: needs.some((need) => need.colourKeys === true) }] as const];
      }),
    );
  }

  /** What the cells of the sub-page the input being routed came from reach. */
  routedReach(): Reach {
    return this.#reaches[this.#routed] ?? NO_REACH;
  }

  /** The place of sub-page `sub` among those drawn, or -1 when the page has none of that sub-code. 3F7F, the page with no sub-page in particular, is the first, as the kit shows it for a selection of the page. */
  #placeOf(sub: number): number {
    return sub === ANY_SUB ? 0 : numbered(this.#shown.length, this.#limits()).indexOf(sub);
  }

  /** The sub-code the kit shows of the page for `sub`: `sub` itself, or for 3F7F the first sub-page's; null when the page has none of it. */
  shownSub(sub: number): number | null {
    return numbered(this.#shown.length, this.#limits())[this.#placeOf(sub)] ?? null;
  }

  /** The rule table of sub-page `sub`, or null when the page has none of that sub-code. */
  rulesOf(sub: number): PageRules | null {
    return this.rules[this.#placeOf(sub)] ?? null;
  }

  /** The keys the components of sub-page `sub` take themselves, or null when the page has none of that sub-code drawn. */
  keysOf(sub: number): PageKeys | null {
    const shown = sub === ANY_SUB ? this.#firstSub : sub;
    return shown === null ? null : (this.#keys.get(shown) ?? null);
  }

  /** The input about to be routed came from sub-page `sub`: the pointer is found on its cells alone, and on a sub-page the page does not have, on none. */
  routeOn(sub: number): void {
    this.#routed = this.#placeOf(sub);
  }
}
