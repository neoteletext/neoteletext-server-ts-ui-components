// A mount: one tree of component instances (tree.ts) behind one copy of a page, the channel's or one viewer's, reconciled with each render. It draws every
// sub-page (draw.ts), routes keys through focus and the pointer, wheel and hovers to the components drawn there (pointer.ts), and runs timers (timers.ts).

// oxlint-disable import/max-dependencies, max-lines -- the mount is where a page's tree, drawing, keys, pointer, timers and pictures meet; what is not theirs is in its own modules
import type { LanguageTag, TextLevel } from "../kit.ts";
import { MountPicture } from "../picture/mount-picture.ts";
import type { Renderer } from "../picture/renderer.ts";
import type { ComponentEvent, ComponentEventInit } from "./component-events.ts";
import type { ComponentHost, FocusableAt } from "./component-host.ts";
import type { Box } from "./layout.ts";
import { draw, type DrawHost, drawHost, type DrawnPage, type Reach, shownSubPages } from "./draw.ts";
import type { Element } from "./element.ts";
import { nodeLanguage, type TextLanguage } from "./language.ts";
import type { KeyEvent } from "./events.ts";
import { routeKey } from "./focus.ts";
import type { KeptComponents } from "./kept-components.ts";
import type { KeyHelpEntry } from "./key-bindings.ts";
import { Hints } from "./hints.ts";
import { type AnyComponent, bubble, EMPTY, focusables, type Node } from "./node.ts";
import type { ColourTable } from "./rollover.ts";
import { Pointer } from "./pointer.ts";
import { SubPageKeys } from "./sub-page-keys.ts";
import { SubPages, subPageComponents } from "./sub-pages.ts";
import type { Services } from "./services.ts";
import { Timers } from "./timers.ts";
import { Tree } from "./tree.ts";

/** Renders a mount may do in one flush, as commit-phase updates cause more: past it, a loop is reported. */
const MOST_PASSES = 8;

/** What a mount needs of the runtime. */
export interface MountHost {
  readonly services: Services;
  readonly nextTimerId: () => number;
  readonly kept: KeptComponents;
  readonly report: (text: string) => void;
  /** Whether someone has the page open, for the timers that run only then. */
  readonly viewed: () => boolean;
  /** The page's controls' rollover colours (rollover.ts), or null for the receiver's own hover look. */
  readonly rollover: ColourTable | null;
  /** The page's own language and level (PageSpec), or null for the viewer's language and NeoTeletext's own level. */
  readonly pageLanguage: LanguageTag | null;
  readonly level: TextLevel | null;
  /** What the page is drawn in (PageSpec.renderer, renderer parity PAR-42). */
  readonly renderer: Renderer;
  /** The stand-in for the channel's words in `language`, the viewer's, or undefined where they are drawn as written (ComponentChannelOptions.standIn). */
  readonly standIn: (language: LanguageTag) => TextLanguage["standIn"];
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
  /** The keys of each sub-page drawn, a page of its own (DEC-6599). */
  readonly #keys: SubPageKeys;
  /** Presses, moves and the wheel go straight to it; a hover goes through {@link hover}, which draws the hint row again. */
  readonly pointer: Pointer;
  /** The page as last drawn. */
  lastPage: DrawnPage | null = null;
  /** The sub-pages as last drawn, each a page of its own: what its cells reach, its rule table, and which one the input being routed came from. */
  readonly subPages: SubPages;
  /** What the hint row says, and whether a component reads what the pointer is over, so that the page's table asks for the pointer coming onto its controls. */
  readonly #hints: Hints;
  /** On a picture page, what it keeps of its pictures (renderer parity PAR-42); null on a teletext page. */
  readonly picture: MountPicture | null;

