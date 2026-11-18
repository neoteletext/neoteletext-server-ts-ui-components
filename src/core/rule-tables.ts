// Which rule table each connection has been sent for each page it has
// open, and the sending of a page's table when it is not the one the
// connection has (neoteletext-common's docs/page-rules.md, RULE-54). The
// table is its mount's (page-rules.ts): the viewer's own copy's where they
// have one, else the channel's. It is sent when a connection opens the
// page, and again whenever the components on it come to take something
// else, so that the viewer's receiver sends what they take and no more.

import type { Context, RuleTable } from "../kit.ts";
import type { ConnectionMounts } from "./connection-mounts.ts";

export class RuleTables {
  /** The key of the table last sent, by connection, then page. */
  readonly #sent = new Map<number, Map<number, string>>();

  /**
   * The connection opened `page`: its table is sent again whatever was
   * sent before, since the server keeps a connection's tables for so many
   * pages only and drops the oldest (RULE-40), which the program is not
   * told.
   */
  opened(connection: number, page: number): void {
    this.#sent.get(connection)?.delete(page);
  }

  /** The connection is gone. */
  forget(connection: number): void {
    this.#sent.delete(connection);
  }

  /** The program started again: no connection has any table. */
  clear(): void {
    this.#sent.clear();
  }

  /** Sends each page's table to the connections that have the page open and have another table of it, or none: one message for those given the same table. */
  send(context: Context, mounts: ConnectionMounts): void {
    for (const [page, watching] of mounts.watching) {
      const owed = new Map<string, { readonly table: RuleTable; readonly connections: number[] }>();
      for (const connection of watching) {
        const rules = (mounts.of(connection, page) ?? mounts.shared.get(page))?.rules ?? null;
        const sent = this.#sent.get(connection) ?? new Map<number, string>();
        if (rules !== null && sent.get(page) !== rules.key) {
          sent.set(page, rules.key);
          this.#sent.set(connection, sent);
          const group = owed.get(rules.key) ?? { table: rules.table, connections: [] };
          group.connections.push(connection);
          owed.set(rules.key, group);
        }
      }
      for (const { table, connections } of owed.values()) {
        context.rules({ connections }, page, table);
      }
    }
  }
}
