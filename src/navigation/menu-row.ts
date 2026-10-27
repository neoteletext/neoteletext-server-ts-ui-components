// A menu's row (menu.ts): a choice's number when the menu is numbered, its
// label, and on the right its shortcut or the mark of a menu it opens; or a
// rule between groups.

import { type Child, h } from "../core/element.ts";
import { cells } from "../core/text.ts";
import { Columns } from "../layout/columns.ts";
import type { RowLook } from "../lists/list-row.ts";
import { Text } from "../text/styles.ts";
import type { MenuItem } from "./menu.ts";
import { MenuRule } from "./menu-rule.ts";

/** What marks a choice that opens a menu. */
const OPENS = "→";

/** The shortcut's column beyond the shortcut: its colour's cell and a space. */
const SHORTCUT_LEAD = 2;

export function menuRow(item: MenuItem, number: number | null, look: RowLook): Child {
  if (item.rule === true) {
    return h(MenuRule, {});
  }
  const right = item.items === undefined ? (item.shortcut ?? "") : OPENS;
  const label = `${number === null ? "" : `${number} `}${item.label}`;
  return right === ""
    ? h(Text, { text: label, foreground: look.foreground })
    : h(
        Columns,
        { widths: [null, cells(right) + SHORTCUT_LEAD] },
        h(Text, { text: label, foreground: look.foreground }),
        h(Text, { text: right, foreground: look.foreground }),
      );
}
