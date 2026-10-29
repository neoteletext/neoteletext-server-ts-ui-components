// A mount: one tree of component instances behind one copy of a page, the
// channel's or one viewer's. Its tree (tree.ts) reconciles each render with
// the last; it draws every sub-page (draw.ts) and answers the page as TTI;
// it routes the keys through focus, and the pointer, the wheel and hovers
// to the components drawn where they land (pointer.ts); and it runs its
// components' timers (timers.ts).

// oxlint-disable import/max-dependencies -- the mount is where a page's tree, drawing, keys, pointer and timers meet
import { Key } from "../kit.ts";
import type { ComponentEvent, ComponentEventInit } from "./component-events.ts";
import type { ComponentHost, FocusableAt } from "./component-host.ts";
import type { Box } from "./layout.ts";
import { draw, type DrawHost, type Reach, shownSubPages } from "./draw.ts";
import type { Element } from "./element.ts";
import { isPress, type KeyEvent, type TextEvent, typedText } from "./events.ts";
import { captured, FocusHistory, focusMove } from "./focus.ts";
import { emptyGrid } from "./grid.ts";
import type { KeyHelpEntry } from "./key-bindings.ts";
import { type AnyComponent, bubble, EMPTY, firstFocusable, focusables, nearest, type Node } from "./node.ts";
import type { ColourTable } from "./rollover.ts";
import { Pointer } from "./pointer.ts";
import type { Services } from "./services.ts";
import { Timers } from "./timers.ts";
import { Tree } from "./tree.ts";

/** Renders a mount may do in one flush, as commit-phase updates cause more: past it, a loop is reported. */
const MOST_PASSES = 8;

/** What a mount needs of the runtime. */
export interface MountHost {
  readonly services: Services;
  readonly nextTimerId: () => number;
  readonly report: (text: string) => void;
  /** Whether someone has the page open, for the timers that run only then. */
  readonly viewed: () => boolean;
  /** The page's controls' rollover colours (rollover.ts), or null for the receiver's own hover look. */
  readonly rollover: ColourTable | null;
}

export class Mount implements ComponentHost {
  readonly page: number;
  readonly services: Services;
  readonly #host: MountHost;
  readonly #draw: DrawHost;
  readonly #tree: Tree;
  readonly #timers: Timers;
  #rootElement: Element;
  #dirty = true;
  #focus: Node | null = null;
  readonly #history = new FocusHistory();
  #reach: Reach = { grid: emptyGrid(), controls: [] };
  readonly #pointer: Pointer;
  /** The page as last answered. */
  lastTti: string | null = null;

