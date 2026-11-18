// A poll's votes (poll.ts), kept by the page that makes the poll rather
// than by any viewer's copy of it, and told to every copy through the
// bus: no state is global. Given the channel's store (state-store.ts), the
// votes and each viewer's ballot outlast the program (REQ-1057): the votes
// for everyone, under the poll's name, and the ballot under the viewer's
// handle (viewer-state.md VS-405, VS-407), so that a viewer in two tabs, or
// back after a reconnect or a restart, moves their one vote rather than
// casting another, and a connection number the server gives again is
// given no one's ballot.
//
// A connection with no viewer votes for its own life: its ballot is held
// here until its viewer begins (then it becomes the viewer's ballot) or it
// is gone. A vote and its ballot are one transaction (VS-406).

import { MOST_VIEWER_VALUES, type KeptViewer, type StateStore } from "../core/state-store.ts";

/** The version of what a tally keeps: raised when its shape changes, which drops what was kept. */
const TALLY_VERSION = 1;

/** What the tally is kept under, for everyone and for each viewer. */
function keptName(name: string): string {
  return `poll:${name}`;
}

/** Whether `value` is a count of votes for each of `count` options, as a tally keeps them. */
function isVotes(value: unknown, count: number): value is number[] {
  return Array.isArray(value) && value.length === count && value.every((each: unknown) => typeof each === "number" && Number.isSafeInteger(each) && each >= 0);
}

/** Who votes: the connection the vote came on, and its viewer, or null while it has none. */
export interface Voter {
  readonly connection: number;
  readonly viewer: KeptViewer | null;
}

export class Tally {
  readonly name: string;
  readonly options: readonly string[];
  readonly #votes: number[];
  /** The option each connection with no viewer voted for, for the connection's life. */
  readonly #connectionBallots = new Map<number, number>();
  /** With no store, the option each viewer voted for, by handle, at most MOST_VIEWER_VALUES of them, the oldest going first. */
  readonly #viewerBallots = new Map<string, number>();
  readonly #store: StateStore | null;

  /** A tally of `options`; with `store`, the votes and ballots it kept before, when they fit these options. */
  constructor(name: string, options: readonly string[], store: StateStore | null = null) {
    this.name = name;
    this.options = options;
    this.#store = store;
    // What was kept for another set of options is not these options' votes.
    const kept = store?.shared(keptName(name), TALLY_VERSION);
    this.#votes = isVotes(kept, options.length) ? kept.slice() : options.map(() => 0);
  }

  get votes(): readonly number[] {
    return this.#votes;
  }

  /** Whether `option` is the place of one of the options. */
  #isOption(option: unknown): option is number {
    return typeof option === "number" && Number.isInteger(option) && option >= 0 && option < this.#votes.length;
  }

  /** Moves a vote from `from` (or none) to `to`; a `to` that is no option's place counts nothing, so the votes stay one to an option. */
  move(from: number | null, to: number): void {
    if (!this.#isOption(to)) {
      return;
    }
    this.#runAtomically(() => {
      this.#moveInMemory(from, to);
      this.#keepVotes();
    });
  }

  #moveInMemory(from: number | null, to: number): void {
    this.#take(from);
    this.#votes[to] = (this.#votes[to] ?? 0) + 1;
  }

  /** Takes a vote from `from`, when it has one. */
  #take(from: number | null): void {
    if (from !== null && (this.#votes[from] ?? 0) > 0) {
      this.#votes[from] = (this.#votes[from] ?? 0) - 1;
    }
  }

  #keepVotes(): void {
    this.#store?.keepShared(keptName(this.name), TALLY_VERSION, this.#votes);
  }

  /** The option `voter` voted for, or null: their viewer's ballot, or with no viewer their connection's. */
  ballotOf(voter: Voter): number | null {
    if (voter.viewer === null) {
      return this.#connectionBallots.get(voter.connection) ?? null;
    }
    return this.#viewerBallot(voter.viewer);
  }

  #viewerBallot(viewer: KeptViewer): number | null {
    const kept = this.#store === null ? this.#viewerBallots.get(viewer.handle) : this.#store.ofViewer(viewer, keptName(this.name), TALLY_VERSION);
    return this.#isOption(kept) ? kept : null;
  }

  #keepViewerBallot(viewer: KeptViewer, option: number): void {
    if (this.#store !== null) {
      this.#store.keepForViewer(viewer, keptName(this.name), TALLY_VERSION, option);
      return;
    }
    this.#viewerBallots.delete(viewer.handle);
    this.#viewerBallots.set(viewer.handle, option);
    if (this.#viewerBallots.size > MOST_VIEWER_VALUES) {
      const [oldest] = this.#viewerBallots.keys();
      if (oldest !== undefined) {
        this.#viewerBallots.delete(oldest);
      }
    }
  }

  /** `voter` votes for `option`, their vote moving there if they had one: the count and the ballot change together (VS-406). */
  vote(voter: Voter, option: number): void {
    if (!this.#isOption(option)) {
      return;
    }
    this.#runAtomically(() => {
      this.#moveInMemory(this.ballotOf(voter), option);
      if (voter.viewer === null) {
        this.#connectionBallots.set(voter.connection, option);
      } else {
        this.#keepViewerBallot(voter.viewer, option);
      }
      this.#keepVotes();
    });
  }

  /**
   * The connection's viewer began (VS-407): a vote it cast with no viewer
   * becomes the viewer's ballot, and one the viewer cast before, in another
   * tab or on another visit, is taken back, so the viewer's last vote is
   * their one vote.
   */
  settle(connection: number, viewer: KeptViewer): void {
    const held = this.#connectionBallots.get(connection);
    if (held === undefined) {
      return;
    }
    this.#runAtomically(() => {
      this.#take(this.#viewerBallot(viewer));
      this.#keepViewerBallot(viewer, held);
      this.#keepVotes();
      this.#connectionBallots.delete(connection);
    });
  }

  /** `work` as one transaction of the store, or as it is without one; the votes held in memory are put back when it fails. */
  #runAtomically(work: () => void): void {
    if (this.#store === null) {
      work();
      return;
    }
    const before = this.#votes.slice();
    try {
      this.#store.atomically(work);
    } catch (error) {
      this.#votes.splice(0, this.#votes.length, ...before);
      throw error;
    }
  }

  /** The connection is gone: a vote it cast with no viewer stays counted, and the record of whose it was goes. */
  forget(connection: number): void {
    this.#connectionBallots.delete(connection);
  }

  /** The viewer's state ended (VS-409), or every viewer's (null, VS-306): their ballot goes, and their vote stays in the count, which is no one's. The store deletes its own. */
  forgetViewer(handle: string | null): void {
    if (handle === null) {
      this.#viewerBallots.clear();
    } else {
      this.#viewerBallots.delete(handle);
    }
  }
}
