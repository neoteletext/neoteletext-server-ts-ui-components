// The events the library's components send one another on the channel's
// bus (bus.ts): what one page's components tell others that share nothing
// else with them.

import type { ServerStats } from "../kit.ts";

/** A notice for a toast (feedback/notice.ts): what it says and how it is meant. Sent to one viewer or page with the bus's audience. */
export interface ToastEvent {
  /** What it says, after its kind's mark. */
  readonly text: string;
  /** How it is meant: its mark and its colour (core/look.ts). */
  readonly kind: "info" | "success" | "warning" | "error";
  /** What undoes what the toast tells of, for the viewer who asks: the shelf says so, and its key or a click on the toast runs it, once. */
  readonly undo?: (session: number) => void;
}

export interface LibraryEvents {
  /** The server's figures, every 10 seconds. */
  readonly stats: ServerStats;
  /** A poll's votes changed: its name and every option's count. */
  readonly poll: { readonly name: string; readonly votes: readonly number[] };
  /** A toast to show on every page with a toast shelf. */
  readonly toast: ToastEvent;
  /** A viewer went: what a component keeps for them, beyond its own copy, can go. */
  readonly ended: { readonly session: number };
}
