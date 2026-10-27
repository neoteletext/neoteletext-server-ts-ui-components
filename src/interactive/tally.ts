// Tally: split from poll.ts; the comments pass writes this file's header.

/** A poll's votes, kept by the page that makes it and told to every copy through the bus: no state is global. */
export class Tally {
  readonly name: string;
  readonly options: readonly string[];
  readonly #votes: number[];

  constructor(name: string, options: readonly string[]) {
    this.name = name;
    this.options = options;
    this.#votes = options.map(() => 0);
  }

  get votes(): readonly number[] {
    return this.#votes;
  }

  /** Moves a vote from `from` (or none) to `to`. */
  move(from: number | null, to: number): void {
    if (from !== null && (this.#votes[from] ?? 0) > 0) {
      this.#votes[from] = (this.#votes[from] ?? 0) - 1;
    }
    this.#votes[to] = (this.#votes[to] ?? 0) + 1;
  }
}
