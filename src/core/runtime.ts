// Pages of components as one of the kit's applications: the protocol's
// events become mounts, renders and publications (DOC-1964).
// - `start`: every page is mounted once as the channel's copy, and published.
// - `opened`: a page with a copy for each viewer is mounted for that viewer (or found, if it was kept while they were away).
// - `input`: to the viewer's mount, or the channel's for a shared page; `wake`: the timers that are due run.
// - `leftPage` and `gone`: the viewer's mounts are unmounted; what their components keep (REQ-1058) stays in the store.
// - `viewerBegan`: what the connection held with no viewer is kept under the viewer's handle (viewer-state.md VS-407).
// - `rulesFault`: a fault a viewer's receiver found in a page's rule table is logged; the table is the library's (rule-tables.ts).
// After each call every mount with something new renders, and a page is published only if its TTI changed; each page's rule table, written from its
// components (page-rules.md RULE-54), is sent to the connections that have the page open when it is not the one they have. A viewer's copy is published only while it
// differs from the channel's; when it is the same again it is released, so a viewer who only reads costs the server nothing.

// oxlint-disable import/max-dependencies -- the runtime is where the protocol's calls meet the mounts, streams, sounds and publication
// oxlint-disable max-lines -- the runtime is the kit's Application, a method for each of the protocol's calls, and protocol 13 added five, protocol 14 one; what is not a call is in its own modules
import {
  ANY_SUB,
  type Application,
  type Context,
  ffmpegOpus,
  type Input,
  type LanguageTag,
  type PageEntry,
  type PageRequest,
  type ServerMessageRulesFault,
  type ServerStats,
  type StateRefusal,
  type Viewer,
} from "../kit.ts";
import { type ComponentChannelOptions } from "./channel-options.ts";
import { EventBus } from "./bus.ts";
import { ViewerAddresses } from "./viewer-addresses.ts";
import type { LibraryEvents } from "./library-events.ts";
import type { PageParams } from "./services.ts";
import { ViewerParams } from "./viewer-params.ts";
import { ViewerLanguages } from "./viewer-languages.ts";
import { ViewerStates } from "./viewer-states.ts";
import type { StateStore } from "./state-store.ts";
import { dispatchInput } from "./dispatch-input.ts";
import { LiveStreams } from "./live-streams.ts";
import type { Mount } from "./mount.ts";
import { ConnectionMounts } from "./connection-mounts.ts";
import { type MountParts, newMount } from "./page-mounts.ts";
import { describedBy, type PageSpec, SpecNeeds } from "./page-spec.ts";
import { earliestWake, publishChanges } from "./publish.ts";
import type { PageSelectionKeys } from "./page-selection.ts";
import { RuleTables } from "./rule-tables.ts";
import { Selections } from "./selections.ts";
import { SoundObjects } from "./sound-objects.ts";
import type { KeptComponents } from "./kept-components.ts";

export class ComponentChannel implements Application {
  readonly bus = new EventBus<LibraryEvents>();
  readonly #specs: ReadonlyMap<number, PageSpec>;
  readonly #mounts = new ConnectionMounts();
  readonly #tables: RuleTables;
  /** The sub-page each connection's selection shows: a sub-page is a page (DEC-6599). */
  readonly #selections = new Selections();
  #context: Context | null = null;
  #timerId = 0;
  readonly #sounds: SoundObjects;
  readonly #needs = new SpecNeeds();
  readonly #params = new ViewerParams();
  readonly #streams: LiveStreams;
  readonly #addresses = new ViewerAddresses();
  readonly #languages: ViewerLanguages;
  readonly #store: StateStore | null;
  readonly #viewerStates: ViewerStates;
  /** Each viewer's mount's kept components, to write when the viewer begins. */
  readonly #kept = new WeakMap<Mount, KeptComponents>();

