// What a page is drawn in (renderer parity PAR-42): teletext, as every page
// was before, or a picture in ReGIS or NAPLPS drawn from the same
// components on the same cell grid.

/** The renderer a page names in its spec (PageSpec.renderer): teletext when it names none. */
export type Renderer = "teletext" | "regis" | "naplps";
