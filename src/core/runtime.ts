// Pages of components as one of the kit's applications: the protocol's
// events become mounts, renders and publications (docs/applications.md).
//
// - `start`: every page is mounted once as the channel's copy, which every
//   viewer is sent, and published.
// - `open`: a page that keeps state for each viewer is mounted again for
//   that viewer (or found, if it was kept while they were away).
// - `input`: to the viewer's mount, or the channel's for a page every viewer
//   shares, whose state is then everyone's.
// - `leave` and `close`: the viewer's mounts are unmounted.
// - `wake`: the timers that are due run.
// After each call every mount with something new renders, and a page is
// published only if its TTI changed. A viewer's copy is published only
// while it differs from the channel's; when it is the same again it is
// released, so a viewer who only reads costs the server nothing.

// oxlint-disable import/max-dependencies -- the runtime is where the protocol's calls meet the mounts, streams, sounds and publication
import { type Application, type Context, ffmpegOpus, type Input, type OpusEncoder, type PageEntry, type ServerStats } from "../kit.ts";
import { EventBus } from "./bus.ts";
import type { LibraryEvents } from "./library-events.ts";
import type { PageParams } from "./services.ts";
import { dispatchInput } from "./dispatch-input.ts";
import { LiveStreams } from "./live-streams.ts";
import { Mount } from "./mount.ts";
import { type PageSpec, SpecNeeds } from "./page-spec.ts";
import { publishChanges } from "./publish.ts";
import { SoundObjects } from "./sound-objects.ts";
import { ROLLOVER_COLOURS } from "./rollover.ts";
import type { Services } from "./services.ts";
import { fit } from "./text.ts";

export interface ComponentChannelOptions {
  /** What encodes its sounds as Opus, the one format desktop and phone receivers play: ffmpeg with libopus, found on the path, when absent. */
  readonly opus?: OpusEncoder;
}

export class ComponentChannel implements Application {
  readonly bus = new EventBus<LibraryEvents>();
  readonly #specs: ReadonlyMap<number, PageSpec>;
  readonly #shared = new Map<number, Mount>();
  /** Each viewer's mounts, by session, then page. */
  readonly #viewers = new Map<number, Map<number, Mount>>();
  /** Whether a viewer's own copy of a page is what they are sent now. */
  readonly #own = new Map<number, Set<number>>();
  #context: Context | null = null;
  #timerId = 0;
  readonly #sounds: SoundObjects;
  /** Who has each page open. */
  readonly #watching = new Map<number, Set<number>>();
  readonly #needs = new SpecNeeds();
  /** What each viewer was last sent to each page with. */
  readonly #params = new Map<number, Map<number, PageParams>>();
  readonly #streams: LiveStreams;

  constructor(specs: readonly PageSpec[], options: ComponentChannelOptions = {}) {
    this.#specs = new Map(specs.map((spec) => [spec.page, spec]));
    const opus = options.opus ?? ffmpegOpus();
    this.#sounds = new SoundObjects(opus);
    this.#streams = new LiveStreams(opus);
  }

  /** Whether the page's spec, or what is on it, keeps a copy for each viewer: for tests. */
  perViewer(page: number): boolean {
    const spec = this.#specs.get(page);
    return spec !== undefined && this.#needs.perViewer(spec);
  }

