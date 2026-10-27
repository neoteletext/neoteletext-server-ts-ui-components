// What every control has in common: a label in a column of its own, a
// state that cannot be used (disabled), one look while it has the keys
// (core/look.ts), optional sounds, a hint of its keys for the frame's row
// 23, and what it needs of its page: a copy for each viewer unless it is
// shared, so one viewer's ticks are never everyone's. It sends activate
// and cancel up the tree (core/component-events.ts); a control with a
// value is a ValueControl (value-control.ts).

import { Component } from "../core/component.ts";
import type { Origin } from "../core/component-events.ts";
import { LABEL_CELLS, paintLabel } from "../core/look.ts";
import type { Canvas } from "../core/canvas.ts";
import type { PageNeeds } from "../core/needs.ts";
import type { Sound } from "../core/sound.ts";

/** Sounds a control plays to the viewer: as the choice moves, as one is made, as a value changes, as one is refused. */
export interface ControlSounds {
  readonly move?: Sound;
  readonly choose?: Sound;
  readonly change?: Sound;
  readonly error?: Sound;
}

export interface ControlProps {
  readonly label?: string;
  /** The label's column; LABEL_CELLS when absent. */
  readonly labelCells?: number;
  readonly disabled?: boolean;
  readonly sounds?: ControlSounds;
  /** One copy for every viewer: what one does, all see. */
  readonly shared?: boolean;
  /** What its keys do, for the frame's row 23; the control's own when absent. */
  readonly hint?: string;
  /** It takes the keys when it arrives, as a dialog's field or a newly chosen tab's list does. */
  readonly autoFocus?: boolean;
}

export abstract class Control<P extends ControlProps = ControlProps, S extends object = object> extends Component<P, S> {
  get disabled(): boolean {
    return this.props.disabled === true;
  }

  override focusable(): boolean {
    return !this.disabled;
  }

  override componentDidMount(): void {
    if (this.props.autoFocus === true) {
      this.focus();
    }
  }

  override needs(): PageNeeds {
    return { ownCopy: this.props.shared !== true, ...this.keyNeeds() };
  }

  /** The keys it takes from page selection: digits, the coloured keys. */
  protected keyNeeds(): PageNeeds {
    return {};
  }

  override hint(): string | null {
    return this.props.hint ?? this.keysHint();
  }

  /** What its keys do, when its user does not say. */
  protected keysHint(): string | null {
    return null;
  }

  /** The label's column: none without a label. */
  protected get labelCells(): number {
    return this.props.label === undefined ? 0 : (this.props.labelCells ?? LABEL_CELLS);
  }

  /** Paints the label on `row`; answers the column the control starts in. */
  protected paintLabel(canvas: Canvas, row = 0): number {
    if (this.props.label !== undefined) {
      paintLabel(canvas, row, this.props.label, this.labelCells, { focused: this.focused, disabled: this.disabled });
    }
    return this.labelCells;
  }

  protected play(kind: keyof ControlSounds, session: number | null): void {
    const sound = this.props.sounds?.[kind];
    if (sound !== undefined && session !== null) {
      this.services.play(sound, session);
    }
  }

  /** Something was chosen or pressed: the activate event, and the choose sound. */
  protected activate(value: unknown, session: number, origin: Origin = "viewer"): void {
    this.emit({ type: "activate", value, session, origin });
    this.play("choose", session);
  }

  /** Escape: the cancel event. */
  protected cancel(session: number): void {
    this.emit({ type: "cancel", session, origin: "viewer" });
  }
}
