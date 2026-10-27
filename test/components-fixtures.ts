// What the components tests share: their pages, helpers and test components.

import { Harness } from "neottx-server-ts-protocol/testing";
import { Button, type Child, ChoiceList, Component, ComponentChannel, Frame, h, type KeyEvent, type PageSpec, Text } from "../src/index.ts";
import { Colour, Key } from "../src/kit.ts";

export const PAGE = 0x150;

const PROMPTS = [
  ["Index", 0x100],
  ["", null],
  ["", null],
  ["", null],
] as const;

/** The frame's first body row, where a page's first component is drawn. */
export const BODY_ROW = 3;

export function frame(title: string, ...body: Child[]): ReturnType<typeof h> {
  return h(Frame, { title, background: Colour.Blue, prompts: PROMPTS }, ...body);
}

export function harness(specs: readonly PageSpec[]): Harness {
  return new Harness([new ComponentChannel(specs)]);
}

/** A live sound's generation, as a sound line carries it. */
export function generationOf(live: unknown): number[] | undefined {
  return typeof live === "object" && live !== null && "generation" in live && typeof live.generation === "number" ? [live.generation] : undefined;
}

export const middle = (line: string, word: string): number => line.indexOf(word) + word.length / 2;

/** A list beside what its chosen item is, as the rounds page has. */
export class Chooser extends Component<object, { readonly chosen: number; readonly pressed: string }> {
  override state = { chosen: 0, pressed: "none" };

  override render(): Child {
    const items = ["first", "second", "third"];
    return [
      h(ChoiceList, {
        items,
        shown: 3,
        onMove: (chosen: number) => {
          this.setState({ chosen });
        },
        onChoose: () => {},
      }),
      h(Text, { text: `showing ${items[this.state.chosen] ?? ""}` }),
      h(Button, {
        label: "Act",
        onPress: () => {
          this.setState({ pressed: items[this.state.chosen] ?? "" });
        },
      }),
      h(Text, { text: `acted on ${this.state.pressed}` }),
    ];
  }
}

/** Plays three seconds on Enter, pauses on "p", resumes on "r", and shows what plays. */
export class Player extends Component<object, { readonly shown: string }> {
  override state = { shown: "" };

  override focusable(): boolean {
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    if (event.action === "release") {
      return false;
    }
    const samples = new Int16Array(48_000).fill(1);
    if (event.key === Key.Enter) {
      this.services.stream(
        { name: "three seconds", rate: 16_000, samples: () => samples, complete: true, failure: null, expected: samples.length },
        event.session,
      );
    } else if (event.key === "p") {
      this.services.pauseStream(event.session);
    } else if (event.key === "r") {
      this.services.resumeStream(event.session);
    }
    const listening = this.services.listening(event.session);
    this.setState({ shown: `${listening?.state ?? "none"} ${listening?.heardMs ?? 0}` });
    return true;
  }

  override render(): Child {
    return h(Text, { text: this.state.shown });
  }
}

export const leaves = (count: number): { label: string }[] => Array.from({ length: count }, (_, index) => ({ label: `leaf ${index + 1}` }));
