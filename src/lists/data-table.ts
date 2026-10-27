// A table of rows and columns under a heading: each column starts with its
// colour's cell, which is the gap between columns; the heading is on a band;
// the chosen row is on the band while the table has the keys (core/
// look.ts); rows may alternate their foreground; more rows than fit scroll
// beside a scroll bar. A column is sorted by its digit (the page takes the
// digits) or a click on its heading, and again the other way. A row that
// can be chosen is a control, and the pointer coming onto it is told to
// the table's user (onHover).

// oxlint-disable import/max-dependencies -- a control that lays out its heading, body and scroll bar and takes the keys, the digits and the wheel needs each of these; its drawn parts are files of their own already (body.ts, heading.ts)
import { type Child, h } from "../core/element.ts";
import type { KeyEvent, WheelEvent } from "../core/events.ts";
import { choosing, digitOf } from "../core/keys.ts";
import { keepInView, listStep, moveChoice, WheelLines } from "../core/list-cursor.ts";
import type { PageNeeds } from "../core/needs.ts";
import { Colour } from "../kit.ts";
import { Control, type ControlProps } from "../input/control.ts";
import { Columns } from "../layout/columns.ts";
import { Rows } from "../layout/layouts.ts";
import { Body } from "./body.ts";
import { Heading } from "./heading.ts";
import { BAR_CELLS, ScrollBar, scrolled } from "./scroll.ts";

export interface TableColumn {
  readonly title: string;
  /** Its cells, its colour's cell included. */
  readonly width: number;
  readonly align?: "left" | "right";
  readonly foreground?: Colour;
}

export interface DataTableProps extends ControlProps {
  readonly columns: readonly TableColumn[];
  readonly rows: readonly (readonly string[])[];
  /** The body's rows shown at once. */
  readonly shown: number;
  /** A row can be chosen, and Enter, Space or a click chooses it. */
  readonly selectable?: boolean;
  readonly sortable?: boolean;
  /** Rows alternate white and cyan. */
  readonly striped?: boolean;
  readonly empty?: string;
  readonly onChoose?: (row: readonly string[], session: number) => void;
  /** The pointer came onto a row that can be chosen, or left it (null). Moving from one row to the next is a leave, then an enter. */
  readonly onHover?: (row: readonly string[] | null, session: number) => void;
}

interface DataTableState {
  readonly top: number;
  readonly chosen: number;
  readonly sortBy: number | null;
  readonly descending: boolean;
}

/** The cells before the first column: a band's colour and New Background, kept on every row so the columns line up. */
const LEAD = 2;

/** Each column's first cell: its colour's. */
export function starts(columns: readonly TableColumn[]): number[] {
  let column = LEAD;
  return columns.map((each) => {
    const at = column;
    column += each.width;
    return at;
  });
}

/** The number a cell starts with, "12 km" or "3.5%", its thousands' commas dropped; NaN for one that starts with none. */
function leadingNumber(cell: string): number {
  // oxlint-disable-next-line unicorn/prefer-number-coercion -- the number a cell starts with is meant, which Number() would not read
  return Number.parseFloat(cell.replaceAll(",", ""));
}

/** Numbers sort as numbers, the rest as text. */
function compare(a: string, b: string): number {
  const x = leadingNumber(a);
  const y = leadingNumber(b);
  return Number.isNaN(x) || Number.isNaN(y) ? a.localeCompare(b) : x - y;
}

export class DataTable extends Control<DataTableProps, DataTableState> {
  override state: DataTableState = { top: 0, chosen: 0, sortBy: null, descending: false };
  readonly #wheel = new WheelLines();

  protected override keyNeeds(): PageNeeds {
    return { digits: this.props.sortable === true };
  }

  protected override keysHint(): string {
    return [this.props.selectable === true ? "Up Down choose, Enter" : "Up Down scroll", this.props.sortable === true ? "1-9 sorts" : ""]
      .filter((part) => part !== "")
      .join("; ");
  }

  #sorted(): readonly (readonly string[])[] {
    const { sortBy, descending } = this.state;
    if (sortBy === null) {
      return this.props.rows;
    }
    const sorted = this.props.rows.toSorted((a, b) => compare(a[sortBy] ?? "", b[sortBy] ?? ""));
    return descending ? sorted.toReversed() : sorted;
  }

  #sort(column: number): void {
    if (this.props.sortable !== true) {
      return;
    }
    this.setState({ sortBy: column, descending: this.state.sortBy === column && !this.state.descending, top: 0, chosen: 0 });
  }

  #choose(index: number, session: number): void {
    this.setState({ chosen: index });
    const row = this.#sorted()[index];
    if (row !== undefined && this.props.selectable === true) {
      this.activate(row, session);
      this.props.onChoose?.(row, session);
    }
  }

  override render(): Child {
    return h(
      Rows,
      {},
      h(Heading, {
        columns: this.props.columns,
        sortable: this.props.sortable === true && !this.disabled,
        sortBy: this.state.sortBy,
        descending: this.state.descending,
        onSort: (column: number) => {
          this.#sort(column);
        },
      }),
      h(
        Columns,
        { widths: [null, BAR_CELLS], height: this.props.shown },
        h(Body, {
          columns: this.props.columns,
          rows: this.#sorted(),
          top: this.state.top,
          chosen: this.props.selectable === true ? this.state.chosen : null,
          focused: this.focused,
          striped: this.props.striped === true,
          selectable: this.props.selectable === true && !this.disabled,
          empty: this.props.empty ?? "no rows",
          onPick: (index: number, session: number) => {
            this.#choose(index, session);
          },
          ...(this.props.onHover === undefined
            ? {}
            : { onHover: (index: number | null, session: number) => this.props.onHover?.(index === null ? null : (this.#sorted()[index] ?? null), session) }),
        }),
        h(ScrollBar, {
          top: this.state.top,
          total: this.props.rows.length,
          shown: this.props.shown,
          disabled: this.disabled,
          onScroll: (top) => {
            this.setState({ top });
          },
        }),
      ),
    );
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled) {
      return false;
    }
    const count = this.props.rows.length;
    const digit = digitOf(event);
    if (this.props.sortable === true && digit !== null && digit >= 1 && digit <= this.props.columns.length) {
      this.#sort(digit - 1);
      return true;
    }
    if (choosing(event) && this.props.selectable === true) {
      this.#choose(this.state.chosen, event.session);
      return true;
    }
    const step = listStep(event, this.props.shown);
    if (step === null) {
      return false;
    }
    if (this.props.selectable === true) {
      const chosen = moveChoice(this.state.chosen, step, count);
      this.setState({ chosen, top: keepInView(this.state.top, chosen, this.props.shown, count) });
      this.play("move", event.session);
    } else {
      const last = Math.max(0, count - this.props.shown);
      this.setState({ top: scrolled(this.state.top, step, last) });
    }
    return true;
  }

  override onWheel(event: WheelEvent): boolean {
    if (this.disabled) {
      return false;
    }
    const last = Math.max(0, this.props.rows.length - this.props.shown);
    this.setState({ top: Math.max(0, Math.min(last, this.state.top + this.#wheel.lines(event.dy))) });
    return true;
  }
}
