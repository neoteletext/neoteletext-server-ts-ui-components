// The input part's examples: fields, buttons, boxes and the other controls a viewer sets.

import {
  Action,
  Autocomplete,
  Button,
  Checkbox,
  CheckboxGroup,
  Field,
  h,
  MultiTapField,
  NumberInput,
  RadioGroup,
  SegmentField,
  Select,
  Slider,
  Switch,
  TextField,
} from "../../src/index.ts";
import { Colour, Key } from "../../src/kit.ts";
import type { Part } from "./example.ts";

export const input: Part = {
  part: "input",
  title: "Input",
  about:
    "The controls a viewer sets with a remote or a keyboard: fields to type in, by a keyboard, by digits to a template or by a phone's keypad; buttons and actions; boxes, radios and switches; numbers, sliders and selects.",
  examples: [
    {
      component: "Control",
      title: "Its label, hint and disabled look, shown inside a TextField",
      build: () => [
        h(TextField, { key: "name", label: "Name", longest: 20, hint: "Type your name, then Enter" }),
        h(TextField, { key: "email", label: "Email", longest: 20, disabled: true, initial: "anna@example.com" }),
      ],
    },
    {
      component: "ValueControl",
      title: "A value checked, shown inside a TextField",
      build: () =>
        h(TextField, { label: "Email", longest: 24, initial: "anna@example", validate: (text) => (text.includes(".") ? null : "Not a whole address") }),
    },
    {
      component: "Field",
      title: "Labels and notes",
      build: () => [
        h(Field, { key: "name", label: "Name", note: "required" }, h(TextField, { longest: 20 })),
        h(Field, { key: "town", label: "Town" }, h(TextField, { longest: 20, placeholder: "optional" })),
      ],
    },
    {
      component: "TextField",
      title: "A placeholder, shown while it does not have the keys",
      build: () => [
        h(TextField, { key: "name", label: "Name", longest: 20 }),
        h(TextField, { key: "search", label: "Search", longest: 24, placeholder: "a team or a player" }),
      ],
    },
    {
      component: "TextField",
      title: "Masked, typed in",
      build: () => h(TextField, { label: "Password", longest: 16, masked: true }),
      act: (page) => {
        page.typeKeys(1, "secret");
      },
    },
    {
      component: "SegmentField",
      title: "A date part-filled",
      build: () => h(SegmentField, { label: "Born", template: "99/99/9999" }),
      act: (page) => {
        page.typeKeys(1, "2810");
      },
    },
    {
      component: "SegmentField",
      title: "A month that cannot be",
      build: () =>
        h(SegmentField, { label: "Born", template: "99/99/9999", check: (segment, digits) => (segment === 1 && Number(digits) > 12 ? "No such month" : null) }),
      act: (page) => {
        page.typeKeys(1, "2813");
      },
    },
    {
      component: "SegmentField",
      title: "A concealed PIN",
      build: () => h(SegmentField, { label: "PIN", template: "9999", conceal: true }),
      act: (page) => {
        page.typeKeys(1, "47");
      },
    },
    {
      component: "MultiTapField",
      title: "Mid-letter",
      build: () => h(MultiTapField, { label: "Name" }),
      act: (page) => {
        page.typeKeys(1, "4433");
      },
    },
    {
      component: "MultiTapField",
      title: "In capitals",
      build: () => h(MultiTapField, { label: "Name", background: Colour.Magenta }),
      act: (page) => {
        page.press(1, Key.Yellow);
        page.typeKeys(1, "7");
      },
    },
    {
      component: "Autocomplete",
      title: "Suggesting as it is typed",
      build: () => h(Autocomplete, { label: "City", items: ["Belfast", "Birmingham", "Brighton", "Bristol", "Cardiff", "Leeds"], shown: 4 }),
      act: (page) => {
        page.typeKeys(1, "bri");
        page.press(1, Key.Down);
      },
    },
    {
      component: "Autocomplete",
      title: "A combo box",
      build: () => h(Autocomplete, { label: "City", items: ["Belfast", "Birmingham", "Brighton", "Bristol", "Cardiff", "Leeds"], shown: 4, showAll: true }),
    },
    {
      component: "Button",
      title: "With the keys, plain and disabled",
      build: () => [
        h(Button, { key: "save", label: "Save", onPress: () => {}, width: 12 }),
        h(Button, { key: "cancel", label: "Cancel", onPress: () => {}, width: 12, background: Colour.Red }),
        h(Button, { key: "send", label: "Send", onPress: () => {}, width: 12, disabled: true }),
      ],
    },
    {
      component: "Action",
      title: "Enabled and disabled",
      build: () => [
        h(Action, { key: "more", text: "Read the whole story", foreground: Colour.Cyan, onPress: () => {} }),
        h(Action, { key: "next", text: "Next story", disabled: true, onPress: () => {} }),
      ],
    },
    {
      component: "Checkbox",
      title: "Ticked, not, and mixed",
      build: () => [
        h(Checkbox, { key: "news", label: "News alerts" }),
        h(Checkbox, { key: "sport", label: "Sport alerts" }),
        h(Checkbox, { key: "all", label: "All regions", initial: "mixed" }),
      ],
      act: (page) => {
        page.press(1, Key.Enter);
      },
    },
    {
      component: "CheckboxGroup",
      title: "Two columns, one not to be changed",
      build: () => h(CheckboxGroup, { items: ["News", "Sport", "Weather", "Travel", "Finance", "TV"], columns: 2, initial: [0, 2], disabledItems: [5] }),
    },
    {
      component: "RadioGroup",
      title: "Down a column",
      build: () => h(RadioGroup, { label: "Units", items: ["Celsius", "Fahrenheit", "Kelvin"] }),
      act: (page) => {
        page.press(1, Key.Down);
      },
    },
    {
      component: "RadioGroup",
      title: "Across a row",
      build: () => h(RadioGroup, { label: "Size", items: ["Small", "Medium", "Large"], across: true, initial: 1 }),
    },
    {
      component: "Switch",
      title: "On and off",
      build: () => [h(Switch, { key: "subtitles", label: "Subtitles", initial: true }), h(Switch, { key: "sound", label: "Sound effects" })],
    },
    {
      component: "Slider",
      title: "Moved",
      build: () => h(Slider, { label: "Volume", min: 0, max: 100, step: 5, initial: 50, unit: "%" }),
      act: (page) => {
        page.press(1, Key.Right);
        page.press(1, Key.Right);
      },
    },
    {
      component: "Slider",
      title: "Filled, and in a colour of its own",
      build: () => [
        h(Slider, { key: "treble", label: "Treble", min: -10, max: 10, initial: -2, unit: "dB", filled: true }),
        h(Slider, { key: "bass", label: "Bass", min: -10, max: 10, initial: 4, unit: "dB", filled: true, foreground: Colour.Green }),
      ],
    },
    {
      component: "NumberInput",
      title: "Stepped",
      build: () => h(NumberInput, { label: "Tickets", min: 1, max: 8, initial: 2 }),
      act: (page) => {
        page.press(1, Key.Up);
      },
    },
    {
      component: "NumberInput",
      title: "Out of range",
      build: () => h(NumberInput, { label: "Tickets", min: 1, max: 8, initial: 2 }),
      act: (page) => {
        page.typeKeys(1, "12");
      },
    },
    {
      component: "Select",
      title: "Shut",
      build: () => h(Select, { label: "Region", items: ["London", "North West", "Scotland", "Wales"], initial: 1 }),
    },
    {
      component: "Select",
      title: "Open",
      build: () => [
        h(Select, { key: "region", label: "Region", items: ["London", "North West", "Scotland", "Wales"], initial: 1 }),
        h(Button, { key: "save", label: "Save", onPress: () => {} }),
      ],
      act: (page) => {
        page.press(1, Key.Enter);
        page.press(1, Key.Down);
      },
    },
  ],
};
