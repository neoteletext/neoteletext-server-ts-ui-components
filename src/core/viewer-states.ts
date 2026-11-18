// What the runtime knows of each connection's viewer (viewer-state.md
// VS-401, VS-407): who it is now, as the kit says, and whether its state
// has been asked for. A connection with no viewer whose viewer did
// something to be kept is asked for state once, after an input of theirs,
// the gesture VS-212 requires; refused, it is never asked again, and what
// it holds lasts for the connection's life.

import type { Context } from "../kit.ts";
import type { EventBus } from "./bus.ts";
import type { LibraryEvents } from "./library-events.ts";
import type { Services } from "./services.ts";
import type { KeptViewer, StateStore } from "./state-store.ts";

export class ViewerStates {
  readonly #store: StateStore | null;
  /** Connections open now, from joined to gone. */
  readonly #open = new Set<number>();
  /** Connections that have something to keep and no viewer: asked for at their next input. */
  readonly #wanted = new Set<number>();
  /** Connections asked for state, not yet answered. */
  readonly #asked = new Set<number>();
  /** Connections whose state was refused: never asked again. */
  readonly #refused = new Set<number>();

  constructor(store: StateStore | null) {
    this.#store = store;
  }

  /** The services a component reaches them by, `context` the server call's, or null outside one. */
  services(context: () => Context | null, bus: EventBus<LibraryEvents>): Pick<Services, "viewer" | "wantState" | "offerRemember" | "forgetViewer"> {
    const inCall = (): Context => {
      const now = context();
      if (now === null) {
        throw new Error("a component reached the channel outside a server call");
      }
      return now;
    };
    return {
      viewer: (to) => this.viewer(context(), to),
      wantState: (to) => {
        this.want(to);
      },
      offerRemember: (to) => {
        inCall().offerRemember(to);
      },
      forgetViewer: (to) => {
        const handle = this.forget(inCall(), to);
        if (handle !== null) {
          bus.emit("viewerEnded", { handle });
        }
      },
    };
  }

  /** The connection's viewer, as the kit has it now, or null. */
  viewer(context: Context | null, connection: number): KeptViewer | null {
    const viewer = context?.viewer(connection) ?? null;
    return viewer === null || context === null ? null : { handle: viewer.handle, remembered: context.remembered(connection) };
  }

  /** The open connections presenting the same viewer as `connection`, itself among them; only itself when it has no viewer. */
  sameViewer(context: Context, connection: number): number[] {
    const viewer = context.viewer(connection);
    return viewer === null ? [connection] : [...this.#open].filter((open) => context.viewer(open) === viewer);
  }

  joined(connection: number): void {
    this.#open.add(connection);
  }

  /** Something to keep on a connection: asked for at its next input, unless it was asked or refused already. */
  want(connection: number): void {
    if (!this.#asked.has(connection) && !this.#refused.has(connection)) {
      this.#wanted.add(connection);
    }
  }

  /** An input of the connection's viewer is done: their state is asked for now if it is wanted. */
  afterGesture(context: Context, connection: number): void {
    if (!this.#wanted.delete(connection) || context.viewer(connection) !== null) {
      return;
    }
    this.#asked.add(connection);
    context.requestState(connection);
  }

  began(connection: number): void {
    this.#asked.delete(connection);
    this.#wanted.delete(connection);
  }

  refused(connection: number): void {
    this.#asked.delete(connection);
    this.#wanted.delete(connection);
    this.#refused.add(connection);
  }

  gone(connection: number): void {
    this.#open.delete(connection);
    this.#wanted.delete(connection);
    this.#asked.delete(connection);
    this.#refused.delete(connection);
  }

  /** The program started again: no connection is open. */
  clear(): void {
    this.#open.clear();
    this.#wanted.clear();
    this.#asked.clear();
    this.#refused.clear();
  }

  /** Ends the connection's viewer's state and deletes what the store keeps for them (VS-409); their handle, or null when there was no viewer. */
  forget(context: Context, connection: number): string | null {
    const viewer = context.viewer(connection);
    if (viewer === null) {
      return null;
    }
    this.#store?.forgetViewer(viewer.handle);
    context.endState(viewer);
    return viewer.handle;
  }

  /** Every handle is void (VS-306): what the store keeps under them can never be read again, and goes. */
  reset(): void {
    this.#store?.forgetViewers();
  }
}
