// The most rectangles and rules one rule table may hold: the engine's
// `neoteletext_rules::limits` constants `MAX_RECTS` and `MAX_RULES`, whose
// figures neoteletext-common's REQ-6608 (docs/page-rules.md RULE-57) states
// once and no other file may state as a literal. The protocol kit carries
// them only in its schema, so the library finds them by asking the kit's
// own check of a `rules` message (checkProgram) of tables of growing
// length: the most the schema takes is the limit, and no figure is written
// here.

import { checkProgram, FIRST_PAGE, type Limits, pageText, type RectDeclaration } from "../kit.ts";
import type { PageRule } from "../kit.ts";

/** What one table may hold. */
export interface TableLimits {
  /** `MAX_RECTS`: the rectangles a table declares. */
  readonly rects: number;
  /** `MAX_RULES`: the rules a table holds. */
  readonly rules: number;
}

/** The members of a table whose length is held to a limit. */
type Member = "rects" | "rules";

/** The probe's table is sent to no one: a connection number and a sub-code the schema takes, for a message that is only checked. */
const PROBE_CONNECTION = 1;

const PROBE_SUB = "0000";

/** A rectangle or a rule the schema takes, the `at`th of a probe's table, named for its place so that none is the same. */
function probeItem(member: Member, at: number): RectDeclaration | PageRule {
  const name = `probe_${at}`;
  return member === "rects" ? { name, x: 0, y: 0, width: 1, height: 1 } : { name, on: { event: "text" }, do: [{ type: "report" }] };
}

/** Whether the kit's schema takes a table whose `member` holds `count` items. */
function takes(member: Member, count: number, limits: Limits): boolean {
  const items = Array.from({ length: count }, (_, at) => probeItem(member, at));
  const table = member === "rects" ? { rules: [], rects: items } : { rules: items };
  const fault = checkProgram({ type: "rules", connections: [PROBE_CONNECTION], page: pageText(FIRST_PAGE), sub: PROBE_SUB, table }, limits);
  if (fault === null) {
    return true;
  }
  if (fault.path !== `table.${member}`) {
    throw new Error(`the probe of a rule table's ${member} broke the kit's schema elsewhere: ${fault.path}, ${fault.rule}, ${fault.detail}`);
  }
  return false;
}

/**
 * The most items the kit's schema takes in a table's `member`: doubled
 * from one until it is refused, then halved between the last taken and the
 * first refused. A line holds fewer items than it has bytes, so the
 * longest line `start` gave bounds the search.
 */
function most(member: Member, limits: Limits): number {
  const ceiling = limits.budgets.lineBytes;
  let refused = 1;
  while (refused <= ceiling && takes(member, refused, limits)) {
    refused *= 2;
  }
  let taken = Math.floor(refused / 2);
  while (refused - taken > 1) {
    const middle = Math.floor((taken + refused) / 2);
    if (takes(member, middle, limits)) {
      taken = middle;
    } else {
      refused = middle;
    }
  }
  return taken;
}

const found = new WeakMap<Limits, TableLimits>();

/** What one table may hold, by the kit's schema, under the limits `start` gave: found once for each. */
export function tableLimits(limits: Limits): TableLimits {
  let known = found.get(limits);
  if (known === undefined) {
    known = { rects: most("rects", limits), rules: most("rules", limits) };
    found.set(limits, known);
  }
  return known;
}
