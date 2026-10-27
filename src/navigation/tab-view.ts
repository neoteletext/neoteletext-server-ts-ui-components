// Tabs and the chosen one's content (tabs.ts): its children are the views,
// one for each tab. Left and Right, a click, or the style's keys choose.

import { type Child, h } from "../core/element.ts";
import { isPress, type KeyEvent } from "../core/events.ts";
import { colourKeyOf, digitOf } from "../core/keys.ts";
import type { PageNeeds } from "../core/needs.ts";
import { Key } from "../kit.ts";
import { type ValueProps, ValueControl, type KeyHelpEntry } from "../input/value-control.ts";
import { Rows } from "../layout/layouts.ts";
import { TabStrip, styleNeeds, type TabStyle } from "./tabs.ts";

/** The most tabs the digits choose: 1 to 9. */
const MOST_NUMBERED = 9;

/** What the hint row says of each style's keys. */
const KEYS_HINTS: Readonly<Record<TabStyle, KeyHelpEntry>> = {
  chips: ["Left Right or a click", "choose a tab"],
  fastext: ["The coloured keys", "choose a tab"],
  numbered: ["1-9 or Left Right", "choose a tab"],
  underline: ["Left Right or a click", "choose a tab"],
};

/** The tab a coloured key or a digit names in `style`, counting from 0, or null. */
function namedTab(event: KeyEvent, style: TabStyle): number | null {
  if (style === "fastext") {
    return colourKeyOf(event);
  }
  return style === "numbered" ? (digitOf(event) ?? 0) - 1 : null;
}

/** The tab a key chooses in `style` among `count`, or null: none of no tabs, whose Left and Right go round nothing. */
function tabForKey(event: KeyEvent, style: TabStyle, count: number, active: number): number | null {
  if (count <= 0) {
    return null;
  }
  if (isPress(event, Key.Right)) {
    return (active + 1) % count;
  }
  if (isPress(event, Key.Left)) {
    return (active + count - 1) % count;
  }
  const index = namedTab(event, style);
  return index !== null && index >= 0 && index < Math.min(count, MOST_NUMBERED) ? index : null;
}

export interface TabViewProps extends ValueProps<number> {
  readonly tabs: readonly string[];
  readonly style?: TabStyle;
}

export class TabView extends ValueControl<number, TabViewProps> {
  protected empty(): number {
    return 0;
  }

  protected override keyNeeds(): PageNeeds {
    return styleNeeds(this.props.style ?? "chips");
  }

  override keyBindings(): readonly KeyHelpEntry[] {
    return [KEYS_HINTS[this.props.style ?? "chips"]];
  }

  override render(): Child {
    const views = this.props.children ?? [];
    return h(
      Rows,
      {},
      h(TabStrip, {
        tabs: this.props.tabs,
        active: this.value,
        style: this.props.style ?? "chips",
        focused: this.focused,
        disabled: this.disabled,
        onChange: (index: number, session: number) => {
          this.change(index, session);
        },
      }),
      views[this.value] ?? null,
    );
  }

  override onKey(event: KeyEvent): boolean {
    const index = this.disabled ? null : tabForKey(event, this.props.style ?? "chips", this.props.tabs.length, this.value);
    if (index === null) {
      return false;
    }
    this.change(index, event.session);
    return true;
  }
}
