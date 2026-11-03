// Drawing a mount's tree: each sub-page laid out on the whole screen,
// painted, and answered as the protocol's content, with the local
// enhancement data its components asked for (enhancement.ts) and its text
// for the server to encode in the page's language (DEC-2199). A receiver opens a page at its
// first sub-page and shows each as a page of its own, never cycling them
// (the browser's decision 111). Clicks are found on the first
// sub-page's cells only, since a channel is not told which sub-page a
// viewer has up (DOC-1753), so only the first sub-page
// declares controls: elsewhere the hand would point at
// another sub-page's component. Display attributes are how a sub-page
// looks, so each sub-page carries those it paints.

import { Colour, COLUMNS, type Limits, mostNumbered, ROWS, Screen, type Subpage } from "../kit.ts";
import { Canvas, nothingDeclared, ownCodesOf, type PageRequests, type Region, type TextLanguage } from "./canvas.ts";
import type { Box, LayoutChild, Size } from "./layout.ts";
import { type LocalEnhancement, localEnhancement } from "./enhancement.ts";
import { type DeclaredControl, emptyGrid, type Grid, type Owned, reachedControls } from "./grid.ts";
import type { Node } from "./node.ts";
import { isSubPage, SCREEN, type SubPage, type SubPageLinks } from "./page.ts";
import { RawSubPage } from "./raw-sub-page.ts";
import { rawContent } from "./raw-tti.ts";
import { type ColourTable, rolloverLine } from "./rollover.ts";

/** What drawing needs of the mount. */
export interface DrawHost {
  readonly page: number;
  /** The page's controls' rollover colours (rollover.ts), or null for the receiver's own hover look. */
  readonly rollover: ColourTable | null;
  readonly report: (text: string) => void;
  /** The most sub-pages a whole page may have, as the server's `start` said. */
  readonly mostSubPages: () => number;
  /** The language of a node's text: its nearest `language` prop, else the page's or the viewer's. */
  readonly languageOf: (node: Node) => TextLanguage;
}

/** What drawing page `page` needs, from its mount's `host` and `languageOf` its nodes. */
export function drawHost(
  page: number,
  host: { readonly rollover: ColourTable | null; readonly report: (text: string) => void; readonly services: { limits(): Limits } },
  languageOf: (node: Node) => TextLanguage,
): DrawHost {
  return { page, rollover: host.rollover, report: host.report, mostSubPages: (): number => mostNumbered(host.services.limits()), languageOf };
}

/** A page drawn: its sub-pages as the protocol carries them, and a key that is the same exactly when they are. */
export interface DrawnPage {
  readonly key: string;
  readonly subpages: readonly Subpage[];
}

/** What the first sub-page's cells reach, for the pointer. */
export interface Reach {
  readonly grid: Grid;
  readonly controls: readonly DeclaredControl[];
}

/** A sub-page found in the tree, with its component as a sub-page. */
export interface FoundSubPage {
  readonly node: Node;
  readonly subPage: SubPage;
}

const NO_REACH: Reach = { grid: emptyGrid(), controls: [] };

/** The sub-pages under `root`, at most a publication's: the rest are reported and left out. */
export function shownSubPages(root: Node | null, host: DrawHost): FoundSubPage[] {
  const found: FoundSubPage[] = [];
  const visit = (node: Node): void => {
    const { component } = node;
    if (isSubPage(component)) {
      found.push({ node, subPage: component });
      return;
    }
    for (const child of node.children) {
      visit(child);
    }
  };
  if (root !== null) {
    visit(root);
  }
  const most = host.mostSubPages();
  if (found.length > most) {
    host.report(`page ${host.page.toString(16)}: ${found.length} sub-pages, the most is ${most}; the rest are left out`);
  }
  return found.slice(0, most);
}

/** `node` as its parent's layout sees it: measured, then placed, which lays out what is under it. */
function layoutChild(node: Node): LayoutChild {
  return {
    props: node.element.props,
    measure: (space: Size): Size =>
      node.component.measure(
        space,
        node.children.map((child) => layoutChild(child)),
      ),
    place: (box: Box): void => {
      node.box = box;
      node.component.arrange(
        box,
        node.children.map((child) => layoutChild(child)),
      );
    },
  };
}