  constructor(specs: readonly PageSpec[], options: ComponentChannelOptions = {}) {
    this.#specs = new Map(specs.map((spec) => [spec.page, spec]));
    this.#store = options.state ?? null;
    this.#tables = new RuleTables({ written: options.ruleTables !== "none", selection: this.#selection, selections: this.#selections });
    this.#viewerStates = new ViewerStates(this.#store);
    this.#languages = new ViewerLanguages({
      channel: options.language,
      changed: this.#languageChanged,
      standIn: options.standIn,
      store: this.#store,
      viewers: this.#viewerStates,
    });
    const opus = options.opus ?? ffmpegOpus();
    this.#sounds = new SoundObjects(opus);
    this.#streams = new LiveStreams(opus);
  }

  /** The keys the kit's page selection takes of `page`: those its spec, or what is on it, has no use for. */
  readonly #selection = (page: number): PageSelectionKeys => {
    const spec = this.#specs.get(page);
    return { digits: spec !== undefined && !this.#needs.ownsDigits(spec), colourKeys: spec !== undefined && !this.#needs.ownsColourKeys(spec) };
  };

  /** Whether the page's spec, or what is on it, keeps a copy for each viewer: for tests. */
  perViewer(page: number): boolean {
    const spec = this.#specs.get(page);
    return spec !== undefined && this.#needs.perViewer(spec);
  }

  pages(): readonly PageEntry[] {
    return [...this.#specs.values()].map((spec) => this.#needs.entryOf(spec));
  }

  start(context: Context): void {
    this.#needs.logUnprobed(context);
    this.#run(context, () => {
      // A program the server started again is sent start again: whatever was mounted before goes.
      this.#mounts.clear();
      this.#tables.clear();
      this.#selections.clear();
      this.#sounds.forgetAll();
      this.#viewerStates.clear();
      for (const spec of this.#specs.values()) {
        this.#mounts.shared.set(spec.page, this.#mount(spec, null));
      }
    });
  }

  joined(connection: number, context: Context): void {
    this.#run(context, () => {
      this.#viewerStates.joined(connection);
      this.#languages.joined(context, connection);
    });
  }

  request(connection: number, page: number, request: PageRequest | null, context: Context): void {
    const parameters = request === null || request.queryText === "" ? null : request.queryText;
    this.#run(context, () => {
      // Every selection, of a page or of another of its sub-pages, is the opening of a page, whose table is sent afresh.
      this.#selections.selected(connection, page, request);
      if (request !== null) {
        this.#tables.selected(connection);
      }
      if (this.#addresses.parameters(connection, page) === parameters) {
        return;
      }
      this.#addresses.setParameters(connection, page, parameters);
      this.bus.emit("parameters", { connection, parameters }, { page, connection });
      if (request !== null && this.#params.queried(connection, page, parameters === null ? null : request.query)) {
        this.#show(connection, page);
      }
    });
  }

  /** The viewer's page is made again with what it is now made with: one they have mounted shows it at once. */
  #show(connection: number, page: number): void {
    const spec = this.#specs.get(page);
    const mount = this.#mounts.of(connection, page);
    if (spec !== undefined && mount !== undefined) {
      mount.setRoot(spec.root(this.#params.of(connection, page)));
    }
  }

  opened(connection: number, page: number, context: Context): void {
    this.#run(context, () => {
      this.#mounts.watch(connection, page);
      const spec = this.#specs.get(page);
      if (spec !== undefined && this.#ownCopy(spec, connection)) {
        this.#viewerMount(spec, connection);
      }
      // A clock that waited while nobody watched catches up before the page is sent.
      this.#mounts.shared.get(page)?.runTimers(context.now());
    });
  }

  leftPage(connection: number, page: number, context: Context): void {
    this.#run(context, () => {
      this.#mounts.watching.get(page)?.delete(connection);
      this.#streams.left(context, connection, page);
      const spec = this.#specs.get(page);
      if (spec === undefined || this.#mounts.of(connection, page) === undefined || spec.keepWhileAway === true) {
        return;
      }
      if (this.#mounts.unmount(connection, page)) {
        context.release(connection, page);
      }
    });
  }

  input(connection: number, page: number, input: Input, context: Context, sub: number): boolean {
    let taken = false;
    this.#run(
      context,
      () => {
        const spec = this.#specs.get(page);
        if (spec === undefined) {
          return;
        }
        const mount =
          this.#mounts.of(connection, page) ?? (this.#ownCopy(spec, connection) ? this.#viewerMount(spec, connection) : this.#mounts.shared.get(page));
        if (mount === undefined) {
          return;
        }
        // The input is the sub-page's it came from: 3F7F, which names none, is the one the connection selected.
        mount.subPages.routeOn(sub === ANY_SUB ? this.#selections.subOf(connection, page) : sub);
        taken = dispatchInput(mount, connection, input);
      },
      connection,
    );
    return taken;
  }

  wake(context: Context): void {
    this.#run(context, () => {
      const now = context.now();
      this.#streams.pump(context, now);
      for (const mount of this.#mounts.all()) {
        mount.runTimers(now);
      }
    });
  }

  gone(connection: number, context: Context): void {
    this.#run(context, () => {
      this.#mounts.forget(connection);
      this.#tables.forget(connection);
      this.#selections.forget(connection);
      this.#sounds.forget(connection);
      this.#streams.forget(connection);
      this.#params.forget(connection);
      this.#addresses.forget(connection);
      this.#languages.forget(connection);
      this.#viewerStates.gone(connection);
      this.bus.emit("gone", { connection });
    });
  }

  /** The connection's viewer began: what it held with no viewer is theirs now (VS-407). */
  viewerBegan(connection: number, _viewer: Viewer, _remembered: boolean, context: Context): void {
    this.#run(context, () => {
      this.#viewerStates.began(connection);
      this.#languages.began(context, connection);
      for (const mount of this.#mounts.ofConnection(connection)) {
        this.#kept.get(mount)?.keepAll();
      }
      this.bus.emit("viewer", { connection, viewer: this.#viewerStates.viewer(context, connection) });
    });
  }

  viewerLeft(connection: number, context: Context): void {
    this.#run(context, () => {
      this.bus.emit("viewer", { connection, viewer: null });
    });
  }

  /** Refused, the connection is not asked again, and keeps what it holds for its own life (VS-407). */
  stateRefused(connection: number, _reason: StateRefusal, context: Context): void {
    this.#run(context, () => {
      this.#viewerStates.refused(connection);
    });
  }

  viewersReset(context: Context): void {
    this.#run(context, () => {
      this.#viewerStates.reset();
      this.bus.emit("viewerEnded", { handle: null });
    });
  }

  /** A viewer's receiver found a fault in a page's rule table (page-rules.md RULE-48): the table is the library's, so the channel's log says it. */
  rulesFault(fault: ServerMessageRulesFault, context: Context): void {
    context.log(
      `page ${fault.page}/${fault.sub}: connection ${fault.connection}'s receiver reported the rule table fault ${fault.fault}, ${fault.count} times`,
    );
  }

  stats(stats: ServerStats, context: Context): void {
    this.#run(context, () => {
      this.bus.emit("stats", stats);
    });
  }

  describe(page: number): ReturnType<typeof describedBy> {
    return describedBy(this.#specs.get(page));
  }

  // The mounts.

  /** Whether the viewer is to see a copy of the page of their own: its components need one, or the page is in the viewer's language and that is not the channel's. */
  #ownCopy(spec: PageSpec, connection: number): boolean {
    return this.#needs.perViewer(spec) || (spec.language === undefined && this.#languages.differs(this.#context, connection));
  }

  /** A viewer's new language draws every page they have open again in it. */
  readonly #languageChanged = (connection: number, language: LanguageTag): void => {
    this.bus.emit("language", { connection, language }, { connection });
    for (const [page, watching] of this.#mounts.watching) {
      const spec = this.#specs.get(page);
      if (spec !== undefined && watching.has(connection) && this.#ownCopy(spec, connection)) {
        this.#viewerMount(spec, connection);
      }
    }
    for (const mount of this.#mounts.ofConnection(connection)) {
      mount.redrawAll();
    }
  };

  #viewerMount(spec: PageSpec, connection: number): Mount {
    return this.#mounts.viewerMount(connection, spec.page, () => this.#mount(spec, connection, this.#params.of(connection, spec.page)));
  }

  #mount(spec: PageSpec, connection: number | null, params?: PageParams): Mount {
    const { mount, kept } = newMount(this.#mountParts, spec, connection, params);
    this.#kept.set(mount, kept);
    return mount;
  }

  /** What a mount is made from: read as each is made. */
  get #mountParts(): MountParts {
    return {
      bus: this.bus,
      context: () => this.#context,
      parameters: (connection, page) => this.#addresses.parameters(connection, page),
      redirect: this.#redirect,
      streams: this.#streams,
      sounds: this.#sounds,
      languages: this.#languages,
      viewers: this.#viewerStates,
      store: this.#store,
      watching: this.#mounts.watching,
      nextTimerId: () => {
        this.#timerId += 1;
        return this.#timerId;
      },
    };
  }

  /** Sends a viewer to a page, with what it is to show: a page they already have open shows it at once. */
  readonly #redirect = (context: Context, connection: number, page: number, params: PageParams | undefined): void => {
    if (params !== undefined) {
      this.#params.redirected(connection, page, params);
      this.#show(connection, page);
    }
    context.redirect(connection, page);
  };

  /** Runs `work` in a server call, then publishes what changed and asks for the next wake; `gesture`, the connection whose input it is, may then be asked for state (VS-407). */
  #run(context: Context, work: () => void, gesture: number | null = null): void {
    this.#context = context;
    try {
      work();
      publishChanges(context, this.#mounts.shared, this.#mounts.viewers, this.#mounts.own);
      this.#tables.send(context, this.#mounts);
      if (gesture !== null) {
        this.#viewerStates.afterGesture(context, gesture);
      }
      const earliest = earliestWake(this.#mounts.all(), this.#streams.nextTick(context.now()));
      if (earliest !== null) {
        context.wakeAt(earliest);
      }
    } finally {
      this.#context = null;
    }
  }

  /** The page's mount for `connection`, if it has one: for tests. */
  viewerMount(connection: number, page: number): Mount | undefined {
    return this.#mounts.of(connection, page);
  }
}
