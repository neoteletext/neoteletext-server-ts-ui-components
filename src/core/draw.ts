// Drawing a mount's tree: each sub-page laid out on the whole screen,
// painted, and answered as the protocol's content, with the local
// enhancement data its components asked for (enhancement.ts) and its text
// for the server to encode in the page's language (DEC-2199). A receiver opens a page at its
// first sub-page and shows each as a page of its own, never cycling them
// (the browser's decision 111). A sub-page is a page (DEC-6599,
// page-rules.md RULE-112): each declares its own controls and keeps what
// its own cells reach, and an input, which names the sub-page it came
// from, is found on that sub-page's cells alone. Display attributes are
// how a sub-page looks, so each sub-page carries those it paints.

// oxlint-disable import/max-dependencies -- drawing is where a sub-page's layout, painting, controls, enhancement data and picture meet
import { Colour, COLUMNS, type Limits, mostNumbered, ROWS, type Screen, type Subpage, type TextLevel } from "../kit.ts";
import { nothingDeclared, ownCodesOf, type PageRequests, type Region, type TextLanguage } from "./canvas.ts";
import type { Box, LayoutChild, Size } from "./layout.ts";
import { type LocalEnhancement, localEnhancement } from "./enhancement.ts";
import { type DeclaredControl, emptyGrid, type Grid, type Owned, reachedControls } from "./grid.ts";
import type { Node } from "./node.ts";
import { isSubPage, SCREEN, type SubPage, type SubPageLinks } from "./page.ts";
import { RawSubPage } from "./raw-sub-page.ts";
import { rawContent } from "./raw-tti.ts";
import { type ColourTable, rolloverLine } from "./rollover.ts";
import { canvasFor, type PaintedComponent, paintedOf, type PictureScene, type Renderer, sceneOf, screenFor } from "../picture/draw-picture.ts";

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
  /** The level the page's text is written for, or null for NeoTeletext's own (REQ-2151). */
  readonly level: TextLevel | null;
  /** What the page is drawn in (renderer parity PAR-42). */
  readonly renderer: Renderer;
  /** An interactive component's drawing or object number on a picture page, kept while it is mounted (picture/numbers.ts); 0 when none is left. */
  readonly numberOf: (node: Node) => number;
}

/** What drawing page `page` needs, from its mount's `host` and `languageOf` its nodes. */
export function drawHost(
  page: number,
  host: {
    readonly rollover: ColourTable | null;
    readonly report: (text: string) => void;
    readonly services: { limits(): Limits };
    readonly level: TextLevel | null;
    readonly renderer: Renderer;
  },
  languageOf: (node: Node) => TextLanguage,
  numberOf: (node: Node) => number,
): DrawHost {
  return {
    page,
    rollover: host.rollover,
    report: host.report,
    mostSubPages: (): number => mostNumbered(host.services.limits()),
    languageOf,
    level: host.level,
    renderer: host.renderer,
    numberOf,
  };
}

/** A page drawn: its sub-pages as the protocol carries them, and a key that is the same exactly when they are; on a picture page, each sub-page's picture too, in the same order (null for one given whole, which has none). */
export interface DrawnPage {
  readonly key: string;
  readonly subpages: readonly Subpage[];
  readonly pictures: readonly (PictureScene | null)[];
}

/** What a sub-page's cells reach, for the pointer and for its rule table; on a picture page, which drawing or object each cell is drawn in (picture/scene.ts). */
export interface Reach {
  readonly grid: Grid;
  readonly controls: readonly DeclaredControl[];
  readonly owners?: readonly (readonly number[])[];
}

/** A sub-page found in the tree, with its component as a sub-page. */
export interface FoundSubPage {
  readonly node: Node;
  readonly subPage: SubPage;
}

/** What the cells of a sub-page given whole (RawSubPage), or of a sub-page the page does not have, reach: no component. */
export const NO_REACH: Reach = { grid: emptyGrid(), controls: [] };

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

/** Where a sub-page's components are painted: its screen, what they ask of it, the cells each reaches, and on a picture page what each painted. */
interface PaintTarget {
  readonly screen: Screen;
  readonly requests: PageRequests;
  readonly grid: Grid;
  readonly owned: Owned[];
  readonly painted: PaintedComponent[] | null;
}

