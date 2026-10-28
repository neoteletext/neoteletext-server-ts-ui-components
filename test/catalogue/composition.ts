// The composition part's examples: components made of others, a step at a time.

import { h, RadioGroup, Text, TextField, Wizard } from "../../src/index.ts";
import { Key } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const composition: Part = {
  part: "composition",
  title: "Composition",
  about: "Components made of others: a wizard that takes the viewer through a form a step at a time, with Back and Next on the red and green keys.",
  examples: [
    {
      component: "Wizard",
      title: "On the second step",
      build: () =>
        h(
          Wizard,
          { steps: ["Name", "Team", "Confirm"], onFinish: () => {} },
          h(TextField, { label: "Your name", longest: 20, initial: "Anna" }),
          h(RadioGroup, { label: "Your team", items: ["Red", "Blue", "Green"] }),
          h(Text, { text: "Anna joins the Red team." }),
        ),
      act: (page) => {
        page.press(1, Key.Green);
      },
    },
    {
      component: "Wizard",
      title: "A step not ready to leave",
      build: () =>
        h(
          Wizard,
          { steps: ["Name", "Team", "Confirm"], ready: (step) => (step === 0 ? "Type your name first" : null), onFinish: () => {} },
          h(TextField, { label: "Your name", longest: 20 }),
          h(RadioGroup, { label: "Your team", items: ["Red", "Blue", "Green"] }),
          h(Text, { text: "Ready to join." }),
        ),
      act: (page) => {
        page.press(1, Key.Green);
      },
    },
    {
      component: "Wizard",
      title: "Finished",
      build: () =>
        h(
          Wizard,
          { steps: ["Name", "Team", "Confirm"], onFinish: () => {} },
          h(TextField, { label: "Your name", longest: 20, initial: "Anna" }),
          h(RadioGroup, { label: "Your team", items: ["Red", "Blue", "Green"] }),
          h(Text, { text: "Anna joins the Red team." }),
        ),
      act: (page) => {
        page.press(1, Key.Green);
        page.press(1, Key.Green);
        page.press(1, Key.Green);
      },
    },
  ],
};