/** Marks the cells `node` takes the pointer on, as the deepest drawn there so far. */
function markPointerCells(node: Node, grid: Grid): void {
  const own = node.component.pointerCells(node.box);
  if (own === null) {
    return;
  }
  for (let row = Math.max(0, own.row); row < own.row + own.height && row < ROWS; row += 1) {
    const line = grid[row];
    for (let column = Math.max(0, own.column); column < own.column + own.width && column < COLUMNS; column += 1) {
      if (line !== undefined) {
        line[column] = node;
      }
    }
  }
}

/** Paints `node` and what is under it on `screen`, collecting what each declares; on the first sub-page, keeps each one's regions for the pointer. */
function paint(
  node: Node,
  screen: Screen,
  requests: PageRequests,
  grid: Grid,
  owned: Owned[],
  first: boolean,
  host: DrawHost,
  surround: Colour = Colour.Black,
): void {
  const regions: Region[] = [];
  const declared = nothingDeclared();
  const language = host.languageOf(node);
  const canvas = new Canvas(screen, node.box, requests, regions, declared, surround, language);
  node.component.paint(canvas);
  canvas.finish();
  owned.push({ node, declared });
  if (first) {
    node.regions = regions;
  }
  markPointerCells(node, grid);
  // A component that lays a band under its children (a dialog, a band panel) is their surround: a band of theirs ends back to its colour.
  const within = node.component.innerBackground() ?? surround;
  for (const child of node.children) {
    paint(child, screen, requests, grid, owned, first, host, within);
  }
}

/** The controls `kept` of those `declared`, as the browser reads them, each with its owner: a hover names one by its first cell. */
function keptControls(declared: readonly DeclaredControl[], { kept }: LocalEnhancement): DeclaredControl[] {
  return kept.controls.flatMap((control, at) => {
    const owner = declared[kept.declaredAt[at] ?? -1];
    return owner === undefined ? [] : [{ node: owner.node, control }];
  });
}

/** A sub-page drawn from its components: its screen, and on the first sub-page what its cells reach. */
function drawScreen(
  node: Node,
  links: SubPageLinks,
  screenColour: number | null,
  first: boolean,
  host: DrawHost,
): { readonly screen: Screen; readonly reach: Reach } {
  const screen = new Screen();
  // The page names its language, so the server writes its designation, in the header and in the rollover's X/28/0 (REQ-2214 item 7).
  const { tag } = host.languageOf(node);
  screen.language(tag);
  // Past the protocol's 64 runs, runs of what its set shows at their own codes are left to them (TODO-2228).
  screen.ownCodes(ownCodesOf(tag));
  const requests: PageRequests = { cursor: null, displayAttributes: [] };
  const grid = emptyGrid();
  const owned: Owned[] = [];
  layoutChild(node).place(SCREEN);
  paint(node, screen, requests, grid, owned, first, host);
  screen.fastext(links.fastext);
  if (links.index !== null) {
    screen.indexLink(links.index);
  }
  if (requests.cursor !== null) {
    screen.cursor(requests.cursor.row, requests.cursor.column, requests.cursor.flags);
  }
  const declared = first ? reachedControls(grid, owned) : [];
  const enhancement = localEnhancement(
    declared.map(({ control }) => control),
    requests.displayAttributes,
    screenColour,
  );
  const controls = keptControls(declared, enhancement);
  // The rollover colours go with the sub-page whose controls show them.
  const rollover = controls.length > 0 && host.rollover !== null ? [rolloverLine(host.rollover)] : [];
  for (const line of [...rollover, ...enhancement.lines]) {
    screen.packed(line);
  }
  return { screen, reach: { grid, controls } };
}

/** The sub-pages in their order, which the server numbers (DOC-1971), and what the first one's cells reach. */
export function draw(shown: readonly FoundSubPage[], host: DrawHost): { readonly page: DrawnPage; readonly reach: Reach } {
  let reach = NO_REACH;
  const subpages = shown.map(({ node, subPage }, index): Subpage => {
    const links = subPage.links();
    const listed = subPage.listTitle();
    const named = listed === undefined ? {} : { title: listed };
    if (subPage instanceof RawSubPage) {
      const { tti: text, title, background, foreground } = subPage.props;
      const band = title === undefined ? null : { title, background: background ?? Colour.Blue, foreground: foreground ?? Colour.White };
      return { content: rawContent(text, links.fastext, band, host.languageOf(node).tag), ...named };
    }
    const drawn = drawScreen(node, links, subPage.props.screenColour ?? null, index === 0, host);
    if (index === 0) {
      reach = drawn.reach;
    }
    return { content: drawn.screen.content(), ...named };
  });
  return { page: { key: JSON.stringify(subpages), subpages }, reach };
}