  constructor(page: number, root: Element, host: MountHost) {
    this.page = page;
    this.#rootElement = root;
    this.#host = host;
    this.services = host.services;
    this.subPages = new SubPages(() => this.services.limits());
    this.#keys = new SubPageKeys(
      () => this.subPages.roots(),
      (before, node) => {
        this.#moved(before, node);
      },
    );
    this.picture = host.renderer === "teletext" ? null : new MountPicture(host.renderer, host.rollover);
    this.#draw = drawHost(
      page,
      host,
      (node): TextLanguage => this.#languageOfNode(node),
      (node): number => this.picture?.numberOf(node) ?? 0,
    );
    this.#tree = new Tree({
      components: this,
      kept: host.kept,
      unmounted: (node): void => {
        this.#forget(node);
      },
    });
    this.#timers = new Timers({ nextTimerId: host.nextTimerId, now: (): number => this.services.now(), viewed: host.viewed });
    this.#hints = new Hints({
      focused: (): AnyComponent | null => this.#keys.focusOf(this.subPages.routedRoot())?.component ?? null,
      hovered: (): Node | null => (this.services.connection === null ? null : this.pointer.hoveredBy(this.services.connection)),
    });
    this.pointer = new Pointer({
      reach: (): Reach => this.subPages.routedReach(),
      focusOn: (node): void => {
        this.#keys.focusOn(this.#keys.rootOf(node), node);
      },
      root: (): Node | null => this.#tree.root,
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
      this.#keys.focusOn(this.#keys.rootOf(node), node);
    }
  }

  /** Whether `component` has the keys of the sub-page it is drawn on. */
  isFocused(component: AnyComponent): boolean {
    const node = this.#tree.nodes.get(component);
    return node !== undefined && this.#keys.isFocused(node);
  }

  isHovered(component: AnyComponent): boolean {
    this.#hints.read = true;
    return this.pointer.isHovered(component);
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
    return this.#hints.focused();
  }

  focusedBindings(): readonly KeyHelpEntry[] {
    return this.#keys.focusOf(this.subPages.routedRoot())?.component.keyBindings() ?? [];
  }

  focusablesUnder(component: AnyComponent): readonly FocusableAt[] {
    const node = this.#tree.nodes.get(component);
    return node === undefined ? [] : focusables(node).flatMap((each) => (each === node ? [] : [{ component: each.component, box: each.box }]));
  }

  languageOf(component: AnyComponent): TextLanguage {
    return this.#languageOfNode(this.#tree.nodes.get(component) ?? null);
  }

  /** The nearest `language` prop from `node` up, else the page's, else the viewer's, with the channel's stand-in for it when it has one; from outside the program when the nearest `outside` prop says so. */
  #languageOfNode(node: Node | null): TextLanguage {
    const { services } = this;
    return nodeLanguage(node, this.#host.pageLanguage, () => services.language(services.connection), services.languages(), this.#host.standIn);
  }

  /** Draws every component again: what they all read changed (the viewer's language). */
  redrawAll(): void {
    this.#tree.forceAll();
    this.#dirty = true;
  }

  hoveredHint(): string | null {
    return this.#hints.hovered();
  }

  hintIsKeys(): boolean {
    return this.#hints.isKeys();
  }

  // Rendering.

  /** Renders what changed and answers the page drawn. */
  render(): DrawnPage | null {
    for (let pass = 0; pass < MOST_PASSES && this.#dirty; pass += 1) {
      this.#dirty = false;
      this.#tree.reconcile(this.#rootElement);
      const shown = shownSubPages(this.#tree.root, this.#draw);
      this.subPages.found(shown);
      // The keys are placed before painting, so a focused component draws itself so.
      this.#keys.place(this.#tree.root);
      const drawn = draw(shown, this.#draw);
      this.subPages.drawn(shown, drawn.reaches);
      this.lastPage = drawn.page;
      this.#tree.commit();
    }
    // A sub-page is a page (DEC-6599): each one's table is written from its own components alone.
    this.subPages.writeRules(this.#tree.root, this.#hints.read);
    if (this.#dirty) {
      this.#host.report(`page ${this.page.toString(16)}: still changing after ${MOST_PASSES} renders; a component's update sets state each time`);
      this.#dirty = false;
    }
    return this.lastPage;
  }

  /** Unmounts every component: the viewer left the page or went. */
  unmount(): void {
    this.#tree.unmountAll();
    this.#timers.clearAll();
  }

  /** What the mount keeps of an unmounting component goes: its timers, the pointer it held or was under, and the keys. */
  #forget(node: Node): void {
    this.#timers.clearOwner(node.component);
    this.pointer.forget(node);
    this.#keys.forget(node);
    this.picture?.forget(node);
  }

  // The keys.

  /** The keys of a sub-page went from `before` to `node`: both render again, since what they render may say whether they have the keys, and each is told. */
  #moved(before: Node | null, node: Node | null): void {
    this.#dirty = true;
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

  /** A key, on the sub-page the input came from: to its focused component, its own components and those it is drawn within alone (DEC-6599). */
  key(event: KeyEvent): boolean {
    const root = this.subPages.routedRoot();
    const components = root === null ? this.#tree.components() : subPageComponents(root);
    return routeKey(event, this.#keys.focusOf(root), root ?? this.#tree.root, components, (node) => {
      this.#keys.focusOn(root, node);
    });
  }

  /** Where text that came from no key goes first, as typing does: the component with the keys of the sub-page it came from, or else that sub-page (focus.ts, routeTyped). */
  get typedAt(): Node | null {
    const root = this.subPages.routedRoot();
    return this.#keys.focusOf(root) ?? root ?? this.#tree.root;
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

  /** The pointer entered or left a control (pointer.ts); the hint row is drawn again when what it says changes. */
  hover(connection: number, entered: boolean, row: number, column: number): boolean {
    const [hintBefore, hoveredBefore] = this.#hints.shown();
    const taken = this.pointer.hover(connection, entered, row, column);
    // A hint row of a page's own words shows the hovered control's alone, so either changing is a change.
    const [hint, hovered] = this.#hints.shown();
    if (hint !== hintBefore || hovered !== hoveredBefore) {
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
