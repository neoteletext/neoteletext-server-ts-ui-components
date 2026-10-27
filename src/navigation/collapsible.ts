// Collapsible sections: each a heading on a band, its content under it
// while it is open. Up and Down choose a heading, Enter, Space or a click
// opens or shuts it; as an accordion, opening one shuts the others. Each
// heading's band is a control. Its value is the sections open.

import { type Child, h } from "../core/element.ts";
import type { KeyEvent } from "../core/events.ts";
import { choosing } from "../core/keys.ts";
import { listStep, moveChoice } from "../core/list-cursor.ts";
import { Colour } from "../kit.ts";
import { type ValueProps, ValueControl, type ValueState } from "../input/value-control.ts";
import { Rows } from "../layout/layouts.ts";
import { Heading } from "./heading.ts";

export interface CollapsibleProps extends ValueProps<readonly number[]> {
  /** Each section's heading; the children are their contents, in order. */
  readonly titles: readonly string[];
  /** Opening one shuts the others. */
  readonly accordion?: boolean;
  readonly background?: Colour;
}

interface CollapsibleState extends ValueState<readonly number[]> {
  readonly chosen: number;
}

export class Collapsible extends ValueControl<readonly number[], CollapsibleProps, CollapsibleState> {
  override state: CollapsibleState = { own: this.props.initial ?? [], chosen: 0 };

  protected empty(): readonly number[] {
    return [];
  }

  protected override keysHint(): string {
    return "Up Down choose a heading, Enter opens or shuts";
  }

  #toggle(index: number, session: number): void {
    const open = this.value.includes(index);
    this.setState({ chosen: index });
    this.change(
      open ? this.value.filter((item) => item !== index) : this.props.accordion === true ? [index] : [...this.value, index].sort((a, b) => a - b),
      session,
    );
  }

  override render(): Child {
    const contents = this.props.children ?? [];
    return h(
      Rows,
      {},
      ...this.props.titles.flatMap((title, index) => [
        h(Heading, {
          key: `heading-${index}`,
          title,
          open: this.value.includes(index),
          chosen: index === this.state.chosen && this.focused,
          background: this.props.background ?? Colour.Blue,
          disabled: this.disabled,
          onToggle: (session: number) => {
            this.#toggle(index, session);
          },
        }),
        this.value.includes(index) ? h(Rows, { key: `content-${index}` }, contents[index] ?? null) : null,
      ]),
    );
  }

  override onKey(event: KeyEvent): boolean {
    if (this.disabled) {
      return false;
    }
    if (choosing(event)) {
      this.#toggle(this.state.chosen, event.session);
      return true;
    }
    const step = listStep(event, this.props.titles.length);
    if (step === null) {
      return false;
    }
    this.setState({ chosen: moveChoice(this.state.chosen, step, this.props.titles.length) });
    this.play("move", event.session);
    return true;
  }
}
