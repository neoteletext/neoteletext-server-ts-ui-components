// The catalogue: every part's examples, in the order the docs show them.

// oxlint-disable import/max-dependencies -- the catalogue is every part's examples, one file to a part, so it imports each

import type { Part } from "./example.ts";
import { charts } from "./charts.ts";
import { composition } from "./composition.ts";
import { documents } from "./documents.ts";
import { feedback } from "./feedback.ts";
import { frame } from "./frame.ts";
import { games } from "./games.ts";
import { graphics } from "./graphics.ts";
import { input } from "./input.ts";
import { interactive } from "./interactive.ts";
import { layout } from "./layout.ts";
import { lists } from "./lists.ts";
import { navigation } from "./navigation.ts";
import { overlay } from "./overlay.ts";
import { text } from "./text.ts";
import { time } from "./time.ts";

export const PARTS: readonly Part[] = [
  layout,
  frame,
  text,
  navigation,
  lists,
  input,
  feedback,
  overlay,
  charts,
  time,
  graphics,
  documents,
  interactive,
  composition,
  games,
];