  pages(): readonly PageEntry[] {
    return [...this.#specs.values()].map((spec) => this.#needs.entryOf(spec));
  }

  start(context: Context): void {
    this.#run(context, () => {
      // A program the server started again is sent start again: whatever was mounted before goes.
      for (const mount of this.#mounts()) {
        mount.unmount();
      }
      this.#shared.clear();
      this.#viewers.clear();
      this.#own.clear();
      this.#sounds.forgetAll();
      this.#watching.clear();
      for (const spec of this.#specs.values()) {
        this.#shared.set(spec.page, this.#mount(spec, null));
      }
    });
  }

  opened(session: number, page: number, context: Context): void {
    this.#run(context, () => {
      const watching = this.#watching.get(page) ?? new Set<number>();
      watching.add(session);
      this.#watching.set(page, watching);
      const spec = this.#specs.get(page);
      if (spec !== undefined && this.#needs.perViewer(spec)) {
        this.#viewerMount(spec, session);
      }
      // A clock that waited while nobody watched catches up before the page is sent.
      this.#shared.get(page)?.runTimers(context.now());
    });
  }

  leftPage(session: number, page: number, context: Context): void {
    this.#run(context, () => {
      this.#watching.get(page)?.delete(session);
      this.#streams.left(context, session, page);
      const spec = this.#specs.get(page);
      const mount = this.#viewers.get(session)?.get(page);
      if (spec === undefined || mount === undefined || spec.keepWhileAway === true) {
        return;
      }
      mount.unmount();
      this.#viewers.get(session)?.delete(page);
      if (this.#own.get(session)?.delete(page) === true) {
        context.release(session, page);
      }
    });
  }

  input(session: number, page: number, input: Input, context: Context): boolean {
    let taken = false;
    this.#run(context, () => {
      const spec = this.#specs.get(page);
      if (spec === undefined) {
        return;
      }
      const mount = this.#needs.perViewer(spec) ? this.#viewerMount(spec, session) : this.#shared.get(page);
      if (mount === undefined) {
        return;
      }
      taken = dispatchInput(mount, session, input);
    });
    return taken;
  }

  wake(context: Context): void {
    this.#run(context, () => {
      const now = context.now();
      this.#streams.pump(context, now);
      for (const mount of this.#mounts()) {
        mount.runTimers(now);
      }
    });
  }

  ended(session: number, context: Context): void {
    this.#run(context, () => {
      for (const mount of this.#viewers.get(session)?.values() ?? []) {
        mount.unmount();
      }
      this.#viewers.delete(session);
      this.#own.delete(session);
      this.#sounds.forget(session);
      this.#streams.forget(session);
      this.#params.delete(session);
      for (const watching of this.#watching.values()) {
        watching.delete(session);
      }
      this.bus.emit("ended", { session });
    });
  }

  stats(stats: ServerStats, context: Context): void {
    this.#run(context, () => {
      this.bus.emit("stats", stats);
    });
  }

  // The mounts.

  *#mounts(): Generator<Mount> {
    yield* this.#shared.values();
    for (const pages of this.#viewers.values()) {
      yield* pages.values();
    }
  }

  #viewerMount(spec: PageSpec, session: number): Mount {
    const pages = this.#viewers.get(session) ?? new Map<number, Mount>();
    this.#viewers.set(session, pages);
    const found = pages.get(spec.page);
    if (found !== undefined) {
      return found;
    }
    const mount = this.#mount(spec, session, this.#params.get(session)?.get(spec.page));
    pages.set(spec.page, mount);
    return mount;
  }

  #mount(spec: PageSpec, session: number | null, params?: PageParams): Mount {
    return new Mount(spec.page, spec.root(params), {
      services: this.#services(spec.page, session),
      nextTimerId: () => {
        this.#timerId += 1;
        return this.#timerId;
      },
      report: (text) => this.#context?.log(text),
      rollover: spec.rollover === undefined ? ROLLOVER_COLOURS : spec.rollover,
      viewed: () => {
        const watching = this.#watching.get(spec.page);
        return session === null ? (watching?.size ?? 0) > 0 : watching?.has(session) === true;
      },
    });
  }

  #services(page: number, session: number | null): Services {
    const context = (): Context => {
      if (this.#context === null) {
        throw new Error("a component reached the channel outside a server call");
      }
      return this.#context;
    };
    return {
      session,
      page,
      bus: this.bus.at({ page, session }),
      now: () => context().now(),
      epochMs: () => context().epochMs(),
      goto: (to, target, params) => {
        this.#goto(context(), to, target, params);
      },
      stream: (source, to, fromMs = 0) => {
        this.#streams.start(context(), to, page, source, LiveStreams.sampleAt(source, fromMs));
      },
      stopStream: (to) => {
        this.#streams.stop(context(), to);
      },
      pauseStream: (to) => {
        this.#streams.pause(context(), to);
      },
      resumeStream: (to) => {
        this.#streams.resume(context(), to);
      },
      seekStream: (to, ms) => {
        this.#streams.seek(context(), to, ms);
      },
      streamGain: (to, gain) => {
        this.#streams.setGain(context(), to, gain);
      },
      listening: (to) => this.#streams.listening(to, this.#context?.now() ?? 0),
      streamPlace: (to, name) => this.#streams.place(to, name),
      title: (text) => {
        context().title(page, fit(text, context().limits().budgets.titleCharacters));
      },
      limits: () => context().limits(),
      below: (bound) => context().below(bound),
      log: (text) => {
        context().log(text);
      },
      play: (sound, to) => {
        this.#sounds.play(context(), sound, to ?? session, page);
      },
    };
  }

  /** Sends a viewer to a page, with what it is to show: a page they already have open shows it at once. */
  #goto(context: Context, session: number, page: number, params: PageParams | undefined): void {
    if (params !== undefined) {
      const pages = this.#params.get(session) ?? new Map<number, PageParams>();
      pages.set(page, params);
      this.#params.set(session, pages);
      const spec = this.#specs.get(page);
      const mount = this.#viewers.get(session)?.get(page);
      if (spec !== undefined && mount !== undefined) {
        mount.setRoot(spec.root(params));
      }
    }
    context.goto(session, page);
  }

  /** Runs `work` in a server call, then publishes what changed and asks for the next wake. */
  #run(context: Context, work: () => void): void {
    this.#context = context;
    try {
      work();
      publishChanges(context, this.#shared, this.#viewers, this.#own);
      let earliest: number | null = null;
      for (const mount of this.#mounts()) {
        const at = mount.nextWake();
        if (at !== null) {
          earliest = earliest === null ? at : Math.min(earliest, at);
        }
      }
      const tick = this.#streams.nextTick(context.now());
      if (tick !== null) {
        earliest = earliest === null ? tick : Math.min(earliest, tick);
      }
      if (earliest !== null) {
        context.wakeAt(earliest);
      }
    } finally {
      this.#context = null;
    }
  }

  /** The page's mount for `session`, if it has one: for tests. */
  viewerMount(session: number, page: number): Mount | undefined {
    return this.#viewers.get(session)?.get(page);
  }
}
