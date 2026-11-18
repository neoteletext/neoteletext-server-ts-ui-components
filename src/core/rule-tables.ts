// Which rule table each connection has been sent for the page it has
// selected, and the sending of a table when it is not the one the
// connection has (neoteletext-common's docs/page-rules.md, RULE-54). A
// page is a page number and a sub-code together (DEC-6599, RULE-112): the
// table sent is that of the sub-page the connection's selection shows
// (selections.ts), written from that sub-page's own components by its
// mount (page-rules.ts), the viewer's own copy's where they have one, else
// the channel's. It is sent at every selection, since the server keeps no
// table and the viewer's receiver drops everything of a page it leaves
// (RULE-40, RULE-111), and again whenever the components on the sub-page
// come to take something else, so that the viewer's receiver sends what
// they take and no more. With it go the rules for the keys the protocol
// kit selects pages by (page-selection.ts). A channel that says
// `ruleTables: "none"` is sent no table at all: its pages are left to the
// table the server's configuration gives the channel (RULE-53).

import { type Context, pageText } from "../kit.ts";
import type { ConnectionMounts } from "./connection-mounts.ts";
import type { PageRules } from "./page-rules.ts";
import { type PageSelectionKeys, withPageSelection } from "./page-selection.ts";
import type { Selections } from "./selections.ts";

/** What the tables are sent by. */
export interface RuleTablesOptions {
  /** Whether the library writes tables at all (ComponentChannelOptions.ruleTables). */
  readonly written: boolean;
  /** Which keys the kit's page selection takes of `page`. */
  readonly selection: (page: number) => PageSelectionKeys;
  /** The sub-page each connection's selection shows. */
  readonly selections: Selections;
}

/** The table owed to some connections, of one sub-page. */
interface Owed {
  readonly rules: PageRules;
  readonly sub: number;
  readonly connections: number[];
}

const HEXADECIMAL = 16;

/** A sub-code's digits as the protocol writes them (`0001`). */
const SUB_CODE_DIGITS = 4;

/** A page and sub-page as the channel's log names them, and the kit's addresses: `150/0001`. */
function placeText(page: number, sub: number): string {
  return `${pageText(page)}/${sub.toString(HEXADECIMAL).toUpperCase().padStart(SUB_CODE_DIGITS, "0")}`;
}

export class RuleTables {
  /** What was last sent to each connection, for the one sub-page it has selected: the sub-code and the table's key. */
  readonly #sent = new Map<number, string>();
  readonly #options: RuleTablesOptions;
  /** Each sub-page's table with page selection's rules, made once for each table a mount writes. */
  readonly #whole = new WeakMap<PageRules, PageRules>();

  constructor(options: RuleTablesOptions) {
    this.#options = options;
  }

  #wholeOf(page: number, components: PageRules): PageRules {
    let whole = this.#whole.get(components);
    if (whole === undefined) {
      whole = withPageSelection(components, this.#options.selection(page));
      this.#whole.set(components, whole);
    }
    return whole;
  }

  /**
   * The connection made a selection, of a page or of another sub-page of
   * the same one, or left its page: its table is sent again whatever was
   * sent before, since the server keeps none and the receiver drops the
   * table of every page it leaves (RULE-40, RULE-111).
   */
  selected(connection: number): void {
    this.#sent.delete(connection);
  }

  /** The connection is gone. */
  forget(connection: number): void {
    this.#sent.delete(connection);
  }

  /** The program started again: no connection has any table. */
  clear(): void {
    this.#sent.clear();
  }

  /**
   * Sends each connection the table of the sub-page its selection shows
   * when it has another table of it, or none: one message for those given
   * the same table of the same sub-page. A table that asks the whole
   * sub-page for the pointer, since it has more than a table holds, is
   * said in the channel's log as it is sent.
   */
  send(context: Context, mounts: ConnectionMounts): void {
    if (!this.#options.written) {
      return;
    }
    for (const [page, watching] of mounts.watching) {
      const owed = new Map<string, Owed>();
      for (const connection of watching) {
        const mount = mounts.of(connection, page) ?? mounts.shared.get(page);
        const sub = mount?.subPages.shownSub(this.#options.selections.subOf(connection, page)) ?? null;
        const components = sub === null ? null : (mount?.subPages.rulesOf(sub) ?? null);
        if (sub === null || components === null) {
          continue;
        }
        const rules = this.#wholeOf(page, components);
        const key = `${sub}:${rules.key}`;
        if (this.#sent.get(connection) !== key) {
          this.#sent.set(connection, key);
          const group = owed.get(key) ?? { rules, sub, connections: [] };
          group.connections.push(connection);
          owed.set(key, group);
        }
      }
      for (const { rules, sub, connections } of owed.values()) {
        context.rules({ connections }, page, sub, rules.table);
        if (rules.widened !== null) {
          context.log(`page ${placeText(page, sub)}: ${rules.widened}`);
        }
      }
    }
  }
}
