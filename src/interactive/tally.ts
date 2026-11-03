// A poll's votes (poll.ts), kept by the page that makes the poll rather
// than by any viewer's copy of it, and told to every copy through the
// bus: no state is global. Given the channel's store (state-store.ts), the
// votes and each viewer's ballot outlast the program (REQ-1057): the votes
// for everyone, under the poll's name, and the ballot for the viewer's
// session, so that a viewer back after a restart moves their vote rather
// than casting another.

import type { StateStore } from "../core/state-store.ts";

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

export class Tally {
  readonly name: string;
  readonly options: readonly string[];
  readonly #votes: number[];
  /** The option each viewer voted for, while they are on the channel: a vote is kept, not cast again, when they come back to the page. */
  readonly #ballots = new Map<number, number>();
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
  #isOption(option: number): boolean {
    return Number.isInteger(option) && option >= 0 && option < this.#votes.length;
  }

  /** Moves a vote from `from` (or none) to `to`; a `to` that is no option's place counts nothing, so the votes stay one to an option. */
  move(from: number | null, to: number): void {
    if (!this.#isOption(to)) {
      return;
    }
    if (from !== null && (this.#votes[from] ?? 0) > 0) {
      this.#votes[from] = (this.#votes[from] ?? 0) - 1;
    }
    this.#votes[to] = (this.#votes[to] ?? 0) + 1;
    this.#store?.keepShared(keptName(this.name), TALLY_VERSION, this.#votes);
  }

  /** The option `session` voted for, or null. */
  ballotOf(session: number): number | null {
    const held = this.#ballots.get(session);
    if (held !== undefined) {
      return held;
    }
    const kept = this.#store?.ofSession(session, keptName(this.name), TALLY_VERSION);
    if (typeof kept !== "number" || !this.#isOption(kept)) {
      return null;
    }
    this.#ballots.set(session, kept);
    return kept;
  }

  /** `session` votes for `option`, their vote moving there if they had one. */
  vote(session: number, option: number): void {
    if (!this.#isOption(option)) {
      return;
    }
    this.move(this.ballotOf(session), option);
    this.#ballots.set(session, option);
    this.#store?.keepForSession(session, keptName(this.name), TALLY_VERSION, option);
  }

  /** The viewer went: their vote stays counted, and the record of whose it was goes from memory; a store keeps it for their session's return. */
  forget(session: number): void {
    this.#ballots.delete(session);
  }
}
