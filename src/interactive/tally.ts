// A poll's votes (poll.ts), kept by the page that makes the poll rather
// than by any viewer's copy of it, and told to every copy through the
// bus: no state is global.

export class Tally {
  readonly name: string;
  readonly options: readonly string[];
  readonly #votes: number[];
  /** The option each viewer voted for, while they are on the channel: a vote is kept, not cast again, when they come back to the page. */
  readonly #ballots = new Map<number, number>();

  constructor(name: string, options: readonly string[]) {
    this.name = name;
    this.options = options;
    this.#votes = options.map(() => 0);
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
  }

  /** The option `session` voted for, or null. */
  ballotOf(session: number): number | null {
    return this.#ballots.get(session) ?? null;
  }

  /** `session` votes for `option`, their vote moving there if they had one. */
  vote(session: number, option: number): void {
    if (!this.#isOption(option)) {
      return;
    }
    this.move(this.ballotOf(session), option);
    this.#ballots.set(session, option);
  }

  /** The viewer went: their vote stays counted, and the record of whose it was goes. */
  forget(session: number): void {
    this.#ballots.delete(session);
  }
}
