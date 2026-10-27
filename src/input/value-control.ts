// ValueControl: split from control.ts; the comments pass writes this file's header.

import { Control, type ControlProps } from "./control.ts";

export interface ValueProps<T> extends ControlProps {
  /** The value, kept by the parent: the control shows it and reports changes, and the parent sets it again. */
  readonly value?: T;
  /** The value to begin with, when the control keeps its own. */
  readonly initial?: T;
  readonly onChange?: (value: T, session: number) => void;
  /** What is wrong with a value, or null. */
  readonly validate?: (value: T) => string | null;
}

export interface ValueState<T> {
  readonly own: T;
}

/** Values compare by what they hold: a list of ticks is the same list if it ticks the same. */
function same(a: unknown, b: unknown): boolean {
  return a === b || JSON.stringify(a) === JSON.stringify(b);
}

export abstract class ValueControl<T, P extends ValueProps<T> = ValueProps<T>, S extends ValueState<T> = ValueState<T>> extends Control<P, S> {
  override state = { own: this.props.initial ?? this.empty() } as S;

  /** Its value when it is given none. */
  protected abstract empty(): T;

  /** The value: the parent's when it keeps it, its own otherwise. */
  get value(): T {
    return this.props.value !== undefined ? this.props.value : this.state.own;
  }

  /** What is wrong with the value, or null. */
  get complaint(): string | null {
    return this.props.validate?.(this.value) ?? null;
  }

  /** The viewer changed the value: kept (unless the parent keeps it), checked, reported. */
  protected change(value: T, session: number): void {
    const previous = this.value;
    if (this.disabled || same(previous, value)) {
      return;
    }
    if (this.props.value === undefined) {
      this.setState({ own: value } as Partial<S>);
    }
    const reason = this.props.validate?.(value) ?? null;
    if (reason !== null) {
      this.emit({ type: "invalid", value, reason, session, origin: "viewer" });
      this.play("error", session);
    } else {
      this.play("change", session);
    }
    this.emit({ type: "change", value, previous, session, origin: "viewer" });
    this.props.onChange?.(value, session);
  }

  /** A parent that keeps the value set it: the change is reported as the program's. */
  override componentDidUpdate(previousProps: Readonly<P>, _previousState: Readonly<S>): void {
    if (previousProps.value !== undefined && this.props.value !== undefined && !same(previousProps.value, this.props.value)) {
      this.emit({ type: "change", value: this.props.value, previous: previousProps.value, session: this.services.session, origin: "program" });
    }
  }
}
