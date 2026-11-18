// The pointer on a mount's page: the component each viewer's pointer is
// held by and the control it is over, and each pointer, wheel and hover
// event taken to the component drawn where it lands (grid.ts), then up; a
// press or the wheel where no component is drawn goes to the page's root.

import type { Box } from "./layout.ts";
import type { Reach } from "./draw.ts";
import type { Pointed } from "../kit.ts";
import type { HoverEvent, PointerEvent, WheelEvent } from "./events.ts";
import { inside } from "./grid.ts";
import { type AnyComponent, bubble, type Node } from "./node.ts";

/** What the pointer needs of its mount. */
export interface PointerHost {
  /** What the first sub-page's cells reach, as last drawn. */
  readonly reach: () => Reach;
  /** A press gives the keys to the component pressed, or the nearest one round it that takes them. */
  readonly focusOn: (node: Node) => void;
  /** The page's root component, which a press or the wheel on a cell no component reaches goes to, as a key with nothing focused does. */
  readonly root: () => Node | null;
}

/** Where an event at a cell is for the component it goes to: the cell within it, and the region it marked there. */
function placed(node: Node, row: number, column: number): { local: { row: number; column: number }; region?: string } {
  const region = node.regions.find((each) => inside(each, row, column));
  return { local: { row: row - node.box.row, column: column - node.box.column }, ...(region === undefined ? {} : { region: region.id }) };
}

/** A press, move or release on a cell, as the mount is given it: the button pressed or released, 0 left, the buttons held a bit each, and what comes with the pointer. */
export interface PointerAt extends Pointed {
  readonly action: "press" | "release" | "move";
  readonly row: number;
  readonly column: number;
  readonly button: number;
  readonly buttons: number;
  /** A release the page lost (REQ-207). */
  readonly lost?: true;
}

/** The wheel turned over a cell, in 1/120ths of a line, as the mount is given it, with what comes with the pointer. */
export interface WheelAt extends Pointed {
  readonly row: number;
  readonly column: number;
  readonly dx: number;
  readonly dy: number;
}

export class Pointer {
  readonly #host: PointerHost;
  /** The control under each connection's pointer, from its HOVER enter until the leave. */
  readonly #hovered = new Map<number, { readonly node: Node; readonly control: Box }>();
  /** The component holding the pointer, by connection, from a press it took until the release. */
  readonly #captured = new Map<number, Node>();

  constructor(host: PointerHost) {
    this.#host = host;
  }

  /** The component that declared the control `connection`'s pointer is on. */
  hoveredBy(connection: number): Node | null {
    return this.#hovered.get(connection)?.node ?? null;
  }

  isHovered(component: AnyComponent): boolean {
    return [...this.#hovered.values()].some(({ node }) => node.component === component);
  }

  /** `node` unmounted: no pointer is held by it or over its controls. */
  forget(node: Node): void {
    for (const [connection, held] of this.#captured) {
      if (held === node) {
        this.#captured.delete(connection);
      }
    }
    for (const [connection, hovered] of this.#hovered) {
      if (hovered.node === node) {
        this.#hovered.delete(connection);
      }
    }
  }

  pointer(connection: number, at: PointerAt): boolean {
    const { action, row, column, button } = at;
    const event = (node: Node): PointerEvent => ({ connection, ...at, ...placed(node, row, column) });
    const held = this.#captured.get(connection);
    if (held !== undefined && action !== "press") {
      if (action === "release") {
        this.#captured.delete(connection);
      }
      held.component.onPointer?.(event(held));
      return true;
    }
    // Every move over the page comes (DOC-1945), a button held or not: it goes, as a press does, to the component drawn where it is, then up.
    const target = this.#reached(row, column);
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
        this.#captured.set(connection, node);
        return true;
      }
      return taken || (action === "press" && button === 0 && component.onClick?.(sent) === true);
    });
  }

  wheel(connection: number, at: WheelAt): boolean {
    const { row, column } = at;
    return bubble(this.#reached(row, column), (component, node) => {
      const event: WheelEvent = { connection, ...at, ...placed(node, row, column) };
      return component.onWheel?.(event);
    });
  }

  /**
   * The component a press, a move or the wheel on a cell goes to: the one
   * drawn deepest there, or else the page's root, as a key with nothing
   * focused goes to the root (mount.ts). A sub-page given whole
   * (RawSubPage) declares no cells, so without this its page would hear
   * neither the wheel nor a press (TODO-2013).
   */
  #reached(row: number, column: number): Node | null {
    return this.#host.reach().grid[row]?.[column] ?? this.#host.root();
  }

  /**
   * The pointer entered or left the control whose first cell is `row`,
   * `column` (DOC-1940): it goes to the component that
   * declared the control, then up. A leave goes where the enter went,
   * whatever the page has become since; an enter while another control is
   * still entered leaves that one first. An enter where no control of the
   * page begins now, as the page changed under the pointer, and a leave
   * with no enter before it, are dropped.
   */
  hover(connection: number, entered: boolean, row: number, column: number): boolean {
    const before = this.#hovered.get(connection);
    // An enter of the control already entered says nothing new.
    const again = entered && before !== undefined && before.control.row === row && before.control.column === column;
    let taken = false;
    if (before !== undefined && !again) {
      this.#hovered.delete(connection);
      taken = this.#hoverOn(before.node, connection, false, before.control.row, before.control.column);
    }
    if (entered && !again) {
      const found = this.#host.reach().controls.find(({ control }) => control.row === row && control.column === column);
      if (found !== undefined) {
        this.#hovered.set(connection, found);
        taken = this.#hoverOn(found.node, connection, true, row, column) || taken;
      }
    }
    return taken;
  }

  /**
   * `connection`'s pointer left the page, or its receiver lost it (protocol
   * 11's mouse `gone`, REQ-1355): the control it was over is left, as a
   * HOVER leave leaves it, and no component holds the pointer any longer.
   * A button held has come first as a release marked lost.
   */
  gone(connection: number): boolean {
    this.#captured.delete(connection);
    const before = this.#hovered.get(connection);
    if (before === undefined) {
      return false;
    }
    this.#hovered.delete(connection);
    return this.#hoverOn(before.node, connection, false, before.control.row, before.control.column);
  }

  #hoverOn(from: Node, connection: number, entered: boolean, row: number, column: number): boolean {
    return bubble(from, (component, node) => {
      const event: HoverEvent = { connection, entered, row, column, ...placed(node, row, column) };
      return component.onHover?.(event);
    });
  }
}
