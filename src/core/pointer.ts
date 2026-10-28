// The pointer on a mount's page: the component each viewer's pointer is
// held by and the control it is over, and each pointer, wheel and hover
// event taken to the component drawn where it lands (grid.ts), then up.

import type { Box } from "./layout.ts";
import type { Reach } from "./draw.ts";
import type { HoverEvent, PointerEvent, WheelEvent } from "./events.ts";
import { inside } from "./grid.ts";
import { type AnyComponent, bubble, type Node } from "./node.ts";

/** What the pointer needs of its mount. */
export interface PointerHost {
  /** What the first sub-page's cells reach, as last drawn. */
  readonly reach: () => Reach;
  /** A press gives the keys to the component pressed, or the nearest one round it that takes them. */
  readonly focusOn: (node: Node) => void;
}

/** Where an event at a cell is for the component it goes to: the cell within it, and the region it marked there. */
function placed(node: Node, row: number, column: number): { local: { row: number; column: number }; region?: string } {
  const region = node.regions.find((each) => inside(each, row, column));
  return { local: { row: row - node.box.row, column: column - node.box.column }, ...(region === undefined ? {} : { region: region.id }) };
}

export class Pointer {
  readonly #host: PointerHost;
  /** The control under each session's pointer, from its HOVER enter until the leave. */
  readonly #hovered = new Map<number, { readonly node: Node; readonly control: Box }>();
  /** The component holding the pointer, by session, from a press it took until the release. */
  readonly #captured = new Map<number, Node>();

  constructor(host: PointerHost) {
    this.#host = host;
  }

  /** The component that declared the control `session`'s pointer is on. */
  hoveredBy(session: number): Node | null {
    return this.#hovered.get(session)?.node ?? null;
  }

  isHovered(component: AnyComponent): boolean {
    return [...this.#hovered.values()].some(({ node }) => node.component === component);
  }

  /** `node` unmounted: no pointer is held by it or over its controls. */
  forget(node: Node): void {
    for (const [session, held] of this.#captured) {
      if (held === node) {
        this.#captured.delete(session);
      }
    }
    for (const [session, hovered] of this.#hovered) {
      if (hovered.node === node) {
        this.#hovered.delete(session);
      }
    }
  }

  pointer(session: number, action: "press" | "release" | "move", row: number, column: number, button: number, buttons: number): boolean {
    const event = (node: Node): PointerEvent => ({ session, action, row, column, button, buttons, ...placed(node, row, column) });
    const held = this.#captured.get(session);
    if (held !== undefined && action !== "press") {
      if (action === "release") {
        this.#captured.delete(session);
      }
      held.component.onPointer?.(event(held));
      return true;
    }
    // Every move over the page comes (INPUT.md section 9.8), a button held or not: it goes, as a press does, to the component drawn where it is, then up.
    const target = this.#host.reach().grid[row]?.[column] ?? null;
    if (action === "press") {
      for (let node = target; node !== null; node = node.parent) {
        if (node.component.focusable()) {
          this.#host.focusOn(node);
          break;
        }
      }
    }
    return bubble(target, (component, node) => {
      const sent = event(node);
      const taken = component.onPointer?.(sent) === true;
      if (taken && action === "press") {
        this.#captured.set(session, node);
        return true;
      }
      return taken || (action === "press" && button === 0 && component.onClick?.(sent) === true);
    });
  }

  wheel(session: number, row: number, column: number, dx: number, dy: number): boolean {
    const target = this.#host.reach().grid[row]?.[column] ?? null;
    return bubble(target, (component, node) => {
      const event: WheelEvent = { session, row, column, dx, dy, ...placed(node, row, column) };
      return component.onWheel?.(event);
    });
  }

  /**
   * The pointer entered or left the control whose first cell is `row`,
   * `column` (INPUT.md section 5.4, HOVER): it goes to the component that
   * declared the control, then up. A leave goes where the enter went,
   * whatever the page has become since; an enter while another control is
   * still entered leaves that one first. An enter where no control of the
   * page begins now, as the page changed under the pointer, and a leave
   * with no enter before it, are dropped.
   */
  hover(session: number, entered: boolean, row: number, column: number): boolean {
    const before = this.#hovered.get(session);
    // An enter of the control already entered says nothing new.
    const again = entered && before !== undefined && before.control.row === row && before.control.column === column;
    let taken = false;
    if (before !== undefined && !again) {
      this.#hovered.delete(session);
      taken = this.#hoverOn(before.node, session, false, before.control.row, before.control.column);
    }
    if (entered && !again) {
      const found = this.#host.reach().controls.find(({ control }) => control.row === row && control.column === column);
      if (found !== undefined) {
        this.#hovered.set(session, found);
        taken = this.#hoverOn(found.node, session, true, row, column) || taken;
      }
    }
    return taken;
  }

  #hoverOn(from: Node, session: number, entered: boolean, row: number, column: number): boolean {
    return bubble(from, (component, node) => {
      const event: HoverEvent = { session, entered, row, column, ...placed(node, row, column) };
      return component.onHover?.(event);
    });
  }
}