  constructor(page: number, root: Element, host: MountHost) {
    this.page = page;
    this.#rootElement = root;
    this.#host = host;
    this.services = host.services;
    this.#draw = { page, rollover: host.rollover, report: host.report, mostSubPages: (): number => host.services.limits().standard.numberedSubpages };
    this.#tree = new Tree({
      components: this,
      unmounted: (node): void => {
        this.#forget(node);
      },
    });
    this.#timers = new Timers({ nextTimerId: host.nextTimerId, now: (): number => this.services.now(), viewed: host.viewed });
    this.#pointer = new Pointer({
      reach: (): Reach => this.#reach,
      focusOn: (node): void => {
        this.#focusOn(node);
      },
    });
  }

  /** Whether something waits to be drawn. */
  get dirty(): boolean {
    return this.#dirty;
  }

  /** Gives the root new props: data from outside changed. */
  setRoot(root: Element): void {
    this.#rootElement = root;
    this.#dirty = true;
  }

  // ComponentHost.

  invalidate(component: AnyComponent): void {
    if (this.#tree.nodes.has(component)) {
      this.#dirty = true;
      this.#tree.forced.add(component);
    }
  }

  focus(component: AnyComponent): void {
    const node = this.#tree.nodes.get(component);
    if (node !== undefined) {
      this.#focusOn(node);
    }
  }

  isFocused(component: AnyComponent): boolean {
    return this.#focus?.component === component;
  }

  isHovered(component: AnyComponent): boolean {
    return this.#pointer.isHovered(component);
  }

  setTimer(component: AnyComponent, run: () => void, delay: number, every: boolean, whileViewed: boolean): number {
    return this.#timers.set(component, run, delay, every, whileViewed);
  }

  clearTimer(id: number): void {
    this.#timers.clear(id);
  }

  boxOf(component: AnyComponent): Box {
    return this.#tree.nodes.get(component)?.box ?? EMPTY;
  }

  emit(component: AnyComponent, event: ComponentEventInit): void {
    // The event's source is the component that sends it, whatever the init said.
    const sent = { ...event, source: component } as ComponentEvent;
    bubble(this.#tree.nodes.get(component)?.parent ?? null, (each) => each.onComponentEvent?.(sent));
  }

  focusedHint(): string | null {
    return this.hoveredHint() ?? this.#focus?.component.hint() ?? null;
  }

  focusedBindings(): readonly KeyHelpEntry[] {
    return this.#focus?.component.keyBindings() ?? [];
  }

  focusablesUnder(component: AnyComponent): readonly FocusableAt[] {
    const node = this.#tree.nodes.get(component);
    return node === undefined ? [] : focusables(node).flatMap((each) => (each === node ? [] : [{ component: each.component, box: each.box }]));
  }

  hoveredHint(): string | null {
    return this.#hinted()?.hint() ?? null;
  }

  hintIsKeys(): boolean {
    const source = this.#hinted() ?? this.#focus?.component ?? null;
    return source !== null && !source.hintDescribes();
  }

  /** The component under the viewer's pointer that says what it does, nearest first; on the copy every viewer shares, which follows no one's pointer, none. */
  #hinted(): AnyComponent | null {
    const { session } = this.services;
    return session === null ? null : nearest(this.#pointer.hoveredBy(session), (each) => each.hint() !== null);
  }

  // Rendering.

  /** Renders what changed and answers the page as TTI. */
  render(): string {
    for (let pass = 0; pass < MOST_PASSES && this.#dirty; pass += 1) {
      this.#dirty = false;
      this.#tree.reconcile(this.#rootElement);
      const shown = shownSubPages(this.#tree.root, this.#draw);
      // The keys go back to what had them before the one that went (a dialog), or else to the first component that takes them; chosen before painting, so a focused component draws itself so.
      if (this.#focus === null || !this.#focus.component.mounted) {
        this.#focusOn(this.#history.back() ?? firstFocusable(this.#tree.root));
      }
      const drawn = draw(shown, this.#draw);
      this.#reach = drawn.reach;
      this.lastTti = drawn.tti;
      this.#tree.commit();
    }
    if (this.#dirty) {
      this.#host.report(`page ${this.page.toString(16)}: still changing after ${MOST_PASSES} renders; a component's update sets state each time`);
      this.#dirty = false;
    }
    return this.lastTti ?? "";
  }

  /** Unmounts every component: the viewer left the page or went. */
  unmount(): void {
    this.#tree.unmountAll();
    this.#timers.clearAll();
  }

  /** What the mount keeps of an unmounting component goes: its timers, the pointer it held or was under, and the keys. */
  #forget(node: Node): void {
    this.#timers.clearOwner(node.component);
    this.#pointer.forget(node);
    this.#history.forget(node);
    if (this.#focus === node) {
      this.#focus = null;
    }
  }

  // The keys.

  /** Gives the keys to `node`, telling the one that had them and the one that has them now. */
  #focusOn(node: Node | null): void {
    if (node === this.#focus) {
      return;
    }
    const before = this.#focus;
    if (before !== null) {
      this.#history.left(before);
    }
    this.#focus = node;
    this.#dirty = true;
    // Both render again: what they render may say whether they have the keys.
    for (const each of [before, node]) {
      if (each !== null) {
        this.#tree.forced.add(each.component);
      }
    }
    if (before !== null && before.component.mounted) {
      before.component.componentDidBlur?.();
    }
    node?.component.componentDidFocus?.();
  }

  key(event: KeyEvent): boolean {
    const focus = this.#focus ?? this.#tree.root;
    if (captured(this.#focus, event) || focus?.component.onKey?.(event) === true) {
      return true;
    }
    // Typing comes as each key's press and repeat with its text (INPUT.md section 6.3): the component with the keys has it as text before any above it has it as a key, so a field types the letter a page's shortcut would take.
    const typed = typedText(event);
    const text = typed === undefined ? null : { session: event.session, text: typed };
    if (text !== null && focus?.component.onText?.(text) === true) {
      return true;
    }
    if (
      bubble(focus?.parent ?? null, (component) => component.onKey?.(event)) ||
      [...this.#tree.components()].some((component) => component.onPageKey?.(event) === true)
    ) {
      return true;
    }
    const moved = this.#focus === null && !isPress(event, Key.Tab) ? null : focusMove(event, this.#focus, focusables(this.#tree.root));
    if (moved !== null) {
      this.#focusOn(moved);
      return true;
    }
    // What no component took as a key is typed text for those above the one with the keys.
    return text !== null && bubble(focus?.parent ?? null, (component) => component.onText?.(text));
  }

  text(event: TextEvent): boolean {
    return bubble(this.#focus ?? this.#tree.root, (component) => component.onText?.(event));
  }

  paste(event: TextEvent): boolean {
    return bubble(this.#focus ?? this.#tree.root, (component) => component.onPaste?.(event) ?? component.onText?.(event));
  }

  /** The keys came to the page, or left it: every component hears it. */
  focusChanged(arrived: boolean): void {
    for (const component of this.#tree.components()) {
      if (arrived) {
        component.onPageFocus?.();
      } else {
        component.onPageBlur?.();
      }
    }
  }

  // The pointer.

  pointer(session: number, action: "press" | "release" | "move", row: number, column: number, button: number, buttons: number): boolean {
    return this.#pointer.pointer(session, action, row, column, button, buttons);
  }

  wheel(session: number, row: number, column: number, dx: number, dy: number): boolean {
    return this.#pointer.wheel(session, row, column, dx, dy);
  }

  /** The pointer entered or left a control (pointer.ts); the hint row is drawn again when what it says changes. */
  hover(session: number, entered: boolean, row: number, column: number): boolean {
    const hintBefore = this.focusedHint();
    const hoveredBefore = this.hoveredHint();
    const taken = this.#pointer.hover(session, entered, row, column);
    // A hint row of a page's own words shows the hovered control's alone, so either changing is a change.
    if (this.focusedHint() !== hintBefore || this.hoveredHint() !== hoveredBefore) {
      this.#dirty = true;
    }
    return taken;
  }

  // Timers.

  /** The earliest timer that may run, or null: one that runs only while viewed waits, without a wake, until someone comes. */
  nextWake(): number | null {
    return this.#timers.nextWake();
  }

  runTimers(now: number): void {
    this.#timers.run(now);
  }
}