/** Paints `node` and what is under it on `target`'s screen, collecting what each declares and keeping each one's regions for the pointer; `within` is the number of the interactive component it is drawn within on a picture page. */
function paint(node: Node, target: PaintTarget, host: DrawHost, surround: Colour = Colour.Black, within = 0): void {
  const regions: Region[] = [];
  const declared = nothingDeclared();
  const language = host.languageOf(node);
  const canvas = canvasFor(host.renderer, target.screen, node.box, target.requests, regions, declared, surround, language);
  node.component.paint(canvas);
  canvas.finish();
  target.owned.push({ node, declared });
  node.regions = regions;
  markPointerCells(node, target.grid);
  let inside = within;
  if (target.painted !== null) {
    const painted = paintedOf(node, declared, host.numberOf, within);
    target.painted.push(painted);
    inside = painted.number === 0 ? within : painted.number;
  }
  // A component that lays a band under its children (a dialog, a band panel) is their surround: a band of theirs ends back to its colour.
  const surrounding = node.component.innerBackground() ?? surround;
  for (const child of node.children) {
    paint(child, target, host, surrounding, inside);
  }
}

/** The controls `kept` of those `declared`, as the browser reads them, each with its owner: a hover names one by its first cell. */
function keptControls(declared: readonly DeclaredControl[], { kept }: LocalEnhancement): DeclaredControl[] {
  return kept.controls.flatMap((control, at) => {
    const owner = declared[kept.declaredAt[at] ?? -1];
    return owner === undefined ? [] : [{ node: owner.node, control }];
  });
}

/** A sub-page drawn from its components: its screen, and what its cells reach. */
function drawScreen(
  node: Node,
  links: SubPageLinks,
  screenColour: number | null,
  host: DrawHost,
): { readonly screen: Screen; readonly reach: Reach; readonly picture: PictureScene | null } {
  const screen = screenFor(host.renderer);
  // The page names its language, so the server writes its designation, in the header and in the rollover's X/28/0 (REQ-2214 item 7).
  const { tag } = host.languageOf(node);
  screen.language(tag);
  screen.level(host.level);
  // Past the protocol's 64 runs, runs of what its set shows at their own codes are left to them (TODO-2228).
  screen.ownCodes(ownCodesOf(tag));
  const requests: PageRequests = { cursor: null, displayAttributes: [] };
  const grid = emptyGrid();
  const owned: Owned[] = [];
  const painted: PaintedComponent[] | null = host.renderer === "teletext" ? null : [];
  layoutChild(node).place(SCREEN);
  paint(node, { screen, requests, grid, owned, painted }, host);
  screen.fastext(links.fastext);
  if (links.index !== null) {
    screen.indexLink(links.index);
  }
  if (requests.cursor !== null) {
    screen.cursor(requests.cursor.row, requests.cursor.column, requests.cursor.flags);
  }
  const declared = reachedControls(grid, owned);
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
  const scene = painted === null ? null : sceneOf(screen, painted, requests.cursor, tag);
  return { screen, reach: scene === null ? { grid, controls } : { grid, controls, owners: scene.owners }, picture: scene };
}

/** The sub-pages in their order, which the server numbers (DOC-1971), and what each one's cells reach, in the same order. */
export function draw(shown: readonly FoundSubPage[], host: DrawHost): { readonly page: DrawnPage; readonly reaches: readonly Reach[] } {
  const reaches: Reach[] = [];
  const pictures: (PictureScene | null)[] = [];
  const subpages = shown.map(({ node, subPage }): Subpage => {
    const links = subPage.links();
    const listed = subPage.listTitle();
    const named = listed === undefined ? {} : { title: listed };
    if (subPage instanceof RawSubPage) {
      const { tti: text, title, background, foreground } = subPage.props;
      const band = title === undefined ? null : { title, background: background ?? Colour.Blue, foreground: foreground ?? Colour.White };
      reaches.push(NO_REACH);
      pictures.push(null);
      return { content: rawContent(text, links.fastext, band, host.languageOf(node).tag), ...named };
    }
    const drawn = drawScreen(node, links, subPage.props.screenColour ?? null, host);
    reaches.push(drawn.reach);
    pictures.push(drawn.picture);
    return { content: drawn.screen.content(), ...named };
  });
  return { page: { key: JSON.stringify(subpages), subpages, pictures }, reaches };
}
