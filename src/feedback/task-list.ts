// A task list: the steps of something being done, each waiting, running,
// done or failed. Each says which by a mark in the English set's own
// characters, in its kind's colour (core/look.ts), so it shows without
// colour too; a running step's mark is a spinner (spinner.ts), which moves
// while someone watches. A failed step can say why on the row under it.

import { Component } from "../core/component.ts";
import { type Child, h } from "../core/element.ts";
import { KINDS } from "../core/look.ts";
import { Colour, ROWS } from "../kit.ts";
import { Columns } from "../layout/columns.ts";
import { Text } from "../text/styles.ts";
import { Spinner, type SpinnerStyle } from "./spinner.ts";

/** Where a step is. */
export type TaskStatus = "pending" | "running" | "done" | "failed";

export interface Task {
  /** What the step is, beside its mark. */
  readonly label: string;
  /** Where it is: waiting, running, done or failed. */
  readonly status: TaskStatus;
  /** Why a failed step failed, on the row under it. */
  readonly reason?: string;
}

export interface TaskListProps {
  /** The steps, in order; no more than a page's rows are drawn. */
  readonly tasks: readonly Task[];
  /** A running step's spinner; orbit when absent. */
  readonly spinner?: SpinnerStyle;
}

/** The mark a step that is not running shows, and its colour: done and failed as their kinds say it, waiting a dash in white, which is not the cut mark (core/text.ts) and so is not read as text cut short. */
const MARKS: Readonly<Record<Exclude<TaskStatus, "running">, { readonly mark: string; readonly foreground: Colour }>> = {
  pending: { mark: "-", foreground: Colour.White },
  done: { mark: KINDS.success.mark, foreground: KINDS.success.background },
  failed: { mark: KINDS.error.mark, foreground: KINDS.error.background },
};

/**
 * The marks' column: the colour's cell and two for the mark, the widest of
 * them, "OK"; a spinner's colour and its frame's cell fit it too, its
 * frames' other cells and its words, which it has none of here, cut at the
 * column's edge, so every label starts in the same column.
 */
const MARK_CELLS = 3;

/** A spinner with no words: the step's label is beside it, in its own column. */
const NO_WORDS = "";

/** A step's rows: its mark and label, and why it failed when it did and says. */
function stepRows(task: Task, index: number, spinner: SpinnerStyle | undefined): Child[] {
  const mark =
    task.status === "running"
      ? h(Spinner, { label: NO_WORDS, foreground: KINDS.info.background, ...(spinner === undefined ? {} : { style: spinner }) })
      : h(Text, { text: MARKS[task.status].mark, foreground: MARKS[task.status].foreground });
  const rows: Child[] = [h(Columns, { key: `step-${index}`, widths: [MARK_CELLS, null] }, mark, h(Text, { text: task.label }))];
  if (task.status === "failed" && task.reason !== undefined) {
    rows.push(
      h(
        Columns,
        { key: `reason-${index}`, widths: [MARK_CELLS, null] },
        h(Text, { text: "" }),
        h(Text, { text: task.reason, foreground: KINDS.error.background }),
      ),
    );
  }
  return rows;
}

/** The steps of something being done, and where each is. */
export class TaskList extends Component<TaskListProps> {
  override render(): Child {
    // No more steps than a page has rows can show, so no more are made, however many come.
    return this.props.tasks.slice(0, ROWS).flatMap((task, index) => stepRows(task, index, this.props.spinner));
  }
}
