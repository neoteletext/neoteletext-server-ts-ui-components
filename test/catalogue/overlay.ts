// The overlay part's examples: dialogs, modals, and confirming by typing.

import { Button, Dialog, h, Modal, Text, TextField, TypeToConfirm } from "../../src/index.ts";
import { Colour, Key } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const overlay: Part = {
  part: "overlay",
  title: "Overlays",
  about:
    "What stands over a page: a dialog that keeps the keys until it is answered, a modal that lays one over a page and dims it, and a dialog that asks for a name before it destroys anything.",
  examples: [
    {
      component: "Dialog",
      title: "A question",
      build: () => h(Dialog, { title: "Save the changes?", message: "Your settings change at once.", buttons: ["Save", "Discard"] }),
    },
    {
      component: "Dialog",
      title: "Each kind",
      build: () => [
        h(Dialog, { key: "info", title: "New pages are up", kind: "info" }),
        h(Dialog, { key: "success", title: "Saved", kind: "success" }),
        h(Dialog, { key: "warning", title: "Almost full", kind: "warning" }),
        h(Dialog, { key: "error", title: "Not sent", kind: "error" }),
      ],
    },
    {
      component: "Dialog",
      title: "With a shadow and a field",
      build: () =>
        h(
          Dialog,
          { title: "Your name", buttons: ["OK", "Cancel"], shadow: true, childFirst: true },
          h(TextField, { longest: 20, placeholder: "type it here", autoFocus: true }),
        ),
    },
    {
      component: "Dialog",
      title: "A button that cannot be pressed yet",
      build: () => h(Dialog, { title: "Send it?", message: "Fill in the form first.", buttons: ["Send", "Cancel"], disabledButtons: [0], initial: 1 }),
    },
    {
      component: "Modal",
      title: "Over a dimmed page",
      build: () =>
        h(
          Modal,
          { dialog: h(Dialog, { title: "Leave the quiz?", buttons: ["Leave", "Stay"], kind: "warning", shadow: true }), row: 4 },
          h(Text, { text: "Question 3 of 10", foreground: Colour.Yellow }),
          h(Button, { label: "Answer A", onPress: () => {} }),
          h(Button, { label: "Answer B", onPress: () => {} }),
        ),
    },
    {
      component: "TypeToConfirm",
      title: "Before deleting",
      build: () => h(TypeToConfirm, { name: "Holiday photos", destroys: "the album and its 120 pictures", onConfirm: () => {} }),
    },
    {
      component: "TypeToConfirm",
      title: "With the name typed",
      build: () => h(TypeToConfirm, { name: "Holiday photos", destroys: "the album and its 120 pictures", onConfirm: () => {} }),
      act: (page) => {
        page.typeKeys(1, "Holiday photos");
        page.press(1, Key.Right);
      },
    },
  ],
};
